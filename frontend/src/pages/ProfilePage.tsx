import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import {
    Loader2, Save, Upload, Users, Eye, EyeOff, Camera,
    Pencil, ChevronRight, Star, Shield
} from 'lucide-react';
import { toggleCreatorMode, updateFollowingVisibility, getFollowerCount, getFollowingCount } from '@/lib/socialApi';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';

const ProfilePage = () => {
    const { user, session, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [designation, setDesignation] = useState('');
    const [isCreator, setIsCreator] = useState(false);
    const [isVerifiedCreator, setIsVerifiedCreator] = useState(false);
    const [followingVisibility, setFollowingVisibility] = useState<'public' | 'private'>('public');
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [showCreatorDialog, setShowCreatorDialog] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setBio(user.user_metadata?.bio || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
            setDesignation(isAdmin ? 'Admin' : (user.user_metadata?.designation || 'Other'));
            fetchProfileSettings();
            fetchSocialCounts();
        }
    }, [user, isAdmin]);

    const fetchProfileSettings = async () => {
        if (!user) return;
        const { fetchUserDetails } = await import('@/lib/usersApi');
        const { data } = await fetchUserDetails(user.id);
        if (data) {
            if (data.full_name) setFullName(data.full_name);
            if (data.bio) setBio(data.bio);
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
            if (data.designation && !isAdmin) setDesignation(data.designation);
            setIsCreator(data.is_creator || false);
            setIsVerifiedCreator(data.is_verified_creator || false);
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

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const designationColor: Record<string, string> = {
        Admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
        Teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
        Institution: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400',
        Other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        Student: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        Guest: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };

    const designationLabel: Record<string, string> = {
        Admin: 'Admin',
        Teacher: 'Teacher / Educator',
        Institution: 'School / Coaching Institution',
        Other: 'Student / Independent Creator',
        Student: 'Student / Independent Creator',
        Guest: 'Guest',
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!e.target.files?.length) return;
            const file = e.target.files[0];
            const { uploadAvatar } = await import('@/lib/usersApi');
            const { publicUrl, error } = await uploadAvatar(user!.id, file);
            if (error) throw error;
            if (!publicUrl) throw new Error('Failed to get public URL');
            setAvatarUrl(publicUrl);
            toast.success('Profile picture updated!');
        } catch (error: any) {
            toast.error(error.message || 'Error uploading avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const finalDesignation = isAdmin ? 'Admin' : (designation || 'Other');
        try {
            // 1. Direct Supabase Auth client metadata sync
            try {
                await supabase.auth.updateUser({
                    data: {
                        full_name: fullName,
                        bio: bio,
                        avatar_url: avatarUrl,
                        designation: finalDesignation
                    }
                });
            } catch (sbErr) {
                console.warn('[ProfilePage] Direct Supabase updateUser error:', sbErr);
            }

            // 2. Non-blocking backend metadata sync
            try {
                const { authApi } = await import('@/lib/authApi');
                await authApi.updateMetadata({ full_name: fullName, bio, avatar_url: avatarUrl, designation: finalDesignation });
            } catch (apiErr) {
                console.warn('[ProfilePage] Backend authApi updateMetadata error (non-critical):', apiErr);
            }

            // 3. Update public profiles table
            const { updateProfile } = await import('@/lib/usersApi');
            const { error: apiError } = await updateProfile(user!.id, {
                full_name: fullName,
                bio,
                avatar_url: avatarUrl,
                designation: finalDesignation,
                email: user!.email,
                is_creator: isCreator,
                following_visibility: followingVisibility
            });

            if (apiError) throw apiError;

            localStorage.setItem('user_designation', finalDesignation);
            toast.success('Profile updated successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || error.message || 'Failed to update profile');
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
            toast.success("Creator mode enabled! Redirecting...");
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
        } catch {
            toast.error("Failed to update visibility");
            setFollowingVisibility(checked ? 'private' : 'public');
        }
    };

    if (!user) return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    );

    const role = isAdmin ? 'Admin' : designation;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Your Account</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">Profile</p>
                </div>
            </div>

            <div className="px-4 -mt-10 pb-8 max-w-2xl mx-auto space-y-4">

                {/* Avatar + Name Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-start gap-4">
                        {/* Avatar with upload */}
                        <label className="relative cursor-pointer group flex-shrink-0">
                            <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-800 shadow-md">
                                <AvatarImage src={avatarUrl} alt={fullName} />
                                <AvatarFallback className="text-base font-bold bg-indigo-100 text-indigo-700">
                                    {getInitials(fullName || user.email || 'U')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                            </div>
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                        </label>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {isVerifiedCreator && <VerifiedBadge size={16} />}
                                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                                    {fullName || 'Your Name'}
                                </p>
                            </div>
                            {isVerifiedCreator ? (
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">TestoZa Authorized Partner</p>
                            ) : (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${designationColor[role] || designationColor.Other}`}>
                                        {designationLabel[role] || role}
                                    </span>
                                    {isCreator && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                            Creator
                                        </span>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-3">
                                <div>
                                    <p className="text-sm font-black text-slate-800 dark:text-white leading-none">{followingCount}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Following</p>
                                </div>
                                {isCreator && (
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white leading-none">{followerCount}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">Followers</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {bio && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                            {bio}
                        </p>
                    )}
                </div>

                {/* Creator Status Card */}
                {!isCreator ? (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Star className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Become a Creator</p>
                                <p className="text-[11px] text-indigo-200">Publish tests & grow your audience</p>
                            </div>
                        </div>
                        <Dialog open={showCreatorDialog} onOpenChange={setShowCreatorDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold px-3 flex-shrink-0">
                                    Enable
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Become a Creator?</DialogTitle>
                                    <DialogDescription>
                                        Your profile will become public. Users can follow you and get notified when you publish new tests.
                                        Your follower count and follow button will be visible on your public profile.
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
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Creator Profile Active</p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Manage tests & grow your audience</p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate('/my-tests')}
                            className="bg-white dark:bg-transparent text-emerald-700 border-emerald-300 text-xs font-bold px-3 flex-shrink-0">
                            My Tests
                        </Button>
                    </div>
                )}

                {/* Following Visibility */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                {followingVisibility === 'public' ? <Eye className="h-4 w-4 text-slate-600" /> : <EyeOff className="h-4 w-4 text-slate-600" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Following Visibility</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {followingVisibility === 'public' ? 'Everyone can see who you follow' : 'Only you can see who you follow'}
                                </p>
                            </div>
                        </div>
                        <Switch checked={followingVisibility === 'public'} onCheckedChange={handleVisibilityChange} />
                    </div>
                </div>

                {/* Edit Profile Form */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-indigo-500" />
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">Edit Profile</p>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="p-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</Label>
                            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. John Doe"
                                className="h-10 text-sm" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Designation</Label>
                            {isAdmin ? (
                                <Input value="Admin" disabled className="h-10 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
                            ) : (
                                <Select value={designation || 'Other'} onValueChange={setDesignation}>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Teacher">Teacher / Educator</SelectItem>
                                        <SelectItem value="Institution">School / Coaching Institution</SelectItem>
                                        <SelectItem value="Other">Student / Independent Creator</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bio</Label>
                            <Textarea value={bio} onChange={e => setBio(e.target.value)}
                                placeholder="Tell us a little about yourself..."
                                className="text-sm min-h-[90px] resize-none" />
                            <p className="text-[10px] text-slate-400">Visible on your public profile.</p>
                        </div>

                        <Button type="submit" disabled={loading || uploading} className="w-full h-10 text-sm font-semibold">
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" />Save Changes</>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
