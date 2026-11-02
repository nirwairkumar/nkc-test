-- ════════════════════════════════════════════════════════════════════════════
-- Automatic emails + two reminders (2026-11-02). Run once in the Supabase SQL editor; safe to re-run.
--
-- 1. email_auto_log       every automatic email (welcome, test_created, test_live, results,
--                         test_ended): sent / failed / skipped. Admin → Email → Automatic counts it.
-- 2. email_auto_settings  admins switch each automatic email on or off (no row = on).
-- 3. email_auto_report()  counts per email: today (IST), 7 and 30 days, all time, failures, clicks.
-- 4. Reminders the team sends by hand (admin → Email → Playbook → Reminders):
--      email_templates.rule  'live_48h' : has a test live for 48+ hours with fewer than 5 submissions
--                            'away_7d'  : hasn't opened TestoZa for 7+ days
--    email_people() learns last_seen_at (own visits and actions only, not candidates' answers),
--    the live test behind 'live_48h', and new_results (answers since the last visit).
--    email_candidates / email_report_overview / email_report_audience / email_claim_batch read them.
--    Everything else (one email a week, 3 a month, never the same email twice) is unchanged.
--
-- Backend only: RLS on, no policies, functions executable by service_role only.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1–2. Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_auto_log (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                 text NOT NULL,
    user_id              uuid,
    test_id              uuid,
    email                text NOT NULL,
    subject              text NOT NULL DEFAULT '',
    status               text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
    error                text,
    provider             text,                 -- "Amazon SES", "Brevo (fallback)"
    message_id           text,                 -- the Message-ID we wrote
    provider_message_id  text,                 -- the one Amazon SES gave it
    thread_key           text,                 -- 'test:<id>' for results + test_ended
    milestone            integer,              -- results: the submission count it announced
    created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_auto_log_kind_idx   ON public.email_auto_log (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS email_auto_log_user_idx   ON public.email_auto_log (user_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS email_auto_log_test_idx   ON public.email_auto_log (test_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS email_auto_log_thread_idx ON public.email_auto_log (thread_key, created_at) WHERE thread_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_auto_log_recent_idx ON public.email_auto_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_auto_settings (
    kind        text PRIMARY KEY,
    enabled     boolean NOT NULL DEFAULT true,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  uuid
);

ALTER TABLE public.email_auto_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_auto_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_auto_log, public.email_auto_settings FROM anon, authenticated;

-- Clicks per automatic email (links carry utm_medium=auto, utm_campaign=<kind>).
CREATE INDEX IF NOT EXISTS analytics_sessions_utm_medium_idx
    ON public.analytics_sessions (utm_medium, started_at) WHERE utm_medium IS NOT NULL;


-- ─── 3. The report ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.email_auto_report()
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH t0 AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS today),
    k AS (
        SELECT l.kind,
               count(*) FILTER (WHERE l.status = 'sent' AND l.created_at >= (SELECT today FROM t0))   AS today,
               count(*) FILTER (WHERE l.status = 'sent' AND l.created_at > now() - interval '7 days')  AS week,
               count(*) FILTER (WHERE l.status = 'sent' AND l.created_at > now() - interval '30 days') AS month,
               count(*) FILTER (WHERE l.status = 'sent')                                              AS total,
               count(*) FILTER (WHERE l.status = 'failed'  AND l.created_at > now() - interval '30 days') AS failed,
               count(*) FILTER (WHERE l.status = 'skipped' AND l.created_at > now() - interval '30 days') AS skipped,
               max(l.created_at) FILTER (WHERE l.status = 'sent') AS last_at
        FROM public.email_auto_log l
        GROUP BY 1
    ),
    c AS (
        SELECT a.utm_campaign AS kind, count(DISTINCT coalesce(a.user_id::text, a.visitor_id::text)) AS clicked
        FROM public.analytics_sessions a
        WHERE a.utm_source = 'email' AND a.utm_medium = 'auto' AND NOT a.is_bot
          AND a.started_at > now() - interval '30 days'
        GROUP BY 1
    ),
    d AS (              -- last 14 IST days, all kinds together
        SELECT (l.created_at AT TIME ZONE 'Asia/Kolkata')::date AS day, count(*) AS n
        FROM public.email_auto_log l
        WHERE l.status = 'sent' AND l.created_at > now() - interval '15 days'
        GROUP BY 1
    )
    SELECT jsonb_build_object(
        'kinds', (SELECT coalesce(jsonb_object_agg(k.kind, jsonb_build_object(
                      'today', k.today, 'week', k.week, 'month', k.month, 'total', k.total,
                      'failed', k.failed, 'skipped', k.skipped, 'last_at', k.last_at,
                      'clicked', coalesce(c.clicked, 0))), '{}'::jsonb)
                  FROM k LEFT JOIN c ON c.kind = k.kind),
        'settings', (SELECT coalesce(jsonb_object_agg(s.kind, s.enabled), '{}'::jsonb) FROM public.email_auto_settings s),
        'daily', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'n', coalesce(d.n, 0)) ORDER BY g.day), '[]'::jsonb)
                  FROM (SELECT generate_series(((now() AT TIME ZONE 'Asia/Kolkata')::date - 13),
                                               (now() AT TIME ZONE 'Asia/Kolkata')::date, interval '1 day')::date AS day) g
                  LEFT JOIN d ON d.day = g.day)
    )
