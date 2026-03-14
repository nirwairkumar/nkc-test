import apiClient from '@/lib/apiClient';

export interface Category {
    id: string;
    name: string;
    created_at: string;
}

export async function fetchCategories() {
    try {
        const response = await apiClient.get('categories/');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchCategoryStats() {
    try {
        const response = await apiClient.get('categories/stats');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function createCategory(name: string) {
    try {
        const response = await apiClient.post('categories/', { name });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function assignCategoriesToTest(testId: string, categoryIds: string[], isAdmin: boolean = false) {
    try {
        const endpoint = isAdmin ? `/categories/admin/assign/${testId}` : `/categories/assign/${testId}`;
        await apiClient.post(endpoint, { category_ids: categoryIds });
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

export async function fetchTestCategories(testId: string) {
    try {
        const response = await apiClient.get(`/categories/test/${testId}`);
        // Backend returns list of IDs
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function updateCategory(id: string, name: string) {
    try {
        const response = await apiClient.put(`categories/${id}`, { name });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteCategory(id: string) {
    try {
        await apiClient.delete(`categories/${id}`);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}
