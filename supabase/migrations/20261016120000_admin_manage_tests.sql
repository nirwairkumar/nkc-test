-- ════════════════════════════════════════════════════════════════════════════
-- Admin → Manage Tests (2026-10-16). Runs after 20261013150000_analytics_content.sql.
--
-- One lean report for the admin test list: what each test is, who made it, where it
-- stands (live exam / scheduled / ended), and how it is doing (results, candidates,
-- average, who is writing now, open question reports) — plus counts for every filter.
--
-- Built for minimum egress. A `tests` row averages ~157 kB because of `questions`;
-- the old page fetched rows through search_tests_ranked(), which returns `questions`
-- for every hit. Nothing here reads questions, sections, solutions or answers: a
-- 40-row page is ~20 kB of JSON (~4 kB gzipped), and every count is computed in
-- Postgres instead of shipping result rows to the backend.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_registrations_test_id ON public.test_registrations (test_id);
CREATE INDEX IF NOT EXISTS idx_user_tests_test_created    ON public.user_tests (test_id, created_at DESC);


-- ─── 2. Helpers ──────────────────────────────────────────────────────────────
-- Schedule times are stored as the creator typed them: "2026-10-11T18:15", no zone.
-- The builder's date picker runs in the creator's browser, and creators are in IST,
-- so a time without a zone is read as IST. A bad string reads as NULL, never an error.
CREATE OR REPLACE FUNCTION public.admin_try_ts(p text)
RETURNS timestamptz
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p IS NULL OR btrim(p) = '' THEN
        RETURN NULL;
    END IF;
    IF p ~ '(Z|[+-][0-9]{2}(:?[0-9]{2})?)$' THEN
        RETURN p::timestamptz;
    END IF;
    RETURN p::timestamp AT TIME ZONE 'Asia/Kolkata';
EXCEPTION WHEN others THEN
    RETURN NULL;
END
$$;

