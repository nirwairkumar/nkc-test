-- ════════════════════════════════════════════════════════════════════════════
-- Email Broadcast v2 (2026-10-24): the right email to the right person, never too often.
--
-- Tables (backend only — RLS on, no policies, so only the service role reads them):
--   email_templates     the email library (built-ins are copied in by the backend)
--   email_campaigns     one send of one email to one audience
--   email_sends         one email to one person: 'sending' (claimed) → 'sent' | 'failed'
--   email_suppressions  addresses we never email: unsubscribed, bounced, stopped by us
--
-- Who is who (email_people):
--   who   : educator · institution · corporate (company email) · student · no_role ·
--           taker (signed in only to sit someone else's exam — never marketed to).
--           Exam candidates (@guest.testoza.com), @testoza.com and admins are left out.
--   stage : new (no test) → drafted (test, nobody took it) → tried (self or 1–4 results)
--           → active (5+ results) / quiet (5+ results, nothing for 21 days).
--           Seeded example tests and the creator's own attempts don't count.
--
-- Guards (email_candidates / email_report_audience), checked again for every batch:
--   unsubscribed · bad_email · got_it (never the same email twice) · earlier_step (a
--   track goes in order) · too_soon (joined / last seen / last email of the track too
--   recently) · cooldown (any email in the last p_cooldown days) · monthly_cap
--   (p_cap emails in 30 days). Everyone else is 'ready'.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_templates (
    key              text PRIMARY KEY,
    name             text NOT NULL,
    track            text,                         -- emails of a track go out in step order; NULL = one-off
    step             integer NOT NULL DEFAULT 1,
    wait_days        integer NOT NULL DEFAULT 0,   -- after the person's previous email of the track
    stages           text[] NOT NULL DEFAULT '{}', -- empty = any stage
    audiences        text[] NOT NULL DEFAULT '{}', -- empty = everyone we may email
    min_days_joined  integer NOT NULL DEFAULT 0,
    min_days_quiet   integer NOT NULL DEFAULT 0,   -- days since the person was last active
    subject          text NOT NULL,
    preheader        text NOT NULL DEFAULT '',
    body             text NOT NULL,
    why              text NOT NULL DEFAULT '',     -- notes for whoever sends it
    is_builtin       boolean NOT NULL DEFAULT false,
    archived         boolean NOT NULL DEFAULT false,
    sort             integer NOT NULL DEFAULT 1000,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    updated_by       uuid
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key    text NOT NULL,                 -- library key, or 'custom:<id>' for an email written once
    name            text NOT NULL,
    subject         text NOT NULL,
    preheader       text NOT NULL DEFAULT '',
    body            text NOT NULL,                 -- frozen when the send starts
    filter          jsonb NOT NULL DEFAULT '{}'::jsonb,
    audience_label  text NOT NULL DEFAULT '',
    from_email      text NOT NULL,
    from_name       text NOT NULL,
    reply_to        text,
    status          text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'paused', 'done')),
    planned         integer NOT NULL DEFAULT 0,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    finished_at     timestamptz
);
CREATE INDEX IF NOT EXISTS email_campaigns_created_idx ON public.email_campaigns (created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_sends (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL,
    email         text NOT NULL,
    template_key  text NOT NULL,
    status        text NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
    error         text,
    sent_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_sends_user_idx ON public.email_sends (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_sends_campaign_idx ON public.email_sends (campaign_id, status);
CREATE INDEX IF NOT EXISTS email_sends_recent_idx ON public.email_sends (sent_at DESC) WHERE status IN ('sending', 'sent');
-- The same email never reaches the same person twice, even with two admins sending at once.
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_once ON public.email_sends (user_id, template_key)
    WHERE status IN ('sending', 'sent');

CREATE TABLE IF NOT EXISTS public.email_suppressions (
    email       text PRIMARY KEY,                  -- lower-case
    user_id     uuid,
    reason      text NOT NULL DEFAULT 'unsubscribed' CHECK (reason IN ('unsubscribed', 'bounced', 'stopped')),
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_templates, public.email_campaigns, public.email_sends, public.email_suppressions
    FROM anon, authenticated;

-- "Came back" looks up a recipient's visits after the email.
CREATE INDEX IF NOT EXISTS analytics_sessions_user_started_idx
    ON public.analytics_sessions (user_id, started_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_sessions_utm_content_idx
    ON public.analytics_sessions (utm_content) WHERE utm_content IS NOT NULL;


-- ─── 2. Who is who ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.email_people()
RETURNS TABLE (
    id uuid, email text, full_name text, designation text, who text, stage text,
    created_at timestamptz, last_active_at timestamptz,
    tests_created integer, results integer, self_attempts integer,
    latest_test_title text, top_test_title text, top_test_results integer,
    email_ok boolean)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH own AS (       -- tests a person made; seeded examples don't count
        SELECT t.id, t.created_by, t.title, t.created_at
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
               l.title AS latest_test_title, tt.title AS top_test_title, coalesce(tt.n, 0) AS top_test_results
        FROM public.profiles pr
        LEFT JOIN made m      ON m.uid = pr.id
        LEFT JOIN res r       ON r.uid = pr.id
        LEFT JOIN latest l    ON l.uid = pr.id
        LEFT JOIN top_test tt ON tt.uid = pr.id
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
                ELSE 'no_role' END,
           CASE WHEN b.tests_created = 0 THEN 'new'
                WHEN b.results = 0 AND b.self_attempts = 0 THEN 'drafted'
                WHEN b.results < 5 THEN 'tried'
                WHEN b.last_active_at < now() - interval '21 days' THEN 'quiet'
                ELSE 'active' END,
           b.created_at, b.last_active_at, b.tests_created, b.results, b.self_attempts,
           b.latest_test_title, b.top_test_title, b.top_test_results,
           b.domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
             AND b.domain NOT IN (
                 'example.com', 'example.org', 'example.net', 'test.com', 'mailinator.com', 'yopmail.com',
                 'snapmailnow.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'tempmail.com',
                 'temp-mail.org', 'trashmail.com', 'dispostable.com', 'getnada.com', 'maildrop.cc',
                 'gmial.com', 'gmai.com', 'gamil.com', 'gmal.com', 'gmail.co', 'gmail.con', 'gmail.cm',
                 'outlool.com', 'hotmial.com', 'yaho.com', 'yahooo.com')
    FROM base b
$$;


-- ─── 3. Who may get which email, now ────────────────────────────────────────

-- One row per (template, person) the template is written for. p_template narrows it to
-- one template (its track is still read, so step order and waits stay right).
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
    ),
    had AS (
        SELECT pr.*, h.sent_at AS got_at
        FROM pairs pr
        LEFT JOIN (SELECT s.user_id, s.template_key, max(s.sent_at) AS sent_at FROM sent s GROUP BY 1, 2) h
               ON h.user_id = pr.id AND h.template_key = pr.key
    ),
    track_state AS (    -- per person and track: the first step not had yet, and when the last one went
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


-- The Playbook: how many people sit where, and who each email can go to today.
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
        'templates', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                          'key', t.key, 'name', t.name, 'track', t.track, 'step', t.step, 'wait_days', t.wait_days,
                          'stages', to_jsonb(t.stages), 'audiences', to_jsonb(t.audiences),
                          'min_days_joined', t.min_days_joined, 'min_days_quiet', t.min_days_quiet,
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


-- An audience: who matches a filter, who will get the email, and why the rest won't.
-- p_filter: { template?, stages?[], whos?[], q?, joined_within?, quiet_for?, show? ('all'|'ready'|'skipped'),
--             campaign? (leave out people this campaign already tried) }
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
               nullif(p_filter->>'campaign', '')::uuid AS campaign
    ),
    ppl AS (SELECT * FROM public.email_people() p WHERE p.who <> 'taker'),
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
               CASE WHEN (SELECT template FROM f) IS NOT NULL THEN c.status
                    WHEN EXISTS (SELECT 1 FROM public.email_suppressions x WHERE x.email = p.email) THEN 'unsubscribed'
                    WHEN NOT p.email_ok THEN 'bad_email'
                    WHEN pe.last_at > now() - make_interval(days => p_cooldown) THEN 'cooldown'
                    WHEN coalesce(pe.n30, 0) >= p_cap THEN 'monthly_cap'
                    ELSE 'ready' END AS status,
               CASE WHEN (SELECT template FROM f) IS NOT NULL THEN c.ready_at
                    ELSE pe.last_at + make_interval(days => p_cooldown) END AS ready_at
        FROM ppl p
        LEFT JOIN cand c ON c.user_id = p.id
        LEFT JOIN per pe ON pe.user_id = p.id
        WHERE (SELECT template FROM f) IS NULL OR c.user_id IS NOT NULL
    ),
    picked AS (
        SELECT s.* FROM st s, f
        WHERE (f.stages IS NULL OR s.stage = ANY (f.stages))
          AND (f.whos IS NULL OR s.who = ANY (f.whos))
          AND (f.joined_within IS NULL OR s.created_at >= now() - make_interval(days => f.joined_within))
          AND (f.quiet_for IS NULL OR s.last_active_at <= now() - make_interval(days => f.quiet_for))
          AND (f.q IS NULL OR concat_ws(' ', s.full_name, s.email, s.latest_test_title) ILIKE '%' || f.q || '%')
          AND (f.campaign IS NULL OR NOT EXISTS (
                  SELECT 1 FROM public.email_sends x WHERE x.campaign_id = f.campaign AND x.user_id = s.id))
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
                     'last_emailed_at', r.last_emailed_at, 'emails_received', r.emails_received)
                     ORDER BY r.ord), '[]'::jsonb)
                 FROM (SELECT s.*, row_number() OVER (
                           ORDER BY (s.status = 'ready') DESC, s.last_active_at DESC NULLS LAST, s.created_at DESC) AS ord
                       FROM shown s
                       ORDER BY ord
                       LIMIT least(greatest(coalesce(p_limit, 50), 1), 500)
                       OFFSET greatest(coalesce(p_offset, 0), 0)) r)
    )
