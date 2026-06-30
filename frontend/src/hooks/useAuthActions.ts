import { supabase } from '@/integrations/supabase/client';
import { authApi } from '@/lib/authApi';
import { tokenStorage } from '@/utils/tokenStorage';


export async function signUpWithEmail(email: string, password: string, name?: string, designation?: string) {
    try {
        const response = await authApi.register({
            email,
            password,
            metadata: {
                full_name: name,
                designation: designation,
            }
        });
        return response;
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function signInWithEmail(email: string, password: string) {
    try {
        const response = await authApi.login({ email, password });

        // After successful login, store tokens
        if (response.data?.session?.access_token) {
            tokenStorage.setTokens(
                response.data.session.access_token,
                response.data.session.refresh_token
            );
        }

        return response;
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function signOut() {
    try {
        await authApi.logout();
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        tokenStorage.clearTokens();
        window.location.reload(); // Force full reload to clear state
    }
}

export async function resetPasswordForEmail(email: string) {
    try {
        const response = await authApi.resetPassword(email);
        return response;
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function signInWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });

        if (error) throw error;
        return { error: null };
    } catch (error: any) {
        console.error("Client Google Auth error:", error);
        return { error };
    }
}


