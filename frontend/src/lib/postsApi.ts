import apiClient from './apiClient';
import { PostCreate, PostUpdate, PostFeedResponse, PostDetailed } from './types';

// Helper to get user ID from token (minimal Decode)
const getUserIdFromToken = () => {
    const token = localStorage.getItem('testoza_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub; // Supabase uses 'sub' for user ID
    } catch {
        return null;
    }
};

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

    getPostById: async (id: string) => {
        const response = await apiClient.get<PostDetailed>(`/posts/id/${encodeURIComponent(id)}`);
        return response.data;
    },

    // Creator Dashboard
    getMyPosts: async () => {
        const userId = getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.get<PostDetailed[]>(`/posts/my?user_id=${userId}`);
        return response.data;
    },

    // CRUD
    createPost: async (data: PostCreate) => {
        const userId = getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.post<PostDetailed>(`/posts?user_id=${userId}`, data);
        return response.data;
    },

    updatePost: async (id: string, data: PostUpdate) => {
        const userId = getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.put<PostDetailed>(`/posts/${id}?user_id=${userId}`, data);
        return response.data;
    },

    deletePost: async (id: string) => {
        const userId = getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.delete(`/posts/${id}?user_id=${userId}`);
        return response.data;
    },

    // Images (Direct Fast Cloudinary CDN Upload)
    uploadImage: async (file: File): Promise<string> => {
        const uploadPreset = "TestoZa_cloudinary";
        const cloudName = "dma0h19mk";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
            return data.secure_url;
        }
        throw new Error(data.error?.message || "Failed to upload image to Cloudinary");
    },

    // Engagement
    toggleLike: async (id: string) => {
        const userId = getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.post<{ liked: boolean, likeCount: number }>(`/posts/${id}/like?user_id=${userId}`);
        return response.data;
    },

    checkLiked: async (id: string) => {
        const userId = getUserIdFromToken();
        if (!userId) return { liked: false };
        const response = await apiClient.get<{ liked: boolean }>(`/posts/${id}/liked?user_id=${userId}`);
        return response.data;
    },

    recordView: async (id: string) => {
        const userId = getUserIdFromToken();
        const url = userId ? `/posts/${id}/view?user_id=${userId}` : `/posts/${id}/view`;
        try {
            const response = await apiClient.post<{ recorded: boolean }>(url);
            return response.data;
        } catch {
            return { recorded: false };
        }
    }
};
