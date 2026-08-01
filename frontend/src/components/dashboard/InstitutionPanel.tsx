import React from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Users, GraduationCap, Database, BarChart2, ShieldCheck, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InstitutionPanel() {
    const navigate = useNavigate();

    const modules = [
        {
            title: 'Faculty & Teacher Management',
            desc: 'Invite, manage permissions, and track exam creation across 8 active teachers.',
            icon: Users,
            count: '8 Teachers',
            actionText: 'Manage Faculty',
            onClick: () => navigate('/settings'),
            color: 'text-amber-600 bg-amber-50 border-amber-200',
        },
        {
            title: 'Student & Batch Enrollment',
            desc: 'Organize candidates into sections (Class X-A, JEE Batch 2026) and auto-assign tests.',
            icon: GraduationCap,
            count: '14 Batches',
            actionText: 'Manage Batches',
            onClick: () => navigate('/materials'),
            color: 'text-blue-600 bg-blue-50 border-blue-200',
        },
        {
            title: 'Institute Central Question Bank',
            desc: 'Centralized repository of verified questions accessible by all institute faculty.',
            icon: Database,
            count: '1,420 Questions',
            actionText: 'Open Repository',
            onClick: () => navigate('/materials'),
            color: 'text-purple-600 bg-purple-50 border-purple-200',
        },
        {
            title: 'Institutional Performance & Rank Matrix',
            desc: 'Comparative batch analytics, pass percentages, and teacher efficiency reports.',
            icon: BarChart2,
            count: 'Live Analytics',
            actionText: 'View Matrix',
            onClick: () => navigate('/results/analytics'),
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        },
    ];

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-6 shadow-sm mb-6 border border-amber-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-amber-500/20 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white tracking-tight">Institution Management Center</h2>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                ENTERPRISE
                            </span>
                        </div>
                        <p className="text-xs text-amber-200/70">Control multi-teacher workflows, student cohorts, and central assets</p>
                    </div>
                </div>

                <Button
                    onClick={() => navigate('/settings')}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl h-9 px-4 shrink-0 cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Faculty Account
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {modules.map((mod, idx) => {
                    const Icon = mod.icon;
                    return (
                        <div
                            key={idx}
                            className="bg-white/10 border border-white/10 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between hover:bg-white/15 transition-all group"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${mod.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                                        {mod.count}
                                    </span>
                                </div>
                                <h3 className="text-xs font-bold text-white group-hover:text-amber-200 transition-colors">
                                    {mod.title}
                                </h3>
                                <p className="text-[11px] text-slate-300/80 mt-1 leading-snug">
                                    {mod.desc}
                                </p>
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={mod.onClick}
                                className="mt-4 h-8 text-[11px] font-semibold border-white/20 text-white hover:bg-white/10 hover:text-white cursor-pointer w-full flex items-center justify-between"
                            >
                                <span>{mod.actionText}</span>
                                <ChevronRight className="w-3 h-3 text-amber-300 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
