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

-- RLS: permitir SELECT a usuarios autenticados (el anon key fallaba)
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modules_select_authenticated' AND tablename = 'modules') THEN
    CREATE POLICY "modules_select_authenticated" ON modules FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modules_insert_authenticated' AND tablename = 'modules') THEN
    CREATE POLICY "modules_insert_authenticated" ON modules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modules_update_authenticated' AND tablename = 'modules') THEN
    CREATE POLICY "modules_update_authenticated" ON modules FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'modules_delete_authenticated' AND tablename = 'modules') THEN
    CREATE POLICY "modules_delete_authenticated" ON modules FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Columna sprint en bugs_cache para gráfico por sprint
ALTER TABLE bugs_cache
  ADD COLUMN IF NOT EXISTS sprint TEXT NOT NULL DEFAULT 'Sin sprint';

-- Columna notes para comentarios en ejecuciones
ALTER TABLE test_executions
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE plan_executions
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

-- Evidencias (imágenes) para ejecuciones de TC
ALTER TABLE test_executions
  ADD COLUMN IF NOT EXISTS evidence TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE plan_executions
  ADD COLUMN IF NOT EXISTS evidence TEXT[] NOT NULL DEFAULT '{}';

-- Bucket de Storage para imágenes de evidencia
INSERT INTO storage.buckets (id, name, public) VALUES ('execution-evidence', 'execution-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket (storage.objects)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'evidencia_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "evidencia_select" ON storage.objects FOR SELECT USING (bucket_id = 'execution-evidence');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'evidencia_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "evidencia_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'execution-evidence' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Tabla separada para cache de Jira
CREATE TABLE IF NOT EXISTS jira_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'Medium',
  assignee TEXT NOT NULL DEFAULT 'Sin asignar',
  url TEXT NOT NULL DEFAULT '',
  issue_type TEXT NOT NULL DEFAULT 'Bug',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jira_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jira_cache_select' AND tablename = 'jira_cache') THEN
    CREATE POLICY "jira_cache_select" ON jira_cache FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jira_cache_insert' AND tablename = 'jira_cache') THEN
    CREATE POLICY "jira_cache_insert" ON jira_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jira_cache_update' AND tablename = 'jira_cache') THEN
    CREATE POLICY "jira_cache_update" ON jira_cache FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;
