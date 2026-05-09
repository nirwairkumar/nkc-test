import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Crown, Key, Lock, Loader2, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

export default function SettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isPremium, loading: premiumLoading } = usePremiumStatus();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'security' | 'billing'>('security');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
        if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }

        setLoading(true);
        try {
            const { updatePassword } = await import('@/lib/usersApi');
            const { error } = await updatePassword(newPassword);
            if (error) throw error;
            toast.success("Password updated successfully!");
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error("Failed to update password: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Account</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">Settings</p>
                </div>
            </div>

            <div className="px-4 -mt-10 pb-8 max-w-2xl mx-auto space-y-4">

                {/* Tab Selector */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-1 flex gap-1">
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'security'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Key className="h-3.5 w-3.5" /> Security
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === 'billing'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Crown className="h-3.5 w-3.5" /> Subscription
                    </button>
                </div>

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-indigo-500" />
                            <div>
                                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">Change Password</p>
                                <p className="text-xs text-slate-400 mt-0.5">Keep your account secure with a strong password.</p>
                            </div>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-4 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="new-password">
                                    New Password
                                </Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    className="h-10 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="confirm-password">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    className="h-10 text-sm"
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full h-10 text-sm font-semibold">
                                {loading
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                                    : <><ShieldCheck className="mr-2 h-4 w-4" />Update Password</>
                                }
                            </Button>
                        </form>
                    </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                    <div className="space-y-3">
                        {premiumLoading ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : isPremium ? (
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Crown className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">Pro Subscription Active</p>
                                        <p className="text-[11px] text-emerald-100">Full access to all premium features</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate('/pricing')}
                                    className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold text-sm h-10"
                                >
                                    Manage / Extend Plan <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-slate-800 to-indigo-900 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Sparkles className="h-5 w-5 text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">No Active Subscription</p>
                                        <p className="text-[11px] text-slate-400">Unlock analytics, custom branding & more</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate('/pricing')}
                                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm h-10"
                                >
                                    View Plans <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Billing support note */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 px-4 py-3">
                            <p className="text-[11px] text-slate-400 text-center">
                                For billing support or refunds, contact{' '}
                                <a href="mailto:support@testoza.com" className="text-indigo-500 font-semibold hover:underline">
                                    support@testoza.com
                                </a>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
