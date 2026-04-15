-- Fix infinite recursion in squad RLS policies
-- Problem: squad_members SELECT policy queries squad_members itself
-- Solution: Use direct user_id check instead of subquery

-- 1. Drop recursive policies
DROP POLICY IF EXISTS "Members can view their squad" ON public.squad_members;
DROP POLICY IF EXISTS "Squads are viewable by members" ON public.squads;
DROP POLICY IF EXISTS "Squad members can view submissions" ON public.squad_mission_submissions;
DROP POLICY IF EXISTS "Squad members can submit" ON public.squad_mission_submissions;

-- 2. Fix squad_members: direct check, no self-reference
CREATE POLICY "Members can view their squad"
  ON public.squad_members FOR SELECT
  USING (user_id = auth.uid());

-- 3. Fix squads: use security definer function to avoid cross-table recursion
CREATE OR REPLACE FUNCTION public.user_squad_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT squad_id FROM public.squad_members WHERE user_id = uid;
$$;

CREATE POLICY "Squads are viewable by members"
  ON public.squads FOR SELECT
  USING (
    id IN (SELECT public.user_squad_ids(auth.uid()))
    OR NOT EXISTS (SELECT 1 FROM public.squad_members WHERE squad_members.squad_id = squads.id)
  );

-- 4. Fix squad_mission_submissions: use the same function
CREATE POLICY "Squad members can view submissions"
  ON public.squad_mission_submissions FOR SELECT
  USING (squad_id IN (SELECT public.user_squad_ids(auth.uid())));

CREATE POLICY "Squad members can submit"
  ON public.squad_mission_submissions FOR INSERT
  WITH CHECK (squad_id IN (SELECT public.user_squad_ids(auth.uid())));
