-- =============================================================
-- SCHOOL FACTORY OPS ENHANCEMENTS
-- Budget control, tutor pack versioning, SLA and PDF docs bucket
-- =============================================================

ALTER TABLE public.school_factory_projects
  ADD COLUMN IF NOT EXISTS budget_limit_usd numeric(12,2) DEFAULT 300,
  ADD COLUMN IF NOT EXISTS budget_spent_usd numeric(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_hard_stop boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS qa_min_score integer DEFAULT 75,
  ADD COLUMN IF NOT EXISTS video_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_runner_at timestamptz,
  ADD COLUMN IF NOT EXISTS runner_heartbeat jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.school_factory_tasks
  ADD COLUMN IF NOT EXISTS sla_minutes integer DEFAULT 240,
  ADD COLUMN IF NOT EXISTS cost_estimate_usd numeric(12,4) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.school_factory_cost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.school_factory_projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.school_factory_tasks(id) ON DELETE SET NULL,
  provider text NOT NULL,
  amount_usd numeric(12,4) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_factory_cost_events_project
  ON public.school_factory_cost_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_factory_cost_events_task
  ON public.school_factory_cost_events(task_id);

CREATE TABLE IF NOT EXISTS public.school_factory_tutor_pack_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.school_factory_projects(id) ON DELETE CASCADE,
  version integer NOT NULL,
  tutor_pack jsonb NOT NULL,
  created_by_task_id uuid REFERENCES public.school_factory_tasks(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_school_factory_tutor_versions_project
  ON public.school_factory_tutor_pack_versions(project_id, version DESC);

ALTER TABLE public.school_factory_cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_tutor_pack_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view school factory costs" ON public.school_factory_cost_events;
CREATE POLICY "Anyone can view school factory costs"
  ON public.school_factory_cost_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage school factory costs" ON public.school_factory_cost_events;
CREATE POLICY "Anyone can manage school factory costs"
  ON public.school_factory_cost_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can view tutor pack versions" ON public.school_factory_tutor_pack_versions;
CREATE POLICY "Anyone can view tutor pack versions"
  ON public.school_factory_tutor_pack_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage tutor pack versions" ON public.school_factory_tutor_pack_versions;
CREATE POLICY "Anyone can manage tutor pack versions"
  ON public.school_factory_tutor_pack_versions FOR ALL USING (true);

-- Bucket para upload de PDFs da fábrica
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-factory-docs',
  'school-factory-docs',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "School factory docs read" ON storage.objects;
CREATE POLICY "School factory docs read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school-factory-docs');

DROP POLICY IF EXISTS "School factory docs insert" ON storage.objects;
CREATE POLICY "School factory docs insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'school-factory-docs');

DROP POLICY IF EXISTS "School factory docs update" ON storage.objects;
CREATE POLICY "School factory docs update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'school-factory-docs')
  WITH CHECK (bucket_id = 'school-factory-docs');

DROP POLICY IF EXISTS "School factory docs delete" ON storage.objects;
CREATE POLICY "School factory docs delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'school-factory-docs');