-- One small row of facts per test. Shared by the list and the detail report.
-- status: 'live' | 'scheduled' | 'ended' | NULL (never run as an exam).
CREATE OR REPLACE FUNCTION public.admin_test_facts()
RETURNS TABLE (
    id uuid, custom_id text, title text, created_at timestamptz, created_by uuid, slug text,
    visibility text, questions integer, minutes integer, marks numeric, section_count integer,
    class_name text, is_example boolean, is_cloned boolean, cloned_from_id uuid, has_solutions boolean,
    status text, live_since timestamptz, starts_at timestamptz, ends_at timestamptz, ended_at timestamptz,
    join_code text, proctored boolean,
    results integer, results_7d integer, candidates integer, previews integer,
    last_result_at timestamptz, avg_pct numeric, best_pct numeric,
    writing_now integer, unfinished integer, reports_open integer
)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH ut AS (
        -- Results by anyone but the creator; the creator's own runs are previews.
        SELECT u.test_id,
               count(*) FILTER (WHERE u.user_id IS DISTINCT FROM t.created_by) AS results,
               count(*) FILTER (WHERE u.user_id IS DISTINCT FROM t.created_by
                                  AND u.created_at >= now() - interval '7 days') AS results_7d,
               count(DISTINCT u.user_id) FILTER (WHERE u.user_id IS DISTINCT FROM t.created_by) AS candidates,
               count(*) FILTER (WHERE u.user_id = t.created_by) AS previews,
               max(u.created_at) FILTER (WHERE u.user_id IS DISTINCT FROM t.created_by) AS last_result_at,
               round(avg(u.score) FILTER (WHERE u.user_id IS DISTINCT FROM t.created_by)
                     * 100.0 / nullif(t.total_max_marks, 0), 1) AS avg_pct,
               round(max(u.score) FILTER (WHERE u.user_id IS DISTINCT FROM t.created_by)
                     * 100.0 / nullif(t.total_max_marks, 0), 1) AS best_pct
          FROM public.user_tests u
          JOIN public.tests t ON t.id = u.test_id
         GROUP BY u.test_id, t.total_max_marks
    ),
    reg AS (
        -- "Writing now" uses the same 3-minute window as the creator's results panel.
        SELECT r.test_id,
               count(*) FILTER (WHERE r.status = 'in_progress'
                                  AND coalesce(r.last_active_at, r.started_at) >= now() - interval '3 minutes') AS writing_now,
               count(*) FILTER (WHERE r.status = 'in_progress') AS unfinished
          FROM public.test_registrations r
         GROUP BY r.test_id
    ),
    rep AS (
        SELECT q.test_id, count(*) FILTER (WHERE q.status = 'open') AS open
          FROM public.question_reports q
         GROUP BY q.test_id
    ),
    base AS (
        SELECT t.id, t.custom_id, t.title, t.created_at, t.created_by, t.slug, t.visibility::text AS visibility,
               t.total_questions, t.duration, t.total_max_marks, t.enable_section_mode, t.sections_metadata,
               t.class_id, t.is_cloned, t.cloned_from_id, (t.solutions IS NOT NULL) AS has_solutions,
               t.settings->'conduct_exam' AS ce,
               CASE WHEN t.settings->'schedule'->>'enabled' = 'true'
                    THEN public.admin_try_ts(t.settings->'schedule'->>'start_time') END AS s_start,
               CASE WHEN t.settings->'schedule'->>'enabled' = 'true'
                    THEN public.admin_try_ts(t.settings->'schedule'->>'end_time') END AS s_end,
               (coalesce(t.settings->>'is_user_example', '') = 'true'
                OR coalesce(t.settings->>'is_example_template', '') = 'true') AS is_example,
               (coalesce(t.settings->>'force_fullscreen', '') = 'true'
                OR coalesce(t.settings->>'tab_switch_mode', 'off') NOT IN ('off', '')
                OR coalesce(t.settings->>'disable_copy_paste', '') = 'true'
                OR coalesce(t.settings->>'disable_actions', '') = 'true'
                OR coalesce(t.settings->>'block_back_button', '') = 'true'
                OR coalesce(t.settings->>'disable_exit_button', '') = 'true') AS proctored
          FROM public.tests t
    )
    SELECT b.id, b.custom_id, b.title, b.created_at, b.created_by, b.slug, b.visibility,
           coalesce(b.total_questions, 0) AS questions, b.duration AS minutes, b.total_max_marks AS marks,
           CASE WHEN b.enable_section_mode AND jsonb_typeof(b.sections_metadata) = 'array'
                THEN jsonb_array_length(b.sections_metadata) END AS section_count,
           c.name AS class_name, b.is_example, coalesce(b.is_cloned, false) AS is_cloned, b.cloned_from_id,
           b.has_solutions,
           CASE
               WHEN b.ce->>'enabled' = 'true' AND b.s_start > now() THEN 'scheduled'
               WHEN b.ce->>'enabled' = 'true' AND (b.s_end IS NULL OR b.s_end > now()) THEN 'live'
               WHEN b.ce IS NOT NULL AND jsonb_typeof(b.ce) = 'object' THEN 'ended'
           END AS status,
           public.admin_try_ts(b.ce->>'started_at') AS live_since, b.s_start AS starts_at, b.s_end AS ends_at,
           -- An exam still switched on whose schedule has passed ended at its end time.
           CASE WHEN b.ce->>'enabled' = 'true' THEN CASE WHEN b.s_end <= now() THEN b.s_end END
                ELSE public.admin_try_ts(b.ce->>'ended_at') END AS ended_at,
           CASE WHEN b.ce->>'enabled' = 'true' THEN NULLIF(b.ce->>'join_code', '') END AS join_code,
           b.proctored,
           coalesce(ut.results, 0)::int AS results, coalesce(ut.results_7d, 0)::int AS results_7d,
           coalesce(ut.candidates, 0)::int AS candidates, coalesce(ut.previews, 0)::int AS previews,
           ut.last_result_at, ut.avg_pct, ut.best_pct,
           coalesce(reg.writing_now, 0)::int AS writing_now, coalesce(reg.unfinished, 0)::int AS unfinished,
           coalesce(rep.open, 0)::int AS reports_open
      FROM base b
      LEFT JOIN public.classes c ON c.id = b.class_id
      LEFT JOIN ut  ON ut.test_id  = b.id
      LEFT JOIN reg ON reg.test_id = b.id
      LEFT JOIN rep ON rep.test_id = b.id
$$;


