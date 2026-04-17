import type {
  CompositionScene,
  CompositionSceneType,
  LessonComposition,
} from "./types";

export type CompositionValidationResult =
  | { valid: true; composition: LessonComposition; errors: [] }
  | { valid: false; composition: null; errors: string[] };

const VALID_SCENE_TYPES: readonly CompositionSceneType[] = [
  "text",
  "image",
  "avatar",
  "quiz_pause",
  "caption",
  "custom",
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === "string";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Parse an arbitrary JSON string or object into a validated composition.
 * Returns `{ valid: false, errors }` instead of throwing so callers can
 * render meaningful messages to authors without crashing the lesson flow.
 */
export function validateComposition(
  input: unknown,
): CompositionValidationResult {
  const errors: string[] = [];

  let raw: unknown = input;
  if (isString(input)) {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      return {
        valid: false,
        composition: null,
        errors: [`Invalid JSON: ${(err as Error).message}`],
      };
    }
  }

  if (!isObject(raw)) {
    return {
      valid: false,
      composition: null,
      errors: ["Composition root must be an object."],
    };
  }

  const version = raw.version;
  if (!isString(version)) {
    errors.push('Missing or invalid "version" (expected string).');
  }

  const duration = raw.duration;
  if (!isFiniteNumber(duration) || duration < 0) {
    errors.push('Missing or invalid "duration" (expected finite number >= 0).');
  }

  const scenesInput = raw.scenes;
  if (!Array.isArray(scenesInput)) {
    errors.push('Missing or invalid "scenes" (expected array).');
    return { valid: false, composition: null, errors };
  }

  const validatedScenes: CompositionScene[] = [];
  const seenIds = new Set<string>();

  scenesInput.forEach((scene, index) => {
    const prefix = `scenes[${index}]`;
    if (!isObject(scene)) {
      errors.push(`${prefix} is not an object.`);
      return;
    }
    const id = scene.id;
    if (!isString(id) || id.length === 0) {
      errors.push(`${prefix}.id is missing.`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(`${prefix}.id "${id}" is duplicated.`);
      return;
    }
    seenIds.add(id);

    const start = scene.start;
    const end = scene.end;
    if (!isFiniteNumber(start) || start < 0) {
      errors.push(`${prefix}.start must be a number >= 0.`);
      return;
    }
    if (!isFiniteNumber(end) || end < start) {
      errors.push(`${prefix}.end must be a number >= start.`);
      return;
    }

    const type = scene.type as CompositionSceneType | undefined;
    if (!type || !VALID_SCENE_TYPES.includes(type)) {
      errors.push(
        `${prefix}.type "${String(type)}" is not supported. Expected one of: ${VALID_SCENE_TYPES.join(", ")}.`,
      );
      return;
    }

    validatedScenes.push(scene as unknown as CompositionScene);
  });

  if (errors.length > 0) {
    return { valid: false, composition: null, errors };
  }

  const composition: LessonComposition = {
    version: version as string,
    duration: duration as number,
    scenes: validatedScenes,
    metadata: isObject(raw.metadata)
      ? {
          title: isString(raw.metadata.title) ? raw.metadata.title : undefined,
          theme: isString(raw.metadata.theme) ? raw.metadata.theme : undefined,
          author: isString(raw.metadata.author)
            ? raw.metadata.author
            : undefined,
        }
      : undefined,
  };

  return { valid: true, composition, errors: [] };
}
