import apiClient from './apiClient';

export interface PageViewEvent {
    event_type: 'page_view' | 'session_start' | 'session_end';
    fingerprint: string;
    session_token: string;
    page_path: string;
    page_title?: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    screen_width?: number;
    screen_height?: number;
    user_agent?: string;
    timestamp?: string;
}

export const analyticsApi = {
    /**
     * Note: For standard page views, we use `navigator.sendBeacon` in `analyticsTracker.ts`.
     * This function is kept here if we need to manually await a tracking call or send custom events.
     */
    trackEvent: async (event: PageViewEvent) => {
        try {
            await apiClient.post('/analytics/track', event);
        } catch (error) {
            console.error("Failed to track event:", error);
        }
    },

    getOverviewStats: async (days: number = 30) => {
        const response = await apiClient.get('/analytics/stats/overview', { params: { days } });
        return response.data;
    },

    getDailyTrends: async (days: number = 30) => {
        const response = await apiClient.get('/analytics/stats/daily', { params: { days } });
        return response.data;
    },

    getTopPages: async (days: number = 30, limit: number = 10) => {
        const response = await apiClient.get('/analytics/stats/pages', { params: { days, limit } });
        return response.data;
    },

    getTopReferrers: async (days: number = 30) => {
        const response = await apiClient.get('/analytics/stats/referrers', { params: { days } });
        return response.data;
    },

    getLiveVisitors: async () => {
        const response = await apiClient.get('/analytics/stats/live');
        return response.data;
    },

    // ─── Advanced Analytics ───────────────────────────────────
    getTestFunnel: async (days: number = 30) => {
        const response = await apiClient.get('/analytics/stats/tests/funnel', { params: { days } });
        return response.data;
    },

    getVisitorLocations: async (days: number = 30) => {
        const response = await apiClient.get('/analytics/stats/visitors/locations', { params: { days } });
        return response.data;
    },

    getTestMatrix: async (days: number = 30, limit: number = 50) => {
        const response = await apiClient.get('/analytics/stats/tests/matrix', { params: { days, limit } });
        return response.data;
    },

    getUserMatrix: async (days: number = 30, limit: number = 50) => {
        const response = await apiClient.get('/analytics/stats/users/matrix', { params: { days, limit } });
        return response.data;
    },

    getTestCreationStats: async (days: number = 30) => {
        const response = await apiClient.get('/analytics/stats/tests/creation', { params: { days } });
        return response.data;
    },

    // ─── Progress & Abandonment Tracking ──────────────────────
    updateProgress: async (user_id: string | null, test_id: string, completion_percentage: number) => {
        try {
            await apiClient.post('/attempts/progress', { user_id, test_id, completion_percentage });
        } catch (e) { /* non-critical */ }
    },

    markAbandoned: async (user_id: string | null, test_id: string, reason: string, completion_percentage?: number) => {
        try {
            const payload: any = { user_id: user_id || null, test_id, reason };
            if (completion_percentage !== undefined) payload.completion_percentage = completion_percentage;
            // Use sendBeacon for reliability on tab close
            const url = (apiClient.defaults.baseURL || '') + '/attempts/abandon';
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } catch (e) { /* non-critical */ }
    },
};
