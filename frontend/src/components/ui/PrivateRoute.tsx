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
                style={{ background: 'linear-gradient(to top, #0f172a, #312e81)' }}
            >
                {/* Radial vignette overlay matching landing page */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-50" 
                    style={{ background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)' }} 
                />
                
                {/* Animated Logo in the center */}
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="animate-pulse flex items-center justify-center">
                        <TestoZaLogo size={72} className="filter drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
                    </div>
                </div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return children;
}

