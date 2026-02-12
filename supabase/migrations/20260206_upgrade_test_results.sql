-- Upgrade test_results table to support Application History

-- 1. Add missing columns with Foreign Keys
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- User View Own
DROP POLICY IF EXISTS "Users can view their own results" ON public.test_results;
CREATE POLICY "Users can view their own results" ON public.test_results FOR SELECT USING (auth.uid() = user_id);

-- User Insert Own
DROP POLICY IF EXISTS "Users can submit test results" ON public.test_results;
CREATE POLICY "Users can submit test results" ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin View All
DROP POLICY IF EXISTS "Admins can view all results" ON public.test_results;
CREATE POLICY "Admins can view all results" ON public.test_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND designation = 'Admin')
);
