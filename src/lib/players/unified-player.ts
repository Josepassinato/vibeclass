/**
 * Unified contract every lesson player must implement.
 *
 * The rest of the app (VoiceChat, timeline, tutor) talks to the player
 * through this interface so it never has to branch on whether the
 * underlying media is YouTube, direct video, HLS, or an html_composition.
 *
 * Each existing player (VideoPlayer, DirectVideoPlayer, CompositionPlayer)
 * exposes this shape via `useImperativeHandle` on a `forwardRef`.
 */
export interface UnifiedLessonPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPaused: () => boolean;
}
