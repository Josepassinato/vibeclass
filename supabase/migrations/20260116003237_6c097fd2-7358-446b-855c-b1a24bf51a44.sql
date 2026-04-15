-- Add column to control if a lesson is released/available to students
ALTER TABLE public.videos 
ADD COLUMN is_released boolean DEFAULT false;

-- Set existing configured lessons as released
UPDATE public.videos SET is_released = true WHERE is_configured = true;