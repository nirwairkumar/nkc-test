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
    }
};
