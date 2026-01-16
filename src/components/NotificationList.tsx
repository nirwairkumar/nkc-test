
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/hooks/useNotifications';

interface NotificationListProps {
    notifications: Notification[];
    onDelete: (id: string) => void;
    onClearAll: () => void;
    maxHeight?: string | number;
}

export default function NotificationList({ notifications, onDelete, onClearAll, maxHeight = "300px" }: NotificationListProps) {
    const handleSwipe = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, id: string) => {
        if (info.offset.x < -100 || info.offset.x > 100) {
            onDelete(id);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <h4 className="font-semibold leading-none">Notifications</h4>
                {notifications.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 text-muted-foreground"
                        onClick={onClearAll}
                    >
                        Clear all
                    </Button>
                )}
            </div>
            <ScrollArea className="flex-grow" style={{ height: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}>
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No new notifications
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <AnimatePresence mode='popLayout'>
                            {notifications.map((notification) => (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(e, info) => handleSwipe(e, info, notification.id)}
                                    className="relative bg-background border-b last:border-0 group cursor-grab active:cursor-grabbing touch-pan-y"
                                    whileDrag={{ scale: 1.02, zIndex: 10 }}
                                >
                                    {/* Swipe Backgrounds - Visual Cues */}
                                    <div className="absolute inset-0 bg-red-100 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity -z-10">
                                        <Trash2 className="text-red-500 w-4 h-4" />
                                        <Trash2 className="text-red-500 w-4 h-4" />
                                    </div>

                                    <div className="p-4 bg-background hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-none">{notification.title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                                {notification.link && (
                                                    <a href={notification.link} className="text-xs text-blue-600 hover:underline block mt-1">
                                                        View Details
                                                    </a>
                                                )}
                                            </div>
                                            {/* Top-right delete button for non-swipe users */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden"
                                                onClick={() => onDelete(notification.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
