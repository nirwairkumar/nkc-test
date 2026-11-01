-- ════════════════════════════════════════════════════════════════════════════
-- Analytics v2 — Video (2026-10-15). Runs after 20261013150000_analytics_content.sql.
--
-- Admin → Analytics → Video: how often the TestoZa walkthrough film is played at each
-- place it sits (frontend/src/components/LaunchVideo.tsx), how many watched to the end,
-- and how many of the people who opened that page pressed play.
--
-- Reads only the launch_video_* events (analytics_events_name_ts_idx) and, for the
-- "page visitors" denominator, the page views of the three pages the player is on.
-- Bots and team traffic excluded, like every other report.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.analytics_report_video(p_from timestamptz, p_to timestamptz, p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
    WITH places(key, ord, paths) AS (VALUES
        -- `where` sent by LaunchVideo, and the page(s) that player is on.
        ('homepage',    1, ARRAY['/']),
        ('ads_landing', 2, ARRAY['/quiz-creator', '/assessment-platform']),
        ('dashboard',   3, ARRAY['/dashboard'])
    ),
    ev AS (
        SELECT e.id, e.ts, e.name, e.session_id, e.visitor_id, e.path,
               coalesce(NULLIF(e.props->>'where', ''), 'unknown') AS place,
               NULLIF(e.props->>'quality', '') AS quality
        FROM public.analytics_events e
        JOIN public.analytics_sessions s ON s.id = e.session_id
        WHERE e.name IN ('launch_video_play', 'launch_video_complete')
          AND e.ts >= p_from AND e.ts < p_to
          AND NOT s.is_bot AND NOT s.is_internal
    ),
    plays AS (SELECT * FROM ev WHERE name = 'launch_video_play'),
    ends  AS (SELECT * FROM ev WHERE name = 'launch_video_complete'),
    page_people AS (
        SELECT pl.key, count(DISTINCT pv.visitor_id) AS visitors
        FROM places pl
        JOIN public.analytics_pageviews pv ON pv.path = ANY (pl.paths)
        JOIN public.analytics_sessions s ON s.id = pv.session_id
        WHERE pv.ts >= p_from AND pv.ts < p_to
          AND public.analytics_site_of(pv.host) = 'main'
          AND NOT s.is_bot AND NOT s.is_internal
        GROUP BY pl.key
    ),
    by_place AS (
        SELECT k.key,
               (SELECT count(*)                   FROM plays p WHERE p.place = k.key) AS plays,
               (SELECT count(DISTINCT visitor_id) FROM plays p WHERE p.place = k.key) AS viewers,
               (SELECT count(*)                   FROM ends  c WHERE c.place = k.key) AS finished,
               (SELECT count(DISTINCT visitor_id) FROM ends  c WHERE c.place = k.key) AS finished_viewers,
               (SELECT count(*) FROM plays p WHERE p.place = k.key AND p.quality = 'sd') AS sd_plays,
               coalesce((SELECT visitors FROM page_people pp WHERE pp.key = k.key), 0) AS page_visitors,
               coalesce((SELECT ord FROM places pl WHERE pl.key = k.key), 99) AS ord,
               (SELECT paths FROM places pl WHERE pl.key = k.key) AS paths
        FROM (SELECT key FROM places UNION SELECT place FROM ev) k
    ),
    recent AS (
        SELECT p.id, p.ts, p.place, p.path, p.quality,
               EXISTS (SELECT 1 FROM ends c WHERE c.session_id = p.session_id AND c.place = p.place AND c.ts >= p.ts) AS finished,
               pr.full_name AS user_name,
               jsonb_build_object(
                   'id', s.id, 'visitor_id', s.visitor_id, 'user_id', s.user_id,
                   'started_at', s.started_at, 'last_seen_at', s.last_seen_at,
                   'host', s.host, 'entry_path', s.entry_path, 'exit_path', s.exit_path,
                   'pageviews', s.pageviews, 'engaged_ms', s.engaged_ms, 'is_engaged', s.is_engaged,
                   'channel', s.channel, 'referrer_host', s.referrer_host, 'utm_source', s.utm_source,
                   'country_code', s.country_code, 'region', s.region, 'city', s.city,
                   'device_type', s.device_type, 'browser', s.browser, 'os', s.os,
                   'is_internal', s.is_internal, 'is_bot', s.is_bot,
                   'landing_type', public.analytics_landing_type(s.host, s.entry_path)
               ) AS session
        FROM plays p
        JOIN public.analytics_sessions s ON s.id = p.session_id
        LEFT JOIN public.profiles pr ON pr.id = s.user_id
        ORDER BY p.ts DESC, p.id DESC
        LIMIT least(greatest(coalesce(p_limit, 30), 1), 100)
    )
    SELECT jsonb_build_object(
        'totals', jsonb_build_object(
            'plays',            (SELECT count(*) FROM plays),
            'viewers',          (SELECT count(DISTINCT visitor_id) FROM plays),
            'finished',         (SELECT count(*) FROM ends),
            'finished_viewers', (SELECT count(DISTINCT visitor_id) FROM ends),
            'page_visitors',    (SELECT count(DISTINCT pv.visitor_id)
                                   FROM places pl
                                   JOIN public.analytics_pageviews pv ON pv.path = ANY (pl.paths)
                                   JOIN public.analytics_sessions s ON s.id = pv.session_id
                                  WHERE pv.ts >= p_from AND pv.ts < p_to
                                    AND public.analytics_site_of(pv.host) = 'main'
                                    AND NOT s.is_bot AND NOT s.is_internal),
            'first_play_at',    (SELECT min(e.ts) FROM public.analytics_events e WHERE e.name = 'launch_video_play')
        ),
        'places', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                        'key', key, 'paths', to_jsonb(paths), 'plays', plays, 'viewers', viewers,
                        'finished', finished, 'finished_viewers', finished_viewers,
                        'sd_plays', sd_plays, 'page_visitors', page_visitors
                    ) ORDER BY ord, key), '[]'::jsonb) FROM by_place),
        'recent', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                        'id', id, 'ts', ts, 'place', place, 'path', path, 'quality', quality,
                        'finished', finished, 'user_name', user_name, 'session', session
                    ) ORDER BY ts DESC, id DESC), '[]'::jsonb) FROM recent)
    )
$$;

REVOKE ALL ON FUNCTION public.analytics_report_video(timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_report_video(timestamptz, timestamptz, integer) TO service_role;

COMMIT;
