
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    title: string;
    message: string;
    link?: string;
    created_at: string;
    read: boolean;
    // New fields
    custom_test_id?: string;
    sender_name?: string;
    sender_email?: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const channel = supabase
                .channel('public:notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('New notification received!', payload);
                        setNotifications((prev) => [payload.new as Notification, ...prev]);
                        setUnreadCount((prev) => prev + 1);
                        toast.info("New Notification", {
                            description: payload.new.title
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
        }
    }, [user]);

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
                setUnreadCount(response.data.filter((n: any) => !n.read).length); // Recalc unread
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        // Optimistic update
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
        // Optimistic update
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
}
