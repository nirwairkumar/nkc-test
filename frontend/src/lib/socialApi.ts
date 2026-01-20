
import supabase from '@/lib/supabaseClient';
import { Profile, Follow } from '@/lib/types';

// --- Follow/Unfollow ---

export async function followUser(followerId: string, followingId: string) {
    const { error } = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });
    return { error };
}

export async function unfollowUser(followerId: string, followingId: string) {
    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
    return { error };
}

export async function isFollowing(followerId: string, followingId: string) {
    const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
    return { isFollowing: !!data, error };
}

// --- Fetch Counts ---

export async function getFollowerCount(userId: string) {
    const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
    return { count, error };
}

export async function getFollowingCount(userId: string) {
    const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
    return { count, error };
}

// --- Fetch Lists (with privacy check) ---

export async function getFollowers(userId: string) {
    const { data, error } = await supabase
        .from('follows')
        .select(`
            follower_id,
            created_at,
            follower:profiles!follows_follower_id_fkey (*)
        `)
        .eq('following_id', userId);

    // Transform data to match Follow interface with nested Profile
    const formattedData = data?.map(item => ({
        follower_id: item.follower_id,
        following_id: userId,
        created_at: item.created_at,
        follower: Array.isArray(item.follower) ? item.follower[0] : item.follower
    })) as unknown as Follow[];

    return { data: formattedData, error };
}

export async function getFollowing(userId: string) {
    // First definitions check privacy? Or handled in UI?
    // Use UI to block if private, but RLS should ideally handle it too.
    // For now, we fetch, and UI decides to show or not based on privacy setting.

    const { data, error } = await supabase
        .from('follows')
        .select(`
            following_id,
            created_at,
            following:profiles!follows_following_id_fkey (*)
        `)
        .eq('follower_id', userId);

    const formattedData = data?.map(item => ({
        follower_id: userId,
        following_id: item.following_id,
        created_at: item.created_at,
        following: Array.isArray(item.following) ? item.following[0] : item.following
    })) as unknown as Follow[];

    return { data: formattedData, error };
}

// --- Creator Mode & Privacy ---

export async function toggleCreatorMode(userId: string, isCreator: boolean) {
    const { error } = await supabase
        .from('profiles')
        .update({ is_creator: isCreator })
        .eq('id', userId);
    return { error };
}

export async function updateFollowingVisibility(userId: string, visibility: 'public' | 'private') {
    const { error } = await supabase
        .from('profiles')
        .update({ following_visibility: visibility })
        .eq('id', userId);
    return { error };
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
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            message,
            link,
            custom_test_id: metadata?.customTestId,
            sender_name: metadata?.senderName,
            sender_email: metadata?.senderEmail
        });
    return { error };
}
