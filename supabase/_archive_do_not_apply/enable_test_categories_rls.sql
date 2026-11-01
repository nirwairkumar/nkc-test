-- 1. Add "Realistic" Information Columns
ALTER TABLE public.test_categories
ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS added_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.test_categories.is_primary IS 'Indicates if this is the main category for the test';

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.test_categories ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 3. SELECT Policies
-- -------------------------------------------------------------------------

-- Policy: Public Read Access
-- Categories for tests should be visible to everyone so they can filter/browse tests.
DROP POLICY IF EXISTS "Public can view test categories" ON public.test_categories;
CREATE POLICY "Public can view test categories"
ON public.test_categories FOR SELECT
USING (true);

-- -------------------------------------------------------------------------
-- 4. INSERT Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Insert
-- Allow users to add categories to a test ONLY IF they are the creator of that test.
DROP POLICY IF EXISTS "Creators can add categories to their tests" ON public.test_categories;
CREATE POLICY "Creators can add categories to their tests"
ON public.test_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_categories.test_id
    AND tests.created_by = auth.uid()
  )
);

-- Policy: Admin Insert
-- Admins can add categories to any test.
DROP POLICY IF EXISTS "Admins can add categories" ON public.test_categories;
CREATE POLICY "Admins can add categories"
ON public.test_categories FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 5. UPDATE Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Update
-- Allow creators to update attributes (like is_primary) for their test's categories.
DROP POLICY IF EXISTS "Creators can update their test categories" ON public.test_categories;
CREATE POLICY "Creators can update their test categories"
ON public.test_categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_categories.test_id
    AND tests.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_categories.test_id
    AND tests.created_by = auth.uid()
  )
);

-- Policy: Admin Update
DROP POLICY IF EXISTS "Admins can update test categories" ON public.test_categories;
CREATE POLICY "Admins can update test categories"
ON public.test_categories FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);

-- -------------------------------------------------------------------------
-- 6. DELETE Policies
-- -------------------------------------------------------------------------

-- Policy: Creator Delete
-- Allow creators to remove categories from their tests.
DROP POLICY IF EXISTS "Creators can remove categories from their tests" ON public.test_categories;
CREATE POLICY "Creators can remove categories from their tests"
ON public.test_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_categories.test_id
    AND tests.created_by = auth.uid()
  )
);

-- Policy: Admin Delete
DROP POLICY IF EXISTS "Admins can remove test categories" ON public.test_categories;
CREATE POLICY "Admins can remove test categories"
ON public.test_categories FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email')
);
