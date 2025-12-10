// src/hooks/useAuthActions.ts
import supabase from '@/lib/supabaseClient';

export async function signUpWithEmail(email: string, password: string, name?: string) {
    return supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name, // Standard Supabase metadata field
            }
        }
    });
}

export async function signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
}


export async function signOut() {
    return supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
    });
}

