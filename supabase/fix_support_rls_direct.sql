-- Quick fix script to run directly in Supabase SQL Editor
-- This will fix the support_messages RLS issue immediately

-- Step 1: Drop ALL existing policies
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

-- Step 2: Ensure columns exist
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- Step 3: Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE INSERT policy (allows anyone to submit)
CREATE POLICY "public_can_submit_support_messages"
ON public.support_messages FOR INSERT
WITH CHECK (true);

-- Step 5: Admin view policy
CREATE POLICY "admins_can_view_all_support_messages"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = (auth.jwt() ->> 'email')::text
  )
);

-- Step 6: Users can view their own messages
CREATE POLICY "users_can_view_own_support_messages"
ON public.support_messages FOR SELECT
USING (
  user_id IS NOT NULL AND auth.uid() = user_id
);

-- Step 7: Admin update policy
CREATE POLICY "admins_can_update_support_messages"
ON public.support_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = (auth.jwt() ->> 'email')::text
  )
);

-- Step 8: Admin delete policy
CREATE POLICY "admins_can_delete_support_messages"
ON public.support_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = (auth.jwt() ->> 'email')::text
  )
);
