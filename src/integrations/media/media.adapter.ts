import OpenAI from "openai";
import type { Env } from "@config/env.js";
import type { MediaPort } from "@core/ports/media.port.js";
import { IntegrationError } from "@platform/errors/index.js";

// Procesa media de WhatsApp: descarga binario (2 pasos Graph) -> STT (whisper) / vision.
export function createMediaAdapter(env: Env): MediaPort {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 2 });
  const ver = env.WHATSAPP_GRAPH_VERSION;
  const auth = { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` };
  const MAX_BYTES = 20_000_000; // 20MB tope (evita blowup de memoria / abuso)
  const ALLOWED = ["audio/", "image/"];

  async function download(mediaId: string): Promise<{ buf: Buffer; mime: string }> {
    const meta = await fetch(`https://graph.facebook.com/${ver}/${mediaId}`, { headers: auth });
    if (!meta.ok) throw new IntegrationError(`media meta ${meta.status}`);
    const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
    if (!ALLOWED.some((p) => (mime_type || "").startsWith(p))) {
      throw new IntegrationError(`mime no permitido: ${mime_type}`);
    }
    const bin = await fetch(url, { headers: auth });
    if (!bin.ok) throw new IntegrationError(`media bin ${bin.status}`);
    const len = Number(bin.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) throw new IntegrationError(`media demasiado grande: ${len}`);
    const buf = Buffer.from(await bin.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new IntegrationError("media demasiado grande");
    return { buf, mime: mime_type };
  }

  return {
    async transcribeAudio(mediaId: string): Promise<string> {
      const { buf } = await download(mediaId);
      const file = await OpenAI.toFile(buf, "audio.ogg");
      const r = await client.audio.transcriptions.create({ file, model: "whisper-1", language: "es" });
      return r.text;
    },
    async describeImage(mediaId: string): Promise<string> {
      const { buf, mime } = await download(mediaId);
      const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
      const r = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Describe brevemente esta imagen. Si es comprobante de pago indica monto y referencia. " +
                  "Si es piel/rostro, describe SIN diagnosticar. Espanol, conciso.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ] as never,
      });
      return r.choices[0]?.message?.content ?? "";
    },
  };
}
