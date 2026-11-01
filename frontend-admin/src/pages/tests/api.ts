/**
 * Admin → Manage Tests API (backend: app/routers/analytics/insights.py `/manage-tests`,
 * SQL: supabase/migrations/20261016120000_admin_manage_tests.sql).
 *
 * Every count is computed in Postgres; no question, answer or result content is sent.
 */
import apiClient from '@/lib/apiClient';
import { NotInstalledError } from '../analytics/api';

export type TestView = 'all' | 'live' | 'exams' | 'public' | 'link' | 'private' | 'unused' | 'reported' | 'examples' | 'team';
export type TestSort = 'newest' | 'activity' | 'results' | 'title';
export type Visibility = 'public' | 'unlisted' | 'private';
/** live = exam link open now · scheduled = opens later · ended = was run as an exam. */
export type ExamStatus = 'live' | 'scheduled' | 'ended';

export interface TestCreator {
    id?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    designation?: string;
    verified?: boolean;
    is_team?: boolean;
}

export interface TestRow {
    id: string;
    custom_id?: string;
    title: string;
    created_at: string;
    slug?: string;
    visibility: Visibility;
    questions: number;
    minutes?: number;
    marks?: number;
    sections?: number;
    class_name?: string;
    is_example?: boolean;
    is_cloned?: boolean;
    has_solutions?: boolean;
    proctored?: boolean;
    status?: ExamStatus;
    live_since?: string;
    starts_at?: string;
    ends_at?: string;
    ended_at?: string;
    join_code?: string;
    /** Submissions by anyone but the creator. */
    results: number;
    results_7d: number;
    candidates: number;
    /** The creator's own runs. */
    previews: number;
    last_result_at?: string;
    avg_pct?: number;
    best_pct?: number;
    writing_now: number;
    /** Started and not submitted (yet). */
    unfinished: number;
    reports_open: number;
    creator: TestCreator;
}

export type TestCounts = Record<TestView, number>;

export interface TestSummary {
    tests: number;
    new_7d: number;
    creators: number;
    live: number;
    scheduled: number;
    writing_now: number;
    results: number;
    results_7d: number;
    taken: number;
    unused: number;
    reports_open: number;
}

export interface TestsReport {
    rows: TestRow[];
    total: number;
    counts: TestCounts;
    summary: TestSummary;
    creator?: { id: string; name?: string; email?: string } | null;
}

export interface TestDetail {
    test: TestRow & {
        class_id?: string;
        cloned_from_id?: string;
        created_by?: string;
        description?: string;
        tags?: string[];
        settings: Record<string, any>;
    };
    creator: (TestCreator & { joined_at?: string; tests?: number }) | null;
    categories: { id: string; name: string }[];
    sub_category: { id: string; name: string; category_id: string } | null;
    daily: { d: string; n: number }[];
    modes: { exam: number; practice: number; flagged: number };
    recent: { id: string; at: string; score: number | null; pct?: number; name?: string; exam?: boolean; violations?: number }[];
    reports: { id: string; question: number; reason: string; details?: string; at: string }[];
    clones: number;
    combined: { id: string; title: string }[];
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

export const testsApi = {
    list: (p: { view: TestView; q?: string; sort: TestSort; creator?: string | null; limit?: number; offset?: number }) =>
        get<TestsReport>('manage-tests', {
            view: p.view,
            sort: p.sort,
            q: p.q || undefined,
            creator: p.creator || undefined,
            limit: p.limit ?? 40,
            offset: p.offset ?? 0,
        }),
    detail: (id: string) => get<TestDetail>(`manage-tests/${id}`),
};
