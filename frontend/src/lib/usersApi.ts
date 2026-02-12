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

export async function uploadAvatar(userId: string, file: File) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { supabase } = await import('@/lib/supabaseClient');

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return { publicUrl: data.publicUrl, error: null };
    } catch (error: any) {
        return { publicUrl: null, error };
    }
}

export async function updatePassword(password: string) {
    try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
    } catch (error: any) {
        return { error };
    }
}
