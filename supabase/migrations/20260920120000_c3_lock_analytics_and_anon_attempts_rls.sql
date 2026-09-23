-- C3 (SECURITY_THREAT_MODEL_AND_PLAN.md): analytics + anon_test_attempts tables are
-- world read/write/delete through the public anon key.
--
-- CONFIRMED 2026-09-20 from the live pg_policies catalog (Supabase MCP, read-only).
-- Every policy below is live, PERMISSIVE, and applies to role {public} (= anon too):
--
--   visitors            "Allow public insert and update visitors"  ALL     USING(true) CHECK(true)
--                       "Anyone can log visits"                    INSERT  CHECK(true)        <- not in any file
--   sessions            "Allow public insert and update sessions"  ALL     USING(true) CHECK(true)
--   page_views          "Allow public insert page_views"           INSERT  CHECK(true)
--                       "Allow public select page_views"           SELECT  USING(true)
--   anon_test_attempts  "Service role full access"                 ALL     USING(true) CHECK(true)
--                       "Anyone can insert anon attempts"          INSERT  CHECK(true)        <- not in any file
--                       "Anyone can update anon attempts"          UPDATE  USING(true)        <- not in any file
--
-- ALL = select/insert/update/DELETE: anyone with the anon key can wipe analytics or
-- read every anonymous candidate's session_token and overwrite their answers/score.
--
-- Why dropping them is safe:
--   * These tables are read/written ONLY by the FastAPI backend
--     (backend/app/routers/analytics/*, attempts.py, services/attempt_service.py),
--     which connects with the service-role key. service_role has BYPASSRLS = true
--     (verified in pg_roles), so it never needed a policy - FORCE RLS or not.
--   * No frontend, admin-frontend or edge-function code touches these tables.
--   * The only trigger (trg_page_views_count_sync -> trg_sync_visitor_page_views_count)
--     runs as the inserting role = service_role. aggregate_daily_stats /
--     cleanup_old_analytics are SECURITY INVOKER, called by service_role/postgres.
--
-- Supersedes 20260302100000_fix_analytics_rls.sql, whose premise ("the backend uses the
-- anon key") was wrong.

BEGIN;

-- Named drops (documentation of exactly what was live).
DROP POLICY IF EXISTS "Allow public insert and update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Anyone can log visits"                   ON public.visitors;
DROP POLICY IF EXISTS "Allow public insert and update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public insert page_views"          ON public.page_views;
DROP POLICY IF EXISTS "Allow public select page_views"          ON public.page_views;
DROP POLICY IF EXISTS "Service role full access"                ON public.anon_test_attempts;
DROP POLICY IF EXISTS "Anyone can insert anon attempts"         ON public.anon_test_attempts;
DROP POLICY IF EXISTS "Anyone can update anon attempts"         ON public.anon_test_attempts;

-- Safety net: these four tables must end with ZERO policies, whatever else was added
-- in the SQL editor. (Also removes the legacy "Service role only" policies from
-- 20260301_visitor_analytics_schema.sql on a from-scratch rebuild.)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('visitors', 'sessions', 'page_views', 'anon_test_attempts')
    LOOP
        RAISE NOTICE 'C3: dropping leftover policy % on %', r.policyname, r.tablename;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Keep RLS enabled with NO policies: anon/authenticated get nothing, service_role
-- still has full access. Idempotent.
ALTER TABLE public.visitors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_test_attempts ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify (should return 0 rows):
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public' AND tablename IN ('visitors','sessions','page_views','anon_test_attempts');

-- NOT touched here (out of C3 scope, belongs to C2 - public reads):
--   daily_stats still has "Admin read stats" FOR SELECT USING (true).
--   To close it later: DROP POLICY IF EXISTS "Admin read stats" ON public.daily_stats;
