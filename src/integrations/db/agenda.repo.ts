import type { AgendaPort, Slot, BookResult } from "@core/ports/agenda.port.js";
import type { Phone } from "@core/types/role.js";
import { query } from "@platform/db/index.js";
import { CLINIC_TZ_OFFSET, WORKING_DAYS, WORKING_HOURS, SLOTS_LOOKAHEAD_DAYS } from "@config/constants.js";

// Agenda real: genera franjas segun horario del consultorio (TZ La Paz) y descuenta las ocupadas.
// book = INSERT atomico que respeta el indice unico de franja (anti doble-reserva).
export function createAgendaRepo(): AgendaPort {
  return {
    async availableSlots(_tratamiento: string, max: number): Promise<Slot[]> {
      const candidatas = generateSlots();
      if (candidatas.length === 0) return [];
      const ocupadas = await query<{ fecha: string; hora: string }>(
        "SELECT to_char(fecha,'YYYY-MM-DD') AS fecha, hora FROM citas WHERE estado IN ('pendiente','confirmada')",
      );
      const taken = new Set(ocupadas.map((o) => `${o.fecha} ${o.hora}`));
      return candidatas.filter((s) => !taken.has(`${s.fecha} ${s.hora}`)).slice(0, max);
    },
    async book(slot: Slot, phone: Phone, tratamiento: string, nombre: string): Promise<BookResult> {
      try {
        const rows = await query<{ id: number }>(
          `INSERT INTO citas (wa_phone, tratamiento, nombre, fecha, hora, estado)
           VALUES ($1,$2,$3,$4,$5,'pendiente') RETURNING id`,
          [phone, tratamiento, nombre, slot.fecha, slot.hora],
        );
        return { ok: true, citaId: rows[0]?.id };
      } catch (err) {
        // SOLO 23505 (unique_violation) = franja ocupada; el resto se propaga.
        if (err && typeof err === "object" && (err as { code?: string }).code === "23505") {
          return { ok: false, reason: "franja ya ocupada" };
        }
        throw err;
      }
    },
  };
}

// Genera franjas futuras en horario laboral, en la zona horaria del consultorio (La Paz).
function generateSlots(): Slot[] {
  const out: Slot[] = [];
  // "ahora" en hora-pared de La Paz: corremos el epoch por el offset y leemos en UTC.
  const nowLp = new Date(Date.now() + CLINIC_TZ_OFFSET * 3600 * 1000);
  const nowHHMM = `${pad(nowLp.getUTCHours())}:${pad(nowLp.getUTCMinutes())}`;

  for (let d = 0; d < SLOTS_LOOKAHEAD_DAYS; d++) {
    const day = new Date(nowLp);
    day.setUTCDate(nowLp.getUTCDate() + d);
    if (!WORKING_DAYS.includes(day.getUTCDay())) continue;
    const fecha = day.toISOString().slice(0, 10);
    for (const hora of WORKING_HOURS) {
      if (d === 0 && hora <= nowHHMM) continue; // hoy: solo horas futuras
      out.push({ fecha, hora });
    }
  }
  return out;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
