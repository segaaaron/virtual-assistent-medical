// Fase 6 — recordatorios de cita (dia antes). Correr por cron diario: `npm run reminders`.
import { buildContainer } from "./container.js";
import { query, pool } from "@platform/db/index.js";
import { logger } from "@platform/logger/index.js";
import { CITA_REMINDER_TEMPLATE } from "@config/constants.js";
import type { Phone } from "@core/types/role.js";

async function run(): Promise<void> {
  const c = buildContainer();
  const rows = await query<{ wa_phone: string; nombre: string; fecha: string; hora: string }>(
    `SELECT wa_phone, nombre, to_char(fecha,'YYYY-MM-DD') AS fecha, hora
     FROM citas WHERE estado IN ('pendiente','confirmada') AND fecha = (CURRENT_DATE + 1)`,
  );
  logger.info({ count: rows.length }, "recordatorios a enviar");
  for (const r of rows) {
    try {
      await c.messaging.sendTemplate({
        to: r.wa_phone as Phone,
        template: CITA_REMINDER_TEMPLATE,
        language: "es",
        variables: [r.nombre, r.fecha, r.hora],
      });
    } catch (err) {
      logger.error({ err, fecha: r.fecha }, "fallo enviando recordatorio");
    }
  }
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, "reminders fallo");
  process.exit(1);
});
