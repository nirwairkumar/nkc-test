-- PART 2: TABLE & RESOURCE UPDATES
-- Run this script SECOND, after the Enum script has been run.

-- 1. Add column (safely)
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS visibility test_visibility DEFAULT 'public'::test_visibility;

-- 2. Backfill data
-- We can now safely use 'unlisted' and 'public' because the type update is committed.
UPDATE public.tests
SET visibility = CASE 
    WHEN is_public = true THEN 'public'::test_visibility
    ELSE 'private'::test_visibility
    END
WHERE visibility IS NULL;

-- 3. Update Policies
DROP POLICY IF EXISTS "Public tests are viewable by everyone" ON public.tests;
DROP POLICY IF EXISTS "Public and Unlisted tests are viewable by everyone" ON public.tests;

CREATE POLICY "Public and Unlisted tests are viewable by everyone"
ON public.tests FOR SELECT
USING (
  (is_public IS TRUE OR is_public IS NULL) 
  OR visibility = 'public'::test_visibility
  OR visibility = 'unlisted'::test_visibility
);
