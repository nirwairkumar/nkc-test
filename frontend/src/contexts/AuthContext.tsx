// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/authApi';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/integrations/supabase/client';
import { tokenStorage } from '@/utils/tokenStorage';

// Shared initialization promise to prevent duplicate concurrent runs
let initPromise: Promise<void> | null = null;

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
            if (data) {
                setProfile(data);
                if (data.designation) {
                    localStorage.setItem('user_designation', data.designation);
                }
            }
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
            const response = await apiClient.get('/users/check-admin', { params: { user_id } });
            setIsAdmin(!!response.data);
        } catch (error) {
            setIsAdmin(false);
        }
    };

    const checkPremiumStatus = async (userId: string | undefined, preloadedProfile?: any) => {
        setPremiumLoading(true);
        if (!userId) {
            setIsGlobalUnlock(false);
            setHasActivePlans(true);
            setIsPremium(false);
            setPremiumLoading(false);
            return;
        }
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

    const initializeAuth = async (force: boolean = false) => {
        if (initPromise && !force) {
            return initPromise;
        }

        initPromise = (async () => {
            setLoading(true);
            try {
                // 1. Check for password recovery or OAuth tokens in URL hash
                const hash = window.location.hash;
                if (hash) {
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    const type = params.get('type');

                    if (accessToken) {
                        const hostname = window.location.hostname;
                        const isMainDomain = hostname === 'testoza.com' || hostname === 'www.testoza.com';

                        if (isMainDomain) {
                            console.log("[AuthContext] Forwarding OAuth hash to app subdomain...");
                            window.location.replace(`https://app.testoza.com/auth/callback${hash}`);
                            return;
                        }

                        tokenStorage.setTokens(accessToken, refreshToken || undefined);

                        if (type === 'recovery') {
                            window.history.replaceState(null, '', window.location.pathname);
                            window.location.href = '/update-password';
                            return;
                        }

                        // Do not strip hash prematurely if on /auth/callback so AuthCallback component processes it cleanly
                        if (!window.location.pathname.startsWith('/auth/callback')) {
                            window.history.replaceState(null, '', window.location.pathname);
                        }
                    }
                }

                // 2. Load token from storage
                const token = tokenStorage.getTokens().token;
                if (!token) {
                    setUser(null);
                    setSession(null);
                    setProfile(null);
                    setIsAdmin(false);
                    await checkPremiumStatus(undefined);
                    return;
                }

                // Parse JWT payload client-side
                let decodedPayload: any = null;
                let userId: string | undefined;
                let isExpired = false;
                try {
                    const payloadBase64 = token.split('.')[1];
                    decodedPayload = JSON.parse(atob(payloadBase64));
                    userId = decodedPayload.sub;
                    if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
                        isExpired = true;
                    }
                } catch (err) {
                    console.warn("[AuthContext] Failed to parse JWT payload client-side:", err);
                }

                // 3. Resolve User Object (Resilient Multi-Layer Strategy)
                let userData: any = null;

                // Strategy A: Supabase Client SDK directly
                try {
                    const { data: sbData, error: sbErr } = await supabase.auth.getUser(token);
                    if (!sbErr && sbData?.user) {
                        userData = sbData.user;
                    }
                } catch (sbErr) {
                    console.warn("[AuthContext] Supabase SDK getUser failed, trying next strategy:", sbErr);
                }

                // Strategy B: Backend /auth/me
                if (!userData) {
                    try {
                        const meResponse = await authApi.getMe();
                        if (meResponse?.data?.user) {
                            userData = meResponse.data.user;
                        }
                    } catch (apiErr) {
                        console.warn("[AuthContext] Backend /auth/me call failed:", apiErr);
                    }
                }

                // Strategy C: JWT Claims (if token is unexpired, use parsed user data as offline fallback)
                if (!userData && decodedPayload && !isExpired) {
                    userData = {
                        id: decodedPayload.sub || userId,
                        email: decodedPayload.email,
                        user_metadata: decodedPayload.user_metadata || {},
                        app_metadata: decodedPayload.app_metadata || {},
                        role: decodedPayload.role || 'authenticated'
                    };
                }

                // If user was successfully resolved:
                if (userData && userData.id) {
                    setUser(userData);
                    setSession({ user: userData, access_token: token });

                    // Keep Supabase SDK internal session warm
                    try {
                        const refreshToken = tokenStorage.getTokens().refreshToken;
                        if (refreshToken) {
                            await supabase.auth.setSession({
                                access_token: token,
                                refresh_token: refreshToken
                            });
                        }
                    } catch (sdkErr) {
                        // ignore sdk sync errors
                    }

                    // Safe isolated parallel fetch for profile & admin status (errors won't wipe login)
                    const [profileData] = await Promise.all([
                        fetchProfileData(userData.id).catch(() => null),
                        checkAdminStatus(userData.id).catch(() => false)
                    ]);

                    // Auto-provision profile if missing
                    let activeProfile = profileData;
                    if (!activeProfile) {
                        try {
                            const { updateProfile } = await import('@/lib/usersApi');
                            const provisionRes = await updateProfile(userData.id, {
                                email: userData.email,
                                full_name: userData.user_metadata?.full_name || userData.user_metadata?.name || '',
                                avatar_url: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || ''
                            });
                            if (provisionRes.data) {
                                activeProfile = provisionRes.data;
                                setProfile(activeProfile);
                            }
                        } catch (provErr) {
                            // ignore auto-provision errors
                        }
                    }

                    await checkPremiumStatus(userData.id, activeProfile).catch(() => {});
                } else if (isExpired) {
                    // Only clear if definitively expired and cannot be resolved
                    console.warn("[AuthContext] Session expired, clearing tokens");
                    tokenStorage.clearTokens();
                    setUser(null);
                    setSession(null);
                    setProfile(null);
                    setIsAdmin(false);
                    await checkPremiumStatus(undefined);
                }
            } catch (error) {
                console.error('[AuthContext] Auth initialization error:', error);
            } finally {
                setLoading(false);
                initPromise = null;
            }
        })();

        return initPromise;
    };

    useEffect(() => {
        // Fire backend warmup FIRST
        const warmUpBackend = () => {
            apiClient.get('health').catch(() => { });
            apiClient.options('auth/login').catch(() => { });
        };
        warmUpBackend();

        initializeAuth();

        // Listen for Supabase SDK auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session?.access_token) {
                    tokenStorage.setTokens(session.access_token, session.refresh_token);
                    if (session.user) {
                        setUser(session.user);
                        setSession(session);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                tokenStorage.clearTokens();
                setUser(null);
                setSession(null);
                setProfile(null);
                setIsAdmin(false);
            }
        });

        return () => {
            authListener?.subscription?.unsubscribe();
        };
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
            refreshSession: () => initializeAuth(true)
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
