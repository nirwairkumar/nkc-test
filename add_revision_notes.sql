-- Run this in your Supabase SQL Editor to add the revision_notes column
ALTER TABLE tests 
ADD COLUMN revision_notes TERMS;

-- NOTE: If 'TERMS' is not a valid type (typo in my thought process, it should be TEXT), use:
ALTER TABLE tests
ADD COLUMN revision_notes TEXT;
