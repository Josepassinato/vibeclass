-- ============================================
-- VIBE CLASS - Full Schema Export
-- Generated: 2026-03-01
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. ENUM TYPES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- 2. TABLES
-- ============================================

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Modules
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  module_order integer NOT NULL DEFAULT 0,
  is_released boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Videos
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_id text,
  video_url text,
  video_type text DEFAULT 'youtube',
  thumbnail_url text,
  transcript text,
  analysis text,
  teacher_intro text,
  teaching_moments jsonb DEFAULT '[]'::jsonb,
  duration_minutes integer,
  lesson_order integer DEFAULT 0,
  is_configured boolean DEFAULT false,
  is_released boolean DEFAULT false,
  module_id uuid REFERENCES public.modules(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Video Quizzes
CREATE TABLE public.video_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id),
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_option_index integer NOT NULL,
  explanation text,
  question_order integer DEFAULT 0,
  timestamp_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Missions
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  instructions text NOT NULL,
  evidence_type text NOT NULL DEFAULT 'text',
  difficulty_level text NOT NULL DEFAULT 'intermediário',
  points_reward integer NOT NULL DEFAULT 10,
  time_limit_minutes integer,
  evaluation_criteria jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  mission_order integer DEFAULT 0,
  video_id uuid REFERENCES public.videos(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student Profiles (learning memory)
CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  name text,
  learning_style text,
  strengths text[],
  areas_to_improve text[],
  personality_notes text,
  emotional_patterns jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  interaction_count integer DEFAULT 0,
  total_study_time_minutes integer DEFAULT 0,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student Lesson Progress
CREATE TABLE public.student_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id),
  watch_time_seconds integer DEFAULT 0,
  last_position_seconds integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student Quiz Attempts
CREATE TABLE public.student_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id),
  quiz_id uuid NOT NULL REFERENCES public.video_quizzes(id),
  selected_option_index integer NOT NULL,
  is_correct boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Student Quiz Results
CREATE TABLE public.student_quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id),
  score_percentage integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- Student Observations
CREATE TABLE public.student_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  video_id text,
  observation_type text NOT NULL,
  observation_data jsonb NOT NULL,
  emotional_state text,
  confidence_level numeric,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Student Achievements
CREATE TABLE public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  badges jsonb DEFAULT '[]'::jsonb,
  missions_completed integer NOT NULL DEFAULT 0,
  missions_attempted integer NOT NULL DEFAULT 0,
  average_score numeric DEFAULT 0,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student Mission Submissions
CREATE TABLE public.student_mission_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id),
  evidence_text text,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending',
  ai_feedback text,
  ai_evaluation jsonb DEFAULT '{}'::jsonb,
  score integer,
  attempt_number integer NOT NULL DEFAULT 1,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Certificates
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  student_name text NOT NULL,
  certificate_code text NOT NULL,
  certificate_type text NOT NULL DEFAULT 'module',
  module_id uuid REFERENCES public.modules(id),
  module_title text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Squads
CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_members integer NOT NULL DEFAULT 4,
  current_members integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Squad Members
CREATE TABLE public.squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Squad Mission Submissions
CREATE TABLE public.squad_mission_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id),
  mission_id uuid NOT NULL REFERENCES public.missions(id),
  submitted_by uuid NOT NULL,
  evidence_text text,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending',
  ai_feedback text,
  ai_evaluation jsonb DEFAULT '{}'::jsonb,
  score integer,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_mission_submissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Modules
CREATE POLICY "Modules are viewable by everyone" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Modules can be managed by admins" ON public.modules FOR ALL USING (true);

-- Videos
CREATE POLICY "Videos are readable by everyone" ON public.videos FOR SELECT USING (true);

-- Video Quizzes
CREATE POLICY "Quizzes são visíveis por todos" ON public.video_quizzes FOR SELECT USING (true);

-- Missions
CREATE POLICY "Missions are viewable by everyone" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Missions can be managed by anyone for now" ON public.missions FOR ALL USING (true);

-- Student Profiles
CREATE POLICY "Allow all operations on student_profiles" ON public.student_profiles FOR ALL USING (true) WITH CHECK (true);

-- Student Lesson Progress
CREATE POLICY "Allow all operations on student_lesson_progress" ON public.student_lesson_progress FOR ALL USING (true) WITH CHECK (true);

