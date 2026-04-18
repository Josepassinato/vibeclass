-- =============================================================
-- TENANT ISOLATION — denormaliza organization_id em tabelas de
-- conteúdo da Fábrica de Escolas e habilita RLS por organização.
-- Acesso admin/pipeline continua via service_role (bypassa RLS).
-- organization_id fica NULLABLE para não quebrar dados legados.
-- =============================================================

-- ---------- school_factory_documents ----------
ALTER TABLE public.school_factory_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.saas_organizations(id) ON DELETE CASCADE;

UPDATE public.school_factory_documents d
   SET organization_id = p.organization_id
  FROM public.school_factory_projects p
 WHERE d.project_id = p.id
   AND d.organization_id IS NULL
   AND p.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sfd_org
  ON public.school_factory_documents(organization_id, created_at DESC);

ALTER TABLE public.school_factory_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sfd read by org" ON public.school_factory_documents;
CREATE POLICY "sfd read by org"
  ON public.school_factory_documents FOR SELECT
  USING (organization_id IS NULL OR public.saas_is_org_member(organization_id));

DROP POLICY IF EXISTS "sfd service role manages" ON public.school_factory_documents;
CREATE POLICY "sfd service role manages"
  ON public.school_factory_documents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ---------- school_factory_tasks ----------
ALTER TABLE public.school_factory_tasks
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.saas_organizations(id) ON DELETE CASCADE;

UPDATE public.school_factory_tasks t
   SET organization_id = p.organization_id
  FROM public.school_factory_projects p
 WHERE t.project_id = p.id
   AND t.organization_id IS NULL
   AND p.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sft_org
  ON public.school_factory_tasks(organization_id, status, created_at DESC);

ALTER TABLE public.school_factory_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sft read by org" ON public.school_factory_tasks;
CREATE POLICY "sft read by org"
  ON public.school_factory_tasks FOR SELECT
  USING (organization_id IS NULL OR public.saas_is_org_member(organization_id));

DROP POLICY IF EXISTS "sft service role manages" ON public.school_factory_tasks;
CREATE POLICY "sft service role manages"
  ON public.school_factory_tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ---------- school_factory_tutor_pack_versions ----------
ALTER TABLE public.school_factory_tutor_pack_versions
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.saas_organizations(id) ON DELETE CASCADE;

UPDATE public.school_factory_tutor_pack_versions v
   SET organization_id = p.organization_id
  FROM public.school_factory_projects p
 WHERE v.project_id = p.id
   AND v.organization_id IS NULL
   AND p.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sftpv_org
  ON public.school_factory_tutor_pack_versions(organization_id, created_at DESC);

ALTER TABLE public.school_factory_tutor_pack_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sftpv read by org" ON public.school_factory_tutor_pack_versions;
CREATE POLICY "sftpv read by org"
  ON public.school_factory_tutor_pack_versions FOR SELECT
  USING (organization_id IS NULL OR public.saas_is_org_member(organization_id));

DROP POLICY IF EXISTS "sftpv service role manages" ON public.school_factory_tutor_pack_versions;
CREATE POLICY "sftpv service role manages"
  ON public.school_factory_tutor_pack_versions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- ---------- Trigger para manter organization_id sincronizado ----------
-- Quando um projeto migrar de organização (raro mas possível), cascata para filhos.
CREATE OR REPLACE FUNCTION public.sf_sync_children_organization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    UPDATE public.school_factory_documents
       SET organization_id = NEW.organization_id
     WHERE project_id = NEW.id;
    UPDATE public.school_factory_tasks
       SET organization_id = NEW.organization_id
     WHERE project_id = NEW.id;
    UPDATE public.school_factory_tutor_pack_versions
       SET organization_id = NEW.organization_id
     WHERE project_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sf_sync_children_org ON public.school_factory_projects;
CREATE TRIGGER trg_sf_sync_children_org
  AFTER UPDATE OF organization_id ON public.school_factory_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.sf_sync_children_organization();

-- ---------- Trigger para autopreencher organization_id em INSERT ----------
CREATE OR REPLACE FUNCTION public.sf_fill_organization_from_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
      FROM public.school_factory_projects
     WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sfd_fill_org ON public.school_factory_documents;
CREATE TRIGGER trg_sfd_fill_org
  BEFORE INSERT ON public.school_factory_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.sf_fill_organization_from_project();

DROP TRIGGER IF EXISTS trg_sft_fill_org ON public.school_factory_tasks;
CREATE TRIGGER trg_sft_fill_org
  BEFORE INSERT ON public.school_factory_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sf_fill_organization_from_project();

DROP TRIGGER IF EXISTS trg_sftpv_fill_org ON public.school_factory_tutor_pack_versions;
CREATE TRIGGER trg_sftpv_fill_org
  BEFORE INSERT ON public.school_factory_tutor_pack_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.sf_fill_organization_from_project();
