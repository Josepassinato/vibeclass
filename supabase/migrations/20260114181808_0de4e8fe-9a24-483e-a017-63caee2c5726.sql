-- Create table for tracking student lesson progress
CREATE TABLE public.student_lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  watch_time_seconds INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, video_id)
);

-- Enable RLS
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (similar to other student tables)
CREATE POLICY "Allow all operations on student_lesson_progress"
ON public.student_lesson_progress
AS RESTRICTIVE
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_lesson_progress_updated_at
BEFORE UPDATE ON public.student_lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();