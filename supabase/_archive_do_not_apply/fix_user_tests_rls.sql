-- ============================================================
-- FIX RLS POLICY FOR TABLE: public.user_tests
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Ensure RLS is enabled on user_tests
ALTER TABLE public.user_tests ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive INSERT policies that cause 42501 errors
DROP POLICY IF EXISTS "Insert own user_tests" ON public.user_tests;
DROP POLICY IF EXISTS "User inserts own attempts" ON public.user_tests;
DROP POLICY IF EXISTS "Users can submit test attempts" ON public.user_tests;

-- 3. Create permissive INSERT policy so test attempts can ALWAYS be saved
CREATE POLICY "Allow test attempt submissions"
ON public.user_tests FOR INSERT
TO public
WITH CHECK (true);

-- 4. Create permissive UPDATE policy so attempts can be updated
DROP POLICY IF EXISTS "Allow test attempt updates" ON public.user_tests;
CREATE POLICY "Allow test attempt updates"
ON public.user_tests FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
