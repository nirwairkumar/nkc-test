ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS custom_category TEXT;

-- Optional: Add index if we plan to filter/search by it often, though current search uses client-side filtering or full text search
-- CREATE INDEX IF NOT EXISTS idx_tests_custom_category ON tests(custom_category);
