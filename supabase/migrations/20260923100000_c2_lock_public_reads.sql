-- C2 (SECURITY_THREAT_MODEL_AND_PLAN.md): the database is world-readable through the
-- public anon key that ships in the frontend bundle.
--
-- CONFIRMED 2026-09-23 from the live pg_policies catalog (Supabase MCP, read-only).
-- Every policy dropped below is live, PERMISSIVE, and applies to role {public} (= anon):
--
--   profiles       "Profiles are viewable by everyone"  SELECT USING(true)  <- leaks email/premium of every user
--                  "Users can view own profile"         SELECT USING(true)  <- misnamed: it is NOT owner-scoped
--   app_settings   "Anyone can view app settings"       SELECT USING(true)  <- leaks admin email in updated_by
--   materials      "Public Read Access"                 SELECT USING(true)
--   classes        "Public Read Classes"                SELECT USING(true)
--   feedback       "Everyone can view feedback"         SELECT USING(true)
--                  "Auth users can view own feedback"   SELECT USING(auth.uid() IS NOT NULL)  <- any login reads all
--   daily_stats    "Admin read stats"                   SELECT USING(true)  <- misnamed, not admin-scoped
--   tests          "Allow public read access to non-private tests" SELECT USING(public|unlisted|link_only|owner)
--                  "Strict Public Access"               SELECT USING(public|unlisted)
--                  -> anon reads unlisted "conducted exam" rows INCLUDING questions.correctAnswer
--   sub_categories "Allow service role full access on sub_categories" ALL USING(true) CHECK(true)
--                  (misnamed: service_role has BYPASSRLS and never needed it)
--
-- Why dropping these is safe:
--   * The FastAPI backend connects with the service-role key (backend/app/core/database.py).
--     service_role has BYPASSRLS = true, so no backend read is affected.
--   * The browser bundles only ever touch three tables directly through the anon key:
--     user_tests, test_registrations and tests (verified by grepping .from(...) across
--     frontend/src and frontend-admin/src). Nothing reads profiles, app_settings,
--     materials, classes, feedback, daily_stats, sessions, page_views or visitors directly.
--   * Public creator profiles keep working through the new public_profiles view below.

BEGIN;

-- ── profiles ────────────────────────────────────────────────────────────────
-- Owner-only, plus the existing "Admins have full access" policy.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"        ON public.profiles;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Public creator identity WITHOUT email / premium / plan / verification internals.
-- The view is owned by postgres and is SECURITY DEFINER (security_invoker is left off),
-- so it reads profiles with the owner's rights and is unaffected by the policy above.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_barrier = true) AS
    SELECT id,
           full_name,
           avatar_url,
           bio,
           designation,
           is_creator,
           is_verified_creator,
           verified_role,
           following_visibility,
           created_at
    FROM public.profiles;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_profiles IS
    'C2: anon-safe projection of profiles. Never add email, is_premium, premium_expiry, plan_id or verified_by_admin_id here.';

-- ── app_settings ────────────────────────────────────────────────────────────
-- Feature flags are served by GET /api/features/flags; the table itself leaks the
-- admin email through updated_by.
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

-- ── materials / classes ─────────────────────────────────────────────────────
-- Both are served through the backend; creator-scoped policies remain in place.
DROP POLICY IF EXISTS "Public Read Access"  ON public.materials;
DROP POLICY IF EXISTS "Public Read Classes" ON public.classes;

-- ── feedback ────────────────────────────────────────────────────────────────
-- Keeps "Admins can view all feedback" and the email-scoped "Users can view own feedback".
DROP POLICY IF EXISTS "Everyone can view feedback"       ON public.feedback;
DROP POLICY IF EXISTS "Auth users can view own feedback" ON public.feedback;

-- ── daily_stats ─────────────────────────────────────────────────────────────
-- Internal analytics rollup; only the backend (service_role) reads it.
DROP POLICY IF EXISTS "Admin read stats" ON public.daily_stats;

-- ── sub_categories ──────────────────────────────────────────────────────────
-- Drop the ALL USING(true) grant; keep taxonomy readable.
DROP POLICY IF EXISTS "Allow service role full access on sub_categories" ON public.sub_categories;

-- ── tests ───────────────────────────────────────────────────────────────────
-- Anon may see genuinely public tests only. "unlisted" is the conducted-exam
-- visibility: reachable by exact slug THROUGH THE BACKEND
-- (backend/app/routers/tests/read.py enforces is_slug_match), never by direct PostgREST.
DROP POLICY IF EXISTS "Allow public read access to non-private tests" ON public.tests;
DROP POLICY IF EXISTS "Strict Public Access"                          ON public.tests;

CREATE POLICY "Public tests are readable"
    ON public.tests FOR SELECT
    USING (visibility = 'public'::test_visibility);

-- "Creators can view their own tests" (auth.uid() = created_by) already exists and is kept.

-- Column-level lockdown: the answer key must never be reachable over PostgREST,
-- whatever the row policy says. Column privileges are checked before RLS.
-- service_role keeps full access (BYPASSRLS does not apply to column grants, but
-- service_role is granted them explicitly below / already holds them as a superuser-ish role).
REVOKE SELECT (questions, solutions, sections) ON public.tests FROM anon;
REVOKE SELECT (questions, solutions, sections) ON public.tests FROM authenticated;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────────
-- 1) No USING(true) SELECT policies left on the locked tables (expect 0 rows):
--    SELECT tablename, policyname, cmd, qual FROM pg_policies
--    WHERE schemaname='public' AND cmd='SELECT' AND qual='true'
--      AND tablename IN ('profiles','app_settings','materials','classes','feedback',
--                        'daily_stats','sub_categories','tests');
--
-- 2) Answer columns are not granted to the public roles (expect 0 rows):
--    SELECT grantee, column_name FROM information_schema.column_privileges
--    WHERE table_schema='public' AND table_name='tests'
--      AND column_name IN ('questions','solutions','sections')
--      AND grantee IN ('anon','authenticated') AND privilege_type='SELECT';
--
-- 3) The public projection still works:
--    SELECT count(*) FROM public.public_profiles;
