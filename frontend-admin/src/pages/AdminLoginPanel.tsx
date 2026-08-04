import React, { useState } from 'react';
import { SEO } from '@/components/SEO';
import { useForm } from 'react-hook-form';
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
import { signInWithEmail } from '@/hooks/useAuthActions';
import { useAuth } from '@/contexts/AuthContext';
import { checkAdmin } from '@/lib/usersApi';
import { authApi } from '@/lib/authApi';
import { useTurnstile } from '@/hooks/useTurnstile';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, { message: 'Password is required' }),
});

interface AdminLoginPanelProps {
    onLoginSuccess?: () => void;
}

export default function AdminLoginPanel({ onLoginSuccess }: AdminLoginPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { refreshSession } = useAuth();
    const { turnstileRef, getToken, resetTurnstile } = useTurnstile({ theme: 'auto', size: 'normal' });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const turnstileToken = getToken();
            const { error: authError, data: authData } = await signInWithEmail(values.email, values.password, turnstileToken);

            if (authError) {
                resetTurnstile();
                throw authError;
            }

            const userId = authData.user?.id;
            if (!userId) {
                resetTurnstile();
                throw new Error("Login succeeded but no user data found.");
            }

            const { data: isAdminCheck, error: adminCheckError } = await checkAdmin(userId);

            if (adminCheckError || !isAdminCheck) {
                await authApi.logout();
                toast.error("Access Denied: You are not an authorized administrator.");
                setIsLoading(false);
                resetTurnstile();
                return;
            }

            await refreshSession();
            toast.success('Admin Login Successful');
            onLoginSuccess?.();
        } catch (error: any) {
            console.error(error);
            resetTurnstile();
            toast.error(error.message || 'Admin Authentication failed');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex flex-col justify-center items-center min-h-[80vh]">
            <SEO title="Admin Login - TestoZa" noindex={true} />
            <Card className="w-[350px] border-red-200 shadow-red-100">
                <CardHeader>
                    <CardTitle className="text-red-900">Admin Login</CardTitle>
                    <CardDescription>
                        Restricted Access. Admin credentials required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="admin@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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

                            {/* Cloudflare Turnstile bot verification */}
                            <div className="flex justify-center my-2 min-h-[65px]">
                                <div ref={turnstileRef} />
                            </div>

                            <Button type="submit" className="w-full bg-red-900 hover:bg-red-800" disabled={isLoading}>
                                {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
