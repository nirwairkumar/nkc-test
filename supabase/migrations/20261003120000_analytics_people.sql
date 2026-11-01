-- ════════════════════════════════════════════════════════════════════════════
-- Analytics v2, part 2 — people (2026-10-03). Runs after 20260926120000_analytics_v2.sql.
--
-- 1. Exam candidates are not sign-ups. Taking an exam without an account creates a
--    hidden login (candidate_<id>@guest.testoza.com) because every attempt row needs
--    one (user_tests.user_id → auth.users). These now count as "exam candidates":
--    left out of sign-ups, active users and retention, still counted as tests taken.
-- 2. Users page: analytics_report_people() — every account with its role, stage,
--    activity and a follow-up reason for educators who need a nudge.
-- 3. Data quality: Meta's link-preview crawlers (WhatsApp/Facebook) run pages with an
--    iPhone user agent from data centres; they were counted as people. Past visits
--    are re-flagged here; new ones are caught at ingest (backend enrich.py).
--    Country is back-filled from the browser time zone where Cloudflare gave none.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Who is who ───────────────────────────────────────────────────────────

-- Hidden logins created for people who took an exam without an account.
CREATE OR REPLACE FUNCTION public.analytics_candidate_user_ids()
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT p.id FROM public.profiles p WHERE p.email ILIKE '%@guest.testoza.com'
$$;

-- Accounts that are not users for growth purposes: the team and exam candidates.
CREATE OR REPLACE FUNCTION public.analytics_non_member_ids()
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT user_id FROM public.analytics_team_user_ids()
    UNION
    SELECT user_id FROM public.analytics_candidate_user_ids()
$$;

-- The name a candidate typed (join-code roster or the test's start form).
CREATE OR REPLACE FUNCTION public.analytics_candidate_name(p_user uuid)
RETURNS text
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(
        (SELECT NULLIF(trim(sp.display_name), '') FROM public.session_participants sp
          WHERE sp.user_id = p_user AND NULLIF(trim(sp.display_name), '') IS NOT NULL
          ORDER BY sp.joined_at DESC LIMIT 1),
        (SELECT trim(f.value) FROM public.user_tests ut,
                LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(ut.metadata->'startFormData') = 'object'
                                             THEN ut.metadata->'startFormData' ELSE '{}'::jsonb END) f
          WHERE ut.user_id = p_user AND f.key ILIKE '%name%' AND NULLIF(trim(f.value), '') IS NOT NULL
          ORDER BY ut.created_at DESC LIMIT 1)
    )
$$;


-- ─── 2. People metrics without candidates ────────────────────────────────────

-- Activity of registered users (DAU/WAU/MAU, retention): team and candidates left out.
CREATE OR REPLACE FUNCTION public.analytics_user_activity(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (user_id uuid, ts timestamptz)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_non_member_ids()),
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

-- Headline numbers; sign-ups exclude candidates, which get their own count.
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
    team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    non_members AS (SELECT user_id FROM public.analytics_non_member_ids())
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
                                   AND pr.id NOT IN (SELECT user_id FROM non_members)),
        -- Accounts created automatically for people who took an exam without one.
        'candidates',          (SELECT count(*) FROM public.profiles pr
                                 WHERE pr.created_at >= p_from AND pr.created_at < p_to
                                   AND pr.id IN (SELECT user_id FROM public.analytics_candidate_user_ids())),
        'candidate_submissions', (SELECT count(*) FROM public.user_tests ut
                                 WHERE ut.created_at >= p_from AND ut.created_at < p_to
                                   AND ut.user_id IN (SELECT user_id FROM public.analytics_candidate_user_ids())),
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
        WHERE created_at >= p_from AND created_at < p_to AND id NOT IN (SELECT user_id FROM public.analytics_non_member_ids())
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

CREATE OR REPLACE FUNCTION public.analytics_report_growth(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_non_member_ids()),
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
        'candidates',           (SELECT count(*) FROM public.profiles pr
                                  WHERE pr.created_at >= p_from AND pr.created_at < p_to
                                    AND pr.id IN (SELECT user_id FROM public.analytics_candidate_user_ids())),
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

CREATE OR REPLACE FUNCTION public.analytics_report_retention(p_weeks integer DEFAULT 8)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH params AS (
        SELECT least(greatest(coalesce(p_weeks, 8), 1), 26) AS w,
               date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AS this_week
    ),
    team AS (SELECT user_id FROM public.analytics_non_member_ids()),
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

