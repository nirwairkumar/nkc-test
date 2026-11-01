/**
 * Admin → Referrals: who is inviting educators to TestoZa, and who joined through whom.
 *
 * Educators share app.testoza.com/invite/<CODE> from their dashboard or Settings. An open
 * is one browser opening a link; a join is a new account made after opening it (the
 * backend only credits accounts made in the last 7 days). Each joined account shows how
 * far it got, in the same steps as Users: signed up → made a test → getting results.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronRight, Gift, Loader2, UserPlus, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { insightsApi, type PeopleRow } from '../analytics/api';
import { initials, istDateTime, num, pct, ratio, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Chip, Empty, GroupedList, PILL_BTN, Segmented, Skeleton, StatTile, TileSkeletons } from '../analytics/ui';
import { roleLabel } from '../users/roles';
import UserSheet from '../users/UserSheet';
import { referralsApi, type JoinedRow, type ReferralAccount, type ReferralStage, type Referrer } from './api';

type View = 'referrers' | 'joined';
const VIEWS: readonly View[] = ['referrers', 'joined'];
const PAGE = 30;

const STAGE: Record<ReferralStage, { label: string; tone: 'slate' | 'sky' | 'emerald' }> = {
    signed_up: { label: 'Signed up', tone: 'slate' },
    made_test: { label: 'Made a test', tone: 'sky' },
    getting_results: { label: 'Getting results', tone: 'emerald' },
};

export default function ReferralsPanel() {
    const [view, setView] = usePersisted<View>('tz_admin_referrals_view', 'referrers', VIEWS);
    // Joined list narrowed to one referrer (tap a referrer).
    const [only, setOnly] = useState<ReferralAccount | null>(null);
    const [open, setOpen] = useState<PeopleRow | null>(null);
    const [opening, setOpening] = useState<string | null>(null);

    const overview = useQuery({
        queryKey: ['referrals', 'overview'],
        queryFn: referralsApi.overview,
        staleTime: 30_000,
        refetchInterval: 120_000,
    });

    const joined = useInfiniteQuery({
        queryKey: ['referrals', 'joined', only?.id ?? null],
        queryFn: ({ pageParam }) => referralsApi.joined({ limit: PAGE, offset: pageParam as number, referrer: only?.id }),
        enabled: view === 'joined',
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((a, pg) => a + pg.rows.length, 0);
            return loaded < last.total ? loaded : undefined;
        },
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const t = overview.data?.totals;
    const referrers = overview.data?.referrers ?? [];
    const joinedRows = joined.data?.pages.flatMap((p) => p.rows) ?? [];
    const joinedTotal = joined.data?.pages[0]?.total ?? 0;

    // The full account sheet from Users needs the account's real row (tests, results, role, verified).
    const openAccount = async (a: ReferralAccount) => {
        setOpening(a.id);
        try {
            const report = await insightsApi.people({ segment: 'members', q: a.email || a.full_name || '', sort: 'newest', limit: 20 });
            const row = report.rows.find((r) => r.id === a.id);
            if (row) setOpen(row);
            else toast.error('Couldn’t open this account. Find it in Users.');
        } catch {
            toast.error('Couldn’t open this account. Try again.');
        } finally {
            setOpening(null);
        }
    };

    const showJoinedFor = (r: Referrer) => {
        setOnly(r.user);
        setView('joined');
    };

    if ((overview.error as { response?: { status?: number } } | null)?.response?.status === 503) {
        return <Setup />;
    }

    return (
        <div className="space-y-5 pb-10">
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Growth</p>
                <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Referrals</h1>
                <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                    Who is inviting educators to TestoZa, who joined through whom, and how far each new account got.
                </p>
            </header>

            {/* ── Totals ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {!t ? <TileSkeletons count={5} /> : (
                    <>
                        <StatTile label="Link opens" value={num(t.visits)} sub="different browsers" info="Each browser that opened someone's invite link counts once per link." />
                        <StatTile label="Joined" value={num(t.joined)} sub={t.visits ? `${pct(ratio(t.joined, t.visits))} of opens` : undefined} info="New accounts made after opening an invite link. Only accounts made within 7 days of signing up count." />
                        <StatTile label="Made a test" value={num(t.made_test)} sub={t.joined ? `${pct(ratio(t.made_test, t.joined))} of joined` : undefined} info="Joined accounts with a test of their own (the seeded example test doesn't count)." />
                        <StatTile label="Getting results" value={num(t.getting_results)} sub={t.joined ? `${pct(ratio(t.getting_results, t.joined))} of joined` : undefined} info="Joined accounts whose tests were submitted by someone else." />
                        <StatTile label="Referrers" value={num(referrers.length)} sub={`${num(t.referrers)} brought someone · ${num(t.codes)} have a link`} info="People whose invite link was opened or used (the list below). 'Brought someone': at least one new account joined. 'Have a link': opened their invite card on the dashboard or in Settings." />
                    </>
                )}
            </div>

            {/* ── Switch ── */}
            <div className="flex flex-wrap items-center gap-2">
                <Segmented<View>
                    ariaLabel="Show"
                    value={view}
                    onChange={(v) => { setView(v); if (v === 'referrers') setOnly(null); }}
                    options={[
                        { value: 'referrers', label: <SegLabel text="Referrers" n={overview.data ? referrers.length : undefined} /> },
                        { value: 'joined', label: <SegLabel text="Joined" n={t?.joined} /> },
                    ]}
                />
                {view === 'joined' && only && (
                    <button
                        type="button"
                        onClick={() => setOnly(null)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-violet-50 pl-3 pr-2 text-[12.5px] font-semibold text-violet-800 ring-1 ring-inset ring-violet-600/15 hover:bg-violet-100"
                    >
                        Brought by {name(only)} <X className="h-3.5 w-3.5" aria-label="Show everyone" />
                    </button>
                )}
            </div>

            {/* ── Lists ── */}
            {view === 'referrers' ? (
                overview.error && !overview.data ? (
                    <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
                ) : !overview.data ? (
                    <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
                ) : referrers.length === 0 ? (
                    <div className={CARD}>
                        <Empty icon={Gift} title="No invite link has been opened yet">
                            Educators find their link on the dashboard (Invite educators) and in Settings → Invite educators.
                        </Empty>
                    </div>
                ) : (
                    <GroupedList>
                        {referrers.map((r) => <ReferrerRow key={r.user.id} r={r} onOpen={() => showJoinedFor(r)} />)}
                    </GroupedList>
                )
            ) : joined.error && !joined.data ? (
                <ErrorState error={joined.error} onRetry={() => joined.refetch()} />
            ) : !joined.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : joinedRows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={UserPlus} title={only ? `Nobody has joined with ${name(only)}'s link yet` : 'Nobody has joined through an invite yet'} />
                </div>
            ) : (
                <>
                    <p className="px-1 text-[12px] font-medium text-slate-500">{num(joinedTotal)} {joinedTotal === 1 ? 'account' : 'accounts'}, newest first</p>
                    <GroupedList className={cn(joined.isPlaceholderData && 'opacity-60')}>
                        {joinedRows.map((row) => (
                            <JoinedItem
                                key={row.id}
                                row={row}
                                busy={opening === row.user.id}
                                onOpen={() => openAccount(row.user)}
                                onReferrer={only ? undefined : () => setOnly(row.referrer)}
                            />
                        ))}
                    </GroupedList>
                    {joined.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => joined.fetchNextPage()} disabled={joined.isFetchingNextPage}>
                                {joined.isFetchingNextPage ? 'Loading…' : `Show more (${num(joinedTotal - joinedRows.length)} left)`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <UserSheet person={open} onClose={() => setOpen(null)} />
        </div>
    );
}

const name = (a: ReferralAccount) => a.full_name || a.email?.split('@')[0] || 'No name';

function Avatar({ a, size = 40 }: { a: ReferralAccount; size?: number }) {
    if (a.avatar_url) {
        return <img src={a.avatar_url} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]" style={{ width: size, height: size }} />;
    }
    return (
        <span className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 font-bold text-white" style={{ width: size, height: size, fontSize: Math.round(size * 0.33) }}>
            {initials(name(a))}
        </span>
    );
}

