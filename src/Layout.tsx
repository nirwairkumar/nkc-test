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
            {!isLiveTestPage && <Navbar />}
            <main>
                <Outlet />
            </main>
        </div>
    );
}
