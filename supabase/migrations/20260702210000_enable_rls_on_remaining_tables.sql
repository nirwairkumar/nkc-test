-- Enable Row Level Security (RLS) on remaining public tables to prevent anonymous client modifications
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public.tests table
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
