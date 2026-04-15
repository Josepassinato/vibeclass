-- Add teacher_intro column to videos table for custom intro text
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS teacher_intro text;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN public.videos.teacher_intro IS 'Custom introduction text that the AI teacher will use when starting the lesson';