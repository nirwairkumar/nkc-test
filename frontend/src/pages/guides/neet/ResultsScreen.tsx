/**
 * A replica of the top of TestoZa's results page (src/pages/ResultsPage.tsx,
 * overview tab) for the NEET guide: score card, subject marks, correct / wrong /
 * partial / skipped, "Predict your rank" (shown for tests tagged NEET) and the
 * subject-wise split.
 *
 * `phone` draws it as on a phone, inside ResultsLayout's mobile header and bottom
 * bar, with every sm:/md:/lg: class resolved to its phone value (those prefixes
 * follow the browser window, not the replica). Without it, the real responsive
 * classes are used, because the replica then sits in the page at its true width.
 */
import { PanelBottomClose, RotateCcw, Sparkles, Target, Timer, Trophy, Menu } from 'lucide-react';
import { badgeVariants } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sectionMax, sectionScore, type ResultSection } from './examUtils';

export type { ResultSection };

export interface ResultsScreenProps {
    title: string;
    sections: ResultSection[];
    phone?: boolean;
    /** Shown for tests tagged NEET (and other supported exams). */
    rankPredictor?: boolean;
    studentName?: string;
}

export default function ResultsScreen({ title, sections, phone = false, rankPredictor = true, studentName = 'Aarav' }: ResultsScreenProps) {
    const p = (phoneClass: string, pageClass: string) => (phone ? phoneClass : pageClass);
    const score = sections.reduce((a, s) => a + sectionScore(s), 0);
    const max = sections.reduce((a, s) => a + sectionMax(s), 0);
    const correct = sections.reduce((a, s) => a + s.correct, 0);
    const wrong = sections.reduce((a, s) => a + s.wrong, 0);
    const skipped = sections.reduce((a, s) => a + s.skipped, 0);
    const percentage = max > 0 ? (score / max) * 100 : 0;
    const date = new Date().toLocaleDateString();

    const content = (
        <div className={p('max-w-5xl mx-auto p-4 space-y-8', 'max-w-5xl mx-auto p-4 md:p-8 space-y-8')}>
            <div className="space-y-8">
                <div className={p('flex flex-col justify-between items-start gap-6 mb-2', 'flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2')}>
                    <div>
                        <div className="flex items-center gap-3 mt-2 text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Timer className="w-4 h-4" /> Final Submission
                            </span>
                            <div className="shrink-0 bg-border w-[1px] h-4" />
                            <span className="text-indigo-600">{date}</span>
                        </div>
                    </div>
                </div>

                <div className={p('grid grid-cols-1 gap-6', 'grid grid-cols-1 md:grid-cols-3 gap-6')}>
                    <div
                        className={cn(
                            'rounded-lg border bg-card bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl relative overflow-hidden',
                            !phone && 'md:col-span-2',
                        )}
                    >
                        <div className="p-6 flex flex-col justify-between h-full">
                            <div className={p('flex flex-col justify-between items-start gap-4', 'flex flex-col md:flex-row justify-between items-start gap-4')}>
                                <div className={p('pr-12', 'pr-12 md:pr-0')}>
                                    <div className={p('text-lg font-semibold opacity-90 leading-tight', 'text-lg md:text-2xl font-semibold opacity-90 leading-tight')}>{title}</div>
                                    <p className={p('text-indigo-100 text-sm mt-1', 'text-indigo-100 text-sm md:text-base mt-1')}>Test Completed Successfully</p>
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-4 mt-6">
                                <div className={p('flex items-end gap-3', 'flex items-end gap-3 md:gap-4')}>
                                    <div>
                                        <span className={p('text-5xl font-bold', 'text-5xl md:text-6xl font-bold')}>{parseFloat(score.toFixed(2))}</span>
                                        <span className={p('text-xl opacity-75', 'text-xl md:text-2xl opacity-75')}>/{max}</span>
                                    </div>
                                    <div className={p('mb-1', 'mb-1 md:mb-2')}>
                                        <span className={cn(badgeVariants({ variant: 'secondary' }), p('text-sm px-2 py-1', 'text-sm md:text-lg px-2 md:px-3 py-1'))}>
                                            {parseFloat(percentage.toFixed(3))}% Score
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/20">
                                {sections.map((s) => (
                                    <div key={s.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                                        <span className="text-sm font-medium text-white/90">{s.name}</span>
                                        <span className="text-sm font-bold text-white">
                                            {parseFloat(sectionScore(s).toFixed(2))}/{sectionMax(s)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground flex flex-col justify-center gap-4 p-6 shadow-md">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-2xl font-bold text-green-700">{correct}</span>
                                <span className="text-xs font-medium text-green-600 uppercase">Correct</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg">
                                <span className="text-2xl font-bold text-red-700">{wrong}</span>
                                <span className="text-xs font-medium text-red-600 uppercase">Wrong</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                                <span className="text-2xl font-bold text-blue-700">0</span>
                                <span className="text-xs font-medium text-blue-600 uppercase">Partial</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-2xl font-bold text-slate-700">{skipped}</span>
                                <span className="text-xs font-medium text-slate-600 uppercase">Skipped</span>
                            </div>
                        </div>
                    </div>
                </div>

                {rankPredictor && (
                    <div className="mt-6 mb-8 relative">
                        <div className="rounded-lg border bg-card text-card-foreground bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 shadow-sm overflow-hidden group">
                            <div className="p-6">
                                <div className={p('flex flex-col items-center justify-between gap-6', 'flex flex-col md:flex-row items-center justify-between gap-6')}>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-purple-500" />
                                            Predict your rank
                                        </h3>
                                    </div>
                                    <span className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all shrink-0', p('w-full', 'w-full md:w-auto'))}>
                                        Predict
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
                        <Target className="w-5 h-5 text-indigo-500" /> Subject-Wise Split
                    </h3>
                    <div className={p('grid grid-cols-1 gap-6', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
                        {sections.map((s) => (
                            <div key={s.name} className="rounded-lg text-card-foreground bg-white border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
                                <div className="p-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col space-y-1.5 p-6 pb-2">
                                    <div className="font-semibold leading-none tracking-tight text-lg flex justify-between items-center text-slate-800">
                                        {s.name}
                                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-full text-slate-500">{s.totalQ} Qs</span>
                                    </div>
                                </div>
                                <div className="p-6 pt-0">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Score</span>
                                            <span className="text-base font-black text-indigo-600">
                                                {parseFloat(sectionScore(s).toFixed(2))}
                                                <span className="text-xs text-slate-400 font-medium ml-1">/ {sectionMax(s)}</span>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="flex flex-col items-center bg-emerald-50 p-2 rounded-lg">
                                                <span className="text-base font-black text-emerald-600 leading-none">{s.correct}</span>
                                                <span className="text-[8px] font-black text-emerald-600/60 uppercase mt-1">Correct</span>
                                            </div>
                                            <div className="flex flex-col items-center bg-red-50 p-2 rounded-lg">
                                                <span className="text-base font-black text-red-600 leading-none">{s.wrong}</span>
                                                <span className="text-[8px] font-black text-red-600/60 uppercase mt-1">Wrong</span>
                                            </div>
                                            <div className="flex flex-col items-center bg-slate-100 p-2 rounded-lg">
                                                <span className="text-base font-black text-slate-600 leading-none">{s.skipped}</span>
                                                <span className="text-[8px] font-black text-slate-500 uppercase mt-1">Skipped</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!phone) {
        return <div className="ng-screen bg-slate-50 text-slate-900">{content}</div>;
    }

    const navItem = (Icon: typeof Trophy, label: string) => (
        <span className="flex-1 flex flex-col items-center gap-1 transition-colors text-slate-500">
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        </span>
    );

    return (
        <div className="ng-screen relative h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
            <header className="flex items-center h-16 pl-0 pr-4 bg-white border-b shadow-sm z-20 flex-none">
                <span
                    className={cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        'relative h-10 px-4 rounded-r-3xl rounded-l-none bg-indigo-50/80 backdrop-blur-md border border-l-0 border-indigo-200/50 shadow-[2px_2px_10px_rgba(0,0,0,0.05)] flex items-center gap-3',
                    )}
                >
                    <span className="relative">
                        <Menu className="h-5 w-5 text-indigo-600" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                        </span>
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-700">More</span>
                </span>
                <span className="text-[17px] font-semibold text-slate-700 ml-3 tracking-normal leading-tight font-sans block truncate max-w-[180px]">{studentName}&rsquo;s Results</span>
            </header>
            <main className="flex-1 w-full bg-slate-50 pb-20 overflow-hidden">
                <div className="bg-slate-50/30">{content}</div>
            </main>
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16">
                    {navItem(Trophy, 'Hub')}
                    {navItem(Target, 'Topics')}
                    {navItem(PanelBottomClose, 'Solution Key')}
                    {navItem(RotateCcw, 'Retake')}
                </div>
            </div>
        </div>
    );
}
