-- Estado: la Dra esta redactando una respuesta libre para una solicitud de visita.
CREATE TABLE IF NOT EXISTS dra_pendiente (
  dra_phone    TEXT PRIMARY KEY,
  solicitud_id BIGINT NOT NULL,
  set_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
