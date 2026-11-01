/**
 * Admin → Email. Four tabs:
 *   Playbook — where people are in their journey, and the next email for each stage,
 *              with how many people it can go to today. The weekly job starts here.
 *   People   — everyone we may email, filtered by stage and group; write to any slice.
 *   Library  — every ready-made email: edit, duplicate, restore, archive, or write a new one.
 *   History  — every send and what happened after (came back, made a test, clicked).
 * The rules (one email a week per person, three a month, never the same email twice,
 * unsubscribes, 40 an hour) are enforced by the server; this page explains them.
 * Manual for new team members: "TestoZa Email Broadcasting Manual" (Claude Docs).
 */
import { useQuery } from '@tanstack/react-query';
import { Mail, PenSquare, Settings } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { num } from '../analytics/format';
import { usePersisted } from '../analytics/shared';
import { CARD, Empty, InfoTip, Segmented, Skeleton } from '../analytics/ui';
import { emailApi, NotInstalledError, type Overview, type Stage, type TemplateSummary, type Who } from './api';
import ComposeSheet, { type ComposeStart } from './ComposeSheet';
import HistoryTab from './HistoryTab';
import LibraryTab from './LibraryTab';
import { STAGES, whoCount } from './model';
import PeopleTab from './PeopleTab';
import SettingsSheet from './SettingsSheet';
import TemplateList from './TemplateList';

type Tab = 'playbook' | 'people' | 'library' | 'history';
const TABS: readonly Tab[] = ['playbook', 'people', 'library', 'history'];

