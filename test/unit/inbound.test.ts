import { describe, it, expect } from "vitest";
import { parseInbound } from "../../src/webhook/inbound.dto.js";

function wrap(msg: Record<string, unknown>) {
  return { entry: [{ changes: [{ value: { messages: [msg] } }] }] };
}

describe("parseInbound", () => {
  it("parsea texto", () => {
    const out = parseInbound(wrap({ id: "w1", from: "+59171234567", timestamp: "1700000000", type: "text", text: { body: "hola" } }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ waId: "w1", from: "59171234567", text: "hola" });
  });
  it("parsea audio", () => {
    const out = parseInbound(wrap({ id: "w2", from: "591", timestamp: "1700000000", type: "audio", audio: { id: "m9" } }));
    expect(out[0]).toMatchObject({ mediaType: "audio", mediaId: "m9" });
  });
  it("parsea respuesta de LISTA (list_reply) con context", () => {
    const out = parseInbound(
      wrap({
        id: "w3",
        from: "591",
        timestamp: "1700000000",
        type: "interactive",
        context: { id: "aviso-123" },
        interactive: { list_reply: { id: "PASE", title: "✅ Que pase" } },
      }),
    );
    expect(out[0]).toMatchObject({ buttonPayload: "PASE", replyToId: "aviso-123" });
  });
  it("ignora eventos sin mensajes (status)", () => {
    expect(parseInbound({ entry: [{ changes: [{ value: {} }] }] })).toHaveLength(0);
  });
  it("no rompe con payload basura", () => {
    expect(parseInbound({ foo: 1 })).toEqual([]);
  });
});
