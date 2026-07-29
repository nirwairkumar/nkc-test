import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type Notification = {
    id: string;
    user_id: string;
    type: string;
    content: string;
    read: boolean;
    created_at: string;
    data?: any;
};

export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            const response = await apiClient.get(`/social/notifications/${user.id}`, {
                params: { limit: 50 }
            });
            if (response.data) {
                setNotifications(response.data);
                setUnreadCount(response.data.filter((n: any) => !n.read).length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
        setLoading(false);
    };

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
    }, [user]);

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
        setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            const { default: apiClient } = await import('@/lib/apiClient');
            await apiClient.put(`/social/notifications/${id}/read?user_id=${user?.id}`);
        } catch (error) {
            console.error("Failed to mark as read", error);
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
        markAsRead
    };
};
