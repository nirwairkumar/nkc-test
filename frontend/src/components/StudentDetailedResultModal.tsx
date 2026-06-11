import React, { useEffect, useState } from 'react';
import { fetchAdvancedAnalysis } from '@/lib/testsApi';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Trophy,
    Timer,
    Target,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    Loader2,
    X,
    ChevronDown,
    ChevronUp,
    BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface StudentDetailedResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    attempt: any;
    test: any;
    isAdmin?: boolean;
}

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

const getDisplayMark = (value: string | number | undefined, defaultVal: number = 0): string | number => {
    if (value === undefined || value === null || value === '') return defaultVal;
    if (typeof value === 'string' && value.includes('/')) return value;
    const num = parseFloat(value as string);
    return isNaN(num) ? defaultVal : num;
};

export default function StudentDetailedResultModal({
    isOpen,
    onClose,
    attempt,
    test,
    isAdmin = true
}: StudentDetailedResultModalProps) {
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'questions'>('overview');

    useEffect(() => {
        if (isOpen && attempt && test) {
            const loadAnalysis = async () => {
                setLoading(true);
                setError(null);
                try {
                    const answers = attempt.answers || {};
                    const { data, error } = await fetchAdvancedAnalysis(test, answers);
                    if (error) {
                        setError(error);
                    } else {
                        setAnalysisData(data);
                    }
                } catch (err: any) {
                    setError(err.message || 'Failed to analyze results');
                } finally {
                    setLoading(false);
                }
            };
            loadAnalysis();
        }
    }, [isOpen, attempt, test]);

    if (!isOpen || !attempt) return null;

    const isStartFormEnabled = !!test?.settings?.start_form?.enabled;
    const fields = test?.settings?.start_form?.fields && test.settings.start_form.fields.length > 0
        ? test.settings.start_form.fields
        : (isStartFormEnabled ? [{ label: 'Name', required: true }] : []);
    const configuredFormLabels = fields.map((f: any) => f?.label).filter(Boolean);

    const getDisplayName = () => {
        if (isStartFormEnabled && configuredFormLabels.length > 0) {
            const firstLabel = configuredFormLabels[0];
            if (attempt.metadata?.startFormData?.[firstLabel] !== undefined && attempt.metadata?.startFormData?.[firstLabel] !== null) {
                return String(attempt.metadata.startFormData[firstLabel]);
            }
        }
        const formData = attempt.metadata?.startFormData || {};
        const formKeys = Object.keys(formData);
        const pk = formKeys.find(k => k.toLowerCase().includes('name')) || (formKeys.length > 0 ? formKeys[0] : null);
        if (pk && formData[pk]) return String(formData[pk]);
        if (isAdmin && attempt.user?.full_name) return attempt.user.full_name;
        if (isAdmin && attempt.user?.email) return attempt.user.email;
        return 'Anonymous Candidate';
    };

    const getOtherDetails = () => {
        if (isStartFormEnabled) {
            const formData = attempt.metadata?.startFormData || {};
            return Object.entries(formData);
        }
        const formData = attempt.metadata?.startFormData || {};
        const formKeys = Object.keys(formData);
        const pk = formKeys.find(k => k.toLowerCase().includes('name')) || (formKeys.length > 0 ? formKeys[0] : null);
        return Object.entries(formData).filter(([k]) => k !== pk);
    };

    const name = getDisplayName();
    const otherDetails = getOtherDetails();
    const dateObj = new Date(attempt.created_at);

    // Calculate Total Marks
    let totalMaxMarks = test?.total_max_marks || 0;
    if (test && !totalMaxMarks) {
        if (test.enable_section_mode && test.sections) {
            test.sections.forEach((sec: any) => {
                if (sec.questions) {
                    sec.questions.forEach((q: any) => {
                        const m = q.marks !== undefined ? parseFloat(q.marks) : (sec.marks_per_question ? parseFloat(sec.marks_per_question) : 4);
                        totalMaxMarks += isNaN(m) ? 0 : m;
                    });
                }
            });
        } else if (test.questions) {
            test.questions.forEach((q: any) => {
                const m = q.marks !== undefined ? parseFloat(q.marks) : (test.marks_per_question ? parseFloat(test.marks_per_question) : 4);
                totalMaxMarks += isNaN(m) ? 0 : m;
            });
        }
    }

    const {
        finalScore = attempt.score ?? 0,
        correctCount = attempt.metadata?.stats?.correctCount ?? 0,
        partialCount = attempt.metadata?.stats?.partialCount ?? 0,
        wrongCount = attempt.metadata?.stats?.wrongCount ?? 0,
        skippedCount = attempt.metadata?.stats?.unattemptedCount ?? 0,
        percentage = totalMaxMarks > 0 ? (finalScore / totalMaxMarks) * 100 : 0,
        sectionData = {},
        questionStatus = {},
        mergedSectionData = [],
        topicData = []
    } = analysisData || {};

    const allQuestions = test?.enable_section_mode && test?.sections
        ? (test.sections as any[]).flatMap((s: any) => s.questions || [])
        : test?.questions || [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0 flex flex-col bg-slate-900 border-slate-800 text-white rounded-xl shadow-2xl">
                {/* ── Header ── */}
                <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-5 border-b border-slate-800 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Detailed Student Result</span>
                        <h2 className="text-xl font-bold text-white mt-1 leading-tight">{name}</h2>
                        {attempt.user?.email && (
                            <p className="text-xs text-slate-400 mt-0.5">{attempt.user.email}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            {attempt.metadata?.startedAt && (
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Started: {format(new Date(attempt.metadata.startedAt), 'MMM d, yyyy · hh:mm a')}</span>
                                </p>
                            )}
                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Submitted: {format(dateObj, 'MMM d, yyyy · hh:mm a')}</span>
                            </p>
                        </div>
                    </div>

                    {/* Metadata form details */}
                    {otherDetails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/80">
                            {otherDetails.map(([k, v]) => (
                                <Badge key={k} variant="outline" className="bg-slate-950/40 border-slate-800 text-[10px] text-slate-300 font-semibold px-2 py-0.5">
                                    <span className="opacity-60 mr-1">{k}:</span> {String(v)}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Tab Selector ── */}
                <div className="flex gap-1 bg-slate-950/60 p-1 border-b border-slate-800 flex-shrink-0">
                    {[
                        { key: 'overview', label: 'Overview' },
                        { key: 'topics', label: 'Topic Performance' },
                        { key: 'questions', label: 'Questions breakdown' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                activeTab === key
                                    ? 'bg-slate-800 text-indigo-400 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                            onClick={() => setActiveTab(key as any)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                            <p className="text-xs text-slate-400 font-medium">Analyzing results...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <XCircle className="h-10 w-10 text-red-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-300">Failed to analyze result</p>
                                <p className="text-xs text-slate-500 mt-1">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Score Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card className="bg-slate-950 border-slate-800 text-white md:col-span-2 shadow-lg">
                                            <CardContent className="p-5 flex flex-col justify-between h-full">
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Total Marks Obtained</h3>
                                                    <div className="flex items-end gap-3 mt-3">
                                                        <div>
                                                            <span className="text-4xl font-black text-indigo-400">{parseFloat((finalScore || 0).toFixed(2))}</span>
                                                            <span className="text-lg text-slate-400 font-semibold">/{totalMaxMarks || 0}</span>
                                                        </div>
                                                        <Badge className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-2 py-1 mb-1">
                                                            {parseFloat(Number(percentage || 0).toFixed(2))}% Score
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {mergedSectionData && mergedSectionData.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-800">
                                                        {mergedSectionData.map((m: any) => (
                                                            <div key={m.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                                                                <span className="text-[10px] font-bold text-slate-400">{m.label}</span>
                                                                <span className="text-xs font-black text-white">
                                                                    {parseFloat((m.score || 0).toFixed(2))}/{m.maxScore}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-slate-950 border-slate-800 text-white shadow-lg">
                                            <CardContent className="p-4 grid grid-cols-2 gap-2.5 h-full">
                                                <div className="flex flex-col items-center justify-center p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-center">
                                                    <span className="text-xl font-bold text-emerald-400">{correctCount}</span>
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wide mt-0.5">Correct</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-2.5 bg-red-950/20 border border-red-900/40 rounded-lg text-center">
                                                    <span className="text-xl font-bold text-red-400">{wrongCount}</span>
                                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-wide mt-0.5">Wrong</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-lg text-center">
                                                    <span className="text-xl font-bold text-blue-400">{partialCount}</span>
                                                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-wide mt-0.5">Partial</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center">
                                                    <span className="text-xl font-bold text-slate-400">{skippedCount}</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide mt-0.5">Skipped</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Subject Wise Analysis */}
                                    {test?.enable_section_mode && Object.keys(sectionData || {}).length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                <Target className="w-4 h-4 text-indigo-400" /> Subject Breakdown
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {Object.values(sectionData).map((sec: any) => (
                                                    <Card key={sec.name} className="bg-slate-950 border-slate-800 text-white">
                                                        <CardHeader className="py-3 px-4 border-b border-slate-800/60">
                                                            <CardTitle className="text-xs font-bold flex justify-between items-center text-slate-200">
                                                                {sec.name}
                                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
                                                                    {sec.totalQ} Qs
                                                                </span>
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-4 space-y-3">
                                                            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Score</span>
                                                                <span className="text-sm font-black text-indigo-400">
                                                                    {parseFloat((sec.score || 0).toFixed(2))}
                                                                    <span className="text-xs text-slate-500 font-medium ml-1">/ {sec.maxScore || 0}</span>
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="flex flex-col items-center bg-emerald-950/10 border border-emerald-900/30 p-1.5 rounded">
                                                                    <span className="text-xs font-bold text-emerald-400">{sec.correct}</span>
                                                                    <span className="text-[7px] font-black text-emerald-500 uppercase mt-0.5">Correct</span>
                                                                </div>
                                                                <div className="flex flex-col items-center bg-red-950/10 border border-red-900/30 p-1.5 rounded">
                                                                    <span className="text-xs font-bold text-red-400">{sec.wrong}</span>
                                                                    <span className="text-[7px] font-black text-red-500 uppercase mt-0.5">Wrong</span>
                                                                </div>
                                                                <div className="flex flex-col items-center bg-slate-900 border border-slate-800 p-1.5 rounded">
                                                                    <span className="text-xs font-bold text-slate-400">{sec.skipped}</span>
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase mt-0.5">Skipped</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Topics Tab */}
                            {activeTab === 'topics' && (
                                <div className="space-y-6">
                                    {topicData && topicData.length > 0 ? (
                                        <div className="space-y-5">
                                            {/* Topic Chart */}
                                            <Card className="bg-slate-950 border-slate-800 text-white p-4 shadow-lg">
                                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 px-2">Topic Analysis (%)</h4>
                                                <div className="h-[260px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={topicData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                                                            <XAxis type="number" domain={[0, 100]} hide />
                                                            <YAxis
                                                                dataKey="name"
                                                                type="category"
                                                                width={90}
                                                                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                            />
                                                            <Tooltip
                                                                cursor={{ fill: '#1e293b', radius: 4 }}
                                                                content={({ active, payload }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const data = payload[0].payload;
                                                                        return (
                                                                            <div className="bg-slate-900 border border-slate-800 p-3 shadow-xl rounded-lg min-w-[150px]">
                                                                                <p className="font-bold text-white mb-2 text-xs">{data.name}</p>
                                                                                <div className="space-y-1 text-[10px]">
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Score:</span>
                                                                                        <span className="font-bold text-indigo-400">{data.score} / {data.maxScore}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Correct:</span>
                                                                                        <span className="font-bold text-emerald-400">{data.correct}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Wrong:</span>
                                                                                        <span className="font-bold text-red-400">{data.wrong}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={16}>
                                                                {topicData.map((entry: any, index: number) => (
                                                                    <Cell
                                                                        key={`cell-${index}`}
                                                                        fill={entry.performance === 'Strong' ? '#10b981' : entry.performance === 'Moderate' ? '#f59e0b' : '#ef4444'}
                                                                    />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card>

                                            {/* Topic Cards List */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {topicData.map((topic: any) => {
                                                    const perfColor = topic.performance === 'Strong' ? 'emerald' : topic.performance === 'Moderate' ? 'amber' : 'red';
                                                    return (
                                                        <Card key={topic.name} className="bg-slate-950 border-slate-800 text-white overflow-hidden shadow-md">
                                                            <div className={`h-1 w-full bg-${perfColor}-500`} />
                                                            <CardContent className="p-4 space-y-3">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <h5 className="font-bold text-sm text-slate-200 line-clamp-1">{topic.name}</h5>
                                                                    <Badge className={`text-[8px] uppercase tracking-wide font-black px-1.5 h-4 
                                                                        ${topic.performance === 'Strong' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 
                                                                          topic.performance === 'Moderate' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/50' : 
                                                                          'bg-red-950/40 text-red-400 border border-red-900/50'}`}
                                                                    >
                                                                        {topic.performance}
                                                                    </Badge>
                                                                </div>

                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <div className="text-lg font-black text-white leading-none">
                                                                            {parseFloat((topic.score || 0).toFixed(2))}
                                                                            <span className="text-[10px] text-slate-400 font-medium ml-0.5">/{topic.maxScore}</span>
                                                                        </div>
                                                                        <span className="text-[9px] text-slate-500 mt-1 block uppercase tracking-wider">{topic.count} Questions</span>
                                                                    </div>

                                                                    <div className="flex gap-1.5">
                                                                        <div className="flex flex-col items-center justify-center w-8 h-8 rounded bg-emerald-950/20 border border-emerald-900/40">
                                                                            <span className="text-xs font-bold text-emerald-400 leading-none">{topic.correct}</span>
                                                                            <span className="text-[6px] text-emerald-500 uppercase mt-0.5">Hit</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-center justify-center w-8 h-8 rounded bg-red-950/20 border border-red-900/40">
                                                                            <span className="text-xs font-bold text-red-400 leading-none">{topic.wrong}</span>
                                                                            <span className="text-[6px] text-red-500 uppercase mt-0.5">Miss</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
                                            <Sparkles className="w-10 h-10 opacity-30" />
                                            <p className="font-bold text-sm">No topic analysis available for this test.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Questions Tab */}
                            {activeTab === 'questions' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                                        <Accordion type="single" collapsible className="w-full">
                                            {allQuestions.map((q: any, index: number) => {
                                                const ans = attempt.answers?.[q.id];
                                                const qStats = questionStatus?.[q.id] || { status: 'skipped', score: 0 };
                                                const isCorrect = qStats.status === 'correct';
                                                const isWrong = qStats.status === 'wrong';
                                                const isPartial = qStats.status === 'partial';
                                                const isSkipped = qStats.status === 'skipped';

                                                let marks = test.marks_per_question ? parseMark(test.marks_per_question, 4) : 4;
                                                if (test.enable_section_mode && test.sections) {
                                                    let rCount = 0;
                                                    for (const section of test.sections) {
                                                        if (index >= rCount && index < rCount + section.questions.length) {
                                                            marks = parseMark(section.marks_per_question, 4);
                                                            break;
                                                        }
                                                        rCount += section.questions.length;
                                                    }
                                                }
                                                if (q.marks !== undefined) {
                                                    marks = parseMark(q.marks, marks);
                                                }

                                                return (
                                                    <AccordionItem
                                                        key={q.id}
                                                        value={`item-${q.id}`}
                                                        className="border-b border-slate-800 px-4 py-1 data-[state=open]:bg-slate-900/50"
                                                    >
                                                        <AccordionTrigger className="hover:no-underline py-3">
                                                            <div className="flex items-center gap-3.5 text-left w-full">
                                                                <div className={`
                                                                    flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold
                                                                    ${isCorrect ? 'bg-emerald-950/45 text-emerald-400 border-emerald-900/40' : ''}
                                                                    ${isWrong ? 'bg-red-950/45 text-red-400 border-red-900/40' : ''}
                                                                    ${isSkipped ? 'bg-slate-800 text-slate-400 border-slate-700' : ''}
                                                                    ${isPartial ? 'bg-blue-950/45 text-blue-400 border-blue-900/40' : ''}
                                                                `}>
                                                                    {index + 1}
                                                                </div>

                                                                <div className="flex-1 min-w-0 h-5 relative overflow-hidden flex items-center">
                                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap [&_*]:!inline [&_.math]:!inline-block [&_p]:!m-0 [&_span]:!whitespace-nowrap text-slate-300 pointer-events-none text-xs">
                                                                        <LatexRenderer>{q.question || ""}</LatexRenderer>
                                                                    </div>
                                                                    <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none z-10" />
                                                                </div>

                                                                <div className="mr-2 flex items-center gap-3">
                                                                    <span className={`text-xs font-bold ${qStats.score > 0 ? 'text-emerald-400' : qStats.score < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                                        {parseFloat((qStats.score || 0).toFixed(2))} / {marks}
                                                                    </span>
                                                                    {isCorrect && <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black h-5">Correct</Badge>}
                                                                    {isWrong && <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black h-5">Wrong</Badge>}
                                                                    {isPartial && <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black h-5">Partial</Badge>}
                                                                    {isSkipped && <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-black h-5">Skipped</Badge>}
                                                                </div>
                                                            </div>
                                                        </AccordionTrigger>

                                                        <AccordionContent className="pb-4 space-y-4 pt-1 border-t border-slate-800/40">
                                                            <div className="text-sm font-medium text-slate-200 border-l-2 border-indigo-500 pl-3 py-1 overflow-x-auto max-w-full custom-scrollbar">
                                                                <LatexRenderer>{q.question || ""}</LatexRenderer>
                                                            </div>

                                                            {q.image && (
                                                                <div className="my-2">
                                                                    <img
                                                                        src={(q.image || "").trim()}
                                                                        alt={`Question ${index + 1}`}
                                                                        referrerPolicy="no-referrer"
                                                                        className="max-w-full max-h-[200px] rounded border border-slate-800 object-contain bg-slate-950"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className={`p-3 rounded border overflow-x-auto max-w-full custom-scrollbar 
                                                                    ${isCorrect ? 'bg-emerald-950/15 border-emerald-900/40' : 
                                                                      isWrong ? 'bg-red-950/15 border-red-900/40' : 
                                                                      'bg-slate-950 border-slate-800'}`}
                                                                >
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Student Answer</span>
                                                                    <div className={`font-semibold text-xs ${isCorrect ? 'text-emerald-400' : isWrong ? 'text-red-400' : 'text-slate-400'}`}>
                                                                        {ans ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <span>
                                                                                    {q.type === 'numerical'
                                                                                        ? ans
                                                                                        : Array.isArray(ans)
                                                                                            ? (ans as string[]).join(', ')
                                                                                            : `${ans}) `
                                                                                    }
                                                                                    {q.type !== 'numerical' && !Array.isArray(ans) && <LatexRenderer>{q.options?.[ans] || ""}</LatexRenderer>}
                                                                                </span>
                                                                                {q.type !== 'numerical' && !Array.isArray(ans) && q.optionImages?.[ans] && (
                                                                                    <img
                                                                                        src={q.optionImages[ans].trim()}
                                                                                        alt="Student Answer"
                                                                                        referrerPolicy="no-referrer"
                                                                                        className="max-h-[80px] w-auto rounded border border-slate-800 bg-slate-950 mt-1"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        ) : 'Not Answered'}
                                                                    </div>
                                                                </div>

                                                                <div className="p-3 rounded border bg-blue-950/10 border-blue-900/30 overflow-x-auto max-w-full custom-scrollbar">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-1">Correct Answer</span>
                                                                    <div className="font-semibold text-indigo-300 text-xs flex flex-col gap-1">
                                                                        <span>
                                                                            {q.type === 'numerical' ? (
                                                                                `Between ${(q.correctAnswer as any).min} and ${(q.correctAnswer as any).max}`
                                                                            ) : Array.isArray(q.correctAnswer) ? (
                                                                                (q.correctAnswer as string[]).join(', ')
                                                                            ) : (
                                                                                `${q.correctAnswer}) `
                                                                            )}
                                                                            {q.type !== 'numerical' && !Array.isArray(q.correctAnswer) && <LatexRenderer>{q.options?.[q.correctAnswer as string] || ""}</LatexRenderer>}
                                                                        </span>
                                                                        {q.type !== 'numerical' && !Array.isArray(q.correctAnswer) && q.optionImages?.[q.correctAnswer as string] && (
                                                                            <img
                                                                                src={q.optionImages[q.correctAnswer as string].trim()}
                                                                                alt="Correct Answer"
                                                                                referrerPolicy="no-referrer"
                                                                                className="max-h-[80px] w-auto rounded border border-slate-800 bg-slate-950 mt-1"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                );
                                            })}
                                        </Accordion>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} className="border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-9">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
