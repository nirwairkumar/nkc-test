/**
 * Who is signed in, and what they must do next.
 *
 *   loading     → asking the server (GET /staff/auth/me)
 *   signed_out  → login page
 *   step        → change password / set up 2-step / enter the 6-digit code
 *   ready       → the dashboard, showing only the modules in `permissions`
 *
 * The browser keeps no copy of the session; reloading asks the server again. After
 * `idle_minutes` with no typing, clicking or scrolling, the tab signs itself out (the
 * server enforces the same limit independently).
 */
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError, SIGNED_OUT_EVENT } from './api';
import type { Me, Permission } from './types';

type Status = 'loading' | 'signed_out' | 'step' | 'ready';

interface SessionValue {
    status: Status;
    me: Me | null;
    /** Why the person was signed out, shown on the login page. */
    notice: string | null;
    refresh: () => Promise<void>;
    signOut: (notice?: string) => Promise<void>;
    can: (perm: Permission) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
    const value = useContext(SessionContext);
    if (!value) throw new Error('useSession outside SessionProvider');
    return value;
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const qc = useQueryClient();
    const [status, setStatus] = useState<Status>('loading');
    const [me, setMe] = useState<Me | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const lastActivity = useRef(Date.now());

    const goSignedOut = useCallback((message: string | null) => {
        setMe(null);
        setStatus('signed_out');
        setNotice(message);
        qc.clear(); // nothing from the last person stays in memory
    }, [qc]);

    const refresh = useCallback(async () => {
        try {
            const data = await api<Me>('/staff/auth/me');
            setMe(data);
            setNotice(null);
            setStatus(data.stage === 'full' ? 'ready' : 'step');
            lastActivity.current = Date.now();
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setMe(null);
                setStatus('signed_out');
            } else {
                setNotice(err instanceof ApiError ? err.message : 'Can’t reach the server.');
                setStatus('signed_out');
            }
        }
    }, []);

    const signOut = useCallback(async (message?: string) => {
        try {
            await api('/staff/auth/logout', { method: 'POST' });
        } catch {
            /* the session may already be gone */
        }
        goSignedOut(message ?? null);
    }, [goSignedOut]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // Any 401 from the server (expired, idle, suspended) → back to the login page.
    useEffect(() => {
        const onSignedOut = (e: Event) => goSignedOut((e as CustomEvent<string>).detail ?? null);
        window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
        return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
    }, [goSignedOut]);

    // Idle sign-out in this tab.
    useEffect(() => {
        if (status !== 'ready' || !me) return;
        const mark = () => {
            lastActivity.current = Date.now();
        };
        ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
        const limit = me.idle_minutes * 60_000;
        const timer = window.setInterval(() => {
            if (Date.now() - lastActivity.current >= limit) {
                void signOut(`Signed out after ${me.idle_minutes} minutes without activity.`);
            }
        }, 15_000);
        return () => {
            ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, mark));
            window.clearInterval(timer);
        };
    }, [status, me, signOut]);

    const can = useCallback((perm: Permission) => !!me?.permissions.includes(perm), [me]);

    return (
        <SessionContext.Provider value={{ status, me, notice, refresh, signOut, can }}>
            {children}
        </SessionContext.Provider>
    );
}
