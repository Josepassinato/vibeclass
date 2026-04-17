/**
 * Lesson identity abstraction.
 *
 * Centralizes how the app decides "which lesson is this, and what is its
 * source of truth key?" across media modes. Before this module, consumers
 * inferred identity via `videoId || videoUrl`, which silently breaks for
 * `html_composition` lessons (they can legitimately have neither).
 *
 * Any new code that caches, analyzes, fetches, or tracks per-lesson state
 * MUST go through `getLessonIdentity` — never reach for `youtube_id` or
 * `video_url` directly to compute an identity key.
 */
export type LessonMediaType =
  | "youtube"
  | "direct"
  | "external"
  | "html_composition";

export type LessonIdentity = {
  /** Stable DB primary key for the lesson. Always present. */
  lessonId: string;
  /** Media mode this lesson plays back in. */
  mediaType: LessonMediaType;
  /**
   * Stable key for media-specific caching/analysis.
   *   youtube          -> youtube_id
   *   direct|external  -> video_url
   *   html_composition -> lesson.id (composition is keyed by the lesson itself)
   * Always non-empty when returned; undefined when the lesson is unsaveable.
   */
  sourceKey: string;
};

export type LessonLike = {
  id?: string | null;
  video_type?: string | null;
  youtube_id?: string | null;
  video_url?: string | null;
};

const KNOWN_MEDIA_TYPES: readonly LessonMediaType[] = [
  "youtube",
  "direct",
  "external",
  "html_composition",
];

function resolveMediaType(raw: string | null | undefined): LessonMediaType {
  if (raw && (KNOWN_MEDIA_TYPES as readonly string[]).includes(raw)) {
    return raw as LessonMediaType;
  }
  return "youtube";
}

/**
 * Returns the canonical identity for a lesson. Returns `null` only when the
 * lesson has no DB id AND no usable media reference — i.e. a blank form,
 * not a real row.
 */
export function getLessonIdentity(lesson: LessonLike | null | undefined): LessonIdentity | null {
  if (!lesson) return null;

  const mediaType = resolveMediaType(lesson.video_type);
  const lessonId = lesson.id ?? "";

  let sourceKey = "";
  switch (mediaType) {
    case "youtube":
      sourceKey = lesson.youtube_id ?? lesson.video_url ?? lessonId;
      break;
    case "direct":
    case "external":
      sourceKey = lesson.video_url ?? lesson.youtube_id ?? lessonId;
      break;
    case "html_composition":
      sourceKey = lessonId;
      break;
  }

  if (!lessonId && !sourceKey) return null;

  return {
    lessonId: lessonId || sourceKey,
    mediaType,
    sourceKey: sourceKey || lessonId,
  };
}

/**
 * True when the lesson has enough data to be identified. Useful as a gate
 * before kicking off analysis, caching, or tutor context loads.
 */
export function hasLessonIdentity(lesson: LessonLike | null | undefined): boolean {
  return getLessonIdentity(lesson) !== null;
}

/**
 * Convenience: shorthand for "give me the cache key for this lesson".
 * Prefer `getLessonIdentity` when you also need the media type.
 */
export function getLessonSourceKey(lesson: LessonLike | null | undefined): string | null {
  return getLessonIdentity(lesson)?.sourceKey ?? null;
}
