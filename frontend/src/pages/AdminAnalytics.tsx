import React, { useEffect, useState, useCallback } from 'react';
import { analyticsApi } from '@/lib/analyticsApi';
import { Loader2, TrendingUp, TrendingDown, Users, FileText, AlertTriangle, CheckCircle2, Clock, BarChart3, RefreshCw, UserX, List, ArrowUpDown, ArrowUp, ArrowDown, Search, Upload, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

// ─── Reusable Stat Card ───────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10' }: any) {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className={`${bgColor} rounded-lg p-2`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    );
}

// ─── Colors ───────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6'];

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'users' | 'visitors' | 'creation' | 'logs'>('overview');
    const [days, setDays] = useState(1);

    // Data states
    const [funnel, setFunnel] = useState<any>(null);
    const [locations, setLocations] = useState<any>(null);
    const [testMatrix, setTestMatrix] = useState<any[]>([]);
    const [userMatrix, setUserMatrix] = useState<any[]>([]);
    const [creationStats, setCreationStats] = useState<any>(null);
    const [visitorStats, setVisitorStats] = useState<any>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [anonStats, setAnonStats] = useState<any>(null);
    const [attemptLogs, setAttemptLogs] = useState<any[]>([]);
    const [uploadLogs, setUploadLogs] = useState<any[]>([]);
    const [detailedVisitors, setDetailedVisitors] = useState<any[]>([]);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tabLoading, setTabLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Lazy load visitor page views
    const [visitorPages, setVisitorPages] = useState<Record<string, any[]>>({});
    const [fetchingPagesId, setFetchingPagesId] = useState<string | null>(null);

    // Cache to prevent duplicate database calls for tabs that have already loaded
    const loadedTabsRef = React.useRef<Record<string, number>>({});

    // Test Matrix sort & filter
    const [sortField, setSortField] = useState<string>('starts');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [filterText, setFilterText] = useState('');

    // Visitor filters & search
    const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);
    const [visitorSearch, setVisitorSearch] = useState('');
    const [visitorTypeFilter, setVisitorTypeFilter] = useState<'all' | 'registered' | 'repeat_guest' | 'guest'>('all');

    const handleFetchVisitorPages = async (visitorId: string) => {
        if (visitorPages[visitorId]) {
            setExpandedVisitorId(expandedVisitorId === visitorId ? null : visitorId);
            return;
        }
        try {
            setFetchingPagesId(visitorId);
            const pages = await analyticsApi.getVisitorPages(visitorId);
            setVisitorPages(prev => ({ ...prev, [visitorId]: pages || [] }));
            setExpandedVisitorId(visitorId);
        } catch (error) {
            console.error("Failed to fetch page views:", error);
            toast.error("Failed to load page views.");
        } finally {
            setFetchingPagesId(null);
        }
    };

    const fetchActiveTabData = useCallback(async (tabId: string, daysValue: number, force = false) => {
        if (!force && loadedTabsRef.current[tabId] === daysValue) {
            setTabLoading(false);
            return;
        }

        try {
            setIsRefreshing(true);
            setTabLoading(true);
            
            if (tabId === 'overview') {
                const [funnelData, locationsData, overviewData, trendsData, anonData] = await Promise.all([
                    analyticsApi.getTestFunnel(daysValue),
                    analyticsApi.getVisitorLocations(daysValue),
                    analyticsApi.getOverviewStats(daysValue).catch(() => null),
                    analyticsApi.getDailyTrends(daysValue).catch(() => []),
                    analyticsApi.getAnonSummary(daysValue).catch(() => null),
                ]);
                setFunnel(funnelData);
                setLocations(locationsData);
                setVisitorStats(overviewData);
                setTrends(trendsData || []);
                setAnonStats(anonData);
            } else if (tabId === 'tests') {
                const testData = await analyticsApi.getTestMatrix(daysValue);
                setTestMatrix(testData || []);
            } else if (tabId === 'users') {
                const userData = await analyticsApi.getUserMatrix(daysValue);
                setUserMatrix(userData || []);
            } else if (tabId === 'visitors') {
                const visitorsData = await analyticsApi.getDetailedVisitors(daysValue);
                setDetailedVisitors(visitorsData || []);
            } else if (tabId === 'logs') {
                const logsData = await analyticsApi.getAttemptLogs(daysValue, 200);
                setAttemptLogs(logsData || []);
            } else if (tabId === 'creation') {
                const [createData, uploadData] = await Promise.all([
                    analyticsApi.getTestCreationStats(daysValue),
                    analyticsApi.getUploadLogs(daysValue).catch(() => ({ uploads: [] })),
                ]);
                setCreationStats(createData);
                setUploadLogs(uploadData?.uploads || []);
            }

            loadedTabsRef.current[tabId] = daysValue;
            setLastRefreshed(new Date());
        } catch (error) {
            console.error(`Failed to fetch ${tabId} analytics:`, error);
            toast.error(`Failed to load ${tabId} analytics.`);
        } finally {
            setTabLoading(false);
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (loadedTabsRef.current[activeTab] !== days) {
            setTabLoading(true);
        }
        fetchActiveTabData(activeTab, days);
    }, [activeTab, days, fetchActiveTabData]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'tests', label: 'Test Matrix', icon: FileText },
        { id: 'users', label: 'User Matrix', icon: Users },
        { id: 'visitors', label: 'Visitor Analytics', icon: Users },
        { id: 'logs', label: 'Detailed Sessions', icon: List },
        { id: 'creation', label: 'Creation / Upload', icon: Upload },
    ];

    // Location chart data
    const locationBarData = (locations?.countries || [])
        .filter((c: any) => c.name !== 'Unknown')
        .slice(0, 10);

    // Funnel bar data
    const funnelBarData = funnel ? [
        { name: 'Started', value: funnel.total_started, fill: '#3b82f6' },
        { name: 'Submitted', value: funnel.total_submitted, fill: '#22c55e' },
        { name: 'Abandoned', value: funnel.total_abandoned, fill: '#ef4444' },
        { name: 'In Progress', value: funnel.total_in_progress, fill: '#f59e0b' },
    ] : [];

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">Complete platform insights and test performance metrics.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        {isRefreshing ? 'Refreshing...' : `Updated ${lastRefreshed.toLocaleTimeString()}`}
                    </span>
                    <button
                        onClick={() => fetchActiveTabData(activeTab, days, true)}
                        disabled={isRefreshing}
                        title="Refresh analytics"
                        className="p-2 rounded-lg border bg-card hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value={1}>Today (1 day)</option>
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={60}>Last 60 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start relative">
                {/* Mobile hamburger menu top bar */}
                <div className="lg:hidden w-full flex items-center justify-between bg-card p-3 border rounded-xl shadow-sm mb-2 sticky top-16 z-30">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Analytics Sections
                    </span>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted text-sm font-medium transition-colors"
                    >
                        {isMobileMenuOpen ? (
                            <>
                                <X className="h-4 w-4" /> Close
                            </>
                        ) : (
                            <>
                                <Menu className="h-4 w-4" /> Menu
                            </>
                        )}
                    </button>
                </div>

                {/* Mobile overlay menu drawer */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden fixed inset-0 z-40 flex">
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        
                        {/* Drawer Content */}
                        <aside className="relative flex flex-col w-72 max-w-[80vw] h-full bg-card p-6 border-r shadow-2xl animate-in slide-in-from-left duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <span className="font-bold text-lg text-indigo-600">Navigation</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <nav className="flex flex-col gap-1.5">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id as any);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full group
                              ${activeTab === tab.id
                                                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        <tab.icon className={`h-4.5 w-4.5 transition-colors ${
                                            activeTab === tab.id 
                                                ? 'text-white' 
                                                : 'text-muted-foreground group-hover:text-foreground'
                                        }`} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </aside>
                    </div>
                )}

                {/* Desktop sidebar navigation - sticky top-20 to keep menu on screen when scrolling */}
                <aside className="hidden lg:block w-64 shrink-0 sticky top-20 self-start">
                    <nav className="flex flex-col gap-1.5 rounded-xl bg-card p-2 border shadow-sm w-full border-slate-200 dark:border-slate-800">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Analytics Sections
                        </div>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full group
                      ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <tab.icon className={`h-4.5 w-4.5 transition-colors ${
                                    activeTab === tab.id 
                                        ? 'text-white' 
                                        : 'text-muted-foreground group-hover:text-foreground'
                                }`} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Right side content pane */}
                <main className="flex-grow w-full min-w-0">
                    {tabLoading ? (
                        <div className="flex h-[400px] w-full items-center justify-center rounded-xl border bg-card p-8 shadow-sm">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground animate-pulse">Fetching latest data...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ════════ OVERVIEW TAB ════════ */}
                            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Top-level funnel cards - Registered Users */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard title="Tests Started" value={funnel?.total_started || 0} icon={TrendingUp} color="text-blue-500" bgColor="bg-blue-500/10" />
                        <StatCard title="Submitted" value={funnel?.total_submitted || 0} icon={CheckCircle2} color="text-green-500" bgColor="bg-green-500/10" />
                        <StatCard title="Abandoned" value={funnel?.total_abandoned || 0} icon={AlertTriangle} color="text-red-500" bgColor="bg-red-500/10" />
                        <StatCard title="In Progress" value={funnel?.total_in_progress || 0} icon={Clock} color="text-yellow-500" bgColor="bg-yellow-500/10" />
                        <StatCard title="Completion Rate" value={`${funnel?.completion_rate || 0}%`} icon={TrendingUp} color="text-indigo-500" bgColor="bg-indigo-500/10" />
                        <StatCard title="Avg Completion" value={`${funnel?.avg_completion_percentage || 0}%`} icon={BarChart3} color="text-purple-500" bgColor="bg-purple-500/10" />
                    </div>

                    {/* Anonymous Traffic Section — completely separate */}
                    <div className="rounded-xl border-2 border-dashed border-orange-400/40 bg-orange-500/5 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <UserX className="h-5 w-5 text-orange-500" />
                            <h3 className="text-base font-semibold">Anonymous Traffic (Guest Users)</h3>
                            <span className="ml-auto text-xs text-muted-foreground">Tracked separately · No account required</span>
                        </div>
                        {anonStats ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <StatCard title="Anon Started" value={anonStats.total ?? 0} icon={Users} color="text-orange-500" bgColor="bg-orange-500/10" />
                                <StatCard title="Anon Submitted" value={anonStats.submitted ?? 0} icon={CheckCircle2} color="text-green-500" bgColor="bg-green-500/10" />
                                <StatCard title="Anon In Progress" value={anonStats.in_progress ?? 0} icon={Clock} color="text-yellow-500" bgColor="bg-yellow-500/10" />
                                <StatCard title="Anon Abandoned" value={anonStats.abandoned ?? 0} icon={AlertTriangle} color="text-red-500" bgColor="bg-red-500/10" />
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No anonymous attempts yet in this period.</p>
                        )}
                    </div>

                    {/* Visitor stats row */}
                    {visitorStats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard title="Total Visitors" value={visitorStats.total_visitors} icon={Users} color="text-blue-500" bgColor="bg-blue-500/10" />
                            <StatCard title="Page Views" value={visitorStats.total_page_views} icon={FileText} color="text-indigo-500" bgColor="bg-indigo-500/10" />
                            <StatCard title="Sessions" value={visitorStats.total_sessions} icon={TrendingUp} color="text-green-500" bgColor="bg-green-500/10" />
                            <StatCard title="Bounce Rate" value={`${visitorStats.bounce_rate}%`} icon={TrendingDown} color="text-red-500" bgColor="bg-red-500/10" />
                        </div>
                    )}

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Funnel Bar Chart */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Test Attempt Funnel</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={funnelBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {funnelBarData.map((entry: any, index: number) => (
                                            <Cell key={index} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* User Locations */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Visitor Locations (by Country)</h3>
                            {locationBarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={locationBarData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                        <Bar dataKey="visitors" fill="#6366f1" radius={[0, 6, 6, 0]} name="Visitors" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No location data yet. It will populate as visitors browse.</div>
                            )}
                        </div>
                    </div>

                    {/* Top Cities Table */}
                    {locations?.top_cities?.length > 0 && (
                        <div className="rounded-xl border bg-card shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="text-lg font-semibold">Top Cities</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                                {locations.top_cities.map((city: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                        <span className="text-sm truncate mr-2">{city.name}</span>
                                        <span className="text-sm font-mono font-medium text-primary">{city.visitors}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Visitor Trends */}
                    {trends.length > 0 && (
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Daily Visitor Trend</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={trends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="stat_date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="total_page_views" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="Page Views" />
                                    <Area type="monotone" dataKey="total_visitors" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Visitors" />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ════════ TEST MATRIX TAB ════════ */}
            {activeTab === 'tests' && (() => {
                const SortIcon = ({ field }: { field: string }) => {
                    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
                    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
                };
                const toggleSort = (field: string) => {
                    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortField(field); setSortDir('desc'); }
                };
                const filtered = testMatrix.filter((t: any) =>
                    !filterText || (t.title || '').toLowerCase().includes(filterText.toLowerCase()) || (t.creator_name || '').toLowerCase().includes(filterText.toLowerCase())
                );
                const sorted = [...filtered].sort((a: any, b: any) => {
                    let av = a[sortField], bv = b[sortField];
                    if (typeof av === 'string') av = av.toLowerCase();
                    if (typeof bv === 'string') bv = bv.toLowerCase();
                    if (av < bv) return sortDir === 'asc' ? -1 : 1;
                    if (av > bv) return sortDir === 'asc' ? 1 : -1;
                    return 0;
                });
                const cols = [
                    { key: 'title', label: 'Test Title', align: 'left' },
                    { key: 'creator_name', label: 'Creator', align: 'left' },
                    { key: 'starts', label: 'Starts', align: 'center' },
                    { key: 'submitted', label: 'Submitted', align: 'center' },
                    { key: 'abandoned', label: 'Abandoned', align: 'center' },
                    { key: 'in_progress', label: 'In Progress', align: 'center' },
                    { key: 'completion_rate', label: 'Completion %', align: 'center' },
                    { key: 'anonymous_count', label: 'Anon', align: 'center' },
                    { key: 'test_created_at', label: 'Created', align: 'left' },
                ];
                return (
                    <div className="space-y-4">
                        {/* Filter input */}
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter by title or creator..."
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                className="w-full rounded-lg border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        {cols.map(col => (
                                            <th
                                                key={col.key}
                                                onClick={() => toggleSort(col.key)}
                                                className={`px-4 py-3 font-semibold cursor-pointer select-none hover:bg-muted/50 transition-colors text-${col.align}`}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {col.label}
                                                    <SortIcon field={col.key} />
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sorted.length === 0 ? (
                                        <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No test attempt data found for this period.</td></tr>
                                    ) : (
                                        sorted.map((t: any, i: number) => (
                                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-medium max-w-[200px] truncate">{t.title}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{t.creator_name}</td>
                                                <td className="px-4 py-3 text-center font-mono">{t.starts}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">{t.submitted}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">{t.abandoned}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">{t.in_progress}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                                            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${t.completion_rate}%` }} />
                                                        </div>
                                                        <span className="text-xs font-mono">{t.completion_rate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-muted-foreground">{t.anonymous_count}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                    {t.test_created_at ? new Date(t.test_created_at).toLocaleDateString() : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* ════════ USER MATRIX TAB ════════ */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                                    <th className="px-4 py-3 text-center font-semibold">Tests</th>
                                    <th className="px-4 py-3 text-center font-semibold">Submitted</th>
                                    <th className="px-4 py-3 text-center font-semibold">Abandoned</th>
                                    <th className="px-4 py-3 text-center font-semibold">In Progress</th>
                                    <th className="px-4 py-3 text-center font-semibold">Avg %</th>
                                    <th className="px-4 py-3 text-left font-semibold">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {userMatrix.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No user attempt data found for this period.</td></tr>
                                ) : (
                                    userMatrix.map((u: any, i: number) => (
                                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3 font-medium">
                                                {u.user_id === 'anonymous' ? (
                                                    <span className="text-muted-foreground italic">Anonymous Users</span>
                                                ) : u.full_name}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                                            <td className="px-4 py-3 text-center font-mono">{u.tests_started}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">{u.submitted}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">{u.abandoned}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">{u.in_progress}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{u.avg_completion}%</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {u.last_active ? new Date(u.last_active).toLocaleString() : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════ TEST CREATION TAB ════════ */}
            {activeTab === 'creation' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Tests Created" value={creationStats?.total_created || 0} icon={FileText} color="text-indigo-500" bgColor="bg-indigo-500/10" subtitle={`In the last ${days} days`} />
                    </div>

                    {/* Daily creation chart */}
                    {creationStats?.daily_trend?.length > 0 && (
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4">Tests Created Per Day</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={creationStats.daily_trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Tests Created" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Recent tests list */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold">Recently Created Tests</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                                    <th className="px-4 py-3 text-left font-semibold">Creator</th>
                                    <th className="px-4 py-3 text-center font-semibold">Visibility</th>
                                    <th className="px-4 py-3 text-left font-semibold">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {(creationStats?.tests || []).slice(0, 25).map((t: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 font-medium max-w-[250px] truncate">{t.title}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{t.creator_name || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.visibility === 'public' ? 'bg-green-500/10 text-green-600' :
                                                t.visibility === 'private' ? 'bg-red-500/10 text-red-600' :
                                                    'bg-yellow-500/10 text-yellow-600'
                                                }`}>{t.visibility || (t.is_public ? 'public' : 'private')}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(t.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Recent Uploads (Materials/Links) */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Upload className="h-5 w-5 text-green-500" />
                                Recent Document & Link Uploads
                            </h3>
                            <span className="text-xs text-muted-foreground">Files, PDFs, Video Links</span>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="px-4 py-3 text-left font-semibold">Title / Name</th>
                                    <th className="px-4 py-3 text-left font-semibold">Uploader</th>
                                    <th className="px-4 py-3 text-center font-semibold">Type</th>
                                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {uploadLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No recent uploads found.</td></tr>
                                ) : (
                                    uploadLogs.map((log: any, i: number) => (
                                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <a
                                                        href={log.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-primary hover:underline truncate max-w-[300px]"
                                                    >
                                                        {log.title}
                                                    </a>
                                                    {log.uploader_email && <span className="text-xs text-muted-foreground">{log.uploader_email}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{log.uploader_name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${log.type === 'link'
                                                    ? 'bg-blue-500/10 text-blue-600 border-blue-200'
                                                    : 'bg-indigo-500/10 text-indigo-600 border-indigo-200'
                                                    }`}>
                                                    {log.type === 'link' ? 'LINK' : (log.file_ext || 'FILE')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-200">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Uploaded
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(log.uploaded_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════ DETAILED ATTEMPT LOGS TAB ════════ */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <List className="h-5 w-5 text-indigo-500" />
                                Live Attempt Logs
                            </h3>
                            <span className="text-sm text-muted-foreground">{attemptLogs.length} recent sessions</span>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="px-4 py-3 text-left font-semibold">User</th>
                                    <th className="px-4 py-3 text-left font-semibold">Test / Location</th>
                                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                                    <th className="px-4 py-3 text-center font-semibold">%</th>
                                    <th className="px-4 py-3 text-left font-semibold">Timeline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {attemptLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No recent attempts logged.</td></tr>
                                ) : (
                                    attemptLogs.map((log: any, i: number) => {
                                        const startTime = new Date(log.started_at);
                                        const leaveTime = new Date(log.last_active);
                                        
                                        // Calculate duration in m and s
                                        const diffMs = Math.max(0, leaveTime.getTime() - startTime.getTime());
                                        const diffSec = Math.floor(diffMs / 1000);
                                        const mins = Math.floor(diffSec / 60);
                                        const secs = diffSec % 60;
                                        const hours = Math.floor(mins / 60);
                                        const remainingMins = mins % 60;
                                        let durationStr = "";
                                        if (hours > 0) {
                                            durationStr = `${hours}h ${remainingMins}m`;
                                        } else if (mins > 0) {
                                            durationStr = `${mins}m ${secs}s`;
                                        } else {
                                            durationStr = `${secs}s`;
                                        }

                                        const dateStr = startTime.toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            timeZone: 'Asia/Kolkata'
                                        });
                                        const startStr = startTime.toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true,
                                            timeZone: 'Asia/Kolkata'
                                        });
                                        const leaveStr = leaveTime.toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true,
                                            timeZone: 'Asia/Kolkata'
                                        });

                                        return (
                                            <tr key={i} className="hover:bg-muted/20 transition-colors group">
                                                <td className="px-4 py-3 font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="flex items-center gap-2">
                                                            {log.type === 'anonymous' ? <UserX className="h-4 w-4 text-orange-500" /> : <Users className="h-4 w-4 text-blue-500" />}
                                                            {log.user_name}
                                                        </span>
                                                        {log.user_email && <span className="text-xs text-muted-foreground ml-6">{log.user_email}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col max-w-[250px]">
                                                        <span className="font-medium truncate" title={log.test_title}>{log.test_title}</span>
                                                        <span className="text-xs text-muted-foreground truncate" title={log.location}>{log.location}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {log.status === 'submitted' ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 border border-green-200">Submitted</span>
                                                    ) : log.status === 'abandoned' ? (
                                                        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200">Abandoned</span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-600 border border-yellow-200">In Progress</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1 cursor-help" title={log.reason ? `Reason: ${log.reason}` : undefined}>
                                                        <span className="text-xs font-mono font-medium">{log.completion_pct}%</span>
                                                        <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all ${log.status === 'submitted' ? 'bg-green-500' : log.status === 'abandoned' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${log.completion_pct}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col text-xs space-y-1">
                                                        <span className="text-foreground"><span className="text-muted-foreground">Date:</span> {dateStr}</span>
                                                        <span className="text-foreground"><span className="text-muted-foreground">Start:</span> {startStr}</span>
                                                        <span className="text-foreground">
                                                            <span className="text-muted-foreground">
                                                                {log.status === 'submitted' ? 'End:' : log.status === 'abandoned' ? 'Left:' : 'Active:'}
                                                            </span>{' '}
                                                            {leaveStr} ({durationStr})
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════ VISITORS TAB ════════ */}
            {activeTab === 'visitors' && (
                <div className="space-y-6">
                    {/* Visitor stats overview */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard 
                            title="Total Visitors" 
                            value={detailedVisitors.length} 
                            subtitle="Distinct visitor fingerprints"
                            icon={Users} 
                            color="text-indigo-500" 
                            bgColor="bg-indigo-500/10" 
                        />
                        <StatCard 
                            title="Registered Users" 
                            value={detailedVisitors.filter((v: any) => v.visitor_type === 'registered').length} 
                            subtitle="Logged in accounts tracked"
                            icon={CheckCircle2} 
                            color="text-emerald-500" 
                            bgColor="bg-emerald-500/10" 
                        />
                        <StatCard 
                            title="Repeat Guests" 
                            value={detailedVisitors.filter((v: any) => v.visitor_type === 'repeat_guest').length} 
                            subtitle="Anonymous but returned > 1 time"
                            icon={RefreshCw} 
                            color="text-blue-500" 
                            bgColor="bg-blue-500/10" 
                        />
                        <StatCard 
                            title="One-Time Guests" 
                            value={detailedVisitors.filter((v: any) => v.visitor_type === 'guest').length} 
                            subtitle="Single session guest visits"
                            icon={UserX} 
                            color="text-amber-500" 
                            bgColor="bg-amber-500/10" 
                        />
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search fingerprint, name, email, region..."
                                    value={visitorSearch}
                                    onChange={(e) => setVisitorSearch(e.target.value)}
                                    className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by type:</span>
                                <select
                                    value={visitorTypeFilter}
                                    onChange={(e: any) => setVisitorTypeFilter(e.target.value)}
                                    className="w-full sm:w-auto rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Visitors</option>
                                    <option value="registered">Registered Users</option>
                                    <option value="repeat_guest">Repeat Guests</option>
                                    <option value="guest">One-Time Guests</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Visitors Table */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="px-6 py-3.5 text-left font-semibold">Visitor Identity / Fingerprint</th>
                                        <th className="px-6 py-3.5 text-left font-semibold">Type</th>
                                        <th className="px-6 py-3.5 text-left font-semibold">Location / Region</th>
                                        <th className="px-6 py-3.5 text-left font-semibold">Tech Stack</th>
                                        <th className="px-6 py-3.5 text-center font-semibold">Total Visits</th>
                                        <th className="px-6 py-3.5 text-left font-semibold">Last Active (IST)</th>
                                        <th className="px-6 py-3.5 text-center font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {detailedVisitors
                                        .filter((v: any) => {
                                            const matchesSearch = 
                                                v.fingerprint?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                v.full_name?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                v.email?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                v.country?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                v.city?.toLowerCase().includes(visitorSearch.toLowerCase());
                                                
                                            if (!matchesSearch) return false;
                                            
                                            if (visitorTypeFilter === 'all') return true;
                                            return v.visitor_type === visitorTypeFilter;
                                        })
                                        .length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                                    No matching visitors found.
                                                </td>
                                            </tr>
                                        ) : (
                                            detailedVisitors
                                                .filter((v: any) => {
                                                    const matchesSearch = 
                                                        v.fingerprint?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                        v.full_name?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                        v.email?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                        v.country?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
                                                        v.city?.toLowerCase().includes(visitorSearch.toLowerCase());
                                                        
                                                    if (!matchesSearch) return false;
                                                    
                                                    if (visitorTypeFilter === 'all') return true;
                                                    return v.visitor_type === visitorTypeFilter;
                                                })
                                                .map((v: any) => {
                                                    const isExpanded = expandedVisitorId === v.id;
                                                    const lastSeen = new Date(v.last_seen_at);
                                                    const lastSeenStr = lastSeen.toLocaleString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                        hour12: true,
                                                        timeZone: 'Asia/Kolkata'
                                                    });

                                                    return (
                                                        <React.Fragment key={v.id}>
                                                            <tr className="hover:bg-muted/10 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        {v.visitor_type === 'registered' ? (
                                                                            <div className="font-semibold text-foreground">
                                                                                {v.full_name}
                                                                                <span className="text-xs text-muted-foreground block font-normal">{v.email}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-mono text-xs text-muted-foreground" title={v.fingerprint}>
                                                                                FP: {v.fingerprint?.substring(0, 16)}...{v.fingerprint?.substring(v.fingerprint.length - 8)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {v.visitor_type === 'registered' ? (
                                                                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200">Registered</span>
                                                                    ) : v.visitor_type === 'repeat_guest' ? (
                                                                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-200">Repeat Guest</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">One-Time Guest</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-foreground">
                                                                    <div className="flex flex-col">
                                                                        <span>{v.city || 'Unknown'}, {v.country || 'Unknown'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-muted-foreground">
                                                                    <div className="flex flex-col">
                                                                        <span className="capitalize">{v.device_type}</span>
                                                                        <span>{v.browser} ({v.os})</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground border">{v.total_visits}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                                                                    {lastSeenStr}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <button
                                                                        onClick={() => isExpanded ? setExpandedVisitorId(null) : handleFetchVisitorPages(v.id)}
                                                                        disabled={fetchingPagesId === v.id}
                                                                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors p-1.5 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
                                                                    >
                                                                        {fetchingPagesId === v.id ? (
                                                                            <>
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                                Loading...
                                                                            </>
                                                                        ) : isExpanded ? (
                                                                            <>
                                                                                <ChevronUp className="h-4 w-4" />
                                                                                Hide Pages
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown className="h-4 w-4" />
                                                                                View Pages ({v.total_page_views || 0})
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr className="bg-muted/10">
                                                                    <td colSpan={7} className="px-8 py-4 border-l-4 border-l-indigo-500 bg-indigo-50/5">
                                                                        <div className="space-y-3">
                                                                            <h4 className="font-semibold text-xs text-muted-foreground tracking-wider uppercase">Page Views Timeline (Recent first)</h4>
                                                                            {visitorPages[v.id]?.length === 0 ? (
                                                                                <p className="text-xs text-muted-foreground italic">No page view events recorded for this session range.</p>
                                                                            ) : (
                                                                                <div className="relative pl-6 border-l border-indigo-200/50 space-y-4">
                                                                                    {(visitorPages[v.id] || []).map((pv: any, idx: number) => {
                                                                                        const pvTime = new Date(pv.time);
                                                                                        const pvTimeStr = pvTime.toLocaleTimeString('en-IN', {
                                                                                            hour: '2-digit',
                                                                                            minute: '2-digit',
                                                                                            second: '2-digit',
                                                                                            hour12: true,
                                                                                            timeZone: 'Asia/Kolkata'
                                                                                        });
                                                                                        return (
                                                                                            <div key={idx} className="relative flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                                                                                {/* Timeline node dot */}
                                                                                                <div className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                                                                                                
                                                                                                <div className="flex flex-col">
                                                                                                    <span className="font-medium text-foreground">{pv.title || 'Untitled Page'}</span>
                                                                                                    <span className="font-mono text-muted-foreground text-[11px]">{pv.path}</span>
                                                                                                </div>
                                                                                                <div className="text-[11px] font-mono text-muted-foreground sm:text-right">
                                                                                                    {pvTimeStr}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
