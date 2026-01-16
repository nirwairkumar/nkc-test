
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { followUser, unfollowUser, isFollowing } from '@/lib/socialApi';
import { toast } from 'sonner';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

interface FollowButtonProps {
    targetUserId: string;
    onFollowChange?: (isFollowing: boolean) => void;
    className?: string;
}

export function FollowButton({ targetUserId, onFollowChange, className }: FollowButtonProps) {
    const { user } = useAuth();
    const [following, setFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (user && targetUserId) {
            checkStatus();
        } else {
            setLoading(false);
        }
    }, [user, targetUserId]);

    const checkStatus = async () => {
        if (!user) return;
        setLoading(true);
        const { isFollowing: status } = await isFollowing(user.id, targetUserId);
        setFollowing(status);
        setLoading(false);
    };

    const handleToggleFollow = async () => {
        if (!user) {
            toast.error("Please sign in to follow creators.");
            return;
        }

        setActionLoading(true);
        try {
            if (following) {
                // Unfollow
                const { error } = await unfollowUser(user.id, targetUserId);
                if (error) throw error;
                setFollowing(false);
                toast.success("Unfollowed");
                if (onFollowChange) onFollowChange(false);
            } else {
                // Follow
                const { error } = await followUser(user.id, targetUserId);
                if (error) throw error;
                setFollowing(true);
                toast.success("Following!");
                if (onFollowChange) onFollowChange(true);
            }
        } catch (error: any) {
            toast.error("Action failed: " + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (!user || user.id === targetUserId) return null;

    if (loading) {
        return (
            <Button variant="outline" size="sm" disabled className={className}>
                <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
        );
    }

    return (
        <Button
            variant={following ? "secondary" : "default"}
            size="sm"
            onClick={handleToggleFollow}
            disabled={actionLoading}
            className={`${className} ${following ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : ''}`}
        >
            {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : following ? (
                <UserCheck className="w-4 h-4 mr-2" />
            ) : (
                <UserPlus className="w-4 h-4 mr-2" />
            )}
            {following ? 'Following' : 'Follow'}
        </Button>
    );
}
