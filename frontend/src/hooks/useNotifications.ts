import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Notification = {
    id: string;
    user_id: string;
    title: string;
    message: string;
    link?: string;
    read?: boolean;
    is_read?: boolean;
    created_at: string;
    custom_test_id?: string;
    sender_name?: string;
    sender_email?: string;
    type?: string;
};

// One shared copy for every component on the page: the dashboard header and the
// notification panel used to poll separately, every 30 s, even in hidden tabs.
// Now: every 2 minutes while the tab is visible, straight away when it comes back
// into view, and when a panel is opened (see `freshen`).
const POLL_MS = 2 * 60 * 1000;
const FRESH_MS = 30 * 1000;

type Snapshot = { notifications: Notification[]; unreadCount: number; loading: boolean };

const SIGNED_OUT: Snapshot = { notifications: [], unreadCount: 0, loading: false };
const LOADING: Snapshot = { notifications: [], unreadCount: 0, loading: true };
let snap: Snapshot = LOADING;
let owner: string | null = null; // the user `snap` belongs to
let fetchedAt = 0;
let inFlight: { userId: string; done: Promise<void> } | null = null;
let watchers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
    snap = { ...snap, ...next };
    listeners.forEach((l) => l());
}

function publishList(list: Notification[]) {
    publish({ notifications: list, unreadCount: list.filter((n) => !n.read).length, loading: false });
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

const getSnapshot = () => snap;

function load(userId: string): Promise<void> {
    if (inFlight?.userId === userId) return inFlight.done;
    const done = (async () => {
        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            const response = await apiClient.get(`/social/notifications/${userId}`, {
                params: { limit: 50 }
            });
            if (owner === userId && response.data && Array.isArray(response.data)) {
                publishList(response.data.map((item: any) => ({
                    ...item,
                    read: Boolean(item.read || item.is_read)
                })));
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            if (owner === userId) {
                fetchedAt = Date.now();
                if (snap.loading) publish({ loading: false });
            }
            if (inFlight?.userId === userId) inFlight = null;
        }
    })();
    inFlight = { userId, done };
    return done;
}

/** Load unless the list is from the last 30 seconds. */
function loadIfOld() {
    if (owner && document.visibilityState === 'visible' && Date.now() - fetchedAt > FRESH_MS) load(owner);
}

function poll() {
    if (owner && document.visibilityState === 'visible') load(owner);
}

function watch(userId: string) {
    if (owner !== userId) {
        owner = userId;
        fetchedAt = 0;
        publish(LOADING);
    }
    if (++watchers === 1) {
        timer = setInterval(poll, POLL_MS);
        document.addEventListener('visibilitychange', loadIfOld);
    }
    loadIfOld();
    return () => {
        if (--watchers === 0) {
            if (timer) clearInterval(timer);
            timer = null;
            document.removeEventListener('visibilitychange', loadIfOld);
        }
    };
}

/** Signed out: drop the previous account's notifications. */
function forget() {
    if (owner === null) return;
    owner = null;
    fetchedAt = 0;
    publish(LOADING);
}

export const useNotifications = () => {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const shared = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    // Until this user's first load starts, never show another account's list.
    const { notifications, unreadCount, loading } = !userId ? SIGNED_OUT : owner === userId ? shared : LOADING;

    useEffect(() => {
        if (userId) return watch(userId);
        forget();
    }, [userId]);

    const fetchNotifications = useCallback(async () => {
        if (userId) await load(userId);
    }, [userId]);

    const handleDelete = async (id: string) => {
        publishList(snap.notifications.filter((n) => n.id !== id));

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.delete(`/social/notifications/${id}?user_id=${user?.id}`);
        } catch (error) {
            toast.error("Failed to delete notification");
            fetchNotifications();
        }
    };

    const markAsRead = async (id: string) => {
        publishList(snap.notifications.map(n => n.id === id ? { ...n, read: true, is_read: true } : n));

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.put(`/social/notifications/${id}/read?user_id=${user?.id}`);
        } catch (error) {
            console.error("Failed to mark as read", error);
            fetchNotifications();
        }
    };

    const markAllRead = async () => {
        publishList(snap.notifications.map(n => ({ ...n, read: true, is_read: true })));
        if (!user) return;

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.put(`/social/notifications/mark-all-read/${user.id}`);
            toast.success("All notifications marked as read");
        } catch (error) {
            console.error("Failed to mark all as read", error);
            fetchNotifications();
        }
    };

    const handleClearAll = async () => {
        publishList([]);
        if (!user) return;

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.delete(`/social/notifications/clear/${user.id}`);
            toast.success("All notifications cleared");
        } catch (error) {
            toast.error("Failed to clear notifications");
            fetchNotifications();
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        handleDelete,
        handleClearAll,
        markAsRead,
        markAllRead,
        refresh: fetchNotifications,
        /** Call when a notification panel opens: reloads unless the list is under 30 s old. */
        freshen: loadIfOld
    };
};
