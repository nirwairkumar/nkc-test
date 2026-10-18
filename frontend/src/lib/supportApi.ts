import apiClient from '@/lib/apiClient';
import type { HelpTopic } from '@/lib/helpContact';

export async function submitFeedback(data: any) {
    try {
        const response = await apiClient.post('/support/feedback', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export interface SupportMessageInput {
    /** Name and email are taken from the account when signed in. */
    name?: string;
    email?: string;
    phone?: string;
    message: string;
    topic?: HelpTopic | null;
    context?: Record<string, string | number | boolean>;
    /** data:image/jpeg;base64,… */
    screenshot?: string | null;
}

export async function sendSupportMessage(data: SupportMessageInput) {
    try {
        const response = await apiClient.post('/support/message', data);
        return { data: response.data as { success: boolean; id?: string; email?: string }, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export interface MySupportMessage {
    id: string;
    created_at: string;
    topic?: string | null;
    message: string;
    /** pending = waiting for us · replied · resolved */
    status?: string | null;
    reply?: string | null;
    replied_at?: string | null;
}

export async function fetchMySupportMessages(): Promise<MySupportMessage[]> {
    const response = await apiClient.get('/support/mine');
    return response.data?.messages ?? [];
}

export async function submitExitFeedback(data: { test_id: string; experience: string; user_id?: string }) {
    try {
        const response = await apiClient.post('/support/exit-feedback', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}
