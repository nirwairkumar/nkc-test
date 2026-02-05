-- NUCLEAR FIX for support_messages RLS
-- This completely resets all policies and creates a clean, working setup

BEGIN;

-- Step 1: Drop ALL existing policies dynamically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'support_messages'
    ) 
    LOOP
        RAISE NOTICE 'Dropping policy: %', r.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_messages', r.policyname);
    END LOOP;
END $$;

-- Step 2: Ensure the table has the necessary columns
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE and PERMISSIVE INSERT policy
-- This allows ANYONE (authenticated or not) to submit support messages
CREATE POLICY "public_can_submit_support_messages"
ON public.support_messages FOR INSERT
WITH CHECK (true);

-- Step 5: Create SELECT policies
-- Admins can view all support messages
CREATE POLICY "admins_can_view_all_support_messages"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = (auth.jwt() ->> 'email')::text
  )
);

-- Authenticated users can view their own support messages (if user_id is set)
CREATE POLICY "users_can_view_own_support_messages"
ON public.support_messages FOR SELECT
USING (
  user_id IS NOT NULL AND auth.uid() = user_id
);

-- Step 6: Create UPDATE policy (admin only)
CREATE POLICY "admins_can_update_support_messages"
ON public.support_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = (auth.jwt() ->> 'email')::text
  )
);

-- Step 7: Create DELETE policy (admin only)
CREATE POLICY "admins_can_delete_support_messages"
ON public.support_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = (auth.jwt() ->> 'email')::text
  )
);

COMMIT;

-- Verification query (run this separately to check policies)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'support_messages';
