export type NextStep = 'change_password' | 'setup_2fa' | 'verify_2fa' | null;

export type Permission =
    | 'inbox.view'
    | 'support.view'
    | 'support.reply'
    | 'support.contact'
    | 'feedback.view'
    | 'analytics.view'
    | 'email.view'
    | 'email.send';

export interface Me {
    stage: 'mfa' | 'full';
    next: NextStep;
    account: {
        id: string;
        login_id: string;
        full_name: string;
        role_label: string;
        expires_at: string | null;
        two_step: boolean;
    };
    permissions: Permission[];
    catalog: Record<string, { label: string; group: string }>;
    idle_minutes: number;
    session_expires_at: string;
}

export interface InboxEvent {
    kind: 'support' | 'feedback';
    id: string;
    at: string;
    title: string;
    text: string;
    topic?: string | null;
    status?: string;
    /** Support only: the writer deleted it from their Help page. */
    deleted?: boolean;
    rating?: number | null;
    source?: string | null;
    exam_title?: string | null;
    unread?: boolean;
}

export interface Inbox {
    counts: { support_waiting: number; feedback_unread: number };
    events: InboxEvent[];
    can_open: { support: boolean; feedback: boolean };
}

export type SupportView = 'open' | 'replied' | 'resolved' | 'all';

export interface SupportRow {
    id: string;
    created_at: string;
    last_activity_at?: string | null;
    name: string;
    email: string | null;
    phone?: string | null;
    topic?: string | null;
    message: string;
    status?: 'pending' | 'replied' | 'resolved' | null;
    source?: string | null;
    replied_at?: string | null;
    resolved_at?: string | null;
    /** The writer deleted it from their Help page: read-only history. */
    user_deleted_at?: string | null;
    contact_masked?: boolean;
}

/** The writer's other conversations (no contact details), oldest first. */
export interface SupportHistoryItem {
    id: string;
    created_at: string;
    last_activity_at?: string | null;
    topic?: string | null;
    message: string;
    status?: 'pending' | 'replied' | 'resolved' | null;
    resolved_at?: string | null;
    user_deleted_at?: string | null;
    screenshot_url?: string | null;
    thread: SupportTurn[];
}

export interface SupportTurn {
    id: string;
    author: 'team' | 'user';
    body: string;
    created_at: string;
}

export interface SupportMessage extends SupportRow {
    context?: { from?: string; viewport?: string; language?: string; signed_in?: boolean } | null;
    user_agent?: string | null;
    screenshot_url?: string | null;
    account?: { full_name?: string | null; designation?: string | null; joined_at?: string | null; tests: number };
    thread: SupportTurn[];
    history?: SupportHistoryItem[];
    can_reply: boolean;
    emails_on: boolean;
}

export interface SupportList {
    rows: SupportRow[];
    total: number;
    counts: Record<SupportView, number>;
    can_reply: boolean;
    emails_on: boolean;
}

export interface FeedbackRow {
    id: string;
    created_at: string;
    rating: number | null;
    source: string | null;
    exam_title: string | null;
    ai: string | null;
    conduct: string | null;
    other: string | null;
    read_at: string | null;
    name: string | null;
    designation: string | null;
}

export interface Summary {
    visitors: number;
    new_visitors: number;
    sessions: number;
    engaged_sessions: number;
    pageviews: number;
    signups: number;
    tests_created: number;
    test_starts: number;
    submissions: number;
    ai_generations: number;
}

export interface SeriesPoint {
    t: string;
    visitors: number;
    sessions: number;
    signups: number;
    submissions: number;
    tests_created: number;
}

export interface BreakdownRow {
    key: string;
    label?: string | null;
    visitors: number;
    sessions: number;
}

export interface Overview {
    range: { period: string; bucket: 'hour' | 'day' | 'week' | 'month' };
    summary: Summary;
    previous: Summary;
    series: SeriesPoint[];
    pages: BreakdownRow[];
    channels: BreakdownRow[];
    referrers: BreakdownRow[];
    countries: BreakdownRow[];
    devices: BreakdownRow[];
}

export interface Growth {
    signups: number;
    created_test: number;
    got_submission: number;
    took_test: number;
    median_hours_to_first_test: number | null;
    by_role: { key: string; signups: number; created_test: number; got_submission: number }[];
    by_channel: { key: string; signups: number; created_test: number }[];
}

export interface GrowthReport {
    growth: Growth;
    previous: Growth;
    north_star: SeriesPoint[];
}
