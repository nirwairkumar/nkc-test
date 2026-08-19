import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Bell, CheckCircle2, ShieldAlert, FileCheck, Sparkles, Copy, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/hooks/useNotifications';
import { Link } from 'react-router-dom';

interface NotificationListProps {
    notifications: Notification[];
    onDelete: (id: string) => void;
    onClearAll: () => void;
    onMarkAsRead: (id: string) => void;
    maxHeight?: string | number;
    onClose?: () => void;
}

export default function NotificationList({ 
    notifications, 
    onDelete, 
    onClearAll, 
    onMarkAsRead, 
    maxHeight = "320px", 
    onClose 
}: NotificationListProps) {

    const getNotificationVisuals = (item: Notification) => {
        const titleLower = (item.title || '').toLowerCase();
        const msgLower = (item.message || '').toLowerCase();

        if (titleLower.includes('flag') || titleLower.includes('report') || msgLower.includes('reported')) {
            return {
                icon: ShieldAlert,
                color: 'text-amber-600 bg-amber-50 border-amber-200/60'
            };
        }
        if (titleLower.includes('concluded') || titleLower.includes('finished') || msgLower.includes('concluded')) {
            return {
                icon: CheckCircle2,
                color: 'text-blue-600 bg-blue-50 border-blue-200/60'
            };
        }
        if (titleLower.includes('submission') || titleLower.includes('submitted') || msgLower.includes('submitted')) {
            return {
                icon: FileCheck,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60'
            };
        }
        if (titleLower.includes('clone') || msgLower.includes('cloned')) {
            return {
                icon: Copy,
                color: 'text-purple-600 bg-purple-50 border-purple-200/60'
            };
        }
        if (titleLower.includes('created') || msgLower.includes('created')) {
            return {
                icon: Sparkles,
                color: 'text-indigo-600 bg-indigo-50 border-indigo-200/60'
            };
        }

        return {
            icon: Bell,
            color: 'text-slate-600 bg-slate-100 border-slate-200'
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
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-100">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">Notifications</h4>
                    {notifications.filter(n => !n.read).length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                            {notifications.filter(n => !n.read).length} new
                        </span>
                    )}
                </div>
                {notifications.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-6 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                        onClick={onClearAll}
                    >
                        Clear all
                    </Button>
                )}
            </div>

            {/* Content List */}
            <ScrollArea className="flex-grow" style={{ height: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}>
                {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                            <Inbox className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">No new notifications</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Workspace updates will appear here</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-slate-100">
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notification) => {
                                const visuals = getNotificationVisuals(notification);
                                const Icon = visuals.icon;
                                const isUnread = !notification.read;

                                return (
                                    <motion.div
                                        key={notification.id}
                                        layout
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                                        onClick={() => {
                                            if (isUnread) onMarkAsRead(notification.id);
                                        }}
                                        className={`relative p-3 transition-colors cursor-default group ${
                                            isUnread ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'bg-white hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5 pr-6">
                                            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${visuals.color}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>

                                                <p className="text-[11px] text-slate-500 leading-snug break-words">
                                                    {notification.message}
                                                </p>

                                                {notification.link && (
                                                    notification.link.startsWith('/') ? (
                                                        <Link 
                                                            to={notification.link} 
                                                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-block mt-1" 
                                                            onClick={() => onClose && onClose()}
                                                        >
                                                            View Details &rarr;
                                                        </Link>
                                                    ) : (
                                                        <a 
                                                            href={notification.link} 
                                                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-block mt-1" 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                        >
                                                            View Details &rarr;
                                                        </a>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Cross / Delete Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(notification.id);
                                            }}
                                            title="Dismiss notification"
                                            className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
