import { describe, it, expect } from "vitest";
import { createPacienteAgent } from "../../src/roles/paciente/index.js";
import { env } from "../../src/config/env.js";
import { makeFakes, noopLog } from "../helpers/fakes.js";

const msg = (text: string) => ({ waId: "w", from: "59170000000", text, timestamp: 0 }) as never;

describe("flujo PACIENTE", () => {
  it("agenda una cita (tool bookAppointment) y confirma", async () => {
    const f = makeFakes({
      llm: [
        { toolCalls: [{ id: "1", name: "bookAppointment", arguments: { tratamiento: "botox", nombre: "Ana", fecha: "2026-07-01", hora: "10:00" } }] },
        { text: "Su cita quedó agendada para el 2026-07-01 a las 10:00. 🌷" },
      ],
    });
    await createPacienteAgent(f.deps).handle(msg("quiero botox mañana"), noopLog);
    expect(f.sent.at(-1)?.to).toBe("59170000000");
    expect(f.sent.at(-1)?.text).toContain("agendada");
    expect(f.mem.get("paciente:59170000000")?.length).toBe(2); // user + assistant
  });

  it("bandera roja -> escalateToHuman avisa a la Dra (no es no-op)", async () => {
    const f = makeFakes({
      llm: [
        { toolCalls: [{ id: "1", name: "escalateToHuman", arguments: { motivo: "estoy embarazada" } }] },
        { text: "Entiendo su inquietud, lo consulto con la Dra." },
      ],
    });
    await createPacienteAgent(f.deps).handle(msg("estoy embarazada, puedo hacerme botox?"), noopLog);
    expect(f.sent.some((s) => s.to === env.DOCTORA_PHONE && /atencion|bandera roja/i.test(s.text))).toBe(true);
    expect(f.audits.some((a) => a.event === "escalate_paciente")).toBe(true);
  });
});
