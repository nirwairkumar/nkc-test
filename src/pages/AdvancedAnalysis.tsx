import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Award, BrainCircuit, Activity, Zap } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';

// Helper to parse marks
const parseMark = (value: string | number | undefined, defaultVal: number = 0): number => {
    if (typeof value === 'number') return value;
    if (!value) return defaultVal;
    try {
        if (value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 2) {
                return parseFloat(parts[0]) / parseFloat(parts[1]);
            }
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultVal : parsed;
    } catch (e) {
        return defaultVal;
    }
};

import { fetchAdvancedAnalysis } from '@/lib/testsApi';
import { Loader2 } from 'lucide-react';

export default function AdvancedAnalysis() {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [analysisData, setAnalysisData] = React.useState<any>(null);

    const stateData = location.state as {
        test: any;
        answers: Record<number, string>;
        score: number;
        totalQuestions: number;
        marksPerQuestion: number;
        negativeMark: number;
    } | undefined;

    React.useEffect(() => {
        if (!stateData || !stateData.test) return;

        const loadAnalysis = async () => {
            setLoading(true);
            const { data, error } = await fetchAdvancedAnalysis(stateData.test, stateData.answers);
            if (error) {
                setError(error);
            } else {
                setAnalysisData(data);
            }
            setLoading(false);
        };
        loadAnalysis();
    }, [stateData]);

    if (!stateData || !stateData.test) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <h1 className="text-2xl font-bold mb-4 text-slate-800">No Data Available</h1>
                <Button onClick={() => navigate('/')}>Return Home</Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-600 font-medium animate-pulse">Running advanced AI models...</p>
            </div>
        );
    }

    if (error || !analysisData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Failed to load analysis</h1>
                <p className="text-slate-600 mb-6">{error || "Unknown error"}</p>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    const { test } = stateData;
    const {
        finalScore,
        totalMaxMarks,
        accuracy,
        percentage,
        correctCount,
        wrongCount,
        partialCount,
        pieData,
        radarData,
        barData,
        typeChartData
    } = analysisData;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Advanced Analytics</h1>
                            <p className="text-slate-500 font-medium">{test.title}</p>
                        </div>
                    </div>
                    <Badge className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                        Pro Analysis
                    </Badge>
                </div>

                {/* Top KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-md bg-white">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Score</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-800">{parseFloat(finalScore.toFixed(2))}</span>
                                    <span className="text-slate-400 font-medium">/ {totalMaxMarks}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-white">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Accuracy</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-800">{accuracy}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-white">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Percentile</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-800">{percentage}%</span>
                                </div>
                                <p className="text-xs text-emerald-600 font-medium mt-1">Based on marks</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-white">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Attempted</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-800">{correctCount + partialCount + wrongCount}</span>
                                    <span className="text-slate-400 font-medium">/ {test.questions.length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart - Radar for Sections */}
                    <Card className="lg:col-span-1 border-none shadow-md rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" /> Subject Mastery
                            </CardTitle>
                            <CardDescription>Relative performance across sections (%)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
                            {radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                                        <Radar
                                            name="Score %"
                                            dataKey="A"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fill="#818cf8"
                                            fillOpacity={0.5}
                                        />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-slate-400 text-sm">No section data available</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Breakdown Pie Chart */}
                    <Card className="lg:col-span-1 border-none shadow-md rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-800">Response Distribution</CardTitle>
                            <CardDescription>Breakdown of your answers</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Section Scores Bar Chart */}
                    <Card className="lg:col-span-1 border-none shadow-md rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-800">Section Yield</CardTitle>
                            <CardDescription>Absolute scores per section</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="Score" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Insights Below */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-800 flex justify-between">
                                <span>Question Type Analysis</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={typeChartData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 10, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="Correct" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
                                    <Bar dataKey="Partial" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Wrong" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md rounded-2xl bg-white overflow-hidden text-center flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                        <BrainCircuit className="w-16 h-16 mb-4 opacity-90" />
                        <h3 className="text-2xl font-bold mb-2 relative z-10">AI Performance Summary</h3>
                        <p className="opacity-90 relative z-10">
                            {accuracy > 80
                                ? "Excellent performance! Your accuracy is elite. Maintain this consistency."
                                : accuracy > 60
                                    ? "Good effort! Focus on reducing your negative marks and reviewing skipped topics."
                                    : "Needs improvement. Recommend strengthening core concepts before re-attempting."}
                        </p>
                    </Card>
                </div>

            </div>
        </div>
    );
}
