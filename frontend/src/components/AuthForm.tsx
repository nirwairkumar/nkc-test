import React, { useState, useEffect } from 'react';
import { SEO } from '@/components/SEO';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import apiClient from '@/lib/apiClient';
import { Loader2 } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { signUpWithEmail, signInWithEmail, resetPasswordForEmail, signInWithGoogle } from '@/hooks/useAuthActions';


const formSchema = z.object({
    email: z.string().email(),
    password: z.string().optional(), // Validation handled manually or via refinement to allow empty for "forgot" view
    confirmPassword: z.string().optional(),
    name: z.string().optional(),
}).refine((data) => {
    // Signup passwords match check
    /* 
    if (data.name && data.password !== data.confirmPassword) {
        return false;
    }
    */
    return true;
}, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function AuthForm() {
    const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { refreshSession } = useAuth();
    const { openAuthModal } = useAuthModal();

    useEffect(() => {
        apiClient.get('health').catch(() => {});

        const queryParams = new URLSearchParams(location.search);
        const isSignupParam = queryParams.get('signup') === 'true' || queryParams.get('isSignup') === 'true';

        if (location.state?.isSignup || isSignupParam) {
            setView('signup');
        } else {
            setView('login');
        }

        const stateFrom = location.state?.from;
        const redirectPath = (typeof stateFrom === 'string' ? stateFrom : stateFrom?.pathname);
        if (redirectPath && redirectPath !== '/login' && redirectPath !== '/onboarding') {
            localStorage.setItem('auth_redirect_intent', redirectPath);
        }

        // Trigger the popup modal
        openAuthModal({
            view: isSignupParam ? 'signup' : 'login',
            redirectPath: redirectPath && redirectPath !== '/login' ? redirectPath : '/'
        });
    }, [location.state, location.search, openAuthModal]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            if (view === 'login') {
                if (!values.password) {
                    toast.error("Password is required");
                    setIsLoading(false);
                    return;
                }
                if (values.password.length < 6) {
                    toast.error("Password must be at least 6 characters");
                    setIsLoading(false);
                    return;
                }

                try {
                    const response = await signInWithEmail(values.email, values.password!);

                    if (response.error) {
                        toast.error(response.error.message || 'Login failed');
                        setIsLoading(false);
                        return;
                    }

                    const { session } = response.data;

                    if (!session || !session.access_token) {
                        throw new Error("Invalid session received from backend");
                    }

                    await refreshSession();

                    toast.success('Successfully logged in!');

                    const intent = localStorage.getItem('auth_redirect_intent');
                    const stateFrom = location.state?.from;
                    const from = intent || (typeof stateFrom === 'string' ? stateFrom : stateFrom?.pathname) || '/';
                    if (intent) localStorage.removeItem('auth_redirect_intent');

                    navigate(from, { replace: true });

                } catch (err: any) {
                    console.error("Login failed", err);
                    toast.error(err.response?.data?.detail || err.message || 'Login failed');
                    setIsLoading(false);
                    return;
                }
            } else if (view === 'signup') {
                if (!values.name || !values.password) {
                    toast.error("All fields are required");
                    setIsLoading(false);
                    return;
                }
                if (values.password.length < 6) {
                    toast.error("Password must be at least 6 characters");
                    setIsLoading(false);
                    return;
                }
                const { error } = await signUpWithEmail(values.email, values.password, values.name);
                if (error) {
                    if (error.message.includes('already registered') || error.message.includes('already exists')) {
                        toast.error('Account already exists. Please login.');
                    } else {
                        throw error;
                    }
                    setIsLoading(false);
                    return;
                }

                // Direct Login logic after signup
                try {
                    const response = await signInWithEmail(values.email, values.password!);

                    if (response.error) throw response.error;

                    const { session } = response.data;

                    if (!session || !session.access_token) {
                        throw new Error("Invalid session received from backend");
                    }

                    await refreshSession();

                    toast.success('Successfully signed up and logged in!');

                    const intent = localStorage.getItem('auth_redirect_intent');
                    const stateFrom = location.state?.from;
                    const from = intent || (typeof stateFrom === 'string' ? stateFrom : stateFrom?.pathname) || '/';
                    if (intent) localStorage.removeItem('auth_redirect_intent');

                    navigate(from, { replace: true });
                } catch (loginErr: any) {
                    toast.success('Account created successfully! Please login.');
                    setView('login');
                }

            } else if (view === 'forgot') {
                const { error } = await resetPasswordForEmail(values.email);
                if (error) {
                    toast.error(error.message || 'Failed to send reset link');
                } else {
                    toast.success('Password reset link sent to your email');
                    setView('login');
                }
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            toast.error(error.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            // Save the intended redirect path so AuthCallback can redirect back after login
            // Only set if not already set (e.g. by the useEffect on mount)
            const existingIntent = localStorage.getItem('auth_redirect_intent');
            if (!existingIntent) {
                const stateFrom = location.state?.from;
                const redirectPath = (typeof stateFrom === 'string' ? stateFrom : stateFrom?.pathname) || '/';
                localStorage.setItem('auth_redirect_intent', redirectPath);
            }

            const { error } = await signInWithGoogle();
            if (error) throw error;
            // Redirect is handled by backend or OAuth provider
        } catch (error: any) {
            toast.error(error.message || 'Google login failed');
            setIsLoading(false);
        }
    };

    const toggleView = (newView: 'login' | 'signup' | 'forgot') => {
        form.reset();
        setView(newView);
    }

    return (
        <div className="flex flex-col justify-center items-center min-h-[80vh]">
            <SEO
                title={`${view === 'login' ? 'Login' : view === 'signup' ? 'Sign Up' : 'Reset Password'} - TestoZa`}
                noindex={true}
            />
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>
                        {view === 'login' ? 'Login' : view === 'signup' ? 'Sign Up' : 'Reset Password'}
                    </CardTitle>
                    <CardDescription>
                        {view === 'login' && 'Continue with Google'}
                        {view === 'signup' && 'Create a new account to start taking tests'}
                        {view === 'forgot' && 'Enter your email to receive a recovery link'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <fieldset disabled={isLoading} className="space-y-4">
                                {(view === 'login' || view === 'signup') && (
                                    <>
                                        <GoogleSignInButton
                                            onClick={handleGoogleLogin}
                                            isLoading={isLoading}
                                            text="Sign in with Google"
                                        />
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs">
                                                <span className="bg-background px-2 text-muted-foreground">
                                                    Or Enter Your Credential
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {view === 'signup' && (
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}



                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="name@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {view !== 'forgot' && (
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="******" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Commented out confirm password ui
                            {view === 'signup' && (
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="******" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            */}

                                <Button type="submit" className="w-full relative" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {view === 'login' ? 'Signing In...' :
                                                view === 'signup' ? 'Signing Up...' : 'Sending...'}
                                        </>
                                    ) : (
                                        view === 'login' ? 'Sign In' :
                                            view === 'signup' ? 'Sign Up' : 'Send Reset Link'
                                    )}
                                </Button>
                            </fieldset>

                        </form>
                    </Form>

                    <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                        {view === 'login' && (
                            <>
                                <Button
                                    variant="link"
                                    type="button"
                                    className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
                                    onClick={() => toggleView('forgot')}
                                >
                                    Forgot Password?
                                </Button>
                                <div className="text-muted-foreground">
                                    Don't have an account?{' '}
                                    <Button variant="link" type="button" className="p-0 h-auto" onClick={() => toggleView('signup')}>
                                        Sign Up
                                    </Button>
                                </div>
                            </>
                        )}
                        {view === 'signup' && (
                            <div className="text-muted-foreground">
                                Already have an account?{' '}
                                <Button variant="link" type="button" className="p-0 h-auto" onClick={() => toggleView('login')}>
                                    Login
                                </Button>
                            </div>
                        )}
                        {view === 'forgot' && (
                            <Button variant="link" type="button" className="p-0 h-auto" onClick={() => toggleView('login')}>
                                Back to Login
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
