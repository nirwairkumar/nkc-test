-- Fix Missing Relationship between user_tests and tests
-- This is required for the API to fetch Test Titles along with results.

-- 1. Add Foreign Key Constraint
-- We use "DO NOTHING" on delete to preserve history even if a test is deleted (optional, but safe)
-- Or we implies standard referential integrity.
ALTER TABLE public.user_tests
ADD CONSTRAINT fk_user_tests_tests
FOREIGN KEY (test_id)
REFERENCES public.tests(id);

-- 2. Explicitly comment for PostgREST detection (auto-detected usually, but good practice)
COMMENT ON CONSTRAINT fk_user_tests_tests ON public.user_tests IS 'Links attempt to the test definition.';
