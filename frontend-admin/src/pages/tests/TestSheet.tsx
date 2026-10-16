/**
 * One test, iOS settings style: where it stands, how it is doing (results, average,
 * results by day, latest results, open reports), who made it, what it is, and every
 * admin action the old card menu had — visibility, class, sub-category, edit, settings,
 * solutions, share, clone to a user, delete.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BadgeCheck, BarChart3, Check, Copy, ExternalLink, Flag, KeyRound, Mail, Pencil, Settings2, Share2, ShieldCheck,
    Trash2, Upload, UserPlus, Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchAllSubCategories, fetchCategories, assignSubCategoryToTest } from '@/lib/categoriesApi';
import { fetchAllClasses } from '@/lib/classesApi';
import { deleteTest, updateTest } from '@/lib/testsApi';
import { cn } from '@/lib/utils';
import { shareTest } from '@/utils/shareUtils';
import { getUserAppUrl } from '@/utils/subdomain';
import { istDate, istDateTime, num, relative } from '../analytics/format';
import { ErrorState } from '../analytics/shared';
import { CARD, Chip, GroupedList, IosSheet, KeyValue, Segmented, Skeleton } from '../analytics/ui';
import { testsApi, type TestDetail, type TestRow, type Visibility } from './api';
import CloneToUserDialog from './CloneToUserDialog';
import { CreatorAvatar, factsLine, pctText, StateChips, StateIcon, VISIBILITY } from './display';

const SECTION = 'mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400';

/** Results and Settings are full panels of their own; the page opens them. */
export type PanelRequest = { kind: 'results' | 'settings'; test: any };

