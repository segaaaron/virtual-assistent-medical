import type {
  MessagingPort,
  OutboundText,
  OutboundTemplate,
  InteractiveButton,
  ListRow,
} from "@core/ports/messaging.port.js";
import type { CrmPort } from "@core/ports/crm.port.js";
import type { CwMapStore } from "@core/ports/cw-map.port.js";
import type { Phone } from "@core/types/role.js";
import type { Logger } from "@shared/logger.js";

// Decorador de MessagingPort: tras un envio exitoso por WhatsApp, espeja la SALIDA en Chatwoot
// (message_type "outgoing") si el destinatario tiene una conversacion mapeada. Best-effort:
// si Chatwoot falla, NUNCA tumba el envio al paciente (solo se loguea).
// El destinatario de la Dra NO tiene mapeo (nunca se le hace ensureConversation) -> no se espeja.
export function withChatwootMirror(
  base: MessagingPort,
  crm: CrmPort,
  map: CwMapStore,
  log: Logger,
): MessagingPort {
  async function mirror(to: Phone, text: string): Promise<void> {
    try {
      const conversationId = await map.get(to);
      if (conversationId) await crm.postReply(conversationId, text);
    } catch (err) {
      log.error({ err }, "espejo Chatwoot (salida) fallo; envio WhatsApp ya entregado");
    }
  }

  return {
    async sendText(msg: OutboundText): Promise<void> {
      await base.sendText(msg);
      await mirror(msg.to, msg.text);
    },
    async sendTemplate(msg: OutboundTemplate): Promise<void> {
      await base.sendTemplate(msg);
      const content = `[plantilla ${msg.template}]${msg.variables?.length ? ` ${msg.variables.join(" · ")}` : ""}`;
      await mirror(msg.to, content);
    },
    async sendButtons(to: Phone, body: string, buttons: InteractiveButton[]): Promise<string> {
      const wamid = await base.sendButtons(to, body, buttons);
      await mirror(to, body);
      return wamid;
    },
    async sendList(to: Phone, body: string, buttonLabel: string, rows: ListRow[]): Promise<string> {
      const wamid = await base.sendList(to, body, buttonLabel, rows);
      await mirror(to, body);
      return wamid;
    },
    async isWithin24hWindow(to: Phone): Promise<boolean> {
      return base.isWithin24hWindow(to);
    },
  };
}