function ReferrerRow({ r, onOpen }: { r: Referrer; onOpen: () => void }) {
    const role = roleLabel(r.user.designation);
    const last = r.last_joined_at || r.last_visit_at;
    return (
        <li>
            <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <Avatar a={r.user} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{name(r.user)}</span>
                        {role && <Chip>{role}</Chip>}
                        {r.code && <Chip tone="violet" title="Their invite code">{r.code}</Chip>}
                    </div>
                    <p className="truncate text-[12px] text-slate-500">
                        {r.user.email}{last ? ` · last ${r.last_joined_at ? 'join' : 'open'} ${relative(last)}` : ''}
                    </p>
                </div>
                <dl className="hidden shrink-0 grid-cols-4 gap-4 text-right sm:grid">
                    <Num label="Opens" n={r.visits} />
                    <Num label="Joined" n={r.joined} strong />
                    <Num label="Made a test" n={r.made_test} />
                    <Num label="Results" n={r.getting_results} good />
                </dl>
                <span className="shrink-0 text-right text-[12px] font-semibold text-slate-700 sm:hidden">
                    {num(r.joined)} joined<br /><span className="font-normal text-slate-500">{num(r.visits)} opens</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
        </li>
    );
}

function Num({ label, n, strong, good }: { label: string; n: number; strong?: boolean; good?: boolean }) {
    return (
        <div className="flex min-w-[52px] flex-col-reverse">
            <dt className="text-[10.5px] font-medium text-slate-400">{label}</dt>
            <dd className={cn('text-[16px] font-semibold tabular-nums', strong ? 'text-slate-900' : good && n > 0 ? 'text-emerald-700' : 'text-slate-600')}>{num(n)}</dd>
        </div>
    );
}

