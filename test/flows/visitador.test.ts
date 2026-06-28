import { describe, it, expect } from "vitest";
import { createVisitadorAgent } from "../../src/roles/visitador/index.js";
import { env } from "../../src/config/env.js";
import { makeFakes, noopLog } from "../helpers/fakes.js";

const msg = (text: string) => ({ waId: "w", from: "59176944986", text, timestamp: 0 }) as never;
const script = [
  { toolCalls: [{ id: "1", name: "registrar_visita", arguments: { nombre: "Karla", laboratorio: "Megalabs" } }] },
  { text: "Permítame consultarlo con la Dra. y en seguida le aviso. Gracias por su amable espera." },
];

describe("flujo VISITADORA", () => {
  it("dentro de 24h: crea solicitud y manda LISTA de 7 opciones a la Dra", async () => {
    const f = makeFakes({ within24h: true, llm: [...script] });
    await createVisitadorAgent(f.deps).handle(msg("soy Karla de Megalabs"), noopLog);
    expect(f.solicitudes).toHaveLength(1);
    expect(f.lists).toHaveLength(1);
    expect(f.lists[0]?.to).toBe(env.DOCTORA_PHONE);
    expect(f.sent.at(-1)?.text).toContain("Permítame consultarlo");
  });

  it("fuera de 24h: fallback a plantilla (no lista)", async () => {
    const f = makeFakes({ within24h: false, llm: [...script] });
    await createVisitadorAgent(f.deps).handle(msg("soy Karla de Megalabs"), noopLog);
    expect(f.lists).toHaveLength(0);
    expect(f.templates.some((t) => t.to === env.DOCTORA_PHONE)).toBe(true);
  });
});
