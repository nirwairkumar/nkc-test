import apiClient from '@/lib/apiClient';

export async function fetchUsers(params?: { page?: number; limit?: number; search?: string; is_verified_creator?: boolean }) {
    try {
        const response = await apiClient.get('/users/', { params });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchUserDetails(userId: string) {
    try {
        const response = await apiClient.get(`/users/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchUsersByIds(userIds: string[]) {
    try {
        const response = await apiClient.get('/users/', {
            params: { ids: userIds.join(',') }
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function updateProfile(userId: string, data: any) {
    try {
        const response = await apiClient.put(`/users/${userId}`, data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function verifyCreator(userId: string) {
    try {
        const response = await apiClient.put(`/users/${userId}/verify`, {});
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function revokeVerification(userId: string) {
    try {
        const response = await apiClient.put(`/users/${userId}/revoke`, {});
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function checkAdmin(userId: string) {
    try {
        const response = await apiClient.get('/users/check-admin', {
            params: { user_id: userId }
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function uploadAvatar(userId: string, file: File) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'avatars');

        const response = await apiClient.post('/storage/upload?bucket=avatars', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return { publicUrl: response.data.url, error: null };
    } catch (error: any) {
        return { publicUrl: null, error };
    }
}

export async function updatePassword(password: string) {
    try {
        const { authApi } = await import('@/lib/authApi');
        const response = await authApi.updatePassword(password);
        return { error: response.error };
    } catch (error: any) {
        return { error };
    }
}

export async function deleteUserPermanently(userId: string) {
    try {
        const response = await apiClient.delete(`/users/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchAllAiHistory(page: number = 1, limit: number = 10, toolType?: string, search?: string) {
    try {
        const offset = (page - 1) * limit;
        const params: any = { limit, offset };
        if (toolType && toolType !== 'all') params.tool_type = toolType;
        if (search && search.trim()) params.search = search.trim();

        const response = await apiClient.get('/users/admin/ai-history-all', { params });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchAiHistoryDetail(historyId: string) {
    try {
        const response = await apiClient.get(`/users/admin/ai-history-detail/${historyId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}
