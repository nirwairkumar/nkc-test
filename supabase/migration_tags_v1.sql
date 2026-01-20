-- Migration to add tags support
-- Run this in Supabase SQL Editor

ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Index for faster searching by tags (optional but good)
CREATE INDEX IF NOT EXISTS idx_tests_tags ON public.tests USING GIN (tags);
