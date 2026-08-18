import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Notification = {
    id: string;
    user_id: string;
    title?: string;
    message?: string;
    link?: string;
    read?: boolean;
    is_read?: boolean;
    created_at: string;
    sender_name?: string;
    sender_email?: string;
    custom_test_id?: string;
    type?: string;
    content?: string;
    data?: any;
};

export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const isNotificationRead = (n: Notification) => {
        return n.read === true || n.is_read === true;
    };

    const fetchNotifications = useCallback(async (silent = false) => {
        if (!user?.id) return;
        if (!silent) setLoading(true);
        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            const response = await apiClient.get(`/social/notifications/${user.id}`, {
                params: { limit: 100 }
            });
            if (response.data && Array.isArray(response.data)) {
                setNotifications(response.data);
                setUnreadCount(response.data.filter((n: Notification) => !isNotificationRead(n)).length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchNotifications();

            const pollInterval = setInterval(() => {
                fetchNotifications(true);
            }, 20000); // 20s polling for real-time responsiveness

            return () => {
                clearInterval(pollInterval);
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
        }
    }, [user?.id, fetchNotifications]);

    const handleDelete = async (id: string) => {
        const target = notifications.find(n => n.id === id);
        const wasUnread = target ? !isNotificationRead(target) : false;

        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.delete(`/social/notifications/${id}?user_id=${user?.id}`);
            toast.success("Notification deleted");
        } catch (error) {
            toast.error("Failed to delete notification");
            fetchNotifications(true);
        }
    };

    const markAsRead = async (id: string) => {
        setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true, is_read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.put(`/social/notifications/${id}/read?user_id=${user?.id}`);
        } catch (error) {
            console.error("Failed to mark notification as read", error);
            fetchNotifications(true);
        }
    };

    const markAllAsRead = async () => {
        if (!user?.id) return;
        setNotifications((prev) => prev.map(n => ({ ...n, read: true, is_read: true })));
        setUnreadCount(0);

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.put(`/social/notifications/mark-all-read/${user.id}`);
            toast.success("All notifications marked as read");
        } catch (error) {
            console.error("Failed to mark all as read", error);
            toast.error("Failed to mark all as read");
            fetchNotifications(true);
        }
    };

    const handleClearAll = async () => {
        if (!user?.id) return;
        setNotifications([]);
        setUnreadCount(0);

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.delete(`/social/notifications/clear/${user.id}`);
            toast.success("All notifications cleared");
        } catch (error) {
            toast.error("Failed to clear notifications");
            fetchNotifications(true);
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        handleDelete,
        handleClearAll,
        markAsRead,
        markAllAsRead,
        refetch: () => fetchNotifications(false)
    };
};
