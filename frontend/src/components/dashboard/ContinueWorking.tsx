import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, Edit, Settings, Share2, BarChart2, Plus, Copy, MoreVertical, Trash2, Eye, ShieldAlert, Sparkles, FileText, CheckCircle2, Clock, Play, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserTestCard } from '@/components/UserTestCard';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';

interface ContinueWorkingProps {
    tests: any[];
    loading: boolean;
    onEdit: (test: any) => void;
    onConduct: (test: any) => void;
    onRemoveConduct: (testId: string, title: string) => void;
    onSettings: (test: any) => void;
    onShare: (test: any) => void;
    onDelete: (testId: string, title: string) => void;
    onUploadSolutions: (test: any) => void;
}

export default function ContinueWorking({
    tests,
    loading,
    onEdit,
    onConduct,
    onRemoveConduct,
    onSettings,
    onShare,
    onDelete,
    onUploadSolutions,
}: ContinueWorkingProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | 'live' | 'drafts' | 'scheduled'>('all');

    const safeTests = Array.isArray(tests) ? tests : [];
    const now = new Date();
    const hasEnded = (t: any) => t?.settings?.schedule?.end_time && new Date(t.settings.schedule.end_time) < now;
    const isLive = (t: any) => !!t?.settings?.conduct_exam?.enabled && !hasEnded(t);
    const isScheduled = (t: any) => t?.settings?.schedule?.enabled && t?.settings?.schedule?.start_time && new Date(t.settings.schedule.start_time) > now;
    const isDraft = (t: any) => !isLive(t) && !isScheduled(t) && (t?.questions?.length === 0 || t?.visibility === 'private');

    const rawFiltered = safeTests.filter((t) => {
        if (activeTab === 'live') return isLive(t);
        if (activeTab === 'drafts') return isDraft(t);
        if (activeTab === 'scheduled') return isScheduled(t);
        return true;
    });

    // Prioritize live tests first, then remaining
    const sortedTests = [...rawFiltered].sort((a, b) => {
        const aLive = isLive(a) ? 1 : 0;
        const bLive = isLive(b) ? 1 : 0;
        if (aLive !== bLive) return bLive - aLive;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    // Limit to max 3 cards
    const displayedTests = sortedTests.slice(0, 3);

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between w-full sm:w-auto">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">Continue Working</h2>
                        <p className="text-[11px] sm:text-xs text-slate-400">Manage ongoing drafts, live exams, and scheduled tests</p>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto min-w-0">
                    {/* Tabs with Horizontal Scroll for Mobile */}
                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto max-w-full scrollbar-hide shrink-0">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            All ({safeTests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'live' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live ({safeTests.filter(isLive).length})
                        </button>
                        <button
                            onClick={() => setActiveTab('drafts')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'drafts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Drafts ({safeTests.filter(isDraft).length})
                        </button>
                        <button
                            onClick={() => setActiveTab('scheduled')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'scheduled' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Scheduled ({safeTests.filter(isScheduled).length})
                        </button>
                    </div>

                    {/* View All Button */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/my-tests')}
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                        <span>View All My Tests</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Test Cards List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <TestCardSkeleton key={i} />
                    ))}
                </div>
            ) : displayedTests.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No tests in this filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">Create a new test or switch tabs to see your work.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedTests.map((test) => {
                        const testIsLive = isLive(test);
                        const questionCount = test.total_questions || test.questions?.length || 0;

                        return (
                            <div
                                key={test.id}
                                className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between group ${
                                    testIsLive
                                        ? 'bg-emerald-50/30 border-emerald-200 shadow-xs'
                                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                                }`}
                            >
                                <div>
                                    {/* Top Status & Badge */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            {testIsLive ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
                                                    <Radio className="w-2.5 h-2.5" /> LIVE EXAM
                                                </span>
                                            ) : isScheduled(test) ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                    <Clock className="w-2.5 h-2.5" /> SCHEDULED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                    {test.visibility?.toUpperCase() || 'PRIVATE'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Dropdown Menu */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                                <DropdownMenuItem onClick={() => onEdit(test)} className="cursor-pointer">
                                                    <Edit className="mr-2 h-3.5 w-3.5" /> Edit Test
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onSettings(test)} className="cursor-pointer">
                                                    <Settings className="mr-2 h-3.5 w-3.5" /> Settings
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUploadSolutions(test)} className="cursor-pointer">
                                                    <FileText className="mr-2 h-3.5 w-3.5" /> Solutions Editor
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onDelete(test.id, test.title)} className="text-red-600 cursor-pointer">
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Test Title */}
                                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                        {test.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                        <span>{questionCount} Questions</span>
                                        <span>·</span>
                                        <span>{test.duration || 0} mins</span>
                                    </p>
                                </div>

                                {/* Bottom Actions */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    {testIsLive ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onRemoveConduct(test.id, test.title)}
                                            className="h-8 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer font-medium w-full"
                                        >
                                            Stop Live Mode
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => onConduct(test)}
                                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-semibold flex-1"
                                        >
                                            <Radio className="w-3.5 h-3.5 mr-1" /> Conduct
                                        </Button>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onEdit(test)}
                                        className="h-8 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                                    >
                                        <Edit className="w-3.5 h-3.5 sm:mr-1" />
                                        <span className="hidden sm:inline">Edit</span>
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onShare(test)}
                                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 border-slate-200 cursor-pointer"
                                        title="Share test"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
