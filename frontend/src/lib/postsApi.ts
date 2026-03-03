import apiClient from './apiClient';
import { PostCreate, PostUpdate, PostFeedResponse, PostDetailed } from './types';
import { supabase } from './supabaseClient';

export const postsApi = {
    // Feed & Exploration
    getFeed: async (page: number = 1, limit: number = 12, category?: string, search?: string, tag?: string) => {
        let url = `/posts/feed?page=${page}&limit=${limit}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (tag) url += `&tag=${encodeURIComponent(tag)}`;

        const response = await apiClient.get<PostFeedResponse[]>(url);
        return response.data;
    },

    getPostBySlug: async (slug: string) => {
        const response = await apiClient.get<PostDetailed>(`/posts/${encodeURIComponent(slug)}`);
        return response.data;
    },

    // Creator Dashboard
    getMyPosts: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const response = await apiClient.get<PostDetailed[]>(`/posts/my?user_id=${user.id}`);
        return response.data;
    },

    // CRUD
    createPost: async (data: PostCreate) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const response = await apiClient.post<PostDetailed>(`/posts?user_id=${user.id}`, data);
        return response.data;
    },

    updatePost: async (id: string, data: PostUpdate) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const response = await apiClient.put<PostDetailed>(`/posts/${id}?user_id=${user.id}`, data);
        return response.data;
    },

    deletePost: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const response = await apiClient.delete(`/posts/${id}?user_id=${user.id}`);
        return response.data;
    },

    // Images
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        formData.append('user_id', user.id);

        const response = await apiClient.post<{ url: string }>('/posts/upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.url;
    },

    // Engagement
    toggleLike: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const response = await apiClient.post<{ liked: boolean, likeCount: number }>(`/posts/${id}/like?user_id=${user.id}`);
        return response.data;
    },

    checkLiked: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { liked: false };
        const response = await apiClient.get<{ liked: boolean }>(`/posts/${id}/liked?user_id=${user.id}`);
        return response.data;
    }
};
