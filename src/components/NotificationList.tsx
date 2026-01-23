
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Trash2, MessageSquare, Star, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/hooks/useNotifications';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Link } from 'react-router-dom';

interface NotificationListProps {
    notifications: Notification[];
    onDelete: (id: string) => void;
    onClearAll: () => void;
    onMarkAsRead: (id: string) => void;
    maxHeight?: string | number;
    onClose?: () => void;
}

export default function NotificationList({ notifications, onDelete, onClearAll, onMarkAsRead, maxHeight = "300px", onClose }: NotificationListProps) {
    const [selectedFeedback, setSelectedFeedback] = React.useState<{
        testId: string;
        testTitle: string;
        senderId: string;
        senderName: string;
        rating: string;
        comment: string;
    } | null>(null);

    const [selectedSupport, setSelectedSupport] = React.useState<{
        name: string;
        email: string;
        phone: string;
        message: string;
    } | null>(null);

    const handleSwipe = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, id: string) => {
        if (info.offset.x < -100 || info.offset.x > 100) {
            onDelete(id);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read immediately
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }

        // Option 1: Prefer structured data if available
        if (notification.link && notification.link.startsWith('feedback://')) {
            try {
                // Parse fallback from link (still needed for rating/comment which aren't in top columns yet)
                const url = new URL(notification.link.replace('feedback://', 'http://dump.com/'));
                const params = url.searchParams;

                // Use DB columns if available, else link params
                setSelectedFeedback({
                    testId: notification.custom_test_id || params.get('testId') || '',
                    testTitle: params.get('testTitle') || 'Test Feedback',
                    senderId: params.get('senderId') || '', // Still from link as ID is internal UUID usually
                    senderName: notification.sender_name || params.get('senderName') || 'Anonymous',
                    rating: params.get('rating') || '0',
                    comment: params.get('comment') || '',
                });
            } catch (e) {
                console.error("Failed to parse feedback link", e);
            }
        } else if (notification.link && notification.link.startsWith('support://')) {
            try {
                const url = new URL(notification.link.replace('support://', 'http://dump.com/'));
                const params = url.searchParams;
                setSelectedSupport({
                    name: params.get('name') || 'Unknown',
                    email: params.get('email') || '',
                    phone: params.get('phone') || '',
                    message: params.get('message') || '',
                });
            } catch (e) {
                console.error("Failed to parse support link", e);
            }
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

                                    <div
                                        className={`p-4 transition-colors cursor-pointer ${notification.read ? 'bg-background' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="space-y-1">
                                                <p className={`text-sm leading-none ${notification.read ? 'font-medium' : 'font-bold text-blue-900'}`}>{notification.title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                                {notification.link && !notification.link.startsWith('feedback://') && !notification.link.startsWith('support://') && (
                                                    notification.link.startsWith('/') ? (
                                                        <Link to={notification.link} className="text-xs text-blue-600 hover:underline block mt-1" onClick={() => onClose && onClose()}>
                                                            View Details
                                                        </Link>
                                                    ) : (
                                                        <a href={notification.link} className="text-xs text-blue-600 hover:underline block mt-1" target="_blank" rel="noreferrer">
                                                            View Details
                                                        </a>
                                                    )
                                                )}
                                            </div>
                                            {/* Top-right delete button for non-swipe users */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity md:flex hidden"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(notification.id);
                                                }}
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

            <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-500" />
                            {selectedFeedback?.testTitle}
                        </DialogTitle>
                        <DialogDescription>
                            Feedback received from user.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <span className="text-sm font-medium text-slate-500">Sender</span>
                            {selectedFeedback?.senderId ? (
                                <Link
                                    to={`/profile/${selectedFeedback.senderId}`}
                                    className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                                    onClick={() => setSelectedFeedback(null)} // Close dialog on nav
                                >
                                    {selectedFeedback.senderName} <ExternalLink className="w-3 h-3" />
                                </Link>
                            ) : (
                                <span className="text-sm font-bold">{selectedFeedback?.senderName}</span>
                            )}
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <span className="text-sm font-medium text-slate-500">Rating</span>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-lg">{selectedFeedback?.rating}</span>
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-500" />
                            </div>
                        </div>

                        {selectedFeedback?.comment && (
                            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase">Message</span>
                                <p className="text-sm text-slate-700 italic">"{selectedFeedback.comment}"</p>
                            </div>
                        )}

                        <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Test ID</span>
                            <code className="text-xs bg-slate-200 px-1 py-0.5 rounded">{selectedFeedback?.testId}</code>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setSelectedFeedback(null)}> Close </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedSupport} onOpenChange={(open) => !open && setSelectedSupport(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="bg-red-100 p-1.5 rounded-full">
                                <MessageSquare className="h-4 w-4 text-red-600" />
                            </div>
                            Support Request
                        </DialogTitle>
                        <DialogDescription>
                            New message from help center.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase">Name</span>
                                <p className="text-sm font-medium">{selectedSupport?.name}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase">Phone</span>
                                <p className="text-sm font-medium">{selectedSupport?.phone || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Email</span>
                            <a href={`mailto:${selectedSupport?.email}`} className="text-sm font-medium text-blue-600 hover:underline block">
                                {selectedSupport?.email}
                            </a>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Message</span>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedSupport?.message}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setSelectedSupport(null)}> Close </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = `mailto:${selectedSupport?.email}`}> Reply via Email </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