-- A person; adds candidate name, verification and the tests they took.
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
                'is_candidate', pr.email ILIKE '%@guest.testoza.com',
                'candidate_name', CASE WHEN pr.email ILIKE '%@guest.testoza.com'
                                       THEN public.analytics_candidate_name(pr.id) END,
                'is_verified_creator', coalesce(pr.is_verified_creator, false),
                'recent_attempts', (SELECT coalesce(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb) FROM (
                    SELECT ut.id, ut.test_id, ut.created_at, ut.score, t.title, t.total_max_marks,
                           coalesce(cr.full_name, t.creator_name) AS creator_name,
                           (ut.user_id = t.created_by) AS own_test
                    FROM public.user_tests ut
                    LEFT JOIN public.tests t ON t.id = ut.test_id
                    LEFT JOIN public.profiles cr ON cr.id = t.created_by
                    WHERE ut.user_id = pr.id
                    ORDER BY ut.created_at DESC LIMIT 8) r),
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

-- ─── 3. Users page ───────────────────────────────────────────────────────────
-- p_segment: 'members' (every real account) | 'educator' | 'student' | 'unset' |
--            'candidate' | 'team' | 'follow_up'.  p_sort: 'newest' | 'active' | 'tests' | 'results'.
-- kind     : team > candidate > educator (Teacher / Institution / Other / Guest, or made a test)
--            > student > unset.
-- stage    : educators only — signed_up → created_test → getting_results, or went_quiet.
-- follow_up: no_results (made a test, nobody took it in 2+ days), no_test (1+ day, no test),
--            went_quiet (had results, nothing for 21 days).
CREATE OR REPLACE FUNCTION public.analytics_report_people(
    p_segment text DEFAULT 'members', p_q text DEFAULT NULL, p_sort text DEFAULT 'newest',
    p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    made AS (
        SELECT created_by AS user_id, count(*) AS tests_created,
               min(created_at) AS first_test_at, max(created_at) AS last_test_at
        FROM public.tests WHERE created_by IS NOT NULL GROUP BY created_by
    ),
    results AS (
        SELECT t.created_by AS user_id, count(*) AS n, max(x.at) AS last_at
        FROM (
            SELECT ut.test_id, ut.user_id, ut.created_at AS at FROM public.user_tests ut
            UNION ALL
            SELECT a.test_id, NULL::uuid, a.submitted_at FROM public.anon_test_attempts a WHERE a.status = 'submitted'
        ) x
        JOIN public.tests t ON t.id = x.test_id
        WHERE t.created_by IS NOT NULL AND x.user_id IS DISTINCT FROM t.created_by
        GROUP BY t.created_by
    ),
    taken AS (
        SELECT user_id, count(*) AS n, max(created_at) AS last_at
        FROM public.user_tests WHERE user_id IS NOT NULL GROUP BY user_id
    ),
    seen AS (
        SELECT user_id, count(*) AS visits, max(last_seen_at) AS last_at
        FROM public.analytics_sessions WHERE user_id IS NOT NULL AND NOT is_bot GROUP BY user_id
    ),
    ai AS (
        SELECT user_id, count(*) AS n, max(created_at) AS last_at
        FROM public.ai_generation_history WHERE user_id IS NOT NULL GROUP BY user_id
    ),
    base AS (
        SELECT pr.id, pr.email, pr.full_name, pr.avatar_url, pr.designation, pr.created_at,
               coalesce(pr.is_verified_creator, false) AS is_verified_creator,
               coalesce(pr.is_premium, false) AS is_premium,
               CASE WHEN pr.id IN (SELECT user_id FROM team) THEN 'team'
                    WHEN pr.email ILIKE '%@guest.testoza.com' THEN 'candidate'
                    WHEN pr.designation IN ('Teacher', 'Institution', 'Other', 'Guest')
                         OR coalesce(m.tests_created, 0) > 0 THEN 'educator'
                    WHEN pr.designation = 'Student' THEN 'student'
                    ELSE 'unset' END AS kind,
               coalesce(m.tests_created, 0) AS tests_created, m.first_test_at,
               coalesce(r.n, 0) AS results, r.last_at AS last_result_at,
               coalesce(tk.n, 0) AS tests_taken, coalesce(se.visits, 0) AS visits,
               coalesce(ai.n, 0) AS ai_generations,
               greatest(pr.created_at, m.last_test_at, tk.last_at, se.last_at, ai.last_at) AS last_active_at
        FROM public.profiles pr
        LEFT JOIN made m     ON m.user_id = pr.id
        LEFT JOIN results r  ON r.user_id = pr.id
        LEFT JOIN taken tk   ON tk.user_id = pr.id
        LEFT JOIN seen se    ON se.user_id = pr.id
        LEFT JOIN ai         ON ai.user_id = pr.id
    ),
    staged AS (
        SELECT b.*,
               CASE WHEN b.kind = 'candidate' THEN public.analytics_candidate_name(b.id) END AS candidate_name,
               CASE WHEN b.kind <> 'educator' THEN NULL
                    WHEN b.tests_created = 0 THEN 'signed_up'
                    WHEN b.results = 0 THEN 'created_test'
                    WHEN greatest(b.last_active_at, b.last_result_at) < now() - interval '21 days' THEN 'went_quiet'
                    ELSE 'getting_results' END AS stage,
               CASE WHEN b.kind <> 'educator' THEN NULL
                    WHEN b.tests_created > 0 AND b.results = 0 AND b.first_test_at < now() - interval '2 days' THEN 'no_results'
                    WHEN b.tests_created = 0 AND b.created_at < now() - interval '1 day' THEN 'no_test'
                    WHEN b.results > 0
                         AND greatest(b.last_active_at, b.last_result_at) < now() - interval '21 days' THEN 'went_quiet'
               END AS follow_up
        FROM base b
    ),
    picked AS (
        SELECT s.* FROM staged s
        WHERE CASE coalesce(p_segment, 'members')
                  WHEN 'members'   THEN s.kind <> 'candidate'
                  WHEN 'follow_up' THEN s.follow_up IS NOT NULL
                  ELSE s.kind = p_segment
              END
          AND (p_q IS NULL OR p_q = ''
               OR concat_ws(' ', s.full_name, s.email, s.candidate_name, s.designation) ILIKE '%' || p_q || '%')
    ),
    ordered AS (
        SELECT p.*,
               row_number() OVER (ORDER BY
                   CASE WHEN p_segment = 'follow_up'
                        THEN CASE p.follow_up WHEN 'no_results' THEN 1 WHEN 'no_test' THEN 2 ELSE 3 END END,
                   CASE WHEN p_sort = 'active'  THEN p.last_active_at END DESC NULLS LAST,
                   CASE WHEN p_sort = 'tests'   THEN p.tests_created END DESC,
                   CASE WHEN p_sort = 'results' THEN p.results END DESC,
                   p.created_at DESC) AS ord
        FROM picked p
    )
    SELECT jsonb_build_object(
        'counts', (SELECT jsonb_build_object(
                       'members',   count(*) FILTER (WHERE kind <> 'candidate'),
                       'educator',  count(*) FILTER (WHERE kind = 'educator'),
                       'student',   count(*) FILTER (WHERE kind = 'student'),
                       'unset',     count(*) FILTER (WHERE kind = 'unset'),
                       'candidate', count(*) FILTER (WHERE kind = 'candidate'),
                       'team',      count(*) FILTER (WHERE kind = 'team'),
                       'follow_up', count(*) FILTER (WHERE follow_up IS NOT NULL),
                       'new_7d',    count(*) FILTER (WHERE kind NOT IN ('candidate', 'team')
                                                       AND created_at >= now() - interval '7 days'),
                       'stages', jsonb_build_object(
                           'signed_up',       count(*) FILTER (WHERE stage = 'signed_up'),
                           'created_test',    count(*) FILTER (WHERE stage = 'created_test'),
                           'getting_results', count(*) FILTER (WHERE stage = 'getting_results'),
                           'went_quiet',      count(*) FILTER (WHERE stage = 'went_quiet')))
                   FROM staged),
        'total', (SELECT count(*) FROM picked),
        'rows', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                     'id', o.id, 'email', o.email, 'full_name', o.full_name, 'candidate_name', o.candidate_name,
                     'avatar_url', o.avatar_url, 'designation', o.designation, 'kind', o.kind, 'stage', o.stage,
                     'follow_up', o.follow_up, 'created_at', o.created_at, 'last_active_at', o.last_active_at,
                     'last_result_at', o.last_result_at, 'tests_created', o.tests_created, 'results', o.results,
                     'tests_taken', o.tests_taken, 'visits', o.visits, 'ai_generations', o.ai_generations,
                     'is_verified_creator', o.is_verified_creator, 'is_premium', o.is_premium) ORDER BY o.ord), '[]'::jsonb)
                 FROM (SELECT * FROM ordered ORDER BY ord
                       LIMIT least(greatest(coalesce(p_limit, 50), 1), 200)
                       OFFSET greatest(coalesce(p_offset, 0), 0)) o)
    )
