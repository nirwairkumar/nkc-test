-- Email: "Pick people" (direct) sends, 2026-11-06.
--
-- An urgent email to one educator could not be sent: "New email" starts from everyone, the
-- list shows only the first rows, and the 7-day / 3-a-month limits block anyone emailed lately.
-- With filter {"direct": true} the audience is ONLY the hand-picked people (add_ids), and the
-- timing limits (already got it, emailed this week, 3 this month) do not apply to them.
-- Unsubscribed people and bad addresses are still never emailed.
--
-- Same function as 20261028150000_email_pick_people.sql (live definition 2026-11-06) with:
--   f.direct; status for direct = unsubscribed | bad_email | ready; by_rule false when direct;
--   'direct' in the result, so the backend can tell this version is installed.

CREATE OR REPLACE FUNCTION public.email_report_audience(p_filter jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_cooldown integer DEFAULT 7, p_cap integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
               coalesce((p_filter->>'everyone')::boolean, false) AS everyone,
               coalesce((p_filter->>'direct')::boolean, false) AS direct
    ),
    ppl AS (
        SELECT p.* FROM public.email_people() p, f
        WHERE p.who <> 'taker' OR f.everyone OR p.id = ANY (f.add_ids)
    ),
    cand AS (
        SELECT c.* FROM public.email_candidates(p_cooldown, p_cap, (SELECT template FROM f)) c
        WHERE (SELECT template FROM f) IS NOT NULL AND NOT (SELECT direct FROM f)
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
                    WHEN f.direct THEN 'ready'
                    WHEN f.template IS NOT NULL AND EXISTS (
                         SELECT 1 FROM public.email_sends x
                         WHERE x.user_id = p.id AND x.template_key = f.template AND x.status IN ('sending', 'sent'))
                         THEN 'got_it'
                    WHEN pe.last_at > now() - make_interval(days => p_cooldown) THEN 'cooldown'
                    WHEN coalesce(pe.n30, 0) >= p_cap THEN 'monthly_cap'
                    ELSE 'ready' END AS status,
               CASE WHEN c.user_id IS NOT NULL THEN c.ready_at
                    WHEN f.direct THEN NULL
                    ELSE pe.last_at + make_interval(days => p_cooldown) END AS ready_at
        FROM ppl p
        CROSS JOIN f
        LEFT JOIN cand c ON c.user_id = p.id
        LEFT JOIN per pe ON pe.user_id = p.id
        WHERE f.template IS NULL OR c.user_id IS NOT NULL OR p.id = ANY (f.add_ids)
    ),
    matched AS (
        SELECT s.*,
               NOT f.direct
               AND (f.template IS NULL OR s.in_template)
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
        'direct', (SELECT direct FROM f),
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
$function$;

REVOKE ALL ON FUNCTION public.email_report_audience(jsonb, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_report_audience(jsonb, integer, integer, integer, integer) TO service_role;
