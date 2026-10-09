/**
 * The top of a candidate's result (src/pages/ResultsPage.tsx, overview tab): the score card,
 * the correct / wrong / partial / skipped counts and the "Subject-Wise Split" card of every
 * section. Class strings are ResultsPage's with md: resolved (a laptop window: two columns)
 * or not (a phone: one column). Always light (.bk-screen).
 */
import { Target, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SectionResult {
    name: string;
    totalQ: number;
    correct: number;
    wrong: number;
    skipped: number;
    score: number;
    maxScore: number;
}

const round = (n: number) => parseFloat(n.toFixed(2));

export default function ResultScreen({ title, sections, wide }: { title: string; sections: SectionResult[]; wide: boolean }) {
    const score = sections.reduce((s, x) => s + x.score, 0);
    const max = sections.reduce((s, x) => s + x.maxScore, 0);
    const count = (k: 'correct' | 'wrong' | 'skipped') => sections.reduce((s, x) => s + x[k], 0);
    const percentage = max ? (score / max) * 100 : 0;

    return (
        <div className="bk-screen h-full overflow-y-auto bg-slate-50/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className={cn('max-w-5xl mx-auto space-y-8', wide ? 'p-8' : 'p-4')}>
                <div className={cn('flex justify-between gap-6 mb-2', wide ? 'flex-row items-end' : 'flex-col items-start')}>
                    <div>
                        <div className="flex items-center gap-3 mt-2 text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Timer className="w-4 h-4" /> Final Submission
                            </span>
                            <span className="h-4 w-px bg-slate-200" />
                            <span className="text-indigo-600">{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className={cn('grid gap-6', wide ? 'grid-cols-3' : 'grid-cols-1')}>
                    <Card className={cn('bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl relative overflow-hidden', wide && 'col-span-2')}>
                        <CardContent className="p-6 flex flex-col justify-between h-full">
                            <div className={cn('flex justify-between items-start gap-4', wide ? 'flex-row' : 'flex-col')}>
                                <div className={wide ? 'pr-0' : 'pr-12'}>
                                    <div className={cn('font-semibold opacity-90 leading-tight', wide ? 'text-2xl' : 'text-lg')}>{title}</div>
                                    <p className={cn('text-indigo-100 mt-1', wide ? 'text-base' : 'text-sm')}>Test Completed Successfully</p>
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-4 mt-6">
                                <div className={cn('flex items-end', wide ? 'gap-4' : 'gap-3')}>
                                    <div>
                                        <span className={cn('font-bold', wide ? 'text-6xl' : 'text-5xl')}>{round(score)}</span>
                                        <span className={cn('opacity-75', wide ? 'text-2xl' : 'text-xl')}>/{max}</span>
                                    </div>
                                    <div className={wide ? 'mb-2' : 'mb-1'}>
                                        <Badge variant="secondary" className={cn('py-1', wide ? 'text-lg px-3' : 'text-sm px-2')}>
                                            {round(percentage)}% Score
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="flex flex-col justify-center gap-4 p-6 shadow-md">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-2xl font-bold text-green-700">{count('correct')}</span>
                                <span className="text-xs font-medium text-green-600 uppercase">Correct</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg">
                                <span className="text-2xl font-bold text-red-700">{count('wrong')}</span>
                                <span className="text-xs font-medium text-red-600 uppercase">Wrong</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                                <span className="text-2xl font-bold text-blue-700">0</span>
                                <span className="text-xs font-medium text-blue-600 uppercase">Partial</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-2xl font-bold text-slate-700">{count('skipped')}</span>
                                <span className="text-xs font-medium text-slate-600 uppercase">Skipped</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="text-xl font-black flex items-center gap-2 text-slate-800">
                        <Target className="w-5 h-5 text-indigo-500" /> Subject-Wise Split
                    </div>
                    <div className={cn('grid gap-6', wide ? 'grid-cols-2' : 'grid-cols-1')}>
                        {sections.map((sec) => (
                            <Card key={sec.name} className="bg-white border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
                                <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardHeader className="pb-2">
                                    {/* CardTitle (an h3 in the product) as a plain element, so the guide keeps its own headings. */}
                                    <div className={cn('text-2xl font-semibold leading-none tracking-tight', 'text-lg flex justify-between items-center text-slate-800')}>
                                        {sec.name}
                                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-full text-slate-500">{sec.totalQ} Qs</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Score</span>
                                            <span className="text-base font-black text-indigo-600">
                                                {round(sec.score)}
                                                <span className="text-xs text-slate-400 font-medium ml-1">/ {sec.maxScore}</span>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="flex flex-col items-center bg-emerald-50 p-2 rounded-lg">
                                                <span className="text-base font-black text-emerald-600 leading-none">{sec.correct}</span>
                                                <span className="text-[8px] font-black text-emerald-600/60 uppercase mt-1">Correct</span>
                                            </div>
                                            <div className="flex flex-col items-center bg-red-50 p-2 rounded-lg">
                                                <span className="text-base font-black text-red-600 leading-none">{sec.wrong}</span>
                                                <span className="text-[8px] font-black text-red-600/60 uppercase mt-1">Wrong</span>
                                            </div>
                                            <div className="flex flex-col items-center bg-slate-100 p-2 rounded-lg">
                                                <span className="text-base font-black text-slate-600 leading-none">{sec.skipped}</span>
                                                <span className="text-[8px] font-black text-slate-500 uppercase mt-1">Skipped</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
