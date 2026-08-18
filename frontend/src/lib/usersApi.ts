import apiClient from '@/lib/apiClient';

export async function fetchUsers() {
    try {
        const response = await apiClient.get('/users/');
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
        console.warn('[usersApi] Backend updateProfile failed, falling back to direct Supabase upsert:', error);
        try {
            const { supabase } = await import('@/integrations/supabase/client');
            const cleanData = { ...data, id: userId };
            const { data: sbData, error: sbError } = await supabase
                .from('profiles')
                .upsert(cleanData)
                .select()
                .single();
            if (!sbError) {
                return { data: sbData, error: null };
            }
        } catch (sbErr) {
            console.error('[usersApi] Supabase direct profile update error:', sbErr);
        }
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
