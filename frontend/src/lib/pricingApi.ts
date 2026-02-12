import apiClient from '@/lib/apiClient';

// --- Plans ---

export async function fetchPlans() {
    try {
        const response = await apiClient.get('/pricing/plans');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function createPlan(plan: any) {
    try {
        const response = await apiClient.post('/pricing/plans', plan);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function updatePlan(id: string, updates: any) {
    try {
        const response = await apiClient.put(`/pricing/plans/${id}`, updates);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function deletePlan(id: string) {
    try {
        const response = await apiClient.delete(`/pricing/plans/${id}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

// --- Promo Codes ---

export async function fetchPromos() {
    try {
        const response = await apiClient.get('/pricing/promos');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function createPromo(promo: any) {
    try {
        const response = await apiClient.post('/pricing/promos', promo);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function updatePromo(id: string, updates: any) {
    try {
        const response = await apiClient.put(`/pricing/promos/${id}`, updates);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function deletePromo(id: string) {
    try {
        const response = await apiClient.delete(`/pricing/promos/${id}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function applyPromo(code: string, planId: string) {
    try {
        const response = await apiClient.post('/pricing/promos/apply', { code, plan_id: planId });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

// --- Premium Settings ---

export async function fetchPremiumSettings() {
    try {
        const response = await apiClient.get('/pricing/settings');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function updatePremiumSettings(unlockAll: boolean) {
    try {
        const response = await apiClient.put('/pricing/settings', { unlock_all_premium: unlockAll });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function checkPremiumAccess() {
    try {
        const response = await apiClient.get('/pricing/check-premium-access');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}
