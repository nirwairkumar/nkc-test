-- FIX FOR: "new row violates row-level security policy for table tests"

-- 1. Enable RLS (just in case)
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.tests;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.tests;
DROP POLICY IF EXISTS "Public tests are viewable by everyone" ON public.tests;

-- 3. Create a PERMISSIVE policy for Inserts (Allows both Anon and Logged-in users)
CREATE POLICY "Allow all inserts" 
ON public.tests 
FOR INSERT 
WITH CHECK (true);

-- 4. Ensure Select is allowed for everyone
CREATE POLICY "Allow all selects" 
ON public.tests 
FOR SELECT 
USING (true);

-- 5. (Optional) Fix user_tests if needed
CREATE POLICY "Allow all inserts for user_tests" 
ON public.user_tests
FOR INSERT 
WITH CHECK (true);
