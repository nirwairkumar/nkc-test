/**
 * Email API for the team site (backend: app/routers/staff/email.py, which runs the same code as
 * admin → Email). Types match frontend-admin/src/pages/email/api.ts; differences:
 *   - people's addresses arrive masked ("as•••@coaching.in")
 *   - no Settings: the SES sign-in name is never sent here
 *   - `overview.team` says what this person may do and where tests may go
 */
import { api, ApiError } from '@/lib/api';

export type Stage = 'new' | 'drafted' | 'tried' | 'quiet' | 'active';
export type Who = 'educator' | 'institution' | 'corporate' | 'student' | 'no_role';
export type Status =
    | 'ready' | 'unsubscribed' | 'bad_email' | 'got_it' | 'earlier_step' | 'too_soon' | 'cooldown' | 'monthly_cap';
export type Rule = 'live_48h' | 'away_7d';

export interface Limits {
    cooldown_days: number;
    monthly_cap: number;
    hourly_limit: number;
    daily_limit: number;
    sent_last_hour: number;
    sent_last_day: number;
    hour_free_at: string | null;
    day_free_at: string | null;
    warmup?: { daily: number; hourly: number; next: number; quota: number; bounce_rate: number; held: boolean } | null;
}

export interface TemplateSummary {
    key: string;
    name: string;
    track: string | null;
    step: number;
    wait_days: number;
    stages: Stage[];
    audiences: Who[];
    min_days_joined: number;
    min_days_quiet: number;
    rule?: Rule | null;
    subject: string;
    preheader: string;
    why: string;
    is_builtin: boolean;
    archived: boolean;
    sort: number;
    ready: number;
    waiting: number;
    next_ready_at: string | null;
    sent: number;
    last_sent_at: string | null;
}

export interface Template extends Omit<TemplateSummary, 'ready' | 'waiting' | 'next_ready_at' | 'sent' | 'last_sent_at'> {
    body: string;
    edited?: boolean;
    updated_at?: string;
}

export interface Variable { label: string; sample: string }

export interface Overview {
    people: number;
    ready_people: number;
    takers: number;
    bad_emails: number;
    unsubscribed: number;
    matrix: { stage: Stage; who: Who; n: number }[];
    rules?: Partial<Record<Rule, number>>;
    templates: TemplateSummary[];
    sent: { hour: number; today: number; day: number; week: number; all: number };
    sending: { id: string; name: string; status: 'sending' | 'paused' }[];
    limits: Limits;
    smtp: { configured: boolean; service?: string };
    defaults: { from_name: string; reply_to: string; senders: string[]; from_email: string; send_only_domains?: string[] };
    variables: Record<string, Variable>;
    team: {
        can_send: boolean;
        /** Their login, when it's an email address: where test emails may go. */
        test_to: string | null;
        test_domain: string;
        /** Links may point only to these sites (and their subdomains). */
        link_hosts: string[];
    };
}

export interface AudienceFilter {
    template?: string | null;
    stages?: Stage[];
    whos?: Who[];
    q?: string;
    joined_within?: number | null;
    quiet_for?: number | null;
    show?: 'all' | 'ready' | 'skipped';
    add_ids?: string[];
    skip_ids?: string[];
    everyone?: boolean;
    /** "Pick people": only add_ids get it, even if emailed this week (not unsubscribed ones). */
    direct?: boolean;
}

export interface Person {
    id: string;
    /** Masked: "as•••@coaching.in". */
    email: string;
    full_name: string | null;
    designation: string | null;
    who: Who;
    stage: Stage;
    status: Status;
    ready_at: string | null;
    created_at: string;
    last_active_at: string | null;
    tests_created: number;
    results: number;
    self_attempts: number;
    latest_test_title: string | null;
    top_test_title: string | null;
    top_test_results: number;
    last_emailed_at: string | null;
    emails_received: number;
    added?: boolean;
}

export interface Audience {
    total: number;
    ready: number;
    shown: number;
    skipped: Record<Exclude<Status, 'ready'>, number>;
    rows: Person[];
}

export interface Rendered {
    subject: string;
    preheader: string;
    html: string;
    text: string;
    warnings: string[];
    person: { id: string | null; email: string; full_name: string | null };
}

export interface EmailDraft {
    subject: string;
    preheader: string;
    body: string;
}

export interface SentBy { kind: 'team'; staff_id: string | null; name: string }

export interface Campaign {
    id: string;
    name: string;
    template_key: string;
    subject: string;
    audience_label: string;
    status: 'sending' | 'paused' | 'done';
    planned: number;
    from_email: string;
    from_name: string;
    created_at: string;
    finished_at: string | null;
    sent: number;
    failed: number;
    came_back: number;
    made_test: number;
    clicked: number;
    unsubscribed: number;
    sent_by?: SentBy | null;
}

export interface Recipient {
    id: string;
    email: string;
    full_name: string | null;
    designation: string | null;
    status: 'sending' | 'sent' | 'failed';
    error: string | null;
    sent_at: string;
    came_back: boolean;
    clicked: boolean;
    unsubscribed: boolean;
}

