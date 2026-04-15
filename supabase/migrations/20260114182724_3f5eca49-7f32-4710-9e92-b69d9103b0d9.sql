-- Tabela para perguntas do quiz de cada vídeo
CREATE TABLE public.video_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option_index INTEGER NOT NULL,
  explanation TEXT,
  question_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para respostas/tentativas dos alunos
CREATE TABLE public.student_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.video_quizzes(id) ON DELETE CASCADE,
  selected_option_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rastrear se o aluno passou no quiz do vídeo
CREATE TABLE public.student_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL DEFAULT false,
  score_percentage INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, video_id)
);

-- Habilitar RLS
ALTER TABLE public.video_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_results ENABLE ROW LEVEL SECURITY;

-- Políticas para video_quizzes (leitura pública)
CREATE POLICY "Quizzes são visíveis por todos"
ON public.video_quizzes
FOR SELECT
USING (true);

-- Políticas para student_quiz_attempts (todos podem inserir/ler para demo)
CREATE POLICY "Permitir todas operações em quiz_attempts"
ON public.student_quiz_attempts
FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para student_quiz_results (todos podem inserir/ler para demo)
CREATE POLICY "Permitir todas operações em quiz_results"
ON public.student_quiz_results
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_video_quizzes_updated_at
BEFORE UPDATE ON public.video_quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();