/**
 * Admin → Team: employees who sign in at team.testoza.com.
 * Backend: app/routers/staff/admin.py (/api/staff-admin/*).
 * SQL: supabase/migrations/20261105120000_staff_team.sql.
 * Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md
 */
import apiClient from '@/lib/apiClient';

export const TEAM_URL = 'https://team.testoza.com';

export type StaffStatus = 'active' | 'suspended' | 'removed';

export interface StaffAccount {
    id: string;
    login_id: string;
    full_name: string;
    contact_email: string | null;
    role_label: string;
    permissions: string[];
    status: StaffStatus;
    expires_at: string | null;
    must_change_password: boolean;
    password_changed_at: string | null;
    totp_enabled_at: string | null;
    two_step: boolean;
    locked: boolean;
    expired: boolean;
    failed_attempts: number;
    last_login_at: string | null;
    last_login_ip: string | null;
    live_sessions: number;
    created_at: string;
    updated_at: string;
}

export interface Permission {
    key: string;
    group: string;
    label: string;
    description: string;
}

export interface Catalog {
    permissions: Permission[];
    presets: { label: string; permissions: string[] }[];
    never: string[];
}

export interface StaffSession {
    id: string;
    stage: 'mfa' | 'full';
    created_at: string;
    last_seen_at: string;
    expires_at: string;
    ip: string | null;
    user_agent: string | null;
    revoked_at: string | null;
    revoked_reason: string | null;
    live: boolean;
}

export interface AuditRow {
    id: number;
    created_at: string;
    actor_type: 'staff' | 'admin' | 'anonymous' | 'system';
    actor_id: string | null;
    actor_label: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    detail: Record<string, any>;
    ip: string | null;
    user_agent: string | null;
}

export interface MemberInput {
    login_id?: string;
    full_name?: string;
    contact_email?: string | null;
    role_label?: string;
    permissions?: string[];
    expires_at?: string | null;
    clear_expires_at?: boolean;
    status?: StaffStatus;
}

export const teamApi = {
    catalog: async (): Promise<Catalog> => (await apiClient.get('/staff-admin/catalog')).data,
    list: async (): Promise<{ rows: StaffAccount[]; removed: StaffAccount[] }> =>
        (await apiClient.get('/staff-admin/accounts')).data,
    create: async (body: MemberInput): Promise<{ account: StaffAccount; temporary_password: string }> =>
        (await apiClient.post('/staff-admin/accounts', body)).data,
    update: async (id: string, body: MemberInput): Promise<{ account: StaffAccount }> =>
        (await apiClient.patch(`/staff-admin/accounts/${id}`, body)).data,
    resetPassword: async (id: string): Promise<{ temporary_password: string }> =>
        (await apiClient.post(`/staff-admin/accounts/${id}/reset-password`)).data,
    resetTwoStep: async (id: string) => (await apiClient.post(`/staff-admin/accounts/${id}/reset-2fa`)).data,
    signOut: async (id: string) => (await apiClient.post(`/staff-admin/accounts/${id}/sign-out`)).data,
    sessions: async (id: string): Promise<{ rows: StaffSession[] }> =>
        (await apiClient.get(`/staff-admin/accounts/${id}/sessions`)).data,
    audit: async (p: { staff_id?: string; before_id?: number; limit?: number }): Promise<{ rows: AuditRow[]; next_before: number | null }> =>
        (await apiClient.get('/staff-admin/audit', { params: p })).data,
};

/** The server's message for a failed call, or a fallback. */
export function errorText(err: unknown, fallback = 'Something went wrong. Try again.'): string {
    const status = (err as any)?.response?.status;
    const detail = (err as any)?.response?.data?.detail;
    if (status === 404 && detail === 'Not Found') return 'The backend doesn’t have Team yet. Push the backend first.';
    if (status >= 500) return 'Server error. Has supabase/migrations/20261105120000_staff_team.sql been run?';
    if (typeof detail === 'string') return detail;
    return fallback;
}
