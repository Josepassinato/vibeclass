import { describe, expect, it } from "vitest";
import {
  findUpcomingCheckpoint,
  findUpcomingQuizPause,
  getActiveScenes,
  getNextSceneAfter,
} from "./timeline";
import type { LessonComposition } from "./types";

const COMP: LessonComposition = {
  version: "1.0",
  duration: 30,
  scenes: [
    { id: "a", start: 0, end: 5, type: "text", content: { text: "a" } },
    { id: "b", start: 5, end: 12, type: "image", content: { src: "x" } },
    { id: "q", start: 12, end: 12, type: "quiz_pause", content: { question: "?" } },
    { id: "c", start: 12.1, end: 20, type: "text", content: { text: "c" } },
  ],
};

describe("getActiveScenes", () => {
  it("returns the scene active at a given time", () => {
    expect(getActiveScenes(COMP, 0).map((s) => s.id)).toEqual(["a"]);
    expect(getActiveScenes(COMP, 3).map((s) => s.id)).toEqual(["a"]);
    expect(getActiveScenes(COMP, 5).map((s) => s.id)).toEqual(["b"]);
    expect(getActiveScenes(COMP, 11.9).map((s) => s.id)).toEqual(["b"]);
    expect(getActiveScenes(COMP, 15).map((s) => s.id)).toEqual(["c"]);
  });

  it("includes zero-width quiz_pause scenes at their start tick", () => {
    expect(getActiveScenes(COMP, 12).map((s) => s.id)).toContain("q");
  });

  it("returns empty list outside the composition range", () => {
    expect(getActiveScenes(COMP, 21)).toEqual([]);
    expect(getActiveScenes(COMP, 999)).toEqual([]);
  });

  it("is null-safe", () => {
    expect(getActiveScenes(null, 0)).toEqual([]);
  });
});

describe("getNextSceneAfter", () => {
  it("returns the earliest scene that starts strictly after the time", () => {
    expect(getNextSceneAfter(COMP, 0)?.id).toBe("b");
    expect(getNextSceneAfter(COMP, 11)?.id).toBe("q");
    expect(getNextSceneAfter(COMP, 12)?.id).toBe("c");
  });

  it("returns null when nothing follows", () => {
    expect(getNextSceneAfter(COMP, 30)).toBeNull();
  });
});

describe("findUpcomingQuizPause", () => {
  it("detects quiz pause crossed within the tick range", () => {
    const res = findUpcomingQuizPause(COMP, 11, 12.5);
    expect(res?.id).toBe("q");
  });

  it("returns null when no quiz pause is in range", () => {
    expect(findUpcomingQuizPause(COMP, 0, 5)).toBeNull();
    expect(findUpcomingQuizPause(COMP, 15, 20)).toBeNull();
  });

  it("requires start to be strictly greater than fromTime", () => {
    // fromTime exactly at the pause's start should NOT re-detect it
    expect(findUpcomingQuizPause(COMP, 12, 13)).toBeNull();
  });
});

describe("findUpcomingCheckpoint", () => {
  const PED: LessonComposition = {
    version: "1.0",
    duration: 30,
    scenes: [
      { id: "intro", start: 0, end: 5, type: "text", content: { text: "i" } },
      {
        id: "check",
        start: 5,
        end: 8,
        type: "text",
        content: { text: "stop" },
        pedagogical: { checkpoint: true },
      },
      { id: "mid", start: 8, end: 12, type: "text", content: { text: "m" } },
      {
        id: "skip-quiz",
        start: 12,
        end: 12,
        type: "quiz_pause",
        content: { question: "?" },
        pedagogical: { checkpoint: true },
      },
    ],
  };

  it("detects a pedagogical checkpoint crossed within the tick", () => {
    expect(findUpcomingCheckpoint(PED, 0, 5.1)?.id).toBe("check");
  });

  it("ignores scenes without pedagogical.checkpoint", () => {
    expect(findUpcomingCheckpoint(COMP, 0, 30)).toBeNull();
  });

  it("does NOT treat a quiz_pause as a checkpoint, even if flagged", () => {
    // The flagged quiz_pause at t=12 should not be returned — quiz pauses
    // have their own handler and must not be double-fired.
    expect(findUpcomingCheckpoint(PED, 11, 13)).toBeNull();
  });

  it("requires start to be strictly greater than fromTime (no re-fire)", () => {
    expect(findUpcomingCheckpoint(PED, 5, 10)).toBeNull();
  });
});
