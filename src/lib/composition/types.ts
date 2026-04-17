/**
 * Composition schema — JSON-serializable description of an html_composition
 * lesson. Kept intentionally small for MVP; evolves additively.
 */

/**
 * Scene types that are ACTUALLY implemented by CompositionSceneRenderer.
 * Do not add an entry here until the renderer supports it — a declared-but-
 * unrendered type is a silent product bug. See `roadmap` below for types
 * that are intentionally deferred.
 *
 * Roadmap (not yet implemented — do NOT add to the union):
 *   - "avatar": HeyGen/Tavus avatar streaming inside a scene
 *   - "custom": opaque escape hatch for user HTML
 */
export type CompositionSceneType =
  | "text"
  | "image"
  | "caption"
  | "quiz_pause";

export type CompositionAnimation = {
  /** Name of the enter transition. Mapped by `animationMap` in the renderer. */
  enter?: string;
  /** Name of the exit transition. */
  exit?: string;
  /** Duration in seconds. Defaults to 0.5s when omitted. */
  duration?: number;
};

export type CompositionPosition = {
  /** Percentage (0-100) of container width. */
  x?: number;
  /** Percentage (0-100) of container height. */
  y?: number;
  /** Percentage (0-100) of container width. */
  width?: number;
  /** Percentage (0-100) of container height. */
  height?: number;
};

export type TextSceneContent = {
  text: string;
  subtitle?: string;
};

export type ImageSceneContent = {
  src: string;
  alt?: string;
  caption?: string;
};

export type QuizPauseSceneContent = {
  question: string;
  options?: string[];
  /** ID to correlate with an external quiz record if needed. */
  quiz_id?: string;
};

export type CaptionSceneContent = {
  text: string;
};

/**
 * Pedagogical metadata — optional per-scene hooks that turn the composition
 * from a visual timeline into a lesson-orchestration engine. Consumed by the
 * CompositionPlayer (pauses on checkpoints) and surfaced to the tutor so it
 * can decide when to intervene, offer reflection prompts, or defer.
 *
 * All fields are OPTIONAL and opt-in. Scenes without `pedagogical` behave
 * exactly as before (backward compatible).
 */
export type CompositionPedagogy = {
  /**
   * When true, the player pauses on scene enter and stays paused until the
   * user (or the tutor) explicitly resumes. Use for "stop and think"
   * moments that are not full quiz pauses.
   */
  checkpoint?: boolean;
  /**
   * Signals that the scene expects a reflective answer before continuing.
   * Tutor may prompt the learner and wait for a verbal/text response.
   */
  requiresReflection?: boolean;
  /**
   * If false, the tutor must NOT speak over this scene (e.g. a carefully
   * timed visual explanation). Defaults to true when omitted.
   */
  tutorInterruptAllowed?: boolean;
  /**
   * Marks the scene as a teaching moment — the tutor should treat it as an
   * opportunity to summarize, check understanding, or add context.
   */
  teachingMoment?: boolean;
  /** Cognitive load hint so downstream systems can adjust pacing/quizzes. */
  difficultyLevel?: "low" | "medium" | "high";
};

export type CompositionScene = {
  id: string;
  /** Scene activation start time in seconds from composition origin. */
  start: number;
  /** Scene activation end time in seconds. `start <= end`. */
  end: number;
  type: CompositionSceneType;
  content?:
    | TextSceneContent
    | ImageSceneContent
    | QuizPauseSceneContent
    | CaptionSceneContent;
  animation?: CompositionAnimation;
  position?: CompositionPosition;
  style?: Record<string, string | number>;
  /** Optional pedagogical hooks — see CompositionPedagogy. */
  pedagogical?: CompositionPedagogy;
};

export type LessonComposition = {
  version: string;
  /** Total composition runtime in seconds. */
  duration: number;
  scenes: CompositionScene[];
  metadata?: {
    title?: string;
    theme?: string;
    author?: string;
  };
};
