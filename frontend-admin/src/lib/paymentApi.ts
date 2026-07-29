import apiClient from '@/lib/apiClient';

export async function createOrder(data: any) {
    try {
        const response = await apiClient.post('/pricing/create-order', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}

export async function verifyPayment(data: any) {
    try {
        const response = await apiClient.post('/pricing/verify-payment', data);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error };
    }
}
