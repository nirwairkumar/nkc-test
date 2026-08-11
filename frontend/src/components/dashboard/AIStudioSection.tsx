import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Youtube, FileUp, Image, Wand2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AIStudioSection() {
    const navigate = useNavigate();

    const modules = [
        {
            title: 'Generate from PDF Paper',
            desc: 'Extract questions, options, LaTeX & diagrams from scanned PDFs.',
            icon: FileText,
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            tab: 'pdf',
        },
        {
            title: 'Generate from YouTube Video',
            desc: 'Paste a video URL to extract transcript & generate quiz questions.',
            icon: Youtube,
            color: 'bg-red-50 text-red-600 border-red-200',
            tab: 'youtube',
        },
        {
            title: 'Generate from Topic Prompt',
            desc: 'Type any syllabus topic (e.g. "Kinematics 2D") and set difficulty.',
            icon: Wand2,
            color: 'bg-purple-50 text-purple-600 border-purple-200',
            tab: 'prompt',
        },
        {
            title: 'Generate from Screenshots',
            desc: 'Crop question images and convert them to LaTeX math instantly.',
            icon: Image,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            tab: 'image',
        },
    ];

    return (
        <div className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white p-6 shadow-md mb-6">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 uppercase tracking-widest">
                            <Sparkles className="w-3 h-3 text-purple-300" /> TestoZa AI Studio
                        </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight">
                        AI-Powered Question Paper Generation
                    </h2>
                    <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-xl leading-relaxed">
                        Eliminate hours of manual question entry. Convert PDFs, YouTube videos, and text prompts into formatted LaTeX tests in seconds.
                    </p>
                </div>

                <Button
                    onClick={() => navigate('/generate-with-ai')}
                    className="h-9 sm:h-10 px-4 sm:px-5 bg-white hover:bg-purple-50 text-purple-950 font-bold text-xs rounded-xl shadow-lg transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    <span>Launch Full AI Studio</span>
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>

            {/* AI Tool Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
                {modules.map((m, idx) => {
                    const Icon = m.icon;
                    return (
                        <button
                            key={idx}
                            onClick={() => navigate(`/generate-with-ai?tab=${m.tab}`)}
                            className="bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md rounded-xl p-4 transition-all text-left group cursor-pointer flex flex-col justify-between"
                        >
                            <div>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <h3 className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors">
                                    {m.title}
                                </h3>
                                <p className="text-[11px] text-purple-200/70 mt-1 leading-snug">
                                    {m.desc}
                                </p>
                            </div>
                            <span className="text-[10px] font-semibold text-purple-300 mt-3 flex items-center gap-1">
                                Launch Tool <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
