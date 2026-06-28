// Orquestacion del worker: pre-procesa media, resuelve/clasifica rol, delega al agente aislado.
import type { Container } from "../main/container.js";
import type { InboundJob } from "@core/types/job.js";
import type { InboundMessage } from "@core/types/message.js";
import type { Role } from "@core/types/role.js";
import { withContext } from "@platform/logger/index.js";
import { maskPhone } from "@shared/pii.js";
import { env } from "@config/env.js";
import { resolveRole } from "@core/routing/resolveRole.js";
import { classifyUnknown } from "@core/classify/classify.js";

import { createPacienteAgent } from "@roles/paciente/index.js";
import { createVisitadorAgent } from "@roles/visitador/index.js";
import { createFamiliarAgent } from "@roles/familiar/index.js";
import { createDoctoraAgent } from "@roles/doctora-admin/index.js";

const ROUTE_MIN_CONFIDENCE = 0.6; // enrutar este mensaje
const STICKY_MIN_CONFIDENCE = 0.8; // persistir el rol (sticky) solo si es muy seguro

export async function processMessage(job: InboundJob, deps: Container): Promise<void> {
  let message = job.message;
  const log = withContext({ waId: message.waId });

  // registra actividad (ventana 24h) por cada inbound
  await deps.activity.recordInbound(message.from, message.timestamp);

  // 1) media -> texto. Si falla, NO quedar en silencio (mensaje posiblemente urgente).
  if (message.mediaType && message.mediaId) {
    try {
      const text =
        message.mediaType === "audio"
          ? await deps.media.transcribeAudio(message.mediaId)
          : await deps.media.describeImage(message.mediaId);
      message = { ...message, text };
    } catch (err) {
      log.error({ err }, "fallo procesando media");
      await deps.messaging.sendText({
        to: message.from,
        text: "Disculpe, no pude procesar su audio/imagen. ¿Me lo puede escribir, por favor? 🌷",
      });
      return;
    }
  }
  if (!message.text.trim()) {
    log.debug({}, "mensaje vacio, nada que responder");
    return;
  }

  // 2) resolver rol (determinístico). unknown -> clasificador acotado.
  let role: Role = await resolveRole(message.from, deps.roleStore);
  if (role === "unknown") {
    const c = await classifyUnknown(deps.llm, message.text);
    if ((c.role === "paciente" || c.role === "visitador") && c.confidence >= ROUTE_MIN_CONFIDENCE) {
      role = c.role;
      if (c.confidence >= STICKY_MIN_CONFIDENCE) {
        await deps.roleStore.setRole(message.from, role); // sticky solo si muy seguro
        await deps.audit.log("classify_sticky", { phone: maskPhone(message.from), role, confidence: c.confidence });
      } else {
        // enruta este mensaje pero NO fija el rol -> se re-clasifica el proximo (evita lock-in erroneo)
        await deps.audit.log("classify_tentative", { phone: maskPhone(message.from), role, confidence: c.confidence });
      }
    } else {
      await deps.messaging.sendText({
        to: message.from,
        text: `Hola, soy Loreley, la asistente de la Dra. ${env.DOCTORA_NAME}. ¿En que puedo ayudarle? 🌷`,
      });
      return;
    }
  }

  // pausa/handoff: si el contacto (o GLOBAL) esta pausado, el bot calla — salvo la Dra (para reactivar).
  if (role !== "doctora" && (await deps.control.isPaused(message.from))) {
    log.debug({ role }, "contacto pausado, bot en silencio");
    return;
  }

  // 2.5) ESPEJO Chatwoot (NO para la doctora): asegura la conversacion del paciente/visitador/familiar
  // y postea su mensaje ENTRANTE para que la Dra lo vea en su inbox. Best-effort: si Chatwoot falla,
  // seguimos atendiendo al paciente (el espejo no es critico, el envio WhatsApp si).
  if (role !== "doctora") {
    try {
      const convId = await deps.crm.ensureConversation(message.from);
      await deps.crm.postIncoming(convId, message.text);
      message = { ...message, conversationId: convId };
    } catch (err) {
      log.error({ err, role }, "espejo Chatwoot (entrada) fallo; continua la atencion al paciente");
    }
  }

  // 3) despacho aislado: cada rol = prompt+memoria+tools propios (boundaries impiden cruce)
  const agentDeps = {
    messaging: deps.messaging,
    llm: deps.llm,
    crm: deps.crm,
    memory: deps.memory,
    agenda: deps.agenda,
    solicitud: deps.solicitud,
    audit: deps.audit,
    control: deps.control,
  };
  const roleLog = withContext({ role, waId: message.waId });
  const msg: InboundMessage = message;
  switch (role) {
    case "doctora":
      return createDoctoraAgent(agentDeps).handle(msg, roleLog);
    case "paciente":
      return createPacienteAgent(agentDeps).handle(msg, roleLog);
    case "visitador":
      return createVisitadorAgent(agentDeps).handle(msg, roleLog);
    case "familiar":
      return createFamiliarAgent(agentDeps).handle(msg, roleLog);
    default:
      roleLog.info({}, "rol sin handler");
      return;
  }
}
