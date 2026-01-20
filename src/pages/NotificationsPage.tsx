
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationList from '@/components/NotificationList';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, handleDelete, handleClearAll, loading } = useNotifications();

    return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 h-14 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold">Notifications</h1>
            </div>

            <div className="container max-w-lg mx-auto p-0 md:p-4 h-[calc(100vh-3.5rem)]">
                {loading ? (
                    <div className="flex justify-center p-8">Loading...</div>
                ) : (
                    <NotificationList
                        notifications={notifications}
                        onDelete={handleDelete}
                        onClearAll={handleClearAll}
                        maxHeight="100%"
                    />
                )}
            </div>
        </div>
    );
}
