import { supabase } from './supabaseClient';

export interface ClassItem {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export const fetchClasses = async (userId: string) => {
    return await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
};

export const createClass = async (name: string, userId: string) => {
    return await supabase
        .from('classes')
        .insert({ name, user_id: userId })
        .select()
        .single();
};

export const deleteClass = async (id: string) => {
    return await supabase
        .from('classes')
        .delete()
        .eq('id', id);
};
