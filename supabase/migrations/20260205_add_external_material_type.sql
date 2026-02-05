-- Migration to add 'external' type to materials table constants

-- Drop existing check constraint
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_type_check;

-- Add new check constraint including 'external'
ALTER TABLE public.materials ADD CONSTRAINT materials_type_check 
    CHECK (type IN ('file', 'link', 'external'));
