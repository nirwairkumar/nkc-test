-- ════════════════════════════════════════════════════════════════════════════
-- Analytics v2 — Content (2026-10-13). Runs after 20261003120000_analytics_people.sql.
--
-- Admin → Analytics → Content: every test created, study material uploaded and file
-- uploaded to AI import, newest first — what it is, who made it, and when.
--
-- Built for minimum egress. A `tests` row averages ~157 kB (the questions JSON) and an
-- `ai_generation_history` row ~97 kB (parsed_data). Neither column is read here: the
-- function picks one page by time from a lean index of the period, then looks up only
-- the few small fields each row shows. A 30-row page is ~10 kB of JSON (~2 kB gzipped).
-- Period totals come with the first page only, never with "Show more".
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Indexes ──────────────────────────────────────────────────────────────
-- Newest-first reads by time. user_tests had no index on test_id at all, so every
-- "results for this test" count (here, and on the educator dashboards) scanned the table.
CREATE INDEX IF NOT EXISTS idx_tests_created_at      ON public.tests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_created_at  ON public.materials (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_history_created_at ON public.ai_generation_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tests_test_id    ON public.user_tests (test_id);


-- ─── 2. Report ───────────────────────────────────────────────────────────────
-- p_kind: 'all' | 'test' | 'material' | 'ai_upload'
-- Paging: pass the previous page's `next` back as p_before_at / p_before_id.
CREATE OR REPLACE FUNCTION public.analytics_report_content(
    p_from timestamptz, p_to timestamptz, p_kind text DEFAULT 'all', p_q text DEFAULT NULL,
    p_before_at timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL, p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
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
        SELECT 'material', m.id, m.created_at, m.title, NULL, m.user_id, NULL, m.type
          FROM public.materials m
         WHERE m.created_at >= p_from AND m.created_at < p_to
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
               )) || coalesce(tx.j, mx.j, ax.j, '{}'::jsonb) AS j
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
              SELECT jsonb_strip_nulls(jsonb_build_object(
                  'material_type', m.type,
                  'url', m.url,
                  'class_name', c.name,
                  'size', CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::bigint END,
                  'mime', o.metadata->>'mimetype'
              )) AS j
                FROM public.materials m
                LEFT JOIN public.classes c ON c.id = m.class_id
                LEFT JOIN storage.objects o ON o.bucket_id = 'materials' AND o.name = m.file_path
               WHERE s.kind = 'material' AND m.id = s.id
          ) mx ON true
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
                'tests',              count(*) FILTER (WHERE kind = 'test'),
                'test_creators',      count(DISTINCT user_id) FILTER (WHERE kind = 'test'),
                'materials',          count(*) FILTER (WHERE kind = 'material'),
                'material_files',     count(*) FILTER (WHERE kind = 'material' AND sub = 'file'),
                'material_uploaders', count(DISTINCT user_id) FILTER (WHERE kind = 'material'),
                'ai_uploads',         count(*) FILTER (WHERE kind = 'ai_upload'),
                'ai_questions',       coalesce(sum(qn) FILTER (WHERE kind = 'ai_upload'), 0),
                'ai_uploaders',       count(DISTINCT user_id) FILTER (WHERE kind = 'ai_upload'),
                'people',             count(DISTINCT user_id),
                'team_items',         count(*) FILTER (WHERE user_id IN (SELECT user_id FROM team)),
                'matched',            (SELECT count(*) FROM matched))
            FROM items) END
    )
$$;


-- ─── 3. Lock it to the backend ───────────────────────────────────────────────
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'analytics_report_content'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END LOOP;
END $$;

COMMIT;
