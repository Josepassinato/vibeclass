import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompositionAdminEditor } from "./CompositionAdminEditor";
import type { LessonComposition } from "@/lib/composition/types";

// Stub rAF so the preview's CompositionPlayer doesn't run loops during tests.
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function Harness({
  onValid,
}: {
  onValid?: (c: LessonComposition | null) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <CompositionAdminEditor
      value={value}
      onChange={setValue}
      onValidChange={(v) => onValid?.(v)}
    />
  );
}

describe("CompositionAdminEditor", () => {
  it('loads the sample when "Load sample" is clicked', () => {
    render(<Harness />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /load sample/i }));
    });
    const ta = screen.getByPlaceholderText(/paste a lessoncomposition/i) as
      | HTMLTextAreaElement
      | null;
    expect(ta?.value).toMatch(/"version"\s*:\s*"1\.0"/);
  });

  it("shows an error list when the JSON is malformed", () => {
    render(<Harness />);
    const ta = screen.getByPlaceholderText(/paste a lessoncomposition/i);
    act(() => {
      fireEvent.change(ta, { target: { value: "{ bad json" } });
    });
    expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
  });

  it("marks valid composition and notifies parent", () => {
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /load sample/i }));
    });
    expect(screen.getByText(/valid composition/i)).toBeInTheDocument();
    const last = onValid.mock.calls.at(-1)?.[0] as LessonComposition | null;
    expect(last?.scenes.length).toBeGreaterThan(0);
  });

  it("disables preview when composition is invalid", () => {
    render(<Harness />);
    const ta = screen.getByPlaceholderText(/paste a lessoncomposition/i);
    act(() => {
      fireEvent.change(ta, { target: { value: "{}" } });
    });
    expect(screen.getByRole("button", { name: /preview/i })).toBeDisabled();
  });
});
