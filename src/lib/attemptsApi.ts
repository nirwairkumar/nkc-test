// src/lib/attemptsApi.ts
import supabase from '@/lib/supabaseClient';

export async function saveAttempt(user_id: string, test_id: string, answers: any, score?: number, metadata?: any) {
    const { data, error } = await supabase
        .from('user_tests')
        .insert([{ user_id, test_id, answers, score, metadata }])
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

export async function checkUserTestAttempt(user_id: string, test_id: string) {
    // 1. Check immutable registrations first
    const { data: regData } = await supabase
        .from('test_registrations')
        .select('id')
        .eq('user_id', user_id)
        .eq('test_id', test_id)
        .limit(1);

    if (regData && regData.length > 0) {
        return { hasAttempted: true, error: null };
    }

    // 2. Fallback to existing user_tests (for old records or redundancy)
    const { data, error } = await supabase
        .from('user_tests')
        .select('id')
        .eq('user_id', user_id)
        .eq('test_id', test_id)
        .limit(1);

    return { hasAttempted: data && data.length > 0, error };
}

export async function registerTestStart(user_id: string, test_id: string) {
    // Check if already registered
    const { data: existing } = await supabase
        .from('test_registrations')
        .select('id')
        .eq('user_id', user_id)
        .eq('test_id', test_id)
        .maybeSingle();

    if (existing) return { success: true };

    const { error } = await supabase
        .from('test_registrations')
        .insert([{ user_id, test_id }]);

    return { success: !error, error };
}
