import type { TextSceneContent } from "@/lib/composition/types";

interface TextSceneProps {
  content: TextSceneContent;
}

export function TextScene({ content }: TextSceneProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center">
      <p className="text-3xl font-semibold leading-tight text-white md:text-4xl">
        {content.text}
      </p>
      {content.subtitle ? (
        <p className="mt-3 text-base text-white/70 md:text-lg">
          {content.subtitle}
        </p>
      ) : null}
    </div>
  );
}
