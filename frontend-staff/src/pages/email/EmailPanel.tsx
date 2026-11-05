/**
 * Email on team.testoza.com: admin → Email for the team (backend: app/routers/staff/email.py).
 *   Playbook  — where people are in their journey, and the next email for each stage
 *   People    — everyone we may email, by stage and group (needs "Write and send emails")
 *   Library   — every ready-made email; editable with "Write and send emails"
 *   History   — every send, who sent it, and what happened after
 *   Automatic — the emails TestoZa sends by itself (read only here)
 * The rules (one email a week per person, three a month, never the same email twice,
 * unsubscribes, the SES warm-up pace) are enforced by the server, exactly as in admin.
 * Owner-only: Settings, taking an address off the never-email list, automatic on/off.
 */
import { useQuery } from '@tanstack/react-query';
import { Ban, BellRing, Mail, PenSquare, ShieldCheck } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Button, CARD, Empty, ErrorBox, PageTitle, Skeleton, cx } from '@/components/ui';
import { num } from '@/lib/format';
import { useSession } from '@/lib/session';
import { emailApi, errorText, notInstalled, type Overview, type Rule, type Stage, type TemplateSummary, type Who } from './api';
import AutomaticTab from './AutomaticTab';
import ComposeSheet, { type ComposeStart } from './ComposeSheet';
import HistoryTab from './HistoryTab';
import { InfoTip, Segmented, usePersisted } from './kit';
import LibraryTab from './LibraryTab';
import { RULES, STAGES, whoCount } from './model';
import PeopleTab, { STAGE_DOT } from './PeopleTab';
import StopListSheet from './StopListSheet';
import TemplateList from './TemplateList';

type Tab = 'playbook' | 'people' | 'library' | 'history' | 'automatic';
const TABS: readonly Tab[] = ['playbook', 'people', 'library', 'history', 'automatic'];

export default function EmailPanel() {
    const { can } = useSession();
    const canSend = can('email.send');
    const [saved, setTab] = usePersisted<Tab>('tz_team_email_tab', 'playbook', TABS);
    const tab: Tab = saved === 'people' && !canSend ? 'playbook' : saved;
    const [compose, setCompose] = useState<ComposeStart | null>(null);
    const [stopList, setStopList] = useState(false);
    const [openCampaign, setOpenCampaign] = useState<string | null>(null);

    const ov = useQuery({ queryKey: ['email', 'overview'], queryFn: emailApi.overview, staleTime: 30_000, refetchInterval: 120_000 });
    const o = ov.data;

    if (notInstalled(ov.error)) {
        return (
            <>
                <PageTitle title="Email" />
                <div className={CARD}><Empty icon={Mail} title="Email isn’t set up yet">The owner needs to run one database update first.</Empty></div>
            </>
        );
    }

    const tabs: { value: Tab; label: string }[] = [
        { value: 'playbook', label: 'Playbook' },
        ...(canSend ? [{ value: 'people' as Tab, label: 'People' }] : []),
        { value: 'library', label: 'Library' },
        { value: 'history', label: 'History' },
        { value: 'automatic', label: 'Automatic' },
    ];

    return (
        <div className="space-y-5 pb-10">
            <PageTitle
                title="Email"
                subtitle="The right email for where each person is, and never more than one a week."
                action={canSend ? (
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => setStopList(true)}><Ban className="h-4 w-4" aria-hidden="true" /> Never email</Button>
                        <Button onClick={() => setCompose({ filter: {} })}><PenSquare className="h-4 w-4" aria-hidden="true" /> New email</Button>
                    </div>
                ) : undefined}
            />

            {!canSend && (
                <Banner tone="slate" title="You can look, not send">
                    Your access shows the playbook, the library, results and automatic emails. Writing and sending need “Write and send emails” from your admin.
                </Banner>
            )}
            {canSend && o && (
                <p className="flex items-start gap-2 rounded-2xl bg-indigo-50/70 px-4 py-3 text-[13px] leading-snug text-indigo-900 ring-1 ring-inset ring-indigo-600/15">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                        Team-site rules: addresses are hidden, links go only to testoza.com or YouTube, tests go to
                        {o.team.test_to ? ` ${o.team.test_to} or` : ''} an @{o.team.test_domain} address, and every send shows your name to the owner.
                    </span>
                </p>
            )}
            {o && !o.smtp.configured && (
                <Banner tone="amber" title="Email isn’t connected">
                    The owner connects the sending service (Amazon SES) on the server. Until then nothing can be sent, but you can prepare emails.
                </Banner>
            )}
            {o?.sending.map((c) => (
                <Banner key={c.id} tone="sky" title={`“${c.name}” ${c.status === 'paused' ? 'is paused' : 'didn’t finish'}`}
                    action="Open" onAction={() => { setTab('history'); setOpenCampaign(c.id); }}>
                    Some people haven’t got it yet. Open it to {canSend ? 'resume' : 'see where it stopped'}.
                </Banner>
            ))}

            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <Segmented<Tab> ariaLabel="Section" value={tab} onChange={setTab} options={tabs} />
            </div>

            {tab === 'playbook' && <Playbook o={o} loading={ov.isLoading} error={ov.error} canSend={canSend}
                onSend={(t) => setCompose({ template: t })} onLibrary={() => setTab('library')} />}
            {tab === 'people' && canSend && <PeopleTab onWrite={(filter) => setCompose({ filter })} />}
            {tab === 'library' && <LibraryTab overview={o} canSend={canSend} onSend={(t) => setCompose({ template: t })} />}
            {tab === 'history' && <HistoryTab overview={o} canSend={canSend} openId={openCampaign} onOpenId={setOpenCampaign} />}
            {tab === 'automatic' && <AutomaticTab canSend={canSend} />}

            {canSend && <ComposeSheet start={compose} overview={o} onClose={() => setCompose(null)} />}
            {canSend && <StopListSheet open={stopList} onClose={() => setStopList(false)} />}
        </div>
    );
}

