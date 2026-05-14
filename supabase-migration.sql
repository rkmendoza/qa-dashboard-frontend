-- Agregar columnas para mejoras tipo Notion en Documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '📄',
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_position ON documents(position);

-- Tabla de módulos (CRUD desde UI)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO modules (name) VALUES
  ('Login'), ('Reservas'), ('Pagos'), ('Ancillaries'), ('Check-in'), ('Cancelaciones'), ('Otros')
ON CONFLICT (name) DO NOTHING;