$$;


-- ─── 4. Reminders ───────────────────────────────────────────────────────────

ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS rule text;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_templates_rule_check') THEN
        ALTER TABLE public.email_templates
            ADD CONSTRAINT email_templates_rule_check CHECK (rule IS NULL OR rule IN ('live_48h', 'away_7d'));
    END IF;
END $$;

-- The return type grows, so the function is dropped and made again (nothing depends on it by OID).
DROP FUNCTION IF EXISTS public.email_people();

CREATE FUNCTION public.email_people()
RETURNS TABLE (
    id uuid, email text, full_name text, designation text, who text, stage text,
    created_at timestamptz, last_active_at timestamptz,
    tests_created integer, results integer, self_attempts integer,
    latest_test_title text, top_test_title text, top_test_results integer,
    email_ok boolean,
    last_seen_at timestamptz, new_results integer,
    live_test_id uuid, live_test_title text, live_test_slug text, live_since timestamptz, live_test_results integer)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH own AS (       -- tests a person made; seeded examples don't count
        SELECT t.id, t.created_by, t.title, t.created_at, t.slug, t.settings
        FROM public.tests t
        WHERE t.created_by IS NOT NULL
          AND coalesce(t.settings->>'is_user_example', 'false') <> 'true'
          AND coalesce(t.settings->>'is_example_template', 'false') <> 'true'
    ),
    att AS (            -- every answer sheet on those tests
        SELECT o.created_by, o.id AS test_id, x.user_id, x.at
        FROM own o
        JOIN (
            SELECT ut.test_id, ut.user_id, ut.created_at AS at FROM public.user_tests ut
            UNION ALL
            SELECT a.test_id, NULL::uuid, a.submitted_at FROM public.anon_test_attempts a WHERE a.status = 'submitted'
        ) x ON x.test_id = o.id
    ),
    made AS (SELECT created_by AS uid, count(*)::int AS n, max(created_at) AS last_at FROM own GROUP BY 1),
    res AS (
        SELECT created_by AS uid,
               count(*) FILTER (WHERE user_id IS DISTINCT FROM created_by)::int AS others,
               count(*) FILTER (WHERE user_id = created_by)::int AS self,
               max(at) FILTER (WHERE user_id IS DISTINCT FROM created_by) AS last_at
        FROM att GROUP BY 1
    ),
    latest AS (
        SELECT DISTINCT ON (created_by) created_by AS uid, title
        FROM own ORDER BY created_by, created_at DESC
    ),
    top_test AS (
        SELECT DISTINCT ON (a.created_by) a.created_by AS uid, o.title, a.n
        FROM (SELECT created_by, test_id, count(*)::int AS n FROM att
               WHERE user_id IS DISTINCT FROM created_by GROUP BY 1, 2) a
        JOIN own o ON o.id = a.test_id
        ORDER BY a.created_by, a.n DESC
    ),
    live AS (           -- the live test a "share it" reminder is about: one stuck 48h+ under 5 answers first
        SELECT DISTINCT ON (l.created_by) l.created_by AS uid, l.id, l.title, l.slug, l.since, l.n
        FROM (
            SELECT o.created_by, o.id, o.title,
                   coalesce(nullif(o.settings->'conduct_exam'->>'conduct_slug', ''), o.slug) AS slug,
                   CASE WHEN (o.settings->'conduct_exam'->>'started_at') ~ '^\d{4}-\d{2}-\d{2}'
                        THEN (o.settings->'conduct_exam'->>'started_at')::timestamptz END AS since,
                   (SELECT count(*)::int FROM att x WHERE x.test_id = o.id AND x.user_id IS DISTINCT FROM o.created_by) AS n
            FROM own o
            WHERE o.settings->'conduct_exam'->>'enabled' = 'true'
        ) l
        WHERE l.since IS NOT NULL
        ORDER BY l.created_by, (l.since <= now() - interval '48 hours' AND l.n < 5) DESC, l.since
    ),
    took_other AS (     -- signed in to sit someone else's test
        SELECT ut.user_id AS uid FROM public.user_tests ut JOIN public.tests t ON t.id = ut.test_id
         WHERE ut.user_id IS NOT NULL AND t.created_by IS DISTINCT FROM ut.user_id
        UNION
        SELECT r.user_id FROM public.test_registrations r JOIN public.tests t ON t.id = r.test_id
         WHERE r.user_id IS NOT NULL AND t.created_by IS DISTINCT FROM r.user_id
    ),
    taken AS (SELECT user_id AS uid, max(created_at) AS last_at FROM public.user_tests WHERE user_id IS NOT NULL GROUP BY 1),
    seen AS (
        SELECT user_id AS uid, max(last_seen_at) AS last_at
        FROM public.analytics_sessions WHERE user_id IS NOT NULL AND NOT is_bot GROUP BY 1
    ),
    ai AS (SELECT user_id AS uid, max(created_at) AS last_at FROM public.ai_generation_history WHERE user_id IS NOT NULL GROUP BY 1),
    base AS (
        SELECT pr.id, lower(trim(pr.email)) AS email, nullif(trim(pr.full_name), '') AS full_name,
               pr.designation, pr.created_at,
               split_part(lower(trim(pr.email)), '@', 2) AS domain,
               coalesce(m.n, 0) AS tests_created, coalesce(r.others, 0) AS results, coalesce(r.self, 0) AS self_attempts,
               EXISTS (SELECT 1 FROM took_other x WHERE x.uid = pr.id) AS sat_other,
               greatest(pr.created_at, m.last_at, r.last_at, tk.last_at, se.last_at, ai.last_at) AS last_active_at,
               -- their own visits and actions only: candidates answering doesn't count as a visit
               greatest(pr.created_at, m.last_at, tk.last_at, se.last_at, ai.last_at) AS last_seen_at,
               l.title AS latest_test_title, tt.title AS top_test_title, coalesce(tt.n, 0) AS top_test_results,
               lv.id AS live_test_id, lv.title AS live_test_title, lv.slug AS live_test_slug,
               lv.since AS live_since, lv.n AS live_test_results
        FROM public.profiles pr
        LEFT JOIN made m      ON m.uid = pr.id
        LEFT JOIN res r       ON r.uid = pr.id
        LEFT JOIN latest l    ON l.uid = pr.id
        LEFT JOIN top_test tt ON tt.uid = pr.id
        LEFT JOIN live lv     ON lv.uid = pr.id
        LEFT JOIN taken tk    ON tk.uid = pr.id
        LEFT JOIN seen se     ON se.uid = pr.id
        LEFT JOIN ai          ON ai.uid = pr.id
        WHERE pr.email LIKE '%@%'
          AND pr.email NOT ILIKE '%@guest.testoza.com'
          AND pr.email NOT ILIKE '%@testoza.com'
          AND NOT EXISTS (SELECT 1 FROM public.admins a WHERE lower(a.email) = lower(pr.email))
    )
    SELECT b.id, b.email, b.full_name, b.designation,
           CASE WHEN b.designation = 'Institution' THEN 'institution'
                WHEN b.designation = 'Student' THEN 'student'
                WHEN b.designation IS NULL AND b.tests_created = 0 AND b.sat_other THEN 'taker'
                WHEN b.domain NOT IN (
                         'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com',
                         'rocketmail.com', 'hotmail.com', 'hotmail.co.in', 'outlook.com', 'outlook.in', 'live.com',
                         'live.in', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'rediffmail.com', 'rediff.com',
                         'aol.com', 'proton.me', 'protonmail.com', 'zoho.com', 'zohomail.in', 'zohomail.com',
                         'gmx.com', 'gmx.net', 'mail.com', 'email.com', 'inbox.com', 'yandex.com', 'yandex.ru',
                         'naver.com', 'qq.com', '163.com', '126.com')
                     AND b.domain !~ '(^|\.)(edu|ac|sch|school|k12)(\.|$)' THEN 'corporate'
                WHEN b.designation IN ('Teacher', 'Other', 'Guest') OR b.tests_created > 0 THEN 'educator'
                ELSE 'no_role' END AS who,
           CASE WHEN b.tests_created = 0 THEN 'new'
                WHEN b.results = 0 AND b.self_attempts = 0 THEN 'drafted'
                WHEN b.results < 5 THEN 'tried'
                WHEN b.last_active_at < now() - interval '21 days' THEN 'quiet'
                ELSE 'active' END AS stage,
           b.created_at, b.last_active_at, b.tests_created, b.results, b.self_attempts,
           b.latest_test_title, b.top_test_title, b.top_test_results,
           b.domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
             AND b.domain NOT IN (
                 'example.com', 'example.org', 'example.net', 'test.com', 'mailinator.com', 'yopmail.com',
                 'snapmailnow.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'tempmail.com',
                 'temp-mail.org', 'trashmail.com', 'dispostable.com', 'getnada.com', 'maildrop.cc',
                 'gmial.com', 'gmai.com', 'gamil.com', 'gmal.com', 'gmail.co', 'gmail.con', 'gmail.cm',
                 'outlool.com', 'hotmial.com', 'yaho.com', 'yahooo.com') AS email_ok,
           b.last_seen_at,
           (SELECT count(*)::int FROM att x
             WHERE x.created_by = b.id AND x.user_id IS DISTINCT FROM b.id AND x.at > b.last_seen_at) AS new_results,
           b.live_test_id, b.live_test_title, b.live_test_slug, b.live_since, b.live_test_results
    FROM base b
