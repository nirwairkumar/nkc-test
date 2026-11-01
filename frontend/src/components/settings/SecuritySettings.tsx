import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CARD, PRIMARY_BTN } from '@/components/dashboard/dashboardUi';

/** Settings → Password & security. */
export default function SecuritySettings() {
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
        if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }

        setLoading(true);
        try {
            const { updatePassword } = await import('@/lib/usersApi');
            const { error } = await updatePassword(newPassword, currentPassword);
            if (error) throw error;
            toast.success("Password updated successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error("Failed to update password: " + ((error as { message?: string })?.message || 'please try again'));
        } finally {
            setLoading(false);
        }
    };

    const label = 'text-[13px] font-semibold text-slate-700';
    return (
        <section className={`${CARD} overflow-hidden`} aria-labelledby="settings-password">
            <div className="border-b border-slate-100 px-5 py-4">
                <h3 id="settings-password" className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Change password</h3>
                <p className="text-[12.5px] text-slate-500">Keep your account safe with a strong password.</p>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4 p-5">
                {/* M5: re-authentication — a stolen access token alone must not
                    be enough to change the password and lock the owner out. */}
                <div className="space-y-1.5">
                    <Label className={label} htmlFor="current-password">Current password</Label>
                    <Input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                        className="h-11 rounded-xl text-[14px]"
                    />
                    <p className="text-[12px] text-slate-500">
                        Forgot it? <a href="/login" className="font-semibold text-sky-700 hover:underline">Reset your password by email</a> instead.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label className={label} htmlFor="new-password">New password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            className="h-11 rounded-xl text-[14px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className={label} htmlFor="confirm-password">Confirm new password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Type it again"
                            required
                            className="h-11 rounded-xl text-[14px]"
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading} className={`${PRIMARY_BTN} h-11 w-full sm:w-auto sm:px-6`}>
                    {loading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
                        : <><ShieldCheck className="h-4 w-4" /> Update password</>}
                </button>
            </form>
        </section>
    );
}
