import { useState, useCallback, useRef, useEffect } from 'react';
import { StateVector, AudioSignals, BehavioralSignals, VisionSignals, InterventionReason, EngagementConfig } from './types';

interface UseStateVectorOptions {
  config: Partial<EngagementConfig>;
  audioSignals: AudioSignals;
  behavioralSignals: BehavioralSignals;
  visionSignals: VisionSignals;
}

const DEFAULT_CONFIG: EngagementConfig = {
  attentionThreshold: 0.4,
  attentionDurationMs: 4000,
  visionEnabled: false,
  visionConsentGiven: false,
  updateIntervalMs: 1000,
};

// Weights for combining signals (sum to 1)
const AUDIO_WEIGHT = 0.35;
const BEHAVIORAL_WEIGHT = 0.35;
const VISION_WEIGHT = 0.30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

export function useStateVector(options: UseStateVectorOptions) {
  const { config: userConfig, audioSignals, behavioralSignals, visionSignals } = options;
  const config: EngagementConfig = { ...DEFAULT_CONFIG, ...userConfig };

  const [stateVector, setStateVector] = useState<StateVector>({
    attention: null,
    engagement: null,
    fatigue: null,
    frustration: null,
    confusion: null,
    confidence: {
      attention: 0,
      engagement: 0,
      fatigue: 0,
      frustration: 0,
      confusion: 0,
      overall: 0,
    },
    timestamp: Date.now(),
    sources: [],
  });

  const [isInterventionTriggered, setIsInterventionTriggered] = useState(false);
  const lowAttentionStartRef = useRef<number | null>(null);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Calculate state vector from all signals
  const calculateStateVector = useCallback((): StateVector => {
    const sources: StateVector['sources'] = [];
    let hasAudio = false;
    let hasBehavioral = false;
    let hasVision = false;

    // Determine which sources are available
    if (audioSignals.responseLatencyMs !== null || audioSignals.silenceDurationMs > 0) {
      hasAudio = true;
      sources.push('audio');
    }
    if (behavioralSignals.timeOnPage > 0) {
      hasBehavioral = true;
      sources.push('behavioral');
    }
    if (visionSignals.enabled && visionSignals.faceDetected) {
      hasVision = true;
      sources.push('vision');
    }

    // Calculate individual dimension scores
    // ATTENTION
    let attentionAudio = 0.5;
    let attentionBehavioral = 0.5;
    let attentionVision = 0.5;

    if (hasAudio) {
      // Lower silence = higher attention
      const silenceScore = 1 - normalize(audioSignals.silenceDurationMs, 0, 60000);
      // Quick responses = high attention
      const latencyScore = audioSignals.responseLatencyMs !== null
        ? 1 - normalize(audioSignals.responseLatencyMs, 0, 10000)
        : 0.5;
      attentionAudio = (silenceScore * 0.6 + latencyScore * 0.4);
    }

    if (hasBehavioral) {
      // Tab visible = attention
      const visibilityScore = behavioralSignals.isTabVisible ? 1 : 0;
      // Recent interaction = attention
      const interactionScore = 1 - normalize(behavioralSignals.timeSinceLastInteraction, 0, 30000);
      // Few focus changes = attention
      const focusScore = 1 - normalize(behavioralSignals.focusChangeCount, 0, 10);
      attentionBehavioral = (visibilityScore * 0.4 + interactionScore * 0.35 + focusScore * 0.25);
    }

    if (hasVision) {
      // Looking at screen = attention
      const gazeScore = visionSignals.gazeOnVideoRatio;
      const lookingScore = visionSignals.isLookingAtScreen ? 1 : 0;
      attentionVision = (gazeScore * 0.6 + lookingScore * 0.4);
    }

    // ENGAGEMENT
    let engagementAudio = 0.5;
    let engagementBehavioral = 0.5;

    if (hasAudio) {
      // Questions and affirmatives show engagement
      const interactionScore = normalize(
        audioSignals.questionsAskedCount + audioSignals.affirmativeCount, 
        0, 10
      );
      // Voice energy shows engagement
      const energyScore = normalize(audioSignals.voiceEnergyLevel, 0, 1);
      engagementAudio = (interactionScore * 0.6 + energyScore * 0.4);
    }

    if (hasBehavioral) {
      // Video play ratio shows engagement
      const playScore = behavioralSignals.videoPlayRatio;
      // Scroll activity can indicate engagement (or distraction)
      const scrollScore = normalize(behavioralSignals.scrollActivityRate, 0, 30);
      engagementBehavioral = (playScore * 0.7 + scrollScore * 0.3);
    }

    // CONFUSION
    let confusionAudio = 0;
    if (hasAudio) {
      // Confusion keywords
      const confusionScore = normalize(audioSignals.confusionIndicatorCount, 0, 5);
      // Hesitations indicate confusion
      const hesitationScore = normalize(audioSignals.hesitationCount, 0, 10);
      confusionAudio = (confusionScore * 0.7 + hesitationScore * 0.3);
    }

    // FRUSTRATION
    let frustrationAudio = 0;
    let frustrationBehavioral = 0;
    
    if (hasAudio) {
      // Long silences after questions can indicate frustration
      const silenceFrustration = audioSignals.responseLatencyMs !== null && audioSignals.responseLatencyMs > 5000
        ? normalize(audioSignals.responseLatencyMs, 5000, 15000)
        : 0;
      frustrationAudio = silenceFrustration;
    }

    if (hasBehavioral) {
      // Low quiz accuracy can indicate frustration
      const accuracyFrustration = behavioralSignals.quizAccuracy !== null
        ? 1 - behavioralSignals.quizAccuracy
        : 0;
      // Quick moment dismissal might indicate frustration
      const dismissalFrustration = behavioralSignals.momentDismissalTimeMs !== null && 
        behavioralSignals.momentDismissalTimeMs < 3000
        ? 0.5
        : 0;
      frustrationBehavioral = (accuracyFrustration * 0.7 + dismissalFrustration * 0.3);
    }

    // FATIGUE
    let fatigueBehavioral = 0;
    let fatigueVision = 0;

    if (hasBehavioral) {
      // Long time on page can indicate fatigue
      const timeScore = normalize(behavioralSignals.timeOnPage, 0, 3600); // 1 hour
      // Slow interactions indicate fatigue
      const slowInteraction = normalize(behavioralSignals.timeSinceLastInteraction, 0, 60000);
      fatigueBehavioral = (timeScore * 0.4 + slowInteraction * 0.6);
    }

    if (hasVision) {
      // High blink rate indicates fatigue
      const blinkScore = normalize(visionSignals.blinkRate, 15, 30);
      fatigueVision = blinkScore;
    }

    // Calculate weights based on available sources
    let totalWeight = 0;
    if (hasAudio) totalWeight += AUDIO_WEIGHT;
    if (hasBehavioral) totalWeight += BEHAVIORAL_WEIGHT;
    if (hasVision) totalWeight += VISION_WEIGHT;

    const audioW = hasAudio ? AUDIO_WEIGHT / totalWeight : 0;
    const behavioralW = hasBehavioral ? BEHAVIORAL_WEIGHT / totalWeight : 0;
    const visionW = hasVision ? VISION_WEIGHT / totalWeight : 0;

    // Combine scores
    const attention = (attentionAudio * audioW + attentionBehavioral * behavioralW + attentionVision * visionW);
    const engagement = (engagementAudio * (hasAudio ? 0.5 : 0) + engagementBehavioral * (hasBehavioral ? 0.5 : 0)) / 
      ((hasAudio ? 0.5 : 0) + (hasBehavioral ? 0.5 : 0) || 1);
    const confusion = confusionAudio; // Primarily from audio
    const frustration = (frustrationAudio * (hasAudio ? 0.5 : 0) + frustrationBehavioral * (hasBehavioral ? 0.5 : 0)) /
      ((hasAudio ? 0.5 : 0) + (hasBehavioral ? 0.5 : 0) || 1);
    const fatigue = (fatigueBehavioral * (hasBehavioral ? 0.6 : 0) + fatigueVision * (hasVision ? 0.4 : 0)) /
      ((hasBehavioral ? 0.6 : 0) + (hasVision ? 0.4 : 0) || 1);

    // Calculate confidence based on number of sources and data quality
    const sourceConfidence = sources.length / 3; // 0.33, 0.67, or 1.0
    const dataQuality = Math.min(
      hasAudio && audioSignals.responseLatencyMs !== null ? 1 : 0.5,
      hasBehavioral && behavioralSignals.timeOnPage > 60 ? 1 : 0.5,
      hasVision && visionSignals.faceDetected ? 1 : 0.5
    );

    return {
      attention: clamp(attention, 0, 1),
      engagement: clamp(engagement, 0, 1),
      fatigue: clamp(fatigue, 0, 1),
      frustration: clamp(frustration, 0, 1),
      confusion: clamp(confusion, 0, 1),
      confidence: {
        attention: sourceConfidence * dataQuality,
        engagement: sourceConfidence * dataQuality,
        fatigue: sourceConfidence * dataQuality,
        frustration: sourceConfidence * dataQuality,
        confusion: hasAudio ? 0.8 : 0.3,
        overall: sourceConfidence * dataQuality,
      },
      timestamp: Date.now(),
      sources,
    };
  }, [audioSignals, behavioralSignals, visionSignals]);

  // Check for intervention triggers
  const checkForIntervention = useCallback((vector: StateVector): InterventionReason | null => {
    const cfg = configRef.current;

    // Check low attention
    if (vector.attention !== null && vector.attention < cfg.attentionThreshold) {
      const now = Date.now();
      
      if (lowAttentionStartRef.current === null) {
        lowAttentionStartRef.current = now;
      } else if (now - lowAttentionStartRef.current >= cfg.attentionDurationMs) {
        return {
          type: 'low_attention',
          message: 'Atenção baixa detectada por mais de 4 segundos',
          stateVector: vector,
          suggestedAction: 'pause_video',
        };
      }
    } else {
      lowAttentionStartRef.current = null;
    }

    // Check prolonged silence
    if (audioSignals.silenceDurationMs > 60000) { // 1 minute
      return {
        type: 'prolonged_silence',
        message: 'Silêncio prolongado detectado',
        stateVector: vector,
        suggestedAction: 'ask_question',
      };
    }

    // Check high confusion
    if (vector.confusion !== null && vector.confusion > 0.7) {
      return {
        type: 'high_confusion',
        message: 'Indicadores de confusão detectados',
        stateVector: vector,
        suggestedAction: 'simplify_content',
      };
    }

    // Check fatigue
    if (vector.fatigue !== null && vector.fatigue > 0.8) {
      return {
        type: 'fatigue',
        message: 'Sinais de fadiga detectados',
        stateVector: vector,
        suggestedAction: 'take_break',
      };
    }

    // Check tab switch
    if (!behavioralSignals.isTabVisible) {
      return {
        type: 'tab_switch',
        message: 'Aluno saiu da aba',
        stateVector: vector,
        suggestedAction: 'pause_video',
      };
    }

    return null;
  }, [audioSignals.silenceDurationMs, behavioralSignals.isTabVisible]);

  // Update state vector periodically
  useEffect(() => {
    const interval = window.setInterval(() => {
      const vector = calculateStateVector();
      setStateVector(vector);

      // Check for interventions
      const intervention = checkForIntervention(vector);
      if (intervention && !isInterventionTriggered) {
        setIsInterventionTriggered(true);
        configRef.current.onInterventionTriggered?.(intervention);
        
        // Reset after 10 seconds to allow new interventions
        setTimeout(() => setIsInterventionTriggered(false), 10000);
      }
    }, config.updateIntervalMs);

    return () => clearInterval(interval);
  }, [calculateStateVector, checkForIntervention, config.updateIntervalMs, isInterventionTriggered]);

  // Force recalculation
  const recalculate = useCallback(() => {
    const vector = calculateStateVector();
    setStateVector(vector);
    return vector;
  }, [calculateStateVector]);

  // Reset state
  const resetState = useCallback(() => {
    lowAttentionStartRef.current = null;
    setIsInterventionTriggered(false);
    setStateVector({
      attention: null,
      engagement: null,
      fatigue: null,
      frustration: null,
      confusion: null,
      confidence: {
        attention: 0,
        engagement: 0,
        fatigue: 0,
        frustration: 0,
        confusion: 0,
        overall: 0,
      },
      timestamp: Date.now(),
      sources: [],
    });
  }, []);

  return {
    stateVector,
    isInterventionTriggered,
    recalculate,
    resetState,
  };
}
