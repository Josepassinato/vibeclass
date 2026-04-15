-- Add difficulty column to video_quizzes for adaptive quizzes
ALTER TABLE public.video_quizzes
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium'
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Comment for documentation
COMMENT ON COLUMN public.video_quizzes.difficulty IS 'Quiz difficulty: easy, medium, hard. Used for adaptive quiz selection based on student performance.';
