// MediaPipe Face Mesh integration for real face/gaze detection
// Uses CDN-loaded MediaPipe for browser-based computer vision

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

// Landmark indices for eye tracking (from MediaPipe Face Mesh)
// https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
const LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const LEFT_IRIS_INDICES = [468, 469, 470, 471, 472];
const RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477];
const FACE_OVAL_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

// Eye aspect ratio for blink detection
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
const EYE_AR_THRESH = 0.2;
const EYE_AR_CONSEC_FRAMES = 2;

export type GazeDirection = 'on-screen' | 'off-screen' | 'unknown';

export interface FaceDetectionResult {
  faceDetected: boolean;
  landmarks: number[][] | null;
  gazeDirection: 'on-screen' | 'off-screen' | 'unknown';
  isLookingAtScreen: boolean;
  irisPosition: { left: { x: number; y: number }; right: { x: number; y: number } } | null;
  headPose: { pitch: number; yaw: number; roll: number } | null;
  blinkDetected: boolean;
  eyeAspectRatio: number;
}

interface UseMediaPipeFaceOptions {
  onDetection?: (result: FaceDetectionResult) => void;
  detectionIntervalMs?: number;
}

// Type declarations for MediaPipe globals
declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
    drawConnectors?: any;
    FACEMESH_TESSELATION?: any;
    FACEMESH_RIGHT_EYE?: any;
    FACEMESH_LEFT_EYE?: any;
    FACEMESH_RIGHT_IRIS?: any;
    FACEMESH_LEFT_IRIS?: any;
    FACEMESH_FACE_OVAL?: any;
  }
}

