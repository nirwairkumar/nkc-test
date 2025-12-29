import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';

import { useNavigate } from 'react-router-dom';
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
        }
    }, [user, navigate]);
    // Hide navbar only on live test page (/test/:id)
    // Note: /test-intro/:id starts with /test-intro so it won't match /test/
    const isLiveTestPage = location.pathname.startsWith('/test/');

    return (
        <div className="min-h-screen bg-slate-50">
            {!isLiveTestPage && (
                <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <Navbar />
                </div>
            )}
            <main>
                <Outlet />
            </main>
        </div>
    );
}
