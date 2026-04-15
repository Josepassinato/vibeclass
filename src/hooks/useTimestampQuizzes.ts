import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimestampQuiz {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  timestampSeconds: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface UseTimestampQuizzesOptions {
  videoId: string | undefined;
  studentId: string;
}

export function useTimestampQuizzes({ videoId, studentId }: UseTimestampQuizzesOptions) {
  const [quizzes, setQuizzes] = useState<TimestampQuiz[]>([]);
  const [triggeredQuizIds, setTriggeredQuizIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadQuizzes = useCallback(async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_quizzes')
        .select('*')
        .eq('video_id', videoId)
        .not('timestamp_seconds', 'is', null)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;

      const mapped: TimestampQuiz[] = (data || []).map(q => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correctIndex: q.correct_option_index,
        explanation: q.explanation || undefined,
        timestampSeconds: q.timestamp_seconds!,
        difficulty: (q as any).difficulty || 'medium',
      }));

      setQuizzes(mapped);
      setTriggeredQuizIds(new Set());
    } catch (err) {
      console.error('[useTimestampQuizzes] Error loading quizzes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  const getQuizForTimestamp = useCallback((currentTime: number, tolerance: number = 2): TimestampQuiz | null => {
    for (const quiz of quizzes) {
      if (triggeredQuizIds.has(quiz.id)) continue;
      
      const diff = Math.abs(currentTime - quiz.timestampSeconds);
      if (diff <= tolerance) {
        return quiz;
      }
    }
    return null;
  }, [quizzes, triggeredQuizIds]);

  const markQuizTriggered = useCallback((quizId: string) => {
    setTriggeredQuizIds(prev => new Set([...prev, quizId]));
  }, []);

  const recordAttempt = useCallback(async (
    quizId: string, 
    selectedOptionIndex: number, 
    isCorrect: boolean
  ) => {
    if (!videoId) return;

    try {
      await supabase.from('student_quiz_attempts').insert({
        student_id: studentId,
        video_id: videoId,
        quiz_id: quizId,
        selected_option_index: selectedOptionIndex,
        is_correct: isCorrect,
      });
    } catch (err) {
      console.error('[useTimestampQuizzes] Error recording attempt:', err);
    }
  }, [videoId, studentId]);

  const resetTriggered = useCallback(() => {
    setTriggeredQuizIds(new Set());
  }, []);

  return {
    quizzes,
    isLoading,
    loadQuizzes,
    getQuizForTimestamp,
    markQuizTriggered,
    recordAttempt,
    resetTriggered,
  };
}
