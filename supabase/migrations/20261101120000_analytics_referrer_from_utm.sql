-- "Websites" list (p_dim = 'referrer') missed ChatGPT.
-- ChatGPT opens links with no Referer header and adds ?utm_source=chatgpt.com instead,
-- so referrer_host was empty for 182 of 188 ChatGPT visits (Oct 2026). The channel
-- ("AI assistants") was right; only the Websites view dropped them.
-- Fix: when there is no referrer but utm_source is a domain name (chatgpt.com,
-- perplexity.ai, ...), show that domain. Works on old visits too — no data change.

CREATE OR REPLACE FUNCTION public.analytics_ref_site(p_referrer_host text, p_utm_source text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
    SELECT coalesce(
        p_referrer_host,
        CASE WHEN lower(btrim(p_utm_source)) ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'
             THEN regexp_replace(lower(btrim(p_utm_source)), '^(www|m|l)\.', '')
        END
    )
$$;

CREATE OR REPLACE FUNCTION public.analytics_report_breakdown(p_from timestamp with time zone, p_to timestamp with time zone, p_site text DEFAULT NULL::text, p_dim text DEFAULT 'channel'::text, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
                       WHEN 'referrer'     THEN public.analytics_ref_site(s.referrer_host, s.utm_source)
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
END $function$;
