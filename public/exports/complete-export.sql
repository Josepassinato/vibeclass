-- ============================================
-- VIBE CLASS - COMPLETE EXPORT
-- Schema + Data + Transcripts + Teaching Moments
-- ============================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- 2. TABLES
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

-- 3. ENABLE RLS
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
CREATE POLICY "Squads are viewable by members" ON public.squads FOR SELECT USING (
  EXISTS (SELECT 1 FROM squad_members WHERE squad_members.squad_id = squads.id AND squad_members.user_id = auth.uid())
  OR NOT EXISTS (SELECT 1 FROM squad_members WHERE squad_members.squad_id = squads.id)
);
CREATE POLICY "System can manage squads" ON public.squads FOR ALL USING (true);
CREATE POLICY "Members can view their squad" ON public.squad_members FOR SELECT USING (
  squad_id IN (SELECT sm.squad_id FROM squad_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "System can manage squad members" ON public.squad_members FOR ALL USING (true);
CREATE POLICY "Squad members can view submissions" ON public.squad_mission_submissions FOR SELECT USING (
  squad_id IN (SELECT sm.squad_id FROM squad_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "Squad members can submit" ON public.squad_mission_submissions FOR INSERT WITH CHECK (
  squad_id IN (SELECT sm.squad_id FROM squad_members sm WHERE sm.user_id = auth.uid())
);
CREATE POLICY "System can manage submissions" ON public.squad_mission_submissions FOR ALL USING (true);

-- 5. FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_student_profile_updated_at()
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

-- 6. TRIGGERS
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_profile_created_assign_squad AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_student_to_squad();
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
-- 7. DATA INSERTS
-- ============================================

-- MODULES
INSERT INTO public.modules (id, title, description, module_order, is_released) VALUES
('0c292893-43d7-4308-af65-a77cf90b1947', 'Fundamentos do Empreendedor Vibe', 'Mindset empreendedor, oportunidades com IA e introdução ao ecossistema Google.', 1, true),
('0e29cd0b-304a-42a3-8e19-5ed2febab000', 'Seu Ambiente Google', 'Configuração do AI Studio, Firebase Studio e domínio do Gemini.', 2, false),
('917cc8f3-15fa-488c-ab4a-526180590003', 'Construindo seu SaaS', 'Desenvolvimento com Flutter, autenticação, Firestore e integrações.', 3, false),
('38a875eb-f1eb-4e80-85d1-b03d8fcda4de', 'Lançamento', 'Deploy, Vertex AI em produção e projeto final.', 4, false);

-- VIDEOS (base data)
INSERT INTO public.videos (id, title, description, youtube_id, video_type, thumbnail_url, lesson_order, is_configured, is_released, module_id) VALUES
('1dc10fa2-a5d0-4c7c-8ebc-413f282460da', 'Introdução', 'Introdução', '-8e3EH41qHQ', 'youtube', 'https://img.youtube.com/vi/-8e3EH41qHQ/hqdefault.jpg', 1, true, true, NULL),
('760470fa-7670-4b56-8746-d5d44d1c4509', 'Aula 1  descobrindo a Dor', 'Descobrindo a Dor do Mercado', 'Iu5kTUHDCV4', 'youtube', 'https://img.youtube.com/vi/Iu5kTUHDCV4/hqdefault.jpg', 2, true, true, NULL),
('eaa3d3c2-5394-464d-9336-20f8053a249c', 'Aula 2 : piscicologia real da dor', NULL, 'HTf7TZn6FVg', 'youtube', 'https://img.youtube.com/vi/HTf7TZn6FVg/hqdefault.jpg', 3, true, true, NULL),
('44ceb0f3-9f49-4721-a205-87850e2c5c7b', '3 aula : quebrando paradigmas', NULL, NULL, 'youtube', NULL, 4, true, true, NULL),
('b653e1eb-a89a-4231-a656-8d6ec4f7f4b3', 'Aula 4: O ciclo do hábito', NULL, NULL, 'youtube', NULL, 5, true, true, NULL),
('6ac380ee-3cba-49b0-9281-93269bd40e8d', 'Bem-vindo ao Vibe Code', 'Introdução ao curso, objetivos e metodologia de aprendizado.', NULL, 'youtube', NULL, 1, false, true, '0c292893-43d7-4308-af65-a77cf90b1947'),
('2987fbde-6587-42c6-ab62-809a8515ba20', 'Mindset do Empreendedor Digital', 'Como pensar como um empreendedor na era da IA.', NULL, 'youtube', NULL, 2, false, false, '0c292893-43d7-4308-af65-a77cf90b1947'),
('631656a2-b54b-4b49-b88a-d2b10eecc9fa', 'Oportunidades com IA Generativa', 'Identificando nichos e oportunidades de negócio com IA.', NULL, 'youtube', NULL, 3, false, false, '0c292893-43d7-4308-af65-a77cf90b1947'),
('96b63df9-8115-4ecc-aca4-d21f43a856df', 'Ecossistema Google para Devs', NULL, NULL, 'youtube', NULL, 4, false, false, '0c292893-43d7-4308-af65-a77cf90b1947'),
('85c71cb3-d78d-496e-8424-01f6d1383ce2', 'Configurando o AI Studio', 'Setup completo do Google AI Studio e primeiros prompts.', NULL, 'youtube', NULL, 1, false, false, '0e29cd0b-304a-42a3-8e19-5ed2febab000'),
('40d9f7c5-cca3-4249-99fd-3c1f4148ff84', 'Firebase Studio na Prática', 'Configuração do ambiente Firebase e estrutura de projeto.', NULL, 'youtube', NULL, 2, false, false, '0e29cd0b-304a-42a3-8e19-5ed2febab000'),
('15bfa94c-f667-43a7-af5b-61bf0a512f33', 'Dominando o Gemini', NULL, NULL, 'youtube', NULL, 3, false, false, '0e29cd0b-304a-42a3-8e19-5ed2febab000'),
('5a9c7959-1a8c-49ab-85ad-5cf0df7c6c90', 'Flutter para Vibe Coders', 'Fundamentos de Flutter para desenvolvimento rápido.', NULL, 'youtube', NULL, 1, false, false, '917cc8f3-15fa-488c-ab4a-526180590003'),
('826dbd28-6d0a-4937-8e8a-43465bc65c91', 'Autenticação com Firebase Auth', 'Implementando login social e gerenciamento de usuários.', NULL, 'youtube', NULL, 2, false, false, '917cc8f3-15fa-488c-ab4a-526180590003'),
('6d6e3fd1-cae9-47ca-9ecf-eb0b935dc630', 'Firestore em Ação', NULL, NULL, 'youtube', NULL, 3, false, false, '917cc8f3-15fa-488c-ab4a-526180590003'),
('d88f4df4-cecd-4952-8ea6-7a6e5ae94f12', 'Integrações Básicas', NULL, NULL, 'youtube', NULL, 4, false, false, '917cc8f3-15fa-488c-ab4a-526180590003'),
('22dc44bc-c33b-4f38-9041-d861bfe07b2b', 'IA no seu App', NULL, NULL, 'youtube', NULL, 5, false, false, '917cc8f3-15fa-488c-ab4a-526180590003'),
('4cf46191-2e9c-4b00-a1b7-7ee57cd3ab31', 'Deploy com Firebase Hosting', 'Publicando seu app para o mundo.', NULL, 'youtube', NULL, 1, false, false, '38a875eb-f1eb-4e80-85d1-b03d8fcda4de'),
('a44e459f-866d-4a78-b6bb-68fdc53f3c88', 'Vertex AI em Produção', 'Escalando suas integrações de IA para produção.', NULL, 'youtube', NULL, 2, false, false, '38a875eb-f1eb-4e80-85d1-b03d8fcda4de'),
('fe1ef6c4-271f-43e5-9b92-27700b94f59b', 'Monetização e Growth', NULL, NULL, 'youtube', NULL, 3, false, false, '38a875eb-f1eb-4e80-85d1-b03d8fcda4de'),
('9f892e71-a6d7-45f1-b92d-fdab3b6cba3b', 'Projeto Final: Seu SaaS Completo', NULL, NULL, 'youtube', NULL, 4, false, false, '38a875eb-f1eb-4e80-85d1-b03d8fcda4de');

-- VIDEO QUIZZES
INSERT INTO public.video_quizzes (id, video_id, question, options, correct_option_index, explanation, question_order, timestamp_seconds) VALUES
('95178a1e-8405-4687-be67-19264eafba9d', '760470fa-7670-4b56-8746-d5d44d1c4509', 'Qual é o principal sinal de alerta do corpo?', '["Fome","Dor","Sono","Sede"]', 1, 'A dor é um mecanismo de proteção do corpo que nos alerta sobre possíveis problemas.', 1, 60),
('ce25d883-8f1e-4cc4-9365-51499beade69', '760470fa-7670-4b56-8746-d5d44d1c4509', 'O que mais afeta a postura no trabalho?', '["Luz do ambiente","Ergonomia da cadeira","Temperatura","Ruído"]', 1, 'A ergonomia adequada da cadeira e mesa é fundamental para uma boa postura.', 2, 120);

-- MISSIONS
INSERT INTO public.missions (id, title, description, instructions, evidence_type, difficulty_level, points_reward, is_active, mission_order, video_id, evaluation_criteria) VALUES
('d1b161e9-df55-4ce6-b667-449b90b2a30d', 'Reflexão sobre a Introdução', 'Após assistir à aula introdutória, reflita sobre os principais conceitos apresentados e como eles se aplicam ao seu contexto.', E'Escreva um texto de 3-5 parágrafos explicando:\n1. Os principais conceitos que você aprendeu\n2. Como esses conceitos se relacionam com algo do seu dia-a-dia\n3. Uma dúvida ou ponto que gostaria de explorar mais', 'text', 'básico', 15, true, 0, '1dc10fa2-a5d0-4c7c-8ebc-413f282460da', '["Demonstra compreensão dos conceitos principais da aula","Apresenta reflexão crítica e pessoal","Conecta o conteúdo com exemplos práticos","Texto bem estruturado e coerente"]');


-- ============================================
-- 8. TRANSCRIPTS & TEACHING MOMENTS
-- ============================================

-- VIDEO: Introdução
UPDATE public.videos SET
transcript = '0:05
agora. Quantas estão abertas? Olhe para
0:08
o seu celular. Quantos aplicativos estão
0:11
instalados? Centenas. Mas a verdade é
0:15
que o mundo digital virou um cemitério
0:17
de boas intenções. Por quê? Porque na
0:20
última década nós ensinamos as pessoas a
0:22
programar, mas esquecemos de ensiná-las
0:25
a sentir. Hoje não vamos falar de
0:28
Python, não vamos falar de APIs
0:30
complexas. Se você veio aqui esperando
0:33
ver linhas de código nesta primeira
0:35
aula, você pode fechar o vídeo. O código
0:38
é a parte fácil. A inteligência
0:41
artificial escreve código melhor e mais
0:43
rápido do que qualquer humano. O código
0:46
virou commodity, mas existe algo que a
0:49
IA não tem julgamento.
0:53
Você não está aqui para ser um usuário
0:55
de ferramentas. Você não está aqui para
0:57
ser um digitador de prompts. Você está
1:00
aqui para ser um intérprete de dor. Um
1:03
produto de tecnologia não é um amontoado
1:05
de funções. É uma ponte, uma ponte
1:08
invisível entre a dor de alguém e a sua
1:11
paz. Você criou um produto. Nós estamos
1:14
vivendo a maior mudança da nossa geração
1:17
com a IA. A barreira de construção caiu
1:20
para zero. Mas isso cria um perigo. A
1:23
inundação de lixo digital. Como você se
1:25
destaca? Tendo a sensibilidade que a
1:28
máquina não tem. Código é commodity. O
1:31
seu julgamento é o ativo raro. Vamos
1:34
começar.',
teaching_moments = '[
  {"timestamp_seconds":45,"topic":"A Inteligência Artificial e a Commoditização do Código","difficulty_level":"intermediário","estimated_discussion_minutes":2,"key_insight":"A IA torna a escrita de código uma commodity, mudando o foco do valor no desenvolvimento de tecnologia.","questions_to_ask":["O que o palestrante quer dizer com o código virou commodity?","Onde o ser humano agrega valor no desenvolvimento de produtos digitais hoje?"],"discussion_points":["Exemplos de IA automatizando codificação","Implicações para quem está aprendendo a programar"],"teaching_approach":"Discussão reflexiva e provocativa."},
  {"timestamp_seconds":100,"topic":"O Propósito do Desenvolvedor: Intérprete de Dor","difficulty_level":"intermediário","estimated_discussion_minutes":3,"key_insight":"O verdadeiro papel de quem cria tecnologia é ser um intérprete de dor, conectando problemas reais a soluções.","questions_to_ask":["O que significa ser um intérprete de dor?","Dê um exemplo de produto que é uma ponte invisível para uma dor sua."],"discussion_points":["Diferença entre funções de um app e a ponte que ele representa","Design thinking e empatia"],"teaching_approach":"Exemplos concretos e tom inspirador."},
  {"timestamp_seconds":133,"topic":"Inundação de Lixo Digital e o Valor do Julgamento","difficulty_level":"avançado","estimated_discussion_minutes":2,"key_insight":"A facilidade de construção com IA cria inundação de lixo digital. O diferencial humano é a sensibilidade e julgamento.","questions_to_ask":["Como evitar a inundação de lixo digital?","O que significa o seu julgamento é o ativo raro?"],"discussion_points":["Consequências da baixa barreira de entrada","Habilidades humanas cada vez mais valorizadas"],"teaching_approach":"Tom desafiador e encorajador."}
]'::jsonb
WHERE id = '1dc10fa2-a5d0-4c7c-8ebc-413f282460da';

-- VIDEO: Aula 1 - Descobrindo a Dor
UPDATE public.videos SET
transcript = '0:00
Vamos começar o nosso primeiro mergulho.
0:02
O erro fatal que mata 90% das ideias não
0:06
é a falta de tecnologia, é a paixão pela
0:09
solução. Você tem uma ideia, desenha,
0:12
monta e ninguém usa. Por quê? Porque
0:15
você construiu uma solução procurando um
0:18
problema. Na 12 Brain, eu quero que você
0:21
se apaixone pelo problema. Você é um
0:23
detetive. Sua lupa é a empatia. Para
0:26
entender isso, vamos usar a analogia de
0:29
vitaminas e analgésicos. Vitaminas são
0:33
nice to have. É legal tomar, mas se você
0:36
esquecer, a vida segue. Analgésicos são
0:40
must have. Se você acorda às 3 da manhã
0:43
com dor de dente, você vai à farmácia de
0:45
pijama. Você paga o preço que for. A dor
0:48
é urgente. Muitos acham que precisam
0:51
criar o próximo Uber. Esqueçam isso. Às
0:54
vezes o melhor analgésico é invisível.
0:57
Pense num grupo de WhatsApp de
0:59
voluntários da igreja. Tentar marcar uma
1:02
escala ali é um inferno. Se você cria um
1:04
agente simples que organiza a lista
1:06
sozinho no privado, você criou um
1:08
analgésico. Você removeu o caos. Outro
1:12
exemplo, o mundo corporativo está cheio
1:15
de dor passiva. Sabe aquele processo
1:17
onde você precisa copiar dados de um
1:20
e-mail e colar num sistema antigo?
1:23
todo dia. Isso é uma tortura lenta. Se
1:26
você cria uma automação que faz isso
1:28
sozinha, você devolveu tempo de vida
1:31
para aquele funcionário. Isso é poder.
1:33
Como identificar essas dores? Existem
1:36
três tipos. A dor latente que o usuário
1:39
tem, mas não sabe. A dor passiva que ele
1:43
já desistiu de resolver e a dor ativa
1:46
onde ele está desesperado.
1:49
Use o Gemini ou o chat GPT para simular
1:52
essas dores. Peça para a IA listar o que
1:55
tira o sono do seu cliente. Pare de
1:58
tentar impressionar com tecnologia.
2:00
Impressione resolvendo problemas reais.
2:03
Identificamos a dor. Agora, como
2:06
garantimos que a solução seja usada?
2:09
Vamos adaptar o modelo do gancho para a
2:11
realidade do agente no Code. Gatilho,
2:15
ação, recompensa e investimento.
2:18
Primeiro, o gatilho. Os maiores produtos
2:21
usam gatilhos internos, emoções. Quando
2:25
um cliente seu tem uma dúvida sobre o
2:27
contrato, o gatilho é a insegurança. Se
2:30
você demora para responder, a
2:32
insegurança aumenta. Como agente cria um
2:36
sistema onde essa insegurança dispara
2:38
uma resposta imediata e acolhedora da
2:40
sua IA. A IA não espera, ela antecipa.
2:44
Segundo a ação. A regra é: quanto mais
2:48
difícil, menos uso. Estamos caminhando
2:51
para zero UI. Imagine um dono de
2:54
mercadinho que odeia computador.
2:57
A ação para ele tem que ser mandar um
2:59
áudio no WhatsApp dizendo: Vendi três
3:02
caixas de leite. e o seu agente
3:04
processa. Se você reduz o atrito a zero,
3:07
você vence. Terceiro, a recompensa
3:10
variável. Por que as redes sociais
3:12
viciam? Surpresa. Traga isso para o seu
3:16
sistema. Se você criou um painel de
3:19
vendas, faça a IA trazer um insight
3:21
diferente todo dia. Hoje você vendeu 20%
3:25
a mais.
3:27
O usuário abre o sistema para ver o que
3:29
a IA descobriu, não por obrigação.
3:32
Quarto, o investimento. Quanto mais a
3:36
pessoa usa, melhor o produto fica. Se
3:39
você cria um aplicativo de diário ou
3:41
orações, as memórias ficam lá. Como
3:44
agente, garanta que o sistema aprenda.
3:48
Se eu corrijo a IA uma vez, ela nunca
3:51
mais deve errar. Você não precisa de
3:53
milhões de usuários. Se tiver 10 que
3:56
amam sua solução, você venceu. Vocês
3:59
entendem a dor e o hábito. Agora, como
4:03
construímos? O erro é achar que leva
4:05
meses. Tempo é o único recurso que não
4:08
volta. Por isso, usamos o framework dos
4:12
12 minutos. A restrição gera foco.
4:15
Código é commodity. O que eu quero de
4:18
vocês nesses 12 minutos é a arquitetura.
4:22
Bloco um, minutos 0 a 4. A definição da
4:26
dor única. Escreva em uma frase.
4:30
Não vale vou melhorar a gestão. Vago
4:33
demais. Tem que ser: Vou eliminar o
4:37
tempo que a equipe gasta preenchendo
4:39
relatórios manuais na sexta à tarde.
4:42
Isso é específico. Isso é dor real.
4:45
Bloco dois, minutos 4 a 8, o caminho
4:49
feliz. Desenhe em papel de pão. Passo
4:52
um, vendedor manda áudio. Passo dois, IA
4:56
transcreve. Passo três, chefe recebe
4:59
e-mail. Pronto. Se você desenhou 10
5:02
telas e menus de login, você está
5:04
pensando como programador antigo. Pense
5:07
como agente de solução. Bloco 3, minutos
5:10
8 a 12. O aha moment. Qual é o momento
5:15
em que o usuário sorri? é quando ele
5:17
recebe a notificação de feito sem ter
5:20
tido trabalho. Estamos buscando o MLP,
5:23
produto mínimo amável. Uma planilha
5:26
automatizada que poupa 2 horas é mais
5:29
amável do que um aplicativo complexo. Se
5:31
não consegue desenhar em 12 minutos,
5:34
volte e observe mais. Estamos chegando
5:36
ao fim. Começamos falando de almas e
5:40
terminamos falando de estratégia rápida.
5:43
Quero reforçar. A tecnologia sem
5:46
humanidade é apenas burocracia digital.
5:49
Sua missão hoje não é abrir o computador
5:52
e programar. Sua missão é observar. Nas
5:56
próximas 24 horas, olhe para sua vida
5:58
com olhos de cirurgião. Identifique três
6:01
dores suas. Aquela tarefa chata, aquele
6:05
processo que todos reclamam, a confusão
6:07
no grupo da família. Perguntem-se por
6:10
que isso ainda dói. Geralmente é porque
6:13
achavam que precisava de um programador
6:15
caro. Agora você tem a IA. Tragam essa
6:19
dor para a próxima aula. Vamos deixar de
6:21
ser observadores e virar construtores. O
6:24
futuro não pertence a quem apenas usa
6:26
IA. Pertence a quem conduz a IA para
6:29
resolver problemas reais. Você é o
6:32
arquiteto. Eu sou Ray Jane. Bem-vindos a
6:35
Doze Brain.',
teaching_moments = '[
  {"timestamp_seconds":55,"topic":"Introdução ao conceito de dor","key_insight":"A dor é um sinal importante do corpo","questions_to_ask":["O que você entende por dor?","Já sentiu dor relacionada ao trabalho?"],"discussion_points":["Tipos de dor","Quando procurar ajuda"]},
  {"timestamp_seconds":90,"topic":"Causas comuns","key_insight":"Postura e ergonomia são fatores-chave","questions_to_ask":["Como é sua postura ao trabalhar?","Você faz pausas regulares?"],"discussion_points":["Ergonomia no home office","Importância das pausas"]},
  {"timestamp_seconds":150,"topic":"Prevenção","key_insight":"Pequenas mudanças fazem grande diferença","questions_to_ask":["Que mudanças você pode implementar hoje?"],"discussion_points":["Exercícios simples","Configuração do ambiente"]}
]'::jsonb
WHERE id = '760470fa-7670-4b56-8746-d5d44d1c4509';

-- VIDEO: Aula 2 - Psicologia Real da Dor
UPDATE public.videos SET
transcript = '0:00
A psicologia real da dor. Antes de
0:02
falarmos de tecnologia, eu quero falar
0:04
de algo que todo ser humano conhece.
0:06
Feche os olhos por um segundo. Pense na
0:09
última vez que algo pequeno te incomodou
0:11
tanto que você não conseguiu ignorar.
0:14
Não era uma tragédia, não era um
0:16
desastre, era algo simples, mas que
0:19
ficava ali martelando um e-mail que você
0:21
não queria responder, uma conta que você
0:24
não queria abrir, uma conversa que você
0:27
estava adiando. Isso é dor. Não a dor
0:31
física, a dor psicológica. A tensão que
0:34
se acumula quando algo está fora do
0:36
lugar e você sabe disso. E é dessa dor
0:39
que todos os produtos que realmente
0:41
mudam o mundo são feitos. Não de
0:43
tecnologia, não de inovação, mas de
0:46
alívio. Dor não é reclamação. Dor não é
0:50
feedback. Dor é tensão não resolvida. É
0:54
aquilo que continua existindo mesmo
0:56
quando você tenta ignorar. Toda dor real
0:59
tem três características. A primeira é
1:02
frequência. Ela não acontece uma vez.
1:06
Ela volta todo dia, toda semana, em toda
1:10
situação parecida. A segunda é custo.
1:13
Ela rouba algo de você. Tempo, energia,
1:16
dinheiro ou paz mental. A terceira é
1:19
urgência emocional. Ela incomoda mesmo
1:22
quando você finge que está tudo bem. Ela
1:25
fica ali pressionando por atenção. Se
1:27
uma suposta dor essas três coisas:
1:31
frequência, custo e urgência emocional,
1:34
ela não sustenta um produto. E aqui está
1:37
um erro clássico de quem começa a criar
1:39
soluções. Confundir o que o usuário diz
1:42
com o que o usuário faz. Usuários
1:44
mentem, não por maldade, mas porque não
1:47
entendem a própria mente. Eles dizem que
1:50
querem uma coisa, mas continuam fazendo
1:53
outra. E em produto, o que importa não é
1:55
opinião, é comportamento observável.
1:59
Um agente no Code de verdade não
2:01
constrói sistemas baseados em
2:03
entrevistas bonitas, ele constrói
2:06
sistemas baseados em ações repetidas. Se
2:08
alguém diz que odeia planilhas, mas abre
2:11
aquela planilha todos os dias, isso é
2:13
uma dor. Se alguém reclama de um
2:15
processo, mas continua passando por ele
2:18
toda semana, isso é uma dor. Agora vamos
2:21
dar um passo mais profundo. As pessoas
2:23
não querem executar tarefas. Elas querem
2:26
eliminar estados psicológicos
2:27
desconfortáveis. Ninguém quer organizar
2:30
tarefas. As pessoas querem parar de se
2:33
sentir atrasadas. Ninguém quer controlar
2:36
finanças.
2:38
Elas querem parar de sentir ansiedade
2:40
quando olham para o banco. Ninguém quer
2:43
gerenciar projetos. Elas querem parar de
2:46
se sentir perdidas. Produto bom não vem
2:49
tarefa. Produto bom vem alívio. Como
2:53
agente de IA, você precisa enxergar dois
2:55
mapas ao mesmo tempo. O mapa da tarefa
2:58
visível e o mapa da dor invisível. Quem
3:01
enxerga só a tarefa constrói
3:03
ferramentas. Quem enxerga a dor constrói
3:06
produtos. Agora vamos falar de hábito.
3:10
Hábito não é vício. Hábito é economia
3:13
cognitiva.
3:14
O cérebro humano odeia gastar energia.
3:17
Ele quer repetir o que já funcionou
3:19
antes. É por isso que quando você sente
3:22
o mesmo tipo de desconforto, você abre o
3:25
mesmo aplicativo. Bons produtos se
3:27
encaixam em rotinas que já existem.
3:30
Produtos ruins tentam criar rotinas
3:32
novas. E é aqui que a inteligência
3:34
artificial muda tudo. A IA moderna não
3:37
serve apenas para responder, ela serve
3:39
para interpretar contexto. Contexto é a
3:42
soma de o que você fez antes, onde você
3:45
está agora, o que você provavelmente
3:47
quer e o quão difícil é agir. Quando
3:50
você entende contexto, você não empurra
3:52
funcionalidades,
3:54
você entrega o próximo passo óbvio. E
3:56
quando um sistema sempre entrega o
3:58
próximo passo óbvio, ele deixa de ser
4:00
uma ferramenta. Ele se torna inevitável.',
teaching_moments = '[
  {"timestamp_seconds":38,"topic":"Definição de Dor Psicológica","difficulty_level":"básico","estimated_discussion_minutes":2,"key_insight":"Dor no contexto de produtos é tensão psicológica não resolvida, não reclamação superficial.","questions_to_ask":["O que diferencia a dor descrita de um feedback comum?","Pensem em um produto que alivia uma dor psicológica."],"discussion_points":["Exemplos pessoais de dores psicológicas","Produtos feitos de alívio"],"teaching_approach":"Recapitulação da analogia inicial, tom reflexivo."},
  {"timestamp_seconds":135,"topic":"Três Características da Dor Real","difficulty_level":"intermediário","estimated_discussion_minutes":3,"key_insight":"Dor real tem frequência, custo e urgência emocional. Observe comportamento, não opinião.","questions_to_ask":["Qual das três características é mais difícil de identificar?","Por que usuários mentem?"],"discussion_points":["Comportamento vs fala do usuário","Ações repetidas como indicador de dor"],"teaching_approach":"Tom provocativo para gerar debate."},
  {"timestamp_seconds":290,"topic":"Alívio de Estados Psicológicos","difficulty_level":"intermediário","estimated_discussion_minutes":3,"key_insight":"Pessoas não querem executar tarefas, querem eliminar estados psicológicos desconfortáveis.","questions_to_ask":["Qual a diferença entre organizar tarefas e parar de se sentir atrasado?","Como o mapa da dor invisível muda uma solução?"],"discussion_points":["Estados desconfortáveis que produtos aliviam","A metáfora dos dois mapas"],"teaching_approach":"Exemplos do vídeo, tom analítico e instigante."},
  {"timestamp_seconds":402,"topic":"Hábito, Contexto e Inevitabilidade da IA","difficulty_level":"avançado","estimated_discussion_minutes":3,"key_insight":"Hábito é economia cognitiva. A IA interpreta contexto e entrega o próximo passo óbvio, tornando-se inevitável.","questions_to_ask":["Como hábito como economia cognitiva se relaciona com bons produtos?","Pensem em um app de IA que interpreta contexto."],"discussion_points":["Produtos que criam rotinas vs encaixam em rotinas existentes","O próximo passo óbvio"],"teaching_approach":"Tom visionário e desafiador."}
]'::jsonb
WHERE id = 'eaa3d3c2-5394-464d-9336-20f8053a249c';

-- VIDEO: Aula 3 - Quebrando Paradigmas
UPDATE public.videos SET
transcript = '0:02
começarmos, eu preciso quebrar um mito
0:05
que te segurou a vida toda. O mito de
0:08
que para criar tecnologia você precisa
0:11
ser um gênio da matemática, decorar
0:13
manuais técnicos e passar noites em
0:16
claro olhando para uma tela preta com
0:18
letras verdes. Durante 40 anos existiu o
0:22
que chamamos de taxa de sintaxe.
0:25
Se você tivesse uma ideia brilhante para
0:27
um negócio, mas não soubesse onde
0:30
colocar uma chave ou um ponto e vírgula
0:32
no código, sua ideia morria. Ou você
0:35
pagava uma fortuna para um
0:37
desenvolvedor, ou você desistia. O
0:40
programador era o tradutor necessário
0:42
entre o seu cérebro humano e o cérebro
0:45
da máquina. Eu estou aqui para dar a
0:47
notícia oficial. O tradutor foi
0:49
demitido, o muro caiu. Nós não estamos
0:52
mais na era da sintaxe, nós entramos na
0:55
era da intenção. Hoje a máquina entende
0:58
português, inglês, espanhol e até
1:01
gírias. Você faz parte de uma nova
1:03
categoria econômica que está assustando
1:06
o mercado tradicional.
1:08
Bem-vindos à geração Vibe Code. Mas Ray
1:11
Jane, isso é papo futurista ou tem gente
1:14
ganhando dinheiro com isso hoje? Vamos
1:16
aos fatos. O termo vibe coding explodiu
1:20
no vale do silício porque pessoas comuns
1:23
começaram a construir império sozinhas.
1:26
Olhem para Peter Levels. Ele é um
1:28
empreendedor nômade que construiu o
1:30
fotoaii.net.
1:32
Ele não tem uma equipe de 50
1:34
engenheiros. Ele usa IA para escrever
1:37
90% do código que ele não quer escrever.
1:40
O resultado? Uma empresa que fatura
1:43
milhões de dólares por ano, operada de
1:45
um laptop, muitas vezes enquanto ele
1:48
está num café. Querem um exemplo ainda
1:50
mais impressionante? Ravi Lopez. Ele era
1:54
um artista digital, não um programador
1:56
senior. Ele teve a ideia do Magnific AI,
2:00
uma ferramenta para melhorar a resolução
2:03
de imagens. Ele usou o GPT4 para
2:06
escrever as partes complexas de React e
2:09
Python que ele não dominava. Ele dizia
2:12
para IA: Não, não está bom. Quero que a
2:16
imagem carregue mais rápido. Quero que o
2:18
botão seja mais chamativo. Ele
2:21
codificou pela vibe, pela estética, pela
2:24
insistência. Resultado, em poucos meses,
2:27
a ferramenta virou febre global e foi
2:30
adquirida por uma fortuna. Então, como
2:33
isso funciona? Na prática? Você vai
2:35
sentar na frente do computador e a
2:37
mágica acontece? Não, vibe coding não é
2:41
mágica, é iteração. Antigamente, se você
2:44
errasse uma linha de código, o programa
2:47
quebrava e você levava horas caçando o
2:49
erro. Hoje o processo é uma conversa.
2:52
Você usa ferramentas como cursor, Riplet
2:55
ou Vzer e diz: Cria um site para minha
2:59
pizzaria. Aí a cria, talvez fique feio.
3:03
Aí entra o vibe coder. Você diz: Está
3:06
muito formal. Deixa mais divertido.
3:09
Coloca um botão de WhatsApp piscando
3:11
aqui e muda esse fundo para preto. Aí a
3:15
reescreve o código em segundos. Você não
3:17
está digitando código. Você está
3:19
moldando o software como se fosse
3:21
argila. O seu trabalho é ter o bom gosto
3:24
e a persistência de pedir até ficar
3:26
perfeito. A IA é incansável. Ela não
3:29
pede férias. Ela não reclama de refazer.
3:33
Sam Altman, o criador do chat GPT, fez
3:36
uma previsão que está tirando o sono de
3:38
muita gente grande. Em breve veremos a
3:41
primeira empresa de bilhão de dólares
3:44
gerida por uma única pessoa. Pensem
3:46
nisso. 1 bilhão de dólares sem
3:49
departamento de RH, sem gerente de
3:52
projetos. Quem será essa pessoa? Não
3:55
será o programador tradicional que perde
3:57
tempo discutindo qual linguagem é
3:58
tecnicamente superior. Será um vibe
4:01
coder. Será alguém como você, alguém que
4:04
entende do negócio, entende pessoas e
4:07
usa a IA para construir a frota. Isso
4:10
cria a maior oportunidade da sua
4:12
carreira. Quem tem mais poder agora? É o
4:15
advogado que sabe onde o processo trava.
4:18
É o contador que sabe qual planilha é um
4:20
inferno. É o pastor que sabe como é
4:23
difícil organizar os voluntários. A sua
4:26
experiência de vida é o mapa. A IA é o
4:29
veículo. Esqueça a síndrome do impostor.
4:32
Se você sabe falar português, sabe o que
4:34
quer e tem a coragem de pedir, você é
4:37
técnico o suficiente para 2025. Você não
4:41
está aqui para ser um usuário. Você está
4:44
aqui para ser um diretor de
4:45
inteligência. Ajuste a sua frequência,
4:48
aumente a sua ambição.
4:50
Eu sou Ray Jane. Vamos codar na vibe.',
teaching_moments = '[
  {"timestamp_seconds":50,"topic":"Era da Sintaxe para Era da Intenção","difficulty_level":"básico","estimated_discussion_minutes":2,"key_insight":"A IA eliminou a barreira técnica da sintaxe, permitindo criar soluções com linguagem natural.","questions_to_ask":["O que significa o tradutor foi demitido, o muro caiu?","Qual a diferença entre Era da Sintaxe e Era da Intenção?"],"discussion_points":["Exemplos onde linguagem natural substitui comandos técnicos","Impacto para profissionais de outras áreas"],"teaching_approach":"Pergunta aberta para estimular reflexão."},
  {"timestamp_seconds":190,"topic":"Exemplos práticos de Vibe Coding","difficulty_level":"intermediário","estimated_discussion_minutes":3,"key_insight":"Pessoas comuns estão construindo negócios milionários usando IA para gerar código.","questions_to_ask":["O que Peter Levels e Ravi Lopez têm em comum?","Como codificar pela vibe se conecta com a Era da Intenção?"],"discussion_points":["IA como multiplicador de capacidade","Empresa milionária operada por uma pessoa"],"teaching_approach":"Explorar estudos de caso."},
  {"timestamp_seconds":310,"topic":"Vibe Coding: Iteração e Moldagem","difficulty_level":"intermediário","estimated_discussion_minutes":3,"key_insight":"Vibe coding é iteração, não mágica. Moldar software como argila através de conversas com IA.","questions_to_ask":["Como criar um site com IA difere do desenvolvimento tradicional?","O que significa moldar software como argila?"],"discussion_points":["Comparar com outras formas iterativas de design","Ferramentas: Cursor, Riplet, Vzer"],"teaching_approach":"Focar na analogia da argila."},
  {"timestamp_seconds":400,"topic":"Conhecimento de Negócio como Novo Poder","difficulty_level":"avançado","estimated_discussion_minutes":3,"key_insight":"O maior poder não é habilidade técnica, mas conhecimento profundo do domínio para direcionar a IA.","questions_to_ask":["Quem terá mais poder neste cenário e por quê?","Como sua experiência de vida vira um mapa?"],"discussion_points":["Problemas reais em diferentes profissões","Previsão de Sam Altman sobre empresa de 1 pessoa"],"teaching_approach":"Discussão ampla sobre futuro do trabalho."}
]'::jsonb
WHERE id = '44ceb0f3-9f49-4721-a205-87850e2c5c7b';

