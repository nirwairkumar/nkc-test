import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Check for redirect intent after login
    React.useEffect(() => {
        if (user) {
            const redirectPath = localStorage.getItem('auth_redirect_intent');
            if (redirectPath) {
                localStorage.removeItem('auth_redirect_intent');
                navigate(redirectPath);
            }

            // Force onboarding if designation is missing
            // Check if user has metadata and if designation is missing
            if (user.user_metadata && !user.user_metadata.designation) {
                // Allow staying on /onboarding
                if (location.pathname !== '/onboarding') {
                    navigate('/onboarding', { replace: true });
                }
            }
        }
    }, [user, navigate, location.pathname]);
    // Hide navbar only on live test page (/test/:id)
    // Note: /test-intro/:id starts with /test-intro so it won't match /test/
    const isLiveTestPage = location.pathname.startsWith('/test/');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {!isLiveTestPage && (
                <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <Navbar />
                </div>
            )}
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