$$;


-- A template's rule is one more "is this email for this person" check, next to stages and groups.
CREATE OR REPLACE FUNCTION public.email_rule_ok(
    p_rule text, p_live_since timestamptz, p_live_results integer, p_last_seen timestamptz)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT CASE p_rule
        WHEN 'live_48h' THEN coalesce(p_live_since <= now() - interval '48 hours' AND p_live_results < 5, false)
        WHEN 'away_7d'  THEN coalesce(p_last_seen <= now() - interval '7 days', false)
        ELSE true END
$$;


CREATE OR REPLACE FUNCTION public.email_candidates(
    p_cooldown integer DEFAULT 7, p_cap integer DEFAULT 3, p_template text DEFAULT NULL)
RETURNS TABLE (template_key text, user_id uuid, status text, ready_at timestamptz)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH tpl_all AS (SELECT * FROM public.email_templates WHERE NOT archived),
    tpl AS (
        SELECT * FROM tpl_all t
        WHERE p_template IS NULL OR t.key = p_template
           OR t.track = (SELECT x.track FROM tpl_all x WHERE x.key = p_template)
    ),
    ppl AS (SELECT * FROM public.email_people() p WHERE p.who <> 'taker'),
    sent AS (SELECT s.user_id, s.template_key, s.sent_at FROM public.email_sends s WHERE s.status IN ('sending', 'sent')),
    per AS (
        SELECT s.user_id, max(s.sent_at) AS last_at,
               count(*) FILTER (WHERE s.sent_at > now() - interval '30 days') AS n30
        FROM sent s GROUP BY 1
    ),
    pairs AS (
        SELECT t.key, t.track, t.step, t.wait_days, t.min_days_joined, t.min_days_quiet,
               p.id, p.email, p.email_ok, p.created_at, p.last_active_at
        FROM tpl t JOIN ppl p
          ON (cardinality(t.stages) = 0 OR p.stage = ANY (t.stages))
         AND (cardinality(t.audiences) = 0 OR p.who = ANY (t.audiences))
         AND public.email_rule_ok(t.rule, p.live_since, p.live_test_results, p.last_seen_at)
    ),
    had AS (
        SELECT pr.*, h.sent_at AS got_at
        FROM pairs pr
        LEFT JOIN (SELECT s.user_id, s.template_key, max(s.sent_at) AS sent_at FROM sent s GROUP BY 1, 2) h
               ON h.user_id = pr.id AND h.template_key = pr.key
    ),
    track_state AS (
        SELECT h.id AS uid, h.track,
               min(h.step) FILTER (WHERE h.got_at IS NULL) AS next_step,
               max(h.got_at) AS last_at
        FROM had h WHERE h.track IS NOT NULL GROUP BY 1, 2
    )
    SELECT h.key, h.id,
           CASE WHEN EXISTS (SELECT 1 FROM public.email_suppressions x WHERE x.email = h.email) THEN 'unsubscribed'
                WHEN NOT h.email_ok THEN 'bad_email'
                WHEN h.got_at IS NOT NULL THEN 'got_it'
                WHEN h.track IS NOT NULL AND h.step > ts.next_step THEN 'earlier_step'
                WHEN h.created_at > now() - make_interval(days => h.min_days_joined)
                  OR h.last_active_at > now() - make_interval(days => h.min_days_quiet)
                  OR ts.last_at > now() - make_interval(days => h.wait_days) THEN 'too_soon'
                WHEN pe.last_at > now() - make_interval(days => p_cooldown) THEN 'cooldown'
                WHEN coalesce(pe.n30, 0) >= p_cap THEN 'monthly_cap'
                ELSE 'ready' END,
           greatest(h.created_at + make_interval(days => h.min_days_joined),
                    h.last_active_at + make_interval(days => h.min_days_quiet),
                    ts.last_at + make_interval(days => h.wait_days),
                    pe.last_at + make_interval(days => p_cooldown))
    FROM had h
    LEFT JOIN track_state ts ON ts.uid = h.id AND ts.track = h.track
    LEFT JOIN per pe ON pe.user_id = h.id
    WHERE p_template IS NULL OR h.key = p_template
