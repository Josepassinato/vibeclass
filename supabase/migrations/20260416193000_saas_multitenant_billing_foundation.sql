-- =============================================================
-- SAAS MULTI-TENANT + BILLING FOUNDATION
-- Organizations, memberships, plans, subscriptions, usage limits
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'saas_member_role'
  ) THEN
    CREATE TYPE public.saas_member_role AS ENUM (
      'owner',
      'admin',
      'manager',
      'instructor',
      'student'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'saas_subscription_status'
  ) THEN
    CREATE TYPE public.saas_subscription_status AS ENUM (
      'trialing',
      'active',
      'past_due',
      'paused',
      'canceled',
      'incomplete'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.saas_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  owner_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.saas_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.saas_member_role NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  invited_email text,
  invited_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.saas_plan_limits (
  plan_code text PRIMARY KEY,
  plan_name text NOT NULL,
  max_projects integer NOT NULL DEFAULT 1,
  max_members integer NOT NULL DEFAULT 3,
  max_videos_per_month integer NOT NULL DEFAULT 20,
  max_tasks_per_month integer NOT NULL DEFAULT 200,
  monthly_spend_limit_usd numeric(12,2) NOT NULL DEFAULT 100,
  supports_white_label boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.saas_organizations(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.saas_plan_limits(plan_code),
  status public.saas_subscription_status NOT NULL DEFAULT 'trialing',
  provider text NOT NULL DEFAULT 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  is_current boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_subscriptions_current
  ON public.saas_subscriptions(organization_id)
  WHERE is_current = true;

CREATE TABLE IF NOT EXISTS public.saas_usage_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.saas_organizations(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  projects_created integer NOT NULL DEFAULT 0,
  tasks_executed integer NOT NULL DEFAULT 0,
  videos_generated integer NOT NULL DEFAULT 0,
  spend_usd numeric(12,4) NOT NULL DEFAULT 0,
  members_added integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_saas_memberships_org
  ON public.saas_memberships(organization_id, role, status);

CREATE INDEX IF NOT EXISTS idx_saas_usage_monthly_org
  ON public.saas_usage_monthly(organization_id, reference_month DESC);

ALTER TABLE public.school_factory_projects
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.saas_organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_school_factory_projects_org
  ON public.school_factory_projects(organization_id, created_at DESC);

INSERT INTO public.saas_plan_limits (
  plan_code,
  plan_name,
  max_projects,
  max_members,
  max_videos_per_month,
  max_tasks_per_month,
  monthly_spend_limit_usd,
  supports_white_label,
  metadata
)
VALUES
  (
    'starter',
    'Starter',
    2,
    5,
    40,
    500,
    200,
    false,
    '{"target":"small teams"}'::jsonb
  ),
  (
    'growth',
    'Growth',
    10,
    30,
    250,
    3000,
    1200,
    true,
    '{"target":"growing schools"}'::jsonb
  ),
  (
    'scale',
    'Scale',
    100,
    300,
    2000,
    20000,
    10000,
    true,
    '{"target":"large operations"}'::jsonb
  )
ON CONFLICT (plan_code) DO UPDATE
SET
  plan_name = EXCLUDED.plan_name,
  max_projects = EXCLUDED.max_projects,
  max_members = EXCLUDED.max_members,
  max_videos_per_month = EXCLUDED.max_videos_per_month,
  max_tasks_per_month = EXCLUDED.max_tasks_per_month,
  monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
  supports_white_label = EXCLUDED.supports_white_label,
  metadata = EXCLUDED.metadata,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.saas_month_start(input_ts timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('month', input_ts)::date;
$$;

CREATE OR REPLACE FUNCTION public.saas_increment_usage(
  p_organization_id uuid,
  p_reference_month date DEFAULT public.saas_month_start(now()),
  p_projects_created integer DEFAULT 0,
  p_tasks_executed integer DEFAULT 0,
  p_videos_generated integer DEFAULT 0,
  p_spend_usd numeric DEFAULT 0,
  p_members_added integer DEFAULT 0
)
RETURNS public.saas_usage_monthly
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.saas_usage_monthly;
BEGIN
  INSERT INTO public.saas_usage_monthly (
    organization_id,
    reference_month,
    projects_created,
    tasks_executed,
    videos_generated,
    spend_usd,
    members_added
  )
  VALUES (
    p_organization_id,
    COALESCE(p_reference_month, public.saas_month_start(now())),
    GREATEST(p_projects_created, 0),
    GREATEST(p_tasks_executed, 0),
    GREATEST(p_videos_generated, 0),
    GREATEST(p_spend_usd, 0),
    GREATEST(p_members_added, 0)
  )
  ON CONFLICT (organization_id, reference_month) DO UPDATE
  SET
    projects_created = public.saas_usage_monthly.projects_created + GREATEST(p_projects_created, 0),
    tasks_executed = public.saas_usage_monthly.tasks_executed + GREATEST(p_tasks_executed, 0),
    videos_generated = public.saas_usage_monthly.videos_generated + GREATEST(p_videos_generated, 0),
    spend_usd = public.saas_usage_monthly.spend_usd + GREATEST(p_spend_usd, 0),
    members_added = public.saas_usage_monthly.members_added + GREATEST(p_members_added, 0),
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_is_org_member(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.saas_memberships m
    WHERE m.organization_id = _organization_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

DO $$
DECLARE
  v_legacy_org_id uuid;
BEGIN
  SELECT id
  INTO v_legacy_org_id
  FROM public.saas_organizations
  WHERE slug = 'legacy-tenant'
  LIMIT 1;

  IF v_legacy_org_id IS NULL THEN
    INSERT INTO public.saas_organizations (
      name,
      slug,
      status,
      metadata
    )
    VALUES (
      'Legacy Tenant',
      'legacy-tenant',
      'active',
      '{"seeded_by":"20260416193000_saas_multitenant_billing_foundation"}'::jsonb
    )
    RETURNING id INTO v_legacy_org_id;
  END IF;

  UPDATE public.school_factory_projects
  SET organization_id = v_legacy_org_id
  WHERE organization_id IS NULL;

  INSERT INTO public.saas_subscriptions (
    organization_id,
    plan_code,
    status,
    provider,
    is_current,
    metadata
  )
  SELECT
    v_legacy_org_id,
    'starter',
    'active',
    'manual',
    true,
    '{"seeded":"legacy-bootstrap"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.saas_subscriptions s
    WHERE s.organization_id = v_legacy_org_id
      AND s.is_current = true
  );
END;
$$;

ALTER TABLE public.saas_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS org read by membership" ON public.saas_organizations;
CREATE POLICY "SaaS org read by membership"
  ON public.saas_organizations FOR SELECT
  USING (public.saas_is_org_member(id));

DROP POLICY IF EXISTS "SaaS org manage service role" ON public.saas_organizations;
CREATE POLICY "SaaS org manage service role"
  ON public.saas_organizations FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "SaaS membership read by org membership" ON public.saas_memberships;
CREATE POLICY "SaaS membership read by org membership"
  ON public.saas_memberships FOR SELECT
  USING (public.saas_is_org_member(organization_id));

DROP POLICY IF EXISTS "SaaS membership manage service role" ON public.saas_memberships;
CREATE POLICY "SaaS membership manage service role"
  ON public.saas_memberships FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "SaaS plan limits read authenticated" ON public.saas_plan_limits;
CREATE POLICY "SaaS plan limits read authenticated"
  ON public.saas_plan_limits FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "SaaS plan limits manage service role" ON public.saas_plan_limits;
CREATE POLICY "SaaS plan limits manage service role"
  ON public.saas_plan_limits FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "SaaS subscription read by org membership" ON public.saas_subscriptions;
CREATE POLICY "SaaS subscription read by org membership"
  ON public.saas_subscriptions FOR SELECT
  USING (public.saas_is_org_member(organization_id));

DROP POLICY IF EXISTS "SaaS subscription manage service role" ON public.saas_subscriptions;
CREATE POLICY "SaaS subscription manage service role"
  ON public.saas_subscriptions FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "SaaS usage read by org membership" ON public.saas_usage_monthly;
CREATE POLICY "SaaS usage read by org membership"
  ON public.saas_usage_monthly FOR SELECT
  USING (public.saas_is_org_member(organization_id));

DROP POLICY IF EXISTS "SaaS usage manage service role" ON public.saas_usage_monthly;
CREATE POLICY "SaaS usage manage service role"
  ON public.saas_usage_monthly FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

