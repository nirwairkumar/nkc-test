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
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { checkAdmin } from '@/lib/usersApi';
import { authApi } from '@/lib/authApi';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, { message: 'Password is required' }),
});

export default function AdminLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { user, isAdmin, loading: authLoading, refreshSession } = useAuth();

    useEffect(() => {
        if (!authLoading && user && isAdmin) {
            navigate('/admin-migration');
        }
    }, [user, isAdmin, authLoading, navigate]);

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
            // STRATEGY: 
            // 1. We should ideally only allow login if they are admin.
            // 2. But we can't check if they are admin until we know who they are (credentials).
            // 3. So we MUST Authenticate first.

            const { error: authError, data: authData } = await signInWithEmail(values.email, values.password);

            if (authError) throw authError;

            // Now we are logged in. Let's check if we are in the admin table.
            const userId = authData.user?.id;
            if (!userId) throw new Error("Login succeeded but no user data found.");

            const { data: isAdminCheck, error: adminCheckError } = await checkAdmin(userId);

            if (adminCheckError || !isAdminCheck) {
                // Not an admin!
                // Sign them out immediately via proxy
                await authApi.logout();
                toast.error("Access Denied: You are not an authorized administrator.");
                setIsLoading(false);
                return;
            }

            // Refresh the session to fetch profile and check status again
            await refreshSession();

            toast.success('Admin Login Successful');
            navigate('/admin-migration');
        } catch (error: any) {
            console.error(error);
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
