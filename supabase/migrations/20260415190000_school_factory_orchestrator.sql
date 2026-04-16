-- =============================================================
-- SCHOOL FACTORY ORCHESTRATOR
-- Pipeline multiagente para criar/operar escola automaticamente
-- =============================================================

CREATE TABLE IF NOT EXISTS public.school_factory_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text,
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('create_zero', 'takeover')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'planning',
    'ready_for_approval',
    'in_production',
    'ready_to_publish',
    'published',
    'blocked',
    'failed'
  )),
  initial_capital numeric(12,2),
  niche text,
  target_audience text,
  objective text,
  business_context jsonb NOT NULL DEFAULT '{}',
  master_plan jsonb,
  tutor_pack jsonb,
  qa_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_factory_projects_status
  ON public.school_factory_projects(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.school_factory_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.school_factory_projects(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'text' CHECK (source_type IN ('text', 'pdf', 'url')),
  title text NOT NULL,
  source_url text,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_factory_documents_project
  ON public.school_factory_documents(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.school_factory_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.school_factory_projects(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN (
    'curriculum_finalize',
    'script_generation',
    'video_generation',
    'tutor_training',
    'qa_review',
    'publish_preparation',
    'human_handoff'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'blocked', 'failed')),
  priority integer NOT NULL DEFAULT 100,
  assigned_agent text NOT NULL DEFAULT 'orchestrator',
  lesson_key text,
  title text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb NOT NULL DEFAULT '{}',
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  due_at timestamptz,
  next_follow_up_at timestamptz,
  assignee_name text,
  assignee_whatsapp text,
  assignee_email text,
  handoff_summary text,
  last_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_factory_tasks_queue
  ON public.school_factory_tasks(project_id, status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_school_factory_tasks_handoffs
  ON public.school_factory_tasks(project_id, task_type, status)
  WHERE task_type = 'human_handoff';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_school_factory_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_factory_projects_updated_at ON public.school_factory_projects;
CREATE TRIGGER trg_school_factory_projects_updated_at
  BEFORE UPDATE ON public.school_factory_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_school_factory_updated_at();

DROP TRIGGER IF EXISTS trg_school_factory_tasks_updated_at ON public.school_factory_tasks;
CREATE TRIGGER trg_school_factory_tasks_updated_at
  BEFORE UPDATE ON public.school_factory_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_school_factory_updated_at();

-- RLS (MVP permissivo para manter compatibilidade com o projeto atual)
ALTER TABLE public.school_factory_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view school factory projects"
  ON public.school_factory_projects FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage school factory projects"
  ON public.school_factory_projects FOR ALL
  USING (true);

CREATE POLICY "Anyone can view school factory documents"
  ON public.school_factory_documents FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage school factory documents"
  ON public.school_factory_documents FOR ALL
  USING (true);

CREATE POLICY "Anyone can view school factory tasks"
  ON public.school_factory_tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage school factory tasks"
  ON public.school_factory_tasks FOR ALL
  USING (true);
