# 🔍 Visitor Analytics — Industrial-Grade Implementation Plan

> **Stack**: Frontend (Cloudflare) → Backend (Railway/FastAPI) → Database (Supabase/PostgreSQL)  
> **Goal**: Track every visitor, their visit count, pages visited, and behavioral metadata at production scale.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model (Supabase)](#2-data-model-supabase)
3. [Backend API (Railway/FastAPI)](#3-backend-api-railwayfastapi)
4. [Frontend Integration](#4-frontend-integration)
5. [Cloudflare Edge Analytics (Optional but Recommended)](#5-cloudflare-edge-analytics)
6. [Analytics Dashboard](#6-analytics-dashboard)
7. [Data Retention & GDPR Compliance](#7-data-retention--gdpr-compliance)
8. [Scalability & Performance](#8-scalability--performance)
9. [File-by-File Implementation Map](#9-file-by-file-implementation-map)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VISITOR FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User visits site                                               │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────┐    Beacon / POST     ┌─────────────────┐  │
│  │   Cloudflare     │ ──────────────────▶  │   Railway        │  │
│  │   (Frontend)     │                      │   (FastAPI)      │  │
│  │                  │                      │                  │  │
│  │  • fingerprint   │                      │  • validate      │  │
│  │  • session ID    │                      │  • deduplicate   │  │
│  │  • page path     │                      │  • geolocate     │  │
│  │  • referrer      │                      │  • store         │  │
│  └──────────────────┘                      └────────┬─────────┘  │
│                                                     │            │
│                                           ┌─────────▼─────────┐  │
│                                           │   Supabase        │  │
│                                           │   (PostgreSQL)    │  │
│                                           │                   │  │
│                                           │  • visitors       │  │
│                                           │  • page_views     │  │
│                                           │  • sessions       │  │
│                                           │  • daily_stats    │  │
│                                           └───────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle | Why |
|-----------|-----|
| **Fingerprint-based identification** | Track unique visitors without requiring login (privacy-safe) |
| **Session-based grouping** | Group page views into sessions (30-min inactivity timeout) |
| **Server-side storage only** | Frontend collects, backend validates and stores — no client-side DB writes |
| **Batched writes** | Minimize DB round-trips by buffering events on the backend |
| **Materialized daily stats** | Pre-aggregate for fast dashboard queries |
| **Edge-level fallback** | Cloudflare Workers can log basic hits even if backend is down |

---

## 2. Data Model (Supabase)

### 2.1 `visitors` — Unique Visitor Registry

Tracks each unique visitor by a fingerprint hash. One row per unique browser/device combo.

```sql
CREATE TABLE public.visitors (
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

-- Indexes for fast lookups
CREATE INDEX idx_visitors_fingerprint ON public.visitors(fingerprint);
CREATE INDEX idx_visitors_last_seen ON public.visitors(last_seen_at DESC);
CREATE INDEX idx_visitors_user_id ON public.visitors(user_id) WHERE user_id IS NOT NULL;
```

### 2.2 `sessions` — Visit Sessions

Groups page views into sessions. A new session starts after 30 minutes of inactivity.

```sql
CREATE TABLE public.sessions (
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

CREATE INDEX idx_sessions_visitor ON public.sessions(visitor_id);
CREATE INDEX idx_sessions_started ON public.sessions(started_at DESC);
CREATE INDEX idx_sessions_token ON public.sessions(session_token);
```

### 2.3 `page_views` — Individual Page Hit Log

Every single page navigation is logged here. This is the raw event log.

```sql
CREATE TABLE public.page_views (
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

-- Partitioning hint: Consider partitioning by month for large datasets
CREATE INDEX idx_page_views_session ON public.page_views(session_id);
CREATE INDEX idx_page_views_visitor ON public.page_views(visitor_id);
CREATE INDEX idx_page_views_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_timestamp ON public.page_views(timestamp DESC);
```

### 2.4 `daily_stats` — Pre-Aggregated Daily Analytics

Materialized daily rollups for fast dashboard queries. Populated by a scheduled function.

```sql
CREATE TABLE public.daily_stats (
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

CREATE UNIQUE INDEX idx_daily_stats_date ON public.daily_stats(stat_date);
```

### 2.5 RLS (Row Level Security) Policies

```sql
-- Only service role (backend) can INSERT into analytics tables
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access (only backend service role writes)
CREATE POLICY "Service role only" ON public.visitors
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.page_views
    FOR ALL USING (auth.role() = 'service_role');

-- Admins can read daily_stats
CREATE POLICY "Admins can read stats" ON public.daily_stats
    FOR SELECT USING (auth.role() = 'service_role');
```

### 2.6 Database Functions

#### Auto-aggregate daily stats (run via pg_cron or Supabase scheduled function)

```sql
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
```

---

## 3. Backend API (Railway/FastAPI)

### 3.1 New Router: `app/routers/analytics.py`

```
backend/app/routers/
├── analytics/
│   ├── __init__.py
│   ├── track.py          # POST /api/analytics/track — receives events
│   ├── stats.py          # GET  /api/analytics/stats — dashboard queries
│   └── models.py         # Pydantic models for request/response
```

### 3.2 Event Tracking Endpoint

**`POST /api/analytics/track`** — Public endpoint, no auth required.

```python
# Request body
{
    "event_type": "page_view",         # "page_view" | "session_start" | "session_end"
    "fingerprint": "a1b2c3d4...",      # SHA-256 hash from frontend
    "session_token": "uuid-v4",        # Generated per session on frontend
    "page_path": "/tests/math-101",
    "page_title": "Math 101 Test",
    "referrer": "https://google.com",
    "utm_source": "twitter",           # optional
    "utm_medium": "social",            # optional
    "utm_campaign": "launch2026",      # optional
    "screen_width": 1920,
    "screen_height": 1080,
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2026-03-01T23:30:00Z"
}
```

**Backend logic flow:**

```
1. Validate payload (Pydantic model)
2. Rate-limit by IP (max 100 events/min per IP)
3. Extract device/browser/OS from User-Agent string
4. Geolocate from request IP (use Cloudflare CF-IPCountry header or free GeoIP)
5. UPSERT into visitors table (create or update last_seen + increment total_visits)
6. UPSERT into sessions table (create new or update existing session)
7. INSERT into page_views table
8. Return 204 No Content (fire-and-forget for the client)
```

### 3.3 Stats Dashboard Endpoints (Admin-only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/stats/overview` | GET | Total visitors, page views, sessions (with date range) |
| `/api/analytics/stats/daily` | GET | Daily breakdown for charts |
| `/api/analytics/stats/pages` | GET | Top pages by view count |
| `/api/analytics/stats/referrers` | GET | Top referral sources |
| `/api/analytics/stats/visitors` | GET | Visitor list with visit counts |
| `/api/analytics/stats/live` | GET | Active visitors in the last 5 minutes |
| `/api/analytics/stats/geo` | GET | Country/city breakdown |

All stats endpoints require admin authentication.

### 3.4 Rate Limiting & Anti-Abuse

```python
# Implement in-memory rate limiter (or Redis if available)
RATE_LIMITS = {
    "per_ip_per_minute": 100,       # max events per IP per minute
    "per_fingerprint_per_minute": 30,# max events per fingerprint per minute
    "max_payload_size_bytes": 2048,  # reject oversized payloads
}

# Validation rules
VALIDATION_RULES = {
    "fingerprint_length": 64,         # SHA-256 hex = 64 chars
    "session_token_format": "uuid",   # must be valid UUID
    "page_path_max_length": 500,
    "referrer_max_length": 2000,
    "blocked_bots": ["Googlebot", "bingbot", "AhrefsBot", ...]  # filter known bots
}
```

### 3.5 Register the Router in `main.py`

```python
from app.routers import analytics
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
```

---

## 4. Frontend Integration

### 4.1 New Files

```
frontend/src/lib/
├── analyticsTracker.ts      # Core tracking logic
├── fingerprint.ts           # Browser fingerprint generator
├── analyticsApi.ts          # API calls to backend
```

### 4.2 `fingerprint.ts` — Browser Fingerprint Generator

A lightweight, privacy-respecting fingerprint that combines:

| Signal | Example |
|--------|---------|
| Screen resolution | `1920x1080` |
| Color depth | `24` |
| Timezone offset | `-330` (IST) |
| Language | `en-US` |
| Platform | `Win32` |
| Hardware concurrency | `8` |
| Canvas fingerprint | Hash of canvas render |
| WebGL renderer | `ANGLE (NVIDIA...)` |

All signals are hashed with SHA-256 into a single fingerprint string. No cookies, no PII.

### 4.3 `analyticsTracker.ts` — Core Tracker

```typescript
// Pseudo-code for the tracker
class AnalyticsTracker {
    private fingerprint: string;
    private sessionToken: string;
    private lastActivity: number;
    private SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    constructor() {
        this.fingerprint = generateFingerprint();
        this.sessionToken = this.getOrCreateSession();
    }

    // Called on every route change
    trackPageView(path: string, title: string) {
        this.refreshSession();
        this.send({
            event_type: "page_view",
            fingerprint: this.fingerprint,
            session_token: this.sessionToken,
            page_path: path,
            page_title: title,
            referrer: document.referrer,
            ...this.getUTMParams(),
            screen_width: screen.width,
            screen_height: screen.height,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        });
    }

    // Uses navigator.sendBeacon for reliability
    private send(data: object) {
        const url = `${API_BASE}/api/analytics/track`;
        navigator.sendBeacon(url, JSON.stringify(data));
    }

    // Session management using sessionStorage
    private getOrCreateSession(): string {
        let token = sessionStorage.getItem("nkc_session");
        if (!token || this.isSessionExpired()) {
            token = crypto.randomUUID();
            sessionStorage.setItem("nkc_session", token);
            sessionStorage.setItem("nkc_session_start", Date.now().toString());
        }
        return token;
    }
}
```

### 4.4 Integration Points

#### In `App.tsx` or `Layout.tsx`

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsTracker } from '@/lib/analyticsTracker';

function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        analyticsTracker.trackPageView(
            location.pathname,
            document.title
        );
    }, [location.pathname]);
}
```

Place `usePageTracking()` inside `Layout.tsx` so every page change is tracked automatically.

---

## 5. Cloudflare Edge Analytics (Optional but Recommended)

### Why?

If the Railway backend is down, you lose analytics data. Cloudflare Workers can act as a **backup logger** that captures basic hits at the edge.

### 5.1 Cloudflare Worker Script

```javascript
// workers/analytics-edge.js
export default {
    async fetch(request, env) {
        // Forward the request to origin
        const response = await fetch(request);

        // Log to Cloudflare Analytics Engine (free, built-in)
        const url = new URL(request.url);
        env.ANALYTICS.writeDataPoint({
            blobs: [
                url.pathname,                              // page path
                request.headers.get("cf-ipcountry") || "", // country
                request.headers.get("user-agent") || "",   // user agent
                request.headers.get("referer") || "",      // referrer
            ],
            doubles: [1],                                  // hit count
            indexes: [url.pathname],                       // for fast lookups
        });

        return response;
    }
};
```

### 5.2 Benefits

| Feature | Edge | Backend |
|---------|------|---------|
| Works when backend is down | ✅ | ❌ |
| Zero latency impact | ✅ | Minimal |
| Geo data from CF headers | ✅ | Needs GeoIP |
| Deep user tracking | ❌ | ✅ |
| Session tracking | ❌ | ✅ |

> **Recommendation**: Use both — Edge for high-level traffic stats, Backend for deep user analytics.

---

## 6. Analytics Dashboard

### 6.1 New Frontend Page: `/admin/analytics`

A dedicated admin-only page showing:

| Section | Metrics |
|---------|---------|
| **Overview Cards** | Total visitors today, total page views, active now, bounce rate |
| **Visitor Trend Chart** | Line chart — visitors over last 30 days |
| **Top Pages Table** | Most visited pages with view counts |
| **Traffic Sources** | Pie chart of referrers (Direct, Google, Social, etc.) |
| **Device Breakdown** | Desktop vs Mobile vs Tablet |
| **Geographic Map** | Choropleth map by country |
| **Visitor List** | Table with fingerprint (masked), visit count, last seen, pages visited |
| **Real-time** | Live counter of visitors in last 5 minutes |

### 6.2 New Files for Dashboard

```
frontend/src/pages/
├── AdminAnalytics.tsx          # Main analytics dashboard page

frontend/src/components/analytics/
├── OverviewCards.tsx            # Key metric cards
├── VisitorTrendChart.tsx        # Line chart (use Recharts or Chart.js)
├── TopPagesTable.tsx            # Table of popular pages
├── TrafficSourcesPie.tsx        # Referrer breakdown
├── DeviceBreakdown.tsx          # Device type pie chart
├── GeoMap.tsx                   # Country heatmap
├── LiveVisitorCounter.tsx       # Real-time active users
```

---

## 7. Data Retention & GDPR Compliance

### 7.1 Retention Policy

| Data | Retention | Action |
|------|-----------|--------|
| `page_views` (raw) | 90 days | Auto-delete via scheduled function |
| `sessions` | 90 days | Auto-delete via scheduled function |
| `visitors` | Indefinite | Keep for lifetime stats |
| `daily_stats` | Indefinite | Aggregated, no PII |

### 7.2 Cleanup Function (Scheduled)

```sql
-- Run daily via pg_cron or Supabase Edge Function cron
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.page_views WHERE timestamp < now() - INTERVAL '90 days';
    DELETE FROM public.sessions WHERE started_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Privacy Considerations

- ✅ **No cookies used** — fingerprint is stateless, based on browser attributes
- ✅ **No IP addresses stored** — only used for geo-lookup, then discarded
- ✅ **No PII in analytics tables** — fingerprint is a one-way hash
- ✅ **Aggregated data for dashboards** — individual tracking data is ephemeral
- ⚠️ **Add a privacy notice** — inform users that anonymous usage stats are collected
- ⚠️ **Honor Do-Not-Track** — check `navigator.doNotTrack` and skip tracking if set

---

## 8. Scalability & Performance

### 8.1 Expected Load Handling

| Scale | Visitors/Day | Page Views/Day | DB Writes/Day | Strategy |
|-------|-------------|----------------|----------------|----------|
| **Small** | < 1K | < 10K | < 10K | Direct writes, no batching |
| **Medium** | 1K–50K | 10K–500K | 10K–500K | Backend write buffer (batch every 5s) |
| **Large** | 50K–500K | 500K–5M | 500K–5M | Queue (Redis/BullMQ) + batch insert |
| **Enterprise** | 500K+ | 5M+ | 5M+ | Event streaming (Kafka) + data warehouse |

### 8.2 Optimizations for Your Current Scale

1. **Use `navigator.sendBeacon()`** — non-blocking, fire-and-forget from frontend
2. **Backend batching** — accumulate events in memory for 5 seconds, then batch INSERT
3. **UNLOGGED tables for page_views** — faster writes (acceptable data loss on crash)
4. **Table partitioning** — partition `page_views` by month for fast deletes
5. **Connection pooling** — use Supabase's built-in PgBouncer (port 6543)
6. **Daily aggregation** — pre-compute `daily_stats` so dashboard queries are instant

### 8.3 Monitoring

| What | How |
|------|-----|
| API latency | Railway metrics + `/api/health` |
| DB connection pool | Supabase dashboard → Database → Pooler |
| Table sizes | `pg_total_relation_size()` queries |
| Error rates | Structured logging in FastAPI |
| Write throughput | Track inserts/sec in daily stats |

---

## 9. File-by-File Implementation Map

### Phase 1: Database (Supabase)
| # | Action | Target |
|---|--------|--------|
| 1 | Create `visitors` table | Supabase SQL Editor / Migration |
| 2 | Create `sessions` table | Supabase SQL Editor / Migration |
| 3 | Create `page_views` table | Supabase SQL Editor / Migration |
| 4 | Create `daily_stats` table | Supabase SQL Editor / Migration |
| 5 | Add RLS policies | Supabase SQL Editor |
| 6 | Create `aggregate_daily_stats()` function | Supabase SQL Editor |
| 7 | Create `cleanup_old_analytics()` function | Supabase SQL Editor |
| 8 | Schedule cron jobs (daily aggregate + cleanup) | Supabase Edge Function or pg_cron |

### Phase 2: Backend (Railway/FastAPI)
| # | Action | File |
|---|--------|------|
| 1 | Create analytics models | `backend/app/routers/analytics/models.py` |
| 2 | Create tracking endpoint | `backend/app/routers/analytics/track.py` |
| 3 | Create stats endpoints | `backend/app/routers/analytics/stats.py` |
| 4 | Create router init | `backend/app/routers/analytics/__init__.py` |
| 5 | Register router in main | `backend/app/main.py` |
| 6 | Add rate limiting middleware | `backend/app/utils/rate_limiter.py` |
| 7 | Add User-Agent parser | `backend/requirements.txt` (add `user-agents` package) |

### Phase 3: Frontend (Cloudflare)
| # | Action | File |
|---|--------|------|
| 1 | Create fingerprint generator | `frontend/src/lib/fingerprint.ts` |
| 2 | Create analytics tracker | `frontend/src/lib/analyticsTracker.ts` |
| 3 | Create analytics API client | `frontend/src/lib/analyticsApi.ts` |
| 4 | Hook into route changes | `frontend/src/Layout.tsx` |
| 5 | Add privacy consent notice | `frontend/src/components/CookieConsent.tsx` |

### Phase 4: Dashboard
| # | Action | File |
|---|--------|------|
| 1 | Create admin analytics page | `frontend/src/pages/AdminAnalytics.tsx` |
| 2 | Create overview cards component | `frontend/src/components/analytics/OverviewCards.tsx` |
| 3 | Create visitor trend chart | `frontend/src/components/analytics/VisitorTrendChart.tsx` |
| 4 | Create top pages table | `frontend/src/components/analytics/TopPagesTable.tsx` |
| 5 | Add route to App.tsx | `frontend/src/App.tsx` |
| 6 | Install chart library | `npm install recharts` |

### Phase 5: Edge Analytics (Optional)
| # | Action | File |
|---|--------|------|
| 1 | Create Cloudflare Worker | `infrastructure/workers/analytics-edge.js` |
| 2 | Configure wrangler.toml | `infrastructure/wrangler.toml` |
| 3 | Deploy worker | `npx wrangler deploy` |

---

## Summary

This plan gives you **complete, industrial-grade visitor analytics** with:

- 🧬 **Fingerprint-based unique visitor tracking** (no cookies)
- 📊 **Session-aware page view logging** (30-min timeout)
- 🚀 **Optimized for performance** (sendBeacon, batch writes, pre-aggregation)
- 🔒 **Secure by default** (RLS, rate limiting, no PII stored)
- 📈 **Admin dashboard ready** (overview, charts, tables, real-time)
- 🌍 **Geo-aware** (country/city from Cloudflare headers)
- 🧹 **Self-cleaning** (90-day auto-retention for raw data)
- ☁️ **Edge backup** (Cloudflare Workers for resilience)

> **Estimated implementation time**: 3-5 days for full implementation across all phases.
