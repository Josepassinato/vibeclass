import { useState, useCallback, useRef, useEffect } from 'react';
import { VisionSignals } from './types';
import { useMediaPipeFace, FaceDetectionResult } from './useMediaPipeFace';
import { logger } from '@/lib/logger';

interface UseVisionSignalsOptions {
  onSignalsUpdate?: (signals: VisionSignals) => void;
  onConsentRequest?: () => void;
}

// Default disabled state
const DEFAULT_VISION_SIGNALS: VisionSignals = {
  enabled: false,
  faceDetected: false,
  gazeDirection: 'unknown',
  gazeOnVideoRatio: 0,
  expression: 'unknown',
  isLookingAtScreen: false,
  blinkRate: 0,
  distanceFromScreen: 1,
};

export function useVisionSignals(options: UseVisionSignalsOptions = {}) {
  const [signals, setSignals] = useState<VisionSignals>(DEFAULT_VISION_SIGNALS);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const optionsRef = useRef(options);

  // Track time looking at screen vs away for ratio calculation
  const gazeTrackingRef = useRef({
    onScreenTime: 0,
    totalTime: 0,
    lastUpdate: Date.now(),
    detectionCount: 0,
    onScreenCount: 0,
  });

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Handle MediaPipe detection results
  const handleDetection = useCallback((result: FaceDetectionResult) => {
    const now = Date.now();
    const deltaTime = now - gazeTrackingRef.current.lastUpdate;
    gazeTrackingRef.current.lastUpdate = now;
    gazeTrackingRef.current.totalTime += deltaTime;
    gazeTrackingRef.current.detectionCount++;

    if (result.faceDetected && result.isLookingAtScreen) {
      gazeTrackingRef.current.onScreenTime += deltaTime;
      gazeTrackingRef.current.onScreenCount++;
    }

    const gazeRatio = gazeTrackingRef.current.detectionCount > 0
      ? gazeTrackingRef.current.onScreenCount / gazeTrackingRef.current.detectionCount
      : 0;

    // Estimate expression based on head pose (simplified)
    let expression: VisionSignals['expression'] = 'neutral';
    if (result.headPose) {
      const { pitch, yaw } = result.headPose;
      // Tilted head down with furrowed brow = confused
      if (pitch > 15) expression = 'confused';
      // Looking away frequently = distracted/tired
      if (Math.abs(yaw) > 30) expression = 'tired';
    }

    // Estimate distance from face size (larger face = closer)
    let distanceFromScreen = 1;
    if (result.landmarks) {
      const faceWidth = Math.abs(
        (result.landmarks[454]?.[0] ?? 0) - (result.landmarks[234]?.[0] ?? 0)
      );
      // Normalize: 0.3 = close, 0.15 = normal, 0.08 = far
      distanceFromScreen = Math.max(0.3, Math.min(1.5, 0.15 / Math.max(faceWidth, 0.01)));
    }

    setSignals(prev => {
      const updated: VisionSignals = {
        ...prev,
        enabled: true,
        faceDetected: result.faceDetected,
        gazeDirection: result.gazeDirection,
        gazeOnVideoRatio: gazeRatio,
        isLookingAtScreen: result.isLookingAtScreen,
        expression,
        blinkRate: result.eyeAspectRatio > 0 ? Math.round(15 / result.eyeAspectRatio) : 15,
        distanceFromScreen,
      };
      optionsRef.current.onSignalsUpdate?.(updated);
      return updated;
    });
  }, []);

  // MediaPipe Face hook
  const mediaPipe = useMediaPipeFace({
    onDetection: handleDetection,
    detectionIntervalMs: 200, // 5 FPS for balance of accuracy and performance
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      mediaPipe.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request camera access and enable vision
  const enableVision = useCallback(async () => {
    if (!hasConsent) {
      optionsRef.current.onConsentRequest?.();
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;

      // Start MediaPipe detection
      const started = await mediaPipe.start(stream);
      if (!started) {
        throw new Error('Failed to start face detection');
      }

      setIsEnabled(true);
      setSignals(prev => ({ ...prev, enabled: true }));
      logger.debug('[VisionSignals] Enabled with MediaPipe');

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      logger.error('[VisionSignals] Camera error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hasConsent, mediaPipe]);

  // Disable vision and cleanup
  const disableVision = useCallback(() => {
    mediaPipe.stop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsEnabled(false);
    setSignals(DEFAULT_VISION_SIGNALS);
    logger.debug('[VisionSignals] Disabled');
  }, [mediaPipe]);

  // Grant consent for vision
  const grantConsent = useCallback(() => {
    setHasConsent(true);
    localStorage.setItem('vision_consent', 'true');
  }, []);

  // Revoke consent
  const revokeConsent = useCallback(() => {
    setHasConsent(false);
    localStorage.removeItem('vision_consent');
    disableVision();
  }, [disableVision]);

  // Load consent from localStorage
  useEffect(() => {
    const storedConsent = localStorage.getItem('vision_consent');
    if (storedConsent === 'true') {
      setHasConsent(true);
    }
  }, []);

  // Reset signals for new session
  const resetSignals = useCallback(() => {
    gazeTrackingRef.current = {
      onScreenTime: 0,
      totalTime: 0,
      lastUpdate: Date.now(),
      detectionCount: 0,
      onScreenCount: 0,
    };

    if (isEnabled) {
      setSignals(prev => ({
        ...prev,
        gazeOnVideoRatio: 0,
      }));
    } else {
      setSignals(DEFAULT_VISION_SIGNALS);
    }
  }, [isEnabled]);

  return {
    signals,
    isEnabled,
    hasConsent,
    isLoading: isLoading || (mediaPipe.isRunning && !mediaPipe.isLoaded),
    error: error ?? mediaPipe.error,
    enableVision,
    disableVision,
    grantConsent,
    revokeConsent,
    resetSignals,
  };
}
