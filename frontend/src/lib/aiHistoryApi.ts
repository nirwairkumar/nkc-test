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
    const token = localStorage.getItem('testoza_token');
    const refreshToken = localStorage.getItem('testoza_refresh_token') || '';

    const { data: { session } } = await supabase.auth.getSession();

    // If there is no token in localStorage, make sure Supabase is signed out
    if (!token) {
        if (session) {
            await supabase.auth.signOut();
        }
        return null;
    }

    // If the active session matches the current token, return the user
    if (session && session.access_token === token) {
        return session.user;
    }

    // If session access token doesn't match or session doesn't exist, synchronize it
    try {
        const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken
        });
        if (error) throw error;
        return data.user;
    } catch (e) {
        console.error("Failed to sync session to Supabase client:", e);
        // Fallback: decode JWT to extract user id in case setSession fails
        try {
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payloadBase64));
            if (decodedPayload && decodedPayload.sub) {
                return { id: decodedPayload.sub };
            }
        } catch (jwtErr) {
            console.error("Failed to parse JWT fallback:", jwtErr);
        }
    }
    return null;
}

// Fetch AI history items metadata for the logged-in user only (performance-optimized, only title and question_count)
export async function fetchAiHistory() {
    try {
        const user = await ensureSupabaseAuth();
        if (!user) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('ai_generation_history' as any)
            .select('id, title, question_count')
            .eq('user_id', user.id)          // explicit user-scoped filter
            .order('created_at', { ascending: false });

        return { data, error };
    } catch (error: any) {
        return { data: null, error };
    }
}

// Fetch a single AI history item by ID including its full parsed_data payload
export async function fetchAiHistoryItemById(id: string) {
    try {
        const user = await ensureSupabaseAuth();
        if (!user) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('ai_generation_history' as any)
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

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
            .select('id, title, question_count, created_at')
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
