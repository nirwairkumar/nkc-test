-- Add plan_id column to profiles to track current subscription
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);
