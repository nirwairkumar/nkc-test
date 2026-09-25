import type { ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Trash2,
    Settings,
    Pencil,
    MoreHorizontal,
    Globe,
    Lock,
    GraduationCap,
    Check,
    FileText,
    Link as LinkIcon,
    Radio,
    BarChart3,
    GitFork,
    Inbox,
    Eye,
    ListChecks,
    Clock,
    Users,
} from 'lucide-react';

/**
 * Creator dashboard test card.
 *
 * Visual language follows the landing page (components/landing-v2/ui.tsx):
 * a white surface lifted by layered shadow instead of a hard border, one sky
 * accent, and neutral slate for everything else. Actions are iOS-style tiles
 * (icon above a plain-word label) so a first-time teacher can tell what each
 * one does without hovering, and the card has exactly one filled primary.
 */

interface UserTestCardProps {
    test: any;
    classes: any[];
    onEdit: (test: any) => void;
    onConfigure: (test: any) => void;
    onDelete: (testId: string, title: string) => void;
    onVisibilityChange: (test: any, visibility: string) => void;
    onShare: (test: any) => void;
    onUploadSolutions: (test: any) => void;
    onClassChange: (test: any, classId: string | null) => void;
    onViewResults: (test: any) => void;
    onView: (test: any) => void;
    onConductExam: (test: any) => void;
    onViewReports?: (test: any) => void;
    unresolvedReportsCount?: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function StatusPill({ status }: { status: 'live' | 'public' | 'private' | 'ended' }) {
    const styles = {
        live: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
        public: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
        private: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-slate-300',
        ended: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-slate-300',
    } as const;
    const labels = { live: 'Live', public: 'Public', private: 'Private', ended: 'Ended' } as const;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset ${styles[status]}`}>
            {status === 'live' && (
                <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
            )}
            {status === 'public' && <Globe className="h-3 w-3" />}
            {status === 'private' && <Lock className="h-3 w-3" />}
            {labels[status]}
        </span>
    );
}

function ActionTile({
    icon: Icon, label, onClick, primary = false, id, badge,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    primary?: boolean;
    id?: string;
    badge?: ReactNode;
}) {
    return (
        <button
            type="button"
            id={id}
            onClick={onClick}
            className={[
                'relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[12.5px] font-semibold leading-none',
                'transition-[background-color,transform,box-shadow] duration-150 motion-safe:active:scale-[0.97] cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                primary
                    ? 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_18px_-10px_rgba(2,132,199,0.8)] hover:bg-[hsl(200,95%,30%)]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10',
            ].join(' ')}
        >
            <Icon className={`h-[18px] w-[18px] ${primary ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
            <span className="max-w-full truncate">{label}</span>
            {badge}
        </button>
    );
}

export function UserTestCard({
    test,
    classes,
    onEdit,
    onConfigure,
    onDelete,
    onVisibilityChange,
    onShare,
    onUploadSolutions,
    onClassChange,
    onViewResults,
    onView,
    onConductExam,
    onViewReports,
    unresolvedReportsCount = 0,
}: UserTestCardProps) {
    const visibility = test.visibility || (test.is_public ? 'public' : 'private');
    const isConducted = !!test.settings?.conduct_exam?.enabled;
    const isExample = !!test.settings?.is_user_example;
    const questionCount = test.total_questions || test.questions?.length || 0;
    const submissionCount = test.submission_count ?? 0;
    const className = test.class_id ? classes.find(c => c.id === test.class_id)?.name : null;
    const status = isConducted ? 'live' : visibility === 'public' ? 'public' : 'private';

    return (
        <article
            className={[
                'group relative flex h-full flex-col rounded-[20px] bg-white p-4 sm:p-5',
                'ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]',
                'transition-[box-shadow,transform] duration-300 ease-out motion-safe:hover:-translate-y-0.5',
                'hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_20px_40px_-20px_rgba(2,132,199,0.30)]',
                'dark:bg-slate-900 dark:ring-white/10',
            ].join(' ')}
        >
            {/* ── Status row ── */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <StatusPill status={status} />
                    {test.custom_id && (
                        <span className="truncate font-mono text-xs text-slate-500 dark:text-slate-400" title="Test ID">
                            #{test.custom_id}
                        </span>
                    )}
                </div>

                <DropdownMenu>
                    <div className="relative -mr-1 inline-flex shrink-0">
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="More options"
                                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900 dark:hover:bg-white/10 dark:data-[state=open]:bg-white/10 cursor-pointer"
                            >
                                <MoreHorizontal className="h-[18px] w-[18px]" />
                            </button>
                        </DropdownMenuTrigger>
                        {unresolvedReportsCount > 0 && (
                            <span className="pointer-events-none absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                        )}
                    </div>
                    <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onViewResults(test)}>
                            <BarChart3 className="mr-2.5 h-4 w-4 text-slate-500" /> Results
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewReports?.(test)} className="flex items-center justify-between rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                            <span className="flex items-center">
                                <Inbox className="mr-2.5 h-4 w-4 text-slate-500" /> Student reports
                            </span>
                            {unresolvedReportsCount > 0 && (
                                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                                    {unresolvedReportsCount}
                                </span>
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onEdit(test)}>
                            <Pencil className="mr-2.5 h-4 w-4 text-slate-500" /> Edit questions
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onConfigure(test)}>
                            <Settings className="mr-2.5 h-4 w-4 text-slate-500" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onShare(test)} disabled={visibility === 'private'}>
                            <LinkIcon className="mr-2.5 h-4 w-4 text-slate-500" /> Share link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onUploadSolutions(test)}>
                            <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Upload solutions
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Visibility (only Public / Private — no unlisted) */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900">
                                <Globe className="mr-2.5 h-4 w-4 text-slate-500" /> Who can see it
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-64 rounded-xl p-1.5">
                                <DropdownMenuItem className="items-start rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onVisibilityChange(test, 'public')}>
                                    <Globe className="mr-2.5 mt-0.5 h-4 w-4 text-sky-600" />
                                    <span className="flex-1">
                                        <span className="block font-medium">Public</span>
                                        <span className="block text-xs text-slate-500">Anyone can find and take it</span>
                                    </span>
                                    {visibility === 'public' && !isConducted && <Check className="ml-2 h-4 w-4 text-sky-600" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="items-start rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900" onClick={() => onVisibilityChange(test, 'private')}>
                                    <Lock className="mr-2.5 mt-0.5 h-4 w-4 text-slate-500" />
                                    <span className="flex-1">
                                        <span className="block font-medium">Private</span>
                                        <span className="block text-xs text-slate-500">Only you can see it</span>
                                    </span>
                                    {visibility === 'private' && !isConducted && <Check className="ml-2 h-4 w-4 text-sky-600" />}
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900">
                                <GraduationCap className="mr-2.5 h-4 w-4 text-slate-500" /> Assign to class
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-60 overflow-y-auto rounded-xl p-1.5">
                                <DropdownMenuItem className="rounded-lg focus:bg-slate-100 focus:text-slate-900" onClick={() => onClassChange(test, null)}>
                                    <span className="text-slate-500">No class</span>
                                    {!test.class_id && <Check className="ml-auto h-4 w-4 text-sky-600" />}
                                </DropdownMenuItem>
                                {classes.map(cls => (
                                    <DropdownMenuItem className="rounded-lg focus:bg-slate-100 focus:text-slate-900" key={cls.id} onClick={() => onClassChange(test, cls.id)}>
                                        {cls.name}
                                        {test.class_id === cls.id && <Check className="ml-auto h-4 w-4 text-sky-600" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => onDelete(test.id, test.title)} className="rounded-lg py-2 focus:bg-slate-100 focus:text-slate-900 text-red-600 focus:bg-red-50 focus:text-red-600">
                            <Trash2 className="mr-2.5 h-4 w-4" /> Delete test
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* ── Title ── */}
            <h3 className="mt-3">
                <button
                    type="button"
                    onClick={() => onEdit(test)}
                    title={test.title}
                    className="line-clamp-2 text-left text-base font-semibold leading-snug tracking-[-0.01em] text-slate-900 transition-colors hover:text-sky-700 focus-visible:outline-none focus-visible:underline dark:text-slate-100 dark:hover:text-sky-300 cursor-pointer"
                >
                    {test.title}
                </button>
            </h3>

            {/* ── Facts ── */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-slate-400" />
                    {plural(questionCount, 'question')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {test.duration || 0} min
                </span>
                {submissionCount > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {submissionCount} submitted
                    </span>
                )}
            </div>

            {/* ── Tags (only when there is something to say) ── */}
            {(className || test.is_cloned || unresolvedReportsCount > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {className && (
                        <span className="inline-flex max-w-[160px] items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300">
                            <GraduationCap className="h-3 w-3 shrink-0" />
                            <span className="truncate">{className}</span>
                        </span>
                    )}
                    {test.is_cloned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-white/5 dark:text-slate-300">
                            <GitFork className="h-3 w-3" /> Copied
                        </span>
                    )}
                    {unresolvedReportsCount > 0 && (
                        <button
                            type="button"
                            onClick={() => onViewReports?.(test)}
                            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/15 transition-colors hover:bg-red-100 cursor-pointer"
                        >
                            <Inbox className="h-3 w-3" />
                            {plural(unresolvedReportsCount, 'report')} to review
                        </button>
                    )}
                </div>
            )}

            {/* ── Actions ── */}
            <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
                <ActionTile
                    id={isExample ? 'tour-edit-btn' : undefined}
                    icon={Pencil}
                    label="Edit"
                    onClick={() => onEdit(test)}
                />
                <ActionTile icon={Eye} label="Preview" onClick={() => onView(test)} />
                {isConducted ? (
                    <ActionTile
                        primary
                        icon={BarChart3}
                        label="Results"
                        onClick={() => onViewResults(test)}
                        badge={submissionCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-white px-1 py-0.5 text-center text-[10px] font-bold leading-none text-sky-700">
                                {submissionCount > 99 ? '99+' : submissionCount}
                            </span>
                        )}
                    />
                ) : (
                    <ActionTile
                        primary
                        id={isExample ? 'tour-conduct-btn' : undefined}
                        icon={Radio}
                        label="Conduct exam"
                        onClick={() => onConductExam(test)}
                    />
                )}
            </div>
        </article>
    );
}

/** Placeholder with the same footprint as UserTestCard, so the grid does not jump. */
export function UserTestCardSkeleton() {
    return (
        <div className="flex h-full flex-col rounded-[20px] bg-white p-4 ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 dark:bg-slate-900 dark:ring-white/10">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-5 w-5/6" />
            <Skeleton className="mt-1.5 h-5 w-1/2" />
            <Skeleton className="mt-3 h-4 w-40" />
            <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
                <Skeleton className="h-[58px] rounded-xl" />
                <Skeleton className="h-[58px] rounded-xl" />
                <Skeleton className="h-[58px] rounded-xl" />
            </div>
        </div>
    );
}
