// src/lib/testsApi.ts
import supabase from '@/lib/supabaseClient';

export interface TestSection {
    id: string;
    name: string;
    instructions?: string;
    marks_per_question?: number | string;
    negative_marks?: number | string;
    question_type?: string;
    questions: Question[];
}

export interface Test {
    id: string; // uuid
    title: string;
    description: string;
    questions: Question[]; // JSONB (Used for Flat Mode)
    created_at: string;
    custom_id?: string;
    marks_per_question?: number | string;
    negative_marks?: number | string;
    duration?: number; // minutes
    revision_notes?: string;
    is_public?: boolean;
    creator_name?: string;
    creator_avatar?: string;
    created_by?: string;
    institution_name?: string;
    institution_logo?: string;
    slug?: string;
    og_image?: string; // Open Graph Image URL
    tags?: string[]; // Array of strings
    custom_category?: string;
    settings?: TestSettings;

    // New Features
    has_scientific_calculator?: boolean;
    enable_section_mode?: boolean;
    sections?: TestSection[];
    section_marking_model?: 'section-wise' | 'question-wise'; // 'section-wise' is default
}

export interface TestSettings {
    attempt_limit?: number; // 1 for single attempt
    strict_timer?: boolean; // Server-side time validation
    tab_switch_mode?: 'warming' | 'strict' | 'off'; // Warning then submit, or instant submit
    disable_copy_paste?: boolean;
    disable_actions?: boolean; // Right click, etc
    force_fullscreen?: boolean;
    shuffle_questions?: boolean;
    show_results_immediate?: boolean;
    schedule?: {
        enabled: boolean;
        start_time?: string;
        end_time?: string;
    };
    start_form?: {
        enabled: boolean;
        fields: { label: string; required: boolean }[];
    };
    block_back_button?: boolean;
}


export interface Question {
    id: number;
    type?: 'single' | 'multiple' | 'numerical' | 'single-advance' | 'comprehension'; // Default 'single'
    question: string;
    image?: string;
    passageContent?: string; // For comprehension type
    groupId?: string; // To group questions in editor
    options?: { [key: string]: string }; // Optional for numerical
    optionImages?: { [key: string]: string };
    correctAnswer: string | string[] | { min: number, max: number }; // Dynamic type
    marks?: number | string;
    negativeMarks?: number | string;
    typingMode?: 'en' | 'hi';
}

export async function createTest(testData: Partial<Test>) {
    const { data, error } = await supabase
        .from('tests')
        .insert([testData])
        .select()
        .single();
    return { data, error };
    return { data, error };
}

export async function updateTest(id: string, updates: Partial<Test>) {
    const { data, error } = await supabase
        .from('tests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

export async function fetchTests(options?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    excludeIds?: string[]; // To avoid showing duplicates in feed/featured
}) {
    const { page = 1, limit = 100, searchQuery = '', excludeIds = [] } = options || {};
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('tests')
        .select('*')
        .or('is_public.eq.true,is_public.is.null'); // Show public tests OR older tests with null status

    if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
    }

    if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    return { data, error };
}

export async function getNextTestId(prefix: 'M' | 'YT'): Promise<string> {
    // Fetch all custom_ids to determine the next number
    // Ideally we would do this with a database function, but for now we'll do it client-side
    // assuming low volume.
    const { data, error } = await supabase
        .from('tests')
        .select('custom_id')
        .not('custom_id', 'is', null);

    let maxNum = 149; // Start from 149 so first is 150

    if (data && data.length > 0) {
        data.forEach(row => {
            if (row.custom_id) {
                // Extract number part: match M-123 or YT-123
                const match = row.custom_id.match(/-(.+)$/);
                if (match && match[1]) {
                    const num = parseInt(match[1]);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        });
    }

    return `${prefix}-${maxNum + 1}`;
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
        .select('*, test_likes(count)')
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


export async function fetchTestBySlug(slug: string) {
    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('slug', slug)
        .single();
    return { data, error };
}

export async function fetchTestByCustomId(customId: string) {
    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('custom_id', customId)
        .single();
    return { data, error };
}

