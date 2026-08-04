import React from 'react';
import { Copy, Layers, Youtube, FileUp, Upload, Database, PlusCircle, ArrowUpRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function QuickActionsSection() {
    const navigate = useNavigate();

    const tools = [
        {
            title: 'Create Combined Test',
            subtitle: 'Merge tests from your library into Paper I & II',
            icon: Layers,
            action: () => navigate('/create-combined-test'),
            disabled: false,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        },
        {
            title: 'Generate from YouTube',
            subtitle: 'AI video lecture to paper (Coming Soon)',
            icon: Youtube,
            action: () => toast.info('Generate from YouTube feature is currently disabled and coming soon!'),
            disabled: true,
            color: 'text-red-400 bg-red-50/50 border-red-100 opacity-60',
        },
        {
            title: 'Import Word (DOCX)',
            subtitle: 'Upload MS Word paper with tables & equations',
            icon: FileUp,
            action: () => navigate('/generate-with-ai?tab=docx'),
            disabled: false,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            title: 'Import JSON Format',
            subtitle: 'Bulk upload standard TestoZa JSON schema',
            icon: Upload,
            action: () => navigate('/generate-with-ai?tab=json'),
            disabled: false,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        },
    ];

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Quick Tools & Utilities</h2>
                    <p className="text-xs text-slate-400">Fast shortcuts to speed up your workflow</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tools.map((t, idx) => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={idx}
                            onClick={t.action}
                            disabled={t.disabled}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/70 transition-all text-left group ${
                                t.disabled
                                    ? 'opacity-60 cursor-not-allowed bg-slate-50/50'
                                    : 'hover:border-slate-300 hover:bg-slate-50/70 cursor-pointer'
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${t.color}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 flex items-center justify-between">
                                    <span>{t.title}</span>
                                    {t.disabled ? (
                                        <Lock className="w-3 h-3 text-slate-400" />
                                    ) : (
                                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t.subtitle}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
