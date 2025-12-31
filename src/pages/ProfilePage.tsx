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
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient';
import { Loader2, User, Save, Upload } from 'lucide-react';

const ProfilePage = () => {
    const { user, session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [designation, setDesignation] = useState('');

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setBio(user.user_metadata?.bio || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
            setDesignation(user.user_metadata?.designation || 'Student');
        }
    }, [user]);

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

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    bio: bio,
                    avatar_url: avatarUrl,
                    designation: designation
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
                    designation: designation,
                    email: user.email,
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

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-10">
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
                            {/* Hover Overlay for upload info not needed if we have a dedicated input below, but nicer UX could be here.
                                Keeping it simple as requested for now with a section below. */}
                        </div>

                        <div className="text-center sm:text-left space-y-2">
                            <h2 className="text-2xl font-bold">{fullName || 'User'}</h2>
                            <Badge style={getBadgeStyle(designation)} className="text-xs px-2 py-0.5 pointer-events-none">
                                {designation || 'Student'}
                            </Badge>
                            <p className="text-muted-foreground">{user.email}</p>
                            {bio && (
                                <p className="text-sm text-slate-600 mt-2 max-w-sm whitespace-pre-wrap">
                                    {bio}
                                </p>
                            )}
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
