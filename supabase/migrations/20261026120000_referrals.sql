-- ════════════════════════════════════════════════════════════════════════════
-- Referrals (2026-10-26): an educator invites another educator to TestoZa.
--
-- Everyone gets one invite code the first time they open their invite card
-- (/dashboard → Invite educators, or Settings → Invite educators). The link is
-- app.testoza.com/invite/<CODE>. Opening it is a visit; signing up afterwards in that
-- browser (email or Google) claims the referral for the new account.
--
--   referral_codes    one code per account
--   referral_visits   one row per browser that opened someone's link (unique opens)
--   referrals         who brought whom: one row per new account, never more
--
-- The backend (service role, app/routers/referrals.py) does every read and write and
-- checks the rules: the account must be new (made in the last 7 days), not the
-- referrer, and not a candidate's guest login. RLS is on with no policies, so the
-- browser can't touch these tables directly.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_codes (
    user_id     uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    -- Upper-case letters and digits, e.g. ASHA7K2P. Looked up upper-cased.
    code        text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,12}$'),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_visits (
    referrer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    -- A random id the invite page keeps in the visitor's browser.
    visitor_id  text NOT NULL CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (referrer_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS public.referrals (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    referrer_id  uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    -- One referrer per account, ever.
    referred_id  uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
    -- The code as it was used (the referrer's code can't change, but keep what was typed).
    code         text NOT NULL,
    CONSTRAINT referrals_not_self CHECK (referrer_id <> referred_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_created_idx  ON public.referrals (created_at DESC);

ALTER TABLE public.referral_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;
-- No policies: anon and signed-in clients can neither read nor write these tables.
REVOKE ALL ON public.referral_codes  FROM anon, authenticated;
REVOKE ALL ON public.referral_visits FROM anon, authenticated;
REVOKE ALL ON public.referrals       FROM anon, authenticated;


-- ─── 2. How far each referred account got ────────────────────────────────────
-- tests_made: tests they made themselves (the example test seeded into every new
--   account doesn't count).
-- candidates: different people who submitted one of those tests, not counting them.
-- Never reads tests.questions (~157 kB a row): only id, created_by and settings flags.
CREATE OR REPLACE FUNCTION public.referral_progress(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, tests_made integer, candidates integer, last_result_at timestamptz)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH own AS (
        SELECT t.id, t.created_by
        FROM public.tests t
        WHERE t.created_by = ANY (p_user_ids)
          AND coalesce(t.settings->>'is_user_example', '') <> 'true'
          AND coalesce(t.settings->>'is_example_template', '') <> 'true'
    ),
    results AS (
        SELECT o.created_by, count(DISTINCT ut.user_id)::int AS candidates, max(ut.created_at) AS last_at
        FROM own o
        JOIN public.user_tests ut ON ut.test_id = o.id AND ut.user_id IS DISTINCT FROM o.created_by
        GROUP BY o.created_by
    )
    SELECT u.id,
           (SELECT count(*)::int FROM own o WHERE o.created_by = u.id),
           coalesce(r.candidates, 0),
           r.last_at
    FROM unnest(p_user_ids) AS u (id)
    LEFT JOIN results r ON r.created_by = u.id;
$$;


-- ─── 3. Opens and sign-ups per referrer ──────────────────────────────────────
-- p_referrer_ids NULL = everyone whose link was opened or used (admin → Referrals).
CREATE OR REPLACE FUNCTION public.referral_counts(p_referrer_ids uuid[] DEFAULT NULL)
RETURNS TABLE (referrer_id uuid, visits integer, last_visit_at timestamptz, joined integer, last_joined_at timestamptz)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH v AS (
        SELECT rv.referrer_id, count(*)::int AS n, max(rv.created_at) AS last_at
        FROM public.referral_visits rv
        WHERE p_referrer_ids IS NULL OR rv.referrer_id = ANY (p_referrer_ids)
        GROUP BY rv.referrer_id
    ),
    j AS (
        SELECT r.referrer_id, count(*)::int AS n, max(r.created_at) AS last_at
        FROM public.referrals r
        WHERE p_referrer_ids IS NULL OR r.referrer_id = ANY (p_referrer_ids)
        GROUP BY r.referrer_id
    )
    SELECT coalesce(v.referrer_id, j.referrer_id), coalesce(v.n, 0), v.last_at, coalesce(j.n, 0), j.last_at
    FROM v FULL JOIN j ON j.referrer_id = v.referrer_id;
$$;


-- ─── 4. Lock the functions to the backend ────────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname IN ('referral_progress', 'referral_counts')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;
