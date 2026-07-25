-- ============================================================
-- STEP 1: VERIFY CURRENT RLS STATUS
-- Run this FIRST to see which tables have RLS on
-- ============================================================
SELECT
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tests','profiles','visitors','categories','feedback',
    'test_votes','anon_test_attempts','test_results',
    'support_messages','notifications','question_reports'
  )
ORDER BY tablename;
