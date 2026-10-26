import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { forgetReferral, pendingReferral } from '@/lib/referral';
import { referralsApi } from '@/lib/referralsApi';
import { analytics } from '@/lib/analytics/tracker';

/**
 * After a sign-in, hand the invite code this browser kept (pages/InvitePage) to the
 * backend, which credits the person who sent it when the account is new. Mounted once,
 * in Layout, so it runs after email sign-up and Google sign-in alike.
 *
 * Every answer from the backend is final (claimed, or a reason it can't be), so the code
 * is forgotten; only a network failure keeps it for the next visit.
 */
export function useReferralClaim(userId: string | null | undefined, authLoading: boolean) {
    const sentFor = useRef<string | null>(null);

    useEffect(() => {
        if (authLoading || !userId || sentFor.current === userId) return;
        const pending = pendingReferral();
        if (!pending) return;
        sentFor.current = userId;

        referralsApi.claim(pending.code)
            .then(({ status, referrer }) => {
                forgetReferral();
                analytics.track('referral_claim', { status });
                if (status === 'claimed') {
                    toast.success(referrer?.name ? `Welcome! ${referrer.name} invited you to TestoZa.` : 'Welcome to TestoZa!');
                }
            })
            .catch((err) => {
                // 4xx (signed out meanwhile, bad request): don't keep retrying a code that can't work.
                const status = err?.response?.status;
                if (status && status < 500) forgetReferral();
                else sentFor.current = null;
            });
    }, [userId, authLoading]);
}