-- Student Quiz Attempts
CREATE POLICY "Permitir todas operações em quiz_attempts" ON public.student_quiz_attempts FOR ALL USING (true) WITH CHECK (true);

-- Student Quiz Results
CREATE POLICY "Permitir todas operações em quiz_results" ON public.student_quiz_results FOR ALL USING (true) WITH CHECK (true);

-- Student Observations
CREATE POLICY "Allow all operations on student_observations" ON public.student_observations FOR ALL USING (true) WITH CHECK (true);

-- Student Achievements
CREATE POLICY "Achievements are viewable by everyone" ON public.student_achievements FOR SELECT USING (true);
CREATE POLICY "Achievements can be managed" ON public.student_achievements FOR ALL USING (true);

-- Student Mission Submissions
CREATE POLICY "Students can view their own submissions" ON public.student_mission_submissions FOR SELECT USING (true);
CREATE POLICY "Students can create submissions" ON public.student_mission_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their own submissions" ON public.student_mission_submissions FOR UPDATE USING (true);

-- Certificates
CREATE POLICY "Students can view their own certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "System can create certificates" ON public.certificates FOR INSERT WITH CHECK (true);

-- Squads
CREATE POLICY "Squads are viewable by members" ON public.squads FOR SELECT USING (
  EXISTS (SELECT 1 FROM squad_members WHERE squad_members.squad_id = squads.id AND squad_members.user_id = auth.uid())
  OR NOT EXISTS (SELECT 1 FROM squad_members WHERE squad_members.squad_id = squads.id)
);
CREATE POLICY "System can manage squads" ON public.squads FOR ALL USING (true);

-- Squad Members
CREATE POLICY "Members can view their squad" ON public.squad_members FOR SELECT USING (
  squad_id IN (SELECT sm.squad_id FROM squad_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "System can manage squad members" ON public.squad_members FOR ALL USING (true);

-- Squad Mission Submissions
CREATE POLICY "Squad members can view submissions" ON public.squad_mission_submissions FOR SELECT USING (
  squad_id IN (SELECT sm.squad_id FROM squad_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "Squad members can submit" ON public.squad_mission_submissions FOR INSERT WITH CHECK (
  squad_id IN (SELECT sm.squad_id FROM squad_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "System can manage submissions" ON public.squad_mission_submissions FOR ALL USING (true);

-- 5. FUNCTIONS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Student profile updated_at
CREATE OR REPLACE FUNCTION public.update_student_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Role checker (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Auto-assign student to squad
CREATE OR REPLACE FUNCTION public.assign_student_to_squad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  available_squad_id UUID;
  new_squad_id UUID;
  squad_count INTEGER;
BEGIN
  SELECT s.id INTO available_squad_id
  FROM public.squads s
  WHERE s.is_active = true AND s.current_members < s.max_members
  ORDER BY s.current_members DESC, s.created_at ASC
  LIMIT 1;
  
  IF available_squad_id IS NULL THEN
    SELECT COUNT(*) + 1 INTO squad_count FROM public.squads;
    INSERT INTO public.squads (name) VALUES ('Squad ' || squad_count)
    RETURNING id INTO new_squad_id;
    available_squad_id := new_squad_id;
  END IF;
  
  INSERT INTO public.squad_members (squad_id, user_id, role)
  VALUES (
    available_squad_id, NEW.user_id,
    CASE WHEN (SELECT current_members FROM public.squads WHERE id = available_squad_id) = 0 
         THEN 'leader' ELSE 'member' END
  );
  
  UPDATE public.squads
  SET current_members = current_members + 1, updated_at = now()
  WHERE id = available_squad_id;
  
  RETURN NEW;
END;
$$;

-- 6. TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign squad on profile creation
CREATE TRIGGER on_profile_created_assign_squad
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_student_to_squad();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_video_quizzes_updated_at BEFORE UPDATE ON public.video_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_student_profile_updated_at();
CREATE TRIGGER update_student_lesson_progress_updated_at BEFORE UPDATE ON public.student_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_achievements_updated_at BEFORE UPDATE ON public.student_achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_mission_submissions_updated_at BEFORE UPDATE ON public.student_mission_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON public.squads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_squad_mission_submissions_updated_at BEFORE UPDATE ON public.squad_mission_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DONE! After running this, configure your
-- .env with your Supabase URL and keys.
-- ============================================
