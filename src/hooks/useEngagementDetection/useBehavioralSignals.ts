import { useState, useCallback, useRef, useEffect } from 'react';
import { BehavioralSignals } from './types';

interface UseBehavioralSignalsOptions {
  onSignalsUpdate?: (signals: BehavioralSignals) => void;
  enabled?: boolean;
}

export function useBehavioralSignals(options: UseBehavioralSignalsOptions = {}) {
  const { enabled = true } = options;
  
  const [signals, setSignals] = useState<BehavioralSignals>({
    timeOnPage: 0,
    isTabVisible: true,
    timeSinceLastInteraction: 0,
    scrollActivityRate: 0,
    videoPlayRatio: 0,
    quizResponseTimeMs: null,
    quizAccuracy: null,
    momentDismissalTimeMs: null,
    focusChangeCount: 0,
  });

  const pageLoadTimeRef = useRef(Date.now());
  const lastInteractionRef = useRef(Date.now());
  const scrollCountRef = useRef(0);
  const scrollWindowStartRef = useRef(Date.now());
  const videoPlayTimeRef = useRef(0);
  const videoTotalTimeRef = useRef(0);
  const focusChangeCountRef = useRef(0);
  const quizStartTimeRef = useRef<number | null>(null);
  const momentStartTimeRef = useRef<number | null>(null);
  const quizAttemptsRef = useRef<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Update time-based signals periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const timeOnPage = Math.floor((now - pageLoadTimeRef.current) / 1000);
      const timeSinceInteraction = now - lastInteractionRef.current;
      
      // Calculate scroll rate (scrolls per minute over last minute)
      const scrollWindowDuration = now - scrollWindowStartRef.current;
      const scrollRate = scrollWindowDuration > 0 
        ? (scrollCountRef.current / (scrollWindowDuration / 60000))
        : 0;
      
      // Reset scroll window every minute
      if (scrollWindowDuration > 60000) {
        scrollCountRef.current = 0;
        scrollWindowStartRef.current = now;
      }

      // Calculate video play ratio
      const playRatio = videoTotalTimeRef.current > 0
        ? videoPlayTimeRef.current / videoTotalTimeRef.current
        : 0;

      setSignals(prev => {
        const updated = {
          ...prev,
          timeOnPage,
          timeSinceLastInteraction: timeSinceInteraction,
          scrollActivityRate: scrollRate,
          videoPlayRatio: playRatio,
        };
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Track visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (!isVisible) {
        focusChangeCountRef.current++;
      }

      setSignals(prev => ({
        ...prev,
        isTabVisible: isVisible,
        focusChangeCount: focusChangeCountRef.current
      }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled]);

  // Track interactions
  useEffect(() => {
    if (!enabled) return;

    const updateInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    const handleScroll = () => {
      scrollCountRef.current++;
      updateInteraction();
    };

    window.addEventListener('click', updateInteraction);
    window.addEventListener('keydown', updateInteraction);
    window.addEventListener('mousemove', updateInteraction);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', updateInteraction);

    return () => {
      window.removeEventListener('click', updateInteraction);
      window.removeEventListener('keydown', updateInteraction);
      window.removeEventListener('mousemove', updateInteraction);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', updateInteraction);
    };
  }, [enabled]);

  // Video play state tracking
  const onVideoPlay = useCallback(() => {
    videoTotalTimeRef.current = Date.now();
  }, []);

  const onVideoTimeUpdate = useCallback((isPlaying: boolean, deltaSeconds: number) => {
    if (isPlaying) {
      videoPlayTimeRef.current += deltaSeconds * 1000;
    }
    videoTotalTimeRef.current += deltaSeconds * 1000;
  }, []);

  // Quiz tracking
  const onQuizStart = useCallback(() => {
    quizStartTimeRef.current = Date.now();
  }, []);

  const onQuizComplete = useCallback((isCorrect: boolean) => {
    const responseTime = quizStartTimeRef.current 
      ? Date.now() - quizStartTimeRef.current 
      : null;
    
    quizAttemptsRef.current.total++;
    if (isCorrect) quizAttemptsRef.current.correct++;
    
    const accuracy = quizAttemptsRef.current.total > 0
      ? quizAttemptsRef.current.correct / quizAttemptsRef.current.total
      : null;

    setSignals(prev => {
      const updated = {
        ...prev,
        quizResponseTimeMs: responseTime,
        quizAccuracy: accuracy,
      };
      optionsRef.current.onSignalsUpdate?.(updated);
      return updated;
    });

    quizStartTimeRef.current = null;
  }, []);

  // Teaching moment tracking
  const onMomentStart = useCallback(() => {
    momentStartTimeRef.current = Date.now();
  }, []);

  const onMomentDismiss = useCallback(() => {
    const dismissTime = momentStartTimeRef.current
      ? Date.now() - momentStartTimeRef.current
      : null;

    setSignals(prev => {
      const updated = {
        ...prev,
        momentDismissalTimeMs: dismissTime,
      };
      optionsRef.current.onSignalsUpdate?.(updated);
      return updated;
    });

    momentStartTimeRef.current = null;
  }, []);

  // Manual interaction tracking
  const recordInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // Reset for new lesson
  const resetSignals = useCallback(() => {
    pageLoadTimeRef.current = Date.now();
    lastInteractionRef.current = Date.now();
    scrollCountRef.current = 0;
    scrollWindowStartRef.current = Date.now();
    videoPlayTimeRef.current = 0;
    videoTotalTimeRef.current = 0;
    focusChangeCountRef.current = 0;
    quizAttemptsRef.current = { correct: 0, total: 0 };
    
    setSignals({
      timeOnPage: 0,
      isTabVisible: true,
      timeSinceLastInteraction: 0,
      scrollActivityRate: 0,
      videoPlayRatio: 0,
      quizResponseTimeMs: null,
      quizAccuracy: null,
      momentDismissalTimeMs: null,
      focusChangeCount: 0,
    });
  }, []);

  return {
    signals,
    onVideoPlay,
    onVideoTimeUpdate,
    onQuizStart,
    onQuizComplete,
    onMomentStart,
    onMomentDismiss,
    recordInteraction,
    resetSignals,
  };
}