$$;


CREATE OR REPLACE FUNCTION public.email_report_overview(p_cooldown integer DEFAULT 7, p_cap integer DEFAULT 3)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH ppl AS (SELECT * FROM public.email_people()),
    cand AS (SELECT * FROM public.email_candidates(p_cooldown, p_cap, NULL)),
    by_tpl AS (
        SELECT c.template_key,
               count(*) FILTER (WHERE c.status = 'ready') AS ready,
               count(*) FILTER (WHERE c.status IN ('too_soon', 'cooldown', 'monthly_cap')) AS waiting,
               min(c.ready_at) FILTER (WHERE c.status IN ('too_soon', 'cooldown')) AS next_ready_at
        FROM cand c GROUP BY 1
    ),
    sent AS (
        SELECT s.template_key, count(*) AS n, max(s.sent_at) AS last_at
        FROM public.email_sends s WHERE s.status = 'sent' GROUP BY 1
    ),
    ist_today AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS t0)
    SELECT jsonb_build_object(
        'people',       (SELECT count(*) FROM ppl WHERE who <> 'taker'),
        'ready_people', (SELECT count(DISTINCT c.user_id) FROM cand c WHERE c.status = 'ready'),
        'takers',       (SELECT count(*) FROM ppl WHERE who = 'taker'),
        'bad_emails',   (SELECT count(*) FROM ppl WHERE who <> 'taker' AND NOT email_ok),
        'unsubscribed', (SELECT count(*) FROM public.email_suppressions),
        'matrix', (SELECT coalesce(jsonb_agg(jsonb_build_object('stage', m.stage, 'who', m.who, 'n', m.n)), '[]'::jsonb)
                   FROM (SELECT stage, who, count(*) AS n FROM ppl WHERE who <> 'taker' GROUP BY 1, 2) m),
        'rules', jsonb_build_object(
            'live_48h', (SELECT count(*) FROM ppl WHERE who IN ('educator', 'institution', 'corporate')
                           AND public.email_rule_ok('live_48h', live_since, live_test_results, last_seen_at)),
            'away_7d',  (SELECT count(*) FROM ppl WHERE who IN ('educator', 'institution', 'corporate')
                           AND public.email_rule_ok('away_7d', live_since, live_test_results, last_seen_at))),
        'templates', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                          'key', t.key, 'name', t.name, 'track', t.track, 'step', t.step, 'wait_days', t.wait_days,
                          'stages', to_jsonb(t.stages), 'audiences', to_jsonb(t.audiences),
                          'min_days_joined', t.min_days_joined, 'min_days_quiet', t.min_days_quiet,
                          'rule', t.rule,
                          'subject', t.subject, 'preheader', t.preheader, 'why', t.why,
                          'is_builtin', t.is_builtin, 'archived', t.archived, 'sort', t.sort,
                          'ready', coalesce(b.ready, 0), 'waiting', coalesce(b.waiting, 0),
                          'next_ready_at', b.next_ready_at,
                          'sent', coalesce(s.n, 0), 'last_sent_at', s.last_at)
                          ORDER BY t.sort, t.track NULLS LAST, t.step, t.name), '[]'::jsonb)
                      FROM public.email_templates t
                      LEFT JOIN by_tpl b ON b.template_key = t.key
                      LEFT JOIN sent s ON s.template_key = t.key),
        'sent', (SELECT jsonb_build_object(
                     'hour',  count(*) FILTER (WHERE s.sent_at > now() - interval '1 hour'),
                     'today', count(*) FILTER (WHERE s.sent_at >= (SELECT t0 FROM ist_today)),
                     'day',   count(*) FILTER (WHERE s.sent_at > now() - interval '24 hours'),
                     'week',  count(*) FILTER (WHERE s.sent_at > now() - interval '7 days'),
                     'all',   count(*))
                 FROM public.email_sends s WHERE s.status IN ('sending', 'sent')),
        'sending', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'status', c.status)
                                    ORDER BY c.created_at DESC), '[]'::jsonb)
                    FROM public.email_campaigns c WHERE c.status IN ('sending', 'paused'))
    )
