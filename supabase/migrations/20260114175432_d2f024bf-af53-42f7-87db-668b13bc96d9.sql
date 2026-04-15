-- Add lesson order and status fields to videos table
ALTER TABLE public.videos 
ADD COLUMN lesson_order INTEGER DEFAULT 0,
ADD COLUMN description TEXT,
ADD COLUMN duration_minutes INTEGER;

-- Create index for ordering lessons
CREATE INDEX idx_videos_lesson_order ON public.videos(lesson_order);

-- Update existing videos with sequential order
UPDATE public.videos 
SET lesson_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.videos
) AS subquery
WHERE public.videos.id = subquery.id;