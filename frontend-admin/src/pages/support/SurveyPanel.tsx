/**
 * Admin → Support → Survey 1.0: the answers from app.testoza.com/survey/v1 (no name needed),
 * the survey emailed to educators who made a test and didn't send it (or didn't send more).
 *
 * Three views:
 *  - What to fix: the main reasons, then every follow-up ranked by how many reached it,
 *    each answer with the fix behind it and the survey's rule (3+ = build it, 1–2 = call first,
 *    a bug needs one report);
 *  - By question: every question in the order the survey asks it;
 *  - Responses: each person's path, their optional name/email/phone with Email and WhatsApp
 *    buttons, CSV export.
 *
 * The questions and fixes come from the backend (app/routers/survey.py).
 */
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Copy, Download, ExternalLink, ListChecks, Mail, MessageCircle, Phone, Sparkles, User } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { cap, istDateTime, num, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { BarList, CARD, Card, Chip, Empty, PILL_BTN, Segmented, SectionTitle, Skeleton, StatTile, TileSkeletons } from '../analytics/ui';
import { whatsAppTo } from './api';
import {
    answerText, contactOf, isContact, pathOf, surveyApi, surveyQueryKey,
    type SurveyOptionDef, type SurveyQuestionDef, type SurveyResults, type SurveyRow,
} from './surveyApi';

type View = 'fix' | 'questions' | 'responses';
const VIEWS: readonly View[] = ['fix', 'questions', 'responses'];
type Who = 'all' | 'not_sent' | 'sent' | 'other';
const WHO: readonly Who[] = ['all', 'not_sent', 'sent', 'other'];

/** The survey's decision rule: this many people on one answer = build it. */
const BUILD_AT = 3;
const PAGE = 40;

const SENT = ['sent_some', 'whole_class'];
const NOT_EDUCATORS = ['own_practice', 'looking'];
const REASONS = ['reason_not_sent', 'reason_sent'];

/** The follow-up behind each main reason, with what is asked under it. */
const AREAS: { id: string; sub?: string; texts?: string }[] = [
    { id: 'timing', texts: 'timing_app' },
    { id: 'paper_phones', sub: 'paper_time' },
    { id: 'unclear' },
    { id: 'trust' },
    { id: 'making', sub: 'ai_issue' },
    { id: 'permission' },
    { id: 'broke', texts: 'broke_detail' },
    { id: 'results' },
];

const sum = (counts: Record<string, number> | undefined, keys: string[]) => keys.reduce((a, k) => a + (counts?.[k] || 0), 0);
const share = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '');

export default function SurveyPanel() {
    const [view, setView] = usePersisted<View>('tz_admin_survey_view', 'fix', VIEWS);
    const query = useQuery({
        queryKey: surveyQueryKey(),
        queryFn: () => surveyApi.get(),
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    if (query.error && !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    if (!query.data) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><TileSkeletons count={4} /></div>
                <Skeleton className="h-48" />
            </div>
        );
    }
    const d = query.data;

    return (
        <div className="space-y-4">
            <LinkBar link={d.link} />
            <Totals d={d} />
            {d.total === 0 ? (
                <div className={CARD}>
                    <Empty icon={ListChecks} title="No answers yet">
                        Email the link above to educators who made a test. Answers show up here within a minute.
                    </Empty>
                </div>
            ) : (
                <>
                    <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                        <Segmented<View>
                            ariaLabel="Survey view"
                            value={view}
                            onChange={setView}
                            options={[
                                { value: 'fix', label: 'What to fix' },
                                { value: 'questions', label: 'By question' },
                                { value: 'responses', label: `Responses · ${num(d.total)}` },
                            ]}
                        />
                    </div>
                    {view === 'fix' ? <FixBoard d={d} /> : view === 'questions' ? <ByQuestion d={d} /> : <Responses d={d} />}
                </>
            )}
        </div>
    );
}

// ── Top ───────────────────────────────────────────────────────────────────────

function LinkBar({ link }: { link: string }) {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Survey link copied');
        } catch {
            toast.error('Couldn’t copy. Select the link and copy it.');
        }
    };
    return (
        <div className={cn(CARD, 'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3')}>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Survey link · no name needed</p>
                <p className="mt-0.5 select-all break-all font-mono text-[13px] text-slate-800">{link}</p>
            </div>
            <div className="flex gap-2">
                <button type="button" className={PILL_BTN} onClick={copy}><Copy className="h-3.5 w-3.5" /> Copy</button>
                <a className={PILL_BTN} href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
            </div>
        </div>
    );
}

