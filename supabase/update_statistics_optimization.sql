-- =====================================================================
-- Migration: Sync Statistics Triggers and Performance Optimization
-- Author: Antigravity
-- Date: 2026-06-10
-- Purpose: 
--   1. Automatically maintain total_questions, total_max_marks, and sections_metadata
--      on the 'tests' table to eliminate expensive JSON parsing during fetch.
--   2. Automatically maintain violation_count and questions_attempted on the 
--      'user_tests' table to allow fetching counts without loading answers/violation logs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper Function: strip_questions_from_sections
--    Strips nested 'questions' array from the sections JSONB array and adds 'total_questions'.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION strip_questions_from_sections(sections_json JSONB)
RETURNS JSONB AS $$
DECLARE
  sec jsonb;
  cleaned jsonb[] := ARRAY[]::jsonb[];
  q_count integer;
  q_rec jsonb;
  q_marks numeric[];
  m_val numeric;
  def_marks numeric;
  max_attempts integer;
  attempt_control jsonb;
  sec_max numeric;
BEGIN
  IF sections_json IS NULL OR jsonb_typeof(sections_json) <> 'array' THEN
    RETURN '[]'::jsonb;
  END IF;
  
  FOR sec IN SELECT * FROM jsonb_array_elements(sections_json) LOOP
    q_count := 0;
    q_marks := ARRAY[]::numeric[];
    def_marks := COALESCE((sec->>'marks_per_question')::numeric, 4.0);
    
    IF (sec->'questions' IS NOT NULL) AND (jsonb_typeof(sec->'questions') = 'array') THEN
      q_count := jsonb_array_length(sec->'questions');
      FOR q_rec IN SELECT * FROM jsonb_array_elements(sec->'questions') LOOP
        IF q_rec->>'marks' IS NOT NULL THEN
          BEGIN
            m_val := (q_rec->>'marks')::numeric;
          EXCEPTION WHEN OTHERS THEN
            m_val := def_marks;
          END;
        ELSE
          m_val := def_marks;
        END IF;
        q_marks := array_append(q_marks, m_val);
      END LOOP;
    END IF;
    
    -- Calculate section max marks considering attempt control
    attempt_control := sec->'attempt_control';
    IF (attempt_control IS NOT NULL) AND (attempt_control->>'enabled' IS DISTINCT FROM 'false') THEN
      max_attempts := COALESCE((attempt_control->>'max_attempts')::integer, 0);
      IF max_attempts > 0 AND array_length(q_marks, 1) > max_attempts THEN
        SELECT array_agg(val ORDER BY val DESC) INTO q_marks FROM unnest(q_marks) AS val;
        q_marks := q_marks[1:max_attempts];
      END IF;
    END IF;
    
    sec_max := 0;
    IF array_length(q_marks, 1) > 0 THEN
      SELECT COALESCE(sum(val), 0) INTO sec_max FROM unnest(q_marks) AS val;
    END IF;

    -- Add total_questions and max_marks to the section metadata, and remove questions array
    sec := jsonb_set(sec, '{total_questions}', to_jsonb(q_count));
    sec := jsonb_set(sec, '{max_marks}', to_jsonb(sec_max)) - 'questions';
    cleaned := array_append(cleaned, sec);
  END LOOP;
  
  RETURN to_jsonb(cleaned);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------
-- 2. Helper Function: calculate_test_max_marks_sql
--    Calculates total max marks for a test from database-level JSON data.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_test_max_marks_sql(
  enable_section_mode boolean,
  sections_json JSONB,
  questions_json JSONB
)
RETURNS numeric AS $$
DECLARE
  sec jsonb;
  q_rec jsonb;
  q_marks numeric[];
  m_val numeric;
  def_marks numeric;
  max_attempts integer;
  attempt_control jsonb;
  sec_max numeric;
  total_marks numeric := 0;
BEGIN
  IF (enable_section_mode IS TRUE) AND (sections_json IS NOT NULL) AND (jsonb_typeof(sections_json) = 'array') THEN
    FOR sec IN SELECT * FROM jsonb_array_elements(sections_json) LOOP
      q_marks := ARRAY[]::numeric[];
      def_marks := COALESCE((sec->>'marks_per_question')::numeric, 4.0);
      
      IF (sec->'questions' IS NOT NULL) AND (jsonb_typeof(sec->'questions') = 'array') THEN
        FOR q_rec IN SELECT * FROM jsonb_array_elements(sec->'questions') LOOP
          IF q_rec->>'marks' IS NOT NULL THEN
            BEGIN
              m_val := (q_rec->>'marks')::numeric;
            EXCEPTION WHEN OTHERS THEN
              m_val := def_marks;
            END;
          ELSE
            m_val := def_marks;
          END IF;
          q_marks := array_append(q_marks, m_val);
        END LOOP;
      END IF;
      
      attempt_control := sec->'attempt_control';
      IF (attempt_control IS NOT NULL) AND (attempt_control->>'enabled' IS DISTINCT FROM 'false') THEN
        max_attempts := COALESCE((attempt_control->>'max_attempts')::integer, 0);
        IF max_attempts > 0 AND array_length(q_marks, 1) > max_attempts THEN
          SELECT array_agg(val ORDER BY val DESC) INTO q_marks FROM unnest(q_marks) AS val;
          q_marks := q_marks[1:max_attempts];
        END IF;
      END IF;
      
      sec_max := 0;
      IF array_length(q_marks, 1) > 0 THEN
        SELECT COALESCE(sum(val), 0) INTO sec_max FROM unnest(q_marks) AS val;
      END IF;
      total_marks := total_marks + sec_max;
    END LOOP;
  ELSE
    -- Flat mode
    def_marks := 4.0;
    IF (questions_json IS NOT NULL) AND (jsonb_typeof(questions_json) = 'array') THEN
      FOR q_rec IN SELECT * FROM jsonb_array_elements(questions_json) LOOP
        IF q_rec->>'marks' IS NOT NULL THEN
          BEGIN
            m_val := (q_rec->>'marks')::numeric;
          EXCEPTION WHEN OTHERS THEN
            m_val := def_marks;
          END;
        ELSE
          m_val := def_marks;
        END IF;
        total_marks := total_marks + m_val;
      END LOOP;
    END IF;
  END IF;
  
  RETURN total_marks;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------
