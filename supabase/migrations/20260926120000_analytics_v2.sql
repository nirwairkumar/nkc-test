-- ════════════════════════════════════════════════════════════════════════════
-- Analytics v2 — trustworthy traffic + growth metrics for the admin panel.
-- Design & rationale: documentation/2026-09-26-analytics-v2.md
--
-- Why a new set of tables instead of fixing visitors / sessions / page_views:
--   * Visitor identity there was a device "fingerprint" that merged thousands of
--     people (one row owns 35% of all page views). Those rows cannot be split
--     again, so v2 starts clean; the legacy tables are left untouched.
--   * Nothing ever filled time_on_page / duration_secs / exit_page.
--
-- Access model (same as C3, 20260920120000): only the FastAPI backend touches
-- these tables, with the service-role key (BYPASSRLS). RLS is ON with NO
-- policies and anon/authenticated have no privileges. Every function is
-- SECURITY INVOKER and executable by service_role only.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 0. test_registrations.started_at was stored 5h30m in the future ─────────
-- DEFAULT (now() AT TIME ZONE 'asia/kolkata') yields IST wall-clock time as a
-- timestamp WITHOUT time zone, which Postgres (TimeZone = UTC) then stores as if
-- it were UTC. Every row is +05:30. Only run the correction while that default
-- is still in place, so re-running this file never shifts rows twice.
DO $$
DECLARE v_default text;
BEGIN
    SELECT pg_get_expr(d.adbin, d.adrelid) INTO v_default
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE d.adrelid = 'public.test_registrations'::regclass AND a.attname = 'started_at';

    IF v_default ILIKE '%asia/kolkata%' THEN
        UPDATE public.test_registrations
           SET started_at = started_at - interval '5 hours 30 minutes'
         WHERE started_at IS NOT NULL;
        ALTER TABLE public.test_registrations ALTER COLUMN started_at SET DEFAULT now();
        RAISE NOTICE 'analytics v2: corrected test_registrations.started_at (-05:30) and fixed its default';
    END IF;
END $$;


-- ─── 1. Tables ───────────────────────────────────────────────────────────────

