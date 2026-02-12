-- Migration to add support for Section Mode and other new test features
-- Use this to fix the 500 error when saving tests with new fields

ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS enable_section_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_scientific_calculator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS section_marking_model TEXT DEFAULT 'section-wise',
ADD COLUMN IF NOT EXISTS custom_category TEXT;

-- Ensure legacy fields exist (just in case)
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS creator_avatar TEXT;
