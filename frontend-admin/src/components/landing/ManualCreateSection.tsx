import { useState, useEffect } from 'react';
import { PenTool, CheckCircle2, ListChecks, Settings2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ManualEditorShowcase from './ManualEditorShowcase';
import SectionWiseBuilderShowcase from './SectionWiseBuilderShowcase';

export default function ManualCreateSection() {
    const navigate = useNavigate();
    const [activeShowcase, setActiveShowcase] = useState<'editor' | 'section'>('editor');

    return (
        <section className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Content Side */}
                    <div className="lg:w-1/2 space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                            <PenTool className="w-4 h-4" />
                            <span className="text-sm font-medium">Build from Scratch</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
                            Craft the Perfect Test <br />
                            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Question by Question
                            </span>
                        </h2>

                        <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                            Have specific questions in mind? Our powerful manual editor gives you complete control over every aspect of your test.
                        </p>

                        <div className="space-y-6">
                            {[
                                {
                                    icon: ListChecks,
                                    title: "Multiple Question Types",
                                    desc: "Support for MCQ, True/False, Fill in the blanks, and more."
                                },
                                {
                                    icon: Settings2,
                                    title: "Advanced Settings",
                                    desc: "Control time limits, passing criteria, and result visibility."
                                },
                                {
                                    icon: CheckCircle2,
                                    title: "Instant Preview",
                                    desc: "See exactly how your test will look to students as you build it."
                                }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                        <feature.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
                                            {feature.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <Button
                                size="lg"
                                onClick={() => navigate('/create-test')}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                            >
                                Create Test Manually
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>

                    {/* Visual Side */}
                    <div className="lg:w-1/2 flex flex-col items-center w-full">
                        {/* Selector Tabs */}
                        <div 
                            role="tablist" 
                            aria-label="Editor Showcase Switcher"
                            className="flex gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl mb-6 border border-slate-200/50 dark:border-slate-800/50 z-20"
                        >
                            <button
                                role="tab"
                                aria-selected={activeShowcase === 'editor'}
                                onClick={() => setActiveShowcase('editor')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                                    activeShowcase === 'editor'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Single Section
                            </button>
                            <button
                                role="tab"
                                aria-selected={activeShowcase === 'section'}
                                onClick={() => setActiveShowcase('section')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                                    activeShowcase === 'section'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Section-Wise (JEE/NEET)
                            </button>
                        </div>

                        {/* Showcase Area */}
                        <div className="w-full relative min-h-[600px] xl:min-h-[700px] flex items-center justify-center overflow-hidden">
                            {activeShowcase === 'editor' && (
                                <div className="w-full animate-in fade-in zoom-in-95 duration-500">
                                    <ManualEditorShowcase onComplete={() => setActiveShowcase('section')} />
                                </div>
                            )}
                            {activeShowcase === 'section' && (
                                <div className="w-full animate-in fade-in zoom-in-95 duration-500">
                                    <SectionWiseBuilderShowcase onComplete={() => setActiveShowcase('editor')} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
