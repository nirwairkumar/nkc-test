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

async function ensureSupabaseAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user;

    const token = localStorage.getItem('testoza_token');
    const refreshToken = localStorage.getItem('testoza_refresh_token') || '';
    if (token) {
        try {
            const { data, error } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: refreshToken
            });
            if (error) throw error;
            return data.user;
        } catch (e) {
            console.error("Failed to sync session to Supabase client:", e);
        }
    }
    return null;
}

// Fetch all AI history items for the logged-in user
export async function fetchAiHistory() {
    try {
        const user = await ensureSupabaseAuth();
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
        const user = await ensureSupabaseAuth();
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
        const user = await ensureSupabaseAuth();
        if (!user) return { error: new Error('User not authenticated') };

        const { error } = await supabase
            .from('ai_generation_history' as any)
            .delete()
            .eq('id', id);

        return { error };
    } catch (error: any) {
        return { error };
    }
}
