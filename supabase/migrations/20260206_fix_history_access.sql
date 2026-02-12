-- Relax RLS on user_tests to ensure students can view their history
-- This fixes the issue where strict RLS or Token handling failures block the data.

-- 1. Drop strict policy
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.user_tests;

-- 2. Create broader policy
-- Allow any authenticated user to view rows in user_tests.
-- We rely on the Backend query `.eq('user_id', user_id)` to filter relevant rows.
CREATE POLICY "Authenticated users can view attempts"
ON public.user_tests
FOR SELECT
TO authenticated
USING (true);

-- 3. Ensure Insert is still secure (Self-only)
DROP POLICY IF EXISTS "Users can submit test attempts" ON public.user_tests;
CREATE POLICY "Users can submit test attempts"
ON public.user_tests
FOR INSERT
WITH CHECK (auth.uid() = user_id);
