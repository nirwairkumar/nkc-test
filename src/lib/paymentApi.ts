import apiClient from '@/lib/apiClient';

// Helper to access Supabase client for Edge Functions if needed
// Or define endpoints in Python.
// For now, we wrap the Edge Function calls here to clean up components.
// We'll use dynamic import for supabaseClient to keep logic encapsulated.

export async function createOrder(data: any) {
    try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data: orderData, error } = await supabase.functions.invoke('create-order', {
            body: data
        });
        if (error) throw error;
        return { data: orderData, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function verifyPayment(data: any) {
    try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data: verifyData, error } = await supabase.functions.invoke('verify-payment', {
            body: data
        });
        if (error) throw error;
        return { data: verifyData, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}