export default function EmailPanel() {
    const [tab, setTab] = usePersisted<Tab>('tz_admin_email_tab', 'playbook', TABS);
    const [compose, setCompose] = useState<ComposeStart | null>(null);
    const [settings, setSettings] = useState(false);
    const [openCampaign, setOpenCampaign] = useState<string | null>(null);

    const ov = useQuery({ queryKey: ['email', 'overview'], queryFn: emailApi.overview, staleTime: 30_000, refetchInterval: 120_000 });

    if (ov.error instanceof NotInstalledError) return <Setup />;
    const o = ov.data;

    return (
        <div className="space-y-5 pb-10">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Outreach</p>
                    <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Email</h1>
                    <p className="mt-2 hidden max-w-2xl text-[15px] text-slate-600 sm:block">
                        The right email for where each person is, and never more than one a week.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSettings(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-[14px] font-semibold text-slate-700 ring-1 ring-slate-900/[0.08] hover:bg-slate-50">
                        <span className={cn('h-2 w-2 rounded-full', o?.smtp.configured ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden="true" />
                        <Settings className="h-4 w-4" aria-hidden="true" /> Settings
                    </button>
                    <button type="button" onClick={() => setCompose({ filter: {} })}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-[14px] font-semibold text-white hover:bg-slate-800">
                        <PenSquare className="h-4 w-4" aria-hidden="true" /> New email
                    </button>
                </div>
            </header>

            {o && !o.smtp.configured && (
                <Banner tone="amber" title="Email isn’t connected" action="Connect" onAction={() => setSettings(true)}>
                    The owner connects a sending service (Amazon SES) on the server. Until then nothing can be sent, but you can look around and prepare emails.
                </Banner>
            )}
            {o?.sending.map((c) => (
                <Banner key={c.id} tone="sky" title={`“${c.name}” ${c.status === 'paused' ? 'is paused' : 'didn’t finish'}`}
                    action="Open" onAction={() => { setTab('history'); setOpenCampaign(c.id); }}>
                    Some people haven’t got it yet. Open it to resume.
                </Banner>
            ))}

            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <Segmented<Tab> ariaLabel="Section" value={tab} onChange={setTab} options={[
                    { value: 'playbook', label: 'Playbook' },
                    { value: 'people', label: 'People' },
                    { value: 'library', label: 'Library' },
                    { value: 'history', label: 'History' },
                ]} />
            </div>

            {tab === 'playbook' && <Playbook o={o} loading={ov.isLoading} error={ov.error} onSend={(t) => setCompose({ template: t })} />}
            {tab === 'people' && <PeopleTab onWrite={(filter) => setCompose({ filter })} />}
            {tab === 'library' && <LibraryTab overview={o} onSend={(t) => setCompose({ template: t })} />}
            {tab === 'history' && <HistoryTab overview={o} openId={openCampaign} onOpenId={setOpenCampaign} />}

            <ComposeSheet start={compose} overview={o} onClose={() => setCompose(null)} />
            <SettingsSheet open={settings} onOpenChange={setSettings} overview={o} />
        </div>
    );
}

function Banner({ tone, title, children, action, onAction }: {
    tone: 'amber' | 'sky'; title: string; children: React.ReactNode; action: string; onAction: () => void;
}) {
    return (
        <div className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset',
            tone === 'amber' ? 'bg-amber-50 ring-amber-600/20' : 'bg-sky-50 ring-sky-600/15')}>
            <div className="min-w-0 flex-1">
                <p className={cn('text-[14px] font-semibold', tone === 'amber' ? 'text-amber-900' : 'text-sky-900')}>{title}</p>
                <p className={cn('text-[13px]', tone === 'amber' ? 'text-amber-800' : 'text-sky-800')}>{children}</p>
            </div>
            <button type="button" onClick={onAction}
                className={cn('h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold text-white', tone === 'amber' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700')}>
                {action}
            </button>
        </div>
    );
}

// ── Playbook ─────────────────────────────────────────────────────────────────
type GroupKey = 'all' | 'edu' | 'student' | 'corporate' | 'no_role';
const GROUPS: readonly GroupKey[] = ['all', 'edu', 'student', 'corporate', 'no_role'];
const GROUP_WHOS: Record<GroupKey, Who[] | null> = {
    all: null, edu: ['educator', 'institution'], student: ['student'], corporate: ['corporate'], no_role: ['no_role'],
};

function Playbook({ o, loading, error, onSend }: { o?: Overview; loading: boolean; error: unknown; onSend: (t: TemplateSummary) => void }) {
    const [group, setGroup] = usePersisted<GroupKey>('tz_admin_email_group', 'all', GROUPS);

    const byStage = useMemo(() => {
        const counts: Record<Stage, { total: number; by: Partial<Record<Who, number>> }> = {
            new: { total: 0, by: {} }, drafted: { total: 0, by: {} }, tried: { total: 0, by: {} }, quiet: { total: 0, by: {} }, active: { total: 0, by: {} },
        };
        for (const m of o?.matrix ?? []) {
            const whos = GROUP_WHOS[group];
            if (whos && !whos.includes(m.who)) continue;
            counts[m.stage].total += m.n;
            counts[m.stage].by[m.who] = (counts[m.stage].by[m.who] ?? 0) + m.n;
        }
        return counts;
    }, [o, group]);

    const visible = (o?.templates ?? []).filter((t) => {
        if (t.archived) return false;
        const whos = GROUP_WHOS[group];
        return !whos || t.audiences.length === 0 || t.audiences.some((a) => whos.includes(a));
    });
    const single = (s: Stage) => visible.filter((t) => t.stages.length === 1 && t.stages[0] === s);
    const several = visible.filter((t) => t.stages.length !== 1);

    if (error && !o) {
        return <div className={cn(CARD, 'p-5 text-[14px] text-slate-600')}>Couldn’t load email data. Refresh the page in a moment.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Today at a glance */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {loading || !o ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />) : (
                    <>
                        <Tile label="People we can email" value={num(o.people)}
                            info={`Real accounts only. Hidden from every audience: ${num(o.takers)} people who signed in only to sit an educator’s exam, exam candidates without an account, demo accounts and the team.`} />
                        <Tile label="Ready for an email today" value={num(o.ready_people)} accent
                            info="People who can get at least one email right now. After one email they wait a week for the next." />
                        <Tile label="Sent this week" value={num(o.sent.week)} sub={`${num(o.limits.sent_last_hour)} of ${num(o.limits.hourly_limit)} this hour`} />
                        <Tile label="Unsubscribed" value={num(o.unsubscribed)} sub={o.people ? `${((o.unsubscribed / Math.max(1, o.people + o.unsubscribed)) * 100).toFixed(1)}% of the list` : undefined} />
                    </>
                )}
            </div>

            {/* Journey */}
            <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
                    <div>
                        <h2 className="!text-[20px] font-bold tracking-[-0.02em] text-slate-900">Where people are</h2>
                        <p className="mt-0.5 text-[13px] text-slate-500">People move along by themselves as they make tests and get answers.</p>
                    </div>
                    <div className="-mx-1 max-w-full overflow-x-auto px-1">
                        <Segmented<GroupKey> size="sm" ariaLabel="Group" value={group} onChange={setGroup} options={[
                            { value: 'all', label: 'Everyone' },
                            { value: 'edu', label: 'Educators & institutes' },
                            { value: 'student', label: 'Students' },
                            { value: 'corporate', label: 'Corporate' },
                            { value: 'no_role', label: 'No role' },
                        ]} />
                    </div>
                </div>
                <ol className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
                    {STAGES.map((s, i) => {
                        const c = byStage[s.key];
                        const ready = single(s.key).reduce((a, t) => a + t.ready, 0);
                        return (
                            <li key={s.key} className="w-[200px] shrink-0 snap-start lg:w-auto">
                                <a href={`#stage-${s.key}`} className={cn(CARD, 'flex h-full flex-col p-4 transition-colors hover:bg-slate-50')}>
                                    <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: s.color }}>{i + 1}</span>
                                        {s.short}
                                    </span>
                                    <span className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">{o ? num(c.total) : '–'}</span>
                                    <span className="mt-1.5 line-clamp-2 min-h-[32px] text-[12px] leading-4 text-slate-500">
                                        {Object.entries(c.by).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3)
                                            .map(([w, n]) => whoCount(w as Who, n ?? 0)).join(' · ') || 'Nobody here yet'}
                                    </span>
                                    <span className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[12px]">
                                        <span className="text-slate-500">{s.goal}</span>
                                    </span>
                                    {ready > 0 && <span className="mt-2 self-start rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">{num(ready)} ready</span>}
                                </a>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* Emails by stage */}
            {loading || !o ? (
                <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
            ) : (
                <>
                    {STAGES.map((s) => {
                        const list = single(s.key);
                        if (!list.length) return null;
                        return (
                            <section key={s.key} id={`stage-${s.key}`} className="scroll-mt-4">
                                <div className="mb-2 px-1">
                                    <h2 className="!text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{s.label}</h2>
                                    <p className="text-[13px] text-slate-500">Goal: {s.goal.toLowerCase()} · {num(byStage[s.key].total)} people</p>
                                </div>
                                <TemplateList items={list} onSend={onSend} />
                            </section>
                        );
                    })}
                    {several.length > 0 && (
                        <section className="scroll-mt-4">
                            <div className="mb-2 px-1">
                                <h2 className="!text-[17px] font-semibold tracking-[-0.01em] text-slate-900">For several stages</h2>
                                <p className="text-[13px] text-slate-500">One-off emails and series that span stages.</p>
                            </div>
                            <TemplateList items={several} onSend={onSend} />
                        </section>
                    )}
                    {visible.length === 0 && <div className={CARD}><Empty icon={Mail} title="No emails for this group yet">Write one in Library.</Empty></div>}
                </>
            )}
        </div>
    );
}

function Tile({ label, value, sub, info, accent }: { label: string; value: string; sub?: string; info?: string; accent?: boolean }) {
    return (
        <div className={cn(CARD, 'flex min-w-0 flex-col px-4 py-3.5', accent && 'ring-2 ring-sky-500/40')}>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">{label}{info && <InfoTip text={info} />}</span>
            <span className={cn('mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] tabular-nums', accent ? 'text-sky-700' : 'text-slate-900')}>{value}</span>
            <span className="mt-0.5 min-h-[18px] text-[12px] text-slate-500">{sub}</span>
        </div>
    );
}

function Setup() {
    return (
        <div className={cn(CARD, 'p-6')}>
            <p className="text-[17px] font-semibold text-slate-900">One database update needed</p>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-600">
                Run <span className="font-mono text-[12.5px]">supabase/migrations/20261024120000_email_broadcast.sql</span> in the
                Supabase SQL editor, then reload this page.
            </p>
        </div>
    );
}
