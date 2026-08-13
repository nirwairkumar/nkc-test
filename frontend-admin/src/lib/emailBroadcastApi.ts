import apiClient from '@/lib/apiClient';

export interface EmailRecipient {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    is_verified_creator: boolean;
    is_creator: boolean;
    designation: string;
    created_at: string;
    tests_created: number;
    attempts_count: number;
}

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    from_name?: string;
    use_ssl?: boolean;
}

export interface SmtpStatus {
    configured: boolean;
    host?: string;
    port?: number;
    user?: string;
    from_name?: string;
    available_senders: string[];
}

export async function fetchRecipients(params?: { search?: string; role?: string; min_tests?: number }) {
    try {
        const response = await apiClient.get('/email-broadcast/recipients', { params });
        return { data: response.data as { users: EmailRecipient[]; total: number }, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchSmtpStatus() {
    try {
        const response = await apiClient.get('/email-broadcast/smtp-status');
        return { data: response.data as SmtpStatus, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function updateSmtpConfig(config: SmtpConfig) {
    try {
        const response = await apiClient.post('/email-broadcast/smtp-config', config);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function sendTestEmail(payload: {
    target_email: string;
    sender_email: string;
    sender_name?: string;
    subject: string;
    body_html: string;
    smtp_config?: SmtpConfig;
}) {
    try {
        const response = await apiClient.post('/email-broadcast/send-test', payload);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function sendBatchEmails(payload: {
    recipient_ids: string[];
    sender_email: string;
    sender_name?: string;
    subject: string;
    body_html: string;
    smtp_config?: SmtpConfig;
}) {
    try {
        const response = await apiClient.post('/email-broadcast/send-batch', payload);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}
