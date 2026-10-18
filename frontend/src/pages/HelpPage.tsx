/**
 * app.testoza.com/help: the sidebar's "Help". Inside the app (sidebar shown), so a
 * signed-in teacher writes without typing their name or email and sees our replies here.
 * The public twin is /support (pages/SupportPage.tsx), on testoza.com.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import HelpCenter from '@/components/help/HelpCenter';
import { REPLY_PROMISE } from '@/lib/helpContact';

export default function HelpPage() {
    const { user } = useAuth();
    const location = useLocation();
    const cameFrom = (location.state as { from?: string } | null)?.from ?? null;

    return (
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
            <SEO title="Help - TestoZa" description="Get help with TestoZa from a real person." noindex />
            <header className="mb-5">
                <p className="text-[12px] font-medium uppercase leading-none tracking-widest text-slate-400">Support</p>
                <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[26px]">Help</h1>
                <p className="mt-1.5 text-[14px] text-slate-600">Stuck on something? Write to us or WhatsApp us. {REPLY_PROMISE}</p>
            </header>
            <HelpCenter accountEmail={user?.email ?? null} cameFrom={cameFrom} />
        </div>
    );
}
