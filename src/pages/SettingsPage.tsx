import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';
import { Crown, Key, UserIcon, Loader2 } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

export default function SettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isPremium, loading: premiumLoading } = usePremiumStatus();
    const [loading, setLoading] = useState(false);

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

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
        <div className="container max-w-4xl py-10">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>

            <Tabs defaultValue="account" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="account" className="flex items-center gap-2">
                        <Key className="w-4 h-4" /> Security
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2">
                        <Crown className="w-4 h-4" /> Subscription
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>

                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pro Subscription</CardTitle>
                            <CardDescription>
                                Manage your subscription plan and billing details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {premiumLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : isPremium ? (
                                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Crown className="w-5 h-5" />
                                        Active Pro Subscription
                                    </h3>
                                    <p className="text-sm mt-1 mb-3">You have access to all premium features.</p>
                                    <Button onClick={() => navigate('/pricing')} variant="outline" className="border-green-600 text-green-700 hover:bg-green-100">
                                        Manage / Extend Plan
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-md">
                                    <h3 className="font-semibold text-slate-800">No Active Subscription</h3>
                                    <p className="text-sm text-slate-600 mt-1 mb-3">Upgrade to Pro to unlock advanced features like custom branding, analytics, and more.</p>
                                    <Button onClick={() => navigate('/pricing')}>
                                        View Plans
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t px-6 py-4">
                            <p className="text-xs text-muted-foreground">
                                For billing support or refunds, please contact <a href="mailto:support@testoza.com" className="underline text-primary">support@testoza.com</a>.
                            </p>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
