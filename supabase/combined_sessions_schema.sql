-- ============================================================
-- Combined Sessions Schema (JEE Advanced-style Paper 1 + 2)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create combined_sessions table
CREATE TABLE IF NOT EXISTS combined_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  test1_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  test2_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  paper1_label TEXT NOT NULL DEFAULT 'Paper I',
  paper2_label TEXT NOT NULL DEFAULT 'Paper II',
  break_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create combined_attempts table
CREATE TABLE IF NOT EXISTS combined_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  combined_session_id UUID REFERENCES combined_sessions(id) ON DELETE CASCADE,
  -- Store full paper data as JSONB to avoid FK dependency issues
  paper1_data JSONB NOT NULL DEFAULT '{}',  -- { test_id, answers, score, total_marks, test_title }
  paper2_data JSONB NOT NULL DEFAULT '{}',  -- { test_id, answers, score, total_marks, test_title }
  total_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE combined_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE combined_attempts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for combined_sessions
-- Anyone can read public sessions
CREATE POLICY "Public combined sessions are viewable by everyone"
  ON combined_sessions FOR SELECT
  USING (is_public = true);

-- Creators can read their own sessions
CREATE POLICY "Creators can view their own sessions"
  ON combined_sessions FOR SELECT
  USING (auth.uid() = created_by);

-- Creators can insert sessions
CREATE POLICY "Creators can create combined sessions"
  ON combined_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Creators can update their own sessions
CREATE POLICY "Creators can update their own sessions"
  ON combined_sessions FOR UPDATE
  USING (auth.uid() = created_by);

-- Creators can delete their own sessions
CREATE POLICY "Creators can delete their own sessions"
  ON combined_sessions FOR DELETE
  USING (auth.uid() = created_by);

-- 5. RLS Policies for combined_attempts
-- Users can view their own attempts
CREATE POLICY "Users can view their own combined attempts"
  ON combined_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can create their own combined attempts"
  ON combined_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own attempts
CREATE POLICY "Users can delete their own combined attempts"
  ON combined_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_combined_sessions_created_by ON combined_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_combined_sessions_public ON combined_sessions(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_combined_attempts_user_id ON combined_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_combined_attempts_session_id ON combined_attempts(combined_session_id);

-- 7. auto-update updated_at
CREATE OR REPLACE FUNCTION update_combined_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_combined_sessions_updated_at
  BEFORE UPDATE ON combined_sessions
  FOR EACH ROW EXECUTE FUNCTION update_combined_sessions_updated_at();
