-- TRUE NUCLEAR FIX
-- Uses dynamic SQL to find and DROP ALL policies on the 'tests' table.
-- This guarantees a clean slate, removing any hidden or strangely named policies.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all policies for the 'tests' table in the 'public' schema
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tests'
    ) 
    LOOP
        -- Drop each policy found
        RAISE NOTICE 'Dropping policy: %', r.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tests', r.policyname);
    END LOOP;
END $$;

-- Verify Clean Slate (Should appear in output if running interactively, or just proceed)
-- Now re-apply ONLY the essential Strict Policies.

-- 1. Creator Access (Essential)
CREATE POLICY "Creators can view their own tests"
ON public.tests FOR SELECT
USING ( auth.uid() = created_by );

CREATE POLICY "Creators can update their own tests"
ON public.tests FOR UPDATE
USING ( auth.uid() = created_by );

CREATE POLICY "Creators can delete their own tests"
ON public.tests FOR DELETE
USING ( auth.uid() = created_by );

CREATE POLICY "Authenticated users can create tests"
ON public.tests FOR INSERT
WITH CHECK ( auth.uid() = created_by );

-- 2. STRICT Public/Unlisted Access
-- This requires the 'visibility' column to be strictly 'public' or 'unlisted'.
-- 'private' is implicitly excluded.
CREATE POLICY "Strict Public Access"
ON public.tests FOR SELECT
USING (
  visibility = 'public'::test_visibility
  OR visibility = 'unlisted'::test_visibility
);

-- 3. Ensure RLS is enabled
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
