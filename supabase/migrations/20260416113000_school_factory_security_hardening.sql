-- =============================================================
-- SCHOOL FACTORY SECURITY HARDENING
-- Remove public-write policies and require authenticated access
-- =============================================================

ALTER TABLE public.school_factory_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_factory_tutor_pack_versions ENABLE ROW LEVEL SECURITY;

-- Projects
DROP POLICY IF EXISTS "Anyone can view school factory projects" ON public.school_factory_projects;
DROP POLICY IF EXISTS "Anyone can manage school factory projects" ON public.school_factory_projects;
DROP POLICY IF EXISTS "School factory projects read" ON public.school_factory_projects;
DROP POLICY IF EXISTS "School factory projects manage" ON public.school_factory_projects;

CREATE POLICY "School factory projects read"
  ON public.school_factory_projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "School factory projects manage"
  ON public.school_factory_projects FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Documents
DROP POLICY IF EXISTS "Anyone can view school factory documents" ON public.school_factory_documents;
DROP POLICY IF EXISTS "Anyone can manage school factory documents" ON public.school_factory_documents;
DROP POLICY IF EXISTS "School factory documents read" ON public.school_factory_documents;
DROP POLICY IF EXISTS "School factory documents manage" ON public.school_factory_documents;

CREATE POLICY "School factory documents read"
  ON public.school_factory_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "School factory documents manage"
  ON public.school_factory_documents FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Tasks
DROP POLICY IF EXISTS "Anyone can view school factory tasks" ON public.school_factory_tasks;
DROP POLICY IF EXISTS "Anyone can manage school factory tasks" ON public.school_factory_tasks;
DROP POLICY IF EXISTS "School factory tasks read" ON public.school_factory_tasks;
DROP POLICY IF EXISTS "School factory tasks manage" ON public.school_factory_tasks;

CREATE POLICY "School factory tasks read"
  ON public.school_factory_tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "School factory tasks manage"
  ON public.school_factory_tasks FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Cost events
DROP POLICY IF EXISTS "Anyone can view school factory costs" ON public.school_factory_cost_events;
DROP POLICY IF EXISTS "Anyone can manage school factory costs" ON public.school_factory_cost_events;
DROP POLICY IF EXISTS "School factory costs read" ON public.school_factory_cost_events;
DROP POLICY IF EXISTS "School factory costs manage" ON public.school_factory_cost_events;

CREATE POLICY "School factory costs read"
  ON public.school_factory_cost_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "School factory costs manage"
  ON public.school_factory_cost_events FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Tutor pack versions
DROP POLICY IF EXISTS "Anyone can view tutor pack versions" ON public.school_factory_tutor_pack_versions;
DROP POLICY IF EXISTS "Anyone can manage tutor pack versions" ON public.school_factory_tutor_pack_versions;
DROP POLICY IF EXISTS "School factory tutor versions read" ON public.school_factory_tutor_pack_versions;
DROP POLICY IF EXISTS "School factory tutor versions manage" ON public.school_factory_tutor_pack_versions;

CREATE POLICY "School factory tutor versions read"
  ON public.school_factory_tutor_pack_versions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "School factory tutor versions manage"
  ON public.school_factory_tutor_pack_versions FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Storage bucket for uploaded PDFs
DROP POLICY IF EXISTS "School factory docs read" ON storage.objects;
DROP POLICY IF EXISTS "School factory docs insert" ON storage.objects;
DROP POLICY IF EXISTS "School factory docs update" ON storage.objects;
DROP POLICY IF EXISTS "School factory docs delete" ON storage.objects;

CREATE POLICY "School factory docs read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school-factory-docs' AND auth.role() = 'authenticated');

CREATE POLICY "School factory docs insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'school-factory-docs' AND auth.role() = 'authenticated');

CREATE POLICY "School factory docs update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'school-factory-docs' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'school-factory-docs' AND auth.role() = 'authenticated');

CREATE POLICY "School factory docs delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'school-factory-docs' AND auth.role() = 'authenticated');
