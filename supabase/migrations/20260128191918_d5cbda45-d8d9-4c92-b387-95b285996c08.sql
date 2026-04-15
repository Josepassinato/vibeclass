-- Create squads table (groups of 4 students)
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER NOT NULL DEFAULT 4,
  current_members INTEGER NOT NULL DEFAULT 0
);

-- Create squad members table
CREATE TABLE public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member', -- 'leader' or 'member'
  UNIQUE(user_id) -- Each user can only be in one squad
);

-- Create squad mission submissions (group submissions)
CREATE TABLE public.squad_mission_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL, -- User who submitted
  evidence_text TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, evaluated
  ai_feedback TEXT,
  ai_evaluation JSONB DEFAULT '{}'::jsonb,
  score INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_mission_submissions ENABLE ROW LEVEL SECURITY;

-- Squads policies
CREATE POLICY "Squads are viewable by members"
ON public.squads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_members.squad_id = squads.id
    AND squad_members.user_id = auth.uid()
  )
  OR NOT EXISTS (SELECT 1 FROM public.squad_members WHERE squad_members.squad_id = squads.id)
);

CREATE POLICY "System can manage squads"
ON public.squads FOR ALL
USING (true);

-- Squad members policies
CREATE POLICY "Members can view their squad"
ON public.squad_members FOR SELECT
USING (
  squad_id IN (
    SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage squad members"
ON public.squad_members FOR ALL
USING (true);

-- Squad submissions policies
CREATE POLICY "Squad members can view submissions"
ON public.squad_mission_submissions FOR SELECT
USING (
  squad_id IN (
    SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Squad members can submit"
ON public.squad_mission_submissions FOR INSERT
WITH CHECK (
  squad_id IN (
    SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage submissions"
ON public.squad_mission_submissions FOR ALL
USING (true);

-- Function to auto-assign student to squad on signup
CREATE OR REPLACE FUNCTION public.assign_student_to_squad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_squad_id UUID;
  new_squad_id UUID;
  squad_count INTEGER;
BEGIN
  -- Find a squad with less than 4 members
  SELECT s.id INTO available_squad_id
  FROM public.squads s
  WHERE s.is_active = true AND s.current_members < s.max_members
  ORDER BY s.current_members DESC, s.created_at ASC
  LIMIT 1;
  
  -- If no available squad, create a new one
  IF available_squad_id IS NULL THEN
    SELECT COUNT(*) + 1 INTO squad_count FROM public.squads;
    
    INSERT INTO public.squads (name)
    VALUES ('Squad ' || squad_count)
    RETURNING id INTO new_squad_id;
    
    available_squad_id := new_squad_id;
  END IF;
  
  -- Add student to squad
  INSERT INTO public.squad_members (squad_id, user_id, role)
  VALUES (
    available_squad_id,
    NEW.user_id,
    CASE WHEN (SELECT current_members FROM public.squads WHERE id = available_squad_id) = 0 
         THEN 'leader' ELSE 'member' END
  );
  
  -- Update squad member count
  UPDATE public.squads
  SET current_members = current_members + 1,
      updated_at = now()
  WHERE id = available_squad_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to assign squad when profile is created
CREATE TRIGGER on_profile_created_assign_squad
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_student_to_squad();

-- Add trigger for updated_at
CREATE TRIGGER update_squads_updated_at
BEFORE UPDATE ON public.squads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_squad_submissions_updated_at
BEFORE UPDATE ON public.squad_mission_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();