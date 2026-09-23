-- ============================================================
-- STEP 2: NUCLEAR RLS LOCKDOWN
-- Run this in Supabase SQL Editor AFTER running step1 to check status
-- This uses ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- AND separately sets FORCE ROW LEVEL SECURITY
-- which applies even to the table owner role
-- ============================================================

-- TESTS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests FORCE ROW LEVEL SECURITY;

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- VISITORS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors FORCE ROW LEVEL SECURITY;

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

-- FEEDBACK
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;

-- TEST_VOTES
ALTER TABLE public.test_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_votes FORCE ROW LEVEL SECURITY;

-- ANON_TEST_ATTEMPTS
ALTER TABLE public.anon_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_test_attempts FORCE ROW LEVEL SECURITY;

-- TEST_RESULTS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results FORCE ROW LEVEL SECURITY;

-- SUPPORT_MESSAGES
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages FORCE ROW LEVEL SECURITY;

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- QUESTION_REPORTS
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports FORCE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES — DROP ALL EXISTING FIRST, THEN RECREATE
-- (Prevents "already exists" errors)
-- ============================================================

-- ---- TESTS ----
DROP POLICY IF EXISTS "Allow public read access to non-private tests" ON public.tests;
DROP POLICY IF EXISTS "Allow authenticated users to create tests" ON public.tests;
DROP POLICY IF EXISTS "Allow users to update their own tests" ON public.tests;
DROP POLICY IF EXISTS "Allow users to delete their own tests" ON public.tests;
DROP POLICY IF EXISTS "tests_select_policy" ON public.tests;
DROP POLICY IF EXISTS "tests_insert_policy" ON public.tests;
DROP POLICY IF EXISTS "tests_update_policy" ON public.tests;
DROP POLICY IF EXISTS "tests_delete_policy" ON public.tests;

CREATE POLICY "tests_select_policy" ON public.tests
  FOR SELECT USING (
    visibility IN ('public', 'unlisted', 'link_only')
    OR created_by = auth.uid()
  );
CREATE POLICY "tests_insert_policy" ON public.tests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "tests_update_policy" ON public.tests
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "tests_delete_policy" ON public.tests
  FOR DELETE USING (created_by = auth.uid());

-- ---- PROFILES ----
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read of limited profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Block anon profile deletes" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ---- VISITORS ----
DROP POLICY IF EXISTS "Anyone can log visits" ON public.visitors;
DROP POLICY IF EXISTS "visitors_insert_policy" ON public.visitors;

CREATE POLICY "visitors_insert_policy" ON public.visitors
  FOR INSERT WITH CHECK (true);
-- No SELECT or DELETE policy = blocked for anon

-- ---- CATEGORIES ----
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;

CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT USING (true);
-- Insert/Update/Delete only via service role (backend)

-- ---- FEEDBACK ----
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Auth users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Block anon feedback delete" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert_policy" ON public.feedback;
DROP POLICY IF EXISTS "feedback_select_policy" ON public.feedback;
DROP POLICY IF EXISTS "feedback_delete_policy" ON public.feedback;

CREATE POLICY "feedback_insert_policy" ON public.feedback
  FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_select_policy" ON public.feedback
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "feedback_delete_policy" ON public.feedback
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---- TEST_VOTES ----
DROP POLICY IF EXISTS "Anyone can view votes" ON public.test_votes;
DROP POLICY IF EXISTS "Auth users can vote" ON public.test_votes;
DROP POLICY IF EXISTS "Users can remove own votes" ON public.test_votes;
DROP POLICY IF EXISTS "test_votes_select_policy" ON public.test_votes;
DROP POLICY IF EXISTS "test_votes_insert_policy" ON public.test_votes;
DROP POLICY IF EXISTS "test_votes_delete_policy" ON public.test_votes;

CREATE POLICY "test_votes_select_policy" ON public.test_votes
  FOR SELECT USING (true);
CREATE POLICY "test_votes_insert_policy" ON public.test_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "test_votes_delete_policy" ON public.test_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ---- ANON_TEST_ATTEMPTS ----
DROP POLICY IF EXISTS "Anyone can insert anon attempts" ON public.anon_test_attempts;
DROP POLICY IF EXISTS "Anyone can update anon attempts" ON public.anon_test_attempts;
DROP POLICY IF EXISTS "Anyone can view anon attempts" ON public.anon_test_attempts;
DROP POLICY IF EXISTS "anon_attempts_insert_policy" ON public.anon_test_attempts;
DROP POLICY IF EXISTS "anon_attempts_update_policy" ON public.anon_test_attempts;

CREATE POLICY "anon_attempts_insert_policy" ON public.anon_test_attempts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_attempts_update_policy" ON public.anon_test_attempts
  FOR UPDATE USING (true);
-- No SELECT/DELETE for anon users

-- ---- TEST_RESULTS ----
DROP POLICY IF EXISTS "Users can view own results" ON public.test_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.test_results;
DROP POLICY IF EXISTS "Block anon test_results delete" ON public.test_results;
DROP POLICY IF EXISTS "test_results_select_policy" ON public.test_results;
DROP POLICY IF EXISTS "test_results_insert_policy" ON public.test_results;
DROP POLICY IF EXISTS "test_results_delete_policy" ON public.test_results;

CREATE POLICY "test_results_select_policy" ON public.test_results
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "test_results_insert_policy" ON public.test_results
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "test_results_delete_policy" ON public.test_results
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---- SUPPORT_MESSAGES ----
DROP POLICY IF EXISTS "Anyone can submit support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.support_messages;
DROP POLICY IF EXISTS "Block anon support delete" ON public.support_messages;
DROP POLICY IF EXISTS "support_insert_policy" ON public.support_messages;
DROP POLICY IF EXISTS "support_select_policy" ON public.support_messages;
DROP POLICY IF EXISTS "support_delete_policy" ON public.support_messages;

CREATE POLICY "support_insert_policy" ON public.support_messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "support_select_policy" ON public.support_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "support_delete_policy" ON public.support_messages
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---- NOTIFICATIONS ----
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Block anon notification delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ---- QUESTION_REPORTS ----
DROP POLICY IF EXISTS "Anyone can submit reports" ON public.question_reports;
DROP POLICY IF EXISTS "Auth users can view reports" ON public.question_reports;
DROP POLICY IF EXISTS "Block anon report delete" ON public.question_reports;
DROP POLICY IF EXISTS "reports_insert_policy" ON public.question_reports;
DROP POLICY IF EXISTS "reports_select_policy" ON public.question_reports;
DROP POLICY IF EXISTS "reports_delete_policy" ON public.question_reports;

CREATE POLICY "reports_insert_policy" ON public.question_reports
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_select_policy" ON public.question_reports
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "reports_delete_policy" ON public.question_reports
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- FINAL VERIFICATION — Run this to confirm everything is locked
-- Expected: all rows show rls_enabled=true, rls_forced=true
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
