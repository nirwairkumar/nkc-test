import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsTracker } from '@/lib/analyticsTracker';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile } = useAuth();

    // Track page views on route change
    React.useEffect(() => {
        analyticsTracker.trackPageView(location.pathname, document.title, user?.id);
    }, [location.pathname, user?.id]);

    // Check for redirect intent after login is handled specifically 
    // in AuthForm.tsx (for email) and AuthCallback.tsx (for Google OAuth)
    // to avoid race conditions and double redirects.
    React.useEffect(() => {
        if (user) {
            // Force onboarding if designation is missing in both user_metadata and profile
            const hasDesignation = user.user_metadata?.designation || profile?.designation;

            if (!hasDesignation) {
                // Allow staying on /onboarding
                if (location.pathname !== '/onboarding') {
                    localStorage.setItem('auth_redirect_intent', location.pathname + location.search);
                    navigate('/onboarding', { replace: true });
                }
            } else if (location.pathname === '/onboarding') {
                // If they have a designation but somehow landed on the onboarding page, redirect them home
                navigate('/', { replace: true });
            }
        }
    }, [user, profile, navigate, location.pathname]);
    // Hide navbar only on live test page (/test/:id)
    // Also hiding on /test-intro/:id as requested
    const isResultsPage = location.pathname.startsWith('/results');
    const isLiveTestPage = 
        location.pathname.startsWith('/test/') || 
        location.pathname.startsWith('/test-intro/') || 
        location.pathname.startsWith('/live/') || 
        location.pathname.startsWith('/test-submitted') ||
        location.pathname.startsWith('/combined-');

    const hideFooter = isLiveTestPage || isResultsPage;

    return (
        <div className="min-h-screen bg-slate-50 dashboard-mesh-bg flex flex-col">
            {!isLiveTestPage && (
                <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <Navbar />
                </div>
            )}
            <main className="flex-grow">
                <Outlet />
            </main>
            {!hideFooter && <Footer />}
        </div>
    );
}
