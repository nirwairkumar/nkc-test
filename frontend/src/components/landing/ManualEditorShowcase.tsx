
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Calculator, Clock, ShieldCheck, Check } from 'lucide-react';

const ShowcaseCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 ${className}`}
    >
        {children}
    </motion.div>
);

export default function ManualEditorShowcase() {
    return (
        <div className="relative w-full h-[500px] flex items-center justify-center perspective-[1000px] overflow-visible scale-90 sm:scale-100">
            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Content Container */}
            <div className="relative w-full max-w-lg aspect-square">
                
                {/* Main Test Title Card */}
                <ShowcaseCard className="absolute top-0 right-0 w-64 z-20" delay={0.1}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Type className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-md" />
                </ShowcaseCard>

                {/* Section Indicator */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute top-28 left-4 z-10 flex items-center gap-2"
                >
                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Section: Quantitative</span>
                </motion.div>

                {/* Question Card (The Visual Hero) */}
                <ShowcaseCard className="absolute top-40 left-0 w-full z-30 overflow-hidden" delay={0.2}>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-200 dark:shadow-purple-900/20">
                            <span className="text-white font-bold">Q1</span>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                            <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { label: "Option A", active: true, secondary: "Correct" },
                            { label: "Option B", active: false },
                            { label: "Option C", active: false },
                            { label: "Option D", active: false }
                        ].map((opt, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + (i * 0.1) }}
                                className={`h-12 border rounded-xl flex items-center px-4 gap-3 transition-all cursor-pointer ${
                                    opt.active 
                                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-sm' 
                                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    opt.active ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-700'
                                }`}>
                                    {opt.active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <div className={`h-2 flex-1 rounded ${opt.active ? 'bg-purple-200 dark:bg-purple-800' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                {opt.secondary && <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter">{opt.secondary}</span>}
                            </motion.div>
                        ))}
                    </div>

                    {/* Interaction Cursor Simulation */}
                    <motion.div
                        animate={{ 
                            x: [240, 240, 400], 
                            y: [160, 80, 100],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{ 
                            duration: 4, 
                            repeat: Infinity,
                            repeatDelay: 1,
                            times: [0, 0.2, 0.8, 1]
                        }}
                        className="absolute w-6 h-6 bg-purple-500/50 rounded-full border-2 border-white pointer-events-none z-50 mix-blend-difference"
                        style={{ top: '65%', left: '40%' }}
                    >
                        <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-75" />
                    </motion.div>
                </ShowcaseCard>

                {/* Floating Meta Settings */}
                <AnimatePresence>
                    <ShowcaseCard className="absolute -bottom-10 right-4 w-52 z-40 !p-4" delay={0.5}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>SETTINGS</span>
                                <Settings2 className="w-3 h-3" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                                    <div className="h-4 w-12 bg-blue-100 dark:bg-blue-900/30 rounded" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                                    <div className="flex gap-1">
                                        <div className="h-4 w-6 bg-green-100 dark:bg-green-900/30 rounded" />
                                        <div className="h-4 w-6 bg-green-100 dark:bg-green-900/30 rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ShowcaseCard>
                </AnimatePresence>

                {/* Scientific Calc Button Float */}
                <ShowcaseCard className="absolute top-10 -left-12 w-auto !p-3 !rounded-xl z-20" delay={0.6}>
                    <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-purple-600" />
                        <div className="h-2 w-8 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                </ShowcaseCard>

                {/* Connecting Lines (SVGs) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    {/* Path from Title to Section */}
                    <motion.path 
                        d="M 380 60 Q 200 60 20 110" 
                        stroke="url(#lineGradient)" 
                        strokeWidth="2" 
                        fill="none" 
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                    />
                    <defs>
                        <linearGradient id="lineGradient" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#9333ea" stopOpacity="0" />
                            <stop offset="50%" stopColor="#9333ea" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
}

function Settings2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 7h-9" />
            <path d="M14 17H5" />
            <circle cx="17" cy="17" r="3" />
            <circle cx="7" cy="7" r="3" />
        </svg>
    );
}

