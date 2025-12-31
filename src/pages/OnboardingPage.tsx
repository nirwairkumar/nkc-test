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
import supabase from '@/lib/supabaseClient';

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
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: values.name,
                    designation: values.designation,
                }
            });

            if (error) throw error;

            // Sync to profiles table
            if (user?.email) {
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: user.id,
                    full_name: values.name,
                    designation: values.designation,
                    email: user.email,
                    updated_at: new Date().toISOString(),
                });
                if (profileError) {
                    console.error('Error syncing public profile:', profileError);
                    // We don't block the user if profile sync fails, but we log it
                }
            }

            toast.success('Profile updated successfully!');
            navigate('/', { replace: true });
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
                    {/* <CardDescription>
                        Please complete your profile to continue.
                    </CardDescription> */}
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
