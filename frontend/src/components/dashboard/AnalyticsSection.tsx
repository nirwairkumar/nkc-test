import React from 'react';
import { BarChart2, TrendingUp, CheckCircle2, Award, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AnalyticsSectionProps {
    totalSubmissions?: number;
    weeklyData?: { day: string; count: number }[];
    scoreDistribution?: { topTierPct: number; avgTierPct: number; needsSupportPct: number };
}

export default function AnalyticsSection({
    totalSubmissions = 384,
    weeklyData = [
        { day: 'Mon', count: 24 },
        { day: 'Tue', count: 42 },
        { day: 'Wed', count: 35 },
        { day: 'Thu', count: 68 },
        { day: 'Fri', count: 54 },
        { day: 'Sat', count: 89 },
        { day: 'Sun', count: 72 },
    ],
    scoreDistribution = { topTierPct: 42, avgTierPct: 45, needsSupportPct: 13 },
}: AnalyticsSectionProps) {
    const navigate = useNavigate();

    const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                        <BarChart2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">Performance & Submissions Analytics</h2>
                        <p className="text-xs text-slate-400">Response trends and score distributions across all active tests</p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/analytics/full')}
                    className="h-8 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium flex items-center gap-1"
                >
                    <span>Full Analytics</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SVG Response Trend Chart */}
                <div className="lg:col-span-2 bg-slate-50/70 rounded-xl p-4 border border-slate-200/70">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Weekly Submissions</span>
                            <p className="text-lg font-bold text-slate-900 leading-none mt-0.5">{totalSubmissions} Submissions</p>
                        </div>
                        {totalSubmissions > 0 && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Active Response Rate
                            </span>
                        )}
                    </div>

                    {/* SVG Bar Chart */}
                    <div className="h-40 flex items-end justify-between gap-3 pt-6 px-2">
                        {weeklyData.map((d, idx) => {
                            const heightPct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                                    <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {d.count}
                                    </span>
                                    <div
                                        style={{ height: `${Math.max(heightPct, d.count > 0 ? 8 : 4)}%` }}
                                        className={`w-full ${d.count > 0 ? 'bg-indigo-500 group-hover:bg-indigo-600' : 'bg-slate-200'} rounded-t-md transition-all duration-300 relative`}
                                    />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{d.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Score Distribution Summary */}
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70 flex flex-col justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Score Range Breakdown</span>
                        <p className="text-lg font-bold text-slate-900 leading-none mt-0.5">Distribution</p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1">
                                    <span className="text-slate-600">Top Tier (&gt;80%)</span>
                                    <span className="font-bold text-emerald-600">{scoreDistribution.topTierPct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${scoreDistribution.topTierPct}%` }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1">
                                    <span className="text-slate-600">Average Tier (50% - 80%)</span>
                                    <span className="font-bold text-blue-600">{scoreDistribution.avgTierPct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${scoreDistribution.avgTierPct}%` }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-medium mb-1">
                                    <span className="text-slate-600">Needs Support (&lt;50%)</span>
                                    <span className="font-bold text-amber-600">{scoreDistribution.needsSupportPct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${scoreDistribution.needsSupportPct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-200/60">
                        Based on {totalSubmissions} recent student test attempts.
                    </p>
                </div>
            </div>
        </div>
    );
}