export function useMediaPipeFace(options: UseMediaPipeFaceOptions = {}) {
  const { onDetection, detectionIntervalMs = 100 } = options;
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<FaceDetectionResult | null>(null);

  const faceMeshRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const blinkCounterRef = useRef(0);
  const blinkTotalRef = useRef(0);
  const lastBlinkTimeRef = useRef(Date.now());

  // Load MediaPipe scripts
  const loadMediaPipe = useCallback(async () => {
    if (isLoaded || window.FaceMesh) {
      setIsLoaded(true);
      return true;
    }

    try {
      // Load scripts in order
      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
      ];

      for (const src of scripts) {
        await new Promise<void>((resolve, reject) => {
          // Check if already loaded
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.head.appendChild(script);
        });
      }

      // Wait a bit for globals to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!window.FaceMesh) {
        throw new Error('FaceMesh not available after loading scripts');
      }

      setIsLoaded(true);
      logger.debug('[MediaPipeFace] Loaded successfully');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load MediaPipe';
      setError(message);
      logger.error('[MediaPipeFace] Load error:', err);
      return false;
    }
  }, [isLoaded]);

  // Calculate Eye Aspect Ratio for blink detection
  const calculateEAR = useCallback((landmarks: number[][], eyeIndices: number[]) => {
    if (!landmarks || eyeIndices.length < 6) return 1;
    
    // Simplified EAR calculation using 6 points
    const p1 = landmarks[eyeIndices[0]];
    const p2 = landmarks[eyeIndices[1]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[3]];
    const p5 = landmarks[eyeIndices[4]];
    const p6 = landmarks[eyeIndices[5]];

    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 1;

    const dist = (a: number[], b: number[]) => 
      Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

    const vertical1 = dist(p2, p6);
    const vertical2 = dist(p3, p5);
    const horizontal = dist(p1, p4);

    if (horizontal === 0) return 1;
    return (vertical1 + vertical2) / (2 * horizontal);
  }, []);

  // Analyze gaze direction from iris position relative to eye bounds
  const analyzeGaze = useCallback((landmarks: number[][]) => {
    if (!landmarks) return { direction: 'unknown' as const, isOnScreen: false };

    try {
      // Get iris centers
      const leftIrisCenter = landmarks[LEFT_IRIS_INDICES[0]];
      const rightIrisCenter = landmarks[RIGHT_IRIS_INDICES[0]];
      
      // Get eye corners
      const leftEyeInner = landmarks[133];
      const leftEyeOuter = landmarks[33];
      const rightEyeInner = landmarks[362];
      const rightEyeOuter = landmarks[263];

      if (!leftIrisCenter || !rightIrisCenter || !leftEyeInner || !leftEyeOuter) {
        return { direction: 'unknown' as const, isOnScreen: false };
      }

      // Calculate relative position of iris within eye (0 = outer, 1 = inner)
      const leftEyeWidth = Math.abs(leftEyeInner[0] - leftEyeOuter[0]);
      const rightEyeWidth = Math.abs(rightEyeInner[0] - rightEyeOuter[0]);
      
      if (leftEyeWidth === 0 || rightEyeWidth === 0) {
        return { direction: 'unknown' as const, isOnScreen: false };
      }

      const leftIrisRatio = (leftIrisCenter[0] - leftEyeOuter[0]) / leftEyeWidth;
      const rightIrisRatio = (rightIrisCenter[0] - rightEyeOuter[0]) / rightEyeWidth;
      
      const avgIrisRatio = (leftIrisRatio + rightIrisRatio) / 2;
      
      // If iris is roughly centered (0.3-0.7), person is looking at screen
      const isOnScreen = avgIrisRatio > 0.3 && avgIrisRatio < 0.7;
      const direction: GazeDirection = isOnScreen ? 'on-screen' : 'off-screen';

      return { direction, isOnScreen };
    } catch (err) {
      logger.warn('[MediaPipeFace] Gaze analysis error:', err);
      return { direction: 'unknown' as const, isOnScreen: false };
    }
  }, []);

  // Estimate head pose from face landmarks
  const estimateHeadPose = useCallback((landmarks: number[][]) => {
    if (!landmarks) return null;

    try {
      // Use nose tip and face oval points for rough estimation
      const noseTip = landmarks[1];
      const chin = landmarks[152];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];
      const forehead = landmarks[10];

      if (!noseTip || !chin || !leftEar || !rightEar || !forehead) return null;

      // Simplified head pose estimation
      const faceWidth = Math.abs(rightEar[0] - leftEar[0]);
      const faceHeight = Math.abs(forehead[1] - chin[1]);
      
      // Yaw: horizontal rotation (nose position relative to ears)
      const noseRelativeX = (noseTip[0] - leftEar[0]) / faceWidth;
      const yaw = (noseRelativeX - 0.5) * 90; // -45 to +45 degrees

      // Pitch: vertical rotation (nose height relative to face)
      const noseRelativeY = (noseTip[1] - forehead[1]) / faceHeight;
      const pitch = (noseRelativeY - 0.5) * 60; // -30 to +30 degrees

      // Roll: head tilt (ear height difference)
      const earHeightDiff = rightEar[1] - leftEar[1];
      const roll = Math.atan2(earHeightDiff, faceWidth) * (180 / Math.PI);

      return { pitch, yaw, roll };
    } catch (err) {
      return null;
    }
  }, []);

  // Process face detection results
  const processResults = useCallback((results: any) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      const noFaceResult: FaceDetectionResult = {
        faceDetected: false,
        landmarks: null,
        gazeDirection: 'unknown',
        isLookingAtScreen: false,
        irisPosition: null,
        headPose: null,
        blinkDetected: false,
        eyeAspectRatio: 0,
      };
      setLatestResult(noFaceResult);
      onDetection?.(noFaceResult);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0].map((l: any) => [l.x, l.y, l.z]);
    
    // Calculate EAR for both eyes
    const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES.slice(0, 6));
    const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES.slice(0, 6));
    const avgEAR = (leftEAR + rightEAR) / 2;

    // Blink detection
    let blinkDetected = false;
    if (avgEAR < EYE_AR_THRESH) {
      blinkCounterRef.current++;
    } else {
      if (blinkCounterRef.current >= EYE_AR_CONSEC_FRAMES) {
        blinkTotalRef.current++;
        blinkDetected = true;
        lastBlinkTimeRef.current = Date.now();
      }
      blinkCounterRef.current = 0;
    }

    // Gaze analysis
    const gazeResult = analyzeGaze(landmarks);

    // Head pose
    const headPose = estimateHeadPose(landmarks);

    // Iris positions
    const leftIris = landmarks[LEFT_IRIS_INDICES[0]];
    const rightIris = landmarks[RIGHT_IRIS_INDICES[0]];
    const irisPosition = leftIris && rightIris ? {
      left: { x: leftIris[0], y: leftIris[1] },
      right: { x: rightIris[0], y: rightIris[1] },
    } : null;

    const result: FaceDetectionResult = {
      faceDetected: true,
      landmarks,
      gazeDirection: gazeResult.direction,
      isLookingAtScreen: gazeResult.isOnScreen,
      irisPosition,
      headPose,
      blinkDetected,
      eyeAspectRatio: avgEAR,
    };

    setLatestResult(result);
    onDetection?.(result);
  }, [calculateEAR, analyzeGaze, estimateHeadPose, onDetection]);

  // Start face detection
  const start = useCallback(async (stream: MediaStream) => {
    if (isRunning) return true;

    try {
      // Load MediaPipe if not already loaded
      const loaded = await loadMediaPipe();
      if (!loaded) return false;

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();
      videoRef.current = video;
      streamRef.current = stream;

      // Initialize FaceMesh
      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => 
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true, // Enable iris tracking
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(processResults);
      faceMeshRef.current = faceMesh;

      // Start detection loop
      const detectFrame = async () => {
        if (!videoRef.current || !faceMeshRef.current) return;
        
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (err) {
          logger.warn('[MediaPipeFace] Detection error:', err);
        }
        
        frameIdRef.current = window.setTimeout(detectFrame, detectionIntervalMs);
      };

      detectFrame();
      setIsRunning(true);
      logger.debug('[MediaPipeFace] Started');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start face detection';
      setError(message);
      logger.error('[MediaPipeFace] Start error:', err);
      return false;
    }
  }, [isRunning, loadMediaPipe, processResults, detectionIntervalMs]);

  // Stop face detection
  const stop = useCallback(() => {
    if (frameIdRef.current) {
      clearTimeout(frameIdRef.current);
      frameIdRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    faceMeshRef.current = null;
    streamRef.current = null;
    setIsRunning(false);
    setLatestResult(null);
    blinkCounterRef.current = 0;
    blinkTotalRef.current = 0;
    
    logger.debug('[MediaPipeFace] Stopped');
  }, []);

  // Get blink rate (blinks per minute)
  const getBlinkRate = useCallback(() => {
    const elapsed = (Date.now() - lastBlinkTimeRef.current) / 60000; // minutes
    if (elapsed === 0) return 0;
    return Math.round(blinkTotalRef.current / Math.max(elapsed, 1 / 60));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isLoaded,
    isRunning,
    error,
    latestResult,
    start,
    stop,
    getBlinkRate,
  };
}
