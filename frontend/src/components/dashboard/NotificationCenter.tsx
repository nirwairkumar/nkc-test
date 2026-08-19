import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
    Bell, 
    CheckCircle2, 
    Clock, 
    ShieldAlert, 
    FileCheck, 
    Sparkles, 
    Copy, 
    X, 
    Trash2, 
    Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
    const { 
        notifications, 
        unreadCount, 
        loading, 
        handleDelete, 
        handleClearAll, 
        markAsRead, 
        markAllRead 
    } = useNotifications();

    const getNotificationVisuals = (item: Notification) => {
        const titleLower = (item.title || '').toLowerCase();
        const msgLower = (item.message || '').toLowerCase();

        if (titleLower.includes('flag') || titleLower.includes('report') || msgLower.includes('reported')) {
            return {
                icon: ShieldAlert,
                color: 'text-amber-600 bg-amber-50 border-amber-200/60',
                badge: 'Report'
            };
        }
        if (titleLower.includes('concluded') || titleLower.includes('finished') || msgLower.includes('concluded')) {
            return {
                icon: CheckCircle2,
                color: 'text-blue-600 bg-blue-50 border-blue-200/60',
                badge: 'Exam'
            };
        }
        if (titleLower.includes('submission') || titleLower.includes('submitted') || msgLower.includes('submitted')) {
            return {
                icon: FileCheck,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
                badge: 'Submission'
            };
        }
        if (titleLower.includes('clone') || msgLower.includes('cloned')) {
            return {
                icon: Copy,
                color: 'text-purple-600 bg-purple-50 border-purple-200/60',
                badge: 'Clone'
            };
        }
        if (titleLower.includes('created') || msgLower.includes('created')) {
            return {
                icon: Sparkles,
                color: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
                badge: 'Test'
            };
        }

        return {
            icon: Bell,
            color: 'text-slate-600 bg-slate-100 border-slate-200',
            badge: 'Update'
        };
    };

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return 'recently';
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-white">
                {/* Header */}
                <SheetHeader className="p-4 border-b border-slate-100 flex-row items-center justify-between space-y-0 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Bell className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <SheetTitle className="text-sm font-bold text-slate-900">Notifications</SheetTitle>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">Workspace updates & activity</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => markAllRead()}
                                className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-7 px-2 font-medium"
                            >
                                Mark all read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClearAll()}
                                title="Clear all notifications"
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                {/* Notifications Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading && (
                        <div className="p-8 text-center text-xs text-slate-400">
                            Loading notifications...
                        </div>
                    )}

                    {!loading && notifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                <Inbox className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">No Notifications</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                                You will receive live updates when students submit tests, report questions, or when exams conclude.
                            </p>
                        </div>
                    )}

                    {!loading && notifications.map((item) => {
                        const visuals = getNotificationVisuals(item);
                        const Icon = visuals.icon;
                        const isUnread = !item.read;

                        return (
                            <div
                                key={item.id}
                                onClick={() => {
                                    if (isUnread) markAsRead(item.id);
                                }}
                                className={`group relative p-3 rounded-xl border transition-all ${
                                    isUnread 
                                        ? 'bg-indigo-50/40 border-indigo-200/80 shadow-xs' 
                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${visuals.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className={`text-xs font-semibold truncate ${isUnread ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatTime(item.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed break-words">
                                            {item.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Cross / Delete Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item.id);
                                    }}
                                    title="Dismiss notification"
                                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-400">
                        <span className="text-[11px]">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearAll()}
                            className="text-[11px] text-slate-500 hover:text-red-600 h-6 px-2"
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
