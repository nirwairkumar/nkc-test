-- NUCLEAR RESET of RLS Policies for 'tests' table
-- This ensures NO hidden or legacy policies are leaking access.

BEGIN;

-- 1. Drop ALL existing policies on the tests table.
-- We must list them or just drop by name if we know them. 
-- Dynamic dropping for safety:
DROP POLICY IF EXISTS "Public tests are viewable by everyone" ON public.tests;
DROP POLICY IF EXISTS "Public and Unlisted tests are viewable by everyone" ON public.tests;
DROP POLICY IF EXISTS "Strict Visibility Access" ON public.tests;
DROP POLICY IF EXISTS "Strict Public Access" ON public.tests;

-- Drop variations of Creator/User policies to be safe
DROP POLICY IF EXISTS "Creators can view their own tests" ON public.tests;
DROP POLICY IF EXISTS "Creators can update their own tests" ON public.tests;
DROP POLICY IF EXISTS "Creators can delete their own tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can create tests" ON public.tests;

DROP POLICY IF EXISTS "Users can view their own tests" ON public.tests;
DROP POLICY IF EXISTS "Users can insert their own tests" ON public.tests;
DROP POLICY IF EXISTS "Users can update their own tests" ON public.tests;
DROP POLICY IF EXISTS "Users can delete their own tests" ON public.tests;

DROP POLICY IF EXISTS "Admins can view all tests" ON public.tests;

-- 2. Re-Enable RLS (just in case)
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- 3. Re-Create "Creator View" (Essential for Owner access)
CREATE POLICY "Creators can view their own tests"
ON public.tests FOR SELECT
USING ( auth.uid() = created_by );

-- 4. Re-Create "Creator Update/Delete/Insert"
CREATE POLICY "Creators can update their own tests"
ON public.tests FOR UPDATE
USING ( auth.uid() = created_by );

CREATE POLICY "Creators can delete their own tests"
ON public.tests FOR DELETE
USING ( auth.uid() = created_by );

CREATE POLICY "Authenticated users can create tests"
ON public.tests FOR INSERT
WITH CHECK ( auth.uid() = created_by );

-- 5. Re-Create "Strict Public/Unlisted Access"
-- This is the CORE security rule for non-creators.
CREATE POLICY "Strict Public Access"
ON public.tests FOR SELECT
USING (
  visibility = 'public'::test_visibility
  OR visibility = 'unlisted'::test_visibility
);

-- 6. Re-Create "Admin Access" (Optional, if you have an admin system)
-- Use a secure check for admin status if applicable.
-- CREATE POLICY "Admins can view all tests" ...

COMMIT;