-- One row per browser (random id from the tz_vid cookie — never a fingerprint).
CREATE TABLE IF NOT EXISTS public.analytics_visitors (
    id                   uuid PRIMARY KEY,
    first_seen_at        timestamptz NOT NULL DEFAULT now(),
    last_seen_at         timestamptz NOT NULL DEFAULT now(),
    user_id              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    identified_at        timestamptz,
    is_internal          boolean NOT NULL DEFAULT false,
    is_bot               boolean NOT NULL DEFAULT false,
    sessions_count       integer NOT NULL DEFAULT 0,
    pageviews_count      integer NOT NULL DEFAULT 0,
    -- first touch (set once, from the visitor's first session)
    first_host           text,
    first_landing_path   text,
    first_channel        text,
    first_referrer_host  text,
    first_utm_source     text,
    first_utm_medium     text,
    first_utm_campaign   text,
    -- last known
    country_code         text,
    region               text,
    city                 text,
    device_type          text,
    browser              text,
    os                   text
);

-- One row per visit: 30 minutes of inactivity ends it (tz_sid cookie, shared by
-- all tabs and *.testoza.com subdomains).
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
    id                uuid PRIMARY KEY,
    visitor_id        uuid NOT NULL REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
    user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    started_at        timestamptz NOT NULL DEFAULT now(),
    last_seen_at      timestamptz NOT NULL DEFAULT now(),
    host              text NOT NULL,
    entry_path        text NOT NULL,
    exit_path         text,
    pageviews         integer NOT NULL DEFAULT 0,
    events            integer NOT NULL DEFAULT 0,
    engaged_ms        bigint  NOT NULL DEFAULT 0,
    -- GA4 definition: >= 10 s of active time, or >= 2 page views, or a key event.
    is_engaged        boolean NOT NULL DEFAULT false,
    is_new_visitor    boolean NOT NULL DEFAULT false,
    channel           text NOT NULL DEFAULT 'Direct',
    referrer_host     text,
    referrer_path     text,
    utm_source        text,
    utm_medium        text,
    utm_campaign      text,
    utm_term          text,
    utm_content       text,
    country_code      text,
    region            text,
    city              text,
    device_type       text,
    browser           text,
    browser_version   text,
    os                text,
    os_version        text,
    screen            text,
    language          text,
    timezone          text,
    is_bot            boolean NOT NULL DEFAULT false,
    bot_reason        text,
    is_internal       boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.analytics_pageviews (
    id           uuid PRIMARY KEY,
    session_id   uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    visitor_id   uuid NOT NULL,
    ts           timestamptz NOT NULL DEFAULT now(),
    seq          integer NOT NULL DEFAULT 1,
    host         text NOT NULL,
    path         text NOT NULL,          -- never the query string (tokens, PII)
    title        text,
    engaged_ms   integer NOT NULL DEFAULT 0,
    scroll_pct   smallint
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts           timestamptz NOT NULL DEFAULT now(),
    session_id   uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    visitor_id   uuid NOT NULL,
    pageview_id  uuid,
    name         text NOT NULL,
    host         text,
    path         text,
    props        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS analytics_sessions_started_idx    ON public.analytics_sessions (started_at);
CREATE INDEX IF NOT EXISTS analytics_sessions_last_seen_idx  ON public.analytics_sessions (last_seen_at);
CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_idx    ON public.analytics_sessions (visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_user_idx       ON public.analytics_sessions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_pageviews_session_idx   ON public.analytics_pageviews (session_id, seq);
CREATE INDEX IF NOT EXISTS analytics_pageviews_ts_idx        ON public.analytics_pageviews (ts);
CREATE INDEX IF NOT EXISTS analytics_events_ts_idx           ON public.analytics_events (ts);
CREATE INDEX IF NOT EXISTS analytics_events_name_ts_idx      ON public.analytics_events (name, ts);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx      ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_visitors_user_idx       ON public.analytics_visitors (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.analytics_visitors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.analytics_visitors, public.analytics_sessions,
              public.analytics_pageviews, public.analytics_events
       FROM anon, authenticated;
GRANT ALL ON public.analytics_visitors, public.analytics_sessions,
             public.analytics_pageviews, public.analytics_events
      TO service_role;


-- ─── 2. Small helpers ────────────────────────────────────────────────────────

-- Team accounts (listed in public.admins). Their sign-ups, tests and attempts
-- are excluded from growth numbers.
CREATE OR REPLACE FUNCTION public.analytics_team_user_ids()
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT p.id FROM public.profiles p
    JOIN public.admins a ON lower(a.email) = lower(p.email)
$$;

-- What kind of page a visit landed on.
CREATE OR REPLACE FUNCTION public.analytics_landing_type(p_sitename text, p_path text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_sitename LIKE 'pdf.%' OR p_path = '/convert' OR p_path ~ '^/pdf(/|$)' THEN 'PDF tools'
        WHEN p_sitename LIKE 'blog.%' OR p_sitename LIKE 'news.%'
             OR p_path ~ '^/(news|blog|posts)(/|$)' THEN 'Blog'
        WHEN p_path ~ '^/(test|live|test-intro|combined-intro|combined-break)/' THEN 'Test link'
        WHEN p_path ~ '^/(results|test-submitted|solutions|test-analysis|feedback)(/|$)' THEN 'Results'
        WHEN p_path ~ '^/(explore|more-tests|tests|creator)(/|$)' THEN 'Discovery'
        WHEN p_path ~ '^/(login|auth|auth-error|onboarding|update-password)(/|$)' THEN 'Sign-in'
        WHEN p_path = '/'
             OR p_path ~ '^/(about|pricing|premium|support|privacy-policy|terms-and-conditions|user-guide|compare|ai-question-generator|assessment-platform|auto-grading-software|exam-software-for-schools|mcq-test-maker|online-exam-software|online-proctoring-software|online-quiz-maker|online-test-for-coaching|online-test-maker|pdf-to-quiz|quiz-creator|white-label-test-platform|youtube-to-quiz|survey)(/|$)'
             THEN 'Marketing'
        ELSE 'App'
    END
$$;

-- Which site a host belongs to: 'main' (testoza.com + app.testoza.com), 'pdf', 'blog'.
CREATE OR REPLACE FUNCTION public.analytics_site_of(p_sitename text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_sitename LIKE 'pdf.%' THEN 'pdf'
        WHEN p_sitename LIKE 'blog.%' OR p_sitename LIKE 'news.%' THEN 'blog'
        ELSE 'main'
    END
$$;

-- The host shown for a site group (app.testoza.com pages count as testoza.com).
CREATE OR REPLACE FUNCTION public.analytics_site_label(p_hostname text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE public.analytics_site_of(p_hostname)
        WHEN 'pdf' THEN 'pdf.testoza.com'
        WHEN 'blog' THEN 'blog.testoza.com'
        ELSE 'testoza.com'
    END
$$;

-- Every moment a registered (non-team) user did something, from all sources:
-- tracked visits plus product actions (these cover history before tracking v2).
CREATE OR REPLACE FUNCTION public.analytics_user_activity(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (user_id uuid, ts timestamptz)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    act AS (
        SELECT pr.id AS user_id, pr.created_at AS ts FROM public.profiles pr
         WHERE pr.created_at >= p_from AND pr.created_at < p_to
        UNION ALL
        SELECT s.user_id, s.started_at FROM public.analytics_sessions s
         WHERE s.user_id IS NOT NULL AND NOT s.is_bot AND s.started_at >= p_from AND s.started_at < p_to
        UNION ALL
        SELECT t.created_by, t.created_at FROM public.tests t
         WHERE t.created_by IS NOT NULL AND t.created_at >= p_from AND t.created_at < p_to
        UNION ALL
        SELECT ut.user_id, ut.created_at FROM public.user_tests ut
         WHERE ut.user_id IS NOT NULL AND ut.created_at >= p_from AND ut.created_at < p_to
        UNION ALL
        SELECT r.user_id, r.started_at FROM public.test_registrations r
         WHERE r.started_at >= p_from AND r.started_at < p_to
        UNION ALL
        SELECT r.user_id, r.last_active_at FROM public.test_registrations r
         WHERE r.last_active_at >= p_from AND r.last_active_at < p_to
        UNION ALL
        SELECT g.user_id, g.created_at FROM public.ai_generation_history g
         WHERE g.user_id IS NOT NULL AND g.created_at >= p_from AND g.created_at < p_to
    )
    SELECT act.user_id, act.ts FROM act
    WHERE act.user_id NOT IN (SELECT team.user_id FROM team)
$$;

-- Human, external visits that started in [p_from, p_to). With p_site ('main',
-- 'pdf', 'blog'), only visits that viewed at least one page on that site.
CREATE OR REPLACE FUNCTION public.analytics_f_sessions(p_from timestamptz, p_to timestamptz, p_site text)
RETURNS SETOF public.analytics_sessions
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT s.* FROM public.analytics_sessions s
    WHERE s.started_at >= p_from AND s.started_at < p_to
      AND NOT s.is_bot AND NOT s.is_internal
      AND (p_site IS NULL OR public.analytics_site_of(s.host) = p_site
           OR EXISTS (SELECT 1 FROM public.analytics_pageviews pv
                      WHERE pv.session_id = s.id AND public.analytics_site_of(pv.host) = p_site))
$$;

-- Human, external page views in [p_from, p_to), optionally on one site (p_site).
CREATE OR REPLACE FUNCTION public.analytics_f_pageviews(p_from timestamptz, p_to timestamptz, p_site text)
RETURNS SETOF public.analytics_pageviews
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT pv.* FROM public.analytics_pageviews pv
    JOIN public.analytics_sessions s ON s.id = pv.session_id
    WHERE pv.ts >= p_from AND pv.ts < p_to
      AND NOT s.is_bot AND NOT s.is_internal
      AND (p_site IS NULL OR public.analytics_site_of(pv.host) = p_site)
$$;


-- ─── 3. Ingest: one atomic call per beacon ───────────────────────────────────
-- p = {
--   vid, sid, uid?, host, path, internal, bot, bot_reason,
--   ctx: { channel, referrer_host, referrer_path, utm_source, utm_medium, utm_campaign,
--          utm_term, utm_content, country_code, region, city, device_type, browser,
--          browser_version, os, os_version, screen, language, timezone },
--   events: [ {t:'pageview', id, path, title}
--           | {t:'engagement', id, ms, scroll, title}
--           | {t:'event', name, props, pvid, path}
--           | {t:'identify'} ]
-- }
-- The backend validates and enriches the payload; this function trusts its shape
-- but not its ownership: engagement updates only touch page views of this session.
CREATE OR REPLACE FUNCTION public.analytics_ingest(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_vid            uuid := (p->>'vid')::uuid;
    v_sid            uuid := (p->>'sid')::uuid;
    v_uid            uuid := NULLIF(p->>'uid', '')::uuid;
    v_host           text := left(coalesce(NULLIF(p->>'host', ''), 'unknown'), 100);
    v_ctx            jsonb := coalesce(p->'ctx', '{}'::jsonb);
    v_bot            boolean := coalesce((p->>'bot')::boolean, false);
    v_internal       boolean := coalesce((p->>'internal')::boolean, false);
    v_now            timestamptz := now();
    v_first_path     text;
    v_owner          uuid;
    v_new_visitor    boolean;
    v_new_session    boolean;
    v_visitor_flag   boolean;
    e                jsonb;
    v_rows           integer;
    v_old_ms         integer;
    v_new_ms         integer;
    v_pv_id          uuid;
BEGIN
    IF v_vid IS NULL OR v_sid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'missing ids');
    END IF;

    -- Link only real accounts; an unknown id is dropped instead of failing the FK.
    IF v_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
        v_uid := NULL;
    END IF;

    -- A device an admin signs in on is internal traffic from then on.
    IF v_uid IS NOT NULL AND v_uid IN (SELECT user_id FROM public.analytics_team_user_ids()) THEN
        v_internal := true;
    END IF;

    SELECT x->>'path' INTO v_first_path
    FROM jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) WITH ORDINALITY AS t(x, n)
    WHERE x->>'t' = 'pageview'
    ORDER BY n
    LIMIT 1;
    v_first_path := left(coalesce(v_first_path, NULLIF(p->>'path', ''), '/'), 500);

    -- A visit always stays with the browser that started it.
    SELECT visitor_id INTO v_owner FROM public.analytics_sessions WHERE id = v_sid;
    IF v_owner IS NOT NULL THEN
        v_vid := v_owner;
    ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) x
                      WHERE x->>'t' IN ('pageview', 'event')) THEN
        -- Only a page view or an action can start a visit; a stray engagement or
        -- identify ping for an unknown visit would otherwise create an empty one.
        RETURN jsonb_build_object('ok', true, 'skipped', true);
    END IF;

    INSERT INTO public.analytics_visitors AS v (
        id, first_seen_at, last_seen_at, user_id, identified_at, is_internal, is_bot,
        first_host, first_landing_path, first_channel, first_referrer_host,
        first_utm_source, first_utm_medium, first_utm_campaign,
        country_code, region, city, device_type, browser, os
    ) VALUES (
        v_vid, v_now, v_now, v_uid, CASE WHEN v_uid IS NOT NULL THEN v_now END, v_internal, v_bot,
        v_host, v_first_path, coalesce(v_ctx->>'channel', 'Direct'), v_ctx->>'referrer_host',
        v_ctx->>'utm_source', v_ctx->>'utm_medium', v_ctx->>'utm_campaign',
        v_ctx->>'country_code', v_ctx->>'region', v_ctx->>'city',
        v_ctx->>'device_type', v_ctx->>'browser', v_ctx->>'os'
    )
    ON CONFLICT (id) DO UPDATE SET
        last_seen_at  = EXCLUDED.last_seen_at,
        user_id       = coalesce(EXCLUDED.user_id, v.user_id),
        identified_at = CASE WHEN EXCLUDED.user_id IS NOT NULL AND v.user_id IS DISTINCT FROM EXCLUDED.user_id
                             THEN EXCLUDED.last_seen_at ELSE v.identified_at END,
        is_internal   = v.is_internal OR EXCLUDED.is_internal,
        is_bot        = v.is_bot OR EXCLUDED.is_bot,
        country_code  = coalesce(EXCLUDED.country_code, v.country_code),
        region        = coalesce(EXCLUDED.region, v.region),
        city          = coalesce(EXCLUDED.city, v.city),
        device_type   = coalesce(EXCLUDED.device_type, v.device_type),
        browser       = coalesce(EXCLUDED.browser, v.browser),
        os            = coalesce(EXCLUDED.os, v.os)
    RETURNING (xmax = 0), v.is_internal INTO v_new_visitor, v_visitor_flag;

    -- Internal is sticky per device: a signed-out visit from an admin's phone stays internal.
    v_internal := v_internal OR v_visitor_flag;

    INSERT INTO public.analytics_sessions AS s (
        id, visitor_id, user_id, started_at, last_seen_at, host, entry_path, exit_path,
        is_new_visitor, channel, referrer_host, referrer_path,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        country_code, region, city, device_type, browser, browser_version, os, os_version,
        screen, language, timezone, is_bot, bot_reason, is_internal
    ) VALUES (
        v_sid, v_vid, v_uid, v_now, v_now, v_host, v_first_path, v_first_path,
        v_new_visitor, coalesce(v_ctx->>'channel', 'Direct'), v_ctx->>'referrer_host', v_ctx->>'referrer_path',
        v_ctx->>'utm_source', v_ctx->>'utm_medium', v_ctx->>'utm_campaign', v_ctx->>'utm_term', v_ctx->>'utm_content',
        v_ctx->>'country_code', v_ctx->>'region', v_ctx->>'city',
        v_ctx->>'device_type', v_ctx->>'browser', v_ctx->>'browser_version', v_ctx->>'os', v_ctx->>'os_version',
        v_ctx->>'screen', v_ctx->>'language', v_ctx->>'timezone',
        v_bot, CASE WHEN v_bot THEN left(p->>'bot_reason', 100) END, v_internal
    )
    ON CONFLICT (id) DO UPDATE SET
        last_seen_at = EXCLUDED.last_seen_at,
        user_id      = coalesce(EXCLUDED.user_id, s.user_id),
        is_internal  = s.is_internal OR EXCLUDED.is_internal,
        is_bot       = s.is_bot OR EXCLUDED.is_bot,
        bot_reason   = coalesce(s.bot_reason, EXCLUDED.bot_reason)
    RETURNING (xmax = 0) INTO v_new_session;

    IF v_new_session THEN
        UPDATE public.analytics_visitors SET sessions_count = sessions_count + 1 WHERE id = v_vid;
    END IF;

    FOR e IN
        SELECT x FROM jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) WITH ORDINALITY AS t(x, n) ORDER BY n
    LOOP
        CASE e->>'t'
        WHEN 'pageview' THEN
            INSERT INTO public.analytics_pageviews (id, session_id, visitor_id, ts, seq, host, path, title)
            SELECT (e->>'id')::uuid, v_sid, v_vid, v_now, s.pageviews + 1, v_host,
                   left(coalesce(NULLIF(e->>'path', ''), '/'), 500), left(NULLIF(e->>'title', ''), 300)
            FROM public.analytics_sessions s WHERE s.id = v_sid
            ON CONFLICT (id) DO NOTHING;
            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows > 0 THEN
                UPDATE public.analytics_sessions
                   SET pageviews    = pageviews + 1,
                       exit_path    = left(coalesce(NULLIF(e->>'path', ''), '/'), 500),
                       is_engaged   = is_engaged OR pageviews + 1 >= 2,
                       last_seen_at = v_now
                 WHERE id = v_sid;
                UPDATE public.analytics_visitors SET pageviews_count = pageviews_count + 1 WHERE id = v_vid;
            END IF;

        WHEN 'engagement' THEN
            v_pv_id := NULLIF(e->>'id', '')::uuid;
            SELECT engaged_ms INTO v_old_ms
              FROM public.analytics_pageviews
             WHERE id = v_pv_id AND session_id = v_sid
               FOR UPDATE;
            IF FOUND THEN
                -- Pings carry the running total for the page, so repeats are harmless.
                v_new_ms := greatest(v_old_ms, least(greatest(coalesce((e->>'ms')::integer, 0), 0), 4 * 3600 * 1000));
                UPDATE public.analytics_pageviews
                   SET engaged_ms = v_new_ms,
                       scroll_pct = greatest(coalesce(scroll_pct, 0),
                                             least(greatest(coalesce((e->>'scroll')::integer, 0), 0), 100)),
                       title      = coalesce(left(NULLIF(e->>'title', ''), 300), title)
                 WHERE id = v_pv_id;
                IF v_new_ms > v_old_ms THEN
                    UPDATE public.analytics_sessions
                       SET engaged_ms   = engaged_ms + (v_new_ms - v_old_ms),
                           is_engaged   = is_engaged OR engaged_ms + (v_new_ms - v_old_ms) >= 10000,
                           last_seen_at = v_now
                     WHERE id = v_sid;
                END IF;
            END IF;

        WHEN 'event' THEN
            INSERT INTO public.analytics_events (ts, session_id, visitor_id, pageview_id, name, host, path, props)
            VALUES (v_now, v_sid, v_vid, NULLIF(e->>'pvid', '')::uuid, left(e->>'name', 40), v_host,
                    left(coalesce(NULLIF(e->>'path', ''), v_first_path), 500),
                    CASE WHEN jsonb_typeof(e->'props') = 'object' THEN e->'props' ELSE '{}'::jsonb END);
            UPDATE public.analytics_sessions
               SET events = events + 1, is_engaged = true, last_seen_at = v_now
             WHERE id = v_sid;

        ELSE
            NULL;  -- 'identify' needs nothing beyond the uid handled above
        END CASE;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'new_session', v_new_session);
END $$;


-- ─── 4. Reports (all bucketing in Asia/Kolkata) ──────────────────────────────

-- Headline numbers for a period. Called for the period and the one before it.
CREATE OR REPLACE FUNCTION public.analytics_report_summary(p_from timestamptz, p_to timestamptz, p_site text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH s AS (SELECT * FROM public.analytics_f_sessions(p_from, p_to, p_site)),
    pv AS (SELECT * FROM public.analytics_f_pageviews(p_from, p_to, p_site)),
    vis AS (
        SELECT DISTINCT s.visitor_id, v.first_seen_at
        FROM s JOIN public.analytics_visitors v ON v.id = s.visitor_id
    ),
    team AS (SELECT user_id FROM public.analytics_team_user_ids())
    SELECT jsonb_build_object(
        'visitors',            (SELECT count(*) FROM vis),
        'new_visitors',        (SELECT count(*) FROM vis WHERE first_seen_at >= p_from),
        'returning_visitors',  (SELECT count(*) FROM vis WHERE first_seen_at < p_from),
        'sessions',            (SELECT count(*) FROM s),
        'engaged_sessions',    (SELECT count(*) FROM s WHERE is_engaged),
        'signed_in_sessions',  (SELECT count(*) FROM s WHERE user_id IS NOT NULL),
        'pageviews',           (SELECT count(*) FROM pv),
        'session_pageviews',   (SELECT coalesce(sum(pageviews), 0) FROM s),
        'engaged_ms_total',    (SELECT coalesce(sum(engaged_ms), 0) FROM s),
        'test_link_sessions',  (SELECT count(*) FROM s WHERE public.analytics_landing_type(host, entry_path) = 'Test link'),
        'signups',             (SELECT count(*) FROM public.profiles pr
                                 WHERE pr.created_at >= p_from AND pr.created_at < p_to
                                   AND pr.id NOT IN (SELECT user_id FROM team)),
        'tests_created',       (SELECT count(*) FROM public.tests t
                                 WHERE t.created_at >= p_from AND t.created_at < p_to
                                   AND (t.created_by IS NULL OR t.created_by NOT IN (SELECT user_id FROM team))),
        'test_starts',         (SELECT count(*) FROM public.test_registrations r
                                 WHERE r.started_at >= p_from AND r.started_at < p_to
                                   AND r.user_id NOT IN (SELECT user_id FROM team))
                             + (SELECT count(*) FROM public.anon_test_attempts a
                                 WHERE a.started_at >= p_from AND a.started_at < p_to),
        -- North Star: tests taken by someone other than the test's own creator or the team.
        'submissions',         (SELECT count(*) FROM public.user_tests ut
                                  LEFT JOIN public.tests t ON t.id = ut.test_id
                                 WHERE ut.created_at >= p_from AND ut.created_at < p_to
                                   AND (ut.user_id IS NULL OR ut.user_id NOT IN (SELECT user_id FROM team))
                                   AND ut.user_id IS DISTINCT FROM t.created_by)
                             + (SELECT count(*) FROM public.anon_test_attempts a
                                 WHERE a.status = 'submitted' AND a.submitted_at >= p_from AND a.submitted_at < p_to),
        'guest_submissions',   (SELECT count(*) FROM public.anon_test_attempts a
                                 WHERE a.status = 'submitted' AND a.submitted_at >= p_from AND a.submitted_at < p_to),
        'ai_generations',      (SELECT count(*) FROM public.ai_generation_history g
                                 WHERE g.created_at >= p_from AND g.created_at < p_to
                                   AND (g.user_id IS NULL OR g.user_id NOT IN (SELECT user_id FROM team))),
        'pdf_exports',         (SELECT count(*) FROM public.analytics_events ev
                                  JOIN public.analytics_sessions es ON es.id = ev.session_id
                                 WHERE ev.name = 'pdf_export' AND ev.ts >= p_from AND ev.ts < p_to
                                   AND NOT es.is_bot AND NOT es.is_internal)
    )
$$;

-- Buckets: 'hour' | 'day' | 'week' (Monday) | 'month', local IST labels.
CREATE OR REPLACE FUNCTION public.analytics_report_timeseries(
    p_from timestamptz, p_to timestamptz, p_site text DEFAULT NULL, p_bucket text DEFAULT 'day')
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tz   constant text := 'Asia/Kolkata';
    v_step interval;
    v_out  jsonb;
BEGIN
    IF p_bucket NOT IN ('hour', 'day', 'week', 'month') THEN
        RAISE EXCEPTION 'invalid bucket %', p_bucket;
    END IF;
    v_step := ('1 ' || p_bucket)::interval;

    WITH b AS (
        SELECT gs AS k
        FROM generate_series(date_trunc(p_bucket, p_from AT TIME ZONE v_tz),
                             (p_to - interval '1 microsecond') AT TIME ZONE v_tz,
                             v_step) gs
    ),
    s AS (
        SELECT date_trunc(p_bucket, started_at AT TIME ZONE v_tz) AS k,
               visitor_id, is_engaged, engaged_ms
        FROM public.analytics_f_sessions(p_from, p_to, p_site)
    ),
    s_agg AS (
        SELECT k, count(DISTINCT visitor_id) AS visitors, count(*) AS sessions,
               count(*) FILTER (WHERE is_engaged) AS engaged_sessions,
               round(avg(engaged_ms))::bigint AS avg_engaged_ms
        FROM s GROUP BY k
    ),
    pv_agg AS (
        SELECT date_trunc(p_bucket, ts AT TIME ZONE v_tz) AS k, count(*) AS pageviews
        FROM public.analytics_f_pageviews(p_from, p_to, p_site) GROUP BY 1
    ),
    team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    su_agg AS (
        SELECT date_trunc(p_bucket, created_at AT TIME ZONE v_tz) AS k, count(*) AS signups
        FROM public.profiles
        WHERE created_at >= p_from AND created_at < p_to AND id NOT IN (SELECT user_id FROM team)
        GROUP BY 1
    ),
    sub AS (
        SELECT ut.created_at AS ts FROM public.user_tests ut
          LEFT JOIN public.tests t ON t.id = ut.test_id
         WHERE ut.created_at >= p_from AND ut.created_at < p_to
           AND (ut.user_id IS NULL OR ut.user_id NOT IN (SELECT user_id FROM team))
           AND ut.user_id IS DISTINCT FROM t.created_by
        UNION ALL
        SELECT a.submitted_at FROM public.anon_test_attempts a
         WHERE a.status = 'submitted' AND a.submitted_at >= p_from AND a.submitted_at < p_to
    ),
    sub_agg AS (
        SELECT date_trunc(p_bucket, ts AT TIME ZONE v_tz) AS k, count(*) AS submissions FROM sub GROUP BY 1
    ),
    tc_agg AS (
        SELECT date_trunc(p_bucket, created_at AT TIME ZONE v_tz) AS k, count(*) AS tests_created
        FROM public.tests
        WHERE created_at >= p_from AND created_at < p_to
          AND (created_by IS NULL OR created_by NOT IN (SELECT user_id FROM team))
        GROUP BY 1
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        't',                to_char(b.k, 'YYYY-MM-DD"T"HH24:MI'),
        'visitors',         coalesce(s_agg.visitors, 0),
        'sessions',         coalesce(s_agg.sessions, 0),
        'engaged_sessions', coalesce(s_agg.engaged_sessions, 0),
        'avg_engaged_ms',   coalesce(s_agg.avg_engaged_ms, 0),
        'pageviews',        coalesce(pv_agg.pageviews, 0),
        'signups',          coalesce(su_agg.signups, 0),
        'submissions',      coalesce(sub_agg.submissions, 0),
        'tests_created',    coalesce(tc_agg.tests_created, 0)
    ) ORDER BY b.k), '[]'::jsonb)
    INTO v_out
    FROM b
    LEFT JOIN s_agg   ON s_agg.k = b.k
    LEFT JOIN pv_agg  ON pv_agg.k = b.k
    LEFT JOIN su_agg  ON su_agg.k = b.k
    LEFT JOIN sub_agg ON sub_agg.k = b.k
    LEFT JOIN tc_agg  ON tc_agg.k = b.k;

    RETURN v_out;
END $$;

-- Top-N for one dimension. Session dimensions report visitors / visits / page
-- views / engagement; 'page' reports page views and average active time on page.
CREATE OR REPLACE FUNCTION public.analytics_report_breakdown(
    p_from timestamptz, p_to timestamptz, p_site text DEFAULT NULL,
    p_dim text DEFAULT 'channel', p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_out jsonb;
    v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 500);
BEGIN
    IF p_dim = 'page' THEN
        SELECT coalesce(jsonb_agg(r ORDER BY r.visitors DESC, r.pageviews DESC), '[]'::jsonb) INTO v_out
        FROM (
            SELECT pv.path AS key, public.analytics_site_label(pv.host) AS host,
                   mode() WITHIN GROUP (ORDER BY pv.title) AS label,
                   count(DISTINCT pv.visitor_id) AS visitors,
                   count(DISTINCT pv.session_id) AS sessions,
                   count(*) AS pageviews,
                   round(avg(pv.engaged_ms))::bigint AS avg_engaged_ms,
                   round(avg(pv.scroll_pct))::integer AS avg_scroll_pct
            FROM public.analytics_f_pageviews(p_from, p_to, p_site) pv
            GROUP BY public.analytics_site_label(pv.host), pv.path
            ORDER BY count(DISTINCT pv.visitor_id) DESC, count(*) DESC
            LIMIT v_limit
        ) r;
        RETURN v_out;
    END IF;

    IF p_dim NOT IN ('channel', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign',
                     'country', 'region', 'city', 'device', 'browser', 'os', 'screen', 'language',
                     'entry', 'exit', 'landing_type', 'host', 'visitor_type') THEN
        RAISE EXCEPTION 'invalid dimension %', p_dim;
    END IF;

    SELECT coalesce(jsonb_agg(r ORDER BY r.visitors DESC, r.sessions DESC), '[]'::jsonb) INTO v_out
    FROM (
        SELECT x.key,
               x.label,
               count(DISTINCT x.visitor_id) AS visitors,
               count(*) AS sessions,
               sum(x.pageviews) AS pageviews,
               round(100.0 * count(*) FILTER (WHERE x.is_engaged) / count(*), 1) AS engagement_rate,
               round(avg(x.engaged_ms))::bigint AS avg_engaged_ms
        FROM (
            SELECT s.visitor_id, s.pageviews, s.is_engaged, s.engaged_ms,
                   CASE p_dim
                       WHEN 'channel'      THEN s.channel
                       WHEN 'referrer'     THEN s.referrer_host
                       WHEN 'utm_source'   THEN s.utm_source
                       WHEN 'utm_medium'   THEN s.utm_medium
                       WHEN 'utm_campaign' THEN s.utm_campaign
                       WHEN 'country'      THEN coalesce(s.country_code, 'XX')
                       WHEN 'region'       THEN coalesce(s.region, 'Unknown')
                       WHEN 'city'         THEN coalesce(s.city, 'Unknown')
                       WHEN 'device'       THEN coalesce(s.device_type, 'unknown')
                       WHEN 'browser'      THEN coalesce(s.browser, 'Unknown')
                       WHEN 'os'           THEN coalesce(s.os, 'Unknown')
                       WHEN 'screen'       THEN coalesce(s.screen, 'Unknown')
                       WHEN 'language'     THEN coalesce(s.language, 'Unknown')
                       WHEN 'entry'        THEN s.entry_path
                       WHEN 'exit'         THEN coalesce(s.exit_path, s.entry_path)
                       WHEN 'landing_type' THEN public.analytics_landing_type(s.host, s.entry_path)
                       WHEN 'host'         THEN s.host
                       WHEN 'visitor_type' THEN CASE WHEN s.is_new_visitor THEN 'New' ELSE 'Returning' END
                   END AS key,
                   CASE p_dim
                       WHEN 'region' THEN coalesce(s.country_code, 'XX')
                       WHEN 'city'   THEN concat_ws(', ', s.region, s.country_code)
                       WHEN 'entry'  THEN public.analytics_site_label(s.host)
                       WHEN 'exit'   THEN public.analytics_site_label(s.host)
                   END AS label
            FROM public.analytics_f_sessions(p_from, p_to, p_site) s
        ) x
        WHERE x.key IS NOT NULL
        GROUP BY x.key, x.label
        ORDER BY count(DISTINCT x.visitor_id) DESC, count(*) DESC
        LIMIT v_limit
    ) r;
    RETURN v_out;
END $$;

-- Who is here now: visits active in the last 5 minutes.
CREATE OR REPLACE FUNCTION public.analytics_report_realtime(p_site text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH act AS (
        SELECT s.* FROM public.analytics_sessions s
        WHERE s.last_seen_at >= now() - interval '5 minutes'
          AND NOT s.is_bot AND NOT s.is_internal
          AND (p_site IS NULL OR public.analytics_site_of(s.host) = p_site
               OR EXISTS (SELECT 1 FROM public.analytics_pageviews pv
                          WHERE pv.session_id = s.id AND public.analytics_site_of(pv.host) = p_site))
    ),
    cur AS (
        SELECT DISTINCT ON (pv.session_id) pv.session_id, public.analytics_site_label(pv.host) AS host, pv.path, pv.title
        FROM public.analytics_pageviews pv
        JOIN act ON act.id = pv.session_id
        ORDER BY pv.session_id, pv.ts DESC
    ),
    mins AS (
        SELECT gs AS m FROM generate_series(date_trunc('minute', now()) - interval '29 minutes',
                                            date_trunc('minute', now()), interval '1 minute') gs
    ),
    pv30 AS (
        SELECT date_trunc('minute', pv.ts) AS m, count(*) AS n
        FROM public.analytics_f_pageviews(now() - interval '30 minutes', now() + interval '1 minute', p_site) pv
        GROUP BY 1
    )
    SELECT jsonb_build_object(
        'online',    (SELECT count(DISTINCT visitor_id) FROM act),
        'sessions',  (SELECT count(*) FROM act),
        'pages',     (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM (
                         SELECT host, path, max(title) AS title, count(*) AS visitors
                         FROM cur GROUP BY host, path ORDER BY count(*) DESC LIMIT 8) r),
        'channels',  (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM (
                         SELECT channel AS key, count(*) AS visitors
                         FROM act GROUP BY channel ORDER BY count(*) DESC LIMIT 6) r),
        'countries', (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM (
                         SELECT coalesce(country_code, 'XX') AS key, count(*) AS visitors
                         FROM act GROUP BY 1 ORDER BY count(*) DESC LIMIT 6) r),
        'minutes',   (SELECT jsonb_agg(coalesce(pv30.n, 0) ORDER BY mins.m)
                        FROM mins LEFT JOIN pv30 ON pv30.m = mins.m)
    )
$$;

-- Visits by weekday (1 = Monday) × hour, IST.
CREATE OR REPLACE FUNCTION public.analytics_report_heatmap(p_from timestamptz, p_to timestamptz, p_site text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(jsonb_agg(r ORDER BY r.dow, r.hour), '[]'::jsonb)
    FROM (
        SELECT extract(isodow FROM started_at AT TIME ZONE 'Asia/Kolkata')::int AS dow,
               extract(hour   FROM started_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
               count(*) AS sessions,
               count(DISTINCT visitor_id) AS visitors
        FROM public.analytics_f_sessions(p_from, p_to, p_site)
        GROUP BY 1, 2
    ) r
$$;

-- Visit stream. p_traffic: 'humans' (default) | 'bots' | 'internal' | 'all'.
-- Cursor pagination on started_at (p_before). p_visitor / p_user narrow to one person.
CREATE OR REPLACE FUNCTION public.analytics_report_sessions(
    p_from timestamptz, p_to timestamptz, p_site text DEFAULT NULL,
    p_traffic text DEFAULT 'humans', p_q text DEFAULT NULL,
    p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 50,
    p_visitor uuid DEFAULT NULL, p_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(jsonb_agg(r ORDER BY r.started_at DESC), '[]'::jsonb)
    FROM (
        SELECT s.id, s.visitor_id, s.user_id, s.started_at, s.last_seen_at, s.host,
               s.entry_path, s.exit_path, s.pageviews, s.events, s.engaged_ms, s.is_engaged,
               s.is_new_visitor, s.channel, s.referrer_host, s.utm_source, s.utm_medium, s.utm_campaign,
               s.country_code, s.region, s.city, s.device_type, s.browser, s.os, s.screen, s.language,
               s.is_bot, s.bot_reason, s.is_internal,
               public.analytics_landing_type(s.host, s.entry_path) AS landing_type,
               v.sessions_count AS visitor_sessions,
               v.first_seen_at  AS visitor_first_seen_at,
               pr.full_name     AS user_name,
               pr.email         AS user_email,
               pr.designation   AS user_designation
        FROM public.analytics_sessions s
        JOIN public.analytics_visitors v ON v.id = s.visitor_id
        LEFT JOIN public.profiles pr ON pr.id = coalesce(s.user_id, v.user_id)
        WHERE s.started_at >= p_from AND s.started_at < p_to
          AND (p_before IS NULL OR s.started_at < p_before)
          AND (p_visitor IS NULL OR s.visitor_id = p_visitor)
          AND (p_user IS NULL OR s.user_id = p_user OR v.user_id = p_user)
          AND CASE coalesce(p_traffic, 'humans')
                  WHEN 'bots'     THEN s.is_bot
                  WHEN 'internal' THEN s.is_internal AND NOT s.is_bot
                  WHEN 'all'      THEN true
                  ELSE NOT s.is_bot AND NOT s.is_internal
              END
          AND (p_site IS NULL OR public.analytics_site_of(s.host) = p_site
               OR EXISTS (SELECT 1 FROM public.analytics_pageviews pv
                          WHERE pv.session_id = s.id AND public.analytics_site_of(pv.host) = p_site))
          AND (p_q IS NULL OR p_q = '' OR concat_ws(' ',
                  pr.full_name, pr.email, s.city, s.region, s.country_code, s.referrer_host,
                  s.entry_path, s.exit_path, s.utm_source, s.utm_campaign, s.channel,
                  s.browser, s.os, s.device_type, s.visitor_id::text) ILIKE '%' || p_q || '%')
        ORDER BY s.started_at DESC
        LIMIT least(greatest(coalesce(p_limit, 50), 1), 200)
    ) r
$$;

-- One visit, page by page.
CREATE OR REPLACE FUNCTION public.analytics_report_session(p_session uuid)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'pages',  (SELECT coalesce(jsonb_agg(r ORDER BY r.ts, r.seq), '[]'::jsonb) FROM (
                      SELECT id, seq, ts, host, path, title, engaged_ms, scroll_pct
                      FROM public.analytics_pageviews WHERE session_id = p_session) r),
        'events', (SELECT coalesce(jsonb_agg(r ORDER BY r.ts), '[]'::jsonb) FROM (
                      SELECT id, ts, name, host, path, props, pageview_id
                      FROM public.analytics_events WHERE session_id = p_session) r)
    )
$$;

-- A person: one browser (p_visitor) or an account across all its browsers (p_user).
CREATE OR REPLACE FUNCTION public.analytics_report_person(p_visitor uuid DEFAULT NULL, p_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user uuid := p_user;
    v_out  jsonb;
BEGIN
    IF v_user IS NULL AND p_visitor IS NOT NULL THEN
        SELECT user_id INTO v_user FROM public.analytics_visitors WHERE id = p_visitor;
    END IF;

    WITH devices AS (
        SELECT v.* FROM public.analytics_visitors v
        WHERE v.id = p_visitor OR (v_user IS NOT NULL AND v.user_id = v_user)
    ),
    sess AS (
        SELECT s.* FROM public.analytics_sessions s
        WHERE s.visitor_id IN (SELECT id FROM devices) OR (v_user IS NOT NULL AND s.user_id = v_user)
    ),
    first_touch AS (
        SELECT * FROM devices ORDER BY first_seen_at LIMIT 1
    )
    SELECT jsonb_build_object(
        'user', CASE WHEN v_user IS NULL THEN NULL ELSE (
            SELECT jsonb_build_object(
                'id', pr.id, 'full_name', pr.full_name, 'email', pr.email, 'designation', pr.designation,
                'created_at', pr.created_at, 'is_premium', pr.is_premium, 'avatar_url', pr.avatar_url,
                'is_team', pr.id IN (SELECT user_id FROM public.analytics_team_user_ids()),
                'tests_created', (SELECT count(*) FROM public.tests t WHERE t.created_by = pr.id),
                'tests_taken', (SELECT count(*) FROM public.user_tests ut WHERE ut.user_id = pr.id),
                'submissions_received', (SELECT count(*) FROM public.user_tests ut JOIN public.tests t ON t.id = ut.test_id
                                          WHERE t.created_by = pr.id AND ut.user_id IS DISTINCT FROM pr.id)
                                      + (SELECT count(*) FROM public.anon_test_attempts a JOIN public.tests t ON t.id = a.test_id
                                          WHERE t.created_by = pr.id AND a.status = 'submitted'),
                'ai_generations', (SELECT count(*) FROM public.ai_generation_history g WHERE g.user_id = pr.id),
                'recent_tests', (SELECT coalesce(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb) FROM (
                    SELECT t.id, t.title, t.slug, t.created_at, t.is_public,
                           (SELECT count(*) FROM public.user_tests ut WHERE ut.test_id = t.id AND ut.user_id IS DISTINCT FROM pr.id)
                         + (SELECT count(*) FROM public.anon_test_attempts a WHERE a.test_id = t.id AND a.status = 'submitted')
                           AS submissions
                    FROM public.tests t WHERE t.created_by = pr.id
                    ORDER BY t.created_at DESC LIMIT 8) r)
            ) FROM public.profiles pr WHERE pr.id = v_user) END,
        'devices', (SELECT coalesce(jsonb_agg(r ORDER BY r.last_seen_at DESC), '[]'::jsonb) FROM (
                       SELECT id, first_seen_at, last_seen_at, sessions_count, pageviews_count, device_type,
                              browser, os, country_code, region, city, is_internal
                       FROM devices) r),
        'first_touch', (SELECT jsonb_build_object(
                           'first_seen_at', first_seen_at, 'channel', first_channel,
                           'referrer_host', first_referrer_host, 'landing_path', first_landing_path,
                           'host', first_host, 'utm_source', first_utm_source, 'utm_medium', first_utm_medium,
                           'utm_campaign', first_utm_campaign,
                           'landing_type', public.analytics_landing_type(first_host, first_landing_path))
                        FROM first_touch),
        'totals', (SELECT jsonb_build_object(
                       'sessions', count(*), 'pageviews', coalesce(sum(pageviews), 0),
                       'engaged_ms', coalesce(sum(engaged_ms), 0),
                       'first_seen_at', min(started_at), 'last_seen_at', max(last_seen_at))
                   FROM sess),
        'sessions', (SELECT coalesce(jsonb_agg(r ORDER BY r.started_at DESC), '[]'::jsonb) FROM (
                        SELECT id, started_at, last_seen_at, host, entry_path, exit_path, pageviews,
                               engaged_ms, is_engaged, channel, referrer_host, utm_source, country_code,
                               region, city, device_type, browser, os, is_internal, is_bot,
                               public.analytics_landing_type(host, entry_path) AS landing_type
                        FROM sess ORDER BY started_at DESC LIMIT 60) r)
    ) INTO v_out;

    RETURN v_out;
END $$;

-- Acquisition → activation for people who signed up in the period.
CREATE OR REPLACE FUNCTION public.analytics_report_growth(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    su AS (
        SELECT pr.id, pr.created_at, coalesce(NULLIF(pr.designation, ''), 'Not set') AS role
        FROM public.profiles pr
        WHERE pr.created_at >= p_from AND pr.created_at < p_to
          AND pr.id NOT IN (SELECT user_id FROM team)
    ),
    first_test AS (
        SELECT t.created_by AS user_id, min(t.created_at) AS at
        FROM public.tests t WHERE t.created_by IN (SELECT id FROM su)
        GROUP BY t.created_by
    ),
    first_sub AS (
        SELECT x.creator AS user_id, min(x.at) AS at FROM (
            SELECT t.created_by AS creator, ut.created_at AS at
              FROM public.user_tests ut JOIN public.tests t ON t.id = ut.test_id
             WHERE t.created_by IN (SELECT id FROM su) AND ut.user_id IS DISTINCT FROM t.created_by
            UNION ALL
            SELECT t.created_by, a.submitted_at
              FROM public.anon_test_attempts a JOIN public.tests t ON t.id = a.test_id
             WHERE t.created_by IN (SELECT id FROM su) AND a.status = 'submitted'
        ) x GROUP BY x.creator
    ),
    took AS (
        SELECT DISTINCT ut.user_id
        FROM public.user_tests ut JOIN public.tests t ON t.id = ut.test_id
        WHERE ut.user_id IN (SELECT id FROM su) AND ut.user_id IS DISTINCT FROM t.created_by
    ),
    touch AS (
        SELECT DISTINCT ON (v.user_id) v.user_id, v.first_channel, v.first_host, v.first_landing_path
        FROM public.analytics_visitors v
        WHERE v.user_id IN (SELECT id FROM su)
        ORDER BY v.user_id, v.first_seen_at
    ),
    vis AS (
        SELECT count(DISTINCT s.visitor_id) AS visitors,
               count(DISTINCT s.visitor_id) FILTER (WHERE v.first_seen_at >= p_from) AS new_visitors
        FROM public.analytics_f_sessions(p_from, p_to, NULL) s
        JOIN public.analytics_visitors v ON v.id = s.visitor_id
    )
    SELECT jsonb_build_object(
        'visitors',             (SELECT visitors FROM vis),
        'new_visitors',         (SELECT new_visitors FROM vis),
        'signups',              (SELECT count(*) FROM su),
        'created_test',         (SELECT count(*) FROM first_test),
        'got_submission',       (SELECT count(*) FROM first_sub),
        'took_test',            (SELECT count(*) FROM took),
        'median_hours_to_first_test', (
            SELECT round((percentile_cont(0.5) WITHIN GROUP (
                       ORDER BY extract(epoch FROM ft.at - su.created_at) / 3600.0))::numeric, 1)
            FROM su JOIN first_test ft ON ft.user_id = su.id),
        'by_role',     (SELECT coalesce(jsonb_agg(r ORDER BY r.signups DESC), '[]'::jsonb) FROM (
                           SELECT su.role AS key, count(*) AS signups,
                                  count(ft.user_id) AS created_test, count(fs.user_id) AS got_submission
                           FROM su LEFT JOIN first_test ft ON ft.user_id = su.id
                                   LEFT JOIN first_sub fs ON fs.user_id = su.id
                           GROUP BY su.role) r),
        'by_channel',  (SELECT coalesce(jsonb_agg(r ORDER BY r.signups DESC), '[]'::jsonb) FROM (
                           SELECT coalesce(t.first_channel, 'Not tracked') AS key, count(*) AS signups,
                                  count(ft.user_id) AS created_test
                           FROM su LEFT JOIN touch t ON t.user_id = su.id
                                   LEFT JOIN first_test ft ON ft.user_id = su.id
                           GROUP BY 1) r),
        'by_landing',  (SELECT coalesce(jsonb_agg(r ORDER BY r.signups DESC), '[]'::jsonb) FROM (
                           SELECT CASE WHEN t.user_id IS NULL THEN 'Not tracked'
                                       ELSE public.analytics_landing_type(t.first_host, t.first_landing_path) END AS key,
                                  count(*) AS signups
                           FROM su LEFT JOIN touch t ON t.user_id = su.id
                           GROUP BY 1) r)
    )
$$;

-- Registered, non-team active users per IST day: DAU, trailing-7-day WAU, trailing-30-day MAU.
CREATE OR REPLACE FUNCTION public.analytics_report_active_users(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH act AS (
        SELECT DISTINCT a.user_id, (a.ts AT TIME ZONE 'Asia/Kolkata')::date AS d
        FROM public.analytics_user_activity(p_from - interval '30 days', p_to) a
    ),
    days AS (
        SELECT gs::date AS d
        FROM generate_series((p_from AT TIME ZONE 'Asia/Kolkata')::date::timestamp,
                             ((p_to - interval '1 microsecond') AT TIME ZONE 'Asia/Kolkata')::date::timestamp,
                             interval '1 day') gs
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'd',   to_char(days.d, 'YYYY-MM-DD'),
        'dau', (SELECT count(DISTINCT user_id) FROM act WHERE act.d = days.d),
        'wau', (SELECT count(DISTINCT user_id) FROM act WHERE act.d >  days.d - 7  AND act.d <= days.d),
        'mau', (SELECT count(DISTINCT user_id) FROM act WHERE act.d >  days.d - 30 AND act.d <= days.d)
    ) ORDER BY days.d), '[]'::jsonb)
    FROM days
$$;

-- Weekly sign-up cohorts (IST, Monday weeks): how many were active in week 0..p_weeks.
CREATE OR REPLACE FUNCTION public.analytics_report_retention(p_weeks integer DEFAULT 8)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH params AS (
        SELECT least(greatest(coalesce(p_weeks, 8), 1), 26) AS w,
               date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AS this_week
    ),
    team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    cohort AS (
        SELECT pr.id AS user_id, date_trunc('week', pr.created_at AT TIME ZONE 'Asia/Kolkata') AS wk
        FROM public.profiles pr, params
        WHERE pr.created_at AT TIME ZONE 'Asia/Kolkata' >= params.this_week - (params.w || ' weeks')::interval
          AND pr.id NOT IN (SELECT user_id FROM team)
    ),
    act AS (
        SELECT DISTINCT a.user_id, date_trunc('week', a.ts AT TIME ZONE 'Asia/Kolkata') AS wk
        FROM public.analytics_user_activity(
                 (SELECT (this_week - (w || ' weeks')::interval) AT TIME ZONE 'Asia/Kolkata' FROM params), now()) a
        WHERE a.user_id IN (SELECT user_id FROM cohort)
    ),
    grid AS (
        SELECT c.wk, c.user_id, k
        FROM cohort c, params, generate_series(0, params.w) k
        WHERE c.wk + (k || ' weeks')::interval <= params.this_week
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'cohort', to_char(r.wk, 'YYYY-MM-DD'), 'size', r.size, 'weeks', r.weeks) ORDER BY r.wk), '[]'::jsonb)
    FROM (
        SELECT g.wk,
               (SELECT count(*) FROM cohort c WHERE c.wk = g.wk) AS size,
               jsonb_agg(g.active ORDER BY g.k) AS weeks
        FROM (
            SELECT grid.wk, grid.k,
                   count(DISTINCT act.user_id) AS active
            FROM grid
            LEFT JOIN act ON act.user_id = grid.user_id
                         AND act.wk = grid.wk + (grid.k || ' weeks')::interval
            GROUP BY grid.wk, grid.k
        ) g
        GROUP BY g.wk
    ) r
$$;

-- Per-test funnel: link views → starts → submissions (period), plus product usage.
CREATE OR REPLACE FUNCTION public.analytics_report_tests(p_from timestamptz, p_to timestamptz, p_limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    refs AS (
        SELECT t.id, k.ref
        FROM public.tests t
        CROSS JOIN LATERAL (VALUES (t.slug), (t.custom_id), (t.id::text),
                                   (t.settings->'conduct_exam'->>'conduct_slug')) AS k(ref)
        WHERE k.ref IS NOT NULL AND k.ref <> ''
    ),
    views AS (
        SELECT DISTINCT ON (pv.id) refs.id AS test_id, pv.visitor_id
        FROM public.analytics_f_pageviews(p_from, p_to, NULL) pv
        JOIN refs ON refs.ref = substring(pv.path FROM '^/(?:test|live|test-intro)/([^/]+)')
        WHERE pv.path ~ '^/(test|live|test-intro)/[^/]+'
    ),
    v_agg AS (
        SELECT test_id, count(*) AS views, count(DISTINCT visitor_id) AS viewers FROM views GROUP BY test_id
    ),
    starts AS (
        SELECT r.test_id, count(*) AS starts FROM public.test_registrations r
         WHERE r.started_at >= p_from AND r.started_at < p_to AND r.user_id NOT IN (SELECT user_id FROM team)
         GROUP BY r.test_id
        UNION ALL
        SELECT a.test_id, count(*) FROM public.anon_test_attempts a
         WHERE a.started_at >= p_from AND a.started_at < p_to
         GROUP BY a.test_id
    ),
    st_agg AS (SELECT test_id, sum(starts) AS starts FROM starts GROUP BY test_id),
    subs AS (
        SELECT ut.test_id, false AS guest,
               CASE WHEN t.total_max_marks > 0 THEN least(greatest(ut.score / t.total_max_marks * 100, -100), 100) END AS pct
          FROM public.user_tests ut JOIN public.tests t ON t.id = ut.test_id
         WHERE ut.created_at >= p_from AND ut.created_at < p_to
           AND (ut.user_id IS NULL OR ut.user_id NOT IN (SELECT user_id FROM team)) AND ut.user_id IS DISTINCT FROM t.created_by
        UNION ALL
        SELECT a.test_id, true, NULL FROM public.anon_test_attempts a
         WHERE a.status = 'submitted' AND a.submitted_at >= p_from AND a.submitted_at < p_to
    ),
    sb_agg AS (
        SELECT test_id, count(*) AS submissions, count(*) FILTER (WHERE guest) AS guest_submissions,
               round(avg(pct)::numeric, 1) AS avg_score_pct
        FROM subs GROUP BY test_id
    ),
    ids AS (
        SELECT test_id FROM v_agg UNION SELECT test_id FROM st_agg UNION SELECT test_id FROM sb_agg
    ),
    rows AS (
        SELECT t.id, t.title, t.slug, t.created_at, t.is_public, t.created_by,
               coalesce(pr.full_name, t.creator_name) AS creator_name,
               (t.created_by IN (SELECT user_id FROM team)) AS is_team,
               coalesce(v_agg.views, 0) AS views, coalesce(v_agg.viewers, 0) AS viewers,
               coalesce(st_agg.starts, 0) AS starts,
               coalesce(sb_agg.submissions, 0) AS submissions,
               coalesce(sb_agg.guest_submissions, 0) AS guest_submissions,
               sb_agg.avg_score_pct
        FROM ids
        JOIN public.tests t ON t.id = ids.test_id
        LEFT JOIN public.profiles pr ON pr.id = t.created_by
        LEFT JOIN v_agg  ON v_agg.test_id  = ids.test_id
        LEFT JOIN st_agg ON st_agg.test_id = ids.test_id
        LEFT JOIN sb_agg ON sb_agg.test_id = ids.test_id
    )
    SELECT jsonb_build_object(
        'tests', (SELECT coalesce(jsonb_agg(r ORDER BY r.submissions DESC, r.starts DESC, r.viewers DESC), '[]'::jsonb)
                  FROM (SELECT * FROM rows ORDER BY submissions DESC, starts DESC, viewers DESC
                        LIMIT least(greatest(coalesce(p_limit, 25), 1), 200)) r),
        'created', (SELECT jsonb_build_object(
                        'total',    count(*),
                        'team',     count(*) FILTER (WHERE t.created_by IN (SELECT user_id FROM team)),
                        'public',   count(*) FILTER (WHERE t.is_public AND (t.created_by IS NULL OR t.created_by NOT IN (SELECT user_id FROM team))),
                        'cloned',   count(*) FILTER (WHERE t.is_cloned AND (t.created_by IS NULL OR t.created_by NOT IN (SELECT user_id FROM team))),
                        'creators', count(DISTINCT t.created_by) FILTER (WHERE t.created_by NOT IN (SELECT user_id FROM team)))
                    FROM public.tests t WHERE t.created_at >= p_from AND t.created_at < p_to),
        'ai', (SELECT coalesce(jsonb_agg(r ORDER BY r.count DESC), '[]'::jsonb) FROM (
                  SELECT coalesce(g.mode, 'unknown') AS key, count(*) AS count,
                         count(DISTINCT g.user_id) AS users, coalesce(sum(g.question_count), 0) AS questions
                  FROM public.ai_generation_history g
                  WHERE g.created_at >= p_from AND g.created_at < p_to
                    AND (g.user_id IS NULL OR g.user_id NOT IN (SELECT user_id FROM team))
                  GROUP BY 1) r),
        'pdf', (SELECT coalesce(jsonb_agg(r ORDER BY r.count DESC), '[]'::jsonb) FROM (
                   SELECT coalesce(ev.props->>'tool', 'unknown') AS key, count(*) AS count,
                          count(DISTINCT ev.visitor_id) AS visitors
                   FROM public.analytics_events ev
                   JOIN public.analytics_sessions es ON es.id = ev.session_id
                   WHERE ev.name = 'pdf_export' AND ev.ts >= p_from AND ev.ts < p_to
                     AND NOT es.is_bot AND NOT es.is_internal
                   GROUP BY 1) r),
        'events', (SELECT coalesce(jsonb_agg(r ORDER BY r.count DESC), '[]'::jsonb) FROM (
                   SELECT ev.name AS key, count(*) AS count, count(DISTINCT ev.visitor_id) AS visitors
                   FROM public.analytics_events ev
                   JOIN public.analytics_sessions es ON es.id = ev.session_id
                   WHERE ev.ts >= p_from AND ev.ts < p_to AND NOT es.is_bot AND NOT es.is_internal
                   GROUP BY 1) r)
    )
$$;

-- Can the numbers be trusted right now?
CREATE OR REPLACE FUNCTION public.analytics_report_health()
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH wk AS (
        SELECT * FROM public.analytics_sessions WHERE started_at >= now() - interval '7 days'
    ),
    humans AS (SELECT * FROM wk WHERE NOT is_bot AND NOT is_internal)
    SELECT jsonb_build_object(
        'tracking_since',      (SELECT min(started_at) FROM public.analytics_sessions),
        'last_event_at',       (SELECT max(last_seen_at) FROM public.analytics_sessions),
        'sessions_24h',        (SELECT count(*) FROM public.analytics_sessions WHERE started_at >= now() - interval '24 hours'),
        'sessions_7d',         (SELECT count(*) FROM wk),
        'human_sessions_7d',   (SELECT count(*) FROM humans),
        'bot_sessions_7d',     (SELECT count(*) FROM wk WHERE is_bot),
        'internal_sessions_7d',(SELECT count(*) FROM wk WHERE is_internal AND NOT is_bot),
        'country_coverage_7d', (SELECT round(100.0 * count(*) FILTER (WHERE country_code IS NOT NULL) / nullif(count(*), 0), 1) FROM humans),
        'city_coverage_7d',    (SELECT round(100.0 * count(*) FILTER (WHERE city IS NOT NULL) / nullif(count(*), 0), 1) FROM humans),
        'engagement_coverage_7d', (SELECT round(100.0 * count(*) FILTER (WHERE pv.engaged_ms > 0) / nullif(count(*), 0), 1)
                                   FROM public.analytics_pageviews pv JOIN humans h ON h.id = pv.session_id),
        'legacy', jsonb_build_object(
            'page_views', (SELECT count(*) FROM public.page_views),
            'first_at',   (SELECT min(created_at) FROM public.page_views),
            'last_at',    (SELECT max(created_at) FROM public.page_views))
    )
$$;


-- ─── 5. Retention ────────────────────────────────────────────────────────────
-- Deletes raw analytics older than p_keep_months (visits cascade to their page
-- views and events; browsers with nothing left go too). Returns rows removed.
CREATE OR REPLACE FUNCTION public.analytics_purge(p_keep_months integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cutoff   timestamptz := now() - make_interval(months => greatest(coalesce(p_keep_months, 25), 1));
    v_sessions integer;
    v_visitors integer;
BEGIN
    DELETE FROM public.analytics_sessions WHERE last_seen_at < v_cutoff;
    GET DIAGNOSTICS v_sessions = ROW_COUNT;
    DELETE FROM public.analytics_visitors v
     WHERE v.last_seen_at < v_cutoff
       AND NOT EXISTS (SELECT 1 FROM public.analytics_sessions s WHERE s.visitor_id = v.id);
    GET DIAGNOSTICS v_visitors = ROW_COUNT;
    RETURN jsonb_build_object('cutoff', v_cutoff, 'sessions', v_sessions, 'visitors', v_visitors);
END $$;


-- ─── 6. Lock every function to the backend ───────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proname LIKE 'analytics\_report\_%' OR p.proname LIKE 'analytics\_f\_%'
               OR p.proname IN ('analytics_ingest', 'analytics_purge', 'analytics_team_user_ids',
                                'analytics_landing_type', 'analytics_site_of', 'analytics_site_label', 'analytics_user_activity'))
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;

-- Optional — monthly purge (enable the pg_cron extension first: Database → Extensions):
--   SELECT cron.schedule('analytics-purge', '30 21 1 * *', $$SELECT public.analytics_purge(25)$$);
--
-- Verify after running:
--   SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'analytics\_%';          -- 0 rows
--   SELECT has_function_privilege('anon', 'public.analytics_ingest(jsonb)', 'execute');         -- false
--   SELECT pg_get_expr(adbin, adrelid) FROM pg_attrdef WHERE adrelid = 'public.test_registrations'::regclass; -- now()
