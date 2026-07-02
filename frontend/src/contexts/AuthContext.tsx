// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/authApi';
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
            const response = await import('@/lib/apiClient').then(m => m.default.get('/users/check-admin', { params: { user_id } }));
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

    const initializeAuth = async () => {
        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {
            setLoading(true);
            try {
                // 1. Check for password recovery tokens in URL hash (from password reset links)
                const hash = window.location.hash;
                if (hash) {
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    const type = params.get('type');

                    if (accessToken) {
                        tokenStorage.setTokens(accessToken, refreshToken || undefined);
                        window.history.replaceState(null, '', window.location.pathname);
                        
                        if (type === 'recovery') {
                            window.location.href = '/update-password';
                            return;
                        }
                    }
                }

                // 2. Load from localStorage
                const token = tokenStorage.getTokens().token;
                if (token) {
                    try {
                        let userId: string | undefined;
                        try {
                            const payloadBase64 = token.split('.')[1];
                            const decodedPayload = JSON.parse(atob(payloadBase64));
                            userId = decodedPayload.sub;
                        } catch (err) {
                            console.warn("Failed to parse JWT payload client-side:", err);
                        }

                        if (userId) {
                            // Parallelize: authApi.getMe(), profile details, and admin status
                            const [meResponse, profileData] = await Promise.all([
                                authApi.getMe(),
                                fetchProfileData(userId),
                                checkAdminStatus(userId)
                            ]);

                            if (meResponse.data?.user) {
                                const userData = meResponse.data.user;
                                setUser(userData);
                                setSession({ user: userData, access_token: token });

                                // Sync back into Supabase client SDK so its internal session stays warm
                                try {
                                    const refreshToken = tokenStorage.getTokens().refreshToken;
                                    if (refreshToken) {
                                        await supabase.auth.setSession({
                                            access_token: token,
                                            refresh_token: refreshToken
                                        });
                                    }
                                } catch (sdkErr) {
                                    console.warn("Failed to sync session to Supabase SDK:", sdkErr);
                                }

                                // Frontend Auto-Provisioning: if profile is missing (404), create it using JWT metadata
                                let activeProfile = profileData;
                                if (!activeProfile) {
                                    console.log("Profile not found in database. Auto-provisioning from frontend...");
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
                                            console.log("Profile auto-provisioned successfully:", activeProfile);
                                        }
                                    } catch (provErr) {
                                        console.error("Failed to auto-provision profile from frontend:", provErr);
                                    }
                                }

                                // checkPremiumStatus uses the preloaded profileData to prevent a duplicate fetch
                                await checkPremiumStatus(userData.id, activeProfile);
                            } else {
                                throw new Error("No user in response");
                            }
                        } else {
                            // Fallback to sequential flow if token parsing fails
                            const response = await authApi.getMe();
                            if (response.data?.user) {
                                const userData = response.data.user;
                                setUser(userData);
                                setSession({ user: userData, access_token: token });

                                // Sync back into Supabase client SDK so its internal session stays warm
                                try {
                                    const refreshToken = tokenStorage.getTokens().refreshToken;
                                    if (refreshToken) {
                                        await supabase.auth.setSession({
                                            access_token: token,
                                            refresh_token: refreshToken
                                        });
                                    }
                                } catch (sdkErr) {
                                    console.warn("Failed to sync session to Supabase SDK:", sdkErr);
                                }

                                let profileData = await fetchProfileData(userData.id);
                                
                                // Frontend Auto-Provisioning fallback
                                if (!profileData) {
                                    console.log("Profile not found. Auto-provisioning from frontend (sequential path)...");
                                    try {
                                        const { updateProfile } = await import('@/lib/usersApi');
                                        const provisionRes = await updateProfile(userData.id, {
                                            email: userData.email,
                                            full_name: userData.user_metadata?.full_name || userData.user_metadata?.name || '',
                                            avatar_url: userData.user_metadata?.avatar_url || userData.user_metadata?.picture || ''
                                        });
                                        if (provisionRes.data) {
                                            profileData = provisionRes.data;
                                            setProfile(profileData);
                                            console.log("Profile auto-provisioned successfully:", profileData);
                                        }
                                    } catch (provErr) {
                                        console.error("Failed to auto-provision profile from frontend:", provErr);
                                    }
                                }

                                await Promise.all([
                                    checkAdminStatus(userData.id),
                                    checkPremiumStatus(userData.id, profileData)
                                ]);
                            } else {
                                throw new Error("No user in response");
                            }
                        }
                    } catch (e: any) {
                        // Only wipe token and logout on definitive auth error (401/403)
                        const isAuthError = e?.response?.status === 401 || e?.response?.status === 403 || e?.message === "No user in response";
                        if (isAuthError) {
                            console.warn("Authentication invalid, clearing session:", e);
                            tokenStorage.clearTokens();
                            setUser(null);
                            setSession(null);
                            await checkPremiumStatus(undefined);
                        } else {
                            console.error("Auth initialization failed due to server/network error:", e);
                        }
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
                initPromise = null;
            }
        })();

        return initPromise;
    };

    useEffect(() => {
        initializeAuth();
        
        // Silent background ping to wake up Cloud Run from throttled state (prevents login preflight timeouts)
        const warmUpBackend = async () => {
            try {
                const { default: apiClient } = await import('@/lib/apiClient');
                await apiClient.get('health');
            } catch (err) {
                // Fail silently since this is only a wake-up call
            }
        };
        warmUpBackend();
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