function Totals({ d }: { d: SurveyResults }) {
    const status = d.counts.status;
    const notSent = status?.not_sent || 0;
    const sent = sum(status, SENT);
    const other = sum(status, NOT_EDUCATORS);
    const contacts = d.rows.filter((r) => contactOf(r)).length;
    return (
        <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="Answers" value={num(d.total)} sub={contacts ? `${num(contacts)} left contact details` : 'No contact details yet'} />
                <StatTile label="Not sent yet" value={num(notSent)} sub={share(notSent, d.total)} />
                <StatTile label="Sent to students" value={num(sent)} sub={share(sent, d.total)} />
                <StatTile label="Not educators" value={num(other)} sub={share(other, d.total)}
                    info="Students practising for themselves and people just looking around. They show who you attract, not what to fix." />
            </div>
            {d.total > 0 && d.total < 20 && (
                <p className="px-1 text-[13px] text-slate-500">
                    Only {num(d.total)} {d.total === 1 ? 'answer' : 'answers'} so far: read each one. Percentages mean little this early.
                </p>
            )}
            {d.capped && <p className="px-1 text-[13px] text-amber-700">Showing the latest 1,000 answers.</p>}
        </>
    );
}

// ── What to fix ───────────────────────────────────────────────────────────────

function FixBoard({ d }: { d: SurveyResults }) {
    const qs = useMemo(() => new Map(d.questions.map((q) => [q.id, q])), [d.questions]);
    const other = sum(d.counts.status, NOT_EDUCATORS);
    const areas = AREAS
        .flatMap((a) => {
            const q = qs.get(a.id);
            const reached = d.answered[a.id] || 0;
            return q && reached > 0 ? [{ ...a, q, reached }] : [];
        })
        .sort((x, y) => y.reached - x.reached);
    const anything = qs.get('anything');

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-sky-900 ring-1 ring-inset ring-sky-600/15">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                    <b>How to read it:</b> an answer picked by {BUILD_AT} or more people means <b>build it</b> (or <b>make it visible</b> when
                    TestoZa already has it). Picked by 1–2: <b>call first</b>, if they left a number. A bug needs only one report: <b>reproduce it</b>.
                </span>
            </div>

            {d.total >= 3 && other / d.total > 1 / 3 && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                        {num(other)} of {num(d.total)} answers aren’t from educators (students practising, people looking around). Over a third means the
                        problem is who you attract, not the product.
                    </span>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {REASONS.map((id) => {
                    const q = qs.get(id);
                    return q ? <ReasonCard key={id} q={q} d={d} qs={qs} /> : null;
                })}
            </div>

            <div className="pt-2">
                <SectionTitle title="What to fix first" subtitle="Each follow-up, the most answered first. Its top answer is the fix." />
                {areas.length === 0 ? (
                    <div className={CARD}>
                        <Empty icon={ListChecks} title="No follow-up answers yet">Everyone so far stopped at the first question or the main reason.</Empty>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {areas.map((a) => <AreaCard key={a.id} q={a.q} reached={a.reached} sub={a.sub} texts={a.texts} d={d} qs={qs} />)}
                    </div>
                )}
            </div>

            {anything && (
                <Card title="In their words" subtitle="“Anything else?”, from everyone">
                    <Texts q={anything} rows={d.rows} empty="No one wrote anything here yet." plain />
                </Card>
            )}
        </div>
    );
}

