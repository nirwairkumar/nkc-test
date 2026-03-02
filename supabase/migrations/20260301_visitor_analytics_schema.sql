-- Visitor Analytics Schema Migration
-- Run this in your Supabase SQL Editor

-- 1. Create Visitors Table
CREATE TABLE IF NOT EXISTS public.visitors (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint     TEXT NOT NULL UNIQUE,              -- SHA-256 hash of browser attributes
    first_seen_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_seen_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    total_visits    INTEGER DEFAULT 1 NOT NULL,        -- lifetime visit count
    user_id         UUID REFERENCES auth.users(id),    -- nullable, linked if user logs in
    country         TEXT,                               -- ISO 3166-1 alpha-2 (e.g., "IN")
    city            TEXT,
    device_type     TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    browser         TEXT,                               -- e.g., "Chrome 120"
    os              TEXT,                               -- e.g., "Windows 11"
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for Visitors
CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON public.visitors(fingerprint);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON public.visitors(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON public.visitors(user_id) WHERE user_id IS NOT NULL;

-- 2. Create Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id      UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    session_token   TEXT NOT NULL UNIQUE,               -- UUID generated on frontend
    started_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at        TIMESTAMPTZ,                        -- updated on last activity
    duration_secs   INTEGER DEFAULT 0,                  -- calculated on session close
    page_count      INTEGER DEFAULT 0,                  -- number of pages in session
    entry_page      TEXT,                                -- first page visited
    exit_page       TEXT,                                -- last page visited
    referrer        TEXT,                                -- where the user came from
    utm_source      TEXT,
    utm_medium      TEXT,
    utm_campaign    TEXT,
    is_bounce       BOOLEAN DEFAULT true,               -- true if only 1 page viewed
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON public.sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON public.sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);

-- 3. Create Page Views Table
CREATE TABLE IF NOT EXISTS public.page_views (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    visitor_id      UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    page_path       TEXT NOT NULL,                      -- e.g., "/tests/math-101"
    page_title      TEXT,                               -- document.title
    timestamp       TIMESTAMPTZ DEFAULT now() NOT NULL,
    time_on_page    INTEGER,                            -- seconds spent (calculated retroactively)
    referrer_page   TEXT,                               -- previous page (internal navigation)
    is_unique       BOOLEAN DEFAULT false,              -- first time this visitor saw this page
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for Page Views
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON public.page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON public.page_views(timestamp DESC);

-- 4. Create Daily Stats Table
CREATE TABLE IF NOT EXISTS public.daily_stats (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date       DATE NOT NULL UNIQUE,
    total_visitors      INTEGER DEFAULT 0,              -- unique visitors that day
    new_visitors        INTEGER DEFAULT 0,              -- first-time visitors
    returning_visitors  INTEGER DEFAULT 0,              -- visitors who came back
    total_sessions      INTEGER DEFAULT 0,
    total_page_views    INTEGER DEFAULT 0,
    avg_session_duration NUMERIC(10,2) DEFAULT 0,       -- in seconds
    bounce_rate         NUMERIC(5,2) DEFAULT 0,         -- percentage
    top_pages           JSONB DEFAULT '[]'::JSONB,      -- [{path, views}]
    top_referrers       JSONB DEFAULT '[]'::JSONB,      -- [{source, count}]
    device_breakdown    JSONB DEFAULT '{}'::JSONB,       -- {desktop: N, mobile: N, ...}
    country_breakdown   JSONB DEFAULT '{}'::JSONB,       -- {IN: N, US: N, ...}
    created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for Daily Stats
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date ON public.daily_stats(stat_date);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access (only backend service role writes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'visitors' AND policyname = 'Service role only'
    ) THEN
        CREATE POLICY "Service role only" ON public.visitors
            FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sessions' AND policyname = 'Service role only'
    ) THEN
        CREATE POLICY "Service role only" ON public.sessions
            FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'page_views' AND policyname = 'Service role only'
    ) THEN
        CREATE POLICY "Service role only" ON public.page_views
            FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_stats' AND policyname = 'Admins can read stats'
    ) THEN
        CREATE POLICY "Admins can read stats" ON public.daily_stats
            FOR SELECT USING (auth.role() = 'authenticated' AND (auth.jwt() ->> 'role') = 'admin' OR auth.role() = 'service_role');
    END IF;
END $$;

-- 6. Database Functions
CREATE OR REPLACE FUNCTION public.aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
DECLARE
    stats RECORD;
BEGIN
    SELECT
        COUNT(DISTINCT pv.visitor_id) AS total_visitors,
        COUNT(DISTINCT CASE WHEN v.first_seen_at::DATE = target_date THEN v.id END) AS new_visitors,
        COUNT(DISTINCT CASE WHEN v.first_seen_at::DATE < target_date THEN v.id END) AS returning_visitors,
        COUNT(DISTINCT s.id) AS total_sessions,
        COUNT(pv.id) AS total_page_views,
        COALESCE(AVG(s.duration_secs), 0) AS avg_session_duration,
        COALESCE(
            (COUNT(CASE WHEN s.is_bounce THEN 1 END)::NUMERIC / NULLIF(COUNT(DISTINCT s.id), 0)) * 100,
            0
        ) AS bounce_rate
    INTO stats
    FROM public.page_views pv
    JOIN public.visitors v ON v.id = pv.visitor_id
    JOIN public.sessions s ON s.id = pv.session_id
    WHERE pv.timestamp::DATE = target_date;

    INSERT INTO public.daily_stats (stat_date, total_visitors, new_visitors, returning_visitors,
        total_sessions, total_page_views, avg_session_duration, bounce_rate)
    VALUES (target_date, stats.total_visitors, stats.new_visitors, stats.returning_visitors,
        stats.total_sessions, stats.total_page_views, stats.avg_session_duration, stats.bounce_rate)
    ON CONFLICT (stat_date) DO UPDATE SET
        total_visitors = EXCLUDED.total_visitors,
        new_visitors = EXCLUDED.new_visitors,
        returning_visitors = EXCLUDED.returning_visitors,
        total_sessions = EXCLUDED.total_sessions,
        total_page_views = EXCLUDED.total_page_views,
        avg_session_duration = EXCLUDED.avg_session_duration,
        bounce_rate = EXCLUDED.bounce_rate,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.page_views WHERE timestamp < now() - INTERVAL '90 days';
    DELETE FROM public.sessions WHERE started_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
