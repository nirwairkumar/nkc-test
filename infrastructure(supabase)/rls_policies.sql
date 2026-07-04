-- 1. Enable Row Level Security (RLS) on remaining public tables
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for the tests table
DROP POLICY IF EXISTS "Allow public read access to non-private tests" ON public.tests;
CREATE POLICY "Allow public read access to non-private tests" 
ON public.tests 
FOR SELECT 
USING (
  visibility = 'public' 
  OR visibility = 'unlisted' 
  OR visibility = 'link_only' 
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Allow authenticated users to create tests" ON public.tests;
CREATE POLICY "Allow authenticated users to create tests" 
ON public.tests 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Allow users to update their own tests" ON public.tests;
CREATE POLICY "Allow users to update their own tests" 
ON public.tests 
FOR UPDATE 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Allow users to delete their own tests" ON public.tests;
CREATE POLICY "Allow users to delete their own tests" 
ON public.tests 
FOR DELETE 
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Enable all access for admins" ON public.tests;
CREATE POLICY "Enable all access for admins" 
ON public.tests 
FOR ALL 
USING (is_admin());


-- 3. Create policies for the test_results table (this table is unused but needs RLS enabled)
DROP POLICY IF EXISTS "Anyone can insert test results" ON public.test_results;
DROP POLICY IF EXISTS "Anyone can view test results" ON public.test_results;
DROP POLICY IF EXISTS "Users can view their own results" ON public.test_results;
DROP POLICY IF EXISTS "Users can submit test results" ON public.test_results;
DROP POLICY IF EXISTS "Admins can view all results" ON public.test_results;

CREATE POLICY "Admins can view all results" ON public.test_results
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND designation = 'Admin')
);


-- 4. Create policies for the support_messages table
DROP POLICY IF EXISTS "admins_can_delete_support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "admins_can_update_support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "admins_can_view_all_support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "public_can_submit_support_messages" ON public.support_messages;
DROP POLICY IF EXISTS "users_can_view_own_support_messages" ON public.support_messages;

CREATE POLICY "public_can_submit_support_messages" ON public.support_messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "admins_can_view_all_support_messages" ON public.support_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = (auth.jwt() ->> 'email')::text)
);

CREATE POLICY "users_can_view_own_support_messages" ON public.support_messages
FOR SELECT USING (
  user_id IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "admins_can_update_support_messages" ON public.support_messages
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = (auth.jwt() ->> 'email')::text)
);

CREATE POLICY "admins_can_delete_support_messages" ON public.support_messages
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = (auth.jwt() ->> 'email')::text)
);


-- 5. Create policies for the test_votes table
DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON public.test_votes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.test_votes;
DROP POLICY IF EXISTS "Users can view all likes" ON public.test_votes;

CREATE POLICY "Users can view all likes" ON public.test_votes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can toggle likes" ON public.test_votes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" ON public.test_votes
FOR DELETE USING (auth.uid() = user_id);


-- 6. Create policies for the question_reports table
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.question_reports;
DROP POLICY IF EXISTS "Creators can update their own reports" ON public.question_reports;
DROP POLICY IF EXISTS "Creators can view their own reports" ON public.question_reports;

CREATE POLICY "Anyone can insert reports" ON public.question_reports
FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can view their own reports" ON public.question_reports
FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own reports" ON public.question_reports
FOR UPDATE USING (auth.uid() = creator_id);