$$;


-- Same as 20261028150000_email_pick_people.sql, with the reminder details on every row.
CREATE OR REPLACE FUNCTION public.email_report_audience(
    p_filter jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0,
    p_cooldown integer DEFAULT 7, p_cap integer DEFAULT 3)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH f AS (
        SELECT nullif(p_filter->>'template', '') AS template,
               CASE WHEN jsonb_typeof(p_filter->'stages') = 'array' AND jsonb_array_length(p_filter->'stages') > 0
                    THEN ARRAY(SELECT jsonb_array_elements_text(p_filter->'stages')) END AS stages,
               CASE WHEN jsonb_typeof(p_filter->'whos') = 'array' AND jsonb_array_length(p_filter->'whos') > 0
                    THEN ARRAY(SELECT jsonb_array_elements_text(p_filter->'whos')) END AS whos,
               nullif(trim(p_filter->>'q'), '') AS q,
               nullif(p_filter->>'joined_within', '')::int AS joined_within,
               nullif(p_filter->>'quiet_for', '')::int AS quiet_for,
               coalesce(nullif(p_filter->>'show', ''), 'all') AS show,
               nullif(p_filter->>'campaign', '')::uuid AS campaign,
               CASE WHEN jsonb_typeof(p_filter->'add_ids') = 'array'
                    THEN ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(p_filter->'add_ids') x
                               WHERE x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
                    ELSE '{}'::uuid[] END AS add_ids,
               CASE WHEN jsonb_typeof(p_filter->'skip_ids') = 'array'
                    THEN ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(p_filter->'skip_ids') x
                               WHERE x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
                    ELSE '{}'::uuid[] END AS skip_ids,
               coalesce((p_filter->>'everyone')::boolean, false) AS everyone
    ),
    ppl AS (
        SELECT p.* FROM public.email_people() p, f
        WHERE p.who <> 'taker' OR f.everyone OR p.id = ANY (f.add_ids)
    ),
    cand AS (
        SELECT c.* FROM public.email_candidates(p_cooldown, p_cap, (SELECT template FROM f)) c
        WHERE (SELECT template FROM f) IS NOT NULL
    ),
    per AS (
        SELECT s.user_id, max(s.sent_at) AS last_at, count(*) AS n_all,
               count(*) FILTER (WHERE s.sent_at > now() - interval '30 days') AS n30
        FROM public.email_sends s WHERE s.status IN ('sending', 'sent') GROUP BY 1
    ),
    st AS (
        SELECT p.*, pe.last_at AS last_emailed_at, coalesce(pe.n_all, 0)::int AS emails_received,
               c.user_id IS NOT NULL AS in_template,
               CASE WHEN c.user_id IS NOT NULL THEN c.status
                    WHEN EXISTS (SELECT 1 FROM public.email_suppressions x WHERE x.email = p.email) THEN 'unsubscribed'
                    WHEN NOT p.email_ok THEN 'bad_email'
                    WHEN f.template IS NOT NULL AND EXISTS (
                         SELECT 1 FROM public.email_sends x
                         WHERE x.user_id = p.id AND x.template_key = f.template AND x.status IN ('sending', 'sent'))
                         THEN 'got_it'
                    WHEN pe.last_at > now() - make_interval(days => p_cooldown) THEN 'cooldown'
                    WHEN coalesce(pe.n30, 0) >= p_cap THEN 'monthly_cap'
                    ELSE 'ready' END AS status,
               CASE WHEN c.user_id IS NOT NULL THEN c.ready_at
                    ELSE pe.last_at + make_interval(days => p_cooldown) END AS ready_at
        FROM ppl p
        CROSS JOIN f
        LEFT JOIN cand c ON c.user_id = p.id
        LEFT JOIN per pe ON pe.user_id = p.id
        WHERE f.template IS NULL OR c.user_id IS NOT NULL OR p.id = ANY (f.add_ids)
    ),
    matched AS (
        SELECT s.*,
               (f.template IS NULL OR s.in_template)
               AND (f.stages IS NULL OR s.stage = ANY (f.stages))
               AND (f.whos IS NULL OR s.who = ANY (f.whos))
               AND (f.joined_within IS NULL OR s.created_at >= now() - make_interval(days => f.joined_within))
               AND (f.quiet_for IS NULL OR s.last_active_at <= now() - make_interval(days => f.quiet_for))
               AS by_rule
        FROM st s, f
    ),
    picked AS (
        SELECT m.*, (NOT m.by_rule) AS added FROM matched m, f
        WHERE (m.by_rule OR m.id = ANY (f.add_ids))
          AND NOT (m.id = ANY (f.skip_ids))
          AND (f.q IS NULL OR concat_ws(' ', m.full_name, m.email, m.latest_test_title) ILIKE '%' || f.q || '%')
          AND (f.campaign IS NULL OR NOT EXISTS (
                  SELECT 1 FROM public.email_sends x WHERE x.campaign_id = f.campaign AND x.user_id = m.id))
    ),
    shown AS (
        SELECT p.* FROM picked p, f
        WHERE f.show = 'all' OR (f.show = 'ready' AND p.status = 'ready') OR (f.show = 'skipped' AND p.status <> 'ready')
    )
    SELECT jsonb_build_object(
        'total', (SELECT count(*) FROM picked),
        'ready', (SELECT count(*) FROM picked WHERE status = 'ready'),
        'skipped', (SELECT jsonb_build_object(
                        'unsubscribed', count(*) FILTER (WHERE status = 'unsubscribed'),
                        'bad_email',    count(*) FILTER (WHERE status = 'bad_email'),
                        'got_it',       count(*) FILTER (WHERE status = 'got_it'),
                        'earlier_step', count(*) FILTER (WHERE status = 'earlier_step'),
                        'too_soon',     count(*) FILTER (WHERE status = 'too_soon'),
                        'cooldown',     count(*) FILTER (WHERE status = 'cooldown'),
                        'monthly_cap',  count(*) FILTER (WHERE status = 'monthly_cap'))
                    FROM picked),
        'shown', (SELECT count(*) FROM shown),
        'rows', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                     'id', r.id, 'email', r.email, 'full_name', r.full_name, 'designation', r.designation,
                     'who', r.who, 'stage', r.stage, 'status', r.status, 'ready_at', r.ready_at,
                     'created_at', r.created_at, 'last_active_at', r.last_active_at,
                     'tests_created', r.tests_created, 'results', r.results, 'self_attempts', r.self_attempts,
                     'latest_test_title', r.latest_test_title, 'top_test_title', r.top_test_title,
                     'top_test_results', r.top_test_results,
                     'last_seen_at', r.last_seen_at, 'new_results', r.new_results,
                     'live_test_title', r.live_test_title, 'live_test_slug', r.live_test_slug,
                     'live_since', r.live_since, 'live_test_results', r.live_test_results,
                     'last_emailed_at', r.last_emailed_at, 'emails_received', r.emails_received,
                     'added', r.added)
                     ORDER BY r.ord), '[]'::jsonb)
                 FROM (SELECT s.*, row_number() OVER (
                           ORDER BY (s.status = 'ready') DESC, s.last_active_at DESC NULLS LAST, s.created_at DESC) AS ord
                       FROM shown s
                       ORDER BY ord
                       LIMIT least(greatest(coalesce(p_limit, 50), 1), 500)
                       OFFSET greatest(coalesce(p_offset, 0), 0)) r)
    )
