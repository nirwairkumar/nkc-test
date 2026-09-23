-- ============================================================================
-- L1 — RLS drift detection.
--
-- Run this in the Supabase SQL editor whenever you want to know whether the live
-- database still matches supabase/migrations/20260924000000_rls_baseline.sql.
--
-- The whole reason L1 existed is that 19 hand-written RLS scripts drifted away from
-- production without anyone noticing, so a "fix" script could silently re-open a
-- hole. These queries make drift visible in ten seconds.
-- ============================================================================

-- ── 1. INVARIANTS — every one of these must return ZERO rows ────────────────
-- If any returns a row, a security fix has been undone.

-- 1a. Analytics + anonymous attempts must have NO policies at all (C3).
--     Backend reaches them as service_role, which bypasses RLS.
SELECT 'C3 VIOLATION: analytics table has a policy' AS finding, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('visitors', 'sessions', 'page_views', 'anon_test_attempts', 'daily_stats');

-- 1b. No table may be readable by anon on an unconditional SELECT (C2),
--     except the deliberate public-catalogue tables.
SELECT 'C2 VIOLATION: unconditional public SELECT' AS finding, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
  AND qual = 'true'
  AND tablename NOT IN (
      'categories',       -- public taxonomy
      'sub_categories',   -- public taxonomy
      'test_categories',  -- public test<->category mapping
      'post_likes',       -- public like counts
      'follows'           -- public social graph
  );

-- 1c. Exam attempts must never be writable on an unconditional check (C3b/C4).
SELECT 'C4 VIOLATION: unconditional write on attempts' AS finding, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_tests', 'test_registrations')
  AND (qual = 'true' OR with_check = 'true');

-- 1d. Profiles must never expose all rows (C2 — email/premium of every user).
SELECT 'C2 VIOLATION: profiles readable by all' AS finding, policyname, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT' AND qual = 'true';

-- 1e. The answer key must stay ungranted to the public roles (C4).
SELECT 'C4 VIOLATION: answer column granted' AS finding, grantee, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'tests'
  AND column_name IN ('questions', 'solutions', 'sections')
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'SELECT';

-- 1f. RLS must remain ENABLED on every public table.
SELECT 'VIOLATION: RLS disabled' AS finding, c.relname AS tablename
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- 1g. The anon-safe projection must still exist and must not leak PII.
SELECT 'VIOLATION: public_profiles exposes PII' AS finding, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'public_profiles'
  AND column_name IN ('email', 'is_premium', 'premium_expiry', 'plan_id', 'verified_by_admin_id');


-- ── 2. HEADLINE COUNTS — compare against the baseline header ────────────────
-- Baseline as generated on 2026-09-24: 129 policies.
-- After 20260924010000_l1_residual_rls_tightening.sql: 125.
SELECT count(*) AS total_policies FROM pg_policies WHERE schemaname = 'public';

SELECT tablename, count(*) AS policies
FROM pg_policies WHERE schemaname = 'public'
GROUP BY tablename ORDER BY tablename;


-- ── 3. REGENERATE THE BASELINE ──────────────────────────────────────────────
-- Run this and paste the single returned value over the body of
-- supabase/migrations/20260924000000_rls_baseline.sql (keeping its header).
SELECT string_agg(stmt, E'\n' ORDER BY tablename, policyname) AS baseline_sql
FROM (
  SELECT tablename, policyname,
    'DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.' || quote_ident(tablename) || ';' || E'\n' ||
    'CREATE POLICY ' || quote_ident(policyname) || ' ON public.' || quote_ident(tablename) ||
    CASE WHEN permissive = 'RESTRICTIVE' THEN ' AS RESTRICTIVE' ELSE '' END ||
    ' FOR ' || cmd ||
    ' TO ' || array_to_string(roles, ', ') ||
    COALESCE(E'\n    USING (' || qual || ')', '') ||
    COALESCE(E'\n    WITH CHECK (' || with_check || ')', '') || ';'
    AS stmt
  FROM pg_policies WHERE schemaname = 'public'
) s;
