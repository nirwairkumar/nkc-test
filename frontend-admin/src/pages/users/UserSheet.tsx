/**
 * One account, iOS settings style: who they are, where they are in the educator
 * journey, what to do next (follow-up email), role, verification, their tests and
 * attempts, where they came from, and a guarded delete.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, Copy, Info, Mail, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteUserPermanently, revokeVerification, updateProfile, verifyCreator } from '@/lib/usersApi';
import { cn } from '@/lib/utils';
import { insightsApi, type PeopleRow } from '../analytics/api';
import { duration, istDate, istDateTime, num, relative } from '../analytics/format';
import { ChannelIcon, ErrorState, PathLabel } from '../analytics/shared';
import { CARD, Chip, GroupedList, IosSheet, KeyValue, Skeleton } from '../analytics/ui';
import { Avatar } from './UsersPanel';
import { displayName, firstName, FOLLOW_UP, KIND_LABEL, KIND_TONE, LEGACY_ROLES, mailto, ROLES } from './roles';

const SECTION = 'mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400';

export default function UserSheet({ person, onClose }: { person: PeopleRow | null; onClose: () => void }) {
    const [kept, setKept] = useState<PeopleRow | null>(person);
    useEffect(() => { if (person) setKept(person); }, [person]);
    const p = person || kept;
    const qc = useQueryClient();
    const [role, setRole] = useState<string | null>(p?.designation ?? null);
    const [verified, setVerified] = useState<boolean>(!!p?.is_verified_creator);
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        setRole(p?.designation ?? null);
        setVerified(!!p?.is_verified_creator);
    }, [p?.id, p?.designation, p?.is_verified_creator]);

    const { data, error } = useQuery({
        queryKey: ['analytics', 'person', null, p?.id],
        queryFn: () => insightsApi.person({ user: p!.id }),
        enabled: !!person,
        staleTime: 30_000,
    });
    const u = data?.user;

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ['users'] });
        qc.invalidateQueries({ queryKey: ['analytics', 'person'] });
    };

    const changeRole = async (next: string) => {
        if (!p || next === role) return;
        const before = role;
        setRole(next);
        setBusy('role');
        const { error: err } = await updateProfile(p.id, { designation: next });
        setBusy(null);
        if (err) {
            setRole(before);
            toast.error('Couldn’t change the role. Try again.');
            return;
        }
        toast.success(`${displayName(p)} is now ${next === 'Other' ? '“Other”' : `a${/^[AEIOU]/.test(next) ? 'n' : ''} ${next}`}`);
        refresh();
    };

    const toggleVerified = async () => {
        if (!p) return;
        const next = !verified;
        setVerified(next);
        setBusy('verify');
        const { error: err } = next ? await verifyCreator(p.id) : await revokeVerification(p.id);
        setBusy(null);
        if (err) {
            setVerified(!next);
            toast.error('Couldn’t update verification. Try again.');
            return;
        }
        toast.success(next ? 'Marked as a verified creator' : 'Verification removed');
        refresh();
    };

    const copyEmail = async () => {
        if (!p?.email) return;
        try {
            await navigator.clipboard.writeText(p.email);
            toast.success('Email copied');
        } catch {
            toast.error('Couldn’t copy');
        }
    };

    const remove = async () => {
        if (!p) return;
        setBusy('delete');
        const { error: err } = await deleteUserPermanently(p.id);
        setBusy(null);
        if (err) {
            toast.error('Couldn’t delete the account.');
            return;
        }
        toast.success('Account deleted');
        setConfirmDelete(false);
        refresh();
        onClose();
    };

    const isCandidate = p?.kind === 'candidate';
    const follow = p?.follow_up ? FOLLOW_UP[p.follow_up] : null;
    const realEmail = p?.email && !isCandidate ? p.email : null;

    return (
        <IosSheet
            open={!!person}
            onOpenChange={(o) => !o && onClose()}
            title={p ? displayName(p) : 'Account'}
            subtitle={p ? (isCandidate ? 'Exam candidate — not a sign-up' : p.email || undefined) : undefined}
        >
            {p && (
                <div className="space-y-5">
                    {/* ── Identity ── */}
                    <section className={cn(CARD, 'p-4')}>
                        <div className="flex items-center gap-3">
                            <Avatar row={p} size="lg" />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5">
                                    <span className="truncate text-[16px] font-semibold text-slate-900">{displayName(p)}</span>
                                    {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Verified creator" />}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <Chip tone={KIND_TONE[p.kind]}>{p.kind === 'educator' && role ? role : KIND_LABEL[p.kind]}</Chip>
                                    {p.is_premium && <Chip tone="amber">Premium</Chip>}
                                    <span className="text-[12px] text-slate-500">{isCandidate ? 'First exam' : 'Joined'} {istDate(p.created_at)}</span>
                                </p>
                            </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {!isCandidate && <Stat label="Tests made" value={p.tests_created} />}
                            {!isCandidate && <Stat label="Results received" value={p.results} hint="their tests, taken by others" />}
                            <Stat label="Tests taken" value={p.tests_taken} />
                            <Stat label="Last active" text={relative(p.last_active_at)} />
                        </dl>
                    </section>

                    {isCandidate && (
                        <Notice>
                            This login was created automatically when they took an exam without an account, so it isn’t a
                            sign-up and isn’t counted as a user. Their exam results are stored on it.
                        </Notice>
                    )}

                    {/* ── Educator journey ── */}
                    {p.kind === 'educator' && p.stage && <Journey stage={p.stage} />}

                    {/* ── What to do next ── */}
                    {follow && realEmail && (
                        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-amber-500/25 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-18px_rgba(217,119,6,0.5)]">
                            <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-2.5">
                                <p className="text-[13px] font-semibold text-amber-900">{follow.title}</p>
                                <p className="text-[12px] text-amber-800/80">{follow.why}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                                <a href={mailto(realEmail, follow.subject, follow.body(firstName(p)))}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sky-600 px-4 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-sky-700 motion-safe:active:scale-[0.97]">
                                    <Mail className="h-4 w-4" /> Write a follow-up
                                </a>
                                <span className="text-[12px] text-slate-500">Opens your mail app with a short draft you can edit.</span>
                            </div>
                        </section>
                    )}

                    {/* ── Role ── */}
                    {!isCandidate && p.kind !== 'team' && (
                        <div>
                            <p className={SECTION}>Role</p>
                            <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')} role="radiogroup" aria-label="Role">
                                {ROLES.map((r) => {
                                    const on = role === r.value;
                                    return (
                                        <li key={r.value}>
                                            <button type="button" role="radio" aria-checked={on} disabled={busy === 'role'}
                                                onClick={() => changeRole(r.value)}
                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-[14px] font-medium text-slate-900">{r.label}</span>
                                                    <span className="block text-[12px] text-slate-500">{r.hint}</span>
                                                </span>
                                                {on && <Check className="h-[18px] w-[18px] shrink-0 text-sky-600" strokeWidth={2.75} aria-hidden="true" />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <p className="mt-1.5 px-1 text-[12px] text-slate-500">
                                {role && LEGACY_ROLES[role] ? `Currently: ${LEGACY_ROLES[role]}.` : !role ? 'No role yet — they skipped onboarding.' : 'The same choices people see when they sign up.'}
                            </p>
                        </div>
                    )}

                    {/* ── Verification ── */}
                    {p.kind === 'educator' && (
                        <GroupedList>
                            <li className="flex items-center justify-between gap-4 px-4 py-3">
                                <span>
                                    <span className="block text-[14px] font-medium text-slate-900">Verified creator</span>
                                    <span className="block text-[12px] text-slate-500">Shows a blue badge on their tests and profile.</span>
                                </span>
                                <IosSwitch checked={verified} onChange={toggleVerified} disabled={busy === 'verify'} label="Verified creator" />
                            </li>
                        </GroupedList>
                    )}

                    {error ? <ErrorState error={error} /> : !data ? <Skeleton className="h-40" /> : (
                        <>
                            {u && u.recent_tests.length > 0 && (
                                <div>
                                    <p className={SECTION}>Their tests</p>
                                    <GroupedList>
                                        {u.recent_tests.map((t) => (
                                            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[13px] font-medium text-slate-800">{t.title}</span>
                                                    <span className="block text-[12px] text-slate-500">{istDate(t.created_at)}{t.is_public ? '' : ' · private'}</span>
                                                </span>
                                                <span className="shrink-0 text-right">
                                                    <span className={cn('block text-[15px] font-semibold tabular-nums', t.submissions ? 'text-slate-900' : 'text-slate-400')}>{num(t.submissions)}</span>
                                                    <span className="block text-[11px] text-slate-400">taken</span>
                                                </span>
                                            </li>
                                        ))}
                                    </GroupedList>
                                </div>
                            )}

                            {u?.recent_attempts && u.recent_attempts.length > 0 && (
                                <div>
                                    <p className={SECTION}>Tests they took</p>
                                    <GroupedList>
                                        {u.recent_attempts.map((a) => (
                                            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[13px] font-medium text-slate-800">{a.title || 'Deleted test'}</span>
                                                    <span className="block truncate text-[12px] text-slate-500">
                                                        {a.own_test ? 'Their own test (a preview)' : `by ${a.creator_name || 'unknown creator'}`} · {istDateTime(a.created_at)}
                                                    </span>
                                                </span>
                                                {a.score !== null && (
                                                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                                                        {Number(a.score)}{a.total_max_marks ? <span className="font-normal text-slate-400">/{Number(a.total_max_marks)}</span> : null}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </GroupedList>
                                </div>
                            )}

                            <div>
                                <p className={SECTION}>Visits</p>
                                <GroupedList>
                                    {data.first_touch ? (
                                        <>
                                            <KeyValue label="First came from">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <ChannelIcon channel={data.first_touch.channel || 'Direct'} />
                                                    {data.first_touch.channel}{data.first_touch.referrer_host ? ` · ${data.first_touch.referrer_host}` : ''}
                                                </span>
                                            </KeyValue>
                                            <KeyValue label="First page">
                                                {data.first_touch.landing_path ? <PathLabel path={data.first_touch.landing_path} host={data.first_touch.host} showHost /> : '—'}
                                            </KeyValue>
                                            <KeyValue label="Visits">{num(data.totals.sessions)} · {duration(data.totals.engaged_ms)} active</KeyValue>
                                        </>
                                    ) : (
                                        <KeyValue label="Visits">{isCandidate ? 'Not signed in while visiting' : 'None since tracking started (26 Sep)'}</KeyValue>
                                    )}
                                </GroupedList>
                            </div>
                        </>
                    )}

                    {/* ── Contact + danger ── */}
                    <GroupedList>
                        {realEmail && (
                            <>
                                <li>
                                    <a href={`mailto:${realEmail}`} className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-sky-700 hover:bg-slate-50">
                                        <Mail className="h-4 w-4" /> Email {firstName(p)}
                                    </a>
                                </li>
                                <li>
                                    <button type="button" onClick={copyEmail} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-medium text-sky-700 hover:bg-slate-50">
                                        <Copy className="h-4 w-4" /> Copy email address
                                    </button>
                                </li>
                            </>
                        )}
                        {p.kind !== 'team' && (
                            <li>
                                <button type="button" onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-medium text-rose-600 hover:bg-rose-50/60">
                                    <Trash2 className="h-4 w-4" /> Delete account…
                                </button>
                            </li>
                        )}
                    </GroupedList>

                    <DeleteDialog
                        open={confirmDelete}
                        onOpenChange={setConfirmDelete}
                        person={p}
                        busy={busy === 'delete'}
                        onConfirm={remove}
                    />
                </div>
            )}
        </IosSheet>
    );
}

function Stat({ label, value, text, hint }: { label: string; value?: number; text?: string; hint?: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2" title={hint}>
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className={cn('font-semibold text-slate-900', text ? 'text-[14px] leading-6' : 'text-[18px] tabular-nums')}>{text ?? num(value)}</dd>
        </div>
    );
}

function Notice({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 rounded-2xl bg-slate-100/80 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <p>{children}</p>
        </div>
    );
}

const STEPS = ['Signed up', 'Made a test', 'Got results'];

function Journey({ stage }: { stage: NonNullable<PeopleRow['stage']> }) {
    const reached = stage === 'signed_up' ? 0 : stage === 'created_test' ? 1 : 2;
    const quiet = stage === 'went_quiet';
    return (
        <section className={cn(CARD, 'px-4 py-3.5')} aria-label="Educator journey">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">Journey</p>
            <ol className="mt-3 flex items-center">
                {STEPS.map((label, i) => {
                    const done = i <= reached;
                    return (
                        <li key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                            <span className="flex flex-col items-center gap-1.5">
                                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                                    done ? (quiet && i === 2 ? 'bg-amber-500 text-white' : 'bg-sky-600 text-white') : 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200')}>
                                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                                </span>
                                <span className={cn('whitespace-nowrap text-[11px] font-medium', done ? 'text-slate-800' : 'text-slate-400')}>{label}</span>
                            </span>
                            {i < STEPS.length - 1 && (
                                <span className={cn('mx-2 mb-5 h-[2px] flex-1 rounded-full', i < reached ? 'bg-sky-600' : 'bg-slate-200')} aria-hidden="true" />
                            )}
                        </li>
                    );
                })}
            </ol>
            {quiet && <p className="mt-2 text-[12px] font-medium text-amber-700">Quiet for 3+ weeks since their last result.</p>}
        </section>
    );
}

export function IosSwitch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className={cn('relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:opacity-60',
                checked ? 'bg-emerald-500' : 'bg-slate-200')}
        >
            <span className={cn('inline-block h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-200',
                checked ? 'translate-x-[22px]' : 'translate-x-[2px]')} />
        </button>
    );
}

function DeleteDialog({ open, onOpenChange, person, busy, onConfirm }: {
    open: boolean; onOpenChange: (o: boolean) => void; person: PeopleRow; busy: boolean; onConfirm: () => void;
}) {
    const [typed, setTyped] = useState('');
    useEffect(() => { if (!open) setTyped(''); }, [open]);
    const consequences: string[] = [];
    if (person.tests_taken) consequences.push(`${num(person.tests_taken)} exam result${person.tests_taken === 1 ? '' : 's'} they submitted — also gone from the teacher’s results`);
    if (person.tests_created) consequences.push(`${num(person.tests_created)} test${person.tests_created === 1 ? '' : 's'} they made stay, but without an owner`);
    consequences.push('Their login and profile');
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm rounded-[22px] p-5">
                <AlertDialogHeader>
                    <AlertDialogTitle className="!text-[17px]">Delete {displayName(person)}?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-[13px] text-slate-600">
                            <p>This can’t be undone. It permanently deletes:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                {consequences.map((c) => <li key={c}>{c}</li>)}
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <label className="mt-1 block text-[12px] font-medium text-slate-600">
                    Type <b>delete</b> to confirm
                    <input
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoComplete="off"
                        className="mt-1.5 h-10 w-full rounded-xl border-transparent bg-slate-100 px-3 text-[14px] text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                    />
                </label>
                <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
                    <AlertDialogCancel className="h-10 rounded-xl">Cancel</AlertDialogCancel>
                    <button
                        type="button"
                        disabled={typed.trim().toLowerCase() !== 'delete' || busy}
                        onClick={onConfirm}
                        className="h-10 rounded-xl bg-rose-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {busy ? 'Deleting…' : 'Delete account'}
                    </button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
