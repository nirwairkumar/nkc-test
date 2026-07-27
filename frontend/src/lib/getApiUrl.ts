/**
 * Centralized API URL Resolution Helper
 * Ensures localhost is used during local development, but automatically
 * fallbacks to production backend (https://apigcp.testoza.com/api) on live domains.
 */

export function getApiUrl(): string {
    const envUrl = import.meta.env.VITE_API_URL;

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

        if (!isLocalhost) {
            // If on a live production or staging domain, force production backend if envUrl is missing or points to localhost
            if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
                return 'https://apigcp.testoza.com/api';
            }
        }
    }

    const base = envUrl || 'http://localhost:8000/api';
    return base.replace(/\/$/, '');
}

export default getApiUrl;