function Banner({ tone, title, children, action, onAction }: {
    tone: 'amber' | 'sky' | 'slate'; title: string; children: React.ReactNode; action?: string; onAction?: () => void;
}) {
    const tones = {
        amber: ['bg-amber-50 ring-amber-600/20', 'text-amber-900', 'text-amber-800', 'bg-amber-600 hover:bg-amber-700'],
        sky: ['bg-sky-50 ring-sky-600/15', 'text-sky-900', 'text-sky-800', 'bg-sky-600 hover:bg-sky-700'],
        slate: ['bg-white ring-slate-900/[0.08]', 'text-slate-900', 'text-slate-600', 'bg-slate-900 hover:bg-slate-800'],
    }[tone];
    return (
        <div className={cx('flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset', tones[0])}>
            <div className="min-w-0 flex-1">
                <p className={cx('text-[14px] font-semibold', tones[1])}>{title}</p>
                <p className={cx('text-[13px]', tones[2])}>{children}</p>
            </div>
            {action && onAction && (
                <button type="button" onClick={onAction} className={cx('h-9 shrink-0 rounded-xl px-4 text-[13px] font-semibold text-white', tones[3])}>
                    {action}
                </button>
            )}
        </div>
    );
}

// ── Playbook ─────────────────────────────────────────────────────────────────────
type GroupKey = 'all' | 'edu' | 'student' | 'corporate' | 'no_role';
const GROUPS: readonly GroupKey[] = ['all', 'edu', 'student', 'corporate', 'no_role'];
const GROUP_WHOS: Record<GroupKey, Who[] | null> = {
    all: null, edu: ['educator', 'institution'], student: ['student'], corporate: ['corporate'], no_role: ['no_role'],
};

