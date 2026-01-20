-- 1. Enhance Schema for "Perfect" Management
-- Add 'status' to track ticket progress
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add 'user_id' so we can link connected users to their tickets (optional but recommended)
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add 'resolved_at' and 'resolved_by' for audit
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- 2. Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 3. INSERT Policies
-- -------------------------------------------------------------------------

-- Policy: Safe Submission
-- Allows anyone to submit a ticket.
-- IF they provide a user_id, it must match their own (prevents spoofing other users).
-- IF they are anonymous, user_id should be NULL.
DROP POLICY IF EXISTS "Everyone can create support tickets" ON public.support_messages;
CREATE POLICY "Everyone can create support tickets"
ON public.support_messages FOR INSERT
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR
  (auth.uid() = user_id) OR
  (user_id IS NULL) -- Allow logged-in users to submit anonymous tickets if they want
);

-- -------------------------------------------------------------------------
-- 4. SELECT Policies
-- -------------------------------------------------------------------------

-- Policy: Admin View
-- Admins can see ALL support messages.
DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
CREATE POLICY "Admins can view all support messages"
ON public.support_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- Policy: User View (Own Tickets)
-- If a ticket is linked to a user, they can track it.
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_messages;
CREATE POLICY "Users can view their own tickets"
ON public.support_messages FOR SELECT
USING (
  auth.uid() = user_id
);

-- -------------------------------------------------------------------------
-- 5. UPDATE Policies
-- -------------------------------------------------------------------------

-- Policy: Admin Manage
-- Admins can update status, resolution comments, etc.
DROP POLICY IF EXISTS "Admins can update support messages" ON public.support_messages;
CREATE POLICY "Admins can update support messages"
ON public.support_messages FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 6. DELETE Policies
-- -------------------------------------------------------------------------

-- Policy: Admin Delete
DROP POLICY IF EXISTS "Admins can delete support messages" ON public.support_messages;
CREATE POLICY "Admins can delete support messages"
ON public.support_messages FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);
