-- Mapeo idempotente WhatsApp -> conversacion Chatwoot (espejo del inbox de la Dra).
-- Una fila por telefono de paciente/visitador/familiar; reusa la conversacion existente.
CREATE TABLE IF NOT EXISTS cw_conversation_map (
  wa_phone        TEXT PRIMARY KEY,
  conversation_id INT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
