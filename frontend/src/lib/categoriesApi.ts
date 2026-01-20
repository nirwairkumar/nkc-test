
import supabase from '@/lib/supabaseClient';

export interface Category {
    id: string;
    name: string;
    created_at: string;
}

export async function fetchCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
    return { data, error };
}

export async function createCategory(name: string) {
    const { data, error } = await supabase
        .from('categories')
        .insert({ name })
        .select()
        .single();
    return { data, error };
}

export async function assignCategoriesToTest(testId: string, categoryIds: string[]) {
    // 1. Delete existing associations
    const { error: deleteError } = await supabase
        .from('test_categories')
        .delete()
        .eq('test_id', testId);

    if (deleteError) {
        return { error: deleteError };
    }

    // 2. Insert new associations
    if (categoryIds.length > 0) {
        const rows = categoryIds.map(categoryId => ({
            test_id: testId,
            category_id: categoryId
        }));

        const { error: insertError } = await supabase
            .from('test_categories')
            .insert(rows);

        return { error: insertError };
    }

    return { error: null };
}

export async function fetchTestCategories(testId: string) {
    const { data, error } = await supabase
        .from('test_categories')
        .select('category_id')
        .eq('test_id', testId);

    if (error) return { data: null, error };

    return { data: data.map(d => d.category_id), error: null };
}

export async function updateCategory(id: string, name: string) {
    const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

export async function deleteCategory(id: string) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
    return { error };
}
