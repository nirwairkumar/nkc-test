
export interface Profile {
    id: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    designation?: string;
    email?: string;
    is_creator?: boolean;
    is_verified_creator?: boolean;
    verified_role?: 'authorized_partner' | null;
    verified_at?: string;
    verified_by_admin_id?: string;
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

export interface PostCreate {
    title: string;
    content: Record<string, any> | string;
    slug?: string;
    summary?: string;
    cover_image?: string;
    category?: string;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
}

export interface PostUpdate {
    title?: string;
    content?: Record<string, any> | string;
    slug?: string;
    summary?: string;
    cover_image?: string;
    category?: string;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
    is_pinned?: boolean;
}

export interface PostFeedResponse {
    id: string;
    title: string;
    slug: string;
    summary?: string;
    cover_image?: string;
    category: string;
    tags: string[];
    published_at: string;
    view_count: number;
    like_count: number;
    is_pinned: boolean;
    author_id: string;
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string;
        is_verified_creator: boolean;
    };
}

export interface PostDetailed extends Omit<PostFeedResponse, 'profiles'> {
    content: Record<string, any> | string;
    created_at: string;
    updated_at: string;
    status: 'draft' | 'published' | 'archived';
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string;
        is_verified_creator: boolean;
        bio?: string;
    };
}
