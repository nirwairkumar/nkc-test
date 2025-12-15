-- 1. Ensure 'created_by' column exists
-- This links tests to specific users
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Ensure 'revision_notes' column exists (if you haven't added it yet)
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- 3. Row Level Security (RLS) Policies
-- Essential for "Your Tests" feature so users can manage their own data

-- Enable RLS on tests table
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Allow users to view ALL tests (so they can see tests in the public list)
CREATE POLICY "Public tests are viewable by everyone" 
ON tests FOR SELECT 
USING (true);

-- Allow users to INSERT their own tests
CREATE POLICY "Users can create their own tests" 
ON tests FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Allow users to UPDATE their own tests
CREATE POLICY "Users can update their own tests" 
ON tests FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow users to DELETE their own tests
CREATE POLICY "Users can delete their own tests" 
ON tests FOR DELETE 
USING (auth.uid() = created_by);
