import { motion } from "framer-motion";
import type { CompositionScene } from "@/lib/composition/types";
import { TextScene } from "./sceneRenderers/TextScene";
import { ImageScene } from "./sceneRenderers/ImageScene";
import { QuizPauseScene } from "./sceneRenderers/QuizPauseScene";

/**
 * Map a named animation to framer-motion variants. Kept tiny on purpose —
 * the build card calls for a small reliable animation mapper, not an engine.
 */
const animationMap: Record<
  string,
  { initial: object; animate: object; exit: object }
> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-up": {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  },
  "slide-left": {
    initial: { opacity: 0, x: 32 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -32 },
  },
  "slide-right": {
    initial: { opacity: 0, x: -32 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 32 },
  },
  "scale-in": {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  crossfade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

const defaultAnimation = animationMap.fade;

function resolvePositionStyle(
  position: CompositionScene["position"],
): React.CSSProperties {
  if (!position) {
    return { position: "absolute", inset: 0 };
  }
  const base: React.CSSProperties = { position: "absolute" };
  if (typeof position.x === "number") base.left = `${position.x}%`;
  if (typeof position.y === "number") base.top = `${position.y}%`;
  if (typeof position.width === "number") base.width = `${position.width}%`;
  else if (typeof position.x !== "number") base.right = 0;
  if (typeof position.height === "number") base.height = `${position.height}%`;
  else if (typeof position.y !== "number") base.bottom = 0;
  if (typeof position.x === "number" || typeof position.y === "number") {
    base.transform = `translate(${typeof position.x === "number" ? "-50%" : "0"}, ${typeof position.y === "number" ? "-50%" : "0"})`;
  }
  return base;
}

interface CompositionSceneRendererProps {
  scene: CompositionScene;
  onResumeQuiz: (scene: CompositionScene) => void;
}

export function CompositionSceneRenderer({
  scene,
  onResumeQuiz,
}: CompositionSceneRendererProps) {
  const enterName = scene.animation?.enter || "fade";
  const exitName = scene.animation?.exit || enterName;
  const duration = scene.animation?.duration ?? 0.5;
  const enter = animationMap[enterName] || defaultAnimation;
  const exit = animationMap[exitName] || defaultAnimation;

  const style: React.CSSProperties = {
    ...resolvePositionStyle(scene.position),
    ...(scene.style as React.CSSProperties | undefined),
  };

  let body: React.ReactNode = null;
  switch (scene.type) {
    case "text":
    case "caption":
      body = (
        <TextScene
          content={(scene.content || { text: "" }) as { text: string }}
        />
      );
      break;
    case "image":
      body = (
        <ImageScene
          content={(scene.content || { src: "" }) as { src: string }}
        />
      );
      break;
    case "quiz_pause":
      body = (
        <QuizPauseScene
          content={
            (scene.content || { question: "" }) as { question: string }
          }
          onResume={() => onResumeQuiz(scene)}
        />
      );
      break;
    default:
      // Unknown/custom types render nothing but don't crash.
      if (import.meta.env.DEV) {
        console.warn(
          `[CompositionSceneRenderer] Unknown scene type "${scene.type}" — skipped.`,
        );
      }
      body = null;
  }

  if (!body) return null;

  return (
    <motion.div
      key={scene.id}
      style={style}
      initial={enter.initial}
      animate={enter.animate}
      exit={exit.exit}
      transition={{ duration }}
    >
      {body}
    </motion.div>
  );
}
