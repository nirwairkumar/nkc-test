import React from 'react';
import {
    AlertTriangle, BarChart3, CalendarClock, Copy, KeyRound, Link as LinkIcon, MoreHorizontal, Pencil, FileText,
    Settings, Share2, Square,
} from 'lucide-react';
import JoinCodeLine from '@/components/exams/JoinCodeLine';
import { toast } from 'sonner';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LiveExam, UpcomingExam } from '@/lib/teacherDashboardApi';
import { examWhatsAppUrl, getExamUrl } from '@/lib/conductExam';
import { CARD, LiveDot, MENU_ITEM, MENU_TRIGGER, PILL_BTN, SectionTitle, WhatsAppIcon } from './dashboardUi';
import { copyText, dayAndTime, plural, timeOfDay, untilText } from './format';

interface LiveNowSectionProps {
    live: LiveExam[];
    upcoming: UpcomingExam[];
    updatedAt: Date | null;
    now: Date;
    onResults: (test: any) => void;
    onSettings: (test: any) => void;
    onEdit: (test: any) => void;
    onSolutions: (test: any) => void;
    onShare: (test: any) => void;
    onStop: (test: any) => void;
    /** Give this live exam a 6-digit code for testoza.com/join. */
    onGetCode?: (test: any) => void;
}

async function copyLink(test: any) {
    const ok = await copyText(getExamUrl(test));
    if (ok) toast.success('Exam link copied');
    else toast.error('Could not copy the link');
}