$$;


-- ─── 4. Data quality back-fill ───────────────────────────────────────────────

-- Data-centre crawlers counted as people (same rules as backend enrich.datacenter_reason).
UPDATE public.analytics_sessions s
   SET is_bot = true, bot_reason = x.reason
  FROM (
      SELECT id,
             CASE
                 WHEN (lower(city), lower(region)) IN (
                     ('prineville', 'oregon'), ('forest city', 'north carolina'), ('altoona', 'iowa'),
                     ('luleå', 'norrbotten'), ('clonee', 'leinster'), ('clonee', 'meath'),
                     ('los lunas', 'new mexico'), ('papillion', 'nebraska'), ('springfield', 'nebraska'),
                     ('sarpy', 'nebraska'), ('new albany', 'ohio'), ('henrico', 'virginia'),
                     ('sandston', 'virginia'), ('eagle mountain', 'utah'), ('gallatin', 'tennessee'),
                     ('kuna', 'idaho'), ('rosemount', 'minnesota'))
                     THEN 'Meta data centre'
                 WHEN screen = '2000x2000' THEN 'headless browser screen'
                 WHEN timezone = 'America/Los_Angeles' AND region IS NOT NULL
                      AND lower(region) NOT IN ('california', 'oregon', 'washington', 'nevada', 'idaho',
                                                'british columbia', 'baja california')
                     THEN 'time zone doesn''t match location'
             END AS reason
      FROM public.analytics_sessions
      WHERE NOT is_bot
  ) x
 WHERE x.id = s.id AND x.reason IS NOT NULL;

