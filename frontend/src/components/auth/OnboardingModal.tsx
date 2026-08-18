import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { updateProfile } from '@/lib/usersApi';
import { toast } from 'sonner';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

export default function OnboardingModal() {
    const { isOnboardingModalOpen, closeOnboardingModal } = useAuthModal();
    const { user, refreshSession } = useAuth();
    const [name, setName] = useState('');
    const [designation, setDesignation] = useState<'Teacher' | 'Institution' | 'Other' | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        }
    }, [user, isOnboardingModalOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter your full name');
            return;
        }
        if (!designation) {
            toast.error('Please select your role');
            return;
        }

        setIsSaving(true);
        try {
            if (user) {
                // 1. Try to update auth metadata
                try {
                    const { authApi } = await import('@/lib/authApi');
                    await authApi.updateMetadata({
                        full_name: name,
                        designation: designation
                    });
                } catch (e) { }

                // 2. Update profile table
                const isCreatorDefault = designation === 'Teacher' || designation === 'Institution' || designation === 'Other';
                await updateProfile(user.id, {
                    full_name: name,
                    designation: designation,
                    is_creator: isCreatorDefault as any
                });

                localStorage.setItem('user_designation', designation);
                await refreshSession();
            }

            toast.success('Welcome to TestoZa! Profile setup complete.');
            closeOnboardingModal();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOnboardingModalOpen} onOpenChange={(open) => { if (!open) closeOnboardingModal(); }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl bg-white dark:bg-slate-900">
                <div className="p-6 pb-4 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border-b border-slate-100 dark:border-slate-800">
                    <DialogHeader className="text-center sm:text-center space-y-1.5">
                        <div className="mx-auto w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center mb-1 text-indigo-600 dark:text-indigo-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Welcome to TestoZa
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Tell us a little bit about yourself to complete your account setup.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Your Full Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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
                            value={designation}
                            onValueChange={(val: any) => setDesignation(val)}
                        >
                            <SelectTrigger className="h-10 text-xs rounded-xl">
                                <SelectValue placeholder="Select your role..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Teacher">Teacher / Educator</SelectItem>
                                <SelectItem value="Institution">School / Coaching Institution</SelectItem>
                                <SelectItem value="Other">Student / Creator</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Profile...
                            </>
                        ) : (
                            <>
                                Continue to TestoZa <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
