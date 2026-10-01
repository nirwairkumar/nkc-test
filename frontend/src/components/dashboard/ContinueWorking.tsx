import React from 'react';
import {
    BarChart3, Check, FileText, GraduationCap, MoreHorizontal, Pencil, Radio, Settings, Share2, Trash2, FilePlus2,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
    DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill } from '@/components/UserTestCard';
import { isExampleTest } from '@/lib/teacherDashboardApi';
import { CARD, MENU_ITEM, MENU_TRIGGER, PILL_BTN, SectionTitle, Skeleton, TEXT_BTN } from './dashboardUi';
import { plural, timeAgo } from './format';

interface ContinueWorkingProps {
    tests: any[];
    loading: boolean;
    classes: { id: string; name: string }[];
    now: Date;
    onEdit: (test: any) => void;
    onConduct: (test: any) => void;
    onSettings: (test: any) => void;
    onResults: (test: any) => void;
    onShare: (test: any) => void;
    onSolutions: (test: any) => void;
    onDelete: (test: any) => void;
    onBatchChange: (test: any, classId: string | null) => void;
    onViewAll: () => void;
}

const statusOf = (t: any): 'public' | 'private' | 'ended' => {
    if (t.settings?.conduct_exam && !t.settings.conduct_exam.enabled) return 'ended';
    return t.visibility === 'public' ? 'public' : 'private';
};

/** The newest tests that aren't live: pick up a draft, or start it as an exam. */
export default function ContinueWorking({
    tests, loading, classes, now, onEdit, onConduct, onSettings, onResults, onShare, onSolutions, onDelete, onBatchChange, onViewAll,
}: ContinueWorkingProps) {
    return (
        <section aria-labelledby="continue-heading">
            <SectionTitle
                id="continue-heading"
                title="Your tests"
                action={<button type="button" onClick={onViewAll} className={TEXT_BTN}>All tests</button>}
            />
            <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                {loading && tests.length === 0 ? (
                    [0, 1, 2].map(i => (
                        <li key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                            <Skeleton className="h-10 w-10 rounded-[11px]" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        </li>
                    ))
                ) : tests.length === 0 ? (
                    <li className="px-4 py-8 text-center sm:px-5">
                        <p className="text-[15px] font-semibold text-slate-900">No tests yet</p>
                        <p className="mt-1 text-[13px] text-slate-600">Your tests will show here once you make one.</p>
                    </li>
                ) : (
                    tests.map(test => {
                        const questions = test.total_questions || 0;
                        const submissions = test.submission_count || 0;
                        const batch = classes.find(c => c.id === test.class_id);
                        const example = isExampleTest(test);
                        return (
                            <li key={test.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                                <button
                                    type="button"
                                    onClick={() => onEdit(test)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-slate-500">
                                        <FileText className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="truncate text-[15px] font-semibold text-slate-900" title={test.title}>{test.title}</span>
                                            {example ? (
                                                <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/15">Example</span>
                                            ) : (
                                                <span className="hidden shrink-0 sm:inline-flex"><StatusPill status={statusOf(test)} /></span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[13px] text-slate-600">
                                            {[
                                                questions ? plural(questions, 'question') : 'No questions yet',
                                                test.duration ? `${test.duration} min` : null,
                                                batch ? batch.name : null,
                                                test.created_at ? `made ${timeAgo(new Date(test.created_at), now)}` : null,
                                            ].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                </button>

                                <div className="flex shrink-0 items-center gap-2 pl-[52px] sm:pl-0">
                                    {submissions > 0 && (
                                        <button
                                            type="button"
                                            className={PILL_BTN}
                                            onClick={() => onResults(test)}
                                            aria-label={`${plural(submissions, 'result')} — open results`}
                                            title="Results"
                                        >
                                            <BarChart3 className="h-4 w-4 text-sky-600" />
                                            <span className="tabular-nums">{submissions}</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={!questions}
                                        title={questions ? 'Start as an online exam' : 'Add questions first'}
                                        onClick={() => onConduct(test)}
                                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 text-[13px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 transition-colors hover:bg-emerald-100 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        <Radio className="h-4 w-4" /> Conduct
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button type="button" aria-label={`More options for ${test.title}`} className={MENU_TRIGGER}>
                                                <MoreHorizontal className="h-[18px] w-[18px]" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onEdit(test)}>
                                                <Pencil className="mr-2.5 h-4 w-4 text-slate-500" /> Edit questions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onSettings(test)}>
                                                <Settings className="mr-2.5 h-4 w-4 text-slate-500" /> Settings
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onResults(test)}>
                                                <BarChart3 className="mr-2.5 h-4 w-4 text-slate-500" /> Results
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onSolutions(test)}>
                                                <FilePlus2 className="mr-2.5 h-4 w-4 text-slate-500" /> Upload solutions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onShare(test)}>
                                                <Share2 className="mr-2.5 h-4 w-4 text-slate-500" /> Share…
                                            </DropdownMenuItem>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className={`${MENU_ITEM} data-[state=open]:bg-slate-100`}>
                                                    <GraduationCap className="mr-2.5 h-4 w-4 text-slate-500" /> Add to batch
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="max-h-60 w-52 overflow-y-auto rounded-xl p-1.5">
                                                    <DropdownMenuItem className={MENU_ITEM} onClick={() => onBatchChange(test, null)}>
                                                        <span className="text-slate-500">No batch</span>
                                                        {!test.class_id && <Check className="ml-auto h-4 w-4 text-sky-600" />}
                                                    </DropdownMenuItem>
                                                    {classes.map(c => (
                                                        <DropdownMenuItem key={c.id} className={MENU_ITEM} onClick={() => onBatchChange(test, c.id)}>
                                                            <span className="truncate">{c.name}</span>
                                                            {test.class_id === c.id && <Check className="ml-auto h-4 w-4 shrink-0 text-sky-600" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    {classes.length === 0 && (
                                                        <p className="px-2 py-1.5 text-[12px] text-slate-500">Make a batch first, in the Batches card.</p>
                                                    )}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className={`${MENU_ITEM} font-semibold text-red-700 focus:bg-red-50 focus:text-red-700`} onClick={() => onDelete(test)}>
                                                <Trash2 className="mr-2.5 h-4 w-4" /> Delete test
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </section>
    );
}
