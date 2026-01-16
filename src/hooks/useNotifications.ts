
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
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50); // Increased limit slightly

        if (error) {
            console.error('Error fetching notifications:', error);
        } else if (data) {
            setNotifications(data);
            setUnreadCount(data.length);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        // Optimistic update
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("Failed to delete notification");
            fetchNotifications();
        }
    };

    const handleClearAll = async () => {
        setNotifications([]);
        setUnreadCount(0);
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            toast.error("Failed to clear notifications");
            fetchNotifications();
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        handleDelete,
        handleClearAll
    };
}
