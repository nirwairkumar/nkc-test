import apiClient from './apiClient';
import { tokenStorage } from '@/utils/tokenStorage';

export type AuthResponse = {
    data: {
        user: any;
        session: {
            access_token: string;
            refresh_token: string;
            expires_at: number;
        } | null;
    };
    error: any;
};

export const authApi = {
    login: async (credentials: any): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data;
    },
    register: async (data: any): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/register', data);
        return response.data;
    },
    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.warn('Backend logout request failed, proceeding with local cleanup:', error);
        } finally {
            tokenStorage.clearTokens();
            localStorage.removeItem('testoza_token');
            localStorage.removeItem('testoza_refresh_token');
            localStorage.removeItem('testoza_is_admin');
            localStorage.removeItem('testoza_user');
            localStorage.removeItem('testoza_profile');
            localStorage.removeItem('user_designation');
            sessionStorage.clear();
        }
    },
    refreshToken: async (refresh_token: string) => {
        // Use standard axios to avoid cyclic interceptor triggers
        const response = await apiClient.post('/auth/refresh', { refresh_token });
        return response.data;
    },
    getMe: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
    resetPassword: async (email: string) => {
        const response = await apiClient.post('/auth/password-reset', { email });
        return response.data;
    },
    updatePassword: async (password: string) => {
        const response = await apiClient.post('/auth/password-update', { password });
        return response.data;
    },
    updateMetadata: async (data: any) => {
        const response = await apiClient.post('/auth/update-user', data); // Removed nesting it in {data} as backend takes payload directly now or handles it
        return response.data;
    },
    signInWithGoogle: async () => {
        const response = await apiClient.get('/auth/google');
        return response.data; // Should contain { url: '...' }
    }
};
