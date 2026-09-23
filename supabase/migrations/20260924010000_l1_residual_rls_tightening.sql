-- ============================================================================
-- L1 by-product — residual RLS holes found while re-baselining (2026-09-24).
--
-- Re-baselining the live catalog (20260924000000_rls_baseline.sql) surfaced four
-- policies whose NAME does not match what they actually allow. They were not in the
-- original C2/C3 scope, so they survived that lockdown.
--
-- Each one was verified against the live catalog and against actual usage before
-- being touched:
--
--   1. question_reports."Auth users can view reports"  SELECT USING(auth.uid() IS NOT NULL)
--      -> ANY logged-in user can read EVERY creator's question reports.
--      Safe to drop: the frontends never read question_reports directly (verified by
--      grepping .from(...) across frontend/src and frontend-admin/src — only
--      user_tests, test_registrations and tests are accessed directly). The reports UI
--      goes through /api/reports/*, which runs as service_role and now carries
--      owner/admin guards (C5). The owner-scoped and admin policies below remain.
--
--   2. test_results."Users can view own results"    SELECT USING(auth.uid() IS NOT NULL)
--   3. test_results."Users can insert own results"  INSERT WITH CHECK(auth.uid() IS NOT NULL)
--      -> Despite the names, ANY logged-in user can read and insert every row.
--      Safe to drop: this is a dead legacy table — 0 rows live, and no backend or
--      frontend code reads or writes it (the only "test_results" hits in the codebase
--      are the unrelated analyze_test_results() handler and generated types.ts).
--      The correctly-scoped "Users can view their own results" (auth.uid() = user_id)
--      and "Users can submit test results" (auth.uid() = user_id) policies remain,
--      so the table keeps working if it is ever revived.
--
--   4. test_categories."Admins can insert test_sections."  INSERT WITH CHECK(true)
--      -> Despite the name, ANY caller can insert rows linking any test to any
--      category. Safe to drop: three correctly-scoped INSERT policies remain
--      ("Admins can add categories", "Creators can add categories to their tests",
--      "Users can manage sections for their own tests"), and the backend writes this
--      table as service_role via /api/categories/assign/* (admin/owner guarded).
--
-- Nothing here removes a capability from a legitimate user: every dropped policy has
-- a correctly-scoped sibling that still covers the real use case.
-- ============================================================================

BEGIN;

-- 1. Question reports are visible to their creator and to admins only.
DROP POLICY IF EXISTS "Auth users can view reports" ON public.question_reports;

-- 2 & 3. Dead legacy table: keep only the owner-scoped policies.
DROP POLICY IF EXISTS "Users can view own results"   ON public.test_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.test_results;

-- 4. Misnamed unconditional INSERT on the test<->category join table.
DROP POLICY IF EXISTS "Admins can insert test_sections." ON public.test_categories;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect 0 rows — no policy should grant access on the mere fact of being logged in,
-- and no unconditional INSERT should remain on these tables:
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('question_reports','test_results','test_categories')
--     AND (qual = '(auth.uid() IS NOT NULL)' OR with_check = 'true');
--
-- Expect 125 (129 in the baseline minus the 4 dropped here):
--   SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
--
-- After applying this, regenerate the baseline so the two stay in step:
--   see scripts/check-rls-drift.sql
