import apiClient from './apiClient';

export interface FeatureFlags {
    enable_anonymous_tests: boolean;
    enable_ai_test_generation?: boolean;
    ai_test_generation_notes?: string;
    enable_youtube_generation?: boolean;
    youtube_generation_notes?: string;
    enable_news_updates?: boolean;
    news_updates_notes?: string;
}

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
    const CACHE_KEY = 'testoza_feature_flags_cache';
    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

    const getFreshFlags = async (): Promise<FeatureFlags> => {
        const response = await apiClient.get('/features/flags');
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: response.data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("Failed to write feature flags cache:", e);
        }
        return response.data;
    };

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                // Return cached version immediately, trigger background refresh
                getFreshFlags().catch(err => console.error("Background feature flags refresh failed:", err));
                return data;
            }
        }
    } catch (e) {
        console.warn("Failed to parse feature flags cache:", e);
    }

    try {
        return await getFreshFlags();
    } catch (error) {
        console.error("Failed to fetch feature flags:", error);
        return { 
            enable_anonymous_tests: false, 
            enable_ai_test_generation: true, 
            ai_test_generation_notes: "", 
            enable_youtube_generation: true, 
            youtube_generation_notes: "",
            enable_news_updates: true,
            news_updates_notes: ""
        }; // fallback
    }
};

export const updateFeatureFlags = async (flags: FeatureFlags): Promise<FeatureFlags> => {
    try {
        const response = await apiClient.put('/features/flags', flags);
        try {
            localStorage.removeItem('testoza_feature_flags_cache');
        } catch (e) {}
        return response.data;
    } catch (error) {
        console.error("Failed to update feature flags:", error);
        throw error;
    }
};
