-- Criar tabela de módulos
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  module_order INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  is_released BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar module_id na tabela de vídeos
ALTER TABLE public.videos ADD COLUMN module_id UUID REFERENCES public.modules(id);

-- Habilitar RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Políticas para módulos
CREATE POLICY "Modules are viewable by everyone" 
ON public.modules FOR SELECT USING (true);

CREATE POLICY "Modules can be managed by admins" 
ON public.modules FOR ALL USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();