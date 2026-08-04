import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileUp, Sparkles, Database, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrimaryActions() {
    const navigate = useNavigate();

    const actions = [
        {
            id: 'create-test',
            title: 'Create Test',
            description: 'Build standard or section-wise tests with LaTeX math and diagram support.',
            icon: Plus,
            badge: 'Ctrl+N',
            actionText: 'New Test',
            onClick: () => navigate('/create-test'),
            borderHover: 'hover:border-blue-300 hover:shadow-blue-500/5',
            iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
            buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
        },
        {
            id: 'ai-studio',
            title: 'AI Test Generator',
            description: 'Generate full question papers instantly from topics, prompts, or PDF documents.',
            icon: Sparkles,
            badge: 'Pro AI',
            actionText: 'Generate with AI',
            onClick: () => navigate('/generate-with-ai'),
            borderHover: 'hover:border-purple-300 hover:shadow-purple-500/5',
            iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
            buttonStyle: 'bg-purple-600 hover:bg-purple-700 text-white',
        },
        {
            id: 'question-bank',
            title: 'Question Bank',
            description: 'Manage, organize, tag, and reuse saved questions across multiple exams.',
            icon: Database,
            badge: 'Library',
            actionText: 'Open Bank',
            onClick: () => navigate('/materials'),
            borderHover: 'hover:border-amber-300 hover:shadow-amber-500/5',
            iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
            buttonStyle: 'bg-slate-900 hover:bg-slate-800 text-white',
        },
    ];

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Primary Actions</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {actions.map((act) => {
                    const Icon = act.icon;
                    return (
                        <div
                            key={act.id}
                            className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs transition-all duration-200 flex flex-col justify-between group ${act.borderHover}`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.iconBg}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 font-mono">
                                        {act.badge}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-900 flex items-center gap-1">
                                    {act.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed min-h-[36px]">
                                    {act.description}
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <Button
                                    onClick={act.onClick}
                                    size="sm"
                                    className={`w-full h-8 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer ${act.buttonStyle}`}
                                >
                                    <span>{act.actionText}</span>
                                    <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
