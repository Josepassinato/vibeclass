/**
 * Composition schema — JSON-serializable description of an html_composition
 * lesson. Kept intentionally small for MVP; evolves additively.
 */

export type CompositionSceneType =
  | "text"
  | "image"
  | "avatar"
  | "quiz_pause"
  | "caption"
  | "custom";

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

export type CustomSceneContent = Record<string, unknown>;

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
    | CaptionSceneContent
    | CustomSceneContent;
  animation?: CompositionAnimation;
  position?: CompositionPosition;
  style?: Record<string, string | number>;
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