-- ─── 3. The list ─────────────────────────────────────────────────────────────
-- p_view: 'all' | 'live' | 'exams' | 'public' | 'link' | 'private' | 'unused' | 'reported' | 'examples' | 'team'
--   'all' and every view except 'examples' leave out the example test each new account gets.
-- p_sort: 'newest' | 'activity' | 'results' | 'title'
-- p_creator narrows everything (rows and counts) to one creator.
CREATE OR REPLACE FUNCTION public.admin_report_tests(
    p_view text DEFAULT 'all', p_q text DEFAULT NULL, p_sort text DEFAULT 'newest',
    p_creator uuid DEFAULT NULL, p_limit integer DEFAULT 40, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    f AS (
        SELECT x.*, pr.full_name, pr.email, pr.avatar_url, pr.designation,
               coalesce(pr.is_verified_creator, false) AS verified,
               (x.created_by IN (SELECT user_id FROM team)) AS is_team
          FROM public.admin_test_facts() x
          LEFT JOIN public.profiles pr ON pr.id = x.created_by
    ),
    scoped AS (SELECT * FROM f WHERE p_creator IS NULL OR created_by = p_creator),
    viewed AS (
        SELECT * FROM scoped s
         WHERE CASE coalesce(p_view, 'all')
                   WHEN 'live'     THEN s.status IN ('live', 'scheduled')
                   WHEN 'exams'    THEN s.status IS NOT NULL AND NOT s.is_example
                   WHEN 'public'   THEN s.visibility = 'public' AND NOT s.is_example
                   WHEN 'link'     THEN s.visibility = 'unlisted' AND s.status IS DISTINCT FROM 'live'
                                        AND s.status IS DISTINCT FROM 'scheduled' AND NOT s.is_example
                   WHEN 'private'  THEN s.visibility = 'private' AND NOT s.is_example
                   WHEN 'unused'   THEN s.results = 0 AND NOT s.is_example
                   WHEN 'reported' THEN s.reports_open > 0
                   WHEN 'examples' THEN s.is_example
                   WHEN 'team'     THEN s.is_team AND NOT s.is_example
                   ELSE NOT s.is_example
               END
    ),
    matched AS (
        SELECT * FROM viewed v
         WHERE p_q IS NULL OR p_q = ''
            OR concat_ws(' ', v.title, v.custom_id, v.full_name, v.email, v.class_name, v.id::text) ILIKE '%' || p_q || '%'
    ),
    ordered AS (
        SELECT m.*, row_number() OVER (ORDER BY
             CASE WHEN p_sort = 'results'  THEN m.results END DESC NULLS LAST,
             CASE WHEN p_sort = 'activity' THEN coalesce(m.last_result_at, '-infinity'::timestamptz) END DESC,
             CASE WHEN p_sort = 'title'    THEN lower(btrim(m.title)) END ASC,
             m.created_at DESC, m.id DESC) AS n
          FROM matched m
    ),
    page AS (
        SELECT * FROM ordered o
         WHERE o.n >  greatest(coalesce(p_offset, 0), 0)
           AND o.n <= greatest(coalesce(p_offset, 0), 0) + least(greatest(coalesce(p_limit, 40), 1), 100)
    )
    SELECT jsonb_build_object(
        'rows', coalesce((
            SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                'id', p.id, 'custom_id', p.custom_id, 'title', p.title, 'created_at', p.created_at, 'slug', p.slug,
                'visibility', p.visibility, 'questions', p.questions, 'minutes', p.minutes, 'marks', p.marks,
                'sections', p.section_count, 'class_name', p.class_name,
                'is_example', CASE WHEN p.is_example THEN true END,
                'is_cloned', CASE WHEN p.is_cloned THEN true END,
                'has_solutions', CASE WHEN p.has_solutions THEN true END,
                'proctored', CASE WHEN p.proctored THEN true END,
                'status', p.status, 'live_since', p.live_since, 'starts_at', p.starts_at, 'ends_at', p.ends_at,
                'ended_at', p.ended_at, 'join_code', p.join_code,
                'results', p.results, 'results_7d', p.results_7d, 'candidates', p.candidates, 'previews', p.previews,
                'last_result_at', p.last_result_at, 'avg_pct', p.avg_pct, 'best_pct', p.best_pct,
                'writing_now', p.writing_now, 'unfinished', p.unfinished, 'reports_open', p.reports_open,
                'creator', jsonb_strip_nulls(jsonb_build_object(
                    'id', p.created_by, 'name', p.full_name, 'email', p.email, 'avatar_url', p.avatar_url,
                    'designation', p.designation,
                    'verified', CASE WHEN p.verified THEN true END,
                    'is_team', CASE WHEN p.is_team THEN true END))
            )) ORDER BY p.n)
              FROM page p
        ), '[]'::jsonb),
        'total', (SELECT count(*) FROM matched),
        -- Filter counts: for the current creator (if any), ignoring the search box.
        'counts', (SELECT jsonb_build_object(
            'all',      count(*) FILTER (WHERE NOT is_example),
            'live',     count(*) FILTER (WHERE status IN ('live', 'scheduled')),
            'exams',    count(*) FILTER (WHERE status IS NOT NULL AND NOT is_example),
            'public',   count(*) FILTER (WHERE visibility = 'public' AND NOT is_example),
            'link',     count(*) FILTER (WHERE visibility = 'unlisted' AND status IS DISTINCT FROM 'live'
                                           AND status IS DISTINCT FROM 'scheduled' AND NOT is_example),
            'private',  count(*) FILTER (WHERE visibility = 'private' AND NOT is_example),
            'unused',   count(*) FILTER (WHERE results = 0 AND NOT is_example),
            'reported', count(*) FILTER (WHERE reports_open > 0),
            'examples', count(*) FILTER (WHERE is_example),
            'team',     count(*) FILTER (WHERE is_team AND NOT is_example))
          FROM scoped),
        -- Platform totals for the tiles (never narrowed by creator or search).
        'summary', (SELECT jsonb_build_object(
            'tests',        count(*) FILTER (WHERE NOT is_example),
            'new_7d',       count(*) FILTER (WHERE NOT is_example AND created_at >= now() - interval '7 days'),
            'creators',     count(DISTINCT created_by) FILTER (WHERE NOT is_example AND NOT is_team),
            'live',         count(*) FILTER (WHERE status = 'live'),
            'scheduled',    count(*) FILTER (WHERE status = 'scheduled'),
            'writing_now',  coalesce(sum(writing_now), 0),
            'results',      coalesce(sum(results), 0),
            'results_7d',   coalesce(sum(results_7d), 0),
            'taken',        count(*) FILTER (WHERE NOT is_example AND results > 0),
            'unused',       count(*) FILTER (WHERE NOT is_example AND results = 0),
            'reports_open', coalesce(sum(reports_open), 0))
          FROM f),
        'creator', CASE WHEN p_creator IS NOT NULL THEN (
            SELECT jsonb_strip_nulls(jsonb_build_object('id', pr.id, 'name', pr.full_name, 'email', pr.email))
              FROM public.profiles pr WHERE pr.id = p_creator) END
    )
