import React, { useState, useMemo } from 'react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Bell, Check, CheckCheck, Trash2, Search, Filter, RefreshCw,
    Mail, ExternalLink, LifeBuoy, Star, AlertTriangle, MessageSquare,
    Clock, User, Phone, ArrowUpRight, CheckCircle2, XCircle, Info, Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

type FilterCategory = 'all' | 'unread' | 'support' | 'feedback' | 'reports';

const getNotificationCategory = (n: Notification): 'support' | 'feedback' | 'report' | 'system' => {
    const title = (n.title || '').toLowerCase();
    const link = (n.link || '').toLowerCase();
    const msg = (n.message || n.content || '').toLowerCase();

    if (link.startsWith('support://') || title.includes('support') || msg.includes('support message')) {
        return 'support';
    }
    if (link.startsWith('feedback://') || title.includes('feedback') || title.includes('rating') || msg.includes('rated')) {
        return 'feedback';
    }
    if (title.includes('report') || title.includes('issue') || link.includes('reports')) {
        return 'report';
    }
    return 'system';
};

export default function AdminNotificationsPanel() {
    const {
        notifications,
        unreadCount,
        loading,
        handleDelete,
        handleClearAll,
        markAsRead,
        markAllAsRead,
        refetch
    } = useNotifications();

    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Detail Modals
    const [selectedSupport, setSelectedSupport] = useState<{
        id: string;
        title: string;
        name: string;
        email: string;
        phone: string;
        message: string;
        created_at: string;
    } | null>(null);

    const [selectedFeedback, setSelectedFeedback] = useState<{
        id: string;
        title: string;
        testId: string;
        testTitle: string;
        senderName: string;
        rating: string;
        comment: string;
        created_at: string;
    } | null>(null);

    const [selectedGeneric, setSelectedGeneric] = useState<Notification | null>(null);

    const isRead = (n: Notification) => n.read === true || n.is_read === true;

    // Counts for stat cards
    const stats = useMemo(() => {
        let support = 0;
        let feedback = 0;
        let reports = 0;

        notifications.forEach(n => {
            const cat = getNotificationCategory(n);
            if (cat === 'support') support++;
            else if (cat === 'feedback') feedback++;
            else if (cat === 'report') reports++;
        });

        return {
            total: notifications.length,
            unread: unreadCount,
            support,
            feedback,
            reports
        };
    }, [notifications, unreadCount]);

    // Filtered notifications
    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            // Category filter
            const cat = getNotificationCategory(n);
            if (filterCategory === 'unread' && isRead(n)) return false;
            if (filterCategory === 'support' && cat !== 'support') return false;
            if (filterCategory === 'feedback' && cat !== 'feedback') return false;
            if (filterCategory === 'reports' && cat !== 'report') return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const title = (n.title || '').toLowerCase();
                const msg = (n.message || n.content || '').toLowerCase();
                const sender = (n.sender_name || '').toLowerCase();
                const email = (n.sender_email || '').toLowerCase();
                return title.includes(q) || msg.includes(q) || sender.includes(q) || email.includes(q);
            }

            return true;
        });
    }, [notifications, filterCategory, searchQuery]);

    const handleNotificationClick = (n: Notification) => {
        if (!isRead(n)) {
            markAsRead(n.id);
        }

        const cat = getNotificationCategory(n);

        if (cat === 'support' && n.link && n.link.startsWith('support://')) {
            try {
                const url = new URL(n.link.replace('support://', 'http://placeholder.internal/'));
                const params = url.searchParams;
                setSelectedSupport({
                    id: n.id,
                    title: n.title || 'Support Request',
                    name: n.sender_name || params.get('name') || 'User',
                    email: n.sender_email || params.get('email') || '',
                    phone: params.get('phone') || '',
                    message: params.get('message') || n.message || '',
                    created_at: n.created_at
                });
                return;
            } catch (err) {
                console.error("Failed to parse support link:", err);
            }
        }

        if (cat === 'feedback' && n.link && n.link.startsWith('feedback://')) {
            try {
                const url = new URL(n.link.replace('feedback://', 'http://placeholder.internal/'));
                const params = url.searchParams;
                setSelectedFeedback({
                    id: n.id,
                    title: n.title || 'Test Feedback',
                    testId: n.custom_test_id || params.get('testId') || '',
                    testTitle: params.get('testTitle') || n.title || 'Assessment',
                    senderName: n.sender_name || params.get('senderName') || 'Candidate',
                    rating: params.get('rating') || '5',
                    comment: params.get('comment') || n.message || '',
                    created_at: n.created_at
                });
                return;
            } catch (err) {
                console.error("Failed to parse feedback link:", err);
            }
        }

        // Generic modal
        setSelectedGeneric(n);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Bell className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                                Admin Notifications
                                {unreadCount > 0 && (
                                    <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-mono px-2 py-0.5 text-xs">
                                        {unreadCount} unread
                                    </Badge>
                                )}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Real-time help center tickets, student/teacher feedback, and exam issue reports
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={loading}
                        className="text-xs font-semibold h-9"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAllAsRead()}
                            className="text-xs font-semibold h-9 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                            <CheckCheck className="h-4 w-4 mr-1.5" />
                            Mark All Read
                        </Button>
                    )}

                    {notifications.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowClearConfirm(true)}
                            className="text-xs font-semibold h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Clear All
                        </Button>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Notifications</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <Bell className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Unread Tickets</p>
                            <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">{stats.unread}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-300">
                            <Mail className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Support Requests</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{stats.support}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300">
                            <LifeBuoy className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Feedback & Ratings</p>
                            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{stats.feedback + stats.reports}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-300">
                            <Star className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                        {[
                            { id: 'all' as const, label: 'All', count: stats.total },
                            { id: 'unread' as const, label: 'Unread', count: stats.unread },
                            { id: 'support' as const, label: 'Support Tickets', count: stats.support },
                            { id: 'feedback' as const, label: 'Feedback', count: stats.feedback },
                            { id: 'reports' as const, label: 'Question Reports', count: stats.reports },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterCategory(tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    filterCategory === tab.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    filterCategory === tab.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Search notifications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification List */}
            <div className="space-y-2.5">
                {loading && notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No notifications found</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                            {searchQuery
                                ? `No results matching "${searchQuery}". Try searching with a different term.`
                                : filterCategory === 'unread'
                                    ? "You're all caught up! No unread notifications at the moment."
                                    : "Incoming messages, support requests, and user feedback will appear here."}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((n) => {
                        const cat = getNotificationCategory(n);
                        const readStatus = isRead(n);

                        return (
                            <div
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`group relative flex items-start justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                                    readStatus
                                        ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                                        : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs hover:border-indigo-300'
                                }`}
                            >
                                {/* Left Category Icon & Content */}
                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                        cat === 'support'
                                            ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                                            : cat === 'feedback'
                                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                                                : cat === 'report'
                                                    ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                                                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                        {cat === 'support' && <LifeBuoy className="h-5 w-5" />}
                                        {cat === 'feedback' && <Star className="h-5 w-5 fill-amber-400 text-amber-500" />}
                                        {cat === 'report' && <AlertTriangle className="h-5 w-5" />}
                                        {cat === 'system' && <Info className="h-5 w-5" />}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-md ${
                                                cat === 'support'
                                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                                                    : cat === 'feedback'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                                                        : cat === 'report'
                                                            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900'
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900'
                                            }`}>
                                                {cat === 'support' ? 'Support Ticket' : cat === 'feedback' ? 'Rating / Feedback' : cat === 'report' ? 'Issue Report' : 'System Notice'}
                                            </Badge>

                                            {!readStatus && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                                    Unread
                                                </span>
                                            )}

                                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium ml-auto">
                                                <Clock className="w-3 h-3" />
                                                {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : 'Recently'}
                                            </span>
                                        </div>

                                        <h4 className={`text-sm leading-snug truncate ${readStatus ? 'font-semibold text-slate-800 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-white'}`}>
                                            {n.title || n.sender_name || 'Notification'}
                                        </h4>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {n.message || n.content || 'Click to view details'}
                                        </p>

                                        {(n.sender_name || n.sender_email) && (
                                            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                {n.sender_name && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3 text-slate-400" />
                                                        <strong>{n.sender_name}</strong>
                                                    </span>
                                                )}
                                                {n.sender_email && (
                                                    <span className="flex items-center gap-1 font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                                                        <Mail className="w-3 h-3" />
                                                        {n.sender_email}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions on Hover / Right Side */}
                                <div className="flex items-center gap-1 shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                                    {!readStatus && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => markAsRead(n.id)}
                                            title="Mark as Read"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(n.id)}
                                        title="Delete Notification"
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Support Message Detail Dialog */}
            <Dialog open={!!selectedSupport} onOpenChange={(open) => !open && setSelectedSupport(null)}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-red-600 to-rose-600 p-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                                <LifeBuoy className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white">Help Center Ticket</DialogTitle>
                                <DialogDescription className="text-xs text-white/80 mt-0.5">
                                    Support inquiry from user
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">User Name</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSupport?.name || 'Unknown'}</p>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSupport?.phone || 'Not Provided'}</p>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                            <div className="flex items-center justify-between mt-0.5">
                                <a
                                    href={`mailto:${selectedSupport?.email}`}
                                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                                >
                                    {selectedSupport?.email || 'No email provided'}
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                                {selectedSupport?.email && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[11px] px-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedSupport.email);
                                            toast.success("Email copied to clipboard");
                                        }}
                                    >
                                        Copy
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Inquiry</span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {selectedSupport?.message}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex sm:justify-between items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedSupport(null)}>
                            Close
                        </Button>

                        {selectedSupport?.email && (
                            <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                onClick={() => {
                                    window.location.href = `mailto:${selectedSupport.email}?subject=Regarding your TestoZa Support Request`;
                                }}
                            >
                                <Mail className="w-4 h-4 mr-1.5" />
                                Reply via Email
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Test Feedback Detail Dialog */}
            <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                                <Star className="w-5 h-5 fill-white text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white">User Test Review</DialogTitle>
                                <DialogDescription className="text-xs text-white/80 mt-0.5">
                                    Rating and feedback submitted for test
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Assessment Title</span>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedFeedback?.testTitle}</p>
                            {selectedFeedback?.testId && (
                                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block mt-0.5">
                                    ID: {selectedFeedback.testId}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Reviewer</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedFeedback?.senderName}</p>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Rating Given</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="font-bold text-base text-amber-600 dark:text-amber-400">{selectedFeedback?.rating}/5</span>
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                </div>
                            </div>
                        </div>

                        {selectedFeedback?.comment && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Comment</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                    "{selectedFeedback.comment}"
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="outline" size="sm" onClick={() => setSelectedFeedback(null)} className="w-full">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generic Detail Dialog */}
            <Dialog open={!!selectedGeneric} onOpenChange={(open) => !open && setSelectedGeneric(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                                <Info className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white">{selectedGeneric?.title || 'Notification'}</DialogTitle>
                                <DialogDescription className="text-xs text-white/80 mt-0.5">
                                    {selectedGeneric?.created_at ? formatDistanceToNow(new Date(selectedGeneric.created_at), { addSuffix: true }) : 'Recent'}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {selectedGeneric?.message || selectedGeneric?.content}
                            </p>
                        </div>

                        {selectedGeneric?.link && !selectedGeneric.link.startsWith('support://') && !selectedGeneric.link.startsWith('feedback://') && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Attached Link</span>
                                <a
                                    href={selectedGeneric.link}
                                    target={selectedGeneric.link.startsWith('http') ? '_blank' : '_self'}
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 mt-1 truncate"
                                >
                                    {selectedGeneric.link}
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                </a>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="outline" size="sm" onClick={() => setSelectedGeneric(null)} className="w-full">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clear All Confirmation Alert */}
            <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                            <Trash2 className="w-5 h-5" /> Clear All Notifications?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-slate-500">
                            This action will permanently delete all {notifications.length} notifications from your admin inbox. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                handleClearAll();
                                setShowClearConfirm(false);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                        >
                            Yes, Clear All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