$$;


-- Claim the next people of a campaign: the rows are reserved ('sending') in one statement,
-- so two admins sending the same email can never reach the same person twice.
CREATE OR REPLACE FUNCTION public.email_claim_batch(
    p_campaign uuid, p_limit integer DEFAULT 5, p_cooldown integer DEFAULT 7, p_cap integer DEFAULT 3)
RETURNS TABLE (
    send_id uuid, user_id uuid, email text, full_name text, who text, stage text,
    created_at timestamptz, tests_created integer, results integer,
    latest_test_title text, top_test_title text, top_test_results integer)
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
           p.r->>'latest_test_title', p.r->>'top_test_title', (p.r->>'top_test_results')::int
    FROM ins JOIN pick p ON (p.r->>'id')::uuid = ins.user_id;
END;
$$;


-- ─── 4. What happened after ─────────────────────────────────────────────────
-- came_back: a visit or a new test within 7 days of their email · made_test: a new test
-- within 14 days · clicked: a visit through a link of this email (utm_content = the
-- campaign's first 8 characters) · unsubscribed after receiving it.

CREATE OR REPLACE FUNCTION public.email_report_campaigns(p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH page AS (
        SELECT * FROM public.email_campaigns
        ORDER BY created_at DESC
        LIMIT least(greatest(coalesce(p_limit, 30), 1), 100) OFFSET greatest(coalesce(p_offset, 0), 0)
    ),
    s AS (SELECT x.* FROM public.email_sends x WHERE x.campaign_id IN (SELECT id FROM page)),
    outcome AS (
        SELECT s.campaign_id, s.user_id,
               EXISTS (SELECT 1 FROM public.analytics_sessions a
                        WHERE a.user_id = s.user_id AND NOT a.is_bot
                          AND a.started_at > s.sent_at AND a.started_at < s.sent_at + interval '7 days')
               OR EXISTS (SELECT 1 FROM public.tests t
                           WHERE t.created_by = s.user_id
                             AND t.created_at > s.sent_at AND t.created_at < s.sent_at + interval '7 days') AS came_back,
               EXISTS (SELECT 1 FROM public.tests t
                        WHERE t.created_by = s.user_id
                          AND coalesce(t.settings->>'is_user_example', 'false') <> 'true'
                          AND t.created_at > s.sent_at AND t.created_at < s.sent_at + interval '14 days') AS made_test,
               EXISTS (SELECT 1 FROM public.email_suppressions u
                        WHERE u.email = s.email AND u.reason = 'unsubscribed' AND u.created_at > s.sent_at) AS unsubscribed
        FROM s WHERE s.status = 'sent'
    )
    SELECT jsonb_build_object(
        'total', (SELECT count(*) FROM public.email_campaigns),
        'rows', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                     'id', c.id, 'name', c.name, 'template_key', c.template_key, 'subject', c.subject,
                     'audience_label', c.audience_label, 'status', c.status, 'planned', c.planned,
                     'from_email', c.from_email, 'from_name', c.from_name,
                     'created_at', c.created_at, 'finished_at', c.finished_at,
                     'sent',         (SELECT count(*) FROM s WHERE s.campaign_id = c.id AND s.status = 'sent'),
                     'failed',       (SELECT count(*) FROM s WHERE s.campaign_id = c.id AND s.status = 'failed'),
                     'came_back',    (SELECT count(*) FROM outcome o WHERE o.campaign_id = c.id AND o.came_back),
                     'made_test',    (SELECT count(*) FROM outcome o WHERE o.campaign_id = c.id AND o.made_test),
                     'unsubscribed', (SELECT count(*) FROM outcome o WHERE o.campaign_id = c.id AND o.unsubscribed),
                     'clicked',      (SELECT count(DISTINCT coalesce(a.user_id::text, a.visitor_id::text))
                                        FROM public.analytics_sessions a
                                       WHERE a.utm_content = left(c.id::text, 8) AND NOT a.is_bot))
                     ORDER BY c.created_at DESC), '[]'::jsonb)
                 FROM page c)
    )
