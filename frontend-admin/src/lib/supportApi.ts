import apiClient from '@/lib/apiClient';

export async function submitFeedback(data: any) {
    try {
        const response = await apiClient.post('/support/feedback', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function sendSupportMessage(data: { name: string; email: string; phone?: string; message: string }) {
    try {
        const response = await apiClient.post('/support/message', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function submitExitFeedback(data: { test_id: string; experience: string; user_id?: string }) {
    try {
        const response = await apiClient.post('/support/exit-feedback', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}
