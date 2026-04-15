import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportDataButtonProps {
  password: string;
}

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toInsert(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- No data in ${table}\n`;
  const cols = Object.keys(rows[0]);
  const lines = rows.map(r => `(${cols.map(c => escapeSQL(r[c])).join(", ")})`);
  return `INSERT INTO public.${table} (${cols.join(", ")}) VALUES\n${lines.join(",\n")};\n\n`;
}

const SCHEMA = `-- ============================================
-- VIBE CODE / WHITE LABEL - Schema Completo
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

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

CREATE TABLE public.student_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id),
  quiz_id uuid NOT NULL REFERENCES public.video_quizzes(id),
  selected_option_index integer NOT NULL,
  is_correct boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_members integer NOT NULL DEFAULT 4,
  current_members integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);

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

-- ENABLE RLS
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

-- RLS POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Modules are viewable by everyone" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Modules can be managed by admins" ON public.modules FOR ALL USING (true);
CREATE POLICY "Videos are readable by everyone" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Quizzes são visíveis por todos" ON public.video_quizzes FOR SELECT USING (true);
CREATE POLICY "Missions are viewable by everyone" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Missions can be managed by anyone for now" ON public.missions FOR ALL USING (true);
CREATE POLICY "Allow all operations on student_profiles" ON public.student_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on student_lesson_progress" ON public.student_lesson_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todas operações em quiz_attempts" ON public.student_quiz_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todas operações em quiz_results" ON public.student_quiz_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on student_observations" ON public.student_observations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Achievements are viewable by everyone" ON public.student_achievements FOR SELECT USING (true);
CREATE POLICY "Achievements can be managed" ON public.student_achievements FOR ALL USING (true);
CREATE POLICY "Students can view their own submissions" ON public.student_mission_submissions FOR SELECT USING (true);
CREATE POLICY "Students can create submissions" ON public.student_mission_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their own submissions" ON public.student_mission_submissions FOR UPDATE USING (true);
CREATE POLICY "Students can view their own certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "System can create certificates" ON public.certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "Squads are viewable by members" ON public.squads FOR SELECT USING (true);
CREATE POLICY "System can manage squads" ON public.squads FOR ALL USING (true);
CREATE POLICY "Members can view their squad" ON public.squad_members FOR SELECT USING (true);
CREATE POLICY "System can manage squad members" ON public.squad_members FOR ALL USING (true);
CREATE POLICY "Squad members can view submissions" ON public.squad_mission_submissions FOR SELECT USING (true);
CREATE POLICY "Squad members can submit" ON public.squad_mission_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "System can manage submissions" ON public.squad_mission_submissions FOR ALL USING (true);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_student_to_squad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  available_squad_id UUID; new_squad_id UUID; squad_count INTEGER;
BEGIN
  SELECT s.id INTO available_squad_id FROM public.squads s
  WHERE s.is_active = true AND s.current_members < s.max_members
  ORDER BY s.current_members DESC, s.created_at ASC LIMIT 1;
  IF available_squad_id IS NULL THEN
    SELECT COUNT(*) + 1 INTO squad_count FROM public.squads;
    INSERT INTO public.squads (name) VALUES ('Squad ' || squad_count) RETURNING id INTO new_squad_id;
    available_squad_id := new_squad_id;
  END IF;
  INSERT INTO public.squad_members (squad_id, user_id, role) VALUES (
    available_squad_id, NEW.user_id,
    CASE WHEN (SELECT current_members FROM public.squads WHERE id = available_squad_id) = 0 THEN 'leader' ELSE 'member' END
  );
  UPDATE public.squads SET current_members = current_members + 1, updated_at = now() WHERE id = available_squad_id;
  RETURN NEW;
END; $$;

-- TRIGGERS
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_profile_created_assign_squad AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_student_to_squad();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_video_quizzes_updated_at BEFORE UPDATE ON public.video_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_lesson_progress_updated_at BEFORE UPDATE ON public.student_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_achievements_updated_at BEFORE UPDATE ON public.student_achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_mission_submissions_updated_at BEFORE UPDATE ON public.student_mission_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON public.squads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_squad_mission_submissions_updated_at BEFORE UPDATE ON public.squad_mission_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

