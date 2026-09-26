/**
 * Analytics v2 admin API (backend: app/routers/analytics/insights.py).
 * Every number is computed in Postgres over the full period — bots and team
 * traffic excluded, days in IST.
 */
import apiClient from '@/lib/apiClient';

export type Period = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '12m';
export type Site = 'all' | 'main' | 'pdf' | 'blog';
export type Traffic = 'humans' | 'bots' | 'internal' | 'all';

export interface Range {
    period: string;
    from: string;
    to: string;
    prev_from: string;
    prev_to: string;
    bucket: 'hour' | 'day' | 'week' | 'month';
}

export interface Summary {
    visitors: number;
    new_visitors: number;
    returning_visitors: number;
    sessions: number;
    engaged_sessions: number;
    signed_in_sessions: number;
    pageviews: number;
    session_pageviews: number;
    engaged_ms_total: number;
    test_link_sessions: number;
    signups: number;
    tests_created: number;
    test_starts: number;
    submissions: number;
    guest_submissions: number;
    ai_generations: number;
    pdf_exports: number;
}

export interface SeriesPoint {
    t: string; // IST wall-clock, "YYYY-MM-DDTHH:MM"
    visitors: number;
    sessions: number;
    engaged_sessions: number;
    avg_engaged_ms: number;
    pageviews: number;
    signups: number;
    submissions: number;
    tests_created: number;
}

export interface BreakdownRow {
    key: string;
    label?: string | null;
    host?: string | null;
    visitors: number;
    sessions: number;
    pageviews: number;
    engagement_rate?: number;
    avg_engaged_ms: number | null;
    avg_scroll_pct?: number | null;
}

export interface Overview {
    range: Range;
    summary: Summary;
    previous: Summary;
    series: SeriesPoint[];
    prev_series: SeriesPoint[];
    pages: BreakdownRow[];
    channels: BreakdownRow[];
    referrers: BreakdownRow[];
    countries: BreakdownRow[];
    regions: BreakdownRow[];
    devices: BreakdownRow[];
    landing: BreakdownRow[];
}

export interface HeatCell {
    dow: number; // 1 = Monday
    hour: number;
    sessions: number;
    visitors: number;
}

export interface TrafficReport {
    range: Range;
    channels: BreakdownRow[];
    referrers: BreakdownRow[];
    utm_sources: BreakdownRow[];
    utm_mediums: BreakdownRow[];
    utm_campaigns: BreakdownRow[];
    landing: BreakdownRow[];
    pages: BreakdownRow[];
    entries: BreakdownRow[];
    exits: BreakdownRow[];
    countries: BreakdownRow[];
    regions: BreakdownRow[];
    cities: BreakdownRow[];
    devices: BreakdownRow[];
    browsers: BreakdownRow[];
    oses: BreakdownRow[];
    screens: BreakdownRow[];
    languages: BreakdownRow[];
    visitor_types: BreakdownRow[];
    hosts: BreakdownRow[];
    heatmap: HeatCell[];
}

export interface Realtime {
    online: number;
    sessions: number;
    pages: { host: string; path: string; title: string | null; visitors: number }[];
    channels: { key: string; visitors: number }[];
    countries: { key: string; visitors: number }[];
    minutes: number[];
}

export interface SessionRow {
    id: string;
    visitor_id: string;
    user_id: string | null;
    started_at: string;
    last_seen_at: string;
    host: string;
    entry_path: string;
    exit_path: string | null;
    pageviews: number;
    events: number;
    engaged_ms: number;
    is_engaged: boolean;
    is_new_visitor: boolean;
    channel: string;
    referrer_host: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    country_code: string | null;
    region: string | null;
    city: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    screen: string | null;
    language: string | null;
    is_bot: boolean;
    bot_reason: string | null;
    is_internal: boolean;
    landing_type: string;
    visitor_sessions: number;
    visitor_first_seen_at: string;
    user_name: string | null;
    user_email: string | null;
    user_designation: string | null;
}

export interface SessionsPage {
    range: Range;
    rows: SessionRow[];
    next_before: string | null;
}

export interface SessionDetail {
    pages: { id: string; seq: number; ts: string; host: string; path: string; title: string | null; engaged_ms: number; scroll_pct: number | null }[];
    events: { id: number; ts: string; name: string; host: string | null; path: string | null; props: Record<string, unknown>; pageview_id: string | null }[];
}

