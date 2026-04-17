import { useState } from "react";
import type { ImageSceneContent } from "@/lib/composition/types";

interface ImageSceneProps {
  content: ImageSceneContent;
}

export function ImageScene({ content }: ImageSceneProps) {
  const [errored, setErrored] = useState(false);

  if (errored || !content.src) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-white/60">
        <p className="text-sm">
          {content.alt || "Image unavailable"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
      <img
        src={content.src}
        alt={content.alt || ""}
        onError={() => setErrored(true)}
        className="max-h-[80%] max-w-full rounded-lg object-contain shadow-xl"
      />
      {content.caption ? (
        <p className="text-sm text-white/70">{content.caption}</p>
      ) : null}
    </div>
  );
}
