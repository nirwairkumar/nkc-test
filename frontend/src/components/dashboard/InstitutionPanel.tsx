import React from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Users, GraduationCap, Database, BarChart2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function InstitutionPanel() {
    const handleUpcomingNotice = () => {
        toast.info('Institution Management module is on hold and coming soon!');
    };

    const modules = [
        {
            title: 'Faculty & Teacher Management',
            desc: 'Invite, manage permissions, and track exam creation across institute faculty.',
            icon: Users,
            count: 'Upcoming',
            color: 'text-amber-600 bg-amber-50 border-amber-200',
        },
        {
            title: 'Student & Batch Enrollment',
            desc: 'Organize candidates into sections (Class X-A, JEE Batch 2026) and auto-assign tests.',
            icon: GraduationCap,
            count: 'Upcoming',
            color: 'text-blue-600 bg-blue-50 border-blue-200',
        },
        {
            title: 'Institute Central Question Bank',
            desc: 'Centralized repository of verified questions accessible by all institute faculty.',
            icon: Database,
            count: 'Upcoming',
            color: 'text-purple-600 bg-purple-50 border-purple-200',
        },
        {
            title: 'Institutional Performance & Rank Matrix',
            desc: 'Comparative batch analytics, pass percentages, and teacher efficiency reports.',
            icon: BarChart2,
            count: 'Upcoming',
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        },
    ];

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-6 shadow-sm mb-6 border border-amber-500/20 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-amber-500/20 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white tracking-tight">Institution Management Center</h2>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-400/40 uppercase tracking-wide">
                                UPCOMING
                            </span>
                        </div>
                        <p className="text-xs text-amber-200/70">Control multi-teacher workflows, student cohorts, and central assets (On Hold)</p>
                    </div>
                </div>

                <Button
                    onClick={handleUpcomingNotice}
                    size="sm"
                    disabled={true}
                    className="bg-amber-500/40 text-amber-200/80 font-bold text-xs rounded-xl h-9 px-4 shrink-0 cursor-not-allowed opacity-75 border border-amber-400/20"
                >
                    <Lock className="w-3.5 h-3.5 mr-1" /> Coming Soon
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {modules.map((mod, idx) => {
                    const Icon = mod.icon;
                    return (
                        <div
                            key={idx}
                            className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between opacity-75 hover:opacity-90 transition-all"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${mod.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-300/80 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/20">
                                        {mod.count}
                                    </span>
                                </div>
                                <h3 className="text-xs font-bold text-white/90">
                                    {mod.title}
                                </h3>
                                <p className="text-[11px] text-slate-300/60 mt-1 leading-snug">
                                    {mod.desc}
                                </p>
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                disabled={true}
                                onClick={handleUpcomingNotice}
                                className="mt-4 h-8 text-[11px] font-semibold border-white/10 text-white/50 bg-white/5 cursor-not-allowed w-full flex items-center justify-center gap-1"
                            >
                                <Lock className="w-3 h-3 text-amber-300/60" />
                                <span>Upcoming Feature</span>
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
