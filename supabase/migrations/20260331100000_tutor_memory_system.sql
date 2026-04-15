-- =============================================================
-- TUTOR MEMORY SYSTEM — Long-term memory + continuous learning
-- =============================================================

-- 1. TUTOR CONVERSATIONS — Persistent chat history
CREATE TABLE IF NOT EXISTS tutor_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  video_timestamp_seconds integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_conv_student ON tutor_conversations(student_id, created_at DESC);
CREATE INDEX idx_tutor_conv_session ON tutor_conversations(session_id, created_at);
CREATE INDEX idx_tutor_conv_video ON tutor_conversations(video_id) WHERE video_id IS NOT NULL;

-- RLS
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own conversations"
  ON tutor_conversations FOR SELECT
  USING (true);

CREATE POLICY "Students can insert own conversations"
  ON tutor_conversations FOR INSERT
  WITH CHECK (true);

-- 2. LEARNING INSIGHTS — AI-generated patterns and recommendations
CREATE TABLE IF NOT EXISTS learning_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  insight_type text NOT NULL CHECK (insight_type IN (
    'strength', 'weakness', 'pattern', 'recommendation',
    'milestone', 'risk', 'emotional_pattern'
  )),
  category text, -- e.g. 'quiz_performance', 'engagement', 'comprehension'
  title text NOT NULL,
  content text NOT NULL,
  confidence numeric(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  evidence jsonb DEFAULT '[]', -- array of supporting data points
  is_active boolean DEFAULT true,
  expires_at timestamptz, -- some insights are temporary
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_student ON learning_insights(student_id, is_active, created_at DESC);
CREATE INDEX idx_insights_type ON learning_insights(student_id, insight_type) WHERE is_active = true;

ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view insights"
  ON learning_insights FOR SELECT USING (true);

CREATE POLICY "Service can manage insights"
  ON learning_insights FOR ALL USING (true);

-- 3. CONCEPT MASTERY — Knowledge graph per student
CREATE TABLE IF NOT EXISTS concept_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  concept text NOT NULL,
  mastery_level numeric(3,2) DEFAULT 0.0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  -- 0.0 = unknown, 0.3 = beginner, 0.5 = developing, 0.7 = proficient, 1.0 = mastered
  total_attempts integer DEFAULT 0,
  correct_attempts integer DEFAULT 0,
  last_assessed_at timestamptz,
  related_videos uuid[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, concept)
);

CREATE INDEX idx_mastery_student ON concept_mastery(student_id, mastery_level);
CREATE INDEX idx_mastery_weak ON concept_mastery(student_id, mastery_level)
  WHERE mastery_level < 0.5;

ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mastery"
  ON concept_mastery FOR SELECT USING (true);

CREATE POLICY "Service can manage mastery"
  ON concept_mastery FOR ALL USING (true);

-- 4. HELPER FUNCTION: Get student memory context (used by tutor-memory edge function)
CREATE OR REPLACE FUNCTION get_student_memory_context(
  p_student_id text,
  p_video_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_profile jsonb;
  v_recent_conversations jsonb;
  v_insights jsonb;
  v_weak_concepts jsonb;
  v_quiz_stats jsonb;
  v_recent_observations jsonb;
BEGIN
  -- 1. Student profile
  SELECT to_jsonb(sp.*) INTO v_profile
  FROM student_profiles sp
  WHERE sp.student_id = p_student_id
  LIMIT 1;

  -- 2. Last 10 conversations (or last 5 for current video)
  SELECT COALESCE(jsonb_agg(c ORDER BY c.created_at DESC), '[]'::jsonb) INTO v_recent_conversations
  FROM (
    SELECT role, content, created_at, video_timestamp_seconds
    FROM tutor_conversations
    WHERE student_id = p_student_id
      AND (p_video_id IS NULL OR video_id = p_video_id)
    ORDER BY created_at DESC
    LIMIT 10
  ) c;

  -- 3. Active learning insights
  SELECT COALESCE(jsonb_agg(i ORDER BY i.created_at DESC), '[]'::jsonb) INTO v_insights
  FROM (
    SELECT insight_type, title, content, confidence, category, created_at
    FROM learning_insights
    WHERE student_id = p_student_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY confidence DESC, created_at DESC
    LIMIT 10
  ) i;

  -- 4. Weak concepts (mastery < 0.5)
  SELECT COALESCE(jsonb_agg(cm ORDER BY cm.mastery_level ASC), '[]'::jsonb) INTO v_weak_concepts
  FROM (
    SELECT concept, mastery_level, total_attempts, correct_attempts
    FROM concept_mastery
    WHERE student_id = p_student_id
      AND mastery_level < 0.5
    ORDER BY mastery_level ASC
    LIMIT 10
  ) cm;

  -- 5. Quiz performance summary
  SELECT jsonb_build_object(
    'total_quizzes', COUNT(*),
    'avg_score', ROUND(COALESCE(AVG(score_percentage), 0)),
    'pass_rate', ROUND(COALESCE(AVG(CASE WHEN passed THEN 100.0 ELSE 0.0 END), 0)),
    'recent_scores', COALESCE(
      (SELECT jsonb_agg(sq.score_percentage ORDER BY sq.completed_at DESC)
       FROM (SELECT score_percentage, completed_at FROM student_quiz_results
             WHERE student_id = p_student_id ORDER BY completed_at DESC LIMIT 5) sq),
      '[]'::jsonb
    )
  ) INTO v_quiz_stats
  FROM student_quiz_results
  WHERE student_id = p_student_id;

  -- 6. Recent observations
  SELECT COALESCE(jsonb_agg(o ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_recent_observations
  FROM (
    SELECT observation_type, observation_data, emotional_state, confidence_level, context, created_at
    FROM student_observations
    WHERE student_id = p_student_id
    ORDER BY created_at DESC
    LIMIT 10
  ) o;

  -- Build result
  result := jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'recent_conversations', v_recent_conversations,
    'insights', v_insights,
    'weak_concepts', v_weak_concepts,
    'quiz_stats', COALESCE(v_quiz_stats, '{}'::jsonb),
    'recent_observations', v_recent_observations
  );

  RETURN result;
END;
$$;

-- 5. HELPER FUNCTION: Upsert concept mastery (used by analyze-learning-patterns)
CREATE OR REPLACE FUNCTION upsert_concept_mastery(
  p_student_id text,
  p_concept text,
  p_is_correct boolean,
  p_video_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
  v_correct integer;
BEGIN
  INSERT INTO concept_mastery (student_id, concept, total_attempts, correct_attempts, last_assessed_at, related_videos)
  VALUES (
    p_student_id,
    p_concept,
    1,
    CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    now(),
    CASE WHEN p_video_id IS NOT NULL THEN ARRAY[p_video_id] ELSE '{}' END
  )
  ON CONFLICT (student_id, concept) DO UPDATE SET
    total_attempts = concept_mastery.total_attempts + 1,
    correct_attempts = concept_mastery.correct_attempts + (CASE WHEN p_is_correct THEN 1 ELSE 0 END),
    mastery_level = (concept_mastery.correct_attempts + (CASE WHEN p_is_correct THEN 1 ELSE 0 END))::numeric / (concept_mastery.total_attempts + 1)::numeric,
    last_assessed_at = now(),
    related_videos = CASE
      WHEN p_video_id IS NOT NULL AND NOT (p_video_id = ANY(concept_mastery.related_videos))
      THEN array_append(concept_mastery.related_videos, p_video_id)
      ELSE concept_mastery.related_videos
    END,
    updated_at = now();
END;
$$;
