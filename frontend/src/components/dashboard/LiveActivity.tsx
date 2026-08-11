import React from 'react';
import { Activity, CheckCircle2, Clock, Award, Radio, UserCheck } from 'lucide-react';

interface ActivityItem {
    id: string;
    user: string;
    action: string;
    detail: string;
    time: string;
    type?: string;
    color?: string;
}

interface LiveActivityProps {
    activities?: ActivityItem[];
}

export default function LiveActivity({ activities }: LiveActivityProps) {
    const defaultActivities = [
        {
            id: '1',
            user: 'Rahul Sharma',
            action: 'submitted Physics Weekly Mock #4',
            detail: 'Score: 42/50 (84%)',
            time: '2 mins ago',
            type: 'success',
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            id: '2',
            user: '12 Students',
            action: 'completed Chemistry Chapter 4 Mock',
            detail: 'Batch 2026',
            time: '15 mins ago',
            type: 'batch',
            color: 'text-blue-600 bg-blue-50',
        },
        {
            id: '3',
            user: 'System',
            action: 'Result published for Math Midterm',
            detail: 'Notifications sent to 45 candidates',
            time: '1 hour ago',
            type: 'system',
            color: 'text-purple-600 bg-purple-50',
        },
        {
            id: '4',
            user: 'St. Xavier Institute',
            action: 'cloned JEE Advanced Sample Paper',
            detail: 'Community Library',
            time: '3 hours ago',
            type: 'clone',
            color: 'text-indigo-600 bg-indigo-50',
        },
        {
            id: '5',
            user: 'System',
            action: 'Exam Scheduled: NEET Final Mock',
            detail: 'Starts tomorrow 9:00 AM',
            time: '5 hours ago',
            type: 'schedule',
            color: 'text-amber-600 bg-amber-50',
        },
    ];

    const displayActivities = activities !== undefined ? activities : defaultActivities;

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">Live Activity Feed</h2>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Real-time candidate submissions & events</p>
                        </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </div>

                {displayActivities.length === 0 ? (
                    <div className="py-8 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                            <Activity className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">No live activity recorded yet</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                            Student test attempts and events will appear here in real-time.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayActivities.map((item) => {
                            return (
                                <div key={item.id} className="flex items-start gap-3 text-xs">
                                    <div className={`w-7 h-7 rounded-lg ${item.color || 'text-emerald-600 bg-emerald-50'} flex items-center justify-center shrink-0 mt-0.5`}>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
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
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">Activity updates automatically</p>
            </div>
        </div>
    );
}
