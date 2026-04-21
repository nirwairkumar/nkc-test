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
            await apiClient.post('analytics/track', event);
        } catch (error) {
            console.error("Failed to track event:", error);
        }
    },

    getOverviewStats: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/overview', { params: { days } });
        return response.data;
    },

    getDailyTrends: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/daily', { params: { days } });
        return response.data;
    },

    getTopPages: async (days: number = 30, limit: number = 10) => {
        const response = await apiClient.get('analytics/stats/pages', { params: { days, limit } });
        return response.data;
    },

    getTopReferrers: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/referrers', { params: { days } });
        return response.data;
    },

    getLiveVisitors: async () => {
        const response = await apiClient.get('analytics/stats/live');
        return response.data;
    },

    // ─── Advanced Analytics ───────────────────────────────────
    getTestFunnel: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/tests/funnel', { params: { days } });
        return response.data;
    },

    getVisitorLocations: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/visitors/locations', { params: { days } });
        return response.data;
    },

    getTestMatrix: async (days: number = 30, limit: number = 50) => {
        const response = await apiClient.get('analytics/stats/tests/matrix', { params: { days, limit } });
        return response.data;
    },

    getUserMatrix: async (days: number = 30, limit: number = 50) => {
        const response = await apiClient.get('analytics/stats/users/matrix', { params: { days, limit } });
        return response.data;
    },

    getTestCreationStats: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/tests/creation', { params: { days } });
        return response.data;
    },

    getAttemptLogs: async (days: number = 30, limit: number = 200) => {
        const response = await apiClient.get('analytics/stats/attempts/logs', { params: { days, limit } });
        return response.data;
    },

    getUploadLogs: async (days: number = 30, limit: number = 100) => {
        const response = await apiClient.get('analytics/stats/uploads/logs', { params: { days, limit } });
        return response.data;
    },

    // ─── Progress & Abandonment Tracking ──────────────────────
    updateProgress: async (user_id: string | null, test_id: string, completion_percentage: number, answers?: any) => {
        try {
            await apiClient.post('attempts/progress', { user_id, test_id, completion_percentage, answers });
        } catch (e) { /* non-critical */ }
    },

    markAbandoned: async (user_id: string | null, test_id: string, reason: string, completion_percentage?: number) => {
        try {
            const payload: any = { user_id: user_id || null, test_id, reason };
            if (completion_percentage !== undefined) payload.completion_percentage = completion_percentage;

            // Use fetch with keepalive instead of sendBeacon to properly send 'application/json' to FastAPI
            const url = (apiClient.defaults.baseURL || '') + '/attempts/abandon';
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(e => console.error(e));
        } catch (e) { /* non-critical */ }
    },

    // ─── Anonymous Attempt Tracking ─────────────────────────────
    // Uses a separate backend table (anon_test_attempts) — no mixing with real users.

    _getSessionToken(): string {
        let token = sessionStorage.getItem('nkc_session');
        if (!token) {
            token = crypto.randomUUID();
            sessionStorage.setItem('nkc_session', token);
        }
        return token;
    },

    startAnonAttempt: async (test_id: string) => {
        try {
            const session_token = analyticsApi._getSessionToken();
            await apiClient.post('attempts/anon/start', { session_token, test_id });
        } catch (e) { /* non-critical */ }
    },

    updateAnonProgress: async (test_id: string, completion_pct: number) => {
        try {
            const session_token = analyticsApi._getSessionToken();
            await apiClient.post('attempts/anon/progress', { session_token, test_id, completion_pct });
        } catch (e) { /* non-critical */ }
    },

    submitAnonAttempt: async (test_id: string, answers: Record<string, any>, score: number) => {
        try {
            const session_token = analyticsApi._getSessionToken();
            await apiClient.post('attempts/anon/submit', { session_token, test_id, answers, score, completion_pct: 100 });
        } catch (e) { /* non-critical */ }
    },

    abandonAnonAttempt: (test_id: string, reason: string, completion_pct?: number) => {
        try {
            const session_token = analyticsApi._getSessionToken();
            const payload: any = { session_token, test_id, reason };
            if (completion_pct !== undefined) payload.completion_pct = completion_pct;

            // Use fetch with keepalive to send application/json correctly on tab close
            const url = (apiClient.defaults.baseURL || '') + '/attempts/anon/abandon';
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(e => console.error(e));
        } catch (e) { /* non-critical */ }
    },

    getAnonSummary: async (days: number = 30) => {
        const response = await apiClient.get('analytics/stats/anon/summary', { params: { days } });
        return response.data;
    },
};
