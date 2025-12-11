
import supabase from '@/lib/supabaseClient';

export interface Section {
    id: string;
    name: string;
    created_at: string;
}

export async function fetchSections() {
    const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('name', { ascending: true });
    return { data, error };
}

export async function createSection(name: string) {
    const { data, error } = await supabase
        .from('sections')
        .insert({ name })
        .select()
        .single();
    return { data, error };
}

export async function assignSectionsToTest(testId: string, sectionIds: string[]) {
    // 1. Delete existing associations
    const { error: deleteError } = await supabase
        .from('test_sections')
        .delete()
        .eq('test_id', testId);

    if (deleteError) {
        return { error: deleteError };
    }

    // 2. Insert new associations
    if (sectionIds.length > 0) {
        const rows = sectionIds.map(sectionId => ({
            test_id: testId,
            section_id: sectionId
        }));

        const { error: insertError } = await supabase
            .from('test_sections')
            .insert(rows);

        return { error: insertError };
    }

    return { error: null };
}

export async function fetchTestSections(testId: string) {
    const { data, error } = await supabase
        .from('test_sections')
        .select('section_id')
        .eq('test_id', testId);

    if (error) return { data: null, error };

    return { data: data.map(d => d.section_id), error: null };
}