$$;


-- ─── 4. One test ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_report_test(p_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH x AS (SELECT * FROM public.admin_test_facts() WHERE id = p_id),
    t AS (
        SELECT t.id, t.created_by, t.settings, t.class_id, t.tags, left(t.description, 600) AS description,
               t.total_max_marks, t.is_public
          FROM public.tests t WHERE t.id = p_id
    ),
    res AS (
        SELECT u.id, u.user_id, u.score, u.created_at, u.violation_count, u.metadata, u.session_id
          FROM public.user_tests u, t
         WHERE u.test_id = p_id AND u.user_id IS DISTINCT FROM t.created_by
    )
    SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM x) THEN NULL ELSE jsonb_build_object(
        'test', (SELECT jsonb_strip_nulls(jsonb_build_object(
            'id', x.id, 'custom_id', x.custom_id, 'title', x.title, 'created_at', x.created_at, 'slug', x.slug,
            'visibility', x.visibility, 'questions', x.questions, 'minutes', x.minutes, 'marks', x.marks,
            'sections', x.section_count, 'class_id', t.class_id, 'class_name', x.class_name,
            'is_example', CASE WHEN x.is_example THEN true END,
            'is_cloned', CASE WHEN x.is_cloned THEN true END, 'cloned_from_id', x.cloned_from_id,
            'has_solutions', CASE WHEN x.has_solutions THEN true END,
            'proctored', CASE WHEN x.proctored THEN true END,
            'status', x.status, 'live_since', x.live_since, 'starts_at', x.starts_at, 'ends_at', x.ends_at,
            'ended_at', x.ended_at, 'join_code', x.join_code,
            'results', x.results, 'results_7d', x.results_7d, 'candidates', x.candidates, 'previews', x.previews,
            'last_result_at', x.last_result_at, 'avg_pct', x.avg_pct, 'best_pct', x.best_pct,
            'writing_now', x.writing_now, 'unfinished', x.unfinished, 'reports_open', x.reports_open,
            'created_by', t.created_by, 'description', NULLIF(btrim(t.description), ''), 'tags', t.tags,
            -- Small (~240 B average): the settings sheet edits it, so it must start from the real value.
            'settings', coalesce(t.settings, '{}'::jsonb)))
          FROM x, t),
        'creator', (SELECT jsonb_strip_nulls(jsonb_build_object(
            'id', pr.id, 'name', pr.full_name, 'email', pr.email, 'avatar_url', pr.avatar_url,
            'designation', pr.designation, 'verified', CASE WHEN pr.is_verified_creator THEN true END,
            'is_team', CASE WHEN pr.id IN (SELECT user_id FROM public.analytics_team_user_ids()) THEN true END,
            'joined_at', pr.created_at,
            'tests', (SELECT count(*) FROM public.tests o WHERE o.created_by = pr.id
                       AND coalesce(o.settings->>'is_user_example', '') <> 'true')))
          FROM t JOIN public.profiles pr ON pr.id = t.created_by),
        'categories', coalesce((
            SELECT jsonb_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name))
              FROM public.test_categories tc JOIN public.categories c ON c.id = tc.category_id
             WHERE tc.test_id = p_id), '[]'::jsonb),
        'sub_category', (
            SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'category_id', sc.category_id)
              FROM public.test_categories tc JOIN public.sub_categories sc ON sc.id = tc.sub_category_id
             WHERE tc.test_id = p_id LIMIT 1),
        -- Results per IST day, last 30 days (only days that had any).
        'daily', coalesce((
            SELECT jsonb_agg(jsonb_build_object('d', d, 'n', n) ORDER BY d)
              FROM (SELECT (r.created_at AT TIME ZONE 'Asia/Kolkata')::date AS d, count(*) AS n
                      FROM res r WHERE r.created_at >= now() - interval '30 days' GROUP BY 1) g), '[]'::jsonb),
        'modes', (SELECT jsonb_build_object(
            'exam',     count(*) FILTER (WHERE coalesce(r.metadata->>'conduct_exam', '') = 'true'
                                           OR coalesce(r.metadata->>'is_conducted_attempt', '') = 'true'
                                           OR r.session_id IS NOT NULL),
            'practice', count(*) FILTER (WHERE NOT (coalesce(r.metadata->>'conduct_exam', '') = 'true'
                                           OR coalesce(r.metadata->>'is_conducted_attempt', '') = 'true'
                                           OR r.session_id IS NOT NULL)),
            'flagged',  count(*) FILTER (WHERE coalesce(r.violation_count, 0) > 0))
          FROM res r),
        -- The latest results: the name typed on the start form, else the profile name. No emails.
        'recent', coalesce((
            SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                       'id', r.id, 'at', r.created_at, 'score', r.score,
                       'pct', round(r.score * 100.0 / nullif((SELECT total_max_marks FROM t), 0), 1),
                       -- "Name" / "Student Name" before anything else; never "College Name".
                       'name', coalesce(
                           (SELECT left(btrim(fv.value), 80)
                              FROM jsonb_each_text(CASE WHEN jsonb_typeof(r.metadata->'startFormData') = 'object'
                                                        THEN r.metadata->'startFormData' ELSE '{}'::jsonb END) fv
                             WHERE fv.key ILIKE '%name%' AND NULLIF(btrim(fv.value), '') IS NOT NULL
                               AND fv.key !~* '(school|college|institut|coaching|cent(er|re)|father|mother|parent|guardian|teacher|batch|class)'
                             ORDER BY CASE WHEN lower(btrim(fv.key, ' :')) = 'name' THEN 0
                                           WHEN fv.key ~* '(student|candidate|full|your)' THEN 1 ELSE 2 END,
                                      length(fv.key)
                             LIMIT 1),
                           NULLIF(btrim(pr.full_name), '')),
                       'exam', CASE WHEN coalesce(r.metadata->>'conduct_exam', '') = 'true'
                                     OR coalesce(r.metadata->>'is_conducted_attempt', '') = 'true'
                                     OR r.session_id IS NOT NULL THEN true END,
                       'violations', NULLIF(r.violation_count, 0)))
                   ORDER BY r.created_at DESC)
              FROM (SELECT * FROM res ORDER BY created_at DESC LIMIT 10) r
              LEFT JOIN public.profiles pr ON pr.id = r.user_id), '[]'::jsonb),
        'reports', coalesce((
            SELECT jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question_id, 'reason', q.reason,
                                                'details', left(q.details, 200), 'at', q.created_at)
                             ORDER BY q.created_at DESC)
              FROM (SELECT * FROM public.question_reports WHERE test_id = p_id AND status = 'open'
                     ORDER BY created_at DESC LIMIT 10) q), '[]'::jsonb),
        'clones', (SELECT count(*) FROM public.tests c WHERE c.cloned_from_id = p_id),
        'combined', coalesce((
            SELECT jsonb_agg(jsonb_build_object('id', cs.id, 'title', cs.title))
              FROM public.combined_sessions cs WHERE cs.test1_id = p_id OR cs.test2_id = p_id), '[]'::jsonb)
    ) END
$$;


-- ─── 5. Lock it to the backend ───────────────────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN ('admin_try_ts', 'admin_test_facts', 'admin_report_tests', 'admin_report_test')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;
