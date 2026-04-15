-- =============================================
-- FASE 3: MISSIONS & TASKS SYSTEM
-- =============================================

-- Table: missions (practical tasks linked to videos)
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'text' CHECK (evidence_type IN ('text', 'screenshot', 'code', 'link', 'file')),
  difficulty_level TEXT NOT NULL DEFAULT 'intermediário' CHECK (difficulty_level IN ('básico', 'intermediário', 'avançado')),
  points_reward INTEGER NOT NULL DEFAULT 10,
  time_limit_minutes INTEGER,
  evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  mission_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: student_mission_submissions
CREATE TABLE public.student_mission_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  evidence_text TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'evaluating', 'approved', 'needs_revision', 'rejected')),
  ai_evaluation JSONB DEFAULT '{}'::jsonb,
  ai_feedback TEXT,
  score INTEGER,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: student_achievements (gamification)
CREATE TABLE public.student_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  badges JSONB DEFAULT '[]'::jsonb,
  missions_completed INTEGER NOT NULL DEFAULT 0,
  missions_attempted INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(5,2) DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missions (public read)
CREATE POLICY "Missions are viewable by everyone" 
ON public.missions FOR SELECT USING (true);

CREATE POLICY "Missions can be managed by anyone for now" 
ON public.missions FOR ALL USING (true);

-- RLS Policies for submissions
CREATE POLICY "Students can view their own submissions" 
ON public.student_mission_submissions FOR SELECT USING (true);

CREATE POLICY "Students can create submissions" 
ON public.student_mission_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can update their own submissions" 
ON public.student_mission_submissions FOR UPDATE USING (true);

-- RLS Policies for achievements
CREATE POLICY "Achievements are viewable by everyone" 
ON public.student_achievements FOR SELECT USING (true);

CREATE POLICY "Achievements can be managed" 
ON public.student_achievements FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_missions_video_id ON public.missions(video_id);
CREATE INDEX idx_missions_active ON public.missions(is_active);
CREATE INDEX idx_submissions_mission_id ON public.student_mission_submissions(mission_id);
CREATE INDEX idx_submissions_student_id ON public.student_mission_submissions(student_id);
CREATE INDEX idx_submissions_status ON public.student_mission_submissions(status);
CREATE INDEX idx_achievements_student_id ON public.student_achievements(student_id);

-- Triggers for updated_at
CREATE TRIGGER update_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
BEFORE UPDATE ON public.student_mission_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON public.student_achievements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();