$$;


CREATE OR REPLACE FUNCTION public.email_report_campaign(p_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH c AS (SELECT * FROM public.email_campaigns WHERE id = p_id),
    rec AS (
        SELECT s.id, s.user_id, s.email, s.status, s.error, s.sent_at,
               pr.full_name, pr.designation,
               s.status = 'sent' AND (
                   EXISTS (SELECT 1 FROM public.analytics_sessions a
                            WHERE a.user_id = s.user_id AND NOT a.is_bot
                              AND a.started_at > s.sent_at AND a.started_at < s.sent_at + interval '7 days')
                   OR EXISTS (SELECT 1 FROM public.tests t
                               WHERE t.created_by = s.user_id
                                 AND t.created_at > s.sent_at AND t.created_at < s.sent_at + interval '7 days')) AS came_back,
               s.status = 'sent' AND EXISTS (
                   SELECT 1 FROM public.analytics_sessions a
                    WHERE a.user_id = s.user_id AND a.utm_content = left(p_id::text, 8)) AS clicked,
               EXISTS (SELECT 1 FROM public.email_suppressions u
                        WHERE u.email = s.email AND u.reason = 'unsubscribed' AND u.created_at > s.sent_at) AS unsubscribed
        FROM public.email_sends s
        LEFT JOIN public.profiles pr ON pr.id = s.user_id
        WHERE s.campaign_id = p_id
    )
    SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM c) THEN NULL ELSE jsonb_build_object(
        'campaign', (SELECT to_jsonb(c) FROM c),
        'recipients', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                           'id', r.id, 'user_id', r.user_id, 'email', r.email, 'full_name', r.full_name,
                           'designation', r.designation, 'status', r.status, 'error', r.error, 'sent_at', r.sent_at,
                           'came_back', r.came_back, 'clicked', r.clicked, 'unsubscribed', r.unsubscribed)
                           ORDER BY r.sent_at DESC), '[]'::jsonb) FROM rec r)
    ) END
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
                            'email_claim_batch', 'email_report_campaigns', 'email_report_campaign')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;
