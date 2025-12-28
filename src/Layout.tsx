import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';

export default function Layout() {
    const location = useLocation();
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
