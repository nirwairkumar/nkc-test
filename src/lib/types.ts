
export interface Profile {
    id: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    designation?: string;
    email?: string;
    is_creator?: boolean;
    following_visibility?: 'public' | 'private';
    created_at?: string;
    updated_at?: string;
}

export interface Follow {
    follower_id: string;
    following_id: string;
    created_at: string;
    // Optional: expanded profile data for UI
    follower?: Profile;
    following?: Profile;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}
