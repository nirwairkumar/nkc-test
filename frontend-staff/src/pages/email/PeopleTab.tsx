/** Email → People: everyone we may email, by stage and group, and whether they can get one today. Addresses masked. */
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { PenSquare, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, CARD, Chip, Empty, ErrorBox, Skeleton, cx } from '@/components/ui';
import { initials, num, relative } from '@/lib/format';
import { emailApi, errorText, type AudienceFilter, type Person, type Stage, type Who } from './api';
import { ChoiceChips, Segmented } from './kit';
import { STAGE, STAGES, STATUS, WHO, WHOS, WHO_TONE, audienceLabel } from './model';

const PAGE = 50;

export default function PeopleTab({ onWrite }: { onWrite: (f: AudienceFilter) => void }) {
    const [stages, setStages] = useState<Stage[]>([]);
    const [whos, setWhos] = useState<Who[]>([]);
    const [show, setShow] = useState<'all' | 'ready' | 'skipped'>('all');
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQ(input.trim()), 350);
        return () => clearTimeout(t);
    }, [input]);

    const filter: AudienceFilter = { stages, whos, q: q || undefined, show };
    const list = useInfiniteQuery({
        queryKey: ['email', 'people', filter],
        queryFn: ({ pageParam }) => emailApi.audience(filter, PAGE, pageParam as number),
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((a, p) => a + p.rows.length, 0);
            return loaded < last.shown ? loaded : undefined;
        },
        placeholderData: keepPreviousData,
        staleTime: 20_000,
    });
    const first = list.data?.pages[0];
    const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

    return (
        <div className="space-y-4">
            <div className={cx(CARD, 'space-y-3 p-4')}>
                <div>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Stage</p>
                    <ChoiceChips<Stage> ariaLabel="Stage" value={stages} onChange={setStages} anyLabel="Any stage"
                        options={STAGES.map((s) => ({ value: s.key, label: s.short, title: s.label }))} />
                </div>
                <div>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Group</p>
                    <ChoiceChips<Who> ariaLabel="Group" value={whos} onChange={setWhos} anyLabel="Everyone"
                        options={WHOS.map((w) => ({ value: w.key, label: w.plural, title: w.hint }))} />
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                        <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Name, full email or test"
                            aria-label="Search people"
                            className="h-9 w-full rounded-xl bg-slate-100 pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60" />
                    </div>
                    <Segmented<'all' | 'ready' | 'skipped'> size="sm" ariaLabel="Show" value={show} onChange={setShow} options={[
                        { value: 'all', label: 'Everyone' },
                        { value: 'ready', label: 'Can email now' },
                        { value: 'skipped', label: 'Resting' },
                    ]} />
                </div>
            </div>

            {first && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    <p className="text-[13px] text-slate-600">
                        <span className="font-semibold text-slate-900">{num(first.total)}</span> {first.total === 1 ? 'person' : 'people'} ·{' '}
                        <span className="font-semibold text-emerald-700">{num(first.ready)}</span> can get an email now
                    </p>
                    <Button size="sm" disabled={first.ready === 0} onClick={() => onWrite({ stages, whos })} title={audienceLabel({ stages, whos })}>
                        <PenSquare className="h-3.5 w-3.5" aria-hidden="true" /> Write to these {num(first.ready)}
                    </Button>
                </div>
            )}

            {list.isError && !list.data ? (
                <ErrorBox message={errorText(list.error, 'Couldn’t load people.')} onRetry={() => list.refetch()} />
            ) : !list.data ? (
                <div className={cx(CARD, 'space-y-3 p-4')}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}><Empty icon={Users} title={q ? 'Nobody matches your search' : 'Nobody here'} /></div>
            ) : (
                <>
                    <ul className={cx(CARD, 'divide-y divide-slate-100 overflow-hidden', list.isPlaceholderData && 'opacity-60')}>
                        {rows.map((p) => <Row key={p.id} p={p} />)}
                    </ul>
                    {list.hasNextPage && (
                        <div className="flex justify-center">
                            <Button variant="secondary" busy={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
                                {list.isFetchingNextPage ? 'Loading…' : `Show more (${num((first?.shown ?? 0) - rows.length)} left)`}
                            </Button>
                        </div>
                    )}
                </>
            )}
            <p className="px-1 text-[12px] leading-relaxed text-slate-500">
                “Resting” means they can’t get an email today: emailed this week, three this month, unsubscribed, or a bad address.
                People who signed in only to sit an educator’s exam never appear here. Addresses are hidden on the team site;
                type a full address into the search to find someone.
            </p>
        </div>
    );
}

function Row({ p }: { p: Person }) {
    const name = p.full_name || p.email.split('@')[0];
    const st = STATUS[p.status];
    return (
        <li className="flex items-start gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[13px] font-bold text-slate-600">
                {initials(name)}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold text-slate-900">{name}</span>
                    <Chip tone={WHO_TONE[p.who]}>{WHO[p.who]?.label}</Chip>
                </span>
                <span className="block truncate text-[12px] text-slate-500">{p.email}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                        <span className={cx('h-2 w-2 rounded-full', STAGE_DOT[p.stage])} aria-hidden="true" />
                        {STAGE[p.stage]?.short}
                    </span>
                    {p.tests_created > 0 && <><span className="text-slate-300">·</span><span>{num(p.tests_created)} test{p.tests_created === 1 ? '' : 's'}</span></>}
                    {p.results > 0 && <><span className="text-slate-300">·</span><span>{num(p.results)} answers</span></>}
                    {p.latest_test_title && <><span className="text-slate-300">·</span><span className="max-w-[220px] truncate">“{p.latest_test_title}”</span></>}
                </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                <Chip tone={st.tone} title={st.long}>{st.label}</Chip>
                <span className="text-[11px] text-slate-400">{p.last_emailed_at ? `emailed ${relative(p.last_emailed_at)}` : 'never emailed'}</span>
                <span className="text-[11px] text-slate-400">seen {relative(p.last_active_at)}</span>
            </span>
        </li>
    );
}

/** The stage colours as classes (STAGES[].color, without an inline style). */
export const STAGE_DOT: Record<Stage, string> = {
    new: 'bg-slate-400', drafted: 'bg-sky-300', tried: 'bg-sky-400', active: 'bg-sky-600', quiet: 'bg-amber-500',
};
