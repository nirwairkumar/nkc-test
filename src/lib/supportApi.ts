
import supabase from '@/lib/supabaseClient';
import { createNotification } from './socialApi';

export interface SupportMessage {
    name: string;
    email: string;
    phone?: string;
    message: string;
}

export async function sendSupportMessage(msg: SupportMessage) {
    // Get current user if authenticated (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Include user_id if authenticated, otherwise null (allows anonymous submissions)
    const payload = {
        ...msg,
        user_id: user?.id || null
    };

    const { data, error } = await supabase
        .from('support_messages')
        .insert([payload])
        .select()
        .single();

    return { data, error };
}
