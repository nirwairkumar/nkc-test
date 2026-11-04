/**
 * team.testoza.com. Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md
 *
 * What renders depends on the session, not the URL: signed out → login, half signed in →
 * the next step, signed in → the dashboard. A module URL without its permission shows
 * "not available" (and the server would refuse its data anyway).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from '@/components/Shell';
import { ToastProvider } from '@/components/Toast';
import { CARD, Empty, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { SessionProvider, useSession } from '@/lib/session';
import type { Permission } from '@/lib/types';
import AccountPage from '@/pages/AccountPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import EmailPage from '@/pages/EmailPage';
import FeedbackPage from '@/pages/FeedbackPage';
import HomePage from '@/pages/HomePage';
import InboxPage from '@/pages/InboxPage';
import SupportPage from '@/pages/SupportPage';
import LoginPage from '@/pages/auth/LoginPage';
import SignInSteps from '@/pages/auth/SignInSteps';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Never retry "not allowed" or "signed out".
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
        },
    },
});

function Guard({ needs, children }: { needs: Permission; children: React.ReactNode }) {
    const { can } = useSession();
    if (can(needs)) return <>{children}</>;
    return (
        <div className={CARD}>
            <Empty icon={Lock} title="Not available to you">
                Your admin hasn’t given you access to this part. Ask them if you need it.
            </Empty>
        </div>
    );
}

function Screens() {
    const { status } = useSession();
    if (status === 'loading') return <Spinner label="Checking your sign-in…" />;
    if (status === 'signed_out') return <LoginPage />;
    if (status === 'step') return <SignInSteps />;
    return (
        <Shell>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/inbox" element={<Guard needs="inbox.view"><InboxPage /></Guard>} />
                <Route path="/support" element={<Guard needs="support.view"><SupportPage /></Guard>} />
                <Route path="/support/:id" element={<Guard needs="support.view"><SupportPage /></Guard>} />
                <Route path="/feedback" element={<Guard needs="feedback.view"><FeedbackPage /></Guard>} />
                <Route path="/analytics" element={<Guard needs="analytics.view"><AnalyticsPage /></Guard>} />
                <Route path="/email" element={<Guard needs="email.view"><EmailPage /></Guard>} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Shell>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <BrowserRouter>
                    <SessionProvider>
                        <Screens />
                    </SessionProvider>
                </BrowserRouter>
            </ToastProvider>
        </QueryClientProvider>
    );
}
