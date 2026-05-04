import axios from 'axios';

// Use environment variable for API URL or default to localhost
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '') + '/';

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30s — prevents premature timeouts on slower networks/larger payloads
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach token if logged in
apiClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('testoza_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void, reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

// Response Interceptor: Handle Errors, Token Refresh, and Transient Retries
apiClient.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    const originalRequest = error.config;

    // ── 1. TRANSIENT RETRY (500 / 503 / network errors) ─────────────────────────
    // Handles Railway cold starts and momentary Supabase/network blips transparently.
    // Retries up to 2 times: first after 800ms, then after 2000ms.
    const isNetworkError = !error.response && error.request;
    const isTransient = error.response?.status === 503 || error.response?.status === 500;
    const retryCount = originalRequest._retryCount || 0;

    if ((isNetworkError || isTransient) && retryCount < 2) {
        originalRequest._retryCount = retryCount + 1;
        const delay = retryCount === 0 ? 800 : 2000;
        await new Promise(r => setTimeout(r, delay));
        return apiClient(originalRequest);
    }

    // ── 2. SKIP INTERCEPTOR FOR AUTH ENDPOINTS ────────────────────────────────
    if (originalRequest?.url &&
        (originalRequest.url.includes('/auth/login') ||
            originalRequest.url.includes('/auth/refresh') ||
            originalRequest.url.includes('/auth/register'))) {
        return Promise.reject(error);
    }

    // ── 3. TOKEN REFRESH ON 401 ───────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
        // GUARD: Only attempt refresh / redirect if the user actually had a token.
        // Anonymous visitors on public pages should NEVER be sent to /login.
        const hadToken = !!localStorage.getItem('testoza_token');
        if (!hadToken) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise(function (resolve, reject) {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return apiClient(originalRequest);
            }).catch(err => {
                return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('testoza_refresh_token');
        if (!refreshToken) {
            isRefreshing = false;
            return Promise.reject(error);
        }

        try {
            // Use standard axios to prevent circular interceptors
            const response = await axios.post(`${API_URL}auth/refresh`, { refresh_token: refreshToken }, {
                headers: { 'Content-Type': 'application/json' }
            });

            const session = response.data?.data?.session;

            if (session && session.access_token) {
                const newToken = session.access_token;
                localStorage.setItem('testoza_token', newToken);
                if (session.refresh_token) {
                    localStorage.setItem('testoza_refresh_token', session.refresh_token);
                }

                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                processQueue(null, newToken);
                return apiClient(originalRequest);
            } else {
                throw new Error("Invalid refresh response");
            }
        } catch (refreshError) {
            processQueue(refreshError, null);
            localStorage.removeItem('testoza_token');
            localStorage.removeItem('testoza_refresh_token');
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }

    if (error.response) {
        console.error("API Error:", error.response.data);
    } else if (error.request) {
        console.error("Network Error:", error.request);
    } else {
        console.error("Request Error:", error.message);
    }

    return Promise.reject(error);
});

export default apiClient;
