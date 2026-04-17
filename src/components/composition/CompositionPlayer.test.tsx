import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompositionPlayer } from "../CompositionPlayer";
import type { UnifiedLessonPlayerHandle } from "@/lib/players/unified-player";
import type { LessonComposition } from "@/lib/composition/types";

/**
 * Controlled rAF mock: each call to advance(ms) flushes one frame at that
 * simulated `performance.now()`. Avoids real timers while still exercising
 * the CompositionPlayer's rAF playback loop deterministically.
 */
function installRafMock() {
  let nowMs = 0;
  const pending: Array<(t: number) => void> = [];
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    pending.push(cb);
    return pending.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("performance", { now: () => nowMs });
  return {
    advance(ms: number) {
      nowMs += ms;
      const queue = pending.splice(0, pending.length);
      for (const cb of queue) cb(nowMs);
    },
    getNow: () => nowMs,
  };
}

const BASE: LessonComposition = {
  version: "1.0",
  duration: 10,
  scenes: [
    { id: "s1", start: 0, end: 3, type: "text", content: { text: "Hello" } },
    { id: "s2", start: 3, end: 6, type: "text", content: { text: "World" } },
    {
      id: "qp",
      start: 6,
      end: 6,
      type: "quiz_pause",
      content: { question: "Got it?" },
    },
    { id: "s3", start: 6.1, end: 10, type: "text", content: { text: "End" } },
  ],
};

describe("CompositionPlayer", () => {
  let raf: ReturnType<typeof installRafMock>;

  beforeEach(() => {
    raf = installRafMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the first scene at time 0", () => {
    render(<CompositionPlayer composition={BASE} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("exposes a UnifiedLessonPlayerHandle via ref", () => {
    const ref = createRef<UnifiedLessonPlayerHandle>();
    render(<CompositionPlayer ref={ref} composition={BASE} />);
    expect(typeof ref.current?.play).toBe("function");
    expect(typeof ref.current?.pause).toBe("function");
    expect(typeof ref.current?.seekTo).toBe("function");
    expect(typeof ref.current?.getCurrentTime).toBe("function");
    expect(typeof ref.current?.getDuration).toBe("function");
    expect(typeof ref.current?.isPaused).toBe("function");
    expect(ref.current?.getDuration()).toBe(10);
    expect(ref.current?.isPaused()).toBe(true);
  });

  it("advances through scenes while playing", () => {
    const ref = createRef<UnifiedLessonPlayerHandle>();
    render(<CompositionPlayer ref={ref} composition={BASE} />);
    act(() => {
      ref.current?.play();
    });
    // First rAF sets lastTick — no time advance yet.
    act(() => {
      raf.advance(0);
    });
    act(() => {
      raf.advance(3500); // cross scene boundary at 3s
    });
    expect(screen.getByText("World")).toBeInTheDocument();
    expect(ref.current?.getCurrentTime()).toBeCloseTo(3.5, 1);
  });

  it("pauses at a quiz_pause scene and shows the question", () => {
    const onQuiz = vi.fn();
    const ref = createRef<UnifiedLessonPlayerHandle>();
    render(
      <CompositionPlayer
        ref={ref}
        composition={BASE}
        onQuizPause={onQuiz}
      />,
    );
    act(() => {
      ref.current?.play();
    });
    act(() => {
      raf.advance(0);
    });
    act(() => {
      raf.advance(6500); // cross into quiz_pause at 6s
    });
    expect(ref.current?.isPaused()).toBe(true);
    expect(ref.current?.getCurrentTime()).toBeCloseTo(6, 3);
    expect(onQuiz).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Got it?")).toBeInTheDocument();
  });

  it("seekTo updates current time and scene immediately", () => {
    const ref = createRef<UnifiedLessonPlayerHandle>();
    render(<CompositionPlayer ref={ref} composition={BASE} />);
    act(() => {
      ref.current?.seekTo(4);
    });
    expect(ref.current?.getCurrentTime()).toBe(4);
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("clamps seek to [0, duration]", () => {
    const ref = createRef<UnifiedLessonPlayerHandle>();
    render(<CompositionPlayer ref={ref} composition={BASE} />);
    act(() => {
      ref.current?.seekTo(-5);
    });
    expect(ref.current?.getCurrentTime()).toBe(0);
    act(() => {
      ref.current?.seekTo(999);
    });
    expect(ref.current?.getCurrentTime()).toBe(10);
  });

  it("fires onEnded when playback reaches duration", () => {
    const onEnded = vi.fn();
    const ref = createRef<UnifiedLessonPlayerHandle>();
    render(
      <CompositionPlayer
        ref={ref}
        composition={{
          ...BASE,
          scenes: BASE.scenes.filter((s) => s.type !== "quiz_pause"),
        }}
        onEnded={onEnded}
      />,
    );
    act(() => {
      ref.current?.play();
    });
    act(() => {
      raf.advance(0);
    });
    act(() => {
      raf.advance(11000);
    });
    expect(onEnded).toHaveBeenCalled();
    expect(ref.current?.isPaused()).toBe(true);
  });
});
