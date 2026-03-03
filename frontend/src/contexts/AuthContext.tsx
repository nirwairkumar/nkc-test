// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    loading: boolean;
    isAdmin: boolean;
    isPremium: boolean;
    premiumLoading: boolean;
    isGlobalUnlock: boolean;
    hasActivePlans: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isPremium: false,
    premiumLoading: true,
    isGlobalUnlock: false,
    hasActivePlans: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [premiumLoading, setPremiumLoading] = useState(true);
    const [isGlobalUnlock, setIsGlobalUnlock] = useState(false);
    const [hasActivePlans, setHasActivePlans] = useState(true);

    const fetchProfile = async (userId: string | undefined) => {
        if (!userId) {
            setProfile(null);
            return;
        }
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
        }
    };

    const checkAdminStatus = async (email: string | undefined) => {
        if (!email) {
            setIsAdmin(false);
            return;
        }
        try {
            const { data } = await supabase
                .from('admins')
                .select('email')
                .eq('email', email)
                .single();
            setIsAdmin(!!data);
        } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
        }
    };

    const checkPremiumStatus = async (userId: string | undefined) => {
        setPremiumLoading(true);
        try {
            // Step 1: Check global unlock and active plans status
            const { checkPremiumAccess } = await import('@/lib/pricingApi');
            const { data: accessData, error: accessError } = await checkPremiumAccess();

            if (accessError) {
                console.error('Error checking premium access:', accessError);
                setIsPremium(false);
                setPremiumLoading(false);
                return;
            }

            const unlockAll = accessData?.unlock_all_premium || false;
            const hasPlans = accessData?.has_active_plans || false;

            setIsGlobalUnlock(unlockAll);
            setHasActivePlans(hasPlans);

            // If global unlock is enabled, grant premium access
            if (unlockAll) {
                setIsPremium(true);
                setPremiumLoading(false);
                return;
            }

            // If no active plans exist, grant premium access
            if (!hasPlans) {
                setIsPremium(true);
                setPremiumLoading(false);
                return;
            }

            // Step 2: Check user's subscription status (only if user is logged in)
            if (!userId) {
                setIsPremium(false);
                setPremiumLoading(false);
                return;
            }

            const { fetchUserDetails } = await import('@/lib/usersApi');
            const { data: userProfile, error } = await fetchUserDetails(userId);

            if (error) {
                console.error('Error fetching premium status:', error);
                setIsPremium(false);
                setPremiumLoading(false);
                return;
            }

            if (userProfile?.is_premium && userProfile?.premium_expiry) {
                const expiry = new Date(userProfile.premium_expiry);
                const now = new Date();

                if (expiry > now) {
                    setIsPremium(true);
                } else {
                    setIsPremium(false);
                }
            } else {
                setIsPremium(false);
            }
        } catch (err) {
            console.error('Unexpected error checking premium:', err);
            setIsPremium(false);
        } finally {
            setPremiumLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            fetchProfile(data.session?.user?.id);
            checkAdminStatus(data.session?.user?.email);
            checkPremiumStatus(data.session?.user?.id);
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);
            setUser(newSession?.user ?? null);
            fetchProfile(newSession?.user?.id);
            checkAdminStatus(newSession?.user?.email);
            checkPremiumStatus(newSession?.user?.id);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            loading,
            isAdmin,
            isPremium,
            premiumLoading,
            isGlobalUnlock,
            hasActivePlans,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
