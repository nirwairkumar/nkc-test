import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Ensure user is authenticated (via the reset link token)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error('Invalid or expired reset session. Please request a new password reset.');
                navigate('/login');
            }
        });
    }, [navigate]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Password updated successfully!');
            navigate('/login');
        }
        setLoading(false);
    };

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Update Password</CardTitle>
                    <CardDescription>Enter your new password below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
