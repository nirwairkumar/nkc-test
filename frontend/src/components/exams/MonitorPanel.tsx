import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, KeyRound, MoreHorizontal, Smartphone, UserX, WifiOff } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonitorData, MonitorParticipant, batchesApi, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { CARD, MENU_ITEM, MENU_TRIGGER } from '@/components/dashboard/dashboardUi';
import { clock, timeOnly, useServerClock } from './examFormat';
import { Segmented } from './ios';

type Filter = 'all' | 'writing' | 'submitted' | 'attention' | 'absent';

const needsAttention = (p: MonitorParticipant) =>
    (p.status === 'writing' && !p.online) || p.violations > 0 || p.device_changes > 0;

/** Who is in the lobby, writing, done or missing — refreshed every few seconds. */
export default function MonitorPanel({ data, onChanged }: { data: MonitorData; onChanged: () => void }) {
    const [filter, setFilter] = useState<Filter>('all');
    const [newPin, setNewPin] = useState<{ name: string; roll: string; pin: string } | null>(null);
    const now = useServerClock(data.server_time);

    const people = data.participants.filter(p => p.status !== 'removed');
    const counts = {
        writing: people.filter(p => p.status === 'writing').length,
        submitted: people.filter(p => p.status === 'submitted').length,
        lobby: people.filter(p => p.status === 'joined').length,
        offline: people.filter(p => p.status === 'writing' && !p.online).length,
        attention: people.filter(needsAttention).length,
        absent: data.not_joined.length,
    };

    const shown = useMemo(() => {
        const order = { writing: 0, joined: 1, submitted: 2, removed: 3 } as const;
        const sorted = [...people].sort((a, b) =>
            Number(needsAttention(b)) - Number(needsAttention(a)) || order[a.status] - order[b.status] || a.name.localeCompare(b.name));
        if (filter === 'writing') return sorted.filter(p => p.status === 'writing' || p.status === 'joined');
        if (filter === 'submitted') return sorted.filter(p => p.status === 'submitted');
        if (filter === 'attention') return sorted.filter(needsAttention);
        if (filter === 'absent') return [];
        return sorted;
    }, [people, filter]);

    const act = async (p: MonitorParticipant, action: 'extra-time' | 'force-submit' | 'allow-retake' | 'remove', minutes?: number) => {
        try {
            await examSessionsApi.participant(data.id, p.id, action, minutes);
            toast.success({
                'extra-time': `${p.name} got ${minutes} more minutes.`,
                'force-submit': `${p.name}'s exam will submit within 20 seconds.`,
                'allow-retake': `${p.name} can take the exam again.`,
                remove: `${p.name} was removed.`,
            }[action]);
            onChanged();
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    const resetPin = async (rosterId: string, name: string, roll: string) => {
        if (!data.class_id) return;
        try {
            const res = await batchesApi.makePins(data.class_id, { studentIds: [rosterId] });
            const made = res.pins[0];
            if (made) setNewPin({ name, roll, pin: made.pin });
        } catch (err) {
            toast.error(problemOf(err).message);
        }
    };

    return (
        <section className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat label={data.phase === 'live' ? 'Writing' : 'In lobby'} value={data.phase === 'live' ? counts.writing : counts.lobby} tone="text-emerald-700" live={data.phase === 'live' && counts.writing > 0} />
                <Stat label="Submitted" value={counts.submitted} tone="text-slate-900" />
                <Stat label="Need a look" value={counts.attention} tone={counts.attention ? 'text-amber-700' : 'text-slate-900'} />
                <Stat label={data.class_id ? 'Not joined' : 'Joined'} value={data.class_id ? counts.absent : people.length} tone="text-slate-900" />
            </div>

            <div className="overflow-x-auto pb-1">
                <div className="w-max min-w-full sm:w-auto">
                    <Segmented<Filter>
                        value={filter}
                        onChange={setFilter}
                        ariaLabel="Show candidates"
                        options={[
                            { value: 'all', label: `All ${people.length}` },
                            { value: 'writing', label: 'Not done' },
                            { value: 'submitted', label: 'Submitted' },
                            { value: 'attention', label: `Need a look${counts.attention ? ` ${counts.attention}` : ''}` },
                            ...(data.class_id ? [{ value: 'absent' as Filter, label: `Not joined ${counts.absent}` }] : []),
                        ]}
                    />
                </div>
            </div>

            {filter !== 'absent' && (
                shown.length === 0 ? (
                    <div className={`${CARD} px-6 py-10 text-center`}>
                        <p className="text-[16px] font-semibold text-slate-900">
                            {people.length === 0 ? 'Nobody has joined yet' : 'Nobody here'}
                        </p>
                        <p className="mt-1 text-[14px] text-slate-600">
                            {people.length === 0 ? 'Names appear here the moment candidates enter the code.' : 'Try another filter.'}
                        </p>
                    </div>
                ) : (
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {shown.map(p => (
                            <ParticipantRow
                                key={p.id}
                                p={p}
                                now={now}
                                canResetPin={data.identity_mode === 'roll_pin' && !!p.roster_student_id}
                                onAct={(action, minutes) => act(p, action, minutes)}
                                onResetPin={() => p.roster_student_id && resetPin(p.roster_student_id, p.name, p.roll_no || '')}
                            />
                        ))}
                    </ul>
                )
            )}

            {(filter === 'absent' || filter === 'all') && data.not_joined.length > 0 && (
                <div>
                    <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Not joined ({data.not_joined.length})</h3>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {data.not_joined.map(s => (
                            <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                <Avatar name={s.name} muted />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] text-slate-700">{s.name}</p>
                                    <p className="text-[13px] text-slate-500">Roll {s.roll_no}{data.identity_mode === 'roll_pin' && !s.has_pin ? ' · no PIN yet' : ''}</p>
                                </div>
                                {data.identity_mode === 'roll_pin' && (
                                    <button type="button" onClick={() => resetPin(s.id, s.name, s.roll_no)} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-sky-700 hover:bg-sky-50 cursor-pointer">
                                        <KeyRound className="h-3.5 w-3.5" /> New PIN
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <AlertDialog open={!!newPin} onOpenChange={(open) => { if (!open) setNewPin(null); }}>
                <AlertDialogContent className="max-w-[min(360px,calc(100vw-32px))] rounded-2xl text-center">
                    <AlertDialogTitle className="text-lg font-semibold text-slate-900">New PIN for {newPin?.name}</AlertDialogTitle>
                    <AlertDialogDescription className="text-[14px] text-slate-600">Roll {newPin?.roll}. The old PIN no longer works. Tell the candidate now — it is not shown again.</AlertDialogDescription>
                    <p className="my-2 text-[48px] font-bold tracking-[0.3em] text-slate-900 tabular-nums">{newPin?.pin}</p>
                    <AlertDialogAction className="h-11 rounded-xl">Done</AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}

function Stat({ label, value, tone, live }: { label: string; value: number; tone: string; live?: boolean }) {
    return (
        <div className={`${CARD} px-4 py-3`}>
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />}{label}
            </p>
            <p className={`mt-0.5 text-[28px] font-bold leading-tight tracking-[-0.02em] ${tone}`}>{value}</p>
        </div>
    );
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
    const parts = name.trim().split(/\s+/);
    const initials = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
    return (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${muted ? 'bg-slate-100 text-slate-400' : 'bg-sky-50 text-sky-700'}`}>
            {initials}
        </span>
    );
}

function ParticipantRow({ p, now, canResetPin, onAct, onResetPin }: {
    p: MonitorParticipant;
    now: number;
    canResetPin: boolean;
    onAct: (action: 'extra-time' | 'force-submit' | 'allow-retake' | 'remove', minutes?: number) => void;
    onResetPin: () => void;
}) {
    const left = p.deadline ? Math.max(0, Math.round((new Date(p.deadline).getTime() - now) / 1000)) : null;
    const seenAgo = p.last_seen_at ? Math.max(0, Math.round((now - new Date(p.last_seen_at).getTime()) / 1000)) : null;

    let status: React.ReactNode;
    if (p.status === 'submitted') {
        status = <span className="text-slate-600">Submitted {timeOnly(p.submitted_at)}</span>;
    } else if (p.status === 'writing') {
        status = p.online
            ? <span className="text-emerald-700">Writing{left !== null ? ` · ${clock(left)} left` : ''}</span>
            : <span className="inline-flex items-center gap-1 text-amber-700"><WifiOff className="h-3.5 w-3.5" /> No signal for {seenAgo !== null ? clock(seenAgo) : 'a while'}</span>;
    } else {
        status = <span className="text-sky-700">In the lobby</span>;
    }

    return (
        <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <Avatar name={p.name} />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-slate-900">{p.name}</span>
                    {p.roll_no && <span className="shrink-0 text-[13px] text-slate-500">{p.roll_no}</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                    {status}
                    {p.status !== 'joined' && <span className="text-slate-500">{p.answered} answered</span>}
                    {p.violations > 0 && <Flag icon={AlertTriangle} tone="amber">{p.violations} warning{p.violations === 1 ? '' : 's'}</Flag>}
                    {p.device_changes > 0 && <Flag icon={Smartphone} tone="violet">Changed device{p.device_changes > 1 ? ` ×${p.device_changes}` : ''}</Flag>}
                    {p.extra_minutes > 0 && <Flag tone="sky">+{p.extra_minutes} min</Flag>}
                    {p.force_submit_requested && p.status !== 'submitted' && <Flag tone="red">Submitting…</Flag>}
                </div>
                {p.status === 'writing' && (
                    <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${Math.min(100, p.progress)}%` }} />
                    </div>
                )}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={`Actions for ${p.name}`} className={MENU_TRIGGER}><MoreHorizontal className="h-[18px] w-[18px]" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                    {p.status !== 'submitted' && (
                        <>
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onAct('extra-time', 5)}>+5 minutes</DropdownMenuItem>
                            <DropdownMenuItem className={MENU_ITEM} onClick={() => onAct('extra-time', 10)}>+10 minutes</DropdownMenuItem>
                            {p.status === 'writing' && (
                                <DropdownMenuItem className={MENU_ITEM} onClick={() => onAct('force-submit')}>Submit their exam now</DropdownMenuItem>
                            )}
                        </>
                    )}
                    {p.status === 'submitted' && (
                        <DropdownMenuItem className={MENU_ITEM} onClick={() => onAct('allow-retake')}>Let them take it again</DropdownMenuItem>
                    )}
                    {canResetPin && (
                        <DropdownMenuItem className={MENU_ITEM} onClick={onResetPin}><KeyRound className="mr-2.5 h-4 w-4 text-slate-500" />New PIN</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={`${MENU_ITEM} text-red-600 focus:bg-red-50 focus:text-red-600`} onClick={() => onAct('remove')}>
                        <UserX className="mr-2.5 h-4 w-4" /> Remove from exam
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    );
}

function Flag({ icon: Icon, tone, children }: { icon?: React.ComponentType<{ className?: string }>; tone: 'amber' | 'violet' | 'sky' | 'red'; children: React.ReactNode }) {
    const tones = {
        amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        red: 'bg-red-50 text-red-700 ring-red-600/15',
    } as const;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${tones[tone]}`}>
            {Icon && <Icon className="h-3 w-3" />}{children}
        </span>
    );
}
