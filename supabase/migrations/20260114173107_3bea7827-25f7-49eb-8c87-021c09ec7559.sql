-- Create table for student profiles (long-term memory)
CREATE TABLE public.student_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE, -- Device/browser fingerprint or user ID
  name TEXT,
  learning_style TEXT, -- visual, auditivo, cinestésico
  emotional_patterns JSONB DEFAULT '[]'::jsonb, -- Historical emotional states
  strengths TEXT[], -- Topics the student excels at
  areas_to_improve TEXT[], -- Topics needing more attention
  preferences JSONB DEFAULT '{}'::jsonb, -- Learning preferences
  personality_notes TEXT, -- General observations about the student
  interaction_count INTEGER DEFAULT 0,
  total_study_time_minutes INTEGER DEFAULT 0,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for student observations (individual learning moments)
CREATE TABLE public.student_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  video_id TEXT,
  observation_type TEXT NOT NULL, -- emotion, comprehension, engagement, behavior
  observation_data JSONB NOT NULL, -- Detailed observation data
  emotional_state TEXT, -- happy, confused, frustrated, excited, bored, focused
  confidence_level DECIMAL(3,2), -- 0.00 to 1.00
  context TEXT, -- What was happening when observed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_student_observations_student_id ON public.student_observations(student_id);
CREATE INDEX idx_student_observations_created_at ON public.student_observations(created_at DESC);
CREATE INDEX idx_student_profiles_student_id ON public.student_profiles(student_id);
CREATE INDEX idx_student_profiles_last_seen ON public.student_profiles(last_seen_at DESC);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_observations ENABLE ROW LEVEL SECURITY;

-- Allow public access for this demo (no auth required)
CREATE POLICY "Allow all operations on student_profiles" 
ON public.student_profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on student_observations" 
ON public.student_observations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_student_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_profiles_updated_at
BEFORE UPDATE ON public.student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_student_profile_updated_at();