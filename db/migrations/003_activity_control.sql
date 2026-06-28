-- Actividad por contacto (para ventana 24h) y control de pausa del bot.
CREATE TABLE IF NOT EXISTS contact_activity (
  wa_phone     TEXT PRIMARY KEY,
  last_inbound TIMESTAMPTZ NOT NULL
);

-- bot_control: una fila por contacto pausado, o 'GLOBAL' para pausa total.
CREATE TABLE IF NOT EXISTS bot_control (
  wa_phone   TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
