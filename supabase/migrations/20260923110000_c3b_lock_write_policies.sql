-- C3 part B (SECURITY_THREAT_MODEL_AND_PLAN.md): the write-side siblings of the
-- analytics lockdown in 20260920120000_c3_lock_analytics_and_anon_attempts_rls.sql.
--
-- CONFIRMED 2026-09-23 from the live pg_policies catalog (Supabase MCP, read-only).
-- Every policy dropped below is live, PERMISSIVE, role {public} (= anon):
--
--   user_tests         "Allow test attempt submissions" INSERT CHECK(true)
--                      "Allow test attempt updates"     UPDATE USING(true) CHECK(true)
--     -> anon can forge exam submissions for ANY user and overwrite ANY registered
--        user's answers and score. This is the direct-PostgREST twin of C4.
--   categories         "Admins can insert sections."            INSERT CHECK(true)
--                      "Authenticated users can create sections" INSERT CHECK(auth.role()='authenticated')
--     -> categories are a GLOBAL taxonomy; any visitor/login could create them.
--   notifications      "Public can insert notifications"        INSERT CHECK(true)
--     -> anon can push arbitrary notifications to any user's bell.
--   test_registrations "Authenticated users can read (MVP)"     SELECT USING(true)
--     -> any logged-in user reads every candidate's registration row.
--
-- Why dropping them is safe:
--   * All of these tables are written by the FastAPI backend with the service-role key
--     (BYPASSRLS = true), so no backend path is affected.
--   * The browser bundles write user_tests / test_registrations only through the
--     direct-Supabase fallback in frontend*/src/lib/attemptsApi.ts, which is removed in
--     the same change as C4 server-side scoring (a client-supplied score must never
--     reach the table).
--   * Owner-scoped policies that remain cover every legitimate direct read/write:
--       user_tests         -> "Owner can read"/"Owner can update"/"Owner can delete",
--                             "Creators can view attempts for their tests",
--                             "Admins can view all attempts"
--       categories         -> "Admins can manage categories", "Enable all access for admins"
--       notifications      -> "Authenticated users can insert notifications",
--                             "Users can view own notifications"
--       test_registrations -> "Users can view own registrations",
--                             "Test creators can view registrations for their tests"

BEGIN;

-- ── user_tests: no anon INSERT/UPDATE of attempts or scores ─────────────────
DROP POLICY IF EXISTS "Allow test attempt submissions" ON public.user_tests;
DROP POLICY IF EXISTS "Allow test attempt updates"     ON public.user_tests;

-- Deliberately NO replacement INSERT policy: scores are computed server-side
-- (C4) and only the service-role backend may write an attempt row.

-- ── categories: global taxonomy is admin-only ───────────────────────────────
DROP POLICY IF EXISTS "Admins can insert sections."             ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can create sections" ON public.categories;

-- ── notifications: no anon-authored notifications ───────────────────────────
DROP POLICY IF EXISTS "Public can insert notifications" ON public.notifications;

-- ── test_registrations: drop the blanket authenticated read ─────────────────
DROP POLICY IF EXISTS "Authenticated users can read (MVP)" ON public.test_registrations;

-- RLS stays enabled on all four (idempotent).
ALTER TABLE public.user_tests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_registrations ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect 0 rows (no unconditional write/read grants left on these tables):
--   SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public'
--     AND tablename IN ('user_tests','categories','notifications','test_registrations')
--     AND (qual = 'true' OR with_check = 'true');
