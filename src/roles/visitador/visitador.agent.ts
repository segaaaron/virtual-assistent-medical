import type { AgentDeps, RoleAgent } from "@core/types/agent.js";
import type { InboundMessage } from "@core/types/message.js";
import type { Logger } from "@shared/logger.js";
import type { Phone } from "@core/types/role.js";
import { maskPhone } from "@shared/pii.js";
import { runAgentLoop } from "@core/agent/runAgentLoop.js";
import { DRA_AVISO_TEMPLATE } from "@config/constants.js";
import { env } from "@config/env.js";

const NS = "visitador";

// Nombre de la doctora desde env (privado, NUNCA hardcodeado). Pila para frases informales.
const doctoraName = env.DOCTORA_NAME;
const doctoraFirstName = doctoraName.split(" ")[0] ?? doctoraName;

const SYSTEM =
  `Eres Loreley, asistente del consultorio de la Dra. ${doctoraName}. Atiendes a un VISITADOR/A medico. ` +
  "Trato de usted, breve, muy educada y cordial, sin emojis. Junta: nombre completo, laboratorio y cuando desea visitar. " +
  "Cuando tengas al menos nombre + laboratorio, llama a la tool registrar_visita. " +
  `Tras registrar, cierra SIEMPRE EXACTAMENTE con: 'Permitame consultarlo con la Dra. ${doctoraFirstName} y en seguida le aviso. Gracias por su amable espera.' ` +
  "Nunca inventes ni confirmes disponibilidad ni que la Dra recibira; solo consultas.";

const tools = [
  {
    name: "registrar_visita",
    description: "Registra la solicitud de visita y avisa a la Dra. Llamar cuando tengas nombre y laboratorio.",
    parameters: {
      type: "object",
      properties: { nombre: { type: "string" }, laboratorio: { type: "string" }, cuando: { type: "string" } },
      required: ["nombre", "laboratorio"],
    },
  },
];

// Agente VISITADOR/A. Determinístico en lo critico: crea SOLICITUD y avisa a la Dra con BOTONES.
export function createVisitadorAgent(deps: AgentDeps): RoleAgent {
  return {
    async handle(message: InboundMessage, log: Logger): Promise<void> {
      const contact = message.from;
      const phone = message.from as Phone;
      const history = await deps.memory.load(NS, contact, 12);

      const reply = await runAgentLoop({
        llm: deps.llm,
        system: SYSTEM,
        history,
        userText: message.text,
        tools,
        execute: async (name, args) => {
          if (name !== "registrar_visita") return { error: "tool desconocida" };
          const nombre = String(args.nombre ?? "");
          const lab = String(args.laboratorio ?? "");
          const cuando = String(args.cuando ?? "");
          const sol = await deps.solicitud.create(phone, nombre, lab, cuando);

          // aviso a la Dra con botones interactivos; guardamos el wamid para mapear su respuesta.
          const aviso =
            `🔔 Doctora, le escribe ${nombre || "un visitador/a"}` +
            `${lab ? ` (${lab})` : ""}` +
            `${cuando ? `, desea visitarla ${cuando}` : ", desea visitarla"}. ¿Desea recibirle?`;
          // Ventana 24h: la lista interactiva solo se puede enviar si la Dra escribio en <24h.
          const open = await deps.messaging.isWithin24hWindow(env.DOCTORA_PHONE as Phone);
          if (open) {
            const wamid = await deps.messaging.sendList(env.DOCTORA_PHONE as Phone, aviso, "Responder", [
              { id: "PASE", title: "✅ Que pase" },
              { id: "NO", title: "❌ Hoy no" },
              { id: "TARDE", title: "🌅 Mejor en la tarde" },
              { id: "MANANA", title: "🌆 Mejor en la mañana" },
              { id: "ESPERA", title: "🕐 Que espere" },
              { id: "OTRODIA", title: "📅 Otro día" },
              { id: "YO", title: "✍️ Le respondo yo" },
            ]);
            if (wamid) await deps.solicitud.setAvisoMsgId(sol.id, wamid);
          } else {
            // fuera de ventana: fallback a plantilla utilitaria (debe estar aprobada en Meta).
            await deps.audit.log("aviso_fuera_ventana24h", { solicitud: sol.id });
            try {
              await deps.messaging.sendTemplate({
                to: env.DOCTORA_PHONE as Phone,
                template: DRA_AVISO_TEMPLATE,
                language: "es",
                variables: [nombre || "un visitador/a", lab || ""],
              });
            } catch {
              // plantilla aun no aprobada en Meta -> la Dra vera la solicitud al volver a escribir
            }
          }
          await deps.audit.log("solicitud_visitador", { id: sol.id, phone: maskPhone(contact), lab });
          return { ok: true, solicitudId: sol.id };
        },
      });

      await deps.memory.append(NS, contact, { role: "user", content: message.text });
      await deps.memory.append(NS, contact, { role: "assistant", content: reply });
      await deps.messaging.sendText({ to: phone, text: reply });
      log.info({}, "visitador respondido");
    },
  };
}
