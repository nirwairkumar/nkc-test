// src/lib/testsApi.ts
import supabase from '@/lib/supabaseClient';

export interface Test {
    id: string; // uuid
    title: string;
    description: string;
    questions: Question[]; // JSONB
    created_at: string;
    custom_id?: string;
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