export interface CampaignDetail {
    campaign: Omit<Campaign, 'sent' | 'failed' | 'came_back' | 'made_test' | 'clicked' | 'unsubscribed'> & {
        preheader: string; body: string; reply_to: string | null;
    };
    /** Empty without "Write and send emails"; `counts` has the numbers instead. */
    recipients: Recipient[];
    counts?: { sent: number; failed: number; came_back: number; clicked: number; unsubscribed: number };
    can_send: boolean;
}

export interface SendStep {
    status: 'sending' | 'paused' | 'done' | 'waiting';
    sent: number;
    failed: number;
    remaining: number | null;
    errors?: string[];
    reason?: 'hourly_limit' | 'daily_limit';
    resume_at?: string | null;
    limit?: number;
}

export interface Suppression {
    email: string;
    reason: 'unsubscribed' | 'bounced' | 'stopped';
    note: string | null;
    created_at: string;
}

export type AutoKind = 'welcome' | 'test_created' | 'test_live' | 'results' | 'test_ended';

export interface AutoEmail {
    key: AutoKind;
    label: string;
    when: string;
    detail: string;
    enabled: boolean;
    today: number;
    week: number;
    month: number;
    total: number;
    failed: number;
    skipped: number;
    clicked: number;
    last_at: string | null;
}

export interface AutoOverview {
    installed: boolean;
    migration: string;
    kinds: AutoEmail[];
    daily: { day: string; n: number }[];
    transport: {
        service: string | null;
        configured: boolean;
        from_email: string | null;
        fallback: { configured: boolean; service: string | null; from_email: string | null };
        bounce_reports: boolean;
    };
}

export interface AutoLogRow {
    id: string;
    kind: AutoKind;
    email: string;
    subject: string;
    status: 'sent' | 'failed' | 'skipped';
    error: string | null;
    provider: string | null;
    milestone: number | null;
    created_at: string;
}

/** The server's own words for a failed request, or a plain fallback. */
export function errorText(e: unknown, fallback = 'Something went wrong. Try again.'): string {
    return e instanceof ApiError && e.message ? e.message : fallback;
}

/** 424 = the email tables aren't in the database yet (the owner runs the SQL). */
export const notInstalled = (e: unknown) => e instanceof ApiError && e.status === 424;

const B = '/staff/email';
const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body ?? {} });

export const emailApi = {
    overview: () => api<Overview>(`${B}/overview`),
    templates: () => api<{ templates: Template[]; variables: Record<string, Variable> }>(`${B}/templates`),
    createTemplate: (t: Partial<Template>) => post<Template>(`${B}/templates`, t),
    updateTemplate: (key: string, t: Partial<Template>) =>
        api<Template>(`${B}/templates/${encodeURIComponent(key)}`, { method: 'PATCH', body: t }),
    duplicateTemplate: (key: string) => post<Template>(`${B}/templates/${encodeURIComponent(key)}/duplicate`),
    restoreTemplate: (key: string) => post<Template>(`${B}/templates/${encodeURIComponent(key)}/restore`),
    audience: (filter: AudienceFilter, limit = 50, offset = 0) => post<Audience>(`${B}/audience`, { filter, limit, offset }),
    preview: (d: EmailDraft & { user_id?: string | null; template_key?: string | null }) => post<Rendered>(`${B}/preview`, d),
    test: (d: EmailDraft & { to: string; user_id?: string | null; from_email?: string; from_name?: string; reply_to?: string | null }) =>
        post<{ sent: boolean; to: string }>(`${B}/test`, d),
    createCampaign: (d: EmailDraft & {
        template_key?: string | null; name?: string; filter: AudienceFilter; audience_label: string;
        from_email: string; from_name: string; reply_to: string | null;
    }) => post<{ id: string; planned: number; name: string }>(`${B}/campaigns`, d),
    sendNext: (id: string, n = 5) => post<SendStep>(`${B}/campaigns/${id}/send-next`, { n }),
    setCampaign: (id: string, status: 'sending' | 'paused') =>
        api<{ id: string; status: string }>(`${B}/campaigns/${id}`, { method: 'PATCH', body: { status } }),
    campaigns: (limit = 30, offset = 0) => api<{ total: number; rows: Campaign[] }>(`${B}/campaigns`, { params: { limit, offset } }),
    campaign: (id: string) => api<CampaignDetail>(`${B}/campaigns/${id}`),
    suppressions: (q?: string) => api<{ rows: Suppression[]; total: number }>(`${B}/suppressions`, { params: { q } }),
    suppress: (email: string, note?: string) => post<{ email: string; reason: string }>(`${B}/suppressions`, { email, note }),

    auto: () => api<AutoOverview>(`${B}/auto`),
    autoLog: (p: { kind?: AutoKind | null; status?: AutoLogRow['status'] | null; q?: string; limit?: number; offset?: number }) =>
        api<{ rows: AutoLogRow[]; total: number; installed: boolean }>(`${B}/auto/log`, { params: p }),
    autoPreview: (kind: AutoKind) =>
        post<{ subject: string; preheader: string; html: string; text: string }>(`${B}/auto/${kind}/preview`),
};
