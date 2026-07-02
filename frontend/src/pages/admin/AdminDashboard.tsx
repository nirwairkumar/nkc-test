import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Wrench, Upload, CreditCard, Ticket, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import AdminLoginPanel from './AdminLoginPanel';
import AdminAnalyticsPanel from './AdminAnalyticsPanel';
import AdminFeatureControlPanel from './AdminFeatureControlPanel';
import AdminMigrationPanel from './AdminMigrationPanel';
import AdminPricingPanel from './AdminPricingPanel';
import AdminPromoCodesPanel from './AdminPromoCodesPanel';
import { authApi } from '@/lib/authApi';
import SplashLoader from '@/components/ui/SplashLoader';

type TabId = 'analytics' | 'features' | 'migration' | 'pricing' | 'promos';

export default function AdminDashboard() {
    const { user, isAdmin, loading: authLoading, refreshSession } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as TabId) || 'analytics';

    const handleTabChange = (tabId: TabId) => {
        setSearchParams({ tab: tabId });
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
            toast.success('Logged out from admin panel');
            refreshSession();
        } catch (error) {
            toast.error('Logout failed');
        }
    };

    if (authLoading) {
        return <SplashLoader text="Checking permissions..." />;
    }

    if (!user || !isAdmin) {
        return <AdminLoginPanel onLoginSuccess={() => refreshSession()} />;
    }

    const navigationItems = [
        { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
        { id: 'features' as const, label: 'Feature Control', icon: Wrench },
        { id: 'migration' as const, label: 'Migration / Seed', icon: Upload },
        { id: 'pricing' as const, label: 'Pricing Plans', icon: CreditCard },
        { id: 'promos' as const, label: 'Promo Codes', icon: Ticket },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
            <SEO title="Admin Workspace - TestoZa" noindex={true} />

            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Admin Workspace</h2>
                    <p className="text-xs text-muted-foreground mt-1 truncate">Logged in as {user.email}</p>
                </div>
                <nav className="flex-1 p-4 space-y-1.5">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${activeTab === item.id
                                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <item.icon className="h-4.5 w-4.5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                        <LogOut className="h-4.5 w-4.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Panel Content */}
            <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">
                {activeTab === 'analytics' && <AdminAnalyticsPanel />}
                {activeTab === 'features' && <AdminFeatureControlPanel />}
                {activeTab === 'migration' && <AdminMigrationPanel />}
                {activeTab === 'pricing' && <AdminPricingPanel />}
                {activeTab === 'promos' && <AdminPromoCodesPanel />}
            </main>
        </div>
    );
}
