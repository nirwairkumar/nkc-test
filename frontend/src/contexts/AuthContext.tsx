// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/authApi';

type AuthContextType = {
    session: any | null;
    user: any | null;
    profile: any | null;
    loading: boolean;
    isAdmin: boolean;
    isPremium: boolean;
    premiumLoading: boolean;
    isGlobalUnlock: boolean;
    hasActivePlans: boolean;
    refreshSession: () => Promise<void>;
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
    refreshSession: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [premiumLoading, setPremiumLoading] = useState(true);
    const [isGlobalUnlock, setIsGlobalUnlock] = useState(false);
    const [hasActivePlans, setHasActivePlans] = useState(true);

    const fetchProfileData = async (userId: string | undefined) => {
        if (!userId) {
            setProfile(null);
            return null;
        }
        try {
            const { fetchUserDetails } = await import('@/lib/usersApi');
            const { data } = await fetchUserDetails(userId);
            if (data) setProfile(data);
            return data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
            return null;
        }
    };

    const checkAdminStatus = async (user_id: string | undefined) => {
        if (!user_id) {
            setIsAdmin(false);
            return;
        }
        try {
            const response = await import('@/lib/apiClient').then(m => m.default.get('/users/check-admin', { params: { user_id } }));
            setIsAdmin(!!response.data);
        } catch (error) {
            setIsAdmin(false);
        }
    };

    const checkPremiumStatus = async (userId: string | undefined, preloadedProfile?: any) => {
        setPremiumLoading(true);
        try {
            const { checkPremiumAccess } = await import('@/lib/pricingApi');
            const { data: accessData } = await checkPremiumAccess();

            const unlockAll = accessData?.unlock_all_premium || false;
            const hasPlans = accessData?.has_active_plans || false;

            setIsGlobalUnlock(unlockAll);
            setHasActivePlans(hasPlans);

            if (unlockAll || !hasPlans) {
                setIsPremium(true);
                return;
            }

            if (!userId) {
                setIsPremium(false);
                return;
            }

            let userProfile = preloadedProfile;
            if (!userProfile) {
                const { fetchUserDetails } = await import('@/lib/usersApi');
                const { data } = await fetchUserDetails(userId);
                userProfile = data;
            }

            if (userProfile?.is_premium && userProfile?.premium_expiry) {
                const expiry = new Date(userProfile.premium_expiry);
                const now = new Date();
                setIsPremium(expiry > now);
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

    const initializeAuth = async () => {
        setLoading(true);
        try {
            // 1. Check for password recovery tokens in URL hash (from password reset links)
            // OAuth tokens are now handled by the /auth/callback page
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const type = params.get('type');

                if (type === 'recovery' && accessToken) {
                    localStorage.setItem('testoza_token', accessToken);
                    if (refreshToken) {
                        localStorage.setItem('testoza_refresh_token', refreshToken);
                    }
                    window.history.replaceState(null, '', window.location.pathname);
                    window.location.href = '/update-password';
                    return;
                }
            }

            // 2. Load from localStorage
            const token = localStorage.getItem('testoza_token');
            if (token) {
                try {
                    const response = await authApi.getMe();
                    if (response.data?.user) {
                        const userData = response.data.user;
                        setUser(userData);
                        // Build a minimal session object for compatibility
                        setSession({ user: userData, access_token: token });

                        // Optimize: Fetch profile once and reuse it for checkPremiumStatus
                        const profileData = await fetchProfileData(userData.id);

                        await Promise.all([
                            checkAdminStatus(userData.id),
                            checkPremiumStatus(userData.id, profileData)
                        ]);
                    } else {
                        throw new Error("No user in response");
                    }
                } catch (e) {
                    // Token invalid or expired
                    localStorage.removeItem('testoza_token');
                    localStorage.removeItem('testoza_refresh_token');
                    setUser(null);
                    setSession(null);
                    await checkPremiumStatus(undefined);
                }
            } else {
                setUser(null);
                setSession(null);
                await checkPremiumStatus(undefined);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
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
            refreshSession: initializeAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
