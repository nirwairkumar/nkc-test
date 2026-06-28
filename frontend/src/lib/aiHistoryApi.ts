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

// Fetch AI history items for the logged-in user only (explicit user_id filter + RLS)
export async function fetchAiHistory() {
    try {
        const user = await ensureSupabaseAuth();
        if (!user) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('ai_generation_history' as any)
            .select('*')
            .eq('user_id', user.id)          // explicit user-scoped filter
            .order('created_at', { ascending: false });

        return { data, error };
    } catch (error: any) {
        return { data: null, error };
    }
}

// Save a new AI history item (always stamped with the current user's id)
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

// Delete a single AI history item (user_id guard + RLS)
export async function deleteAiHistory(id: string) {
    try {
        const user = await ensureSupabaseAuth();
        if (!user) return { error: new Error('User not authenticated') };

        const { error } = await supabase
            .from('ai_generation_history' as any)
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);         // prevent cross-user deletion

        return { error };
    } catch (error: any) {
        return { error };
    }
}

// Delete ALL AI history items for the logged-in user
export async function deleteAllAiHistory() {
    try {
        const user = await ensureSupabaseAuth();
        if (!user) return { error: new Error('User not authenticated') };

        const { error } = await supabase
            .from('ai_generation_history' as any)
            .delete()
            .eq('user_id', user.id);

        return { error };
    } catch (error: any) {
        return { error };
    }
}
