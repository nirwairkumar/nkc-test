
import supabase from '@/lib/supabaseClient';
import { createNotification } from './socialApi';

export interface SupportMessage {
    name: string;
    email: string;
    phone?: string;
    message: string;
}

export async function sendSupportMessage(msg: SupportMessage) {
    const { data, error } = await supabase
        .from('support_messages')
        .insert([msg])
        .select()
        .single();

    return { data, error };
}
