import { describe, it, expect } from "vitest";
import { createDoctoraAgent } from "../../src/roles/doctora-admin/index.js";
import { env } from "../../src/config/env.js";
import { makeFakes, noopLog } from "../helpers/fakes.js";

const VISITA = "59176944986";
const seed = (f: ReturnType<typeof makeFakes>) =>
  f.solicitudes.push({ id: 1, wa_phone: VISITA, nombre: "Karla", laboratorio: "Megalabs", cuando: "", estado: "esperando_dra", aviso: "aviso-1" });

const draMsg = (over: Record<string, unknown>) => ({ waId: "w", from: env.DOCTORA_PHONE, text: "", timestamp: 0, ...over }) as never;

describe("flujo DOCTORA (vuelta de visita)", () => {
  it("opcion PASE: relay al visitador + marca respondida", async () => {
    const f = makeFakes();
    seed(f);
    await createDoctoraAgent(f.deps).handle(draMsg({ buttonPayload: "PASE", replyToId: "aviso-1", text: "✅ Que pase" }), noopLog);
    expect(f.sent.some((s) => s.to === VISITA && /puede recibirle|puede pasar/i.test(s.text))).toBe(true);
    expect(f.solicitudes[0]?.estado).toBe("respondida");
  });

  it("opcion OTRODIA tambien tiene vuelta", async () => {
    const f = makeFakes();
    seed(f);
    await createDoctoraAgent(f.deps).handle(draMsg({ buttonPayload: "OTRODIA", replyToId: "aviso-1", text: "📅 Otro día" }), noopLog);
    expect(f.sent.some((s) => s.to === VISITA)).toBe(true);
    expect(f.solicitudes[0]?.estado).toBe("respondida");
  });

  it("opcion YO: pide texto y luego relaya el mensaje libre de la Dra", async () => {
    const f = makeFakes();
    seed(f);
    await createDoctoraAgent(f.deps).handle(draMsg({ buttonPayload: "YO", replyToId: "aviso-1", text: "✍️ Le respondo yo" }), noopLog);
    expect(f.pending.get(env.DOCTORA_PHONE)).toBe(1);
    // la Dra escribe libre
    await createDoctoraAgent(f.deps).handle(draMsg({ text: "Dígale que la espero el lunes" }), noopLog);
    expect(f.sent.some((s) => s.to === VISITA && s.text.includes("lunes"))).toBe(true);
    expect(f.solicitudes[0]?.estado).toBe("respondida");
  });

  it("comando #pausa-total pausa global", async () => {
    const f = makeFakes();
    await createDoctoraAgent(f.deps).handle(draMsg({ text: "#pausa-total" }), noopLog);
    expect(f.paused.has("GLOBAL")).toBe(true);
  });
});
