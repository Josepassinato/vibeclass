-- Add teaching_moments field to store pre-configured intervention points
ALTER TABLE public.videos 
ADD COLUMN teaching_moments JSONB DEFAULT '[]'::jsonb;

-- Add a status field to track if lesson is fully configured
ALTER TABLE public.videos 
ADD COLUMN is_configured BOOLEAN DEFAULT false;

-- Comment explaining the structure
COMMENT ON COLUMN public.videos.teaching_moments IS 'Array of teaching moments with structure: [{timestamp_seconds, topic, key_insight, questions_to_ask, discussion_points}]';