function ReasonCard({ q, d, qs }: { q: SurveyQuestionDef; d: SurveyResults; qs: Map<string, SurveyQuestionDef> }) {
    const counts = d.counts[q.id] || {};
    const rows = (q.options || [])
        .map((o) => ({
            id: o.key,
            label: o.label,
            title: o.fix,
            // Where the answer led; phones need the width for the answer itself.
            hint: o.next && qs.get(o.next) && o.next !== 'anything'
                ? <span className="hidden sm:inline">→ {qs.get(o.next)!.short}</span>
                : undefined,
            value: counts[o.key] || 0,
        }))
        .sort((a, b) => b.value - a.value);
    return (
        <Card
            title={q.id === 'reason_not_sent' ? 'Not sent yet: the main reason' : 'Sent: what stopped more'}
            subtitle={`“${q.title}” · ${num(d.answered[q.id] || 0)} answered`}
        >
            <BarList rows={rows} valueLabel="People" />
        </Card>
    );
}

function AreaCard({ q, reached, sub, texts, d, qs }: {
    q: SurveyQuestionDef;
    reached: number;
    sub?: string;
    texts?: string;
    d: SurveyResults;
    qs: Map<string, SurveyQuestionDef>;
}) {
    // Which main reasons led here, and how many each.
    const from = REASONS.flatMap((rid) => {
        const rq = qs.get(rid);
        return (rq?.options || [])
            .filter((o) => o.next === q.id && (d.counts[rid]?.[o.key] || 0) > 0)
            .map((o) => `${o.label} (${d.counts[rid][o.key]})`);
    });
    const subQ = sub ? qs.get(sub) : undefined;
    const textQ = texts ? qs.get(texts) : undefined;

    return (
        <section className={cn(CARD, 'overflow-hidden')}>
            <header className="px-4 pt-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">{q.short}</h3>
                    <Chip tone="sky">{num(reached)} {reached === 1 ? 'person' : 'people'}</Chip>
                </div>
                <p className="mt-0.5 text-[13px] text-slate-500">“{q.title}”</p>
                {from.length > 0 && <p className="mt-1 text-[12px] text-slate-400">From: {from.join(' · ')}</p>}
            </header>
            <OptionRows q={q} counts={d.counts[q.id] || {}} reached={reached} sorted />
            {subQ && (d.answered[subQ.id] || 0) > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/60">
                    <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:px-5">
                        Then asked: {subQ.short} · {num(d.answered[subQ.id] || 0)}
                    </p>
                    <OptionRows q={subQ} counts={d.counts[subQ.id] || {}} reached={d.answered[subQ.id] || 0} sorted bare />
                </div>
            )}
            {textQ && <Texts q={textQ} rows={d.rows} heading={textQ.short} />}
        </section>
    );
}

function verdict(o: SurveyOptionDef, n: number, multi: boolean): { label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' } | null {
    if (n === 0) return null;
    if (o.noop) return { label: 'Nothing to build', tone: 'slate' };
    if (multi) return { label: 'Reproduce it', tone: 'rose' };
    if (n >= BUILD_AT) return { label: o.exists ? 'Make it visible' : 'Build it', tone: 'emerald' };
    return { label: 'Call first', tone: 'amber' };
}

