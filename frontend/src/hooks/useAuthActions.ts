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

// Set while the Google popup is open, so AuthCallback knows it is running in that
// popup even when window.opener is gone. Supabase returns every sign-in through
// https://testoza.com (the project's Site URL), and the Cross-Origin-Opener-Policy
// header there cuts the popup off from the page that opened it. A cookie on
// .testoza.com, not localStorage: the popup can start on testoza.com and finish on app.testoza.com.
const SIGN_IN_POPUP_COOKIE = 'testoza_signin_popup';

const markSignInPopup = (open: boolean) => {
    const domain = window.location.hostname.endsWith('testoza.com') ? '; domain=.testoza.com' : '';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${SIGN_IN_POPUP_COOKIE}=${open ? '1' : ''}; path=/${domain}; max-age=${open ? 600 : 0}; SameSite=Lax${secure}`;
};

/** True (once) when this window is the Google sign-in popup. */
export function takeSignInPopupMark(): boolean {
    const marked = document.cookie.split(';').some(c => c.trim() === `${SIGN_IN_POPUP_COOKIE}=1`);
    if (marked) markSignInPopup(false);
    return marked;
}

export async function signInWithGoogle(): Promise<{ error: any; data?: any }> {
    try {
        // Absolute: a relative redirect never matches Supabase's Redirect URLs, so it
        // always fell back to the Site URL (https://testoza.com).
        const redirectUrl = new URL(getAppUrl('/auth/callback'), window.location.origin).href;
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

        // An expired session leaves its old token behind; only a new one means this sign-in worked.
        const tokenBefore = tokenStorage.getTokens().token;

        markSignInPopup(true);
        const popup = window.open(
            data.url,
            'TestoZaGoogleAuth',
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup) {
            // Popup blocked by browser policy - fallback to standard navigation
            markSignInPopup(false);
            console.warn('[AuthActions] Popup blocked, falling back to full-page redirect');
            window.location.href = data.url;
            return { error: null };
        }

        // Return a Promise that resolves when popup completes authentication
        return new Promise((resolve) => {
            const finish = (result: { error: any; data?: any }) => {
                window.removeEventListener('message', handleMessage);
                clearInterval(checkClosedInterval);
                markSignInPopup(false);
                resolve(result);
            };

            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;

                if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                    const { accessToken, refreshToken } = event.data;
                    if (accessToken) {
                        tokenStorage.setTokens(accessToken, refreshToken || undefined);
                    }
                    finish({ error: null, data: event.data });
                } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
                    finish({ error: new Error(event.data?.error || 'Google authentication failed') });
                }
            };

            window.addEventListener('message', handleMessage);

            // popup.closed also turns true while a popup that was cut off from this
            // window is still open. That popup sends no message: AuthCallback stores
            // the new tokens and closes it, and this check picks them up.
            const checkClosedInterval = setInterval(() => {
                if (!popup.closed) return;
                const token = tokenStorage.getTokens().token;
                if (token && token !== tokenBefore) {
                    finish({ error: null });
                } else if (document.hasFocus()) {
                    // Focus comes back here when the popup really closes; a cut-off popup keeps it.
                    finish({ error: new Error('Login popup closed') });
                }
            }, 500);
        });

    } catch (error: any) {
        console.error("Client Google Auth error:", error);
        return { error };
    }
}


