import apiClient from './apiClient';

export interface FeatureFlags {
    enable_anonymous_tests: boolean;
    enable_ai_test_generation?: boolean;
    ai_test_generation_notes?: string;
    enable_youtube_generation?: boolean;
    youtube_generation_notes?: string;
}

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
    try {
        const response = await apiClient.get('/features/flags');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch feature flags:", error);
        return { enable_anonymous_tests: false, enable_ai_test_generation: true, ai_test_generation_notes: "", enable_youtube_generation: true, youtube_generation_notes: "" }; // fallback
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
