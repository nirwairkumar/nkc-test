-- Add bio column to existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Ensure other columns exist (just in case)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify policies (optional, but good to be safe if they are missing)
-- We will assume the existence of the table implies some policies exist, 
-- but we can try to create them with different names or IF NOT EXISTS logic if needed.
-- For now, just adding the column is the critical part.
