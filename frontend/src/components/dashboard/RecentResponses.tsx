import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Eye, Award, ChevronRight, FileCheck2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ResponseItem {
    id: string;
    studentName: string;
    studentAvatar: string;
    testTitle: string;
    score: string;
    percentage: number;
    submittedAt: string;
    status: string;
}

interface RecentResponsesProps {
    responses?: ResponseItem[];
}

export default function RecentResponses({ responses }: RecentResponsesProps) {
    const navigate = useNavigate();

    const defaultResponses: ResponseItem[] = [
        {
            id: 'res-1',
            studentName: 'Aarav Patel',
            studentAvatar: '',
            testTitle: 'Physics Weekly Mock Test #4',
            score: '45/50',
            percentage: 90,
            submittedAt: '12 mins ago',
            status: 'Passed',
        },
        {
            id: 'res-2',
            studentName: 'Priya Sharma',
            studentAvatar: '',
            testTitle: 'Chemistry Chapter 4 Practice',
            score: '38/50',
            percentage: 76,
            submittedAt: '34 mins ago',
            status: 'Passed',
        },
        {
            id: 'res-3',
            studentName: 'Rohan Gupta',
            studentAvatar: '',
            testTitle: 'Mathematics Midterm Set B',
            score: '48/50',
            percentage: 96,
            submittedAt: '1 hour ago',
            status: 'Passed',
        },
        {
            id: 'res-4',
            studentName: 'Ananya Verma',
            studentAvatar: '',
            testTitle: 'NEET Physics Unit Test',
            score: '28/50',
            percentage: 56,
            submittedAt: '2 hours ago',
            status: 'Needs Review',
        },
    ];

    const displayResponses = responses !== undefined ? responses : defaultResponses;

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Submissions</h2>
                            <p className="text-[11px] text-slate-400">Candidate test attempts & scores</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/my-tests?tab=reports')}
                        className="text-xs text-indigo-600 hover:text-indigo-700 h-7 px-2"
                    >
                        View All Reports
                    </Button>
                </div>

                {displayResponses.length === 0 ? (
                    <div className="py-8 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                            <Inbox className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">No candidate submissions yet</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                            Share your test link with students to receive and evaluate submissions.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {displayResponses.map((res) => (
                            <div
                                key={res.id}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all text-xs"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar className="h-7 w-7 border border-slate-200">
                                        <AvatarImage src={res.studentAvatar} />
                                        <AvatarFallback className="bg-slate-100 text-slate-700 text-[10px] font-bold">
                                            {res.studentName.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 truncate">{res.studentName}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{res.testTitle}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                            res.percentage >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                            {res.score} ({res.percentage}%)
                                        </span>
                                        <p className="text-[9px] text-slate-400 mt-0.5">{res.submittedAt}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
                <Button
                    variant="outline"
                    onClick={() => navigate('/my-tests?tab=reports')}
                    className="w-full h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                    Evaluate Pending Submissions
                </Button>
            </div>
        </div>
    );
}
