import React from 'react';
import { Activity, CheckCircle2, Clock, Award, ShieldAlert, Radio, UserCheck } from 'lucide-react';

export default function LiveActivity() {
    const activities = [
        {
            id: '1',
            user: 'Rahul Sharma',
            action: 'submitted Physics Weekly Mock #4',
            detail: 'Score: 42/50 (84%)',
            time: '2 mins ago',
            type: 'success',
            icon: CheckCircle2,
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            id: '2',
            user: '12 Students',
            action: 'completed Chemistry Chapter 4 Mock',
            detail: 'Batch 2026',
            time: '15 mins ago',
            type: 'batch',
            icon: UserCheck,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            id: '3',
            user: 'System',
            action: 'Result published for Math Midterm',
            detail: 'Notifications sent to 45 candidates',
            time: '1 hour ago',
            type: 'system',
            icon: Award,
            color: 'text-purple-600 bg-purple-50',
        },
        {
            id: '4',
            user: 'St. Xavier Institute',
            action: 'cloned JEE Advanced Sample Paper',
            detail: 'Community Library',
            time: '3 hours ago',
            type: 'clone',
            icon: Radio,
            color: 'text-indigo-600 bg-indigo-50',
        },
        {
            id: '5',
            user: 'System',
            action: 'Exam Scheduled: NEET Final Mock',
            detail: 'Starts tomorrow 9:00 AM',
            time: '5 hours ago',
            type: 'schedule',
            icon: Clock,
            color: 'text-amber-600 bg-amber-50',
        },
    ];

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Live Activity Feed</h2>
                            <p className="text-[11px] text-slate-400">Real-time candidate submissions & events</p>
                        </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="space-y-3">
                    {activities.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.id} className="flex items-start gap-3 text-xs">
                                <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-800 font-medium">
                                        <span className="font-semibold text-slate-900">{item.user}</span> {item.action}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                        <span className="font-medium text-slate-500">{item.detail}</span>
                                        <span>·</span>
                                        <span>{item.time}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">Activity updates automatically</p>
            </div>
        </div>
    );
}
