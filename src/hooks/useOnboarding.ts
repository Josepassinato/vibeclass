import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'vibe_class_onboarding_completed';

interface UseOnboardingOptions {
  userId?: string;
}

export function useOnboarding({ userId }: UseOnboardingOptions = {}) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // First, check localStorage for quick response
      const localCompleted = localStorage.getItem(ONBOARDING_KEY);
      if (localCompleted === 'true') {
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      // If we have a userId, check if user has any progress (meaning they're not new)
      if (userId) {
        try {
          const { data: progress } = await supabase
            .from('student_lesson_progress')
            .select('id')
            .eq('student_id', userId)
            .limit(1);

          // If user has progress, they're not new - skip onboarding
          if (progress && progress.length > 0) {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            setShowOnboarding(false);
            setIsLoading(false);
            return;
          }

          // Also check if they have any quiz results
          const { data: quizResults } = await supabase
            .from('student_quiz_results')
            .select('id')
            .eq('student_id', userId)
            .limit(1);

          if (quizResults && quizResults.length > 0) {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            setShowOnboarding(false);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('[Onboarding] Error checking status:', error);
        }
      }

      // User is new, show onboarding
      setShowOnboarding(true);
      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, [userId]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  };
}
