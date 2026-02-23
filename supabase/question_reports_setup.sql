-- Create the question_reports table
CREATE TABLE IF NOT EXISTS public.question_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nullable for anonymous
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'solved'))
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Policies for question_reports

-- 1. Anyone can create a report (including anonymous users, handled by Anon Key or anon role)
CREATE POLICY "Anyone can insert reports" 
    ON public.question_reports
    FOR INSERT 
    WITH CHECK (true);

-- 2. Creators can view reports for their own tests
CREATE POLICY "Creators can view their own reports" 
    ON public.question_reports
    FOR SELECT 
    USING (auth.uid() = creator_id);

-- 3. Creators can update (resolve) their own reports
CREATE POLICY "Creators can update their own reports" 
    ON public.question_reports
    FOR UPDATE 
    USING (auth.uid() = creator_id);

-- Note: Admin access (service role key) automatically bypasses RLS, so no explicit admin policy is needed if using service role.
-- If admins access via web UI with normal JWT, you might need an admin policy, e.g.:
-- CREATE POLICY "Admins can view all reports" ON public.question_reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Create an index to speed up creator dashboard queries
CREATE INDEX IF NOT EXISTS idx_question_reports_creator_id ON public.question_reports(creator_id);
-- Create an index to speed up fetching reports for a specific test
CREATE INDEX IF NOT EXISTS idx_question_reports_test_id ON public.question_reports(test_id);
