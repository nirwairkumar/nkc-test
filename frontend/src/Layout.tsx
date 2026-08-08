import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppSidebar from './components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsTracker } from '@/lib/analyticsTracker';
import { PanelLeft } from 'lucide-react';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, loading } = useAuth();

    // Sidebar collapsed state (persistent in localStorage)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('app_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const [mobileOpen, setMobileOpen] = useState<boolean>(false);

    // Expand sidebar on AI page, minimize on dashboard
    useEffect(() => {
        if (location.pathname === '/dashboard') {
            setIsCollapsed(true);
        } else if (location.pathname === '/generate-with-ai') {
            setIsCollapsed(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        try {
            localStorage.setItem('app_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch {}
    }, [isCollapsed]);

    // Track page views on route change
    React.useEffect(() => {
        analyticsTracker.trackPageView(location.pathname, document.title, user?.id);
    }, [location.pathname, user?.id]);

    // Check for redirect intent after login is handled specifically 
    // in AuthForm.tsx (for email) and AuthCallback.tsx (for Google OAuth)
    // to avoid race conditions and double redirects.
    React.useEffect(() => {
        if (loading) return;

        if (user) {
            // Force onboarding if designation is missing in user_metadata, profile, and localStorage
            const localDesignation = localStorage.getItem('user_designation');
            const hasDesignation = user.user_metadata?.designation || profile?.designation || localDesignation;

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
    }, [user, profile, loading, navigate, location.pathname]);

    // Check if logged in user is Teacher or Institution
    const designation = profile?.designation || user?.user_metadata?.designation || (typeof window !== 'undefined' ? localStorage.getItem('user_designation') : null);
    const isTeacherOrInstitution = (designation === 'Teacher' || designation === 'Institution' || designation === 'Other' || designation === 'Guest') || (user?.app_metadata?.role === 'admin' && designation !== 'Student');

    // Hide navbar & sidebar on live test pages
    const isResultsPage = location.pathname.startsWith('/results');
    const isCreateTestPage =
        location.pathname.startsWith('/create-test') ||
        location.pathname.startsWith('/edit-test');
    const isLiveTestPage =
        location.pathname.startsWith('/test/') ||
        location.pathname.startsWith('/test-intro/') ||
        location.pathname.startsWith('/live/') ||
        location.pathname.startsWith('/test-submitted') ||
        location.pathname.startsWith('/combined-');

    const hideFooter = isLiveTestPage || isResultsPage || isCreateTestPage;

    // Sidebar is hidden on /dashboard for Student role (non-educators) to preserve legacy student view
    const isSidebarHidden =
        isLiveTestPage ||
        location.pathname === '/' ||
        location.pathname === '/support' ||
        (location.pathname === '/dashboard' && !isTeacherOrInstitution);

    const handleToggleSidebar = () => {
        if (window.innerWidth < 768) {
            setMobileOpen(!mobileOpen);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dashboard-mesh-bg flex flex-col">
            {!isLiveTestPage && (
                <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <Navbar onToggleSidebar={handleToggleSidebar} />
                </div>
            )}
            
            {/* Floating Mobile Sidebar Expand Button (Below Navbar) */}
            {!isSidebarHidden && !mobileOpen && (
                <button
                    onClick={() => setMobileOpen(true)}
                    className="fixed top-20 left-4 z-40 md:hidden flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800/90 shadow-md backdrop-blur-md rounded-2xl text-xs font-semibold hover:bg-slate-100 active:scale-95 transition-all"
                    aria-label="Open Sidebar Menu"
                >
                    <PanelLeft className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Menu</span>
                </button>
            )}

            <div className="flex flex-1 relative min-h-[calc(100vh-4rem)]">
                {!isSidebarHidden && (
                    <AppSidebar
                        isCollapsed={isCollapsed}
                        setIsCollapsed={setIsCollapsed}
                        mobileOpen={mobileOpen}
                        setMobileOpen={setMobileOpen}
                    />
                )}
                <main className="flex-grow min-w-0 transition-all duration-300">
                    <Outlet />
                </main>
            </div>

            {!hideFooter && <Footer />}
        </div>
    );
}

