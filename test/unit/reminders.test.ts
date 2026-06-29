import { describe, it, expect } from "vitest";
import { pendingReminders, type CitaReminder } from "../../src/core/reminders/pending.js";

const cita = (id: number, fecha = "2026-07-01"): CitaReminder => ({
  id,
  wa_phone: "59176944986",
  nombre: "Ana",
  fecha,
  hora: "10:00",
});

describe("pendingReminders (#QA idempotencia)", () => {
  it("sin envios previos -> todas pendientes", () => {
    expect(pendingReminders([cita(1), cita(2)], [])).toHaveLength(2);
  });

  it("descarta las ya avisadas (mismo cita_id + fecha)", () => {
    const out = pendingReminders([cita(1), cita(2)], [{ cita_id: 1, fecha_cita: "2026-07-01" }]);
    expect(out.map((c) => c.id)).toEqual([2]);
  });

  it("misma cita pero otra fecha -> sigue pendiente (reagendada)", () => {
    const out = pendingReminders([cita(1, "2026-07-02")], [{ cita_id: 1, fecha_cita: "2026-07-01" }]);
    expect(out).toHaveLength(1);
  });

  it("todas avisadas -> nada que enviar (no doble-envio)", () => {
    const out = pendingReminders(
      [cita(1), cita(2)],
      [
        { cita_id: 1, fecha_cita: "2026-07-01" },
        { cita_id: 2, fecha_cita: "2026-07-01" },
      ],
    );
    expect(out).toHaveLength(0);
  });
});
