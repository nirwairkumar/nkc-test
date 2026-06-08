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

    async trackPageView(path: string, title: string, userId?: string) {
        // Disabled to prevent database egress and requests
        return;
    }

    private send(data: object) {
        // Disabled to prevent database egress and requests
        return;
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
