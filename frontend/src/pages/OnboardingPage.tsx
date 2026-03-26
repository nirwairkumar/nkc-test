import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '@/lib/usersApi';


const formSchema = z.object({
    name: z.string().min(2, {
        message: 'Name must be at least 2 characters.',
    }),
    designation: z.enum(["Student", "Teacher", "Institution", "Guest"], {
        required_error: "Please select a designation.",
    }),
});

export default function OnboardingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            designation: undefined,
        },
    });

    useEffect(() => {
        if (!loading && user) {
            form.setValue('name', user.user_metadata?.full_name || '');
        }
    }, [user, loading, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            if (!user?.email) {
                toast.error('User not found');
                return;
            }

            const isCreatorDefault = values.designation === 'Teacher' || values.designation === 'Institution';

            // 1. Try to update Auth User Metadata (non-critical — may fail for Google OAuth users
            //    if the backend doesn't have a service role key)
            try {
                const { authApi } = await import('@/lib/authApi');
                await authApi.updateMetadata({
                    full_name: values.name,
                    designation: values.designation
                });
            } catch (metaErr) {
                console.warn('Auth metadata update failed (non-critical):', metaErr);
                // Continue — profiles table is the primary source of truth
            }

            // 2. Sync to profiles table via Backend API (this is the critical update)
            const { error: profileError } = await updateProfile(user.id, {
                full_name: values.name,
                designation: values.designation,
                is_creator: isCreatorDefault as any
            });

            if (profileError) {
                console.error('Error syncing public profile:', profileError);
                throw profileError;
            }

            toast.success('Profile updated successfully!');
            navigate('/', { replace: true });
            // Reload to refresh the auth context with updated metadata
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    }

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Welcome to Testoza</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Continue'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
