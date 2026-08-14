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

    // Expand sidebar on AI page
    useEffect(() => {
        if (location.pathname === '/generate-with-ai') {
            setIsCollapsed(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        try {
            localStorage.setItem('app_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch { }
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

    // Check if current page is on blog subdomain or blog/news routes
    const isBlogSubdomain = typeof window !== 'undefined' && (
        window.location.hostname === 'blog.testoza.com' ||
        window.location.hostname === 'news.testoza.com'
    );

    const isBlogPage =
        isBlogSubdomain ||
        location.pathname.startsWith('/blog') ||
        location.pathname.startsWith('/news') ||
        location.pathname.startsWith('/posts') ||
        location.pathname.startsWith('/my-posts');

    // Sidebar is shown only on internal dashboard & management pages, completely hidden on blog & marketing pages
    const isSidebarHidden =
        isBlogPage ||
        isLiveTestPage ||
        isResultsPage ||
        location.pathname === '/' ||
        location.pathname === '/support' ||
        location.pathname === '/about' ||
        location.pathname === '/convert' ||
        location.pathname === '/privacy-policy' ||
        location.pathname === '/terms-and-conditions' ||
        (location.pathname === '/dashboard' && !user);

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