UPDATE public.analytics_visitors v
   SET is_bot = true
 WHERE NOT v.is_bot
   AND EXISTS (SELECT 1 FROM public.analytics_sessions s WHERE s.visitor_id = v.id)
   AND NOT EXISTS (SELECT 1 FROM public.analytics_sessions s WHERE s.visitor_id = v.id AND NOT s.is_bot);

-- Country from the browser time zone where Cloudflare gave none (real visits only).
WITH tz(zone, cc) AS (VALUES
    ('Asia/Kolkata', 'IN'), ('Asia/Calcutta', 'IN'), ('Asia/Kathmandu', 'NP'), ('Asia/Katmandu', 'NP'),
    ('Asia/Dhaka', 'BD'), ('Asia/Dacca', 'BD'), ('Asia/Karachi', 'PK'), ('Asia/Colombo', 'LK'),
    ('Asia/Thimphu', 'BT'), ('Asia/Dubai', 'AE'), ('Asia/Riyadh', 'SA'), ('Asia/Qatar', 'QA'),
    ('Asia/Kuwait', 'KW'), ('Asia/Muscat', 'OM'), ('Asia/Bahrain', 'BH'), ('Asia/Singapore', 'SG'),
    ('Asia/Kuala_Lumpur', 'MY'), ('Asia/Manila', 'PH'), ('Asia/Jakarta', 'ID'), ('Asia/Bangkok', 'TH'),
    ('Asia/Tokyo', 'JP'), ('Asia/Shanghai', 'CN'), ('Asia/Hong_Kong', 'HK'), ('Europe/London', 'GB'),
    ('Europe/Dublin', 'IE'), ('Europe/Berlin', 'DE'), ('Europe/Paris', 'FR'), ('Europe/Amsterdam', 'NL'),
    ('Europe/Rome', 'IT'), ('Europe/Madrid', 'ES'), ('Europe/Stockholm', 'SE'), ('Europe/Moscow', 'RU'),
    ('Europe/Istanbul', 'TR'), ('America/New_York', 'US'), ('America/Chicago', 'US'), ('America/Denver', 'US'),
    ('America/Los_Angeles', 'US'), ('America/Phoenix', 'US'), ('America/Anchorage', 'US'),
    ('Pacific/Honolulu', 'US'), ('America/Detroit', 'US'), ('America/Toronto', 'CA'),
    ('America/Vancouver', 'CA'), ('America/Edmonton', 'CA'), ('America/Winnipeg', 'CA'),
    ('America/Sao_Paulo', 'BR'), ('America/Mexico_City', 'MX'), ('Australia/Sydney', 'AU'),
    ('Australia/Melbourne', 'AU'), ('Australia/Brisbane', 'AU'), ('Australia/Perth', 'AU'),
    ('Pacific/Auckland', 'NZ'), ('Africa/Johannesburg', 'ZA'), ('Africa/Lagos', 'NG'),
    ('Africa/Nairobi', 'KE'), ('Africa/Cairo', 'EG'))
UPDATE public.analytics_sessions s
   SET country_code = tz.cc
  FROM tz
 WHERE s.country_code IS NULL AND NOT s.is_bot AND s.timezone = tz.zone;

UPDATE public.analytics_visitors v
   SET country_code = s.country_code
  FROM (SELECT DISTINCT ON (visitor_id) visitor_id, country_code
          FROM public.analytics_sessions WHERE country_code IS NOT NULL
         ORDER BY visitor_id, started_at DESC) s
 WHERE v.id = s.visitor_id AND v.country_code IS NULL;


-- ─── 5. Lock the new functions to the backend ────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('analytics_candidate_user_ids', 'analytics_non_member_ids', 'analytics_candidate_name',
                            'analytics_report_people', 'analytics_user_activity', 'analytics_report_summary',
                            'analytics_report_timeseries', 'analytics_report_growth', 'analytics_report_retention',
                            'analytics_report_person')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;
