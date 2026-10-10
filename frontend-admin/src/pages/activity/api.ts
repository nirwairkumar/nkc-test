/**
 * Admin → Live Activity (exam operations).
 * Backend: app/routers/analytics/exam_ops.py. Every day boundary is IST.
 */
import apiClient from '@/lib/apiClient';
import type { Period } from '../analytics/api';

export type { Period };
/** Whose exams to count. "customers" leaves our own team's runs out — the default. */
export type Audience = 'customers' | 'everyone' | 'team';

export interface Totals {
    exams: number;
    /** Sittings where 3 or more candidates submitted — a class, not a poke at a link. */
    exams_with_a_class: number;
    exams_mostly_blank: number;
    candidates: number;
    submissions: number;
    educators: number;
    repeat_educators: number;
    blank_submissions: number;
    blank_rate: number | null;
    flagged_submissions: number;
    avg_score_pct: number | null;
    scored_submissions: number;
    avg_candidates_per_exam: number | null;
    team_exams: number;
    new_educators: number | null;
}

export interface RightNow {
    /** Links an educator chose to open, excluding the example test seeded for every account. */
    live_links: number;
    example_links: number;
    scheduled_links: number;
    submissions_15m: number;
    submissions_60m: number;
    participants_active: number;
    generated_at: string;
}

export interface SeriesPoint {
    t: string; // IST wall-clock bucket, "YYYY-MM-DDTHH:MM"
    exams: number;
    submissions: number;
    candidates: number;
}

export interface EducatorRef {
    id: string;
    name: string;
    email: string | null;
    avatar_url: string | null;
    designation?: string | null;
    is_verified_creator: boolean;
    is_team: boolean;
    is_self: boolean;
}

export interface Sitting {
    key: string;
    test_id: string;
    day: string;
    title: string;
    deleted: boolean;
    custom_id: string | null;
    slug: string | null;
    duration: number | null;
    total_questions: number | null;
    educator: EducatorRef | null;
    candidates: number;
    submissions: number;
    blanks: number;
    blank_rate: number | null;
    flagged: number;
    avg_score_pct: number | null;
    first_at: string | null;
    last_at: string | null;
    window_minutes: number | null;
    live: boolean;
    join_code: string | null;
    via: 'link' | 'code';
    sample_names: string[];
}

export interface EducatorRow extends EducatorRef {
    is_premium: boolean;
    signed_up_at: string | null;
    exams: number;
    days: number;
    candidates: number;
    submissions: number;
    avg_score_pct: number | null;
    last_conducted_at: string | null;
    first_conducted_at: string | null;
    is_first_time: boolean;
}

export interface LiveExam {
    id: string;
    title: string;
    custom_id: string | null;
    slug: string | null;
    duration: number | null;
    total_questions: number | null;
    settings: Record<string, any>;
    /** The walkthrough test cloned for every new account, not something an educator opened. */
    is_example: boolean;
    created_at: string | null;
    made_live_at: string | null;
    is_scheduled: boolean;
    start_time: string | null;
    end_time: string | null;
    educator: EducatorRef | null;
    submissions_today: number;
    submissions_60m: number;
    last_submission_at: string | null;
}

export interface CodeSitting {
    id: string;
    test_id: string;
    owner_id: string | null;
    name: string | null;
    join_code: string | null;
    opens_at: string | null;
    closes_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    created_at: string | null;
    identity_mode: string | null;
    joined: number;
    submitted: number;
    active_now: number;
}

export interface ExamOps {
    range: { period: string; from: string; to: string; prev_from: string; prev_to: string; bucket: 'hour' | 'day' | 'week' | 'month' };
    audience: Audience;
    now: RightNow;
    totals: Totals;
    previous: Totals;
    series: SeriesPoint[];
    hours: number[];
    weekdays: number[];
    sittings: Sitting[];
    sittings_total: number;
    educators: EducatorRow[];
    live: LiveExam[];
    code_sittings: CodeSitting[];
    guests: { starts: number; submissions: number; abandoned: number };
    /** How many accounts are marked as team (public.admins). 0 means our own runs count as customers'. */
    team_configured: number;
}

export interface CandidateRow {
    id: string;
    name: string;
    roll: string | null;
    email: string | null;
    is_candidate_login: boolean;
    score: number | null;
    max_marks: number | null;
    score_pct: number | null;
    attempted: number | null;
    total_questions: number | null;
    correct: number | null;
    wrong: number | null;
    violations: number;
    submitted_at: string;
    minutes_taken: number | null;
    is_blank: boolean;
}

export interface SittingDetail {
    test: null | { id: string; title: string; custom_id: string | null; duration: number | null; total_questions: number | null; total_max_marks: number | null };
    day: string;
    rows: CandidateRow[];
}

/** Thrown when the backend does not have the exam-ops endpoint yet (deploy pending). */
export class NotDeployedError extends Error {
    constructor() {
        super('exam_ops_not_deployed');
    }
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
        const res = await apiClient.get(`analytics/v2/${path}`, { params });
        return res.data as T;
    } catch (err: any) {
        if (err?.response?.status === 404) throw new NotDeployedError();
        throw err;
    }
}

export const examOpsApi = {
    report: (period: Period, audience: Audience) => get<ExamOps>('exam-ops', { period, audience }),
    sitting: (test_id: string, day: string) => get<SittingDetail>('exam-ops/sitting', { test_id, day }),
};
