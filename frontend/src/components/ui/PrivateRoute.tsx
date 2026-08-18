import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useLocation } from 'react-router-dom';
import PageLoader from './PageLoader';
import { Button } from './button';
import { Lock, Sparkles } from 'lucide-react';

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    const { openAuthModal } = useAuthModal();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !user) {
            openAuthModal({
                view: 'login',
                redirectPath: location.pathname + location.search
            });
        }
    }, [loading, user, location.pathname, location.search, openAuthModal]);

    if (loading) return <PageLoader />;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in-50 duration-300">
                <div className="w-14 h-14 rounded-3xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
                    <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                    Sign in to Continue
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                    This page is protected. Please sign in or create a free TestoZa account to view and manage your content.
                </p>
                <Button
                    onClick={() => openAuthModal({ view: 'login', redirectPath: location.pathname + location.search })}
                    className="h-11 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]"
                >
                    <Sparkles className="mr-2 h-4 w-4" /> Open Sign In / Sign Up
                </Button>
            </div>
        );
    }

    return children;
}
