// src/lib/testsApi.ts
import supabase from '@/lib/supabaseClient';

export interface Test {
    id: string; // uuid
    title: string;
    description: string;
    questions: Question[]; // JSONB
    created_at: string;
    custom_id?: string;
    marks_per_question?: number;
    negative_marks?: number;
    duration?: number; // minutes
    revision_notes?: string;
}

export interface Question {
    id: number;
    question: string;
    options: { [key: string]: string };
    correctAnswer: string;
}

export async function fetchTests() {
    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false });
    return { data, error };
}

export async function fetchTestById(id: string) {
    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}
export async function fetchTestsByUserId(userId: string) {
    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
    return { data, error };
}

export async function toggleTestLike(testId: string, userId: string) {
    // Check if like exists
    const { data: existingLike, error: checkError } = await supabase
        .from('test_likes')
        .select('id')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .single();

    if (existingLike) {
        // Unlike
        const { error } = await supabase.from('test_likes').delete().eq('id', existingLike.id);
        return { liked: false, error };
    } else {
        // Like
        const { error } = await supabase.from('test_likes').insert({ test_id: testId, user_id: userId });
        return { liked: true, error };
    }
}

export async function getTestLikeCount(testId: string) {
    const { count, error } = await supabase
        .from('test_likes')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId);
    return { count, error };
}
export async function getTestLikeStatus(testId: string, userId: string) {
    const { data, error } = await supabase
        .from('test_likes')
        .select('id')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .maybeSingle();
    return { liked: !!data, error };
}
