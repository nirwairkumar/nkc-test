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
            return;
        }
        try {
            const { fetchUserDetails } = await import('@/lib/usersApi');
            const { data, error } = await fetchUserDetails(userId);
            if (data) setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
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

    const checkPremiumStatus = async (userId: string | undefined) => {
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

            const { fetchUserDetails } = await import('@/lib/usersApi');
            const { data: userProfile } = await fetchUserDetails(userId);

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
            // 1. Capture access token from URL hash (e.g. from password reset link)
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const type = params.get('type');

                if (accessToken) {
                    localStorage.setItem('testoza_token', accessToken);
                    if (refreshToken) {
                        localStorage.setItem('testoza_refresh_token', refreshToken);
                    }
                    // Clear hash for clean URL
                    window.history.replaceState(null, '', window.location.pathname);

                    if (type === 'recovery') {
                        window.location.href = '/update-password';
                        return;
                    }
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

                        await Promise.all([
                            fetchProfileData(userData.id),
                            checkAdminStatus(userData.id),
                            checkPremiumStatus(userData.id)
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
                }
            } else {
                setUser(null);
                setSession(null);
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
