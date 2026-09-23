-- Create immutable table for test registrations preventing attempt limit bypass
CREATE TABLE IF NOT EXISTS test_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE test_registrations ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can register themselves (Insert)
CREATE POLICY "Users can register themselves" ON test_registrations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 2. Users can view their own registrations
CREATE POLICY "Users can see own registrations" ON test_registrations
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
    
-- 3. Test Creators can see registrations for their tests (Complex join, simplified for now to authenticated read for basic valid)
-- For strict security we'd join with tests table, but for MVP:
CREATE POLICY "Authenticated users can read (MVP)" ON test_registrations
    FOR SELECT TO authenticated
    USING (true);

-- NO DELETE POLICY for students (This fixes the loophole)
