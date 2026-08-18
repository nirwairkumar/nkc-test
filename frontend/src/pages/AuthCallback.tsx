import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { tokenStorage } from '@/utils/tokenStorage';
import SplashLoader from '@/components/ui/SplashLoader';

/**
 * AuthCallback — handles the redirect from Supabase after Google OAuth.
 *
 * Supports both:
 * 1. Popup mode (window.opener exists) -> sends token via postMessage and immediately closes itself without refreshing parent window.
 * 2. Full-page redirect mode (fallback) -> restores tokens, refreshes session, and redirects to origin route.
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const { refreshSession } = useAuth();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('Processing your login...');

    const notifyOpenerAndClose = (accessToken: string, refreshToken?: string): boolean => {
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage({
                    type: 'OAUTH_AUTH_SUCCESS',
                    accessToken,
                    refreshToken
                }, window.location.origin);
                window.close();
                return true;
            } catch (e) {
                console.error('[AuthCallback] Failed to notify opener:', e);
            }
        }
        return false;
    };

    const notifyOpenerErrorAndClose = (errorMsg: string): boolean => {
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage({
                    type: 'OAUTH_AUTH_ERROR',
                    error: errorMsg
                }, window.location.origin);
                window.close();
                return true;
            } catch (e) { }
        }
        return false;
    };

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            const hash = window.location.hash;
            const code = searchParams.get('code');

            // --- Flow 1: Implicit flow (tokens in hash) ---
            if (hash && hash.length > 1) {
                const params = new URLSearchParams(hash.substring(1));

                const error = params.get('error');
                const errorDescription = params.get('error_description');

                if (error) {
                    if (notifyOpenerErrorAndClose(errorDescription || error)) return;
                    const errorParams = new URLSearchParams();
                    errorParams.set('error', error);
                    if (errorDescription) errorParams.set('detail', errorDescription);
                    navigate(`/auth-error?${errorParams.toString()}`, { replace: true });
                    return;
                }

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken) {
                    tokenStorage.setTokens(accessToken, refreshToken || undefined);

                    if (notifyOpenerAndClose(accessToken, refreshToken || undefined)) {
                        return;
                    }

                    window.history.replaceState(null, '', window.location.pathname);
                    setStatus('Login successful! Redirecting...');

                    await refreshSession();
                    redirectToIntent();
                    return;
                }
            }

            // --- Flow 2: PKCE flow (code in query params) ---
            if (code) {
                setStatus('Exchanging authorization code...');

                try {
                    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;

                    const session = exchangeData?.session;

                    if (session?.access_token) {
                        tokenStorage.setTokens(session.access_token, session.refresh_token || undefined);

                        if (notifyOpenerAndClose(session.access_token, session.refresh_token || undefined)) {
                            return;
                        }

                        setStatus('Login successful! Redirecting...');
                        await refreshSession();
                        redirectToIntent();
                        return;
                    } else {
                        if (notifyOpenerErrorAndClose('Could not exchange code for session')) return;
                        navigate('/auth-error?error=pkce_error&detail=Could+not+exchange+code+for+session', { replace: true });
                        return;
                    }
                } catch (err: any) {
                    if (notifyOpenerErrorAndClose(err.message || 'Code exchange failed')) return;
                    navigate('/auth-error?error=pkce_error&detail=Code+exchange+failed', { replace: true });
                    return;
                }
            }

            // --- Check for error in query params ---
            const errorParam = searchParams.get('error');
            const errorDesc = searchParams.get('error_description');
            if (errorParam) {
                if (notifyOpenerErrorAndClose(errorDesc || errorParam)) return;
                const errorParams = new URLSearchParams();
                errorParams.set('error', errorParam);
                if (errorDesc) errorParams.set('detail', errorDesc);
                navigate(`/auth-error?${errorParams.toString()}`, { replace: true });
                return;
            }

            // --- Fallback: Check local token storage ---
            const localToken = tokenStorage.getTokens().token;
            if (localToken) {
                if (notifyOpenerAndClose(localToken)) return;
                setStatus('Login successful! Redirecting...');
                await refreshSession();
                redirectToIntent();
                return;
            }

            setStatus('No authentication data found. Redirecting...');
            setTimeout(() => navigate('/', { replace: true }), 1500);

        } catch (err: any) {
            console.error('Auth callback error:', err);
            if (notifyOpenerErrorAndClose(err.message || 'Authentication error')) return;
            navigate('/auth-error?error=callback_error&detail=An+unexpected+error+occurred+during+login', { replace: true });
        }
    };

    const redirectToIntent = () => {
        const redirectIntent = localStorage.getItem('auth_redirect_intent');
        localStorage.removeItem('auth_redirect_intent');
        const destination = redirectIntent && redirectIntent !== '/login' && redirectIntent !== '/onboarding' ? redirectIntent : '/';

        setTimeout(() => {
            navigate(destination, { replace: true });
        }, 150);
    };

    return <SplashLoader text={status} />;
}
