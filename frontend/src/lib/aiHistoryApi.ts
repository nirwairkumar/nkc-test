import { supabase } from '@/integrations/supabase/client';

export interface AiHistoryItem {
    id?: string;
    user_id?: string;
    mode: 'extract' | 'generate';
    title: string | null;
    description: string | null;
    file_name: string | null;
    question_count: number;
    parsed_data: any;
    created_at?: string;
}

// Fetch all AI history items for the logged-in user
export async function fetchAiHistory() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('ai_generation_history' as any)
            .select('*')
            .order('created_at', { ascending: false });

        return { data, error };
    } catch (error: any) {
        return { data: null, error };
    }
}

// Save a new AI history item
export async function saveAiHistory(item: Omit<AiHistoryItem, 'id' | 'user_id' | 'created_at'>) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('ai_generation_history' as any)
            .insert({
                ...item,
                user_id: user.id
            })
            .select()
            .single();

        return { data, error };
    } catch (error: any) {
        return { data: null, error };
    }
}

// Delete an AI history item
export async function deleteAiHistory(id: string) {
    try {
        const { error } = await supabase
            .from('ai_generation_history' as any)
            .delete()
            .eq('id', id);

        return { error };
    } catch (error: any) {
        return { error };
    }
}
