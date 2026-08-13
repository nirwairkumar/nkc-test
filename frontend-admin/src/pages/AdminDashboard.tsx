import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { 
    BarChart3, Wrench, Upload, CreditCard, Ticket, LogOut, Loader2,
    FolderKanban, PlusCircle, Sparkles, GraduationCap, Newspaper, PanelLeft, X,
    FileText, BookOpen, Users, Layers, Radio, Mail
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
import AdminEmailBroadcastPanel from './AdminEmailBroadcastPanel';
import { authApi } from '@/lib/authApi';
import { fetchConductModeTests } from '@/lib/testsApi';
import SplashLoader from '@/components/ui/SplashLoader';

type TabId = 'analytics' | 'tests' | 'categories' | 'users' | 'verified_creators' | 'combined' | 'activity' | 'builder' | 'importer' | 'ai_analysis' | 'ai_audit' | 'materials' | 'posts' | 'email_broadcast' | 'features' | 'pricing' | 'promos' | 'migration';

export default function AdminDashboard() {
    const { user, isAdmin, loading: authLoading, refreshSession } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as TabId) || 'analytics';
    const [conductCount, setConductCount] = useState<number>(0);

    useEffect(() => {
        const loadInitialConductCount = async () => {
            try {
                const { data, error } = await fetchConductModeTests();
                if (!error && data) {
                    setConductCount(data.length);
                }
            } catch (err) {
                console.error("Failed to load conduct mode tests count:", err);
            }
        };
        if (user && isAdmin) {
            loadInitialConductCount();
        }
    }, [user, isAdmin]);

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
                { id: 'tests' as const, label: 'Manage Tests', icon: FileText },
                { id: 'categories' as const, label: 'Categories', icon: BookOpen },
                { id: 'users' as const, label: 'Users', icon: Users },
                { id: 'verified_creators' as const, label: 'Verified Creators', icon: GraduationCap },
                { id: 'combined' as const, label: 'Combined Sessions', icon: Layers },
                { id: 'activity' as const, label: 'Live Activity', icon: Radio },
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
                { id: 'email_broadcast' as const, label: 'Email Broadcast', icon: Mail },
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

    const [mobileOpen, setMobileOpen] = useState<boolean>(false);

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans">
            <SEO title="Admin Workspace - TestoZa" noindex={true} />

            {/* Top Bar for Mobile Phone Screen */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1e293b] text-white border-b border-slate-700/60 shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Open Navigation Menu"
                    >
                        <PanelLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h2 className="text-sm font-bold tracking-tight text-white">TestoZa Admin</h2>
                    </div>
                </div>
                <span className="text-[10px] bg-indigo-600/80 text-white font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {activeTab}
                </span>
            </div>

            {/* Mobile Backdrop Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:sticky top-0 left-0 z-50 md:z-40 h-full md:h-full w-72 md:w-64 bg-[#1e293b] text-slate-100 border-r border-slate-700/60 flex flex-col shrink-0 shadow-2xl transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-4 md:p-5 border-b border-slate-700/60 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <h2 className="text-base md:text-lg font-bold tracking-tight text-white">TestoZa Admin</h2>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={user.email}>{user.email}</p>
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-6 overflow-y-auto min-h-0">
                    {navigationGroups.map((group, idx) => (
                        <div key={idx} className="space-y-1">
                            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{group.title}</p>
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        handleTabChange(item.id);
                                        setMobileOpen(false);
                                    }}
                                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                        (activeTab === item.id || (item.id === 'ai_analysis' && activeTab === 'ai_audit'))
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                >
                                    {item.id === 'activity' && conductCount > 0 ? (
                                        <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    ) : (
                                        <item.icon className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="truncate flex-1 text-left">{item.label}</span>
                                    {item.id === 'activity' && (
                                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                            activeTab === 'activity'
                                                ? 'bg-white/20 text-white border-white/30'
                                                : conductCount > 0
                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}>
                                            {conductCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-700/60 bg-slate-900/40 shrink-0">
                    <button
                        onClick={() => {
                            setMobileOpen(false);
                            handleLogout();
                        }}
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
                    {['tests', 'categories', 'users', 'verified_creators', 'combined', 'activity'].includes(activeTab) && (
                        <ManageTests activeTab={activeTab} />
                    )}
                    {activeTab === 'builder' && <CreateTestPage />}
                    {activeTab === 'importer' && <AITestImporter />}
                    {(activeTab === 'ai_analysis' || activeTab === 'ai_audit') && <AdminAiAuditPanel />}
                    {activeTab === 'materials' && <MaterialsManager />}
                    {activeTab === 'posts' && <NewsFeed />}
                    {activeTab === 'email_broadcast' && <AdminEmailBroadcastPanel />}
                    {activeTab === 'features' && <AdminFeatureControlPanel />}
                    {activeTab === 'pricing' && <AdminPricingPanel />}
                    {activeTab === 'promos' && <AdminPromoCodesPanel />}
                    {activeTab === 'migration' && <AdminMigrationPanel />}
                </div>
            </main>
        </div>
    );
}

