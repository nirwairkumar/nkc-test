-- Enable Row Level Security (RLS) on the user_tests table
ALTER TABLE public.user_tests ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 1. SELECT Policies
-- -------------------------------------------------------------------------

-- Policy: User Access
-- Users can view their own test attempts.
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.user_tests;
CREATE POLICY "Users can view their own attempts"
ON public.user_tests FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy: Test Creator Access
-- Test creators can view all attempts made on their tests (e.g., for analytics or checking results).
DROP POLICY IF EXISTS "Creators can view attempts for their tests" ON public.user_tests;
CREATE POLICY "Creators can view attempts for their tests"
ON public.user_tests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = user_tests.test_id
    AND tests.created_by = auth.uid()
  )
);

-- Policy: Admin Access
-- Admins can view all test attempts.
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.user_tests;
CREATE POLICY "Admins can view all attempts"
ON public.user_tests FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 2. INSERT Policies
-- -------------------------------------------------------------------------

-- Policy: User Insert
-- Users can insert their own test attempts.
-- Typically, the user_id in the row must match their auth.uid().
DROP POLICY IF EXISTS "Users can submit test attempts" ON public.user_tests;
CREATE POLICY "Users can submit test attempts"
ON public.user_tests FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- -------------------------------------------------------------------------
-- 3. UPDATE Policies
-- -------------------------------------------------------------------------

-- Policy: User Update
-- Users can update their own attempts (e.g. if saving partial progress is implemented later, or correcting metadata).
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.user_tests;
CREATE POLICY "Users can update their own attempts"
ON public.user_tests FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Admin Update
-- Admins can update any attempt (e.g. correcting a score manually).
DROP POLICY IF EXISTS "Admins can update any attempt" ON public.user_tests;
CREATE POLICY "Admins can update any attempt"
ON public.user_tests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 4. DELETE Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Delete
-- Allow test creators to delete attempts on their tests (e.g., reseting a user's attempt).
DROP POLICY IF EXISTS "Creators can delete attempts on their tests" ON public.user_tests;
CREATE POLICY "Creators can delete attempts on their tests"
ON public.user_tests FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = user_tests.test_id
    AND tests.created_by = auth.uid()
  )
);

-- Policy: Admin Delete
-- Admins can delete any attempt.
DROP POLICY IF EXISTS "Admins can delete any attempt" ON public.user_tests;
CREATE POLICY "Admins can delete any attempt"
ON public.user_tests FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- Policy: User Delete (Self)
-- Optional: Allow users to delete their own attempts if you want them to be able to "reset" themselves.
-- Usually, this is controlled by the app (via API) rather than direct RLS, but adding it for completeness if the app supports it.
-- If the app doesn't support user-initiated deletions, this is harmless as no UI will trigger it, but safe to include for "My Data" rights.
DROP POLICY IF EXISTS "Users can delete their own attempts" ON public.user_tests;
CREATE POLICY "Users can delete their own attempts"
ON public.user_tests FOR DELETE
USING (
  auth.uid() = user_id
);
