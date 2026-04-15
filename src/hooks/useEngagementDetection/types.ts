// Types for the Engagement Detection System

export interface StateVector {
  // Core engagement signals (0-1 normalized, null = not measured)
  attention: number | null;
  engagement: number | null;
  fatigue: number | null;
  frustration: number | null;
  confusion: number | null;
  
  // Confidence scores for each dimension (0-1)
  confidence: {
    attention: number;
    engagement: number;
    fatigue: number;
    frustration: number;
    confusion: number;
    overall: number;
  };
  
  // Timestamp of measurement
  timestamp: number;
  
  // Sources contributing to this vector
  sources: ('audio' | 'behavioral' | 'vision')[];
}

export interface AudioSignals {
  // Response latency (time to respond after agent finishes speaking)
  responseLatencyMs: number | null;
  // Silence duration since last speech
  silenceDurationMs: number;
  // Voice energy level (volume/intensity)
  voiceEnergyLevel: number;
  // Speech rate (words per minute estimate)
  speechRate: number | null;
  // Hesitation count (um, uh, pauses mid-sentence)
  hesitationCount: number;
  // Questions asked by student
  questionsAskedCount: number;
  // Affirmative responses (sim, entendi, ok)
  affirmativeCount: number;
  // Confusion indicators (não entendi, como assim, hã?)
  confusionIndicatorCount: number;
}

export interface BehavioralSignals {
  // Time on current page/lesson (seconds)
  timeOnPage: number;
  // Tab visibility (is user on this tab?)
  isTabVisible: boolean;
  // Time since last interaction (click, keypress, scroll)
  timeSinceLastInteraction: number;
  // Scroll activity (scrolls per minute)
  scrollActivityRate: number;
  // Video play/pause ratio
  videoPlayRatio: number;
  // Quiz response time (ms)
  quizResponseTimeMs: number | null;
  // Quiz accuracy (0-1)
  quizAccuracy: number | null;
  // Teaching moment dismissal time (how quickly they click continue)
  momentDismissalTimeMs: number | null;
  // Page focus changes count
  focusChangeCount: number;
}

export interface VisionSignals {
  // Is vision enabled (user opted in)
  enabled: boolean;
  // Face detected
  faceDetected: boolean;
  // Gaze direction (on-screen, off-screen, looking-away)
  gazeDirection: 'on-screen' | 'off-screen' | 'unknown';
  // Gaze fixation time on video area (percentage)
  gazeOnVideoRatio: number;
  // Facial expression analysis
  expression: 'neutral' | 'confused' | 'interested' | 'frustrated' | 'tired' | 'unknown';
  // Head pose (looking at screen)
  isLookingAtScreen: boolean;
  // Blink rate (high = fatigue)
  blinkRate: number;
  // Distance from screen (normalized)
  distanceFromScreen: number;
}

export interface EngagementConfig {
  // Thresholds for auto-intervention
  attentionThreshold: number; // Below this triggers intervention
  attentionDurationMs: number; // How long attention must be low before triggering
  
  // Vision opt-in settings
  visionEnabled: boolean;
  visionConsentGiven: boolean;
  
  // Callback for intervention
  onInterventionTriggered?: (reason: InterventionReason) => void;
  
  // Update frequency (ms)
  updateIntervalMs: number;
}

export interface InterventionReason {
  type: 'low_attention' | 'prolonged_silence' | 'high_confusion' | 'fatigue' | 'tab_switch';
  message: string;
  stateVector: StateVector;
  suggestedAction: 'pause_video' | 'ask_question' | 'simplify_content' | 'take_break' | 'none';
}

export interface EngagementEvent {
  type: 'audio' | 'behavioral' | 'vision' | 'intervention';
  data: any;
  timestamp: number;
}
