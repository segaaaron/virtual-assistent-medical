import type { Env } from "@config/env.js";
import type {
  MessagingPort,
  OutboundText,
  OutboundTemplate,
  InteractiveButton,
  ListRow,
} from "@core/ports/messaging.port.js";
import type { Phone } from "@core/types/role.js";
import type { ActivityPort } from "@core/ports/activity.port.js";
import { IntegrationError } from "@platform/errors/index.js";

// Adaptador WhatsApp Cloud API -> implementa MessagingPort.
export function createWhatsappAdapter(env: Env, activity: ActivityPort): MessagingPort {
  const base = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
  const headers = {
    Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };

  async function post(body: unknown): Promise<{ messages?: { id: string }[] }> {
    const res = await fetch(`${base}/messages`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      throw new IntegrationError(`WhatsApp send ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return (await res.json()) as { messages?: { id: string }[] };
  }

  return {
    async sendText(msg: OutboundText): Promise<void> {
      await post({ messaging_product: "whatsapp", to: msg.to, type: "text", text: { body: msg.text } });
    },
    async sendTemplate(msg: OutboundTemplate): Promise<void> {
      await post({
        messaging_product: "whatsapp",
        to: msg.to,
        type: "template",
        template: {
          name: msg.template,
          language: { code: msg.language },
          components: msg.variables?.length
            ? [{ type: "body", parameters: msg.variables.map((v) => ({ type: "text", text: v })) }]
            : undefined,
        },
      });
    },
    async sendButtons(to: Phone, body: string, buttons: InteractiveButton[]): Promise<string> {
      const r = await post({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      });
      return r.messages?.[0]?.id ?? "";
    },
    async sendList(to: Phone, body: string, buttonLabel: string, rows: ListRow[]): Promise<string> {
      const r = await post({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: body },
          action: {
            button: buttonLabel.slice(0, 20),
            sections: [
              {
                title: "Opciones",
                rows: rows.slice(0, 10).map((row) => ({
                  id: row.id,
                  title: row.title.slice(0, 24),
                  ...(row.description ? { description: row.description.slice(0, 72) } : {}),
                })),
              },
            ],
          },
        },
      });
      return r.messages?.[0]?.id ?? "";
    },
    async isWithin24hWindow(to: Phone): Promise<boolean> {
      return activity.isWithin24h(to);
    },
  };
}
