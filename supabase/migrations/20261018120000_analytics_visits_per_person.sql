-- Visit stream: "New" and "N visits" follow the account when the visitor is signed in,
-- and the browser only when they are not. Before this, a member opening a new browser
-- showed as "New" even with a dozen earlier visits on other devices.
--
-- person_visits : every visit by this account (all its browsers + any signed-in visit),
--                 the same set the person drawer counts; for anonymous visitors, this
--                 browser's visits.
-- is_new_person : no earlier visit by that same set.
-- is_new_visitor / visitor_sessions stay as before (per browser) for older admin builds.
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
        SELECT pg.id, pg.visitor_id, pg.user_id, pg.started_at, pg.last_seen_at, pg.host,
               pg.entry_path, pg.exit_path, pg.pageviews, pg.events, pg.engaged_ms, pg.is_engaged,
               pg.is_new_visitor, pg.channel, pg.referrer_host, pg.utm_source, pg.utm_medium, pg.utm_campaign,
               pg.country_code, pg.region, pg.city, pg.device_type, pg.browser, pg.os, pg.screen, pg.language,
               pg.is_bot, pg.bot_reason, pg.is_internal, pg.landing_type,
               pg.visitor_sessions, pg.visitor_first_seen_at,
               pg.user_name, pg.user_email, pg.user_designation,
               who.visits       AS person_visits,
               who.earlier = 0  AS is_new_person
        FROM (
            SELECT s.*,
                   public.analytics_landing_type(s.host, s.entry_path) AS landing_type,
                   v.sessions_count AS visitor_sessions,
                   v.first_seen_at  AS visitor_first_seen_at,
                   coalesce(s.user_id, v.user_id) AS person_id,
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
        ) pg
        CROSS JOIN LATERAL (
            SELECT count(*) AS visits,
                   count(*) FILTER (WHERE x.started_at < pg.started_at) AS earlier
            FROM public.analytics_sessions x
            WHERE x.user_id = pg.person_id
               OR x.visitor_id IN (SELECT pg.visitor_id WHERE pg.person_id IS NULL
                                   UNION ALL
                                   SELECT d.id FROM public.analytics_visitors d WHERE d.user_id = pg.person_id)
        ) who
    ) r
$$;
