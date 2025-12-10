// src/lib/attemptsApi.ts
import supabase from '@/lib/supabaseClient';

export async function saveAttempt(user_id: string, test_id: string, answers: any, score?: number) {
    const { data, error } = await supabase
        .from('user_tests')
        .insert([{ user_id, test_id, answers, score }])
        .select();
    return { data, error };
}

export async function fetchUserAttempts(user_id: string) {
    const { data, error } = await supabase
        .from('user_tests')
        .select('id, test_id, score, created_at, answers')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
    return { data, error };
}
