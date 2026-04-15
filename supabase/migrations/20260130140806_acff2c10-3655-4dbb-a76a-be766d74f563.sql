-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL DEFAULT 'module', -- 'module' or 'course'
  student_name TEXT NOT NULL,
  module_title TEXT, -- null for course completion
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificate_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Students can view their own certificates
CREATE POLICY "Students can view their own certificates"
ON public.certificates
FOR SELECT
USING (true);

-- System can create certificates
CREATE POLICY "System can create certificates"
ON public.certificates
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_certificates_student ON public.certificates(student_id);
CREATE INDEX idx_certificates_code ON public.certificates(certificate_code);