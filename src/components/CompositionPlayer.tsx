import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import type {
  CompositionScene,
  LessonComposition,
} from "@/lib/composition/types";
import {
  findUpcomingCheckpoint,
  findUpcomingQuizPause,
  getActiveScenes,
} from "@/lib/composition/timeline";
import type { UnifiedLessonPlayerHandle } from "@/lib/players/unified-player";
import { CompositionSceneRenderer } from "./composition/CompositionSceneRenderer";

export interface CompositionPlayerProps {
  composition: LessonComposition;
  autoPlay?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (seconds: number) => void;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  /**
   * Fired when a `quiz_pause` scene is entered. Playback is already
   * paused by the time this runs — host UI can show external quiz UI
   * on top if desired. The in-scene renderer also shows a "Continue"
   * button that resumes automatically.
   */
  onQuizPause?: (scene: CompositionScene) => void;
  /**
   * Fired when a pedagogical checkpoint scene is entered. Playback is
   * already paused — host (typically the tutor) decides when to resume
   * via the ref's `play()` method. Distinct from quiz pauses: a checkpoint
   * is a reflection / tutor-intervention moment, not a quiz prompt.
   */
  onCheckpoint?: (scene: CompositionScene) => void;
}

const activeIdsKey = (scenes: CompositionScene[]) =>
  scenes
    .map((s) => s.id)
    .sort()
    .join("|");

export const CompositionPlayer = forwardRef<
  UnifiedLessonPlayerHandle,
  CompositionPlayerProps
>(function CompositionPlayer(
  {
    composition,
    autoPlay = false,
    className,
    onPlay,
    onPause,
    onSeek,
    onEnded,
    onTimeUpdate,
    onQuizPause,
    onCheckpoint,
  },
  ref,
) {
  const timeRef = useRef(0);
  const pausedRef = useRef(!autoPlay);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : 0,
  );
  const [activeScenes, setActiveScenes] = useState<CompositionScene[]>(() =>
    getActiveScenes(composition, 0),
  );
  const activeKeyRef = useRef<string>(activeIdsKey(activeScenes));

  const recomputeActive = useCallback(
    (time: number) => {
      const next = getActiveScenes(composition, time);
      const nextKey = activeIdsKey(next);
      if (nextKey !== activeKeyRef.current) {
        activeKeyRef.current = nextKey;
        setActiveScenes(next);
      }
    },
    [composition],
  );

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    onPause?.();
  }, [onPause]);

  const play = useCallback(() => {
    if (!pausedRef.current) return;
    if (timeRef.current >= composition.duration) {
      // Restart from beginning if ended.
      timeRef.current = 0;
      recomputeActive(0);
    }
    pausedRef.current = false;
    lastTickRef.current =
      typeof performance !== "undefined" ? performance.now() : 0;
    onPlay?.();
  }, [composition.duration, onPlay, recomputeActive]);

  const seekTo = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(composition.duration, seconds));
      timeRef.current = clamped;
      recomputeActive(clamped);
      onSeek?.(clamped);
      onTimeUpdate?.(clamped);
    },
    [composition.duration, onSeek, onTimeUpdate, recomputeActive],
  );

  // rAF playback loop. Runs continuously; no-op ticks when paused so that
  // seeking while paused still updates via recomputeActive.
  useEffect(() => {
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const dt = Math.max(0, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      if (!pausedRef.current) {
        const prev = timeRef.current;
        let next = prev + dt;

        // Detect quiz pauses crossed during this tick — clamp to the pause point.
        const quizPause = findUpcomingQuizPause(composition, prev, next);
        if (quizPause) {
          next = quizPause.start;
          timeRef.current = next;
          recomputeActive(next);
          onTimeUpdate?.(next);
          pause();
          onQuizPause?.(quizPause);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        // Detect pedagogical checkpoints (non-quiz scenes with pedagogical.checkpoint).
        // Clamp the clock to the checkpoint start so the host can decide when to
        // resume — playback stays paused until `play()` is called externally.
        const checkpoint = findUpcomingCheckpoint(composition, prev, next);
        if (checkpoint) {
          next = checkpoint.start;
          timeRef.current = next;
          recomputeActive(next);
          onTimeUpdate?.(next);
          pause();
          onCheckpoint?.(checkpoint);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (next >= composition.duration) {
          next = composition.duration;
          timeRef.current = next;
          recomputeActive(next);
          onTimeUpdate?.(next);
          pause();
          onEnded?.();
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        timeRef.current = next;
        recomputeActive(next);
        onTimeUpdate?.(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // composition dependency ensures we re-seed when composition changes.
  }, [composition, pause, recomputeActive, onTimeUpdate, onQuizPause, onCheckpoint, onEnded]);

  // Reset state when composition reference changes.
  useEffect(() => {
    timeRef.current = 0;
    pausedRef.current = !autoPlay;
    activeKeyRef.current = activeIdsKey(getActiveScenes(composition, 0));
    setActiveScenes(getActiveScenes(composition, 0));
  }, [composition, autoPlay]);

  useImperativeHandle(
    ref,
    () => ({
      play,
      pause,
      seekTo,
      getCurrentTime: () => timeRef.current,
      getDuration: () => composition.duration,
      isPaused: () => pausedRef.current,
    }),
    [play, pause, seekTo, composition.duration],
  );

  const handleResumeQuiz = useCallback(() => {
    // Nudge the clock one tick past the pause so we do not immediately
    // re-trigger the same quiz pause scene.
    const bump = 0.001;
    timeRef.current = Math.min(composition.duration, timeRef.current + bump);
    recomputeActive(timeRef.current);
    play();
  }, [composition.duration, play, recomputeActive]);

  return (
    <div
      className={
        className ||
        "relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950"
      }
    >
      <AnimatePresence mode="sync">
        {activeScenes.map((scene) => (
          <CompositionSceneRenderer
            key={scene.id}
            scene={scene}
            onResumeQuiz={handleResumeQuiz}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});
