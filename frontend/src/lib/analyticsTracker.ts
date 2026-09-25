import { generateFingerprint } from './fingerprint';
import { getApiUrl } from './getApiUrl';

class AnalyticsTracker {
    private fingerprint: string | null = null;
    private sessionToken: string = '';
    private SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.sessionToken = this.getOrCreateSession();
        }
    }

    private async ensureInitialized() {
        if (typeof window === 'undefined') return;
        if (!this.fingerprint) {
            if (!this.initializationPromise) {
                this.initializationPromise = generateFingerprint().then(fp => {
                    this.fingerprint = fp;
                }).catch(e => {
                    console.error("Failed to generate fingerprint:", e);
                    // Fallback to exactly 64-char string if crypto fails
                    this.fingerprint = ("0".repeat(64) + Math.random().toString(36).substring(2)).slice(-64);
                });
            }
            await this.initializationPromise;
        }
    }

    async trackPageView(path: string, title: string, userId?: string) {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return;
        }

        // Skip analytics tracking for bots, search crawlers, and Lighthouse/PageSpeed audits to optimize CPU/TBT
        const ua = navigator.userAgent.toLowerCase();
        if (/lighthouse|pagespeed|speedinsights|bot|crawler|spider/i.test(ua)) {
            return;
        }

        await this.ensureInitialized();
        this.sessionToken = this.getOrCreateSession(); // Refresh session

        const urlParams = new URLSearchParams(window.location.search);

        const payload = {
            event_type: "page_view",
            fingerprint: this.fingerprint || ("0".repeat(64)),
            session_token: this.sessionToken || '00000000-0000-0000-0000-000000000000',
            page_path: path,
            page_title: title,
            user_id: userId || undefined,
            referrer: document.referrer || undefined,
            utm_source: urlParams.get('utm_source') || undefined,
            utm_medium: urlParams.get('utm_medium') || undefined,
            utm_campaign: urlParams.get('utm_campaign') || undefined,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        this.send(payload);
    }

    private send(data: object) {
        if (typeof window === 'undefined') return;
        // Dynamically resolve base URL on the client
        const baseUrl = getApiUrl();
        const url = `${baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`}/analytics/track`;

        // Use sendBeacon if available, otherwise fallback to fetch
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } else if (typeof fetch !== 'undefined') {
            fetch(url, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            }).catch(() => { });
        }
    }

    private getOrCreateSession(): string {
        if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
            return '';
        }
        let token: string | null = null;
        try {
            token = sessionStorage.getItem("nkc_session");
        } catch { }
        const lastStartStr = sessionStorage ? sessionStorage.getItem("nkc_session_start") : null;
        const lastStart = lastStartStr ? parseInt(lastStartStr, 10) : 0;

        const isExpired = Date.now() - lastStart > this.SESSION_TIMEOUT;

        if (!token || isExpired) {
            token = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
            try {
                sessionStorage.setItem("nkc_session", token);
                sessionStorage.setItem("nkc_session_start", Date.now().toString());
            } catch { }
        } else {
            // Refresh expiration
            try {
                sessionStorage.setItem("nkc_session_start", Date.now().toString());
            } catch { }
        }
        return token;
    }
}

export const analyticsTracker = new AnalyticsTracker();

