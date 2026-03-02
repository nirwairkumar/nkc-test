import { generateFingerprint } from './fingerprint';
// Use the appropriate API_URL based on the environment (similar to apiClient setups)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class AnalyticsTracker {
    private fingerprint: string | null = null;
    private sessionToken: string;
    private SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        this.sessionToken = this.getOrCreateSession();
    }

    private async ensureInitialized() {
        if (!this.fingerprint) {
            if (!this.initializationPromise) {
                this.initializationPromise = generateFingerprint().then(fp => {
                    this.fingerprint = fp;
                }).catch(e => {
                    console.error("Failed to generate fingerprint:", e);
                    // Fallback to random if SHA256 subtile crypto fails
                    this.fingerprint = "00000000000000000000000000000000000000000000000000000000000" + Math.random().toString(36).substring(2);
                });
            }
            await this.initializationPromise;
        }
    }

    async trackPageView(path: string, title: string) {
        // Respect Do Not Track
        if (navigator.doNotTrack === '1') {
            return;
        }

        await this.ensureInitialized();
        this.sessionToken = this.getOrCreateSession(); // Refresh session

        const urlParams = new URLSearchParams(window.location.search);

        const payload = {
            event_type: "page_view",
            fingerprint: this.fingerprint!,
            session_token: this.sessionToken,
            page_path: path,
            page_title: title,
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
        const url = `${API_BASE}/api/analytics/track`;

        // Use sendBeacon if available, otherwise fallback to fetch
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } else {
            fetch(url, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            }).catch(() => { });
        }
    }

    private getOrCreateSession(): string {
        let token = sessionStorage.getItem("nkc_session");
        const lastStartStr = sessionStorage.getItem("nkc_session_start");
        const lastStart = lastStartStr ? parseInt(lastStartStr, 10) : 0;

        const isExpired = Date.now() - lastStart > this.SESSION_TIMEOUT;

        if (!token || isExpired) {
            token = crypto.randomUUID();
            sessionStorage.setItem("nkc_session", token);
            sessionStorage.setItem("nkc_session_start", Date.now().toString());
        } else {
            // Refresh expiration
            sessionStorage.setItem("nkc_session_start", Date.now().toString());
        }
        return token;
    }
}

export const analyticsTracker = new AnalyticsTracker();