-- VIDEO: Aula 4 - O Ciclo do Hábito
UPDATE public.videos SET
transcript = '0:00
O ciclo do hábito e a dopamina. Vamos
0:02
começar com algo simples, mas profundo.
0:05
Você não abre um aplicativo porque ele é
0:07
bom. Você abre um aplicativo porque algo
0:10
dentro de você pediu por ele. Às vezes é
0:13
tédio, às vezes é ansiedade, às vezes é
0:16
solidão, às vezes é só aquele vazio
0:19
entre uma tarefa e outra. Esse pequeno
0:21
desconforto interno é o que chamamos de
0:23
gatilho. Near Alel organizou isso em um
0:26
modelo chamado Hook Model. gatilho,
0:31
ação, recompensa, investimento, mas
0:35
quero que você esqueça os nomes técnicos
0:37
por um momento e pense como um ser
0:39
humano. Quando você pega o celular sem
0:42
perceber, você não pensa: Vou abrir o
0:45
Instagram. Seu cérebro pensa: Eu quero
0:48
parar de me sentir assim. Isso é o
0:51
gatilho real. Agora vem a ação. E existe
0:55
uma regra dura sobre comportamento
0:56
humano. Se for difícil, não acontece. O
1:00
cérebro odeia fricção. Ele sempre
1:03
escolhe o caminho mais curto entre dor e
1:05
alívio. É por isso que um botão a mais
1:08
já derruba conversão. É por isso que
1:10
formulários longos matam produtos. E é
1:13
por isso que a IA mudou o jogo. Antes
1:15
você precisava aprender a usar um
1:17
sistema. Hoje o sistema aprende a usar
1:20
você. Você não navega por menus, você
1:24
fala, me ajuda, me explica, resolve
1:28
isso. A ação virou linguagem natural. E
1:32
quando a ação fica simples, o hábito
1:34
nasce, depois vem a recompensa e aqui
1:37
está algo que muda tudo. O seu cérebro
1:40
não fica viciado na recompensa, ele fica
1:43
viciado na expectativa da recompensa.
1:46
Quando você puxa o feed para atualizar,
1:49
você não sabe o que vai aparecer.
1:51
Pode ser algo incrível, pode ser algo
1:54
inútil. Essa incerteza libera dopamina.
1:57
É por isso que você continua puxando. A
2:00
inteligência artificial potencializa
2:02
isso. Cada resposta que ela gera é
2:05
única. Cada imagem é nova. Cada texto é
2:09
uma pequena surpresa. Você não recebe um
2:12
resultado, você recebe uma revelação e
2:15
isso mantém você voltando. Agora vem o
2:18
último passo, o investimento. Toda vez
2:21
que você usa um sistema, você coloca
2:23
algo de você ali. Tempo, dados,
2:27
preferências, história. O sistema começa
2:30
a te conhecer. E quando um produto te
2:33
conhece, sair dele dói. Você não troca
2:36
de Spotify porque suas playlists moram
2:38
lá. Você não troca de ferramentas porque
2:41
sua identidade digital mora lá. Agora
2:43
veja o que muda com a IA. Antes o
2:46
gatilho vinha só de você. Você sentia
2:49
algo e agia. Agora o sistema observa
2:54
padrões. Ele sabe quando você costuma
2:56
ficar cansado, quando você costuma ficar
2:59
inseguro, quando você costuma pedir
3:01
ajuda e ele age antes de você. Isso não
3:04
é invasão, isso é antecipação de valor.
3:08
É como um bom amigo que traz café antes
3:10
de você pedir, porque sabe que você
3:13
sempre quer café naquele horário. Os
3:15
produtos mais poderosos de hoje não
3:17
esperam. Eles sentem, eles leem
3:20
intenção, eles respondem emoção. E
3:24
quando isso acontece, o produto deixa de
3:26
ser uma ferramenta. Ele vira um hábito.
3:29
É isso que vocês estão aprendendo a
3:31
construir aqui.',
teaching_moments = '[
  {"timestamp_seconds":30,"topic":"O Gatilho e o Desconforto Interno","difficulty_level":"básico","estimated_discussion_minutes":2,"key_insight":"O gatilho para ação não é qualidade do app, mas desconforto interno (tédio, ansiedade, vazio).","questions_to_ask":["O que realmente nos leva a abrir um aplicativo?","Identifique um gatilho interno que te leva a pegar o celular."],"discussion_points":["Gatilho mental vs gatilho emocional","Compreensão de gatilhos para desenvolvimento de produtos"],"teaching_approach":"Pergunta aberta, exemplos pessoais."},
  {"timestamp_seconds":105,"topic":"A Regra da Fricção e a IA","difficulty_level":"intermediário","estimated_discussion_minutes":2,"key_insight":"O cérebro busca menor fricção entre dor e alívio. A IA tornou a ação linguagem natural.","questions_to_ask":["Qual a regra dura sobre comportamento humano?","Como a IA é um divisor de águas na forma como realizamos ações?"],"discussion_points":["Fricção impedindo adoção de produtos","IA removendo barreiras via linguagem natural"],"teaching_approach":"Reflexão sobre experiência com produtos digitais."},
  {"timestamp_seconds":198,"topic":"Recompensa e Dopamina da Incerteza","difficulty_level":"intermediário","estimated_discussion_minutes":2,"key_insight":"O vício está na expectativa da recompensa e na incerteza, não na recompensa em si. A IA potencializa com respostas únicas.","questions_to_ask":["Onde o cérebro realmente se vicia?","Como a incerteza do feed se relaciona com dopamina?"],"discussion_points":["Recompensa variável em jogos e redes sociais","Ética de explorar essa vulnerabilidade"],"teaching_approach":"Pensar além da recompensa óbvia."},
  {"timestamp_seconds":280,"topic":"Investimento e Antecipação da IA","difficulty_level":"avançado","estimated_discussion_minutes":3,"key_insight":"O investimento (tempo, dados) cria barreira de saída. A IA observa padrões e antecipa necessidades, transformando ferramenta em hábito.","questions_to_ask":["O que significa investimento no ciclo do hábito?","Como a IA muda a origem do gatilho?"],"discussion_points":["Fricção de saída e dados que nos prendem","IA sentir e ler intenção: útil ou invasivo?"],"teaching_approach":"Debate sobre privacidade vs conveniência."}
]'::jsonb
WHERE id = 'b653e1eb-a89a-4231-a656-8d6ec4f7f4b3';

-- ============================================
-- FIM DO EXPORT COMPLETO
-- ============================================
