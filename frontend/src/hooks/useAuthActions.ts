import { supabase } from '@/integrations/supabase/client';
import { authApi } from '@/lib/authApi';
import { tokenStorage } from '@/utils/tokenStorage';


export async function signUpWithEmail(email: string, password: string, name?: string, designation?: string) {
    try {
        const response = await authApi.register({
            email,
            password,
            metadata: {
                full_name: name,
                designation: designation,
            }
        });
        return response;
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function signInWithEmail(email: string, password: string) {
    try {
        const response = await authApi.login({ email, password });

        // After successful login, store tokens
        if (response.data?.session?.access_token) {
            tokenStorage.setTokens(
                response.data.session.access_token,
                response.data.session.refresh_token
            );
        }

        return response;
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function signOut() {
    try {
        await authApi.logout();
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        tokenStorage.clearTokens();
        window.location.reload(); // Force full reload to clear state
    }
}

export async function resetPasswordForEmail(email: string) {
    try {
        const response = await authApi.resetPassword(email);
        return response;
    } catch (error: any) {
        return { data: null, error };
    }
}

import { getAppUrl } from '@/utils/subdomain';

export async function signInWithGoogle(): Promise<{ error: any; data?: any }> {
    try {
        const redirectUrl = getAppUrl('/auth/callback');
        console.log('[AuthActions] Initiating Google OAuth with popup flow:', redirectUrl);

        // Request OAuth URL from Supabase with skipBrowserRedirect so current page is never refreshed
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true
            }
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No OAuth URL received from authentication provider');

        // Center popup on current screen
        const width = 500;
        const height = 650;
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

        const popup = window.open(
            data.url,
            'TestoZaGoogleAuth',
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup) {
            // Popup blocked by browser policy - fallback to standard navigation
            console.warn('[AuthActions] Popup blocked, falling back to full-page redirect');
            window.location.href = data.url;
            return { error: null };
        }

        // Return a Promise that resolves when popup completes authentication
        return new Promise((resolve) => {
            let messageHandled = false;

            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;

                if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                    messageHandled = true;
                    window.removeEventListener('message', handleMessage);
                    clearInterval(checkClosedInterval);

                    const { accessToken, refreshToken } = event.data;
                    if (accessToken) {
                        tokenStorage.setTokens(accessToken, refreshToken || undefined);
                    }
                    resolve({ error: null, data: event.data });
                } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
                    messageHandled = true;
                    window.removeEventListener('message', handleMessage);
                    clearInterval(checkClosedInterval);
                    resolve({ error: new Error(event.data?.error || 'Google authentication failed') });
                }
            };

            window.addEventListener('message', handleMessage);

            // Periodically check if popup was manually closed
            const checkClosedInterval = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosedInterval);
                    window.removeEventListener('message', handleMessage);
                    if (!messageHandled) {
                        const localToken = tokenStorage.getTokens().token;
                        if (localToken) {
                            resolve({ error: null });
                        } else {
                            resolve({ error: new Error('Login popup closed') });
                        }
                    }
                }
            }, 500);
        });

    } catch (error: any) {
        console.error("Client Google Auth error:", error);
        return { error };
    }
}


