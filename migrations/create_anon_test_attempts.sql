-- Migration: Create separate table for tracking anonymous test attempts
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS anon_test_attempts (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token   text NOT NULL,       -- Unique browser session identifier
    test_id         uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'submitted' | 'abandoned'
    answers         jsonb,               -- Stored on submit
    score           float,
    completion_pct  float DEFAULT 0,
    abandoned_reason text,
    started_at      timestamptz NOT NULL DEFAULT now(),
    submitted_at    timestamptz,
    last_active_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_anon_test_attempts_token_test
    ON anon_test_attempts (session_token, test_id);

CREATE INDEX IF NOT EXISTS idx_anon_test_attempts_test_id
    ON anon_test_attempts (test_id);

CREATE INDEX IF NOT EXISTS idx_anon_test_attempts_status
    ON anon_test_attempts (status);

CREATE INDEX IF NOT EXISTS idx_anon_test_attempts_started_at
    ON anon_test_attempts (started_at);

-- Row Level Security: Backend (service role) manages all reads/writes
ALTER TABLE anon_test_attempts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service role key)
CREATE POLICY "Service role full access" ON anon_test_attempts
    USING (true)
    WITH CHECK (true);
