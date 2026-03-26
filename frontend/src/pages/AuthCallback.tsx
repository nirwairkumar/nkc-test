import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AuthCallback — handles the redirect from Supabase after Google OAuth.
 * Supabase appends tokens in the URL hash: #access_token=...&refresh_token=...
 * On error, Supabase appends: #error=...&error_description=...
 *
 * This page:
 * 1. Reads tokens/errors from the hash
 * 2. Stores tokens in localStorage
 * 3. Calls refreshSession() to update AuthContext
 * 4. Redirects to the saved auth_redirect_intent (or /dashboard)
 * 5. On error → redirects to /auth-error
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const { refreshSession } = useAuth();
    const [status, setStatus] = useState('Processing your login...');

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            const hash = window.location.hash;

            if (!hash) {
                // No hash at all — could be a stale visit
                setStatus('No authentication data found. Redirecting...');
                setTimeout(() => navigate('/login', { replace: true }), 1500);
                return;
            }

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

            // Extract tokens
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (!accessToken) {
                navigate('/auth-error?error=missing_token&detail=No+access+token+received+from+provider', { replace: true });
                return;
            }

            // Store tokens
            localStorage.setItem('testoza_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('testoza_refresh_token', refreshToken);
            }

            // Clean the URL hash
            window.history.replaceState(null, '', window.location.pathname);

            setStatus('Login successful! Redirecting...');

            // Refresh the auth context to pick up the new session
            await refreshSession();

            // Redirect to the intended page (saved before OAuth redirect)
            const redirectIntent = localStorage.getItem('auth_redirect_intent');
            localStorage.removeItem('auth_redirect_intent');

            const destination = redirectIntent || '/dashboard';

            // Small delay to ensure AuthContext state propagates
            setTimeout(() => {
                navigate(destination, { replace: true });
            }, 150);
        } catch (err) {
            console.error('Auth callback error:', err);
            navigate('/auth-error?error=callback_error&detail=An+unexpected+error+occurred+during+login', { replace: true });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-lg">{status}</p>
        </div>
    );
}
