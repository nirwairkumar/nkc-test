import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';

export function usePremiumStatus() {
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);
    const [planId, setPlanId] = useState<string | null>(null);

    useEffect(() => {
        const checkPremiumStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_premium, premium_expiry, plan_id')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching premium status:', error);
                    setLoading(false);
                    return;
                }

                if (profile?.is_premium && profile?.premium_expiry) {
                    const expiry = new Date(profile.premium_expiry);
                    const now = new Date();

                    if (expiry > now) {
                        setIsPremium(true);
                        setExpiryDate(expiry);
                        setPlanId(profile.plan_id);
                    }
                }
            } catch (err) {
                console.error('Unexpected error checking premium:', err);
            } finally {
                setLoading(false);
            }
        };

        checkPremiumStatus();
    }, []);

    return { isPremium, loading, expiryDate, planId };
}