function Playbook({ o, loading, error, canSend, onSend, onLibrary }: {
    o?: Overview; loading: boolean; error: unknown; canSend: boolean; onSend: (t: TemplateSummary) => void; onLibrary: () => void;
}) {
    const [group, setGroup] = usePersisted<GroupKey>('tz_team_email_group', 'all', GROUPS);

    const byStage = useMemo(() => {
        const counts: Record<Stage, { total: number; by: Partial<Record<Who, number>> }> = {
            new: { total: 0, by: {} }, drafted: { total: 0, by: {} }, tried: { total: 0, by: {} }, quiet: { total: 0, by: {} }, active: { total: 0, by: {} },
        };
        for (const m of o?.matrix ?? []) {
            const whos = GROUP_WHOS[group];
            if (whos && !whos.includes(m.who)) continue;
            if (!counts[m.stage]) continue;
            counts[m.stage].total += m.n;
            counts[m.stage].by[m.who] = (counts[m.stage].by[m.who] ?? 0) + m.n;
        }
        return counts;
    }, [o, group]);

    const matching = (o?.templates ?? []).filter((t) => {
        if (t.archived) return false;
        const whos = GROUP_WHOS[group];
        return !whos || t.audiences.length === 0 || t.audiences.some((a) => whos.includes(a));
    });
    const reminders = matching.filter((t) => t.rule);
    const visible = matching.filter((t) => !t.rule);
    const single = (s: Stage) => visible.filter((t) => t.stages.length === 1 && t.stages[0] === s);
    const several = visible.filter((t) => t.stages.length !== 1);
    // People who only look open the email in Library instead of sending it.
    const listProps = canSend ? { onSend } : { onOpen: onLibrary };

    if (error && !o) return <ErrorBox message={errorText(error, 'Couldn’t load email data. Refresh the page in a moment.')} />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {loading || !o ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />) : (
                    <>
                        <Tile label="People we can email" value={num(o.people)}
                            info={`Real accounts only. Hidden from every audience: ${num(o.takers)} people who signed in only to sit an educator’s exam, exam candidates without an account, demo accounts and the team.`} />
                        <Tile label="Ready for an email today" value={num(o.ready_people)} accent
                            info="People who can get at least one email right now. After one email they wait a week for the next." />
                        <Tile label="Sent this week" value={num(o.sent?.week)} sub={`${num(o.limits.sent_last_day)} of ${num(o.limits.daily_limit)} in 24 hours`} />
                        <Tile label="Unsubscribed" value={num(o.unsubscribed)} sub={o.people ? `${((o.unsubscribed / Math.max(1, o.people + o.unsubscribed)) * 100).toFixed(1)}% of the list` : undefined} />
                    </>
                )}
            </div>

            <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
                    <div>
                        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900">Where people are</h2>
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
                                <a href={`#stage-${s.key}`} className={cx(CARD, 'flex h-full flex-col p-4 transition-colors hover:bg-slate-50')}>
                                    <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white', STAGE_DOT[s.key])}>{i + 1}</span>
                                        {s.short}
                                    </span>
                                    <span className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">{o ? num(c.total) : '–'}</span>
                                    <span className="mt-1.5 line-clamp-2 min-h-[32px] text-[12px] leading-4 text-slate-500">
                                        {Object.entries(c.by).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3)
                                            .map(([w, n]) => whoCount(w as Who, n ?? 0)).join(' · ') || 'Nobody here yet'}
                                    </span>
                                    <span className="mt-3 border-t border-slate-100 pt-2.5 text-[12px] text-slate-500">{s.goal}</span>
                                    {ready > 0 && <span className="mt-2 self-start rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">{num(ready)} ready</span>}
                                </a>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {o && reminders.length > 0 && (
                <section>
                    <div className="mb-2 flex items-start gap-2.5 px-1">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                            <BellRing className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Reminders</h2>
                            <p className="text-[13px] text-slate-500">
                                {(Object.keys(RULES) as Rule[]).map((r) => `${RULES[r].short}: ${num(o.rules?.[r] ?? 0)} people`).join(' · ')}.
                                {' '}Same weekly limit as every email; each person gets each reminder once.
                            </p>
                        </div>
                    </div>
                    <TemplateList items={reminders} {...listProps} />
                </section>
            )}

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
                                    <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{s.label}</h2>
                                    <p className="text-[13px] text-slate-500">Goal: {s.goal.toLowerCase()} · {num(byStage[s.key].total)} people</p>
                                </div>
                                <TemplateList items={list} {...listProps} />
                            </section>
                        );
                    })}
                    {several.length > 0 && (
                        <section>
                            <div className="mb-2 px-1">
                                <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">For several stages</h2>
                                <p className="text-[13px] text-slate-500">One-off emails and series that span stages.</p>
                            </div>
                            <TemplateList items={several} {...listProps} />
                        </section>
                    )}
                    {visible.length === 0 && reminders.length === 0 && <div className={CARD}><Empty icon={Mail} title="No emails for this group yet">Write one in Library.</Empty></div>}
                </>
            )}
        </div>
    );
}

function Tile({ label, value, sub, info, accent }: { label: string; value: string; sub?: string; info?: string; accent?: boolean }) {
    return (
        <div className={cx(CARD, 'flex min-w-0 flex-col px-4 py-3.5', accent && 'ring-2 ring-indigo-500/40')}>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">{label}{info && <InfoTip text={info} />}</span>
            <span className={cx('mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] tabular-nums', accent ? 'text-indigo-700' : 'text-slate-900')}>{value}</span>
            <span className="mt-0.5 min-h-[18px] text-[12px] text-slate-500">{sub}</span>
        </div>
    );
}
