-- Add new columns to the 'tests' table
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS marks_per_question numeric DEFAULT 4,
ADD COLUMN IF NOT EXISTS negative_marks numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration integer;

-- Optional: Update existing rows if needed (defaults handle this for new rows, but existing might be null if not careful, 
-- though adding column with default usually backfills or makes it default on read if not nullable. 
-- For nullable columns, it stays null unless updated. Let's make them nullable but with default provided for future inserts).
-- Reviewing types.ts, they seemed nullable in the interface `test.marks_per_question || marksPerQuestion`.
-- So keeping them nullable is safer for existing data.

COMMENT ON COLUMN tests.marks_per_question IS 'Marks awarded for a correct answer';
COMMENT ON COLUMN tests.negative_marks IS 'Marks deducted for a wrong answer';
COMMENT ON COLUMN tests.duration IS 'Duration of the test in minutes';
