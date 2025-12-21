-- Add Institution Branding columns to the tests table
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS institution_logo TEXT;
