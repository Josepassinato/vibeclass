-- =============================================
-- SECURITY FIX: Replace all insecure RLS policies
-- Previous policies used USING (true) allowing anyone to read/modify all data
-- New policies restrict access based on auth.uid()
-- =============================================

-- Helper: Check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================
-- 1. student_profiles
-- =============================================
DROP POLICY IF EXISTS "Allow all operations on student_profiles" ON public.student_profiles;

CREATE POLICY "Students can view their own profile"
ON public.student_profiles FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can insert their own profile"
ON public.student_profiles FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Students can update their own profile"
ON public.student_profiles FOR UPDATE
USING (student_id = auth.uid()::text)
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all student profiles"
ON public.student_profiles FOR SELECT
USING (public.is_admin());

-- =============================================
-- 2. student_observations
-- =============================================
DROP POLICY IF EXISTS "Allow all operations on student_observations" ON public.student_observations;

CREATE POLICY "Students can view their own observations"
ON public.student_observations FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can insert their own observations"
ON public.student_observations FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all observations"
ON public.student_observations FOR SELECT
USING (public.is_admin());

-- =============================================
-- 3. student_lesson_progress
-- =============================================
DROP POLICY IF EXISTS "Allow all operations on student_lesson_progress" ON public.student_lesson_progress;

CREATE POLICY "Students can view their own lesson progress"
ON public.student_lesson_progress FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can insert their own lesson progress"
ON public.student_lesson_progress FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Students can update their own lesson progress"
ON public.student_lesson_progress FOR UPDATE
USING (student_id = auth.uid()::text)
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all lesson progress"
ON public.student_lesson_progress FOR SELECT
USING (public.is_admin());

-- =============================================
-- 4. student_quiz_attempts
-- =============================================
DROP POLICY IF EXISTS "Permitir todas operações em quiz_attempts" ON public.student_quiz_attempts;

CREATE POLICY "Students can view their own quiz attempts"
ON public.student_quiz_attempts FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can insert their own quiz attempts"
ON public.student_quiz_attempts FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all quiz attempts"
ON public.student_quiz_attempts FOR SELECT
USING (public.is_admin());

-- =============================================
-- 5. student_quiz_results
-- =============================================
DROP POLICY IF EXISTS "Permitir todas operações em quiz_results" ON public.student_quiz_results;

CREATE POLICY "Students can view their own quiz results"
ON public.student_quiz_results FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can insert their own quiz results"
ON public.student_quiz_results FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all quiz results"
ON public.student_quiz_results FOR SELECT
USING (public.is_admin());

-- =============================================
-- 6. missions (public read, admin write)
-- =============================================
DROP POLICY IF EXISTS "Missions are viewable by everyone" ON public.missions;
DROP POLICY IF EXISTS "Missions can be managed by anyone for now" ON public.missions;

CREATE POLICY "Missions are viewable by authenticated users"
ON public.missions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage missions"
ON public.missions FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update missions"
ON public.missions FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete missions"
ON public.missions FOR DELETE
USING (public.is_admin());

-- =============================================
-- 7. student_mission_submissions
-- =============================================
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.student_mission_submissions;
DROP POLICY IF EXISTS "Students can create submissions" ON public.student_mission_submissions;
DROP POLICY IF EXISTS "Students can update their own submissions" ON public.student_mission_submissions;

CREATE POLICY "Students can view own mission submissions"
ON public.student_mission_submissions FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can create own mission submissions"
ON public.student_mission_submissions FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Students can update own mission submissions"
ON public.student_mission_submissions FOR UPDATE
USING (student_id = auth.uid()::text)
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all mission submissions"
ON public.student_mission_submissions FOR SELECT
USING (public.is_admin());

-- =============================================
-- 8. student_achievements
-- =============================================
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.student_achievements;
DROP POLICY IF EXISTS "Achievements can be managed" ON public.student_achievements;

CREATE POLICY "Students can view their own achievements"
ON public.student_achievements FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Students can insert their own achievements"
ON public.student_achievements FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Students can update their own achievements"
ON public.student_achievements FOR UPDATE
USING (student_id = auth.uid()::text)
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all achievements"
ON public.student_achievements FOR SELECT
USING (public.is_admin());

-- =============================================
-- 9. modules (public read, admin write)
-- =============================================
DROP POLICY IF EXISTS "Modules are viewable by everyone" ON public.modules;
DROP POLICY IF EXISTS "Modules can be managed by admins" ON public.modules;

CREATE POLICY "Modules are viewable by authenticated users"
ON public.modules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage modules"
ON public.modules FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update modules"
ON public.modules FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete modules"
ON public.modules FOR DELETE
USING (public.is_admin());

-- =============================================
-- 10. squads (remove overly permissive policies)
-- =============================================
DROP POLICY IF EXISTS "System can manage squads" ON public.squads;

CREATE POLICY "Admins can manage squads"
ON public.squads FOR ALL
USING (public.is_admin());

-- =============================================
-- 11. squad_members (remove overly permissive policies)
-- =============================================
DROP POLICY IF EXISTS "System can manage squad members" ON public.squad_members;

CREATE POLICY "Admins can manage squad members"
ON public.squad_members FOR ALL
USING (public.is_admin());

-- =============================================
-- 12. squad_mission_submissions (remove overly permissive policies)
-- =============================================
DROP POLICY IF EXISTS "System can manage submissions" ON public.squad_mission_submissions;

CREATE POLICY "Admins can manage squad submissions"
ON public.squad_mission_submissions FOR ALL
USING (public.is_admin());

-- =============================================
-- 13. certificates
-- =============================================
DROP POLICY IF EXISTS "Students can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "System can create certificates" ON public.certificates;

CREATE POLICY "Students can view own certificates"
ON public.certificates FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Admins can view all certificates"
ON public.certificates FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can create certificates"
ON public.certificates FOR INSERT
WITH CHECK (public.is_admin());
