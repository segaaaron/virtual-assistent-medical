// Fase 6 — recordatorios de cita (dia antes). Correr por cron diario: `npm run reminders`.
// Idempotente: registra cada aviso en reminder_log -> si el cron corre 2x el mismo dia
// (o al probarlo a mano) NO se duplica el recordatorio al paciente.
import { buildContainer } from "./container.js";
import { query, pool } from "@platform/db/index.js";
import { logger } from "@platform/logger/index.js";
import { CITA_REMINDER_TEMPLATE } from "@config/constants.js";
import { pendingReminders, type CitaReminder, type SentKey } from "@core/reminders/pending.js";
import type { Phone } from "@core/types/role.js";

async function run(): Promise<void> {
  const c = buildContainer();

  const citas = await query<CitaReminder>(
    `SELECT id, wa_phone, nombre, to_char(fecha,'YYYY-MM-DD') AS fecha, hora
     FROM citas WHERE estado IN ('pendiente','confirmada') AND fecha = (CURRENT_DATE + 1)`,
  );
  const sent = await query<SentKey>(
    `SELECT cita_id, to_char(fecha_cita,'YYYY-MM-DD') AS fecha_cita
     FROM reminder_log WHERE fecha_cita = (CURRENT_DATE + 1)`,
  );

  const pend = pendingReminders(citas, sent);
  logger.info({ total: citas.length, yaEnviados: sent.length, aEnviar: pend.length }, "recordatorios");

  for (const r of pend) {
    try {
      await c.messaging.sendTemplate({
        to: r.wa_phone as Phone,
        template: CITA_REMINDER_TEMPLATE,
        language: "es",
        variables: [r.nombre, r.fecha, r.hora],
      });
      // marca SOLO tras envio OK -> si fallo, se reintenta en la proxima corrida
      await query(
        `INSERT INTO reminder_log (cita_id, fecha_cita) VALUES ($1, $2::date) ON CONFLICT DO NOTHING`,
        [r.id, r.fecha],
      );
    } catch (err) {
      logger.error({ err, citaId: r.id, fecha: r.fecha }, "fallo enviando recordatorio");
    }
  }
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, "reminders fallo");
  process.exit(1);
});
