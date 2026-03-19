import React, { useEffect, useState, useCallback } from 'react';
import { analyticsApi } from '@/lib/analyticsApi';
import { Loader2, TrendingUp, TrendingDown, Users, FileText, AlertTriangle, CheckCircle2, Clock, BarChart3, RefreshCw, UserX, List } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'users' | 'creation' | 'logs'>('overview');
    const [days, setDays] = useState(30);

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
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAllData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setLoading(true);
            const [funnelData, locationsData, testData, userData, createData, overviewData, trendsData, anonData] =
                await Promise.all([
                    analyticsApi.getTestFunnel(days),
                    analyticsApi.getVisitorLocations(days),
                    analyticsApi.getTestMatrix(days),
                    analyticsApi.getUserMatrix(days),
                    analyticsApi.getTestCreationStats(days),
                    analyticsApi.getOverviewStats(days).catch(() => null),
                    analyticsApi.getDailyTrends(days).catch(() => []),
                    analyticsApi.getAnonSummary(days).catch(() => null),
                    analyticsApi.getAttemptLogs(days, 200).catch(() => []),
                ]);

            setFunnel(funnelData);
            setLocations(locationsData);
            setTestMatrix(testData || []);
            setUserMatrix(userData || []);
            setCreationStats(createData);
            setVisitorStats(overviewData);
            setTrends(trendsData || []);
            setAnonStats(anonData);
            setLastRefreshed(new Date());
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
            toast.error("Failed to load analytics.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [days]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

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
        { id: 'logs', label: 'Detailed Sessions', icon: List },
        { id: 'creation', label: 'Test Creation', icon: TrendingUp },
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
                        onClick={fetchAllData}
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
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={60}>Last 60 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 flex gap-1 rounded-xl bg-muted/50 p-1 border overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

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
            {activeTab === 'tests' && (
                <div className="space-y-4">
                    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="px-4 py-3 text-left font-semibold">Test Title</th>
                                    <th className="px-4 py-3 text-left font-semibold">Creator</th>
                                    <th className="px-4 py-3 text-center font-semibold">Starts</th>
                                    <th className="px-4 py-3 text-center font-semibold">Submitted</th>
                                    <th className="px-4 py-3 text-center font-semibold">Abandoned</th>
                                    <th className="px-4 py-3 text-center font-semibold">In Progress</th>
                                    <th className="px-4 py-3 text-center font-semibold">Completion %</th>
                                    <th className="px-4 py-3 text-center font-semibold">Anon</th>
                                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {testMatrix.length === 0 ? (
                                    <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No test attempt data found for this period.</td></tr>
                                ) : (
                                    testMatrix.map((t: any, i: number) => (
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
            )}

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
                                        const duration = Math.max(0, Math.round((leaveTime.getTime() - startTime.getTime()) / 60000));

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
                                                        <span className="text-foreground"><span className="text-muted-foreground">Start:</span> {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="text-foreground"><span className="text-muted-foreground">Left:</span> {leaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({duration}m)</span>
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
        </div>
    );
}
