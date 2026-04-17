import { useMemo, useState } from "react";
import { CompositionPlayer } from "@/components/CompositionPlayer";
import {
  validateComposition,
  type CompositionValidationResult,
} from "@/lib/composition/validation";
import type { LessonComposition } from "@/lib/composition/types";

const SAMPLE_COMPOSITION = `{
  "version": "1.0",
  "duration": 30,
  "metadata": {
    "title": "Intro Lesson Composition",
    "theme": "default"
  },
  "scenes": [
    {
      "id": "scene-1",
      "start": 0,
      "end": 5,
      "type": "text",
      "content": { "text": "Welcome to the lesson" },
      "animation": { "enter": "fade", "exit": "fade", "duration": 0.6 },
      "position": { "x": 50, "y": 50 }
    },
    {
      "id": "scene-2",
      "start": 5,
      "end": 12,
      "type": "image",
      "content": { "src": "/demo/lesson-diagram.png", "alt": "Lesson diagram" },
      "animation": { "enter": "slide-up", "exit": "fade", "duration": 0.6 }
    },
    {
      "id": "scene-3",
      "start": 12,
      "end": 12.1,
      "type": "quiz_pause",
      "content": { "question": "What is the main idea introduced so far?" }
    },
    {
      "id": "scene-4",
      "start": 12.1,
      "end": 20,
      "type": "text",
      "content": { "text": "Great. Now let’s continue." },
      "animation": { "enter": "scale-in", "exit": "fade", "duration": 0.5 }
    }
  ]
}`;

interface CompositionAdminEditorProps {
  /** Current JSON string value. Controlled by the parent. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Called whenever the parsed composition is known valid, so the parent can
   * persist only valid payloads. `null` means the current value cannot be used.
   */
  onValidChange?: (composition: LessonComposition | null) => void;
}

export function CompositionAdminEditor({
  value,
  onChange,
  onValidChange,
}: CompositionAdminEditorProps) {
  const [previewing, setPreviewing] = useState(false);

  const validation: CompositionValidationResult = useMemo(() => {
    if (!value.trim()) {
      return { valid: false, composition: null, errors: ["JSON is empty."] };
    }
    return validateComposition(value);
  }, [value]);

  // Notify parent on validity change. Using ref would avoid effect; useMemo
  // already recomputes so a simple effect-free callback is fine here.
  useMemo(() => {
    onValidChange?.(validation.valid ? validation.composition : null);
  }, [validation, onValidChange]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">Composition JSON</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(SAMPLE_COMPOSITION)}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-primary/40 hover:text-primary dark:border-zinc-700 dark:text-zinc-300"
          >
            Load sample
          </button>
          <button
            type="button"
            onClick={() => setPreviewing((p) => !p)}
            disabled={!validation.valid}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {previewing ? "Close preview" : "Preview"}
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-[220px] w-full rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder="Paste a LessonComposition JSON here…"
      />

      {!validation.valid && value.trim() ? (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {validation.errors.map((err, i) => (
            <li key={i}>• {err}</li>
          ))}
        </ul>
      ) : null}

      {validation.valid ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          ✓ Valid composition —{" "}
          {validation.composition.scenes.length} scenes,{" "}
          {validation.composition.duration}s total.
        </p>
      ) : null}

      {previewing && validation.valid ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <CompositionPlayer
            composition={validation.composition}
            autoPlay
          />
        </div>
      ) : null}
    </div>
  );
}