function JoinedItem({ row, busy, onOpen, onReferrer }: { row: JoinedRow; busy: boolean; onOpen: () => void; onReferrer?: () => void }) {
    const role = roleLabel(row.user.designation);
    const stage = STAGE[row.stage];
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <Avatar a={row.user} />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={onOpen} className="truncate text-left text-[14px] font-semibold text-slate-900 hover:underline">
                        {name(row.user)}
                    </button>
                    {role && <Chip>{role}</Chip>}
                    <Chip tone={stage.tone}>{stage.label}</Chip>
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                </div>
                <p className="truncate text-[12px] text-slate-500">{row.user.email}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-slate-500">
                    <span title={istDateTime(row.created_at)}>Joined {relative(row.created_at)}</span>
                    <span aria-hidden="true">·</span>
                    {onReferrer ? (
                        <button type="button" onClick={onReferrer} className="font-semibold text-violet-700 hover:underline">via {name(row.referrer)}</button>
                    ) : (
                        <span>via {name(row.referrer)}</span>
                    )}
                    <span className="font-mono text-[11px] text-slate-400">{row.code}</span>
                </p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[13px] font-semibold text-slate-800 tabular-nums">{num(row.tests_made)} {row.tests_made === 1 ? 'test' : 'tests'}</p>
                <p className={cn('text-[12px] tabular-nums', row.candidates ? 'text-emerald-700' : 'text-slate-400')}>
                    {num(row.candidates)} {row.candidates === 1 ? 'candidate' : 'candidates'}
                </p>
            </div>
            <button type="button" onClick={onOpen} aria-label={`Open ${name(row.user)}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <ChevronRight className="h-4 w-4" />
            </button>
        </li>
    );
}

function SegLabel({ text, n }: { text: string; n?: number }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {text}
            {n !== undefined && <span className="rounded-full bg-slate-900/[0.06] px-1.5 text-[11px] font-semibold tabular-nums text-slate-500">{num(n)}</span>}
        </span>
    );
}

function Setup() {
    return (
        <div className={cn(CARD, 'p-6')}>
            <p className="text-[16px] font-semibold text-slate-900">Referrals need one SQL file</p>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
                Run <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">supabase/migrations/20261026120000_referrals.sql</code> in
                the Supabase SQL editor, then reload this page. Until then educators don't see the invite card.
            </p>
        </div>
    );
}