export interface PersonSession {
    id: string;
    started_at: string;
    last_seen_at: string;
    host: string;
    entry_path: string;
    exit_path: string | null;
    pageviews: number;
    engaged_ms: number;
    is_engaged: boolean;
    channel: string;
    referrer_host: string | null;
    utm_source: string | null;
    country_code: string | null;
    region: string | null;
    city: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    is_internal: boolean;
    is_bot: boolean;
    landing_type: string;
}

export interface Person {
    user: null | {
        id: string;
        full_name: string | null;
        email: string | null;
        designation: string | null;
        created_at: string;
        is_premium: boolean | null;
        avatar_url: string | null;
        is_team: boolean;
        tests_created: number;
        tests_taken: number;
        submissions_received: number;
        ai_generations: number;
        recent_tests: { id: string; title: string; slug: string | null; created_at: string; is_public: boolean; submissions: number }[];
    };
    devices: { id: string; first_seen_at: string; last_seen_at: string; sessions_count: number; pageviews_count: number; device_type: string | null; browser: string | null; os: string | null; country_code: string | null; region: string | null; city: string | null; is_internal: boolean }[];
    first_touch: null | { first_seen_at: string; channel: string | null; referrer_host: string | null; landing_path: string | null; host: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; landing_type: string };
    totals: { sessions: number; pageviews: number; engaged_ms: number; first_seen_at: string | null; last_seen_at: string | null };
    sessions: PersonSession[];
}

export interface Growth {
    visitors: number;
    new_visitors: number;
    signups: number;
    created_test: number;
    got_submission: number;
    took_test: number;
    median_hours_to_first_test: number | null;
    by_role: { key: string; signups: number; created_test: number; got_submission: number }[];
    by_channel: { key: string; signups: number; created_test: number }[];
    by_landing: { key: string; signups: number }[];
}

export interface GrowthReport {
    range: Range;
    growth: Growth;
    previous: Growth;
    active: { d: string; dau: number; wau: number; mau: number }[];
    retention: { cohort: string; size: number; weeks: number[] }[];
    north_star: SeriesPoint[];
}

export interface TestRow {
    id: string;
    title: string;
    slug: string | null;
    created_at: string;
    is_public: boolean;
    created_by: string | null;
    creator_name: string | null;
    is_team: boolean | null;
    views: number;
    viewers: number;
    starts: number;
    submissions: number;
    guest_submissions: number;
    avg_score_pct: number | null;
}

export interface TestsReport {
    range: Range;
    tests: TestRow[];
    created: { total: number; team: number; public: number; cloned: number; creators: number };
    ai: { key: string; count: number; users: number; questions: number }[];
    pdf: { key: string; count: number; visitors: number }[];
    events: { key: string; count: number; visitors: number }[];
    summary: Summary;
    previous: Summary;
}

export interface Health {
    tracking_since: string | null;
    last_event_at: string | null;
    sessions_24h: number;
    sessions_7d: number;
    human_sessions_7d: number;
    bot_sessions_7d: number;
    internal_sessions_7d: number;
    country_coverage_7d: number | null;
    city_coverage_7d: number | null;
    engagement_coverage_7d: number | null;
    legacy: { page_views: number; first_at: string | null; last_at: string | null };
}

/** Thrown when the analytics v2 SQL migration has not been applied yet. */
export class NotInstalledError extends Error {
    constructor() {
        super('analytics_v2_not_installed');
    }
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
        const res = await apiClient.get(`analytics/v2/${path}`, { params });
        return res.data as T;
    } catch (err: any) {
        if (err?.response?.status === 424 && err?.response?.data?.detail === 'analytics_v2_not_installed') {
            throw new NotInstalledError();
        }
        throw err;
    }
}

export const insightsApi = {
    overview: (period: Period, site: Site) => get<Overview>('overview', { period, site }),
    traffic: (period: Period, site: Site) => get<TrafficReport>('traffic', { period, site }),
    realtime: (site: Site) => get<Realtime>('realtime', { site }),
    sessions: (p: { period: Period; site: Site; traffic: Traffic; q?: string; before?: string | null; visitor?: string; user?: string; limit?: number }) =>
        get<SessionsPage>('sessions', { ...p, before: p.before || undefined, q: p.q || undefined, limit: p.limit ?? 40 }),
    session: (id: string) => get<SessionDetail>(`sessions/${id}`),
    person: (p: { visitor?: string | null; user?: string | null }) =>
        get<Person>('person', { visitor: p.visitor || undefined, user: p.user || undefined }),
    growth: (period: Period) => get<GrowthReport>('growth', { period }),
    tests: (period: Period) => get<TestsReport>('tests', { period, limit: 50 }),
    health: () => get<Health>('health'),
};
