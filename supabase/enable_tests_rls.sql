-- Enable Row Level Security (RLS) on the tests table
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 1. SELECT Policies
-- -------------------------------------------------------------------------

-- Policy: Public/Legacy Access
-- Allows everyone (including anonymous) to view tests that are explicitly public OR have no status (legacy default).
DROP POLICY IF EXISTS "Public tests are viewable by everyone" ON public.tests;
CREATE POLICY "Public tests are viewable by everyone"
ON public.tests FOR SELECT
USING (
  is_public IS TRUE OR is_public IS NULL
);

-- Policy: Creator Access
-- Allows creators to view their own tests, even if they are private (is_public = false).
DROP POLICY IF EXISTS "Creators can view their own tests" ON public.tests;
CREATE POLICY "Creators can view their own tests"
ON public.tests FOR SELECT
USING (
  auth.uid() = created_by
);

-- Policy: Admin Access
-- Allows admins (defined in public.admins) to view all tests.
DROP POLICY IF EXISTS "Admins can view all tests" ON public.tests;
CREATE POLICY "Admins can view all tests"
ON public.tests FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 2. INSERT Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Insert
-- Allows authenticated users to create tests, but enforces that they must list themselves as the creator.
DROP POLICY IF EXISTS "Users can create tests" ON public.tests;
CREATE POLICY "Users can create tests"
ON public.tests FOR INSERT
WITH CHECK (
  auth.uid() = created_by
);

-- -------------------------------------------------------------------------
-- 3. UPDATE Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Update
-- Allows creators to update their own tests.
-- The CHECK clause ensures they cannot transfer ownership to someone else (created_by must remain their uid).
DROP POLICY IF EXISTS "Creators can update their own tests" ON public.tests;
CREATE POLICY "Creators can update their own tests"
ON public.tests FOR UPDATE
USING (
  auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = created_by
);

-- Policy: Admin Update
-- Allows admins to update any test.
DROP POLICY IF EXISTS "Admins can update any test" ON public.tests;
CREATE POLICY "Admins can update any test"
ON public.tests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 4. DELETE Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Delete
-- Allows creators to delete their own tests.
DROP POLICY IF EXISTS "Creators can delete their own tests" ON public.tests;
CREATE POLICY "Creators can delete their own tests"
ON public.tests FOR DELETE
USING (
  auth.uid() = created_by
);

-- Policy: Admin Delete
-- Allows admins to delete any test.
DROP POLICY IF EXISTS "Admins can delete any test" ON public.tests;
CREATE POLICY "Admins can delete any test"
ON public.tests FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);
