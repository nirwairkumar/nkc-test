import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { signUpWithEmail, signInWithEmail, resetPasswordForEmail, signInWithGoogle } from '@/hooks/useAuthActions';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { toast } from 'sonner';
import { Lock, Mail, User, Loader2, Sparkles, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { updateProfile } from '@/lib/usersApi';

const authFormSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().optional(),
    name: z.string().optional(),
    designation: z.enum(["Teacher", "Institution", "Other"]).optional(),
});

export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, authModalView, setAuthModalView, redirectPath, onSuccessCallback } = useAuthModal();
    const { user, profile, refreshSession } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Onboarding sub-state when user signs up / logs in without designation
    const [onboardingName, setOnboardingName] = useState('');
    const [onboardingDesignation, setOnboardingDesignation] = useState<'Teacher' | 'Institution' | 'Other' | undefined>(undefined);
    const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);

    const form = useForm<z.infer<typeof authFormSchema>>({
        resolver: zodResolver(authFormSchema),
        defaultValues: {
            email: '',
            password: '',
            name: '',
            designation: undefined,
        },
    });

    useEffect(() => {
        if (isAuthModalOpen) {
            form.reset();
            setIsLoading(false);
        }
    }, [isAuthModalOpen, authModalView, form]);

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        try {
            const currentPath = redirectPath || window.location.pathname + window.location.search;
            if (currentPath && currentPath !== '/login' && currentPath !== '/onboarding') {
                localStorage.setItem('auth_redirect_intent', currentPath);
            }

            const { error } = await signInWithGoogle();
            if (error) {
                if (!error.message?.includes('closed')) {
                    toast.error(error.message || 'Google authentication failed');
                }
                setIsLoading(false);
                return;
            }

            // Successfully authenticated in popup! Refresh session state in-place
            await refreshSession();

            // Check if user has designation or needs onboarding
            const localDesignation = localStorage.getItem('user_designation');
            const { fetchUserDetails } = await import('@/lib/usersApi');
            const { supabase } = await import('@/integrations/supabase/client');
            const sessionData = await supabase.auth.getSession();
            const authedUser = sessionData.data?.session?.user;

            let hasDesignation = authedUser?.user_metadata?.designation || localDesignation;
            if (!hasDesignation && authedUser?.id) {
                const profileRes = await fetchUserDetails(authedUser.id);
                hasDesignation = profileRes.data?.designation;
            }

            if (!hasDesignation) {
                setOnboardingName(authedUser?.user_metadata?.full_name || authedUser?.email?.split('@')[0] || '');
                setAuthModalView('onboarding');
                setIsLoading(false);
                return;
            }

            toast.success('Successfully signed in with Google!');
            closeAuthModal();
            if (onSuccessCallback) onSuccessCallback();
        } catch (error: any) {
            toast.error(error.message || 'Google authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSubmit = async (values: z.infer<typeof authFormSchema>) => {
        setIsLoading(true);

        try {
            if (authModalView === 'login') {
                if (!values.password) {
                    toast.error("Password is required");
                    setIsLoading(false);
                    return;
                }

                const response = await signInWithEmail(values.email, values.password);
                if (response.error) {
                    toast.error(response.error.message || 'Login failed');
                    setIsLoading(false);
                    return;
                }

                await refreshSession();

                // Check if user has designation
                const localDesignation = localStorage.getItem('user_designation');
                const hasDesignation = response.data?.user?.user_metadata?.designation || localDesignation;

                if (!hasDesignation) {
                    // Switch to inline onboarding view
                    setOnboardingName(response.data?.user?.user_metadata?.full_name || values.email.split('@')[0]);
                    setAuthModalView('onboarding');
                    setIsLoading(false);
                    return;
                }

                toast.success('Successfully signed in!');
                closeAuthModal();
                if (onSuccessCallback) onSuccessCallback();

            } else if (authModalView === 'signup') {
                if (!values.name || !values.password) {
                    toast.error("Name and password are required");
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
                    if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
                        toast.error('Account already exists. Please sign in.');
                        setAuthModalView('login');
                    } else {
                        throw error;
                    }
                    setIsLoading(false);
                    return;
                }

                // Automatic sign-in after signup
                try {
                    const response = await signInWithEmail(values.email, values.password);
                    if (response.error) throw response.error;

                    localStorage.setItem('user_designation', values.designation);
                    await refreshSession();

                    toast.success('Account created and signed in!');
                    closeAuthModal();
                    if (onSuccessCallback) onSuccessCallback();
                } catch (loginErr: any) {
                    toast.success('Account created successfully! Please sign in.');
                    setAuthModalView('login');
                }

            } else if (authModalView === 'forgot') {
                const { error } = await resetPasswordForEmail(values.email);
                if (error) throw error;
                toast.success('Password reset link sent to your email.');
                setAuthModalView('login');
            }
        } catch (error: any) {
            toast.error(error.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOnboardingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onboardingName.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (!onboardingDesignation) {
            toast.error('Please select your role');
            return;
        }

        setIsOnboardingSaving(true);
        try {
            if (user) {
                // 1. Try auth metadata
                try {
                    const { authApi } = await import('@/lib/authApi');
                    await authApi.updateMetadata({
                        full_name: onboardingName,
                        designation: onboardingDesignation
                    });
                } catch (e) { }

                // 2. Profile update
                const isCreatorDefault = onboardingDesignation === 'Teacher' || onboardingDesignation === 'Institution' || onboardingDesignation === 'Other';
                await updateProfile(user.id, {
                    full_name: onboardingName,
                    designation: onboardingDesignation,
                    is_creator: isCreatorDefault as any
                });

                localStorage.setItem('user_designation', onboardingDesignation);
                await refreshSession();
            }

            toast.success('Profile setup complete!');
            closeAuthModal();
            if (onSuccessCallback) onSuccessCallback();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save profile');
        } finally {
            setIsOnboardingSaving(false);
        }
    };

    return (
        <Dialog open={isAuthModalOpen} onOpenChange={(open) => { if (!open) closeAuthModal(); }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl bg-white dark:bg-slate-900">
                {/* Header Banner */}
                <div className="p-6 pb-4 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border-b border-slate-100 dark:border-slate-800">
                    <DialogHeader className="text-center sm:text-center space-y-1.5">
                        <div className="mx-auto w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center mb-1 text-indigo-600 dark:text-indigo-400">
                            {authModalView === 'onboarding' ? (
                                <Sparkles className="w-5 h-5" />
                            ) : (
                                <Lock className="w-5 h-5" />
                            )}
                        </div>
                        <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {authModalView === 'login' && 'Sign in to TestoZa'}
                            {authModalView === 'signup' && 'Create Your Account'}
                            {authModalView === 'forgot' && 'Reset Your Password'}
                            {authModalView === 'onboarding' && 'Complete Your Profile'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            {authModalView === 'login' && 'Access your tests, results, analytics, and creator dashboard.'}
                            {authModalView === 'signup' && 'Join thousands of educators and students creating assessments.'}
                            {authModalView === 'forgot' && 'Enter your registered email to receive a recovery link.'}
                            {authModalView === 'onboarding' && 'Tell us your role so we can personalize your experience.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* View Switcher Tabs (Login / Signup) */}
                    {authModalView !== 'onboarding' && authModalView !== 'forgot' && (
                        <div className="grid grid-cols-2 p-1 mt-4 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400">
                            <button
                                type="button"
                                className={`py-1.5 rounded-lg transition-all ${authModalView === 'login' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
                                onClick={() => setAuthModalView('login')}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                className={`py-1.5 rounded-lg transition-all ${authModalView === 'signup' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'hover:text-slate-900 dark:hover:text-white'}`}
                                onClick={() => setAuthModalView('signup')}
                            >
                                Create Account
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-4 space-y-4">
                    {/* ════════════════════════════════════════════════════════ */}
                    {/* INLINE ONBOARDING VIEW                                   */}
                    {/* ════════════════════════════════════════════════════════ */}
                    {authModalView === 'onboarding' ? (
                        <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Your Full Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={onboardingName}
                                    onChange={(e) => setOnboardingName(e.target.value)}
                                    placeholder="e.g. Alex Johnson"
                                    required
                                    className="h-10 text-xs rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    I am a <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={onboardingDesignation}
                                    onValueChange={(val: any) => setOnboardingDesignation(val)}
                                >
                                    <SelectTrigger className="h-10 text-xs rounded-xl">
                                        <SelectValue placeholder="Select your role..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Teacher">Teacher / Educator</SelectItem>
                                        <SelectItem value="Institution">School / Coaching Institution</SelectItem>
                                        <SelectItem value="Other">Student / Independent Creator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="submit"
                                disabled={isOnboardingSaving}
                                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                            >
                                {isOnboardingSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Profile...
                                    </>
                                ) : (
                                    <>
                                        Finish & Continue <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <>
                            {/* 1-Click Google Sign In (for login/signup views) */}
                            {authModalView !== 'forgot' && (
                                <div className="space-y-3">
                                    <GoogleSignInButton
                                        onClick={handleGoogleAuth}
                                        isLoading={isLoading}
                                        text={authModalView === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                                    />
                                    <div className="relative flex py-1 items-center">
                                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                                        <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Or with email</span>
                                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                                    </div>
                                </div>
                            )}

                            {/* Email / Password Form */}
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-3.5">
                                    {authModalView === 'signup' && (
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-xs font-semibold">Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Your full name" {...field} className="h-10 text-xs rounded-xl" />
                                                    </FormControl>
                                                    <FormMessage className="text-[11px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-semibold">Email Address</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="name@example.com" {...field} className="h-10 text-xs rounded-xl" />
                                                </FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )}
                                    />

                                    {authModalView !== 'forgot' && (
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="text-xs font-semibold">Password</FormLabel>
                                                        {authModalView === 'login' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAuthModalView('forgot')}
                                                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                                            >
                                                                Forgot password?
                                                            </button>
                                                        )}
                                                    </div>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" {...field} className="h-10 text-xs rounded-xl" />
                                                    </FormControl>
                                                    <FormMessage className="text-[11px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {authModalView === 'signup' && (
                                        <FormField
                                            control={form.control}
                                            name="designation"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-xs font-semibold">I am a</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 text-xs rounded-xl">
                                                                <SelectValue placeholder="Select your role" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Teacher">Teacher / Educator</SelectItem>
                                                            <SelectItem value="Institution">School / Coaching Institution</SelectItem>
                                                            <SelectItem value="Other">Student / Creator</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-[11px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}


                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                            </>
                                        ) : authModalView === 'login' ? (
                                            'Sign In'
                                        ) : authModalView === 'signup' ? (
                                            'Create Free Account'
                                        ) : (
                                            'Send Recovery Link'
                                        )}
                                    </Button>
                                </form>
                            </Form>

                            {/* Back to Login link when in Forgot Password view */}
                            {authModalView === 'forgot' && (
                                <div className="text-center pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setAuthModalView('login')}
                                        className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                                    >
                                        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Sign In
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
