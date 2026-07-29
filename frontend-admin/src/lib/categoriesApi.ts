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

// ─── Sub-Category API ───

export interface SubCategory {
    id: string;
    name: string;
    category_id: string;
    created_at: string;
}

export async function fetchSubCategories(categoryId: string) {
    try {
        const response = await apiClient.get(`categories/${categoryId}/subcategories`);
        return { data: response.data as SubCategory[], error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchAllSubCategories() {
    try {
        const response = await apiClient.get('categories/subcategories/all');
        return { data: response.data as SubCategory[], error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function createSubCategory(categoryId: string, name: string) {
    try {
        const response = await apiClient.post(`categories/${categoryId}/subcategories`, { name });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function updateSubCategory(id: string, name: string) {
    try {
        const response = await apiClient.put(`categories/subcategories/${id}`, { name });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteSubCategory(id: string) {
    try {
        await apiClient.delete(`categories/subcategories/${id}`);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

export async function assignSubCategoryToTest(testId: string, subCategoryId: string | null) {
    try {
        await apiClient.post(`categories/admin/assign-subcategory/${testId}`, {
            sub_category_id: subCategoryId
        });
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

export async function fetchTestSubCategory(testId: string) {
    try {
        const response = await apiClient.get(`categories/test/${testId}/subcategory`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchCategoryTestSubCategoryMap(categoryId: string) {
    try {
        const response = await apiClient.get(`categories/${categoryId}/test-subcategory-map`);
        return { data: response.data as Record<string, string>, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}
