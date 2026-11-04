/**
 * The only way this app talks to the server.
 *
 * The session is an HttpOnly cookie the browser attaches by itself (credentials:
 * 'include'); this code never sees a token, so an injected script has nothing to steal.
 * Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md (section 3).
 */

const PRODUCTION_API = 'https://apigcp.testoza.com/api';

function apiBase(): string {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000/api').replace(/\/$/, '');
    }
    // Fixed on purpose: the CSP (public/_headers) allows exactly this host.
    return PRODUCTION_API;
}

const API = apiBase();
export const SIGNED_OUT_EVENT = 'tz-team:signed-out';

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

type Options = {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    /** Badge polls: the server doesn't count these as activity (idle sign-out still works). */
    background?: boolean;
    params?: Record<string, string | number | undefined | null>;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
    const url = new URL(API + path);
    for (const [k, v] of Object.entries(opts.params ?? {})) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.background) headers['X-Team-Background'] = '1';

    let res: Response;
    try {
        res = await fetch(url.toString(), {
            method: opts.method ?? 'GET',
            credentials: 'include',
            headers,
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            cache: 'no-store',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
        });
    } catch {
        throw new ApiError(0, 'Can’t reach the server. Check your internet and try again.');
    }

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    if (!res.ok) {
        const detail = typeof data?.detail === 'string' ? data.detail : null;
        const message = detail ?? (res.status >= 500 ? 'The server had a problem. Try again in a moment.' : 'Something went wrong.');
        // A module call that finds the session gone (idle, expired, suspended) sends the
        // person back to sign-in with the server's reason. /me, /login and /logout handle
        // their own 401s.
        const quiet = ['/staff/auth/me', '/staff/auth/login', '/staff/auth/logout'].includes(path);
        if (res.status === 401 && !quiet) {
            window.dispatchEvent(new CustomEvent(SIGNED_OUT_EVENT, { detail: message }));
        }
        throw new ApiError(res.status, message);
    }
    return data as T;
}

export function errorMessage(err: unknown): string {
    return err instanceof ApiError ? err.message : 'Something went wrong.';
}
