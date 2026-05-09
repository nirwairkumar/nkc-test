-- Migration: add_clone_columns_to_tests
-- Run this in your Supabase SQL editor or via psql

ALTER TABLE tests
  ADD COLUMN IF NOT EXISTS is_cloned      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cloned_from_id UUID    REFERENCES tests(id) ON DELETE SET NULL;

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tests_is_cloned    ON tests(is_cloned)       WHERE is_cloned = TRUE;
CREATE INDEX IF NOT EXISTS idx_tests_cloned_from  ON tests(cloned_from_id)  WHERE cloned_from_id IS NOT NULL;
