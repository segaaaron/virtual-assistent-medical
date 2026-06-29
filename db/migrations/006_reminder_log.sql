-- Idempotencia de recordatorios (#QA): evita doble-envio si el cron corre 2x el mismo dia
-- (o al probarlo a mano). Una fila por (cita, fecha de la cita) ya avisada.
CREATE TABLE IF NOT EXISTS reminder_log (
  cita_id    BIGINT NOT NULL,
  fecha_cita DATE   NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cita_id, fecha_cita)
);