-- 3. Helper Function: count_test_questions_sql
--    Counts total number of questions for a test from database-level JSON.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION count_test_questions_sql(
  enable_section_mode boolean,
  sections_json JSONB,
  questions_json JSONB
)
RETURNS integer AS $$
DECLARE
  sec jsonb;
  total_qs integer := 0;
BEGIN
  IF (enable_section_mode IS TRUE) AND (sections_json IS NOT NULL) AND (jsonb_typeof(sections_json) = 'array') THEN
    FOR sec IN SELECT * FROM jsonb_array_elements(sections_json) LOOP
      IF (sec->'questions' IS NOT NULL) AND (jsonb_typeof(sec->'questions') = 'array') THEN
        total_qs := total_qs + jsonb_array_length(sec->'questions');
      END IF;
    END LOOP;
  ELSE
    IF (questions_json IS NOT NULL) AND (jsonb_typeof(questions_json) = 'array') THEN
      total_qs := jsonb_array_length(questions_json);
    END IF;
  END IF;
  
  RETURN total_qs;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------
-- 4. Schema Update: Add sections_metadata to tests table
-- ---------------------------------------------------------------------
ALTER TABLE tests ADD COLUMN IF NOT EXISTS sections_metadata JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------
-- 5. Trigger Function for tests Table
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_test_statistics()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_questions := count_test_questions_sql(NEW.enable_section_mode, NEW.sections, NEW.questions);
  NEW.total_max_marks := calculate_test_max_marks_sql(NEW.enable_section_mode, NEW.sections, NEW.questions);
  NEW.sections_metadata := strip_questions_from_sections(NEW.sections);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tests_sync_stats ON tests;
CREATE TRIGGER trg_tests_sync_stats
BEFORE INSERT OR UPDATE OF sections, questions, enable_section_mode
ON tests
FOR EACH ROW
EXECUTE FUNCTION trg_sync_test_statistics();

-- ---------------------------------------------------------------------
-- 6. Schema Update: Add violation_count & questions_attempted to user_tests table
-- ---------------------------------------------------------------------
ALTER TABLE user_tests ADD COLUMN IF NOT EXISTS violation_count integer DEFAULT 0;
ALTER TABLE user_tests ADD COLUMN IF NOT EXISTS questions_attempted integer DEFAULT 0;

-- ---------------------------------------------------------------------
-- 7. Trigger Function for user_tests Table
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_user_test_statistics()
RETURNS TRIGGER AS $$
DECLARE
  ans_count integer := 0;
  v_count integer := 0;
  key text;
  val jsonb;
BEGIN
  -- Count attempted answers (keys that are not null, empty lists, empty strings, etc.)
  IF (NEW.answers IS NOT NULL) AND (jsonb_typeof(NEW.answers) = 'object') THEN
    FOR key, val IN SELECT * FROM jsonb_each(NEW.answers) LOOP
      IF val IS NOT NULL AND val::text <> 'null' AND val::text <> '""' AND val::text <> '[]' AND val::text <> '{}' THEN
        ans_count := ans_count + 1;
      END IF;
    END LOOP;
  END IF;
  
  -- Count violations
  IF (NEW.violation_log IS NOT NULL) AND (jsonb_typeof(NEW.violation_log) = 'array') THEN
    v_count := jsonb_array_length(NEW.violation_log);
  END IF;
  
  NEW.questions_attempted := ans_count;
  NEW.violation_count := v_count;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_tests_sync_stats ON user_tests;
CREATE TRIGGER trg_user_tests_sync_stats
BEFORE INSERT OR UPDATE OF answers, violation_log
ON user_tests
FOR EACH ROW
EXECUTE FUNCTION trg_sync_user_test_statistics();

-- ---------------------------------------------------------------------
-- 8. Data Initialization: Run updates on existing records
-- ---------------------------------------------------------------------
-- Initialize tests stats
UPDATE tests SET 
  total_questions = count_test_questions_sql(enable_section_mode, sections, questions),
  total_max_marks = calculate_test_max_marks_sql(enable_section_mode, sections, questions),
  sections_metadata = strip_questions_from_sections(sections);

-- Initialize user_tests stats
-- Forcing the update triggers to execute by COALESCE-reassigning columns
UPDATE user_tests SET
  violation_log = COALESCE(violation_log, '[]'::jsonb),
  answers = COALESCE(answers, '{}'::jsonb);
