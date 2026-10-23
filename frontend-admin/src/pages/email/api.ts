/**
 * Admin → Email API (backend: app/routers/email_broadcast.py,
 * SQL: supabase/migrations/20261024120000_email_broadcast.sql).
 * Who may get which email is decided in Postgres; this file only carries it.
 */
import apiClient from '@/lib/apiClient';

export type Stage = 'new' | 'drafted' | 'tried' | 'quiet' | 'active';
export type Who = 'educator' | 'institution' | 'corporate' | 'student' | 'no_role';
export type Status =
    | 'ready' | 'unsubscribed' | 'bad_email' | 'got_it' | 'earlier_step' | 'too_soon' | 'cooldown' | 'monthly_cap';

export class NotInstalledError extends Error {}

export interface Limits {
    cooldown_days: number;
    monthly_cap: number;
    hourly_limit: number;
    daily_limit: number;
    sent_last_hour: number;
    sent_last_day: number;
    hour_free_at: string | null;
    day_free_at: string | null;
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
    /** Distinct people with at least one email they can get today. */
    ready_people: number;
    takers: number;
    bad_emails: number;
    unsubscribed: number;
    matrix: { stage: Stage; who: Who; n: number }[];
    templates: TemplateSummary[];
    sent: { hour: number; today: number; day: number; week: number; all: number };
    sending: { id: string; name: string; status: 'sending' | 'paused' }[];
    limits: Limits;
    smtp: { configured: boolean; user: string | null };
    defaults: { from_name: string; reply_to: string; senders: string[]; from_email: string };
    variables: Record<string, Variable>;
}

export interface AudienceFilter {
    template?: string | null;
    stages?: Stage[];
    whos?: Who[];
    q?: string;
    joined_within?: number | null;
    quiet_for?: number | null;
    show?: 'all' | 'ready' | 'skipped';
}

export interface Person {
    id: string;
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
}

export interface CampaignDetail {
    campaign: Omit<Campaign, 'sent' | 'failed' | 'came_back' | 'made_test' | 'clicked' | 'unsubscribed'> & {
        preheader: string; body: string; filter: AudienceFilter; reply_to: string | null;
    };
    recipients: {
        id: string; user_id: string; email: string; full_name: string | null; designation: string | null;
        status: 'sending' | 'sent' | 'failed'; error: string | null; sent_at: string;
        came_back: boolean; clicked: boolean; unsubscribed: boolean;
    }[];
}

export interface SendStep {
    status: 'sending' | 'paused' | 'done' | 'waiting';
    sent: number;
    failed: number;
    remaining: number | null;
    errors?: string[];
    reason?: 'hourly_limit' | 'daily_limit';
    resume_at?: string | null;
}

export interface Suppression {
    email: string;
    user_id: string | null;
    reason: 'unsubscribed' | 'bounced' | 'stopped';
    note: string | null;
    created_at: string;
}

export interface SmtpStatus {
    configured: boolean;
    host?: string;
    port?: number;
    user?: string;
    from_name?: string;
    available_senders: string[];
}

async function call<T>(p: Promise<{ data: T }>): Promise<T> {
    try {
        return (await p).data;
    } catch (e: any) {
        if (e?.response?.status === 424) throw new NotInstalledError('email_broadcast_not_installed');
        throw e;
    }
}

/** The server's own words for a failed request ("Write a subject first."), or a plain fallback. */
export function errorText(e: unknown, fallback = 'Something went wrong. Try again.'): string {
    const detail = (e as any)?.response?.data?.detail;
    return typeof detail === 'string' && detail ? detail : fallback;
}

const B = '/email-broadcast';

export const emailApi = {
    overview: () => call<Overview>(apiClient.get(`${B}/overview`)),
    templates: () => call<{ templates: Template[]; variables: Record<string, Variable> }>(apiClient.get(`${B}/templates`)),
    createTemplate: (t: Partial<Template>) => call<Template>(apiClient.post(`${B}/templates`, t)),
    updateTemplate: (key: string, t: Partial<Template>) => call<Template>(apiClient.patch(`${B}/templates/${key}`, t)),
    duplicateTemplate: (key: string) => call<Template>(apiClient.post(`${B}/templates/${key}/duplicate`)),
    restoreTemplate: (key: string) => call<Template>(apiClient.post(`${B}/templates/${key}/restore`)),
    audience: (filter: AudienceFilter, limit = 50, offset = 0) =>
        call<Audience>(apiClient.post(`${B}/audience`, { filter, limit, offset })),
    preview: (d: EmailDraft & { user_id?: string | null; template_key?: string | null }) =>
        call<Rendered>(apiClient.post(`${B}/preview`, d)),
    test: (d: EmailDraft & { to: string; user_id?: string | null; from_email?: string; from_name?: string }) =>
        call<{ sent: boolean; to: string }>(apiClient.post(`${B}/test`, d)),
    createCampaign: (d: EmailDraft & {
        template_key?: string | null; name?: string; filter: AudienceFilter; audience_label: string;
        from_email: string; from_name: string;
    }) => call<{ id: string; planned: number; name: string }>(apiClient.post(`${B}/campaigns`, d)),
    sendNext: (id: string, n = 5) => call<SendStep>(apiClient.post(`${B}/campaigns/${id}/send-next`, { n })),
    setCampaign: (id: string, status: 'sending' | 'paused') =>
        call<{ id: string; status: string }>(apiClient.patch(`${B}/campaigns/${id}`, { status })),
    campaigns: (limit = 30, offset = 0) =>
        call<{ total: number; rows: Campaign[] }>(apiClient.get(`${B}/campaigns`, { params: { limit, offset } })),
    campaign: (id: string) => call<CampaignDetail>(apiClient.get(`${B}/campaigns/${id}`)),
    suppressions: (q?: string) =>
        call<{ rows: Suppression[]; total: number }>(apiClient.get(`${B}/suppressions`, { params: q ? { q } : {} })),
    suppress: (email: string, note?: string) => call(apiClient.post(`${B}/suppressions`, { email, note })),
    unsuppress: (email: string) => call(apiClient.delete(`${B}/suppressions/${encodeURIComponent(email)}`)),
    smtpStatus: () => call<SmtpStatus>(apiClient.get(`${B}/smtp-status`)),
    saveSmtp: (cfg: { host: string; port: number; user: string; password: string; from_name?: string; use_ssl?: boolean }) =>
        call(apiClient.post(`${B}/smtp-config`, cfg)),
};
