import apiClient from './apiClient';

export interface FeatureFlags {
    enable_anonymous_tests: boolean;
}

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
    try {
        const response = await apiClient.get('/features/flags');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch feature flags:", error);
        return { enable_anonymous_tests: false }; // fallback
    }
};

export const updateFeatureFlags = async (flags: FeatureFlags): Promise<FeatureFlags> => {
    try {
        const response = await apiClient.put('/features/flags', flags);
        return response.data;
    } catch (error) {
        console.error("Failed to update feature flags:", error);
        throw error;
    }
};