`;

export function ExportDataButton({ password }: ExportDataButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSQL, setIsExportingSQL] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      const [
        videosRes, modulesRes, quizzesRes, missionsRes,
        progressRes, quizResultsRes, achievementsRes,
        certificatesRes, squadsRes, squadMembersRes, submissionsRes,
      ] = await Promise.all([
        supabase.from('videos').select('*').order('lesson_order', { ascending: true }),
        supabase.from('modules').select('*').order('module_order', { ascending: true }),
        supabase.from('video_quizzes').select('*').order('video_id').order('question_order', { ascending: true }),
        supabase.from('missions').select('*').order('mission_order', { ascending: true }),
        supabase.from('student_lesson_progress').select('*').order('created_at', { ascending: false }),
        supabase.from('student_quiz_results').select('*').order('completed_at', { ascending: false }),
        supabase.from('student_achievements').select('*').order('updated_at', { ascending: false }),
        supabase.from('certificates').select('*').order('created_at', { ascending: false }),
        supabase.from('squads').select('*').order('created_at', { ascending: true }),
        supabase.from('squad_members').select('*'),
        supabase.from('student_mission_submissions').select('*').order('submitted_at', { ascending: false }),
      ]);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        tables: {
          modules: modulesRes.data || [],
          videos: videosRes.data || [],
          video_quizzes: quizzesRes.data || [],
          missions: missionsRes.data || [],
          student_lesson_progress: progressRes.data || [],
          student_quiz_results: quizResultsRes.data || [],
          student_achievements: achievementsRes.data || [],
          student_mission_submissions: submissionsRes.data || [],
          certificates: certificatesRes.data || [],
          squads: squadsRes.data || [],
          squad_members: squadMembersRes.data || [],
        },
        summary: {
          modules: (modulesRes.data || []).length,
          videos: (videosRes.data || []).length,
          quizzes: (quizzesRes.data || []).length,
          missions: (missionsRes.data || []).length,
          student_progress: (progressRes.data || []).length,
          quiz_results: (quizResultsRes.data || []).length,
          achievements: (achievementsRes.data || []).length,
          submissions: (submissionsRes.data || []).length,
          certificates: (certificatesRes.data || []).length,
          squads: (squadsRes.data || []).length,
          squad_members: (squadMembersRes.data || []).length,
        },
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-12brain-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(exportPayload.summary).reduce((a, b) => a + b, 0);
      toast.success(`Exportação concluída! ${totalRecords} registros em ${Object.keys(exportPayload.tables).length} tabelas.`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSQL = async () => {
    setIsExportingSQL(true);
    try {
      // Fetch all data client-side
      const [
        modules, videos, quizzes, missions,
        progress, quizResults, quizAttempts,
        achievements, submissions, certificates,
        profiles, studentProfiles, observations,
        squads, squadMembers, squadSubmissions, userRoles,
      ] = await Promise.all([
        supabase.from("modules").select("*").order("module_order"),
        supabase.from("videos").select("*").order("lesson_order"),
        supabase.from("video_quizzes").select("*").order("video_id").order("question_order"),
        supabase.from("missions").select("*").order("mission_order"),
        supabase.from("student_lesson_progress").select("*"),
        supabase.from("student_quiz_results").select("*"),
        supabase.from("student_quiz_attempts").select("*"),
        supabase.from("student_achievements").select("*"),
        supabase.from("student_mission_submissions").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("student_profiles").select("*"),
        supabase.from("student_observations").select("*"),
        supabase.from("squads").select("*"),
        supabase.from("squad_members").select("*"),
        supabase.from("squad_mission_submissions").select("*"),
        supabase.from("user_roles").select("*"),
      ]);

      const dataSection = `
-- ============================================
-- DATA INSERTS - Generated: ${new Date().toISOString()}
-- ============================================
${toInsert("modules", (modules.data || []) as Record<string, unknown>[])}
${toInsert("videos", (videos.data || []) as Record<string, unknown>[])}
${toInsert("video_quizzes", (quizzes.data || []) as Record<string, unknown>[])}
${toInsert("missions", (missions.data || []) as Record<string, unknown>[])}
${toInsert("squads", (squads.data || []) as Record<string, unknown>[])}
${toInsert("squad_members", (squadMembers.data || []) as Record<string, unknown>[])}
${toInsert("profiles", (profiles.data || []) as Record<string, unknown>[])}
${toInsert("user_roles", (userRoles.data || []) as Record<string, unknown>[])}
${toInsert("student_profiles", (studentProfiles.data || []) as Record<string, unknown>[])}
${toInsert("student_lesson_progress", (progress.data || []) as Record<string, unknown>[])}
${toInsert("student_quiz_attempts", (quizAttempts.data || []) as Record<string, unknown>[])}
${toInsert("student_quiz_results", (quizResults.data || []) as Record<string, unknown>[])}
${toInsert("student_observations", (observations.data || []) as Record<string, unknown>[])}
${toInsert("student_achievements", (achievements.data || []) as Record<string, unknown>[])}
${toInsert("student_mission_submissions", (submissions.data || []) as Record<string, unknown>[])}
${toInsert("certificates", (certificates.data || []) as Record<string, unknown>[])}
${toInsert("squad_mission_submissions", (squadSubmissions.data || []) as Record<string, unknown>[])}
-- ============================================
-- DONE!
-- ============================================
`;

      const fullSQL = SCHEMA + dataSection;

      const blob = new Blob([fullSQL], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vibe-class-complete-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Script SQL unificado exportado com sucesso!');
    } catch (err) {
      console.error('SQL Export error:', err);
      toast.error('Erro ao exportar SQL');
    } finally {
      setIsExportingSQL(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportData} disabled={isExporting}>
        {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {isExporting ? 'Exportando...' : 'Exportar JSON'}
      </Button>
      <Button variant="outline" onClick={exportSQL} disabled={isExportingSQL}>
        {isExportingSQL ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
        {isExportingSQL ? 'Gerando SQL...' : 'Exportar SQL Completo'}
      </Button>
    </div>
  );
}
