import { describe, expect, it } from "vitest";
import {
  getLessonIdentity,
  getLessonSourceKey,
  hasLessonIdentity,
} from "./lesson-identity";

describe("getLessonIdentity", () => {
  it("returns null for null/undefined lessons", () => {
    expect(getLessonIdentity(null)).toBeNull();
    expect(getLessonIdentity(undefined)).toBeNull();
  });

  it("returns null when lesson has no id and no media reference", () => {
    expect(getLessonIdentity({})).toBeNull();
  });

  it("keys YouTube lessons by youtube_id", () => {
    const id = getLessonIdentity({
      id: "lesson-1",
      video_type: "youtube",
      youtube_id: "abc123",
      video_url: null,
    });
    expect(id).toEqual({
      lessonId: "lesson-1",
      mediaType: "youtube",
      sourceKey: "abc123",
    });
  });

  it("keys direct lessons by video_url", () => {
    const id = getLessonIdentity({
      id: "lesson-2",
      video_type: "direct",
      youtube_id: null,
      video_url: "https://cdn/video.mp4",
    });
    expect(id?.sourceKey).toBe("https://cdn/video.mp4");
    expect(id?.mediaType).toBe("direct");
  });

  it("keys external lessons by video_url", () => {
    const id = getLessonIdentity({
      id: "lesson-3",
      video_type: "external",
      video_url: "https://heygen/stream/123",
    });
    expect(id?.sourceKey).toBe("https://heygen/stream/123");
    expect(id?.mediaType).toBe("external");
  });

  it("keys html_composition lessons by lesson id (no video fields required)", () => {
    const id = getLessonIdentity({
      id: "lesson-4",
      video_type: "html_composition",
      youtube_id: null,
      video_url: null,
    });
    expect(id).toEqual({
      lessonId: "lesson-4",
      mediaType: "html_composition",
      sourceKey: "lesson-4",
    });
  });

  it("ignores stale youtube_id on composition lessons", () => {
    const id = getLessonIdentity({
      id: "lesson-5",
      video_type: "html_composition",
      youtube_id: "stale-yt",
      video_url: "stale-url",
    });
    expect(id?.sourceKey).toBe("lesson-5");
  });

  it("falls back to youtube for unknown media types", () => {
    const id = getLessonIdentity({
      id: "lesson-6",
      video_type: "bogus" as unknown as string,
      youtube_id: "xyz",
    });
    expect(id?.mediaType).toBe("youtube");
  });

  it("falls back to lesson id when a YouTube lesson is missing youtube_id", () => {
    const id = getLessonIdentity({
      id: "lesson-7",
      video_type: "youtube",
      youtube_id: null,
      video_url: null,
    });
    expect(id?.sourceKey).toBe("lesson-7");
  });
});

describe("hasLessonIdentity", () => {
  it("reports false for empty and null lessons", () => {
    expect(hasLessonIdentity(null)).toBe(false);
    expect(hasLessonIdentity({})).toBe(false);
  });

  it("reports true for a composition lesson with only an id", () => {
    expect(
      hasLessonIdentity({ id: "x", video_type: "html_composition" })
    ).toBe(true);
  });
});

describe("getLessonSourceKey", () => {
  it("returns the sourceKey or null", () => {
    expect(getLessonSourceKey({ id: "a", video_type: "youtube", youtube_id: "yt" })).toBe("yt");
    expect(getLessonSourceKey(null)).toBeNull();
  });
});
