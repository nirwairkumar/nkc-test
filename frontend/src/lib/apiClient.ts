import axios from 'axios';

// Use environment variable for API URL or default to localhost
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '') + '/';

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Request Interceptor: Attach token if logged in ──────────────────────────
apiClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('testoza_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// ─── Refresh queue: if multiple requests hit 401 at once, queue them all ──────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token as string));
    failedQueue = [];
};

// ─── Response Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // ══ 1. TRANSIENT RETRY (500 / 503 / network) ════════════════════════════
        // Handles Railway cold starts — transparent to the student.
        // Retries up to 2 times: 800ms, then 2000ms.
        const isNetworkError = !error.response && error.request;
        const isTransient    = error.response?.status === 503 || error.response?.status === 500;
        const retryCount     = originalRequest._retryCount ?? 0;

        if ((isNetworkError || isTransient) && retryCount < 2) {
            originalRequest._retryCount = retryCount + 1;
            await new Promise(r => setTimeout(r, retryCount === 0 ? 800 : 2000));
            return apiClient(originalRequest);
        }

        // ══ 2. SKIP FOR AUTH ENDPOINTS (prevent infinite loops) ═════════════════
        if (originalRequest?.url &&
            (originalRequest.url.includes('/auth/login') ||
             originalRequest.url.includes('/auth/refresh') ||
             originalRequest.url.includes('/auth/register'))) {
            return Promise.reject(error);
        }

        // ══ 3. FAIL-SAFE SESSION RECOVERY on 401 ════════════════════════════════
        //
        // This is the "last resort" for long exams (7-8 hours). Three strategies
        // run in order — from best to last-resort — before giving up.
        //
        // CRITICAL: We NEVER hard-redirect to /login here. Instead we broadcast
        // a `testoza:session-expired` event so the exam page can show a graceful
        // re-login dialog without the student losing their answers (AnswerVault).
        //
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Guard: never attempt recovery for anonymous users
            const hadToken = !!localStorage.getItem('testoza_token');
            if (!hadToken) {
                return Promise.reject(error);
            }

            // If another refresh is already running, queue this request
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(newToken => {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // ── Strategy A: Supabase SDK refreshSession() ─────────────────────
                // This is the authoritative method. The SDK automatically uses its
                // own stored refresh token and handles rotation. It also keeps the
                // Supabase client's internal session in sync.
                const { supabase } = await import('@/integrations/supabase/client.ts');
                const { data: sdkSession } = await supabase.auth.refreshSession();

                if (sdkSession?.session?.access_token) {
                    const newToken  = sdkSession.session.access_token;
                    const newRefresh = sdkSession.session.refresh_token;

                    // Sync into our custom token storage so backend requests work
                    localStorage.setItem('testoza_token', newToken);
                    if (newRefresh) localStorage.setItem('testoza_refresh_token', newRefresh);

                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return apiClient(originalRequest);
                }

                // ── Strategy B: Backend /auth/refresh (legacy fallback) ────────────
                // Some tokens may be stored only in our custom storage and not in
                // the Supabase SDK's session. This catches that edge case.
                const storedRefresh = localStorage.getItem('testoza_refresh_token');
                if (storedRefresh) {
                    const response = await axios.post(
                        `${API_URL}auth/refresh`,
                        { refresh_token: storedRefresh },
                        { headers: { 'Content-Type': 'application/json' } }
                    );

                    const session = response.data?.data?.session;
                    if (session?.access_token) {
                        const newToken   = session.access_token;
                        const newRefresh = session.refresh_token;

                        localStorage.setItem('testoza_token', newToken);
                        if (newRefresh) localStorage.setItem('testoza_refresh_token', newRefresh);

                        // Also sync back into the Supabase client so SDK stays warm
                        await supabase.auth.setSession({
                            access_token: newToken,
                            refresh_token: newRefresh ?? storedRefresh,
                        });

                        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        processQueue(null, newToken);
                        return apiClient(originalRequest);
                    }
                }

                // Both strategies exhausted
                throw new Error('All session recovery strategies exhausted');
            } catch (recoveryError) {
                processQueue(recoveryError, null);

                const status = (recoveryError as any)?.response?.status;
                const isTransient = status === 500 || status === 502 || status === 503 || status === 504 || (!(recoveryError as any)?.response && (recoveryError as any)?.request);

                if (!isTransient) {
                    // Clean up stored tokens (they are definitely invalid now)
                    localStorage.removeItem('testoza_token');
                    localStorage.removeItem('testoza_refresh_token');
                }

                // ── Strategy C: Graceful event — NEVER hard-redirect ──────────────
                // Dispatching an event lets the exam page catch this and show a
                // "Re-login to submit" dialog. The student's answers remain safe in
                // IndexedDB via AnswerVault and are not lost.
                //
                // The exam submission page should listen for this:
                //   window.addEventListener('testoza:session-expired', handler)
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('testoza:session-expired', {
                            detail: { url: originalRequest.url },
                            bubbles: true,
                        })
                    );
                }

                return Promise.reject(recoveryError);
            } finally {
                isRefreshing = false;
            }
        }

        // Log non-401 errors for debugging
        if (error.response) {
            console.error('[API] Error:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('[API] Network error — no response received');
        } else {
            console.error('[API] Request setup error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
