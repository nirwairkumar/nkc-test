import React from 'react';
import { ChevronRight, Plus, Users } from 'lucide-react';
import type { ExamSession } from '@/lib/examSessionsApi';
import { formatCode } from '@/lib/examSessionsApi';
import { dayTime } from '@/components/exams/examFormat';
import { LiveDot, Panel, TEXT_BTN } from './dashboardUi';

/** Sittings that are live, in the lobby or coming up — each with the code to read out. */
export default function ExamRoomsCard({ sessions, onOpen, onNew, onAll }: {
    sessions: ExamSession[];
    onOpen: (id: string) => void;
    onNew: () => void;
    onAll: () => void;
}) {
    const active = sessions
        .filter(s => s.phase !== 'ended')
        .sort((a, b) => (a.phase === 'live' ? -1 : b.phase === 'live' ? 1 : a.opens_at.localeCompare(b.opens_at)))
        .slice(0, 4);

    // The join-code way in is offered in "Make a new test" when nothing is running.
    if (active.length === 0) return null;

    return (
        <Panel
            id="exam-rooms-heading"
            title="Exams with a join code"
            count={active.length}
            action={(
                <div className="flex items-center gap-1">
                    <button type="button" onClick={onNew} className={TEXT_BTN}><Plus className="h-4 w-4" /> New</button>
                    <button type="button" onClick={onAll} className={TEXT_BTN}>All</button>
                </div>
            )}
        >
            <ul className="divide-y divide-slate-100">
                {active.map(s => (
                    <li key={s.id}>
                        <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 sm:gap-4 cursor-pointer">
                            <div className="min-w-0 flex-1">
                                <p className="flex min-w-0 items-center gap-2">
                                    {s.phase === 'live' && <LiveDot />}
                                    <span className="truncate text-[15px] font-semibold text-slate-900">{s.test.title}</span>
                                </p>
                                <p className="mt-0.5 truncate text-[13px] text-slate-600">
                                    {s.name} · {s.phase === 'live' ? 'live now' : s.phase === 'lobby' ? (s.start_mode === 'manual' ? 'waiting for you to start' : 'lobby open') : dayTime(s.opens_at)}
                                </p>
                                <p className="mt-1 flex items-center gap-1 text-[13px] text-slate-500">
                                    <Users className="h-3.5 w-3.5" />
                                    {s.counts.joined}{s.roster.students ? ` of ${s.roster.students}` : ''} joined
                                    {s.phase === 'live' && ` · ${s.counts.writing} writing · ${s.counts.submitted} submitted`}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-[17px] font-bold tabular-nums tracking-[0.08em] text-slate-900">
                                {formatCode(s.join_code)}
                            </span>
                            <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-300 sm:block" />
                        </button>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}
