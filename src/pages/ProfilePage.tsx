import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient';
import { Loader2, User, Save, Upload, Users, Eye, EyeOff } from 'lucide-react';
import { toggleCreatorMode, updateFollowingVisibility, getFollowerCount, getFollowingCount } from '@/lib/socialApi';
import { Profile } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { user, session, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [designation, setDesignation] = useState('');

    // Social State
    const [isCreator, setIsCreator] = useState(false);
    const [followingVisibility, setFollowingVisibility] = useState<'public' | 'private'>('public');
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [showCreatorDialog, setShowCreatorDialog] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setBio(user.user_metadata?.bio || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');

            if (isAdmin) {
                setDesignation('Admin');
            } else {
                setDesignation(user.user_metadata?.designation || 'Student');
            }

            // Fetch additional profile data
            fetchProfileSettings();
            fetchSocialCounts();
        }
    }, [user, isAdmin]);

    const fetchProfileSettings = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('is_creator, following_visibility')
            .eq('id', user.id)
            .single();

        if (data) {
            setIsCreator(data.is_creator || false);
            setFollowingVisibility(data.following_visibility as 'public' | 'private' || 'public');
        }
    };

    const fetchSocialCounts = async () => {
        if (!user) return;
        const { count: followers } = await getFollowerCount(user.id);
        const { count: following } = await getFollowingCount(user.id);
        setFollowerCount(followers || 0);
        setFollowingCount(following || 0);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getBadgeVariant = (role: string) => {
        switch (role) {
            case 'Admin': return 'destructive'; // Red/Destructive for Admin
            case 'Teacher': return 'default'; // Bluish
            case 'Institution': return 'warning'; // Golden (assuming warning is yellowish)
            case 'Student': return 'secondary'; // Gray
            case 'Guest': return 'outline'; // Gray outline
            default: return 'secondary';
        }
    };

    // Custom badge styling if default variants don't match user request perfectly
    const getBadgeStyle = (role: string) => {
        switch (role) {
            case 'Admin': return { backgroundColor: '#dc2626', color: 'white' }; // Red
            case 'Teacher': return { backgroundColor: '#3b82f6', color: 'white' }; // Blue
            case 'Institution': return { backgroundColor: '#eab308', color: 'black' }; // Gold
            case 'Student': return { backgroundColor: '#6b7280', color: 'white' }; // Gray
            case 'Guest': return { backgroundColor: '#9ca3af', color: 'white' }; // Lighter Gray
            default: return {};
        }
    };


    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            setAvatarUrl(publicUrl);
            toast.success('Profile picture uploaded!');

        } catch (error: any) {
            toast.error(error.message || 'Error uploading avatar');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };


    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Force Admin designation if user is admin
        const finalDesignation = isAdmin ? 'Admin' : designation;

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    bio: bio,
                    avatar_url: avatarUrl,
                    designation: finalDesignation
                }
            });

            if (error) throw error;

            // Sync with public profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    bio: bio,
                    avatar_url: avatarUrl,
                    designation: finalDesignation,
                    email: user.email,
                    is_creator: isCreator, // Persist creator status just in case
                    following_visibility: followingVisibility,
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.error("Error syncing public profile:", profileError);
                toast.error(`Public Profile Sync Failed: ${profileError.message}`);
            } else {
                // Sync with tests table (Update creator_name and creator_avatar for all tests by this user)
                const { error: testsError } = await supabase
                    .from('tests')
                    .update({
                        creator_name: fullName,
                        creator_avatar: avatarUrl
                    })
                    .eq('created_by', user.id);

                if (testsError) {
                    console.error("Error syncing tests:", testsError);
                    toast.warning("Profile updated, but failed to sync with your tests.");
                } else {
                    toast.success('Profile and Tests updated successfully!');
                }
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleEnableCreator = async () => {
        try {
            const { error } = await toggleCreatorMode(user!.id, true);
            if (error) throw error;
            setIsCreator(true);
            setShowCreatorDialog(false);
            toast.success("You are now a Creator! Redirecting to Manage Tests...");
            setTimeout(() => navigate('/my-tests'), 1500);
        } catch (error: any) {
            toast.error("Failed to enable Creator Profile: " + error.message);
        }
    };

    const handleVisibilityChange = async (checked: boolean) => {
        const newVisibility = checked ? 'public' : 'private';
        setFollowingVisibility(newVisibility);
        try {
            const { error } = await updateFollowingVisibility(user!.id, newVisibility);
            if (error) throw error;
            toast.success(`Following list is now ${newVisibility}`);
        } catch (error: any) {
            toast.error("Failed to update visibility");
            // Revert on error
            setFollowingVisibility(checked ? 'private' : 'public');
        }
    };

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-6">
            <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

            <div className="grid gap-8">
                {/* Profile Header Card */}
                <Card>
                    <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-border">
                                <AvatarImage src={avatarUrl} alt={fullName} />
                                <AvatarFallback className="text-2xl">{getInitials(fullName || user.email || 'U')}</AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="text-center sm:text-left space-y-2 flex-1">
                            <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
                                <h2 className="text-2xl font-bold">{fullName || 'User'}</h2>
                                <Badge style={getBadgeStyle(isAdmin ? 'Admin' : designation)} className="text-xs px-2 py-0.5 pointer-events-none">
                                    {isAdmin ? 'Admin' : (designation || 'Student')}
                                </Badge>
                                {isCreator && <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">Creator</Badge>}
                            </div>
                            <p className="text-muted-foreground">{user.email}</p>

                            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                                <div className="text-center sm:text-left">
                                    <p className="font-bold text-lg">{followingCount}</p>
                                    <p className="text-xs text-muted-foreground">Following</p>
                                </div>
                                {isCreator && (
                                    <div className="text-center sm:text-left">
                                        <p className="font-bold text-lg">{followerCount}</p>
                                        <p className="text-xs text-muted-foreground">Followers</p>
                                    </div>
                                )}
                            </div>

                            {bio && (
                                <p className="text-sm text-slate-600 mt-2 max-w-sm whitespace-pre-wrap">
                                    {bio}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Creator Mode & Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!isCreator ? (
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div>
                                    <h3 className="font-semibold">Enable Creator Profile</h3>
                                    <p className="text-sm text-muted-foreground">Unlock followers and publish public tests.</p>
                                </div>
                                <Dialog open={showCreatorDialog} onOpenChange={setShowCreatorDialog}>
                                    <DialogTrigger asChild>
                                        <Button>Enable Creator Profile</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Become a Creator?</DialogTitle>
                                            <DialogDescription>
                                                By enabling Creator Profile, your profile will become public. Users can follow you, and your followers will be notified when you publish new tests.
                                                <br /><br />
                                                Your followers count and follow button will be visible on your public profile.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowCreatorDialog(false)}>Cancel</Button>
                                            <Button onClick={handleEnableCreator}>Confirm & Enable</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-green-800">Creator Profile Active</h3>
                                        <p className="text-sm text-green-600">You can manage your tests and grow your audience.</p>
                                    </div>
                                </div>
                                <Button variant="outline" className="bg-white text-green-700 border-green-200 hover:bg-green-50" onClick={() => navigate('/my-tests')}>
                                    Your Tests
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Following Visibility</Label>
                                <p className="text-sm text-muted-foreground">
                                    {followingVisibility === 'public'
                                        ? 'Everyone can see who you follow.'
                                        : 'Only you can see who you follow.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground mr-2">{followingVisibility === 'public' ? 'Public' : 'Private'}</span>
                                <Switch
                                    checked={followingVisibility === 'public'}
                                    onCheckedChange={handleVisibilityChange}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Profile Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Profile</CardTitle>
                        <CardDescription>Update your personal information and bio.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            {/* Profile Picture Upload */}
                            <div className="space-y-2">
                                <Label htmlFor="avatar">Profile Picture</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        id="avatar"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                        className="cursor-pointer"
                                    />
                                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="designation">Designation</Label>
                                {isAdmin ? (
                                    <Input
                                        value="Admin"
                                        disabled
                                        className="bg-slate-100 text-slate-500 cursor-not-allowed font-medium"
                                        title="Admin designation is managed by the system."
                                    />
                                ) : (
                                    <Select value={designation} onValueChange={setDesignation}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select designation" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Student">Student</SelectItem>
                                            <SelectItem value="Teacher">Teacher</SelectItem>
                                            <SelectItem value="Institution">Institution</SelectItem>
                                            <SelectItem value="Guest">Guest</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                                {isAdmin && <p className="text-xs text-muted-foreground">Admin status is linked to your email.</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio / Description</Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us a little about yourself..."
                                    className="min-h-[100px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be visible on your profile.
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={loading || uploading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfilePage;
