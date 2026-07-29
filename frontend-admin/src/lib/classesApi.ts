import apiClient from '@/lib/apiClient';

export interface ClassItem {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

// For admin usage
export const fetchAllClasses = async () => {
    try {
        // We need an endpoint for this. classes.py has /user/{uid}.
        // We should add GET /all to classes.py or just use a trick.
        // Let's assume we add GET /all to classes.py
        const response = await apiClient.get('/classes/all');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};

export const fetchClasses = async (userId: string) => {
    try {
        const response = await apiClient.get(`/classes/user/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};

export const createClass = async (name: string, userId: string) => {
    try {
        const response = await apiClient.post('/classes/', { name, user_id: userId });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};

export const deleteClass = async (id: string) => {
    try {
        const response = await apiClient.delete(`/classes/${id}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};
