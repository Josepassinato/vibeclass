// Main hook that combines all engagement detection signals

import { useCallback, useMemo } from 'react';
import { useAudioSignals } from './useAudioSignals';
import { useBehavioralSignals } from './useBehavioralSignals';
import { useVisionSignals } from './useVisionSignals';
import { useStateVector } from './useStateVector';
import { EngagementConfig, InterventionReason, StateVector } from './types';

export * from './types';
export { useAudioSignals } from './useAudioSignals';
export { useBehavioralSignals } from './useBehavioralSignals';
export { useVisionSignals } from './useVisionSignals';
export { useStateVector } from './useStateVector';
export { useMediaPipeFace } from './useMediaPipeFace';
export type { FaceDetectionResult } from './useMediaPipeFace';

interface UseEngagementDetectionOptions {
  enabled?: boolean;
  onInterventionTriggered?: (reason: InterventionReason) => void;
  onStateVectorUpdate?: (vector: StateVector) => void;
  config?: Partial<EngagementConfig>;
}

export function useEngagementDetection(options: UseEngagementDetectionOptions = {}) {
  const { enabled = true, onInterventionTriggered, config: userConfig } = options;

  // Audio signals (response latency, silence, keywords)
  const audioHook = useAudioSignals({
    onSignalsUpdate: () => {
      // Signals update handled by state vector
    },
  });

  // Behavioral signals (tab visibility, interactions, quiz responses)
  const behavioralHook = useBehavioralSignals({
    enabled,
    onSignalsUpdate: () => {
      // Signals update handled by state vector
    },
  });

  // Vision signals (opt-in webcam tracking)
  const visionHook = useVisionSignals({
    onSignalsUpdate: () => {
      // Signals update handled by state vector
    },
    onConsentRequest: () => {
      console.log('[EngagementDetection] Vision consent requested');
    },
  });

  // Combined state vector
  const config = useMemo(() => ({
    ...userConfig,
    visionEnabled: visionHook.isEnabled,
    visionConsentGiven: visionHook.hasConsent,
    onInterventionTriggered,
  }), [userConfig, visionHook.isEnabled, visionHook.hasConsent, onInterventionTriggered]);

  const { stateVector, isInterventionTriggered, recalculate, resetState } = useStateVector({
    config,
    audioSignals: audioHook.signals,
    behavioralSignals: behavioralHook.signals,
    visionSignals: visionHook.signals,
  });

  // Reset all signals for new lesson
  const resetAll = useCallback(() => {
    audioHook.resetSignals();
    behavioralHook.resetSignals();
    visionHook.resetSignals();
    resetState();
  }, [audioHook, behavioralHook, visionHook, resetState]);

  // Get a summary for debugging/display
  const getSummary = useCallback(() => {
    return {
      attention: stateVector.attention !== null 
        ? `${Math.round(stateVector.attention * 100)}%` 
        : 'N/A',
      engagement: stateVector.engagement !== null
        ? `${Math.round(stateVector.engagement * 100)}%`
        : 'N/A',
      confusion: stateVector.confusion !== null
        ? `${Math.round(stateVector.confusion * 100)}%`
        : 'N/A',
      fatigue: stateVector.fatigue !== null
        ? `${Math.round(stateVector.fatigue * 100)}%`
        : 'N/A',
      sources: stateVector.sources.join(', ') || 'none',
      confidence: `${Math.round(stateVector.confidence.overall * 100)}%`,
      visionEnabled: visionHook.isEnabled,
      visionConsent: visionHook.hasConsent,
    };
  }, [stateVector, visionHook.isEnabled, visionHook.hasConsent]);

  return {
    // State vector
    stateVector,
    isInterventionTriggered,
    recalculate,
    getSummary,

    // Individual signal hooks for fine-grained control
    audio: {
      signals: audioHook.signals,
      onAgentSpeechEnd: audioHook.onAgentSpeechEnd,
      onUserSpeechStart: audioHook.onUserSpeechStart,
      onVoiceDetected: audioHook.onVoiceDetected,
      analyzeTranscript: audioHook.analyzeTranscript,
    },

    behavioral: {
      signals: behavioralHook.signals,
      onVideoPlay: behavioralHook.onVideoPlay,
      onVideoTimeUpdate: behavioralHook.onVideoTimeUpdate,
      onQuizStart: behavioralHook.onQuizStart,
      onQuizComplete: behavioralHook.onQuizComplete,
      onMomentStart: behavioralHook.onMomentStart,
      onMomentDismiss: behavioralHook.onMomentDismiss,
      recordInteraction: behavioralHook.recordInteraction,
    },

    vision: {
      signals: visionHook.signals,
      isEnabled: visionHook.isEnabled,
      hasConsent: visionHook.hasConsent,
      isLoading: visionHook.isLoading,
      error: visionHook.error,
      enableVision: visionHook.enableVision,
      disableVision: visionHook.disableVision,
      grantConsent: visionHook.grantConsent,
      revokeConsent: visionHook.revokeConsent,
    },

    // Reset
    resetAll,
  };
}
