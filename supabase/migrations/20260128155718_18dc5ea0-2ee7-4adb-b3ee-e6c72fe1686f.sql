-- Add support for direct video URLs (MP4, HeyGen, external links)
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'direct', 'external'));

-- Make youtube_id optional for non-YouTube videos
ALTER TABLE public.videos 
ALTER COLUMN youtube_id DROP NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.videos.video_url IS 'Direct video URL for MP4, HeyGen, or external video links';
COMMENT ON COLUMN public.videos.video_type IS 'Type of video: youtube, direct (uploaded MP4), or external (HeyGen, Vimeo, etc.)';