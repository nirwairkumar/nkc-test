import React, { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/analyticsApi';
import OverviewCards from '@/components/analytics/OverviewCards';
import VisitorTrendChart from '@/components/analytics/VisitorTrendChart';
import TopPagesTable from '@/components/analytics/TopPagesTable';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState([]);
    const [topPages, setTopPages] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [overviewData, trendsData, pagesData] = await Promise.all([
                    analyticsApi.getOverviewStats(30),
                    analyticsApi.getDailyTrends(30),
                    analyticsApi.getTopPages(30, 10)
                ]);

                setStats(overviewData);
                setTrends(trendsData);
                setTopPages(pagesData);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
                toast.error("Failed to load analytics dashboard.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Visitor Analytics</h1>
                <p className="text-muted-foreground">Monitor traffic, page views, and visitor behavior.</p>
            </div>

            <div className="flex flex-col gap-6">
                <OverviewCards stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                    <div className="lg:col-span-4">
                        <VisitorTrendChart data={trends} />
                    </div>
                    <div className="lg:col-span-2">
                        <TopPagesTable data={topPages} />
                    </div>
                </div>
            </div>
        </div>
    );
}
