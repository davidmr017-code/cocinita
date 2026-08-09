-- Cocinita — esquema familiar (PostgreSQL / Railway)
CREATE TABLE IF NOT EXISTS hogares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  pin_hash TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id UUID NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hogar_id, nombre)
);

CREATE TABLE IF NOT EXISTS estados_hogar (
  hogar_id UUID PRIMARY KEY REFERENCES hogares(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_hogar ON usuarios(hogar_id);
CREATE INDEX IF NOT EXISTS idx_hogares_codigo ON hogares(codigo);
