-- Gamification: XP, levels, streaks
CREATE TABLE IF NOT EXISTS public.student_xp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id text NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak_days integer NOT NULL DEFAULT 0,
  longest_streak_days integer NOT NULL DEFAULT 0,
  last_study_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own XP"
  ON public.student_xp FOR SELECT
  TO authenticated
  USING (student_id = auth.uid()::text OR student_id LIKE 'auth_' || auth.uid()::text);

CREATE POLICY "Users can update own XP"
  ON public.student_xp FOR ALL
  TO authenticated
  USING (student_id = auth.uid()::text OR student_id LIKE 'auth_' || auth.uid()::text);

-- Allow reading leaderboard (top XP)
CREATE POLICY "Anyone can read leaderboard"
  ON public.student_xp FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_student_xp_total ON public.student_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_student_xp_student ON public.student_xp(student_id);
