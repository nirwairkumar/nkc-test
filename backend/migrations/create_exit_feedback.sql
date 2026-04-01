-- Create exit_feedback table
CREATE TABLE IF NOT EXISTS public.exit_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    experience TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.exit_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Allow anonymous inserts" ON public.exit_feedback
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow admins to view all feedback
CREATE POLICY "Allow admins to view feedback" ON public.exit_feedback
FOR SELECT TO authenticated
USING (public.is_admin());
