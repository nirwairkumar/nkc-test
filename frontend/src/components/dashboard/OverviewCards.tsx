import React from 'react';
import { FileText, Radio, Clock, Calendar, CheckCircle2, TrendingUp, Users, Award } from 'lucide-react';

interface OverviewCardsProps {
    totalTests: number;
    liveCount: number;
    draftCount: number;
    scheduledCount: number;
    submissionsToday: number;
    avgScorePct: number;
    isInstitution?: boolean;
}

export default function OverviewCards({
    totalTests,
    liveCount,
    draftCount,
    scheduledCount,
    submissionsToday,
    avgScorePct,
    isInstitution = false,
}: OverviewCardsProps) {
    const metrics = [
        {
            title: 'Total Tests',
            value: totalTests,
            subtext: 'Created in workspace',
            icon: FileText,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            title: 'Live Exams',
            value: liveCount,
            subtext: liveCount > 0 ? 'Active & accepting responses' : 'No active live links',
            icon: Radio,
            color: liveCount > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-600 bg-slate-50 border-slate-100',
            pulse: liveCount > 0,
        },
        {
            title: 'Draft Tests',
            value: draftCount,
            subtext: 'Work in progress',
            icon: Clock,
            color: 'text-amber-600 bg-amber-50 border-amber-100',
        },
        {
            title: 'Scheduled Exams',
            value: scheduledCount,
            subtext: 'Upcoming auto-start',
            icon: Calendar,
            color: 'text-purple-600 bg-purple-50 border-purple-100',
        },
        {
            title: 'Submissions Today',
            value: submissionsToday,
            subtext: '+14% from yesterday',
            icon: CheckCircle2,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        },
        {
            title: 'Average Score',
            value: `${avgScorePct}%`,
            subtext: 'Overall student mean',
            icon: TrendingUp,
            color: 'text-teal-600 bg-teal-50 border-teal-100',
        },
    ];

    if (isInstitution) {
        metrics.push({
            title: 'Active Faculty',
            value: 8,
            subtext: 'Teacher accounts',
            icon: Users,
            color: 'text-amber-600 bg-amber-50 border-amber-100',
        });
    }

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">Workspace Metrics</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {metrics.slice(0, 6).map((m, idx) => {
                    const Icon = m.icon;
                    return (
                        <div
                            key={idx}
                            className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">{m.title}</span>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${m.color}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">{m.value}</span>
                                    {m.pulse && (
                                        <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 animate-pulse shrink-0">
                                            LIVE
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">{m.subtext}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
