import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackRequest {
  question: string;
  selectedOption: string;
  correctOption: string;
  videoContext?: string;
}

interface FeedbackResult {
  feedback: string;
  isLoading: boolean;
}

/**
 * Hook to fetch AI-generated contextual feedback when a student picks the wrong answer.
 * Results are cached by question+selected option to avoid duplicate API calls.
 */
export function useContextualFeedback() {
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackResult>>({});
  const cacheRef = useRef<Map<string, string>>(new Map());

  const getCacheKey = (question: string, selectedOption: string) =>
    `${question}::${selectedOption}`;

  const fetchFeedback = useCallback(async (req: FeedbackRequest): Promise<string> => {
    const key = getCacheKey(req.question, req.selectedOption);

    // Check cache
    const cached = cacheRef.current.get(key);
    if (cached) {
      setFeedbacks(prev => ({ ...prev, [key]: { feedback: cached, isLoading: false } }));
      return cached;
    }

    // Mark as loading
    setFeedbacks(prev => ({ ...prev, [key]: { feedback: '', isLoading: true } }));

    try {
      const { data, error } = await supabase.functions.invoke('agent-feedback', {
        body: {
          type: 'wrong_answer',
          question: req.question,
          selectedOption: req.selectedOption,
          correctOption: req.correctOption,
          videoContext: req.videoContext?.substring(0, 2000),
        },
      });

      const feedbackText = (error || !data?.feedback)
        ? `A resposta correta é "${req.correctOption}". Revise o conteúdo da aula para entender melhor.`
        : data.feedback;

      cacheRef.current.set(key, feedbackText);
      setFeedbacks(prev => ({ ...prev, [key]: { feedback: feedbackText, isLoading: false } }));
      return feedbackText;
    } catch {
      const fallback = `A resposta correta é "${req.correctOption}".`;
      setFeedbacks(prev => ({ ...prev, [key]: { feedback: fallback, isLoading: false } }));
      return fallback;
    }
  }, []);

  const getFeedback = useCallback((question: string, selectedOption: string): FeedbackResult | null => {
    const key = getCacheKey(question, selectedOption);
    return feedbacks[key] || null;
  }, [feedbacks]);

  return { fetchFeedback, getFeedback };
}
