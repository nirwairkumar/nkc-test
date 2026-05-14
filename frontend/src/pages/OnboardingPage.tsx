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
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '@/lib/usersApi';
import { UserCircle2, Loader2, Sparkles } from 'lucide-react';

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
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                        Welcome aboard
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-white">
                        Set Up Your Profile
                    </p>
                    {/* <p className="text-sm text-slate-400 mt-1">
                        Tell us a little about yourself to get started.
                    </p> */}
                </div>
            </div>

            {/* Content pulled up over the hero */}
            <div className="px-4 -mt-10 pb-10 max-w-2xl mx-auto space-y-4">

                {/* Form Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {/* Card Header */}
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4 text-indigo-500" />
                        <div>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                                Your Details
                            </p>
                            {/* <p className="text-xs text-slate-400">
                                This helps us personalise your experience.
                            </p> */}
                        </div>
                    </div>

                    {/* Form Body */}
                    <div className="p-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                Full Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Arjun Sharma"
                                                    className="h-10 text-sm"
                                                    {...field}
                                                />
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
                                            <FormLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                I am a <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 text-sm">
                                                        <SelectValue placeholder="Select your role" />
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

                                <Button
                                    type="submit"
                                    className="w-full h-10 text-sm font-semibold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                                    ) : (
                                        <><Sparkles className="mr-2 h-4 w-4" />Continue to TestoZa</>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>

                {/* Info blurb */}


            </div>
        </div>
    );
}
