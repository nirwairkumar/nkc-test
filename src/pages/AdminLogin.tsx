import React, { useState } from 'react';
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
import { BackButton } from '@/components/ui/BackButton';
import supabase from '@/lib/supabaseClient';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, { message: 'Password is required' }),
});

export default function AdminLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { user, isAdmin, loading: authLoading } = useAuth();

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
            // Check if email is in the allowed admin list
            // Note: RLS allows us to 'select' from admins. 
            // If the user is NOT logged in yet, we can't check RLS if it's restricted to auth users.
            // But we made the RLS "users can check their own admin status". They aren't logged in yet, so that might fail if checking *before* logging in.
            // Actually, if I login FIRST, then check, it works.
            // BUT, the requirement is "don't let them become admin". 
            // If I just login, they become a user.
            // Let's check the table. If I configured RLS to be "public read", this would work.
            // If RLS is "auth only", this `select` will return nothing or error.

            // STRATEGY: 
            // 1. We should ideally only allow login if they are admin.
            // 2. But we can't check if they are admin until we know who they are (credentials).
            // 3. So we MUST Authenticate first.

            const { error: authError, data: authData } = await signInWithEmail(values.email, values.password);

            if (authError) throw authError;

            // Now we are logged in. Let's check if we are in the admin table.
            const user = authData.user;
            if (!user || !user.email) throw new Error("Login succeeded but no user data found.");

            const { data: adminRecord, error: adminCheckError } = await supabase
                .from('admins')
                .select('email')
                .eq('email', user.email)
                .single();

            if (adminCheckError || !adminRecord) {
                // Not an admin!
                // Sign them out immediately.
                await supabase.auth.signOut();
                toast.error("Access Denied: You are not an authorized administrator.");
                setIsLoading(false);
                return;
            }

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
            <div className="w-[350px] mb-4">
                <BackButton />
            </div>
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
