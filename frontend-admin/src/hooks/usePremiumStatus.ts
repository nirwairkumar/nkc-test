import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check premium status.
 * Now uses cached data from AuthContext for instant access.
 * Premium status is verified once during login, not on every component mount.
 */
export function usePremiumStatus() {
    const {
        isPremium,
        premiumLoading: loading,
        isGlobalUnlock,
        hasActivePlans,
        profile
    } = useAuth();

    // Determine the reason for premium access
    let reason = '';
    if (loading) {
        reason = 'loading';
    } else if (isGlobalUnlock) {
        reason = 'global_unlock';
    } else if (!hasActivePlans) {
        reason = 'no_active_plans';
    } else if (isPremium) {
        reason = 'active_subscription';
    } else {
        reason = 'no_subscription';
    }

    return {
        isPremium,
        loading,
        expiryDate: profile?.premium_expiry || null, 
        planId: profile?.plan_id || null, 
        isGlobalUnlock,
        hasActivePlans,
        reason
    };
}

