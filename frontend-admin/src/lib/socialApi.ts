import apiClient from '@/lib/apiClient';
import { Profile, Follow } from '@/lib/types';

// --- Follow/Unfollow ---

export async function followUser(followerId: string, followingId: string) {
    try {
        await apiClient.post('social/follows/follow', { follower_id: followerId, following_id: followingId });
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

export async function unfollowUser(followerId: string, followingId: string) {
    try {
        await apiClient.post('social/follows/unfollow', { follower_id: followerId, following_id: followingId });
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

export async function isFollowing(followerId: string, followingId: string) {
    try {
        const response = await apiClient.get('social/follows/check', {
            params: { follower_id: followerId, following_id: followingId }
        });
        return { isFollowing: response.data?.isFollowing, error: null };
    } catch (error: any) {
        return { isFollowing: false, error };
    }
}

// --- Fetch Counts ---

export async function getFollowerCount(userId: string) {
    try {
        const response = await apiClient.get(`social/follows/stats/${userId}`);
        return { count: response.data.followers_count, error: null };
    } catch (error: any) {
        return { count: 0, error };
    }
}

export async function getFollowingCount(userId: string) {
    try {
        const response = await apiClient.get(`social/follows/stats/${userId}`);
        return { count: response.data.following_count, error: null };
    } catch (error: any) {
        return { count: 0, error };
    }
}

// --- Fetch Lists (with privacy check) ---

export async function getFollowers(userId: string) {
    try {
        const response = await apiClient.get(`social/follows/followers/${userId}`);
        const data = response.data;

        // Transform data to match Follow interface with nested Profile
        const formattedData = data?.map((item: any) => ({
            follower_id: item.follower_id,
            following_id: userId,
            created_at: item.created_at,
            follower: Array.isArray(item.follower) ? item.follower[0] : item.follower
        })) as unknown as Follow[];

        return { data: formattedData, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function getFollowing(userId: string) {
    try {
        const response = await apiClient.get(`social/follows/following/${userId}`);
        const data = response.data;

        const formattedData = data?.map((item: any) => ({
            follower_id: userId,
            following_id: item.following_id,
            created_at: item.created_at,
            following: Array.isArray(item.following) ? item.following[0] : item.following
        })) as unknown as Follow[];

        return { data: formattedData, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

// --- Creator Mode & Privacy ---

export async function toggleCreatorMode(userId: string, isCreator: boolean) {
    try {
        const { updateProfile } = await import('@/lib/usersApi');
        const { error } = await updateProfile(userId, { is_creator: isCreator });
        return { error };
    } catch (error: any) {
        return { error };
    }
}

export async function updateFollowingVisibility(userId: string, visibility: 'public' | 'private') {
    try {
        const { updateProfile } = await import('@/lib/usersApi');
        const { error } = await updateProfile(userId, { following_visibility: visibility });
        return { error };
    } catch (error: any) {
        return { error };
    }
}


// --- Notifications ---
// Basic stub for now, more logic needed when creating test
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    link?: string,
    metadata?: {
        customTestId?: string;
        senderName?: string;
        senderEmail?: string;
    }
) {
    try {
        await apiClient.post('social/notifications/create', {
            user_id: userId,
            title,
            message,
            link,
            custom_test_id: metadata?.customTestId,
            sender_name: metadata?.senderName,
            sender_email: metadata?.senderEmail
        });
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}
