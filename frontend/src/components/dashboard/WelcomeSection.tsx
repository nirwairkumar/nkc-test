import React from 'react';
import { Sparkles, Radio, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface WelcomeSectionProps {
    displayName: string;
    liveCount: number;
    draftCount: number;
    submissionsCount: number;
    role: string;
}

export default function WelcomeSection({
    displayName,
    liveCount,
    draftCount,
    submissionsCount,
    role
}: WelcomeSectionProps) {
    return (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden mb-6">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-300">
                            {role} Workspace
                        </span>
                    </div>
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight">
                        Welcome back, {displayName}
                    </h1>
                </div>

                {/* Productivity Pill Highlights */}
                <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] text-slate-300 leading-none truncate">Live Exams</p>
                            <p className="text-xs sm:text-sm font-bold text-white leading-none mt-1">{liveCount}</p>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] text-slate-300 leading-none truncate">Drafts</p>
                            <p className="text-xs sm:text-sm font-bold text-white leading-none mt-1">{draftCount}</p>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] text-slate-300 leading-none truncate">Submissions</p>
                            <p className="text-xs sm:text-sm font-bold text-white leading-none mt-1">{submissionsCount}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
