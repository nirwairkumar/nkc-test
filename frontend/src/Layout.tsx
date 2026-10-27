import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppSidebar from './components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import AuthModal from '@/components/auth/AuthModal';
import { analytics } from '@/lib/analytics/tracker';
import { mainDomainRedirect } from '@/utils/subdomain';
import { PanelLeft } from 'lucide-react';
import { GUIDE_METAS } from '@/guides/meta';
import { AI_IMPORT_STEP_EVENT } from '@/lib/aiImportStep';
import FeedbackDock from '@/components/feedback/FeedbackDock';
import { useReferralClaim } from '@/hooks/useReferralClaim';

/** Guides and their index (pages/GuidesIndex.tsx) are reading pages: no app sidebar. */
const GUIDE_PATHS = new Set(['/guides', ...GUIDE_METAS.map((g) => g.path)]);

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

    // The test builder needs the width: start it on the rail (hover still opens it).
    // This is per-visit, so the saved preference for other pages is left alone.
    const isBuilderPage =
        location.pathname.startsWith('/create-test') ||
        location.pathname.startsWith('/edit-test');

    // /generate-with-ai: upload step keeps the menu open; mode choice and preview start on the rail.
    // AITestImporter announces its step via AI_IMPORT_STEP_EVENT.
    const isAiPage = location.pathname === '/generate-with-ai';
    const [aiPastUpload, setAiPastUpload] = useState(false);
    useEffect(() => {
        const onStep = (e: Event) => setAiPastUpload(!!(e as CustomEvent<boolean>).detail);
        window.addEventListener(AI_IMPORT_STEP_EVENT, onStep);
        return () => window.removeEventListener(AI_IMPORT_STEP_EVENT, onStep);
    }, []);

    // Collapse in the builder and past the AI upload step; restore the saved choice on leaving
    useEffect(() => {
        if (isAiPage) {
            setIsCollapsed(aiPastUpload);
        } else if (isBuilderPage) {
            setIsCollapsed(true);
        } else {
            try {
                setIsCollapsed(localStorage.getItem('app_sidebar_collapsed') === 'true');
            } catch { }
        }
    }, [location.pathname, isBuilderPage, isAiPage, aiPastUpload]);

    useEffect(() => {
        if (isBuilderPage || isAiPage) return;
        try {
            localStorage.setItem('app_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch { }
    }, [isCollapsed, isBuilderPage, isAiPage]);

    // One page view per path (our analytics + GA4). Query changes (filters, search
    // boxes) and sign-in state are not new pages — counting them inflated views ~20%.
    React.useEffect(() => {
        // testoza.com hands most paths to app.testoza.com (SubdomainGuard): count the
        // page there, once, and carry this visit's referrer across the hop.
        if (mainDomainRedirect({ pathname: location.pathname, search: window.location.search, hash: window.location.hash })) {
            analytics.handoff();
            return;
        }
        analytics.page();

        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'page_view', {
                page_path: location.pathname + (location.search || ''),
                page_title: document.title,
                page_location: window.location.href,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Link this browser's visits to the account once sign-in state is known.
    React.useEffect(() => {
        if (!loading) analytics.identify(user?.id ?? null);
    }, [user?.id, loading]);

    // Opened someone's invite link, then signed up: credit them (any sign-in path).
    useReferralClaim(user?.id, loading);

    // If user is already onboarded and visits /onboarding, redirect to home
    React.useEffect(() => {
        if (loading) return;

        if (user) {
            const localDesignation = localStorage.getItem('user_designation');
            const hasDesignation = user.user_metadata?.designation || profile?.designation || localDesignation;

            if (hasDesignation && location.pathname === '/onboarding') {
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
        location.pathname.startsWith('/combined-') ||
        // Exam sessions: the student join flow, the classroom projector screen and print views
        location.pathname === '/join' ||
        location.pathname.startsWith('/join/') ||
        location.pathname.startsWith('/j/') ||
        // The examiner's phone after scanning a live exam's share QR
        location.pathname.startsWith('/share-exam/') ||
        // Invite links: the invited educator's landing page, and the inviter's phone after the QR
        location.pathname.startsWith('/invite/') ||
        location.pathname.startsWith('/share-invite/') ||
        // Survey 1.0 and later (/survey/v1): one question per screen, nothing around it
        location.pathname.startsWith('/survey/') ||
        /^\/exams\/[^/]+\/(present|report-cards)$/.test(location.pathname) ||
        /^\/batches\/[^/]+\/slips$/.test(location.pathname);

    const hideFooter = isLiveTestPage || isResultsPage || isCreateTestPage;

    // Old Panna (PDF tools) URLs only show a loader while redirecting to pdf.testoza.com.
    const isPannaPage = location.pathname === '/pdf' || location.pathname.startsWith('/pdf/');

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
        isPannaPage ||
        isLiveTestPage ||
        isResultsPage ||
        location.pathname === '/' ||
        location.pathname === '/support' ||
        location.pathname === '/about' ||
        location.pathname === '/convert' ||
        location.pathname === '/privacy-policy' ||
        location.pathname === '/terms-and-conditions' ||
        GUIDE_PATHS.has(location.pathname) ||
        location.pathname === '/create-mock-test-online' ||
        // Google Ads landing pages: a visitor from an ad should not see the app's menu.
        location.pathname === '/quiz-creator' ||
        location.pathname === '/assessment-platform' ||
        (location.pathname === '/dashboard' && !user);

    const handleToggleSidebar = () => {
        if (window.innerWidth < 768) {
            setMobileOpen(!mobileOpen);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };

    const isLandingPage = !isBlogSubdomain && location.pathname === '/';

    return (
        <div className="min-h-screen bg-slate-50 dashboard-mesh-bg flex flex-col">
            {!isLiveTestPage && !isLandingPage && !isPannaPage && (
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

            {/* Global Popup Authentication & Onboarding Modal */}
            <AuthModal />

            {/* "How did TestoZa do?" after a creator stops an exam; minimises into the menu's Feedback. */}
            {user && <FeedbackDock />}
        </div>
    );
}

