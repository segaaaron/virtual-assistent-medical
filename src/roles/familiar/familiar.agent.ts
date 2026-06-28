import type { AgentDeps, RoleAgent } from "@core/types/agent.js";
import type { InboundMessage } from "@core/types/message.js";
import type { Logger } from "@shared/logger.js";
import type { Phone } from "@core/types/role.js";
import { maskPhone } from "@shared/pii.js";
import { env } from "@config/env.js";

// Nombre de pila de la doctora (para frases informales tipo "la Dra. <Nombre>"), derivado del env.
const doctoraFirstName = env.DOCTORA_NAME.split(" ")[0] ?? env.DOCTORA_NAME;

// Agente FAMILIAR (allow-list cerrada). Relay del mensaje a la Dra. No da info de pacientes/agenda.
export function createFamiliarAgent(deps: AgentDeps): RoleAgent {
  return {
    async handle(message: InboundMessage, log: Logger): Promise<void> {
      const phone = message.from as Phone;
      await deps.messaging.sendText({
        to: env.DOCTORA_PHONE as Phone,
        text: `💬 Mensaje personal para usted: «${message.text}»`,
      });
      await deps.audit.log("relay_familiar", { phone: maskPhone(message.from) });
      await deps.messaging.sendText({
        to: phone,
        text: `Con gusto le hago llegar su mensaje a la Dra. ${doctoraFirstName}. 🌷`,
      });
      log.info({}, "familiar relayado");
    },
  };
}
