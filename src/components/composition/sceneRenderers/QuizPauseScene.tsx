import { useState } from "react";
import type { QuizPauseSceneContent } from "@/lib/composition/types";

interface QuizPauseSceneProps {
  content: QuizPauseSceneContent;
  /** Called when the learner asks to resume. The player will resume playback. */
  onResume: () => void;
}

export function QuizPauseScene({ content, onResume }: QuizPauseSceneProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = Array.isArray(content.options) ? content.options : [];

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/60 p-8 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-white/95 p-6 shadow-2xl dark:bg-zinc-900/95">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
            Quiz pause
          </span>
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {content.question}
        </h3>
        {options.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {options.map((option, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected === index
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-zinc-200 text-zinc-700 hover:border-primary/40 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onResume}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
