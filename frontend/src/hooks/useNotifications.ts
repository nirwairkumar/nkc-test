import { useState, useEffect, useCallback } from 'react';
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

export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            const response = await apiClient.get(`/social/notifications/${user.id}`, {
                params: { limit: 50 }
            });
            if (response.data && Array.isArray(response.data)) {
                const list = response.data.map((item: any) => ({
                    ...item,
                    read: Boolean(item.read || item.is_read)
                }));
                setNotifications(list);
                setUnreadCount(list.filter((n: Notification) => !n.read).length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();

            const pollInterval = setInterval(() => {
                fetchNotifications();
            }, 30000);

            return () => {
                clearInterval(pollInterval);
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
        }
    }, [user, fetchNotifications]);

    const handleDelete = async (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.delete(`/social/notifications/${id}?user_id=${user?.id}`);
        } catch (error) {
            toast.error("Failed to delete notification");
            fetchNotifications();
        }
    };

    const markAsRead = async (id: string) => {
        setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true, is_read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.put(`/social/notifications/${id}/read?user_id=${user?.id}`);
        } catch (error) {
            console.error("Failed to mark as read", error);
            fetchNotifications();
        }
    };

    const markAllRead = async () => {
        setNotifications((prev) => prev.map(n => ({ ...n, read: true, is_read: true })));
        setUnreadCount(0);
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
        setNotifications([]);
        setUnreadCount(0);
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
        refresh: fetchNotifications
    };
};
