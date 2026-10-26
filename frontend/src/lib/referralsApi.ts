import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/** Backend: app/routers/referrals.py. SQL: supabase/migrations/20261026120000_referrals.sql. */

/** Same steps as admin → Users: signed up → made a test → getting results. */
export type ReferralStage = 'signed_up' | 'made_test' | 'getting_results';

export interface ReferralPerson {
    id: string;
    name: string;
    avatar_url?: string | null;
    designation?: string | null;
    joined_at: string;
    stage: ReferralStage;
    tests_made: number;
    /** Different people who submitted one of their tests. */
    candidates: number;
}

export interface MyReferrals {
    code: string;
    stats: { opened: number; joined: number; made_test: number; getting_results: number };
    people: ReferralPerson[];
}

/** Whose invite link this is — public, so the invite page can greet the visitor. */
export interface ReferrerInfo {
    code: string;
    name: string;
    first_name: string;
    avatar_url?: string | null;
    designation?: string | null;
}

export type ClaimStatus = 'claimed' | 'already_referred' | 'own_code' | 'invalid_code' | 'not_new' | 'not_eligible';

export const referralsApi = {
    mine: async (): Promise<MyReferrals> => (await apiClient.get('/referrals/me')).data,
    info: async (code: string): Promise<ReferrerInfo> =>
        (await apiClient.get(`/referrals/code/${encodeURIComponent(code)}`)).data,
    /** Opening the invite page: who invited you, and one more unique open for them. */
    open: async (code: string, visitorId: string): Promise<ReferrerInfo> =>
        (await apiClient.post(`/referrals/code/${encodeURIComponent(code)}/open`, { visitor_id: visitorId })).data,
    claim: async (code: string): Promise<{ status: ClaimStatus; referrer?: { name: string } }> =>
        (await apiClient.post('/referrals/claim', { code })).data,
};

export const MY_REFERRALS_KEY = ['referrals', 'me'] as const;

/** Your code and who joined with it. Shared by the dashboard card and Settings. */
export function useMyReferrals(enabled = true) {
    return useQuery({
        queryKey: MY_REFERRALS_KEY,
        queryFn: referralsApi.mine,
        enabled,
        staleTime: 60_000,
        retry: 1,
    });
}
