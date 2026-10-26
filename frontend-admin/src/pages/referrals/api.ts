/**
 * Admin → Referrals API (backend: app/routers/referrals.py `/referrals/admin/*`,
 * SQL: supabase/migrations/20261026120000_referrals.sql).
 */
import apiClient from '@/lib/apiClient';

/** Same steps as Users: signed up → made a test → getting results. */
export type ReferralStage = 'signed_up' | 'made_test' | 'getting_results';

export interface ReferralAccount {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    designation?: string | null;
    created_at?: string | null;
}

export interface Referrer {
    user: ReferralAccount;
    code: string | null;
    /** Different browsers that opened their link. */
    visits: number;
    last_visit_at: string | null;
    joined: number;
    last_joined_at: string | null;
    made_test: number;
    getting_results: number;
}

export interface ReferralOverview {
    totals: {
        /** People who opened their invite card at least once (a code was made). */
        codes: number;
        /** People whose link brought at least one account. */
        referrers: number;
        visits: number;
        joined: number;
        made_test: number;
        getting_results: number;
    };
    referrers: Referrer[];
}

export interface JoinedRow {
    id: string;
    created_at: string;
    code: string;
    referrer: ReferralAccount;
    user: ReferralAccount;
    stage: ReferralStage;
    tests_made: number;
    candidates: number;
    last_result_at: string | null;
}

export const referralsApi = {
    overview: async (): Promise<ReferralOverview> => (await apiClient.get('/referrals/admin/overview')).data,
    joined: async (p: { limit?: number; offset?: number; referrer?: string | null }): Promise<{ rows: JoinedRow[]; total: number }> =>
        (await apiClient.get('/referrals/admin/joined', { params: { ...p, referrer: p.referrer || undefined } })).data,
};
