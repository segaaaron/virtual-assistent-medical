import type { AgentDeps, RoleAgent } from "@core/types/agent.js";
import type { InboundMessage } from "@core/types/message.js";
import type { Logger } from "@shared/logger.js";
import type { Phone } from "@core/types/role.js";
import { maskPhone } from "@shared/pii.js";
import { runAgentLoop } from "@core/agent/runAgentLoop.js";
import { env } from "@config/env.js";
import { SYSTEM_PROMPT } from "./prompts/prompts.js";
import { pacienteTools } from "./tools/index.js";

const NS = "paciente";

// Nombre de pila de la doctora (para frases informales tipo "la Dra. <Nombre>"), derivado del env.
const doctoraFirstName = env.DOCTORA_NAME.split(" ")[0] ?? env.DOCTORA_NAME;

// Agente PACIENTE: info, calificacion, agendar. SOLO datos propios. Nunca da criterio clinico.
export function createPacienteAgent(deps: AgentDeps): RoleAgent {
  return {
    async handle(message: InboundMessage, log: Logger): Promise<void> {
      const contact = message.from;
      const phone = message.from as Phone;
      const history = await deps.memory.load(NS, contact, 12);

      const reply = await runAgentLoop({
        llm: deps.llm,
        system: SYSTEM_PROMPT,
        history,
        userText: message.text,
        tools: pacienteTools,
        execute: async (name, args) => {
          if (name === "checkAvailability") {
            const slots = await deps.agenda.availableSlots(String(args.tratamiento ?? ""), 3);
            return { slots };
          }
          if (name === "bookAppointment") {
            return deps.agenda.book(
              { fecha: String(args.fecha ?? ""), hora: String(args.hora ?? "") },
              phone,
              String(args.tratamiento ?? ""),
              String(args.nombre ?? ""),
            );
          }
          if (name === "escalateToHuman") {
            const motivo = String(args.motivo ?? "");
            await deps.audit.log("escalate_paciente", { phone: maskPhone(contact), motivo });
            // DERIVA REAL: avisa a la Dra por su WhatsApp (no es un no-op).
            await deps.messaging.sendText({
              to: env.DOCTORA_PHONE as Phone,
              text: `⚠️ Doctora, un paciente requiere su atencion (posible bandera roja): «${motivo}». Le sugiero responderle usted.`,
            });
            return { escalated: true, message: `Consulta derivada a la Dra. ${doctoraFirstName}.` };
          }
          return { error: "tool desconocida" };
        },
      });

      await deps.memory.append(NS, contact, { role: "user", content: message.text });
      await deps.memory.append(NS, contact, { role: "assistant", content: reply });
      await deps.messaging.sendText({ to: phone, text: reply });
      log.info({}, "paciente respondido");
    },
  };
}
