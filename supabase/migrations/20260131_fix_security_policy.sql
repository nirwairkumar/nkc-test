-- STRICT SECURITY FIX
-- Removing usage of 'is_public' in RLS policies to prevent legacy flag loopholes.

-- 1. Ensure all tests have a visibility set (just in case)
UPDATE public.tests
SET visibility = 'private'::test_visibility
WHERE visibility IS NULL;

-- 2. Drop the loose policy
DROP POLICY IF EXISTS "Public and Unlisted tests are viewable by everyone" ON public.tests;

-- 3. Create STRICT policy
-- ONLY allows access if visibility is explicitly 'public' or 'unlisted'.
-- 'private' tests will naturally be rejected by this policy (default deny).
CREATE POLICY "Strict Visibility Access"
ON public.tests FOR SELECT
USING (
  visibility = 'public'::test_visibility
  OR visibility = 'unlisted'::test_visibility
);

-- Note: The "Creators can view their own tests" policy still exists (from enable_tests_rls.sql),
-- ensuring creators can always see their private tests.
