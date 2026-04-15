-- Add question_type to video_quizzes to support open-ended questions
ALTER TABLE public.video_quizzes
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice'
  CHECK (question_type IN ('multiple_choice', 'open'));

-- Add rubric for open questions (expected answer criteria)
ALTER TABLE public.video_quizzes
  ADD COLUMN IF NOT EXISTS rubric text;

-- Table for open question submissions
CREATE TABLE IF NOT EXISTS public.student_open_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id text NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.video_quizzes(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  score numeric(4,1),
  ai_feedback text,
  strengths text,
  improvements text,
  submitted_at timestamptz DEFAULT now(),
  evaluated_at timestamptz
);

ALTER TABLE public.student_open_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own open answers"
  ON public.student_open_answers FOR ALL
  TO authenticated
  USING (student_id = auth.uid()::text OR student_id LIKE 'auth_' || auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_open_answers_student_quiz
  ON public.student_open_answers(student_id, quiz_id);
