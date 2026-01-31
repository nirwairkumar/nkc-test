-- Create the enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE test_visibility AS ENUM ('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure 'unlisted' is in the enum (in case it was created without it or we need to add it)
-- Note: ALTER TYPE cannot be run inside a transaction block in some older Postgres versions, 
-- but Supabase/Postgres 12+ supports it.
-- We use a separate statement.
ALTER TYPE test_visibility ADD VALUE IF NOT EXISTS 'unlisted';

-- Add visibility column to tests table if it doesn't exist.
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS visibility test_visibility DEFAULT 'public'::test_visibility;

-- Backfill visibility based on is_public using explicit casts
UPDATE public.tests
SET visibility = CASE 
    WHEN is_public = true THEN 'public'::test_visibility
    ELSE 'private'::test_visibility
    END
WHERE visibility IS NULL; 

-- Update RLS policies
DROP POLICY IF EXISTS "Public tests are viewable by everyone" ON public.tests;
DROP POLICY IF EXISTS "Public and Unlisted tests are viewable by everyone" ON public.tests;

CREATE POLICY "Public and Unlisted tests are viewable by everyone"
ON public.tests FOR SELECT
USING (
  (is_public IS TRUE OR is_public IS NULL) -- Legacy support
  OR visibility = 'public'::test_visibility
  OR visibility = 'unlisted'::test_visibility
);
