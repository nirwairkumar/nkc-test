-- Create Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Policies for Classes
CREATE POLICY "Public Read Classes" 
ON public.classes FOR SELECT 
USING (true);

CREATE POLICY "Creator Full Access Classes" 
ON public.classes FOR ALL 
USING (auth.uid() = user_id);

-- Add class_id to Tests
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Add class_id to Materials
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