function OptionRows({ q, counts, reached, sorted, bare }: {
    q: SurveyQuestionDef;
    counts: Record<string, number>;
    reached: number;
    sorted?: boolean;
    bare?: boolean;
}) {
    const multi = q.kind === 'multi';
    const opts = (q.options || []).map((o) => ({ o, n: counts[o.key] || 0 }));
    if (sorted) opts.sort((a, b) => b.n - a.n);
    const topN = Math.max(0, ...opts.map((x) => x.n));
    return (
        <ul className={cn('mt-3 divide-y divide-slate-100', !bare && 'border-t border-slate-100')}>
            {opts.map(({ o, n }) => {
                const v = verdict(o, n, multi);
                const top = n > 0 && n === topN && !multi;
                return (
                    <li key={o.key} className={cn('px-4 py-3 sm:px-5', n === 0 && 'opacity-50', top && !bare && 'bg-sky-50/50')}>
                        <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[14px] font-semibold text-slate-900">{o.label}</span>
                                    {v && <Chip tone={v.tone}>{v.label}</Chip>}
                                </div>
                                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                                    <span className="font-semibold text-slate-500">Fix: </span>{o.fix}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="text-[18px] font-semibold leading-tight tabular-nums text-slate-900">{num(n)}</div>
                                <div className="text-[11px] tabular-nums text-slate-400">{share(n, reached)}</div>
                            </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${reached ? (n / reached) * 100 : 0}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function Texts({ q, rows, heading, empty, plain }: {
    q: SurveyQuestionDef;
    rows: SurveyRow[];
    heading?: string;
    empty?: string;
    /** Inside a Card that already pads its body. */
    plain?: boolean;
}) {
    const items = rows.filter((r) => typeof r.answers[q.id] === 'string' && (r.answers[q.id] as string).trim());
    if (!items.length) {
        return empty ? <p className={cn('text-[13px] text-slate-500', !plain && 'px-4 pb-4 pt-1 sm:px-5')}>{empty}</p> : null;
    }
    return (
        <div className={cn(!plain && 'border-t border-slate-100 px-4 py-3 sm:px-5')}>
            {heading && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">In their words: {heading}</p>}
            <ul className="space-y-2">
                {items.map((r) => (
                    <li key={r.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-900/[0.04]">
                        <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-800">“{r.answers[q.id] as string}”</p>
                        <p className="mt-1 text-[11px] text-slate-400" title={istDateTime(r.created_at)}>{relative(r.created_at)}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── By question ───────────────────────────────────────────────────────────────

function ByQuestion({ d }: { d: SurveyResults }) {
    return (
        <div className="space-y-4">
            {d.questions.map((q) => {
                const reached = d.answered[q.id] || 0;
                return (
                    <section key={q.id} className={cn(CARD, 'overflow-hidden')}>
                        <header className="px-4 pt-4 sm:px-5">
                            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{q.title}</h3>
                            <p className="mt-0.5 text-[13px] text-slate-500">
                                {q.short} · {num(reached)} answered{q.kind === 'multi' ? ' · they could tick several' : ''}{!q.required ? ' · optional' : ''}
                            </p>
                        </header>
                        {q.options ? (
                            <OptionRows q={q} counts={d.counts[q.id] || {}} reached={reached} />
                        ) : isContact(q) ? (
                            <p className="px-4 pb-4 pt-2 text-[13px] text-slate-600 sm:px-5">
                                {num(reached)} left {q.kind === 'name' ? 'a name' : q.kind === 'email' ? 'an email' : 'a phone number'}.
                                Reach them from Responses.
                            </p>
                        ) : (
                            <div className="pt-2"><Texts q={q} rows={d.rows} empty="No one wrote anything here yet." /></div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}

// ── Responses ─────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, 'amber' | 'emerald' | 'slate'> = {
    not_sent: 'amber', sent_some: 'emerald', whole_class: 'emerald', own_practice: 'slate', looking: 'slate',
};

function Responses({ d }: { d: SurveyResults }) {
    const [who, setWho] = usePersisted<Who>('tz_admin_survey_who', 'all', WHO);
    const [shown, setShown] = useState(PAGE);
    const rows = d.rows.filter((r) => {
        const s = r.status || '';
        if (who === 'not_sent') return s === 'not_sent';
        if (who === 'sent') return SENT.includes(s);
        if (who === 'other') return NOT_EDUCATORS.includes(s);
        return true;
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                    <Segmented<Who>
                        ariaLabel="Who answered"
                        size="sm"
                        value={who}
                        onChange={(v) => { setWho(v); setShown(PAGE); }}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'not_sent', label: 'Not sent' },
                            { value: 'sent', label: 'Sent' },
                            { value: 'other', label: 'Not educators' },
                        ]}
                    />
                </div>
                <button type="button" className={PILL_BTN} onClick={() => downloadCsv(d, rows)} disabled={!rows.length}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
            </div>

            {rows.length === 0 ? (
                <div className={CARD}><Empty icon={ListChecks} title="No answers here" /></div>
            ) : (
                <>
                    <ul className="space-y-3">
                        {rows.slice(0, shown).map((r) => <ResponseCard key={r.id} r={r} questions={d.questions} />)}
                    </ul>
                    {rows.length > shown && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => setShown((n) => n + PAGE)}>
                                Show more ({num(rows.length - shown)} left)
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function ResponseCard({ r, questions }: { r: SurveyRow; questions: SurveyQuestionDef[] }) {
    const first = questions[0];
    const path = pathOf(questions, r.answers).filter((q) => q.id !== first?.id && !isContact(q));
    const c = contactOf(r);
    const hi = c?.name ? `Hi ${c.name.split(/\s+/)[0]}` : 'Hi';
    const wa = c?.phone
        ? whatsAppTo(c.phone, `${hi}, this is TestoZa. Thank you for answering our survey. How can we help with your next test?`)
        : null;

    return (
        <li className={cn(CARD, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3.5">
                {first && r.status && <Chip tone={STATUS_TONE[r.status] || 'slate'}>{answerText(first, r.status)}</Chip>}
                {r.context?.device && <Chip>{cap(r.context.device)}</Chip>}
                {r.context?.ref && <Chip tone="violet" title="Where the link was opened from">{r.context.ref}</Chip>}
                <span className="ml-auto text-[12px] text-slate-400" title={istDateTime(r.created_at)}>{relative(r.created_at)}</span>
            </div>
            {path.length > 0 ? (
                <dl className="mx-4 my-3 divide-y divide-slate-100 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-900/[0.04]">
                    {path.map((q) => (
                        <div key={q.id} className="px-3.5 py-2.5">
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{q.short}</dt>
                            <dd className="mt-0.5 whitespace-pre-line text-[14px] leading-relaxed text-slate-800">
                                {q.kind === 'text' ? `“${answerText(q, r.answers[q.id])}”` : answerText(q, r.answers[q.id])}
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="px-4 pb-3.5 pt-2 text-[13px] text-slate-500">Nothing more after the first question.</p>
            )}
            {c && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 px-4 py-2.5">
                    <span className="mr-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-700">
                        {c.name && <ContactBit icon={User} strong>{c.name}</ContactBit>}
                        {c.email && <ContactBit icon={Mail}>{c.email}</ContactBit>}
                        {c.phone && <ContactBit icon={Phone}>{c.phone}</ContactBit>}
                    </span>
                    {c.email && (
                        <a href={`mailto:${c.email}?subject=${encodeURIComponent('Your answers to the TestoZa survey')}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-900/[0.08] transition-colors hover:bg-slate-50">
                            <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                    )}
                    {wa && (
                        <a href={wa} target="_blank" rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                    )}
                </div>
            )}
        </li>
    );
}

function ContactBit({ icon: Icon, strong, children }: { icon: React.ElementType; strong?: boolean; children: React.ReactNode }) {
    return (
        <span className={cn('inline-flex min-w-0 items-center gap-1.5', strong && 'font-semibold text-slate-900')}>
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{children}</span>
        </span>
    );
}

/** One row per answer, one column per question, labels not keys. Opens in Excel (UTF-8 BOM). */
function downloadCsv(d: SurveyResults, rows: SurveyRow[]) {
    const qs = d.questions.filter((q) => !isContact(q));
    const head = ['Answered at (IST)', ...qs.map((q) => q.short), 'Name', 'Email', 'Phone', 'Device', 'Opened from'];
    const lines = rows.map((r) => {
        const c = contactOf(r);
        return [
            istDateTime(r.created_at),
            ...qs.map((q) => answerText(q, r.answers[q.id])),
            c?.name || '',
            c?.email || '',
            c?.phone || '',
            r.context?.device || '',
            r.context?.ref || '',
        ];
    });
    const cell = (v: string) => {
        // Anyone can type into the survey: a leading = + - @ must not become a spreadsheet formula.
        const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
        return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const csv = '﻿' + [head, ...lines].map((l) => l.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `testoza-survey-${d.survey}-answers.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
