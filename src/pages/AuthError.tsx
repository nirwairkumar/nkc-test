import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogIn, RotateCcw } from 'lucide-react';
import { signInWithGoogle } from '@/hooks/useAuthActions';
import { toast } from 'sonner';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

/**
 * AuthError — displayed when Google social login fails.
 * Shows the error, explains what happened, and offers alternatives.
 */
export default function AuthError() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const error = searchParams.get('error') || 'unknown_error';
    const detail = searchParams.get('detail') || 'Google sign-in could not be completed.';

    const handleRetryGoogle = async () => {
        // Save current intent again before retrying
        const intent = localStorage.getItem('auth_redirect_intent');
        if (!intent) {
            localStorage.setItem('auth_redirect_intent', '/dashboard');
        }

        try {
            const { error } = await signInWithGoogle();
            if (error) {
                toast.error(error.message || 'Google login failed again');
            }
        } catch (err: any) {
            toast.error(err.message || 'Could not initiate Google login');
        }
    };

    const handleManualLogin = () => {
        navigate('/login', { replace: true });
    };

    const getErrorMessage = (error: string): string => {
        switch (error) {
            case 'access_denied':
                return 'Access was denied. You may have cancelled the Google sign-in or your account is not permitted.';
            case 'missing_token':
                return 'No authentication token was received from Google. This usually means the sign-in was interrupted.';
            case 'callback_error':
                return 'An unexpected error occurred while processing your login. Please try again.';
            case 'server_error':
                return 'Google\'s authentication service encountered an error. Please try again in a moment.';
            default:
                return detail;
        }
    };

    return (
        <div className="flex flex-col justify-center items-center min-h-[70vh] px-4">
            <SEO
                title="Login Failed - TestoZa"
                noindex={true}
            />
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <CardTitle className="text-xl">Google Sign-In Failed</CardTitle>
                    <CardDescription className="mt-2">
                        {getErrorMessage(error)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Retry Google */}
                    <GoogleSignInButton
                        onClick={handleRetryGoogle}
                        text="Try Google Sign-In Again"
                    />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or
                            </span>
                        </div>
                    </div>

                    {/* Manual login */}
                    <Button
                        className="w-full gap-2"
                        onClick={handleManualLogin}
                    >
                        <LogIn className="h-4 w-4" />
                        Login with Email & Password
                    </Button>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                        If you continue to face issues, please contact{' '}
                        <a href="mailto:support@testoza.com" className="underline hover:text-primary">
                            support@testoza.com
                        </a>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
