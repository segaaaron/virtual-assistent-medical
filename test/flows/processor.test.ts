import { describe, it, expect } from "vitest";
import { processMessage } from "../../src/jobs/message.processor.js";
import { makeFakes } from "../helpers/fakes.js";

const job = (over: Record<string, unknown>) => ({ message: { waId: "w", from: "59170000000", text: "hola", timestamp: 0, ...over }, receivedAt: 0 }) as never;

describe("processor (orquestacion)", () => {
  it("contacto pausado -> bot calla", async () => {
    const f = makeFakes({ saved: "paciente" });
    f.paused.add("59170000000");
    await processMessage(job({}), f.deps);
    expect(f.sent).toHaveLength(0);
  });

  it("unknown con alta confianza -> clasifica, fija rol y responde", async () => {
    const f = makeFakes({
      llm: [{ text: JSON.stringify({ role: "paciente", confidence: 0.9 }) }, { text: "Hola, ¿en que le ayudo?" }],
    });
    await processMessage(job({ from: "59171111111", text: "cuanto cuesta el botox?" }), f.deps);
    expect(f.roleSet.some((r) => r.role === "paciente")).toBe(true);
    expect(f.sent.length).toBeGreaterThan(0);
  });

  it("unknown con baja confianza -> default-deny (bienvenida generica, sin fijar rol)", async () => {
    const f = makeFakes({ llm: [{ text: JSON.stringify({ role: "otro", confidence: 0.2 }) }] });
    await processMessage(job({ from: "59172222222", text: "hola" }), f.deps);
    expect(f.sent[0]?.text).toContain("Loreley");
    expect(f.roleSet).toHaveLength(0);
  });

  it("media de audio -> transcribe y responde", async () => {
    const f = makeFakes({ saved: "paciente", llm: [{ text: "Recibí su nota de voz." }] });
    await processMessage(job({ from: "59173333333", text: "", mediaType: "audio", mediaId: "m1" }), f.deps);
    expect(f.sent.length).toBeGreaterThan(0);
  });
});
