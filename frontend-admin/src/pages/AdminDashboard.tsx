import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { 
    BarChart3, Wrench, Upload, CreditCard, Ticket, LogOut, Loader2,
    FolderKanban, PlusCircle, Sparkles, GraduationCap, Newspaper
} from 'lucide-react';
import { toast } from 'sonner';

import AdminLoginPanel from './AdminLoginPanel';
import AdminAnalyticsPanel from './AdminAnalyticsPanel';
import ManageTests from './ManageTests';
import CreateTestPage from './CreateTestPage';
import AITestImporter from './AITestImporter';
import MaterialsManager from './MaterialsManager';
import NewsFeed from './NewsFeed';
import AdminFeatureControlPanel from './AdminFeatureControlPanel';
import AdminPricingPanel from './AdminPricingPanel';
import AdminPromoCodesPanel from './AdminPromoCodesPanel';
import AdminMigrationPanel from './AdminMigrationPanel';
import AdminAiAuditPanel from './AdminAiAuditPanel';
import { authApi } from '@/lib/authApi';
import SplashLoader from '@/components/ui/SplashLoader';

type TabId = 'analytics' | 'tests' | 'builder' | 'importer' | 'ai_analysis' | 'ai_audit' | 'materials' | 'posts' | 'features' | 'pricing' | 'promos' | 'migration';

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

    const navigationGroups = [
        {
            title: "Core Platform",
            items: [
                { id: 'analytics' as const, label: 'Analytics & Matrix', icon: BarChart3 },
                { id: 'tests' as const, label: 'Manage Tests', icon: FolderKanban },
                { id: 'builder' as const, label: 'Test Builder', icon: PlusCircle },
                { id: 'importer' as const, label: 'AI Test Importer', icon: Sparkles },
                { id: 'ai_analysis' as const, label: 'AI Analysis & Audit', icon: Sparkles },
            ]
        },
        {
            title: "Content & Resources",
            items: [
                { id: 'materials' as const, label: 'Class Materials', icon: GraduationCap },
                { id: 'posts' as const, label: 'News & Announcements', icon: Newspaper },
            ]
        },
        {
            title: "System & Pricing",
            items: [
                { id: 'features' as const, label: 'Feature Control', icon: Wrench },
                { id: 'pricing' as const, label: 'Pricing Plans', icon: CreditCard },
                { id: 'promos' as const, label: 'Promo Codes', icon: Ticket },
                { id: 'migration' as const, label: 'Migration & Seed', icon: Upload },
            ]
        }
    ];

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans">
            <SEO title="Admin Workspace - TestoZa" noindex={true} />

            {/* Sidebar */}
            <aside className="w-full md:w-64 h-auto md:h-full bg-[#1e293b] text-slate-100 border-r border-slate-700/60 flex flex-col shrink-0 shadow-lg">
                <div className="p-5 border-b border-slate-700/60 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <h2 className="text-lg font-bold tracking-tight text-white">TestoZa Admin</h2>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[200px]" title={user.email}>{user.email}</p>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-6 overflow-y-auto min-h-0">
                    {navigationGroups.map((group, idx) => (
                        <div key={idx} className="space-y-1">
                            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{group.title}</p>
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                        (activeTab === item.id || (item.id === 'ai_analysis' && activeTab === 'ai_audit'))
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-700/60 bg-slate-900/40 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Panel Content */}
            <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'analytics' && <AdminAnalyticsPanel />}
                    {activeTab === 'tests' && <ManageTests />}
                    {activeTab === 'builder' && <CreateTestPage />}
                    {activeTab === 'importer' && <AITestImporter />}
                    {(activeTab === 'ai_analysis' || activeTab === 'ai_audit') && <AdminAiAuditPanel />}
                    {activeTab === 'materials' && <MaterialsManager />}
                    {activeTab === 'posts' && <NewsFeed />}
                    {activeTab === 'features' && <AdminFeatureControlPanel />}
                    {activeTab === 'pricing' && <AdminPricingPanel />}
                    {activeTab === 'promos' && <AdminPromoCodesPanel />}
                    {activeTab === 'migration' && <AdminMigrationPanel />}
                </div>
            </main>
        </div>
    );
}

