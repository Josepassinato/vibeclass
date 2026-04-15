import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioSignals } from './types';

interface UseAudioSignalsOptions {
  onSignalsUpdate?: (signals: AudioSignals) => void;
}

const CONFUSION_KEYWORDS = [
  'não entendi', 'como assim', 'não sei', 'confuso', 'perdido',
  'pode repetir', 'repete', 'hã', 'oi', 'o que', 'não entendo',
  'como é', 'não consegui', 'difícil', 'complicado'
];

const AFFIRMATIVE_KEYWORDS = [
  'sim', 'entendi', 'ok', 'certo', 'legal', 'beleza', 'blz',
  'verdade', 'exato', 'isso', 'faz sentido', 'claro', 'uhum',
  'aham', 'tá', 'tô entendendo', 'compreendi'
];

const QUESTION_PATTERNS = [
  /\?$/,
  /^(o que|como|por que|quando|onde|qual|quem|quanto)/i,
  /^(me explica|pode explicar|não entendi)/i
];

const HESITATION_PATTERNS = [
  /\b(ã+|é+|hm+|uhm+|eh+)\b/gi,
  /\.{3,}/g, // multiple periods indicating pause
];

export function useAudioSignals(options: UseAudioSignalsOptions = {}) {
  const [signals, setSignals] = useState<AudioSignals>({
    responseLatencyMs: null,
    silenceDurationMs: 0,
    voiceEnergyLevel: 0,
    speechRate: null,
    hesitationCount: 0,
    questionsAskedCount: 0,
    affirmativeCount: 0,
    confusionIndicatorCount: 0,
  });

  const lastAgentSpeechEndRef = useRef<number | null>(null);
  const lastUserSpeechRef = useRef<number>(Date.now());
  const silenceIntervalRef = useRef<number | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Track silence duration
  useEffect(() => {
    silenceIntervalRef.current = window.setInterval(() => {
      const silenceDuration = Date.now() - lastUserSpeechRef.current;
      setSignals(prev => ({
        ...prev,
        silenceDurationMs: silenceDuration
      }));
    }, 1000);

    return () => {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current);
      }
    };
  }, []);

  // Called when agent finishes speaking
  const onAgentSpeechEnd = useCallback(() => {
    lastAgentSpeechEndRef.current = Date.now();
  }, []);

  // Called when user starts speaking
  const onUserSpeechStart = useCallback(() => {
    const now = Date.now();
    lastUserSpeechRef.current = now;

    // Calculate response latency if agent just spoke
    if (lastAgentSpeechEndRef.current) {
      const latency = now - lastAgentSpeechEndRef.current;
      setSignals(prev => ({
        ...prev,
        responseLatencyMs: latency,
        silenceDurationMs: 0
      }));
      lastAgentSpeechEndRef.current = null;
    }
  }, []);

  // Called when voice is detected (with energy level)
  const onVoiceDetected = useCallback((energyLevel: number) => {
    lastUserSpeechRef.current = Date.now();
    setSignals(prev => ({
      ...prev,
      voiceEnergyLevel: energyLevel,
      silenceDurationMs: 0
    }));
  }, []);

  // Analyze transcript text for signals
  const analyzeTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    if (role === 'assistant') {
      // Agent finished speaking - mark end time
      lastAgentSpeechEndRef.current = Date.now();
      return;
    }

    // Analyze user speech
    const lowerText = text.toLowerCase();

    // Count confusion indicators
    const confusionCount = CONFUSION_KEYWORDS.filter(kw => 
      lowerText.includes(kw)
    ).length;

    // Count affirmative responses
    const affirmativeCount = AFFIRMATIVE_KEYWORDS.filter(kw => 
      lowerText.includes(kw)
    ).length;

    // Count questions
    const isQuestion = QUESTION_PATTERNS.some(pattern => pattern.test(text));
    const questionCount = isQuestion ? 1 : 0;

    // Count hesitations
    let hesitationCount = 0;
    HESITATION_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) hesitationCount += matches.length;
    });

    // Estimate speech rate (rough: words per assumed duration)
    const wordCount = text.split(/\s+/).length;
    // Assume ~150ms per word for normal speech
    const estimatedDurationMs = wordCount * 150;
    const speechRate = estimatedDurationMs > 0 
      ? (wordCount / (estimatedDurationMs / 60000))
      : null;

    setSignals(prev => {
      const updated = {
        ...prev,
        confusionIndicatorCount: prev.confusionIndicatorCount + confusionCount,
        affirmativeCount: prev.affirmativeCount + affirmativeCount,
        questionsAskedCount: prev.questionsAskedCount + questionCount,
        hesitationCount: prev.hesitationCount + hesitationCount,
        speechRate,
        silenceDurationMs: 0
      };
      optionsRef.current.onSignalsUpdate?.(updated);
      return updated;
    });
  }, []);

  // Reset counters (call at start of new lesson)
  const resetSignals = useCallback(() => {
    setSignals({
      responseLatencyMs: null,
      silenceDurationMs: 0,
      voiceEnergyLevel: 0,
      speechRate: null,
      hesitationCount: 0,
      questionsAskedCount: 0,
      affirmativeCount: 0,
      confusionIndicatorCount: 0,
    });
    lastAgentSpeechEndRef.current = null;
    lastUserSpeechRef.current = Date.now();
  }, []);

  return {
    signals,
    onAgentSpeechEnd,
    onUserSpeechStart,
    onVoiceDetected,
    analyzeTranscript,
    resetSignals,
  };
}
