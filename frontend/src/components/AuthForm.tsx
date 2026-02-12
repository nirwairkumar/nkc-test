import React, { useState, useEffect } from 'react';
import { SEO } from '@/components/SEO';
import { useForm } from 'react-hook-form';
import supabase from '@/lib/supabaseClient';
import apiClient from '@/lib/apiClient';

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
import { signUpWithEmail, resetPasswordForEmail, signInWithGoogle } from '@/hooks/useAuthActions';
import { useNavigate, useLocation } from 'react-router-dom';


const formSchema = z.object({
    email: z.string().email(),
    password: z.string().optional(), // Validation handled manually or via refinement to allow empty for "forgot" view
    confirmPassword: z.string().optional(),
    name: z.string().optional(),
    designation: z.enum(["Student", "Teacher", "Institution", "Guest"]).optional(),
}).refine((data) => {
    // Signup passwords match check
    if (data.name && data.password !== data.confirmPassword) {
        return false;
    }
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

    useEffect(() => {
        if (location.state?.isSignup) {
            setView('signup');
        } else {
            setView('login');
        }
    }, [location.state]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            designation: undefined,
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
                    const response = await apiClient.post('/login', {
                        email: values.email,
                        password: values.password
                    });

                    const { session } = response.data; // Backend returns the full Supabase response which has 'session'

                    if (!session || !session.access_token || !session.refresh_token) {
                        throw new Error("Invalid session received from backend");
                    }

                    // CRITICAL FIX: Manually set the session on the frontend client
                    // This updates the AuthContext and local storage
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                    });

                    if (sessionError) throw sessionError;

                    toast.success('Successfully logged in via Backend!');

                    // Let the AuthContext update (it listens to onAuthStateChange)
                    // We might need a small delay or just rely on the navigate

                    const intent = localStorage.getItem('auth_redirect_intent');
                    const stateFrom = location.state?.from;
                    const from = intent || (typeof stateFrom === 'string' ? stateFrom : stateFrom?.pathname) || '/';
                    if (intent) localStorage.removeItem('auth_redirect_intent');

                    // Short timeout to ensure state propagation
                    setTimeout(() => {
                        navigate(from, { replace: true });
                    }, 100);

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
                if (!values.designation) {
                    toast.error("Please select a designation");
                    setIsLoading(false);
                    return;
                }
                const { error } = await signUpWithEmail(values.email, values.password, values.name, values.designation);
                if (error) {
                    if (error.message.includes('already registered') || error.message.includes('already exists')) {
                        toast.error('Account already exists. Please login.');
                    } else {
                        throw error;
                    }
                    setIsLoading(false);
                    return;
                }
                toast.success('Sign up successful!', {
                    duration: 5000,
                });
                setView('login');

            } else if (view === 'forgot') {
                const { error } = await resetPasswordForEmail(values.email);
                if (error) throw error;
                toast.success('Password reset link sent to your email.');
                setView('login');
            }
        } catch (error: any) {
            toast.error(error.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
            // Redirect is handled by Supabase
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
                        {view === 'login' && 'Enter your credentials to access your account'}
                        {view === 'signup' && 'Create a new account to start taking tests'}
                        {view === 'forgot' && 'Enter your email to receive a recovery link'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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

                            {view === 'signup' && (
                                <FormField
                                    control={form.control}
                                    name="designation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Designation</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select designation" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Student">Student</SelectItem>
                                                    <SelectItem value="Teacher">Teacher</SelectItem>
                                                    <SelectItem value="Institution">Institution</SelectItem>
                                                    <SelectItem value="Guest">Guest</SelectItem>
                                                </SelectContent>
                                            </Select>
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

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Loading...' :
                                    view === 'login' ? 'Sign In' :
                                        view === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                            </Button>

                            {(view === 'login' || view === 'signup') && (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">
                                                Or continue with
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleGoogleLogin}
                                        disabled={isLoading}
                                    >
                                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                        Google
                                    </Button>
                                </>
                            )}
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
