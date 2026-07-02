import React from 'react';
import TestoZaLogo from '@/components/TestoZaLogo';

interface SplashLoaderProps {
    text?: string;
}

export default function SplashLoader({ text = 'Loading...' }: SplashLoaderProps) {
    return (
        <div 
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-t from-[#020617] via-[#0b1528] to-[#020617] select-none"
        >
            {/* Radial vignette overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-70 pointer-events-none" />
            
            <div className="flex flex-col items-center gap-6 relative z-10 scale-95 md:scale-100 transition-all duration-500">
                {/* Pulsing Branded Logo */}
                <div className="animate-pulse shadow-[0_0_50px_rgba(56,189,248,0.15)] rounded-2xl p-4 bg-slate-950/20 backdrop-blur-sm border border-slate-800/40">
                    <TestoZaLogo size={64} />
                </div>
                
                {/* Status Text (e.g. Checking permissions...) */}
                {text && (
                    <div className="text-slate-300 dark:text-slate-200 text-sm md:text-base font-outfit tracking-wide animate-pulse">
                        {text}
                    </div>
                )}
                
                {/* Bouncing Loader Dots */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-bounce [animation-delay:-0.32s] shadow-[0_0_10px_rgba(56,189,248,0.5)]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F4B838] animate-bounce [animation-delay:-0.16s] shadow-[0_0_10px_rgba(244,184,56,0.5)]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-bounce shadow-[0_0_10px_rgba(56,189,248,0.5)]"></span>
                </div>
            </div>
        </div>
    );
}
