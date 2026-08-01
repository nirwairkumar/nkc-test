import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bell, CheckCircle2, AlertCircle, FileCheck, Award, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationCenterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
    const notifications = [
        {
            id: '1',
            type: 'submission',
            title: '18 Submissions Received',
            message: 'Physics Weekly Mock Test #4 has reached 18 completed submissions.',
            time: '10 mins ago',
            read: false,
            icon: FileCheck,
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            id: '2',
            type: 'report',
            title: 'Question Flagged',
            message: 'Student reported Q3 in Chemistry Chapter 4 for ambiguous options.',
            time: '45 mins ago',
            read: false,
            icon: ShieldAlert,
            color: 'text-amber-600 bg-amber-50',
        },
        {
            id: '3',
            type: 'exam',
            title: 'Exam Concluded',
            message: 'Mathematics Term-1 Midterm exam session finished successfully.',
            time: '2 hours ago',
            read: true,
            icon: CheckCircle2,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            id: '4',
            type: 'system',
            title: 'AI Studio Upgraded',
            message: 'LaTeX OCR engine performance improved by 40%.',
            time: '1 day ago',
            read: true,
            icon: Award,
            color: 'text-purple-600 bg-purple-50',
        },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-white">
                {/* Header */}
                <SheetHeader className="p-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Bell className="w-4 h-4" />
                        </div>
                        <div>
                            <SheetTitle className="text-sm font-bold text-slate-800">Notifications</SheetTitle>
                            <p className="text-[11px] text-slate-400">Workspace updates & live alerts</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2">
                        Mark all read
                    </Button>
                </SheetHeader>

                {/* Notifications Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notifications.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.id}
                                className={`p-3 rounded-xl border transition-all ${
                                    item.read ? 'bg-white border-slate-100' : 'bg-slate-50/80 border-indigo-100/80 shadow-xs'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold text-slate-800 truncate">{item.title}</h4>
                                            <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {item.time}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-400">Showing 4 recent updates</span>
                    <Button variant="link" size="sm" className="text-xs font-semibold text-indigo-600 h-auto p-0 flex items-center gap-1">
                        View Log <ArrowRight className="w-3 h-3" />
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
