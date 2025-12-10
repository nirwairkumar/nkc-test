import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import supabase from '@/lib/supabaseClient';

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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { signInWithEmail, signUpWithEmail, resetPasswordForEmail } from '@/hooks/useAuthActions';
import { useNavigate, useLocation } from 'react-router-dom';
import { BackButton } from '@/components/ui/BackButton';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, {
        message: 'Password must be at least 6 characters.',
    }).optional(),
    confirmPassword: z.string().optional(),
    name: z.string().optional(),
}).refine((data) => {
    // If name is present (signup mode), check passwords match
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
                const { error, data } = await signInWithEmail(values.email, values.password);
                if (error) throw error;
                toast.success('Successfully logged in!');

                // Check for admin status to auto-redirect
                const { data: adminRecord } = await supabase
                    .from('admins')
                    .select('email')
                    .eq('email', values.email)
                    .single();

                if (adminRecord) {
                    navigate('/admin-migration');
                } else {
                    const from = location.state?.from?.pathname || '/';
                    navigate(from, { replace: true });
                }

            } else if (view === 'signup') {
                if (!values.name || !values.password) {
                    toast.error("All fields are required");
                    setIsLoading(false);
                    return;
                }
                const { error } = await signUpWithEmail(values.email, values.password, values.name);
                if (error) throw error;
                toast.success('Sign up successful! Please check your email for confirmation.', {
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

    const toggleView = () => {
        form.reset();
        if (view === 'login') setView('signup');
        else setView('login');
    }

    return (
        <div className="flex flex-col justify-center items-center min-h-[80vh]">
            <div className="w-[350px] mb-4">
                <BackButton />
            </div>
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
                        </form>
                    </Form>

                    <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                        {view === 'login' && (
                            <>
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
                                    onClick={() => setView('forgot')}
                                >
                                    Forgot Password?
                                </Button>
                                <div className="text-muted-foreground">
                                    Don't have an account?{' '}
                                    <Button variant="link" className="p-0 h-auto" onClick={() => setView('signup')}>
                                        Sign Up
                                    </Button>
                                </div>
                            </>
                        )}
                        {view === 'signup' && (
                            <div className="text-muted-foreground">
                                Already have an account?{' '}
                                <Button variant="link" className="p-0 h-auto" onClick={() => setView('login')}>
                                    Login
                                </Button>
                            </div>
                        )}
                        {view === 'forgot' && (
                            <Button variant="link" className="p-0 h-auto" onClick={() => setView('login')}>
                                Back to Login
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
