import { z } from "zod";
import type { InboundMessage } from "@core/types/message.js";
import type { Phone, WaId } from "@core/types/role.js";

const MetaMessage = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  audio: z.object({ id: z.string() }).optional(),
  image: z.object({ id: z.string() }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
  context: z.object({ id: z.string() }).optional(),
});

const MetaPayload = z.object({
  entry: z.array(
    z.object({
      changes: z.array(z.object({ value: z.object({ messages: z.array(MetaMessage).optional() }) })),
    }),
  ),
});

// Mapea el payload crudo -> InboundMessage[] (ignora lo que no entendemos, no rompe).
export function parseInbound(payload: unknown): InboundMessage[] {
  const ok = MetaPayload.safeParse(payload);
  if (!ok.success) return [];
  const out: InboundMessage[] = [];
  for (const entry of ok.data.entry) {
    for (const change of entry.changes) {
      for (const m of change.value.messages ?? []) {
        const base = {
          waId: m.id as WaId,
          from: m.from.replace(/[^0-9]/g, "") as Phone,
          timestamp: Number(m.timestamp) * 1000,
          replyToId: m.context?.id,
        };
        // respuesta interactiva: boton (button_reply) O lista (list_reply)
        const ir = m.interactive?.button_reply ?? m.interactive?.list_reply;
        if (m.type === "interactive" && ir) {
          out.push({ ...base, text: ir.title, buttonPayload: ir.id });
        } else if (m.type === "text" && m.text) {
          out.push({ ...base, text: m.text.body });
        } else if (m.type === "audio" && m.audio) {
          out.push({ ...base, text: "", mediaType: "audio", mediaId: m.audio.id });
        } else if (m.type === "image" && m.image) {
          out.push({ ...base, text: "", mediaType: "image", mediaId: m.image.id });
        }
      }
    }
  }
  return out;
}
