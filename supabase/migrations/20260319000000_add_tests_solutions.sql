-- Add solutions column to tests table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS solutions JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tests.solutions IS 
  'JSONB map of question_id -> solution_text. Supports LaTeX/KaTeX/mhchem markdown.';
