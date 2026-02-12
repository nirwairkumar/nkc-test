-- Complete Migration for User Tests (History)

-- 1. Create user_tests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.user_tests ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- User View Own
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.user_tests;
CREATE POLICY "Users can view their own attempts" ON public.user_tests FOR SELECT USING (auth.uid() = user_id);

-- User Insert Own
DROP POLICY IF EXISTS "Users can submit test attempts" ON public.user_tests;
CREATE POLICY "Users can submit test attempts" ON public.user_tests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Delete Own
DROP POLICY IF EXISTS "Users can delete their own attempts" ON public.user_tests;
CREATE POLICY "Users can delete their own attempts" ON public.user_tests FOR DELETE USING (auth.uid() = user_id);

-- Creator View Attempts on their tests
DROP POLICY IF EXISTS "Creators can view attempts for their tests" ON public.user_tests;
CREATE POLICY "Creators can view attempts for their tests" ON public.user_tests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tests WHERE tests.id = user_tests.test_id AND tests.created_by = auth.uid())
);

-- Admin View All
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.user_tests;
CREATE POLICY "Admins can view all attempts" ON public.user_tests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND designation = 'Admin')
);
