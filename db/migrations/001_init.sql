-- Esquema inicial Loreley Brain. Idempotente (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS contactos (
  wa_phone     TEXT PRIMARY KEY,
  role         TEXT NOT NULL DEFAULT 'unknown',
  nombre       TEXT,
  laboratorio  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pacientes (para isPatient). Un contacto puede estar aqui aunque su rol se calcule.
CREATE TABLE IF NOT EXISTS pacientes (
  wa_phone   TEXT PRIMARY KEY,
  nombre     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS citas (
  id          BIGSERIAL PRIMARY KEY,
  wa_phone    TEXT NOT NULL,
  tratamiento TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  fecha       DATE NOT NULL,
  hora        TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | confirmada | cancelada
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- evita doble-reserva exacta de la misma franja activa
CREATE UNIQUE INDEX IF NOT EXISTS uq_citas_franja
  ON citas (fecha, hora) WHERE estado IN ('pendiente', 'confirmada');

CREATE TABLE IF NOT EXISTS solicitudes (
  id            BIGSERIAL PRIMARY KEY,
  wa_phone      TEXT NOT NULL,
  nombre        TEXT,
  laboratorio   TEXT,
  cuando        TEXT,
  estado        TEXT NOT NULL DEFAULT 'esperando_dra', -- esperando_dra | respondida | cancelada
  aviso_msg_id  TEXT,
  conversation_id INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_solicitudes_estado ON solicitudes (estado, created_at DESC);

-- Memoria conversacional aislada por (namespace=rol, contact_id=telefono).
CREATE TABLE IF NOT EXISTS conversation_memory (
  id         BIGSERIAL PRIMARY KEY,
  namespace  TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  turn_role  TEXT NOT NULL CHECK (turn_role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_memory_ns_contact ON conversation_memory (namespace, contact_id, id);

CREATE TABLE IF NOT EXISTS saludos_dia (
  wa_phone TEXT PRIMARY KEY,
  fecha    DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  event      TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_event ON audit_log (event, created_at DESC);
