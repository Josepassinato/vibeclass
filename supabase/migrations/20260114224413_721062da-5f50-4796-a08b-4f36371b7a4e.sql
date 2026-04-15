-- Add timestamp_seconds to link quizzes to specific moments in the video
ALTER TABLE public.video_quizzes 
ADD COLUMN timestamp_seconds INTEGER DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.video_quizzes.timestamp_seconds IS 'The timestamp in seconds where this quiz should appear during video playback';