$$;


-- The return columns grow, so drop and make again (same name and arguments).
DROP FUNCTION IF EXISTS public.email_claim_batch(uuid, integer, integer, integer);

CREATE FUNCTION public.email_claim_batch(
    p_campaign uuid, p_limit integer DEFAULT 5, p_cooldown integer DEFAULT 7, p_cap integer DEFAULT 3)
RETURNS TABLE (
    send_id uuid, user_id uuid, email text, full_name text, who text, stage text,
    created_at timestamptz, tests_created integer, results integer,
    latest_test_title text, top_test_title text, top_test_results integer,
    last_seen_at timestamptz, new_results integer,
    live_test_title text, live_test_slug text, live_since timestamptz, live_test_results integer)
LANGUAGE plpgsql VOLATILE
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    c public.email_campaigns%ROWTYPE;
    f jsonb;
BEGIN
    SELECT * INTO c FROM public.email_campaigns WHERE id = p_campaign;
    IF NOT FOUND OR c.status <> 'sending' THEN
        RETURN;
    END IF;

    -- A batch that died half-way (server restart) must not block those people forever.
    UPDATE public.email_sends s SET status = 'failed', error = 'Interrupted before sending'
     WHERE s.status = 'sending' AND s.sent_at < now() - interval '15 minutes';

    f := c.filter || jsonb_build_object(
        'show', 'ready',
        'campaign', c.id::text,
        'template', CASE WHEN c.template_key LIKE 'custom:%' THEN '' ELSE c.template_key END);

    RETURN QUERY
    WITH pick AS (
        SELECT r FROM jsonb_array_elements(
            public.email_report_audience(f, greatest(least(coalesce(p_limit, 5), 25), 1), 0, p_cooldown, p_cap)->'rows') r
    ),
    ins AS (
        INSERT INTO public.email_sends (campaign_id, user_id, email, template_key, status)
        SELECT c.id, (p.r->>'id')::uuid, p.r->>'email', c.template_key, 'sending' FROM pick p
        ON CONFLICT DO NOTHING
        RETURNING email_sends.id, email_sends.user_id
    )
    SELECT ins.id, ins.user_id, p.r->>'email', p.r->>'full_name', p.r->>'who', p.r->>'stage',
           (p.r->>'created_at')::timestamptz, (p.r->>'tests_created')::int, (p.r->>'results')::int,
           p.r->>'latest_test_title', p.r->>'top_test_title', (p.r->>'top_test_results')::int,
           (p.r->>'last_seen_at')::timestamptz, (p.r->>'new_results')::int,
           p.r->>'live_test_title', p.r->>'live_test_slug', (p.r->>'live_since')::timestamptz,
           (p.r->>'live_test_results')::int
    FROM ins JOIN pick p ON (p.r->>'id')::uuid = ins.user_id;
END;
$$;


-- ─── 5. Lock the functions to the backend ───────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('email_people', 'email_candidates', 'email_report_overview', 'email_report_audience',
                            'email_claim_batch', 'email_report_campaigns', 'email_report_campaign',
                            'email_auto_report', 'email_rule_ok')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;
