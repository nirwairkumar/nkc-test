-- Study Materials removed (2026-10-25).
--
-- The feature is gone from the website, the admin panel and the API. Its 24 rows in
-- public.materials (17 files, 7 links) are kept, not deleted: browsers lose all access
-- here, and 20261025150100_storage_browser_uploads_off.sql makes the files' bucket private.
-- To delete them for good later: delete the bucket's files in Storage, then
-- drop table public.materials.

-- No browser may read or write the table ("Creator Full Access" let any signed-in user
-- write their own rows directly, bypassing the API).
drop policy if exists "Creator Full Access" on public.materials;
revoke all on public.materials from anon, authenticated;

-- Admin → Analytics → Content without materials: tests and AI uploads only.
create or replace function public.analytics_report_content(
    p_from timestamp with time zone,
    p_to timestamp with time zone,
    p_kind text default 'all'::text,
    p_q text default null::text,
    p_before_at timestamp with time zone default null::timestamp with time zone,
    p_before_id uuid default null::uuid,
    p_limit integer default 30
)
returns jsonb
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    -- Everything made in the period, with no question or file content.
    items AS (
        SELECT 'test'::text AS kind, t.id, t.created_at AS at, t.title, NULL::text AS alt,
               t.created_by AS user_id, t.total_questions AS qn, NULL::text AS sub
          FROM public.tests t
         WHERE t.created_at >= p_from AND t.created_at < p_to
           -- The example test every new account gets is seeded, not made by anyone.
           AND coalesce(t.settings->>'is_user_example', '') <> 'true'
           AND coalesce(t.settings->>'is_example_template', '') <> 'true'
        UNION ALL
        SELECT 'ai_upload', g.id, g.created_at, coalesce(NULLIF(trim(g.file_name), ''), g.title), g.title,
               g.user_id, g.question_count, g.mode
          FROM public.ai_generation_history g
         WHERE g.created_at >= p_from AND g.created_at < p_to
    ),
    matched AS (
        SELECT i.*, pr.full_name, pr.email, pr.designation
          FROM items i
          LEFT JOIN public.profiles pr ON pr.id = i.user_id
         WHERE (p_kind IS NULL OR p_kind = 'all' OR i.kind = p_kind)
           AND (p_q IS NULL OR p_q = ''
                OR concat_ws(' ', i.title, i.alt, pr.full_name, pr.email) ILIKE '%' || p_q || '%')
    ),
    -- One extra row tells us whether another page exists.
    page AS (
        SELECT * FROM matched
         WHERE p_before_at IS NULL OR (at, id) < (p_before_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
         ORDER BY at DESC, id DESC
         LIMIT least(greatest(coalesce(p_limit, 30), 1), 100) + 1
    ),
    numbered AS (
        SELECT p.*, row_number() OVER (ORDER BY p.at DESC, p.id DESC) AS n FROM page p
    ),
    shown AS (
        SELECT * FROM numbered WHERE n <= least(greatest(coalesce(p_limit, 30), 1), 100)
    ),
    -- Details for the rows on this page only.
    rows AS (
        SELECT s.at, s.id,
               jsonb_strip_nulls(jsonb_build_object(
                   'kind', s.kind, 'id', s.id, 'at', s.at, 'title', s.title,
                   'user_id', s.user_id, 'user_name', s.full_name, 'user_email', s.email, 'user_role', s.designation,
                   'is_team', CASE WHEN s.user_id IN (SELECT user_id FROM team) THEN true END,
                   'questions', s.qn
               )) || coalesce(tx.j, ax.j, '{}'::jsonb) AS j
          FROM shown s
          LEFT JOIN LATERAL (
              SELECT jsonb_strip_nulls(jsonb_build_object(
                  'minutes', t.duration,
                  'marks', t.total_max_marks,
                  'visibility', t.visibility,
                  'live', CASE WHEN t.settings->'conduct_exam'->>'enabled' = 'true' THEN true END,
                  'cloned', CASE WHEN t.is_cloned THEN true END,
                  'class_name', c.name,
                  -- Papers submitted by anyone but the creator.
                  'results', (SELECT count(*) FROM public.user_tests ut
                               WHERE ut.test_id = t.id AND ut.user_id IS DISTINCT FROM t.created_by)
              )) AS j
                FROM public.tests t
                LEFT JOIN public.classes c ON c.id = t.class_id
               WHERE s.kind = 'test' AND t.id = s.id
          ) tx ON true
          LEFT JOIN LATERAL (
              SELECT jsonb_strip_nulls(jsonb_build_object('mode', s.sub, 'made_title', s.alt)) AS j
               WHERE s.kind = 'ai_upload'
          ) ax ON true
    )
    SELECT jsonb_build_object(
        'rows', coalesce((SELECT jsonb_agg(r.j ORDER BY r.at DESC, r.id DESC) FROM rows r), '[]'::jsonb),
        'next', (SELECT jsonb_build_object('at', s.at, 'id', s.id) FROM shown s
                  WHERE (SELECT count(*) FROM page) > least(greatest(coalesce(p_limit, 30), 1), 100)
                  ORDER BY s.at ASC, s.id ASC LIMIT 1),
        -- Totals for the period (all kinds, no search) and the size of the current filter.
        'totals', CASE WHEN p_before_at IS NULL THEN (
            SELECT jsonb_build_object(
                'tests',          count(*) FILTER (WHERE kind = 'test'),
                'test_creators',  count(DISTINCT user_id) FILTER (WHERE kind = 'test'),
                'ai_uploads',     count(*) FILTER (WHERE kind = 'ai_upload'),
                'ai_questions',   coalesce(sum(qn) FILTER (WHERE kind = 'ai_upload'), 0),
                'ai_uploaders',   count(DISTINCT user_id) FILTER (WHERE kind = 'ai_upload'),
                'people',         count(DISTINCT user_id),
                'team_items',     count(*) FILTER (WHERE user_id IN (SELECT user_id FROM team)),
                'matched',        (SELECT count(*) FROM matched))
            FROM items) END
    )
$function$;