/** Exams running right now and the ones coming up — the first thing a teacher checks on exam day. */
export default function LiveNowSection({
    live, upcoming, updatedAt, now, onResults, onSettings, onEdit, onSolutions, onShare, onStop, onGetCode,
}: LiveNowSectionProps) {
    if (live.length === 0 && upcoming.length === 0) return null;

    return (
        <section aria-labelledby="live-now-heading" className="space-y-4">
            {live.length > 0 && (
                <div>
                    <SectionTitle
                        id="live-now-heading"
                        title="Live now"
                        count={live.length}
                        action={updatedAt && (
                            <span className="text-xs text-slate-500">Updates every 30 s · {timeOfDay(updatedAt)}</span>
                        )}
                    />
                    <div className="space-y-3">
                        {live.map(exam => (
                            <LiveExamCard
                                key={exam.test.id}
                                exam={exam}
                                now={now}
                                onResults={onResults}
                                onSettings={onSettings}
                                onEdit={onEdit}
                                onSolutions={onSolutions}
                                onShare={onShare}
                                onStop={onStop}
                                onGetCode={onGetCode}
                            />
                        ))}
                    </div>
                </div>
            )}

            {upcoming.length > 0 && (
                <div>
                    <SectionTitle id={live.length ? undefined : 'live-now-heading'} title="Coming up" count={upcoming.length} />
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {upcoming.slice(0, 4).map(({ test, startsAt }) => (
                            <li key={test.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-500/15">
                                        <CalendarClock className="h-[18px] w-[18px]" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-[15px] font-semibold text-slate-900" title={test.title}>{test.title}</p>
                                        <p className="mt-0.5 text-[13px] text-slate-600">
                                            Starts {dayAndTime(startsAt, now)} · <span className="font-medium text-violet-700">{untilText(startsAt, now)}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                                    <a
                                        href={examWhatsAppUrl(test, { startsAt })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Send on WhatsApp"
                                        title="Send on WhatsApp"
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/10 text-[#128C7E] transition-colors hover:bg-[#25D366]/20"
                                    >
                                        <WhatsAppIcon />
                                    </a>
                                    <button type="button" className={PILL_BTN} onClick={() => copyLink(test)}>
                                        <Copy className="h-4 w-4 text-sky-600" /> Copy link
                                    </button>
                                    <button type="button" className={PILL_BTN} onClick={() => onSettings(test)} aria-label="Exam settings">
                                        <Settings className="h-4 w-4 text-sky-600" />
                                        <span className="hidden sm:inline">Settings</span>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function LiveExamCard({
    exam, now, onResults, onSettings, onEdit, onSolutions, onShare, onStop, onGetCode,
}: { exam: LiveExam; now: Date } & Omit<LiveNowSectionProps, 'live' | 'upcoming' | 'updatedAt' | 'now'>) {
    const { test, writingNow, submitted, startedAt, endsAt, proctoringOff } = exam;
    const joinCode: string | undefined = test.settings?.conduct_exam?.join_code;
    const url = getExamUrl(test);
    const questions = test.total_questions || 0;

    const timing = [
        startedAt ? `Started ${timeOfDay(startedAt)}` : null,
        endsAt ? `Ends ${timeOfDay(endsAt)} (${untilText(endsAt, now).replace(/^in /, '')} left)` : null,
    ].filter(Boolean).join(' · ');

    return (
        <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-emerald-600/20 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-18px_rgba(5,150,105,0.45)]">
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-slate-900" title={test.title}>{test.title}</h3>
                        <p className="mt-1 text-[13px] text-slate-600">
                            {[questions ? plural(questions, 'question') : null, test.duration ? `${test.duration} min` : null, timing || null].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="More options" className={MENU_TRIGGER}>
                                <MoreHorizontal className="h-[18px] w-[18px]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                            {onGetCode && !joinCode && (
                                <DropdownMenuItem className={MENU_ITEM} onClick={() => onGetCode(test)}>
                                    <KeyRound className="mr-2.5 h-4 w-4 text-sky-600" /> Get a join code
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onShare(test)}>
                                <Share2 className="mr-2.5 h-4 w-4 text-slate-500" /> Share…
                            </DropdownMenuItem>
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onEdit(test)}>
                                <Pencil className="mr-2.5 h-4 w-4 text-slate-500" /> Edit questions
                            </DropdownMenuItem>
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onSolutions(test)}>
                                <FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Upload solutions
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* The two numbers that matter mid-exam */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div
                        className="rounded-xl bg-emerald-50/70 px-3.5 py-3 ring-1 ring-inset ring-emerald-600/10"
                        title="Candidates whose exam screen checked in during the last 3 minutes"
                    >
                        <p className="text-[28px] font-bold leading-none tracking-[-0.02em] text-slate-900">{writingNow}</p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-emerald-800">
                            <LiveDot /> Writing now
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onResults(test)}
                        className="rounded-xl bg-slate-50 px-3.5 py-3 text-left ring-1 ring-inset ring-slate-900/[0.05] transition-colors hover:bg-slate-100 cursor-pointer"
                    >
                        <p className="text-[28px] font-bold leading-none tracking-[-0.02em] text-slate-900">{submitted}</p>
                        <p className="mt-1.5 text-[13px] font-medium text-slate-600">Submitted →</p>
                    </button>
                </div>

                {/* Exam link */}
                <p className="mb-1.5 mt-4 text-xs font-medium text-slate-500">Exam link — send this to your candidates</p>
                <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3">
                        <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 select-all truncate font-mono text-[13px] text-slate-700" title={url}>
                            {url.replace(/^https?:\/\//, '')}
                        </span>
                        <button
                            type="button"
                            onClick={() => copyLink(test)}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5 transition-colors hover:bg-sky-50 motion-safe:active:scale-[0.97] cursor-pointer"
                        >
                            <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                    </div>
                    <a
                        href={examWhatsAppUrl(test)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Send on WhatsApp"
                        title="Send on WhatsApp"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.97]"
                    >
                        <WhatsAppIcon className="h-5 w-5" />
                    </a>
                </div>
                {joinCode && <JoinCodeLine code={joinCode} />}

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" className={PILL_BTN} onClick={() => onResults(test)}>
                        <BarChart3 className="h-4 w-4 text-sky-600" /> Results
                    </button>
                    <button type="button" className={PILL_BTN} onClick={() => onSettings(test)}>
                        <Settings className="h-4 w-4 text-sky-600" /> Settings
                    </button>
                    {proctoringOff && (
                        <button
                            type="button"
                            onClick={() => onSettings(test)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-[13px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 transition-colors hover:bg-amber-100 cursor-pointer"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" /> Anti-cheating is off
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onStop(test)}
                        className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                    >
                        <Square className="h-3 w-3 fill-current" /> Stop exam
                    </button>
                </div>
            </div>
        </article>
    );
}
