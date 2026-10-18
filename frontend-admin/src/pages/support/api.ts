/**
 * Admin → Support API (backend: app/routers/support.py `/support/admin/*`,
 * SQL: supabase/migrations/20261018150000_support_help.sql).
 */
import apiClient from '@/lib/apiClient';

export type SupportView = 'open' | 'replied' | 'resolved' | 'all';
export type SupportStatus = 'pending' | 'replied' | 'resolved';

export interface SupportAccount {
    full_name?: string | null;
    avatar_url?: string | null;
    designation?: string | null;
    joined_at?: string | null;
    tests: number;
}

export interface SupportMessage {
    id: string;
    created_at: string;
    name: string;
    email: string;
    phone?: string | null;
    message: string;
    topic?: string | null;
    status?: SupportStatus | null;
    user_id?: string | null;
    source?: 'app' | 'public' | null;
    context?: { from?: string; viewport?: string; language?: string; signed_in?: boolean; screenshot?: string } | null;
    user_agent?: string | null;
    screenshot_url?: string | null;
    reply?: string | null;
    replied_at?: string | null;
    resolved_at?: string | null;
    account?: SupportAccount;
}

export interface SupportList {
    rows: SupportMessage[];
    total: number;
    counts: Record<SupportView, number>;
    /** SMTP configured: replies also go out by email. */
    emails_on: boolean;
}

export const supportApi = {
    list: async (p: { view: SupportView; limit?: number; offset?: number }): Promise<SupportList> =>
        (await apiClient.get('/support/admin/messages', { params: p })).data,
    reply: async (id: string, reply: string, resolve: boolean) =>
        (await apiClient.post(`/support/admin/messages/${id}/reply`, { reply, resolve })).data as {
            status: SupportStatus; notified: boolean; emailed: boolean;
        },
    setStatus: async (id: string, status: 'pending' | 'resolved') =>
        (await apiClient.patch(`/support/admin/messages/${id}`, { status })).data,
};

export const TOPIC_LABEL: Record<string, string> = {
    create: 'Making a test',
    ai: 'AI import',
    conduct: 'Running an exam',
    results: 'Results',
    account: 'Account or plan',
    other: 'Something else',
};

/** "Chrome on Windows · computer" from a user-agent string. */
export function deviceSummary(ua?: string | null): string {
    if (!ua) return '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows'
        : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
    const kind = /Mobi|Android|iPhone/.test(ua) ? 'phone' : /iPad|Tablet/.test(ua) ? 'tablet' : 'computer';
    return `${browser}${os ? ` on ${os}` : ''} · ${kind}`;
}

/** wa.me link to the writer's number (Indian numbers without a country code get +91). */
export function whatsAppTo(phone: string, text: string): string | null {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
    if (digits.length < 11) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
