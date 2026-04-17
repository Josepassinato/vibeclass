import type { CompositionScene, LessonComposition } from "./types";

/**
 * Return scenes active at a given time. A scene is active when
 * `scene.start <= time < scene.end`. For zero-width scenes
 * (`start === end`, used by `quiz_pause`) we include the single tick
 * where `time === start` so the pause does not get skipped over.
 */
export function getActiveScenes(
  composition: LessonComposition | null,
  time: number,
): CompositionScene[] {
  if (!composition) return [];
  const active: CompositionScene[] = [];
  for (const scene of composition.scenes) {
    if (scene.end === scene.start) {
      if (time >= scene.start && time < scene.start + 0.1) {
        active.push(scene);
      }
      continue;
    }
    if (time >= scene.start && time < scene.end) {
      active.push(scene);
    }
  }
  return active;
}

/**
 * Return the next scene that starts strictly after `time`. Used for
 * seeking forward or computing the next pause boundary.
 */
export function getNextSceneAfter(
  composition: LessonComposition | null,
  time: number,
): CompositionScene | null {
  if (!composition) return null;
  let best: CompositionScene | null = null;
  for (const scene of composition.scenes) {
    if (scene.start > time) {
      if (best === null || scene.start < best.start) best = scene;
    }
  }
  return best;
}

/**
 * Find the first quiz_pause scene whose start falls inside (fromTime, toTime].
 * Composition playback calls this between ticks so a quiz pause never gets
 * missed when the playback loop advances more than one tick at a time.
 */
export function findUpcomingQuizPause(
  composition: LessonComposition | null,
  fromTime: number,
  toTime: number,
): CompositionScene | null {
  if (!composition) return null;
  for (const scene of composition.scenes) {
    if (scene.type !== "quiz_pause") continue;
    if (scene.start > fromTime && scene.start <= toTime) {
      return scene;
    }
  }
  return null;
}

/**
 * Find the first scene with `pedagogical.checkpoint === true` whose start
 * falls inside (fromTime, toTime]. Lets the player stop on pedagogical
 * checkpoints (reflection prompts, tutor interventions) without conflating
 * them with quiz pauses. Scenes that ARE quiz pauses are skipped here so
 * the quiz-pause handler keeps ownership of that flow.
 */
export function findUpcomingCheckpoint(
  composition: LessonComposition | null,
  fromTime: number,
  toTime: number,
): CompositionScene | null {
  if (!composition) return null;
  for (const scene of composition.scenes) {
    if (scene.type === "quiz_pause") continue;
    if (!scene.pedagogical?.checkpoint) continue;
    if (scene.start > fromTime && scene.start <= toTime) {
      return scene;
    }
  }
  return null;
}
