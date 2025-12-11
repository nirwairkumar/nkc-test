
import supabase from '@/lib/supabaseClient';

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
