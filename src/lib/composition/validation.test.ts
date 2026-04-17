import { describe, expect, it } from "vitest";
import { validateComposition } from "./validation";

const MINIMAL = {
  version: "1.0",
  duration: 10,
  scenes: [
    { id: "s1", start: 0, end: 5, type: "text", content: { text: "hi" } },
  ],
};

describe("validateComposition", () => {
  it("accepts a minimal well-formed composition", () => {
    const res = validateComposition(MINIMAL);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.composition.scenes).toHaveLength(1);
      expect(res.composition.duration).toBe(10);
    }
  });

  it("parses a JSON string input", () => {
    const res = validateComposition(JSON.stringify(MINIMAL));
    expect(res.valid).toBe(true);
  });

  it("fails gracefully on malformed JSON string", () => {
    const res = validateComposition("{ not: valid json");
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors[0]).toMatch(/invalid json/i);
    }
  });

  it("rejects non-object root", () => {
    expect(validateComposition(42).valid).toBe(false);
    expect(validateComposition([]).valid).toBe(false);
    expect(validateComposition(null).valid).toBe(false);
  });

  it("requires a string version", () => {
    const res = validateComposition({ ...MINIMAL, version: 1 });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors.some((e) => /version/i.test(e))).toBe(true);
    }
  });

  it("requires a non-negative numeric duration", () => {
    expect(validateComposition({ ...MINIMAL, duration: -1 }).valid).toBe(false);
    expect(validateComposition({ ...MINIMAL, duration: "10" }).valid).toBe(
      false,
    );
  });

  it("rejects scenes that are not an array", () => {
    const res = validateComposition({ ...MINIMAL, scenes: "nope" });
    expect(res.valid).toBe(false);
  });

  it("rejects scenes with missing id", () => {
    const res = validateComposition({
      ...MINIMAL,
      scenes: [{ start: 0, end: 1, type: "text" }],
    });
    expect(res.valid).toBe(false);
  });

  it("rejects duplicate scene ids", () => {
    const res = validateComposition({
      ...MINIMAL,
      scenes: [
        { id: "a", start: 0, end: 1, type: "text" },
        { id: "a", start: 1, end: 2, type: "text" },
      ],
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors.some((e) => /duplicated/i.test(e))).toBe(true);
    }
  });

  it("rejects scene with end < start", () => {
    const res = validateComposition({
      ...MINIMAL,
      scenes: [{ id: "a", start: 5, end: 2, type: "text" }],
    });
    expect(res.valid).toBe(false);
  });

  it("allows zero-width scenes (quiz_pause pattern)", () => {
    const res = validateComposition({
      ...MINIMAL,
      scenes: [
        { id: "q", start: 5, end: 5, type: "quiz_pause", content: { question: "?" } },
      ],
    });
    expect(res.valid).toBe(true);
  });

  it("rejects unknown scene types", () => {
    const res = validateComposition({
      ...MINIMAL,
      scenes: [{ id: "x", start: 0, end: 1, type: "hologram" }],
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors.some((e) => /not supported/i.test(e))).toBe(true);
    }
  });

  it("preserves metadata when provided", () => {
    const res = validateComposition({
      ...MINIMAL,
      metadata: { title: "T", theme: "dark", author: "a" },
    });
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.composition.metadata?.title).toBe("T");
    }
  });

  it("returns empty string errors as empty-json error", () => {
    // Empty string is distinct from undefined — validator treats it as JSON.parse failure
    const res = validateComposition("");
    expect(res.valid).toBe(false);
  });

  it("rejects 'avatar' and 'custom' scene types (schema honesty)", () => {
    const avatar = validateComposition({
      ...MINIMAL,
      scenes: [{ id: "a", start: 0, end: 1, type: "avatar" }],
    });
    expect(avatar.valid).toBe(false);

    const custom = validateComposition({
      ...MINIMAL,
      scenes: [{ id: "c", start: 0, end: 1, type: "custom" }],
    });
    expect(custom.valid).toBe(false);
  });

  it("preserves optional pedagogical metadata on scenes", () => {
    const res = validateComposition({
      ...MINIMAL,
      scenes: [
        {
          id: "s1",
          start: 0,
          end: 5,
          type: "text",
          content: { text: "hi" },
          pedagogical: {
            checkpoint: true,
            requiresReflection: true,
            teachingMoment: true,
            difficultyLevel: "medium",
          },
        },
      ],
    });
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.composition.scenes[0].pedagogical?.checkpoint).toBe(true);
      expect(res.composition.scenes[0].pedagogical?.difficultyLevel).toBe(
        "medium",
      );
    }
  });
});
