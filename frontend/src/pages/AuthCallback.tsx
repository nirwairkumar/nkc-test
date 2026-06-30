import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/integrations/supabase/client';
import { tokenStorage } from '@/utils/tokenStorage';


/**
 * AuthCallback — handles the redirect from Supabase after Google OAuth.
 *
 * Supabase can redirect here in two ways:
 * 1. Implicit flow: tokens in URL hash → #access_token=...&refresh_token=...
 * 2. PKCE flow: authorization code in query params → ?code=...
 *
 * This page handles both flows.
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const { refreshSession } = useAuth();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('Processing your login...');

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            const hash = window.location.hash;
            const code = searchParams.get('code');

            console.log('[AuthCallback] URL:', window.location.href);
            console.log('[AuthCallback] Hash present:', !!hash);
            console.log('[AuthCallback] Code present:', !!code);

            // --- Flow 1: Implicit flow (tokens in hash) ---
            if (hash && hash.length > 1) {
                const params = new URLSearchParams(hash.substring(1));

                // Check for error from Supabase OAuth
                const error = params.get('error');
                const errorDescription = params.get('error_description');

                if (error) {
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
                    // Exchange the code directly using Supabase client
                    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;

                    const session = exchangeData?.session;

                    if (session?.access_token) {
                        tokenStorage.setTokens(session.access_token, session.refresh_token || undefined);

                        setStatus('Login successful! Redirecting...');
                        await refreshSession();
                        redirectToIntent();
                        return;
                    } else {
                        console.error('[AuthCallback] No session in PKCE response:', exchangeData);
                        navigate('/auth-error?error=pkce_error&detail=Could+not+exchange+code+for+session', { replace: true });
                        return;
                    }
                } catch (err: any) {
                    console.error('[AuthCallback] PKCE exchange error:', err);
                    navigate('/auth-error?error=pkce_error&detail=Code+exchange+failed', { replace: true });
                    return;
                }
            }


            // --- Check for error in query params too ---
            const errorParam = searchParams.get('error');
            const errorDesc = searchParams.get('error_description');
            if (errorParam) {
                const errorParams = new URLSearchParams();
                errorParams.set('error', errorParam);
                if (errorDesc) errorParams.set('detail', errorDesc);
                navigate(`/auth-error?${errorParams.toString()}`, { replace: true });
                return;
            }

            // --- No data at all ---
            const localToken = tokenStorage.getTokens().token;
            if (localToken) {
                setStatus('Login successful! Redirecting...');
                await refreshSession();
                redirectToIntent();
                return;
            }

            console.warn('[AuthCallback] No hash, no code, no error. Full URL:', window.location.href);
            setStatus('No authentication data found. Redirecting...');
            setTimeout(() => navigate('/login', { replace: true }), 2000);

        } catch (err) {
            console.error('Auth callback error:', err);
            navigate('/auth-error?error=callback_error&detail=An+unexpected+error+occurred+during+login', { replace: true });
        }
    };

    const redirectToIntent = () => {
        const redirectIntent = localStorage.getItem('auth_redirect_intent');
        localStorage.removeItem('auth_redirect_intent');
        const destination = redirectIntent || '/dashboard';

        setTimeout(() => {
            navigate(destination, { replace: true });
        }, 150);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-lg">{status}</p>
        </div>
    );
}
