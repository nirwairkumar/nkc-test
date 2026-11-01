-- Admin → Analytics → Tests: "Test links on social media".
-- Which test links were opened from Instagram / Facebook / WhatsApp / Telegram / YouTube / X /
-- LinkedIn, whose test it was, how people arrived, and when. Instagram and Facebook never say
-- which post a click came from, so the test + its educator is the closest we can get.
--
-- A visit counts for a platform when ANY of these say so:
--   • the referrer is that site (instagram.com, l.facebook.com → facebook.com, t.me, ...)
--   • utm_source names it (Instagram's share sheet adds utm_source=ig)
--   • the page opened in that app's own browser ("Instagram in-app") — catches DMs and
--     stories that send no referrer.
-- Paid clicks (Meta ads) are left out: they are the Paid channel, not people sharing.
-- WhatsApp opens links in the phone's normal browser with no referrer, so WhatsApp only
-- shows up when the link itself is tagged (?utm_source=whatsapp).

CREATE OR REPLACE FUNCTION public.analytics_social_platform(
    p_channel text, p_referrer_host text, p_utm_source text, p_browser text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
    SELECT CASE
        WHEN coalesce(p_channel, '') IN ('Paid', 'AI assistants', 'Organic search', 'Email') THEN NULL
        WHEN h IN ('instagram.com') OR u IN ('ig', 'instagram', 'instagram.com') OR b LIKE 'instagram%' THEN 'Instagram'
        WHEN h IN ('facebook.com', 'fb.com', 'm.facebook.com') OR u IN ('fb', 'facebook', 'facebook.com') OR b LIKE 'facebook%' THEN 'Facebook'
        WHEN h IN ('whatsapp.com', 'wa.me', 'web.whatsapp.com') OR u IN ('whatsapp', 'wa', 'whatsapp.com') THEN 'WhatsApp'
        WHEN h IN ('t.me', 'telegram.org', 'telegram.me', 'web.telegram.org') OR u IN ('telegram', 'tg', 't.me') OR b LIKE 'telegram%' THEN 'Telegram'
        WHEN h IN ('youtube.com', 'youtu.be') OR u IN ('youtube', 'yt', 'youtube.com') THEN 'YouTube'
        WHEN h IN ('t.co', 'twitter.com', 'x.com') OR u IN ('twitter', 'x', 'x.com', 't.co') THEN 'X'
        WHEN h IN ('linkedin.com', 'lnkd.in') OR u IN ('linkedin', 'linkedin.com') OR b LIKE 'linkedin%' THEN 'LinkedIn'
        WHEN h IN ('threads.net', 'threads.com') OR u = 'threads' THEN 'Threads'
        WHEN h IN ('snapchat.com') OR u = 'snapchat' OR b LIKE 'snapchat%' THEN 'Snapchat'
        WHEN h = 'sharechat.com' OR u = 'sharechat' THEN 'ShareChat'
        WHEN h = 'pinterest.com' OR h LIKE 'pinterest.%' OR u = 'pinterest' THEN 'Pinterest'
        WHEN h = 'reddit.com' OR u = 'reddit' THEN 'Reddit'
        WHEN h = 'quora.com' OR u = 'quora' THEN 'Quora'
        WHEN h = 'discord.com' OR u = 'discord' THEN 'Discord'
        WHEN p_channel = 'Social' THEN coalesce(p_referrer_host, p_utm_source)
    END
    FROM (SELECT lower(coalesce(p_referrer_host, '')) AS h,
                 lower(btrim(coalesce(p_utm_source, ''))) AS u,
                 lower(coalesce(p_browser, '')) AS b) x
$$;

CREATE OR REPLACE FUNCTION public.analytics_report_social_tests(
    p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer DEFAULT 60)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
    WITH team AS (SELECT user_id FROM public.analytics_team_user_ids()),
    s AS (
        SELECT x.id, x.visitor_id, x.started_at, x.entry_path, x.device_type, x.browser, x.is_engaged, x.engaged_ms,
               x.utm_source, x.utm_medium, x.utm_content, x.referrer_host,
               public.analytics_social_platform(x.channel, x.referrer_host, x.utm_source, x.browser) AS platform,
               substring(x.entry_path FROM '^/(?:test|live|test-intro)/([^/?#]+)') AS ref
        FROM public.analytics_f_sessions(p_from, p_to, NULL) x
    ),
    social AS (SELECT * FROM s WHERE platform IS NOT NULL),
    refs AS (
        SELECT DISTINCT ON (k.ref) k.ref, t.id
        FROM public.tests t
        CROSS JOIN LATERAL (VALUES (t.slug), (t.custom_id), (t.id::text),
                                   (t.settings->'conduct_exam'->>'conduct_slug')) AS k(ref)
        WHERE k.ref IS NOT NULL AND k.ref <> ''
          AND k.ref IN (SELECT ref FROM social WHERE ref IS NOT NULL)
        ORDER BY k.ref, t.created_at DESC
    ),
    tagged AS (
        SELECT so.*, refs.id AS test_id,
               coalesce(refs.id::text, '/' || split_part(so.entry_path, '/', 2) || '/' || so.ref) AS test_key
        FROM social so LEFT JOIN refs ON refs.ref = so.ref
        WHERE so.ref IS NOT NULL
    ),
    keys AS (SELECT DISTINCT test_key, test_id, entry_path FROM tagged),
    -- Everyone who opened the test in the period, from anywhere — so "share from social" is honest.
    all_views AS (
        SELECT coalesce(refs2.id::text, '/' || split_part(pv.path, '/', 2) || '/' || substring(pv.path FROM '^/(?:test|live|test-intro)/([^/?#]+)')) AS test_key,
               count(DISTINCT pv.visitor_id) AS viewers
        FROM public.analytics_f_pageviews(p_from, p_to, NULL) pv
        LEFT JOIN LATERAL (
            SELECT t.id FROM public.tests t
            CROSS JOIN LATERAL (VALUES (t.slug), (t.custom_id), (t.id::text),
                                       (t.settings->'conduct_exam'->>'conduct_slug')) AS k(ref)
            WHERE k.ref = substring(pv.path FROM '^/(?:test|live|test-intro)/([^/?#]+)')
            ORDER BY t.created_at DESC LIMIT 1
        ) refs2 ON true
        WHERE pv.path ~ '^/(test|live|test-intro)/[^/]+'
          AND substring(pv.path FROM '^/(?:test|live|test-intro)/([^/?#]+)') IN (SELECT ref FROM tagged)
        GROUP BY 1
    ),
    titles AS (
        SELECT pv.path, mode() WITHIN GROUP (ORDER BY pv.title) AS title
        FROM public.analytics_pageviews pv
        WHERE pv.path IN (SELECT entry_path FROM keys WHERE test_id IS NULL)
        GROUP BY pv.path
    ),
    rows AS (
        SELECT g.platform, g.test_key, g.test_id,
               min(g.entry_path) AS path,
               count(DISTINCT g.visitor_id) AS visitors,
               count(*) AS sessions,
               count(DISTINCT g.visitor_id) FILTER (WHERE lower(coalesce(g.browser, '')) LIKE '%in-app%') AS in_app,
               count(DISTINCT g.visitor_id) FILTER (
                   WHERE lower(coalesce(g.utm_source, '')) IN ('ig', 'fb')
                      OR lower(coalesce(g.utm_content, '')) LIKE '%copy%'
                      OR lower(coalesce(g.utm_medium, '')) IN ('share', 'social')) AS reshared,
               count(DISTINCT g.visitor_id) FILTER (WHERE g.device_type = 'mobile') AS mobile,
               round(100.0 * count(*) FILTER (WHERE g.is_engaged) / count(*), 1) AS engagement_rate,
               round(avg(g.engaged_ms))::bigint AS avg_engaged_ms,
               min(g.started_at) AS first_seen,
               max(g.started_at) AS last_seen,
               count(DISTINCT (g.started_at AT TIME ZONE 'Asia/Kolkata')::date) AS days,
               -- 0 = Sunday … 6 = Saturday (IST), visitors per weekday
               jsonb_build_array(
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 0),
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 1),
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 2),
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 3),
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 4),
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 5),
                   count(DISTINCT g.visitor_id) FILTER (WHERE extract(dow FROM g.started_at AT TIME ZONE 'Asia/Kolkata') = 6)
               ) AS weekdays
        FROM tagged g
        GROUP BY g.platform, g.test_key, g.test_id
    ),
    out AS (
        SELECT r.*,
               coalesce(t.title, split_part(split_part(ti.title, ' | ', 1), ' — ', 1)) AS title,
               (t.id IS NULL) AS deleted,
               t.created_by AS creator_id,
               coalesce(pr.full_name, t.creator_name) AS creator_name,
               (t.created_by IN (SELECT user_id FROM team)) AS is_team,
               coalesce(av.viewers, r.visitors) AS all_viewers
        FROM rows r
        LEFT JOIN public.tests t ON t.id = r.test_id
        LEFT JOIN public.profiles pr ON pr.id = t.created_by
        LEFT JOIN titles ti ON ti.path = r.path
        LEFT JOIN all_views av ON av.test_key = r.test_key
    )
    SELECT jsonb_build_object(
        'platforms', (SELECT coalesce(jsonb_agg(p ORDER BY p.visitors DESC), '[]'::jsonb) FROM (
            SELECT platform AS key,
                   count(DISTINCT visitor_id) AS visitors,
                   count(DISTINCT visitor_id) FILTER (WHERE ref IS NOT NULL) AS test_visitors,
                   count(DISTINCT visitor_id) FILTER (WHERE ref IS NULL) AS other_visitors
            FROM social GROUP BY platform) p),
        'totals', (SELECT jsonb_build_object(
                       'visitors', count(DISTINCT visitor_id),
                       'tests', count(DISTINCT test_key),
                       'educators', (SELECT count(DISTINCT creator_id) FROM out WHERE creator_id IS NOT NULL),
                       'in_app', count(DISTINCT visitor_id) FILTER (WHERE lower(coalesce(browser, '')) LIKE '%in-app%'))
                   FROM tagged),
        'tests', (SELECT coalesce(jsonb_agg(o ORDER BY o.visitors DESC, o.last_seen DESC), '[]'::jsonb) FROM (
            SELECT platform, test_id, path, title, deleted, creator_id, creator_name, is_team,
                   visitors, sessions, in_app, reshared, mobile, engagement_rate, avg_engaged_ms,
                   first_seen, last_seen, days, weekdays, all_viewers
            FROM out ORDER BY visitors DESC, last_seen DESC
            LIMIT least(greatest(coalesce(p_limit, 60), 1), 300)) o)
    )
$function$;
