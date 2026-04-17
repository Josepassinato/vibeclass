-- Adds support for the html_composition lesson media type.
--
-- `composition_json` stores the LessonComposition structure (scenes, duration,
-- metadata). Only used when `video_type = 'html_composition'`; remains NULL
-- for YouTube / direct / external lessons to preserve backward compatibility.
--
-- No CHECK constraint is added on video_type because the app already treats
-- it as a free-form string (youtube | direct | external | html_composition).

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS composition_json JSONB NULL;

COMMENT ON COLUMN public.videos.composition_json IS
  'LessonComposition payload (scenes, duration, metadata). Used when video_type = html_composition. NULL otherwise.';
