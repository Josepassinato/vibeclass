import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProactiveTutorMoment {
  timestamp_seconds: number;
  topic: string;
  key_insight: string;
  questions_to_ask: string[];
  discussion_points?: string[];
}

interface UseProactiveTutorOptions {
  /** Current video playback time in seconds */
  currentVideoTime: number;
  /** Array of teaching moments with timestamps */
  teachingMoments: ProactiveTutorMoment[];
  /** Whether the video is currently playing */
  isPlaying: boolean;
  /** Full transcript text */
  transcript: string;
  /** Callback to pause the video */
  onPause: () => void;
  /** Callback to speak/display a message to the student */
  onSpeak: (message: string) => void;
}

interface ConfusionEvent {
  timestamp: number; // Date.now()
  type: 'pause' | 'rewind';
}

const TRIGGER_TOLERANCE_SECONDS = 3;
const CONFUSION_WINDOW_MS = 30_000;
const CONFUSION_THRESHOLD = 3;

function buildSocraticQuestion(moment: ProactiveTutorMoment): string {
  const { key_insight, questions_to_ask, topic } = moment;

  // Pick a random question from the available ones
  if (questions_to_ask.length > 0) {
    const randomIndex = Math.floor(Math.random() * questions_to_ask.length);
    const question = questions_to_ask[randomIndex];
    return `Vamos pensar um pouco sobre "${topic}". ${question}`;
  }

  // Fallback: build from key insight
  return `Momento importante sobre "${topic}": ${key_insight}. O que você acha disso?`;
}

export function useProactiveTutor({
  currentVideoTime,
  teachingMoments,
  isPlaying,
  transcript,
  onPause,
  onSpeak,
}: UseProactiveTutorOptions) {
  const [triggeredMoments, setTriggeredMoments] = useState<Set<number>>(new Set());
  const [confusionDetected, setConfusionDetected] = useState(false);

  const confusionEventsRef = useRef<ConfusionEvent[]>([]);
  const previousTimeRef = useRef<number>(currentVideoTime);
  const wasPlayingRef = useRef<boolean>(isPlaying);

  // Stable references for callbacks to avoid re-triggering effects
  const onPauseRef = useRef(onPause);
  const onSpeakRef = useRef(onSpeak);
  onPauseRef.current = onPause;
  onSpeakRef.current = onSpeak;

  // Detect teaching moments within tolerance window
  useEffect(() => {
    if (!isPlaying || teachingMoments.length === 0) return;

    for (const moment of teachingMoments) {
      const timeDiff = Math.abs(currentVideoTime - moment.timestamp_seconds);

      if (
        timeDiff <= TRIGGER_TOLERANCE_SECONDS &&
        !triggeredMoments.has(moment.timestamp_seconds)
      ) {
        // Mark as triggered before executing callbacks
        setTriggeredMoments((prev) => {
          const next = new Set(prev);
          next.add(moment.timestamp_seconds);
          return next;
        });

        // Pause video and deliver Socratic question
        onPauseRef.current();
        const question = buildSocraticQuestion(moment);
        onSpeakRef.current(question);

        // Only trigger one moment per time update
        break;
      }
    }
  }, [currentVideoTime, isPlaying, teachingMoments, triggeredMoments]);

  // Track confusion patterns (pause/rewind detection)
  useEffect(() => {
    const now = Date.now();

    // Detect pause: was playing, now not playing
    if (wasPlayingRef.current && !isPlaying) {
      confusionEventsRef.current.push({ timestamp: now, type: 'pause' });
    }

    // Detect rewind: time jumped backwards by more than 2 seconds
    if (currentVideoTime < previousTimeRef.current - 2) {
      confusionEventsRef.current.push({ timestamp: now, type: 'rewind' });
    }

    // Update refs
    wasPlayingRef.current = isPlaying;
    previousTimeRef.current = currentVideoTime;

    // Clean old events outside the window
    confusionEventsRef.current = confusionEventsRef.current.filter(
      (evt) => now - evt.timestamp < CONFUSION_WINDOW_MS
    );

    // Check threshold
    const recentCount = confusionEventsRef.current.length;

    if (recentCount >= CONFUSION_THRESHOLD && !confusionDetected) {
      setConfusionDetected(true);

      // Find nearest topic for context
      let contextTopic = 'este trecho';
      if (teachingMoments.length > 0) {
        const sorted = [...teachingMoments].sort(
          (a, b) =>
            Math.abs(a.timestamp_seconds - currentVideoTime) -
            Math.abs(b.timestamp_seconds - currentVideoTime)
        );
        if (Math.abs(sorted[0].timestamp_seconds - currentVideoTime) < 120) {
          contextTopic = sorted[0].topic;
        }
      }

      onPauseRef.current();
      onSpeakRef.current(
        `Percebi que você pode estar com dificuldade em "${contextTopic}". Quer que eu explique de outra forma?`
      );
    }
  }, [currentVideoTime, isPlaying, confusionDetected, teachingMoments]);

  // Reset confusion flag after some time passes without new events
  useEffect(() => {
    if (!confusionDetected) return;

    const timer = setTimeout(() => {
      // Reset if no new events accumulated
      const now = Date.now();
      const recent = confusionEventsRef.current.filter(
        (evt) => now - evt.timestamp < CONFUSION_WINDOW_MS
      );
      if (recent.length < CONFUSION_THRESHOLD) {
        setConfusionDetected(false);
      }
    }, CONFUSION_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [confusionDetected]);

  const resetMoments = useCallback(() => {
    setTriggeredMoments(new Set());
    setConfusionDetected(false);
    confusionEventsRef.current = [];
  }, []);

  return {
    triggeredMoments,
    confusionDetected,
    resetMoments,
  };
}
