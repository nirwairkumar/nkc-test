import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import TestoZaLogo from '@/components/TestoZaLogo';

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div 
                className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden" 
                style={{ background: 'linear-gradient(to top, #020617, #0b1528, #020617)' }}
            >
                {/* Radial vignette overlay */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-70" 
                    style={{ background: 'radial-gradient(circle at center, transparent 0%, #000 100%)' }} 
                />
                
                {/* Center Content */}
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="animate-pulse flex items-center justify-center">
                        <TestoZaLogo size={72} className="filter drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]" />
                    </div>
                    {/* Bouncing Loader Dots */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-bounce [animation-delay:-0.32s]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F4B838] animate-bounce [animation-delay:-0.16s]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-bounce"></span>
                    </div>
                </div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return children;
}