export default function TestSheet({ testId, preview, onClose, onShowCreator, onPanel }: {
    testId: string | null;
    preview: TestRow | null;
    onClose: () => void;
    onShowCreator: (c: { id: string; name?: string }) => void;
    onPanel: (p: PanelRequest) => void;
}) {
    // Keep the last test while the sheet animates closed.
    const [kept, setKept] = useState<string | null>(testId);
    useEffect(() => { if (testId) setKept(testId); }, [testId]);
    const id = testId || kept;
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [cloneOpen, setCloneOpen] = useState(false);

    const { data, error, refetch } = useQuery({
        queryKey: ['tests', 'detail', id],
        queryFn: () => testsApi.detail(id!),
        enabled: !!testId,
        staleTime: 15_000,
    });
    const t = data?.test ?? (preview && preview.id === id ? preview : null);

    const changed = () => {
        qc.invalidateQueries({ queryKey: ['tests'] });
    };

    const setVisibility = async (v: Visibility) => {
        if (!t || v === t.visibility) return;
        setBusy('visibility');
        const { error: err } = await updateTest(t.id, { visibility: v, is_public: v === 'public' } as any, true);
        setBusy(null);
        if (err) return toast.error('Couldn’t change who can see it. Try again.');
        toast.success(`Now ${VISIBILITY[v].label.toLowerCase()}`);
        changed();
    };

    const asPanelTest = () => (data ? {
        id: data.test.id,
        title: data.test.title,
        custom_id: data.test.custom_id,
        created_by: data.test.created_by,
        class_id: data.test.class_id ?? null,
        settings: data.test.settings,
        visibility: data.test.visibility,
        slug: data.test.slug,
    } : null);

    const remove = async () => {
        if (!t) return;
        setBusy('delete');
        const { error: err } = await deleteTest(t.id, true);
        setBusy(null);
        if (err) return toast.error('Couldn’t delete the test.');
        toast.success(`Deleted “${t.title}”`);
        setConfirmDelete(false);
        changed();
        onClose();
    };

    const share = () => {
        if (!data) return;
        shareTest({ ...data.test, settings: data.test.settings });
    };

    return (
        <IosSheet
            open={!!testId}
            onOpenChange={(o) => !o && onClose()}
            title={t?.title || 'Test'}
            subtitle={t ? [t.custom_id ? `#${t.custom_id}` : null, `created ${istDate(t.created_at)}`].filter(Boolean).join(' · ') : undefined}
        >
            {!t ? (
                error ? <ErrorState error={error} onRetry={() => refetch()} /> : <Skeleton className="h-60" />
            ) : (
                <div className="space-y-5">
                    {/* ── Where it stands ── */}
                    <section className={cn(CARD, 'p-4')}>
                        <div className="flex items-start gap-3">
                            <StateIcon t={t} size="lg" />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5">
                                    <StateChips t={t} />
                                    <Chip tone="slate">{VISIBILITY[t.visibility]?.label || t.visibility}</Chip>
                                    {t.proctored && <Chip tone="violet"><ShieldCheck className="h-3 w-3" />Proctored</Chip>}
                                </p>
                                <p className="mt-1 text-[13px] text-slate-600">{factsLine({ ...t, custom_id: undefined })}</p>
                                <LiveLine t={t} />
                            </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <Stat label="Results" value={num(t.results)} hint="Submitted by anyone but the creator" />
                            <Stat label="Candidates" value={num(t.candidates)} hint="Different people" />
                            <Stat label="Average" value={pctText(t.avg_pct)} />
                            <Stat label="Best" value={pctText(t.best_pct)} />
                        </dl>
                        {(t.unfinished > 0 || t.previews > 0) && (
                            <p className="mt-2 px-0.5 text-[12px] text-slate-500">
                                {[
                                    t.unfinished > 0 ? `${num(t.unfinished)} started and didn’t submit` : null,
                                    t.previews > 0 ? `${num(t.previews)} preview${t.previews === 1 ? '' : 's'} by the creator (not counted)` : null,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </section>

                    {/* ── Main actions ── */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <ActionTile icon={BarChart3} label="Results" onClick={() => onPanel({ kind: 'results', test: { id: t.id, title: t.title } })} />
                        <ActionTile icon={ExternalLink} label="Open test" href={getUserAppUrl(`/test-intro/${t.id}`)} />
                        <ActionTile icon={Pencil} label="Edit" onClick={() => navigate(`/edit-test/${t.id}`)} />
                        <ActionTile icon={Settings2} label="Settings" disabled={!data}
                            onClick={() => { const p = asPanelTest(); if (p) onPanel({ kind: 'settings', test: p }); }} />
                    </div>

                    {error && !data ? <ErrorState error={error} onRetry={() => refetch()} /> : !data ? <Skeleton className="h-40" /> : (
                        <>
                            <Activity d={data} />
                            {data.recent.length > 0 && <Recent d={data} />}
                            {data.reports.length > 0 && <Reports d={data} />}
                            <About d={data} />
                            {data.creator && (
                                <Creator d={data} onShowAll={() => data.creator?.id && onShowCreator({ id: data.creator.id, name: data.creator.name })} />
                            )}

                            {/* ── Manage ── */}
                            <div>
                                <p className={SECTION}>Who can see it</p>
                                <Segmented<Visibility>
                                    ariaLabel="Visibility"
                                    value={t.visibility}
                                    onChange={setVisibility}
                                    className="w-full [&>button]:flex-1"
                                    options={(['public', 'unlisted', 'private'] as Visibility[]).map((v) => ({
                                        value: v, label: VISIBILITY[v].label, title: VISIBILITY[v].hint,
                                    }))}
                                />
                                <p className="mt-1.5 px-1 text-[12px] text-slate-500">
                                    {busy === 'visibility' ? 'Saving…'
                                        : t.status === 'live' ? 'This is a live exam. Its link works whatever you pick here; making it public also lists it.'
                                        : VISIBILITY[t.visibility]?.hint}
                                </p>
                            </div>

                            <Organise d={data} onChanged={() => { changed(); }} />

                            <GroupedList>
                                <MenuRow icon={Share2} label="Share link" onClick={share} />
                                <MenuRow icon={Upload} label="Upload solutions" hint={data.test.has_solutions ? 'Solutions uploaded' : 'No solutions yet'}
                                    onClick={() => navigate(`/solutions-editor/${t.id}`)} />
                                <MenuRow icon={UserPlus} label="Copy to a user’s account…" hint="They get their own private copy"
                                    onClick={() => setCloneOpen(true)} />
                                <MenuRow icon={Trash2} label="Delete test…" danger onClick={() => setConfirmDelete(true)} />
                            </GroupedList>

                            <DeleteDialog open={confirmDelete} onOpenChange={setConfirmDelete} d={data} busy={busy === 'delete'} onConfirm={remove} />
                            <CloneToUserDialog open={cloneOpen} onOpenChange={setCloneOpen} test={{ id: t.id, title: t.title }} />
                        </>
                    )}
                </div>
            )}
        </IosSheet>
    );
}

/** One line on exam timing: live since / opens / ended, plus the join code. */
function LiveLine({ t }: { t: TestRow }) {
    const [copied, setCopied] = useState(false);
    let text: string | null = null;
    if (t.status === 'live') text = `Live${t.live_since ? ` since ${istDateTime(t.live_since)}` : ''}${t.ends_at ? ` · closes ${istDateTime(t.ends_at)}` : ''}`;
    else if (t.status === 'scheduled') text = `Opens ${t.starts_at ? istDateTime(t.starts_at) : 'later'}${t.ends_at ? ` · closes ${istDateTime(t.ends_at)}` : ''}`;
    else if (t.status === 'ended') text = t.ended_at ? `Exam ended ${istDateTime(t.ended_at)}` : 'Exam ended';
    if (!text && !t.join_code) return null;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(t.join_code!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Couldn’t copy');
        }
    };
    return (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
            {text && <span>{text}</span>}
            {t.status === 'live' && t.writing_now > 0 && <span className="font-semibold text-emerald-700">{num(t.writing_now)} writing now</span>}
            {t.join_code && (
                <button type="button" onClick={copy} title="Copy join code"
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-slate-700 hover:bg-slate-200">
                    <KeyRound className="h-3 w-3" />{t.join_code.slice(0, 3)} {t.join_code.slice(3)}
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                </button>
            )}
        </p>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2" title={hint}>
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="text-[18px] font-semibold tabular-nums text-slate-900">{value}</dd>
        </div>
    );
}

function ActionTile({ icon: Icon, label, onClick, href, disabled }: {
    icon: React.ElementType; label: string; onClick?: () => void; href?: string; disabled?: boolean;
}) {
    const cls = cn(CARD, 'flex flex-col items-center justify-center gap-1.5 px-2 py-3 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 motion-safe:active:scale-[0.98] disabled:opacity-50');
    const inner = <><Icon className="h-[18px] w-[18px] text-sky-600" aria-hidden="true" />{label}</>;
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
    return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
}

function MenuRow({ icon: Icon, label, hint, onClick, danger }: {
    icon: React.ElementType; label: string; hint?: string; onClick: () => void; danger?: boolean;
}) {
    return (
        <li>
            <button type="button" onClick={onClick}
                className={cn('flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-medium transition-colors',
                    danger ? 'text-rose-600 hover:bg-rose-50/60' : 'text-sky-700 hover:bg-slate-50')}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{label}</span>
                {hint && <span className="shrink-0 text-[12px] font-normal text-slate-400">{hint}</span>}
            </button>
        </li>
    );
}

/** Results per day for the last 30 days, and where they came from. */
function Activity({ d }: { d: TestDetail }) {
    const days: { key: string; n: number }[] = [];
    const byDay = new Map(d.daily.map((x) => [x.d, x.n]));
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 86400000);
        const key = day.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // yyyy-mm-dd
        days.push({ key, n: byDay.get(key) || 0 });
    }
    const max = Math.max(1, ...days.map((x) => x.n));
    const last30 = days.reduce((a, x) => a + x.n, 0);
    const { exam, practice, flagged } = d.modes;
    return (
        <section className={cn(CARD, 'p-4')}>
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[14px] font-semibold text-slate-900">Last 30 days</h3>
                <span className="text-[12px] text-slate-500">{num(last30)} result{last30 === 1 ? '' : 's'} · {num(d.test.results_7d)} this week</span>
            </div>
            <div className="mt-3 flex h-14 items-end gap-[3px]" role="img" aria-label={`${last30} results in the last 30 days`}>
                {days.map((x) => (
                    <span key={x.key} title={`${x.key}: ${x.n}`}
                        className={cn('flex-1 rounded-t-[3px]', x.n ? 'bg-sky-600' : 'bg-slate-100')}
                        style={{ height: `${x.n ? Math.max(10, (x.n / max) * 100) : 6}%` }} />
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>30 days ago</span><span>Today</span></div>
            {exam + practice > 0 && (
                <p className="mt-3 text-[12px] text-slate-600">
                    {num(exam)} in an exam · {num(practice)} practice
                    {flagged > 0 && <span className="text-amber-700"> · {num(flagged)} with proctoring flags</span>}
                </p>
            )}
            {d.test.last_result_at && <p className="mt-0.5 text-[12px] text-slate-500">Last taken {relative(d.test.last_result_at)}</p>}
        </section>
    );
}

function Recent({ d }: { d: TestDetail }) {
    const marks = d.test.marks;
    return (
        <div>
            <p className={SECTION}>Latest results</p>
            <GroupedList>
                {d.recent.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-slate-800">{r.name || 'Unnamed candidate'}</span>
                            <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                                {istDateTime(r.at)}
                                {r.exam && <Chip tone="emerald" className="!py-0">Exam</Chip>}
                                {r.violations ? <Chip tone="amber" className="!py-0">{r.violations} flag{r.violations === 1 ? '' : 's'}</Chip> : null}
                            </span>
                        </span>
                        <span className="shrink-0 text-right">
                            <span className="block text-[14px] font-semibold tabular-nums text-slate-900">
                                {r.score === null ? '—' : Number(r.score)}{marks ? <span className="font-normal text-slate-400">/{Number(marks)}</span> : null}
                            </span>
                            {r.pct !== undefined && r.pct !== null && <span className="block text-[11px] text-slate-400">{pctText(r.pct)}</span>}
                        </span>
                    </li>
                ))}
            </GroupedList>
        </div>
    );
}

function Reports({ d }: { d: TestDetail }) {
    return (
        <div>
            <p className={SECTION}>Open question reports</p>
            <GroupedList className="ring-rose-500/20">
                {d.reports.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                        <Flag className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-slate-800">Question {r.question} · {r.reason}</span>
                            {r.details && <span className="block text-[12px] text-slate-500">{r.details}</span>}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">{relative(r.at)}</span>
                    </li>
                ))}
            </GroupedList>
        </div>
    );
}

function About({ d }: { d: TestDetail }) {
    const t = d.test;
    return (
        <div>
            <p className={SECTION}>About</p>
            <GroupedList>
                {t.description && (
                    <li className="px-4 py-2.5 text-[13px] leading-relaxed text-slate-700">{t.description}</li>
                )}
                <KeyValue label="Questions">{factsLine({ ...t, custom_id: undefined })}</KeyValue>
                <KeyValue label="Class">{t.class_name || '—'}</KeyValue>
                <KeyValue label="Category">
                    {d.categories.length ? d.categories.map((c) => c.name).join(', ') : '—'}
                    {d.sub_category ? ` → ${d.sub_category.name}` : ''}
                </KeyValue>
                {t.tags && t.tags.length > 0 && <KeyValue label="Tags">{t.tags.join(', ')}</KeyValue>}
                <KeyValue label="Solutions">{t.has_solutions ? 'Uploaded' : 'None'}</KeyValue>
                {(t.is_cloned || d.clones > 0) && (
                    <KeyValue label="Copies">
                        {[t.is_cloned ? 'This is a copy' : null, d.clones > 0 ? `${num(d.clones)} cop${d.clones === 1 ? 'y' : 'ies'} made from it` : null].filter(Boolean).join(' · ')}
                    </KeyValue>
                )}
                {d.combined.length > 0 && <KeyValue label="Combined sessions">{d.combined.map((c) => c.title).join(', ')}</KeyValue>}
                <KeyValue label="Created">{istDateTime(t.created_at)}</KeyValue>
            </GroupedList>
        </div>
    );
}

function Creator({ d, onShowAll }: { d: TestDetail; onShowAll: () => void }) {
    const c = d.creator!;
    return (
        <div>
            <p className={SECTION}>Made by</p>
            <GroupedList>
                <li className="flex items-center gap-3 px-4 py-3">
                    <CreatorAvatar name={c.name} url={c.avatar_url} size="md" />
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                            <span className="truncate text-[14px] font-semibold text-slate-900">{c.name || 'Unnamed'}</span>
                            {c.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Verified creator" />}
                            {c.is_team && <Chip tone="violet">Team</Chip>}
                        </span>
                        <span className="block truncate text-[12px] text-slate-500">
                            {[c.designation, c.email].filter(Boolean).join(' · ')}
                        </span>
                        <span className="block text-[12px] text-slate-500">
                            {num(c.tests)} test{c.tests === 1 ? '' : 's'}{c.joined_at ? ` · joined ${istDate(c.joined_at)}` : ''}
                        </span>
                    </span>
                </li>
                <li>
                    <button type="button" onClick={onShowAll} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-medium text-sky-700 hover:bg-slate-50">
                        <Users className="h-4 w-4" /> Show all their tests
                    </button>
                </li>
                {c.email && (
                    <li>
                        <a href={`mailto:${c.email}?subject=${encodeURIComponent(`About your test “${d.test.title}”`)}`}
                            className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-sky-700 hover:bg-slate-50">
                            <Mail className="h-4 w-4" /> Email {c.name?.split(' ')[0] || 'them'}
                        </a>
                    </li>
                )}
            </GroupedList>
        </div>
    );
}

/** Class and sub-category, loaded only when a sheet is open (both lists are small). */
function Organise({ d, onChanged }: { d: TestDetail; onChanged: () => void }) {
    const t = d.test;
    const classes = useQuery({
        queryKey: ['tests', 'classes'],
        queryFn: async () => { const r = await fetchAllClasses(); if (r.error) throw r.error; return (r.data || []) as { id: string; name: string; user_id: string }[]; },
        staleTime: 5 * 60_000,
    });
    const subs = useQuery({
        queryKey: ['tests', 'subcategories'],
        queryFn: async () => {
            const [s, c] = await Promise.all([fetchAllSubCategories(), fetchCategories()]);
            const cats = new Map(((c.data || []) as { id: string; name: string }[]).map((x) => [x.id, x.name]));
            return ((s.data || []) as { id: string; name: string; category_id: string }[]).map((x) => ({ ...x, category: cats.get(x.category_id) || '' }));
        },
        staleTime: 5 * 60_000,
    });
    const [classId, setClassId] = useState<string>(t.class_id || '');
    const [subId, setSubId] = useState<string>(d.sub_category?.id || '');
    useEffect(() => { setClassId(t.class_id || ''); setSubId(d.sub_category?.id || ''); }, [t.id, t.class_id, d.sub_category?.id]);

    // The creator's own classes first: a test belongs in one of those.
    const own = (classes.data || []).filter((c) => c.user_id === t.created_by);
    const others = (classes.data || []).filter((c) => c.user_id !== t.created_by);
    const catIds = new Set(d.categories.map((c) => c.id));
    const subOptions = (subs.data || []).filter((s) => !catIds.size || catIds.has(s.category_id));

    const saveClass = async (next: string) => {
        const before = classId;
        setClassId(next);
        const { error } = await updateTest(t.id, { class_id: next || null } as any, true);
        if (error) { setClassId(before); return toast.error('Couldn’t change the class.'); }
        toast.success(next ? 'Class assigned' : 'Removed from class');
        onChanged();
    };
    const saveSub = async (next: string) => {
        const before = subId;
        setSubId(next);
        const { error } = await assignSubCategoryToTest(t.id, next || null);
        if (error) { setSubId(before); return toast.error('Couldn’t change the sub-category.'); }
        toast.success(next ? 'Sub-category assigned' : 'Sub-category removed');
        onChanged();
    };

    const select = 'h-9 w-full max-w-[60%] truncate rounded-lg border-transparent bg-slate-100 px-2 text-right text-[13px] font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40';
    return (
        <div>
            <p className={SECTION}>Organise</p>
            <GroupedList>
                <li className="flex items-center justify-between gap-4 px-4 py-2">
                    <label htmlFor="test-class" className="text-[13px] text-slate-500">Class</label>
                    <select id="test-class" className={select} value={classId} onChange={(e) => saveClass(e.target.value)} disabled={!classes.data}>
                        <option value="">None</option>
                        {own.length > 0 && <optgroup label="Creator’s classes">{own.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                        {others.length > 0 && <optgroup label="Other classes">{others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                    </select>
                </li>
                <li className="flex items-center justify-between gap-4 px-4 py-2">
                    <label htmlFor="test-sub" className="text-[13px] text-slate-500">Sub-category</label>
                    <select id="test-sub" className={select} value={subId} onChange={(e) => saveSub(e.target.value)} disabled={!subs.data}>
                        <option value="">None</option>
                        {subOptions.map((s) => <option key={s.id} value={s.id}>{s.category ? `${s.category} → ` : ''}{s.name}</option>)}
                    </select>
                </li>
            </GroupedList>
        </div>
    );
}

function DeleteDialog({ open, onOpenChange, d, busy, onConfirm }: {
    open: boolean; onOpenChange: (o: boolean) => void; d: TestDetail; busy: boolean; onConfirm: () => void;
}) {
    const [typed, setTyped] = useState('');
    useEffect(() => { if (!open) setTyped(''); }, [open]);
    const t = d.test;
    const lines: string[] = ['The test and all its questions'];
    if (t.results) lines.push(`Its ${num(t.results)} result${t.results === 1 ? '' : 's'} stay saved but can no longer be opened — not by the creator, not by candidates`);
    if (t.status === 'live' || t.status === 'scheduled') lines.push('The live exam link and join code stop working at once');
    if (d.combined.length) lines.push(`${num(d.combined.length)} combined session${d.combined.length === 1 ? '' : 's'} using it`);
    if (d.reports.length) lines.push('Its question reports');
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm rounded-[22px] p-5">
                <AlertDialogHeader>
                    <AlertDialogTitle className="!text-[17px]">Delete “{t.title}”?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-[13px] text-slate-600">
                            <p>This can’t be undone. It removes:</p>
                            <ul className="list-disc space-y-1 pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <label className="mt-1 block text-[12px] font-medium text-slate-600">
                    Type <b>delete</b> to confirm
                    <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
                        className="mt-1.5 h-10 w-full rounded-xl border-transparent bg-slate-100 px-3 text-[14px] text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40" />
                </label>
                <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
                    <AlertDialogCancel className="h-10 rounded-xl">Cancel</AlertDialogCancel>
                    <button type="button" disabled={typed.trim().toLowerCase() !== 'delete' || busy} onClick={onConfirm}
                        className="h-10 rounded-xl bg-rose-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                        {busy ? 'Deleting…' : 'Delete test'}
                    </button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
