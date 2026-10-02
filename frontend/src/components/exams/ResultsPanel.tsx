import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardCopy, Download, FileText, Inbox, Loader2, RefreshCw, Send } from 'lucide-react';
import { SessionResults, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { CARD, PILL_BTN, PRIMARY_BTN, Skeleton } from '@/components/dashboard/dashboardUi';
import { minutesText } from './examFormat';
import { absentParentText, parentText, rankListText, whatsappLink } from './share';

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

/** Rank list, section marks, who is missing — and what the teacher sends to parents. */
export default function ResultsPanel({ sessionId, version, onChanged }: { sessionId: string; version: number; onChanged: () => void }) {
    const navigate = useNavigate();
    const [data, setData] = useState<SessionResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await examSessionsApi.results(sessionId));
            setError(null);
        } catch (err) {
            setError(problemOf(err).message);
        }
    }, [sessionId]);

    useEffect(() => { load(); }, [load, version]);

    const copyRankList = async () => {
        if (!data) return;
        try {
            await navigator.clipboard.writeText(rankListText(data));
            toast.success('Rank list copied — paste it in the batch group');
        } catch {
            toast.error('Could not copy');
        }
    };

    const downloadExcel = async () => {
        if (!data) return;
        setBusy('excel');
        try {
            const XLSX = await import('xlsx');
            const sectionNames = data.section_averages.map(s => s.name);
            const rows = data.rows.map(r => {
                const row: Record<string, string | number | null> = {
                    Rank: r.rank,
                    Name: r.name,
                    'Roll No': r.roll_no,
                    Score: r.score,
                    'Max Marks': r.max_marks,
                    'Percent': r.percent,
                    Correct: r.correct,
                    Wrong: r.wrong,
                    Skipped: r.unattempted,
                };
                sectionNames.forEach((name, i) => { row[name] = r.sections[i]?.score ?? null; });
                row['Time (min)'] = r.time_taken_seconds !== null ? Math.round(r.time_taken_seconds / 60) : null;
                row['Warnings'] = r.violations;
                row['Parent Phone'] = r.parent_phone;
                row['Note'] = [r.collected ? 'Answers collected by teacher' : '', r.late_seconds ? `Submitted ${Math.round(r.late_seconds / 60)} min late` : ''].filter(Boolean).join('; ');
                return row;
            });
            data.absent.forEach(a => rows.push({ Rank: null, Name: a.name, 'Roll No': a.roll_no, Note: 'Absent', 'Parent Phone': a.parent_phone }));
            const sheet = XLSX.utils.json_to_sheet(rows);
            const book = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(book, sheet, 'Results');
            const safe = `${data.test.title} - ${data.name}`.replace(/[^a-z0-9 ._-]+/gi, ' ').trim().slice(0, 80);
            XLSX.writeFile(book, `${safe}.xlsx`);
        } catch {
            toast.error('Could not make the Excel file');
        } finally {
            setBusy(null);
        }
    };

    const release = async () => {
        setBusy('release');
        try {
            await examSessionsApi.release(sessionId);
            toast.success('Results released. Candidates can see them now.');
            await load();
            onChanged();
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setBusy(null);
        }
    };

    const collect = async () => {
        setBusy('collect');
        try {
            const res = await examSessionsApi.collect(sessionId);
            toast.success(res.collected ? `Filed the saved answers of ${res.collected} candidate${res.collected === 1 ? '' : 's'}.` : 'No saved answers to file.');
            await load();
            onChanged();
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setBusy(null);
        }
    };

    if (error) {
        return (
            <div className={`${CARD} flex items-center justify-between gap-3 px-5 py-4`}>
                <p className="text-[15px] text-slate-700">{error}</p>
                <button type="button" className={PILL_BTN} onClick={load}><RefreshCw className="h-4 w-4 text-sky-600" /> Try again</button>
            </div>
        );
    }
    if (!data) return <div className={`${CARD} space-y-3 p-5`}>{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>;

    const institute = data.test.institution_name;
    const ended = data.phase === 'ended';

    return (
        <section className="space-y-5">
            {!data.results_released && data.rows.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl bg-sky-50 px-4 py-3.5 ring-1 ring-inset ring-sky-600/15 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] text-sky-900">
                        Candidates can't see their results yet.
                        {data.results_release === 'on_end' && !ended ? ' They appear when the exam ends.' : ''}
                    </p>
                    <button type="button" onClick={release} disabled={!!busy} className={`${PRIMARY_BTN} h-9 px-3.5 text-[13px]`}>
                        {busy === 'release' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Release now
                    </button>
                </div>
            )}

            {data.not_submitted.some(p => p.status === 'writing') && ended && (
                <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 ring-1 ring-inset ring-amber-600/20 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] text-amber-900">
                        {data.not_submitted.filter(p => p.status === 'writing').map(p => p.name).join(', ')} started but never submitted.
                    </p>
                    <button type="button" onClick={collect} disabled={!!busy} className={PILL_BTN}>
                        {busy === 'collect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4 text-amber-700" />} File their saved answers
                    </button>
                </div>
            )}

            {data.rows.length === 0 ? (
                <div className={`${CARD} px-6 py-12 text-center`}>
                    <p className="text-[16px] font-semibold text-slate-900">No results yet</p>
                    <p className="mt-1 text-[14px] text-slate-600">Each candidate's marks appear here the moment they submit.</p>
                </div>
            ) : (
                <>
                    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <Tile label="Submitted" value={`${data.summary.count}${data.absent.length || data.not_submitted.length ? ` of ${data.summary.count + data.absent.length + data.not_submitted.length}` : ''}`} />
                        <Tile label="Average" value={`${fmt(data.summary.average)} / ${fmt(data.max_marks)}`} />
                        <Tile label="Highest" value={fmt(data.summary.highest)} sub={data.rows[0]?.name} />
                        <Tile label="Lowest" value={fmt(data.summary.lowest)} sub={data.rows.length > 1 ? data.rows[data.rows.length - 1]?.name : undefined} />
                    </dl>

                    {data.section_averages.length > 0 && (
                        <div className={`${CARD} p-5`}>
                            <h3 className="text-[15px] font-semibold text-slate-900">Class average by section</h3>
                            <div className="mt-3 space-y-3">
                                {data.section_averages.map(s => {
                                    const pct = s.max ? Math.max(0, Math.min(100, ((s.average || 0) / s.max) * 100)) : 0;
                                    return (
                                        <div key={s.name}>
                                            <div className="flex justify-between text-[14px]">
                                                <span className="text-slate-700">{s.name}</span>
                                                <span className="font-semibold tabular-nums text-slate-900">{fmt(s.average)} / {fmt(s.max)}</span>
                                            </div>
                                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div className={`h-full rounded-full ${pct < 40 ? 'bg-rose-400' : pct < 75 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={PILL_BTN} onClick={copyRankList}><ClipboardCopy className="h-4 w-4 text-sky-600" /> Copy rank list</button>
                        <a href={whatsappLink(rankListText(data))} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3.5 text-[13px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20">
                            Send rank list on WhatsApp
                        </a>
                        <button type="button" className={PILL_BTN} onClick={downloadExcel} disabled={!!busy}>
                            {busy === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-sky-600" />} Excel
                        </button>
                        <button type="button" className={PILL_BTN} onClick={() => navigate(`/exams/${sessionId}/report-cards`)}>
                            <FileText className="h-4 w-4 text-sky-600" /> Report cards
                        </button>
                    </div>

                    <ol className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {data.rows.map(r => (
                            <li key={r.attempt_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${r.rank === 1 ? 'bg-amber-100 text-amber-800' : r.rank === 2 ? 'bg-slate-200 text-slate-700' : r.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'}`}>
                                    {r.rank}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-semibold text-slate-900">
                                        {r.name} {r.roll_no && <span className="font-normal text-slate-500">{r.roll_no}</span>}
                                    </p>
                                    <p className="mt-0.5 flex flex-wrap gap-x-2.5 text-[13px] text-slate-500">
                                        <span>{r.correct} right · {r.wrong} wrong · {r.unattempted} skipped</span>
                                        {r.time_taken_seconds !== null && <span>{minutesText(r.time_taken_seconds)}</span>}
                                        {r.sections.length > 0 && <span className="hidden sm:inline">{r.sections.map(s => `${s.name.slice(0, 4)} ${fmt(s.score)}`).join(' · ')}</span>}
                                        {r.violations > 0 && <span className="text-amber-700">{r.violations} warning{r.violations === 1 ? '' : 's'}</span>}
                                        {r.collected && <span className="text-violet-700">answers filed by you</span>}
                                        {r.late_seconds > 0 && <span className="text-amber-700">{Math.max(1, Math.round(r.late_seconds / 60))} min late</span>}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-[16px] font-bold tabular-nums text-slate-900">{fmt(r.score)}<span className="text-[13px] font-normal text-slate-500"> / {fmt(r.max_marks)}</span></p>
                                    {r.percent !== null && <p className="text-[12px] text-slate-500">{Math.round(r.percent)}%</p>}
                                </div>
                                {r.parent_phone && (
                                    <a
                                        href={whatsappLink(parentText(data, r, institute), r.parent_phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Send to parent on WhatsApp"
                                        aria-label={`Send ${r.name}'s result to their parent on WhatsApp`}
                                        className="hidden h-8 shrink-0 items-center rounded-full bg-[#25D366]/10 px-3 text-[12px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 sm:inline-flex"
                                    >
                                        Parent
                                    </a>
                                )}
                            </li>
                        ))}
                    </ol>
                </>
            )}

            {(data.absent.length > 0 || data.not_submitted.length > 0) && (
                <div>
                    <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Didn't submit ({data.absent.length + data.not_submitted.length})
                    </h3>
                    <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                        {data.not_submitted.map(p => (
                            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px] sm:px-5">
                                <span className="text-slate-800">{p.name} {p.roll_no && <span className="text-slate-500">{p.roll_no}</span>}</span>
                                <span className="text-slate-500">{p.status === 'writing' ? 'Started, not submitted' : 'Joined, never started'}</span>
                            </li>
                        ))}
                        {data.absent.map(a => (
                            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px] sm:px-5">
                                <span className="text-slate-800">{a.name} <span className="text-slate-500">{a.roll_no}</span></span>
                                <span className="flex items-center gap-2 text-slate-500">
                                    Absent
                                    {a.parent_phone && (
                                        <a href={whatsappLink(absentParentText(data, a.name, institute), a.parent_phone)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex h-7 items-center rounded-full bg-[#25D366]/10 px-2.5 text-[12px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20">
                                            Tell parent
                                        </a>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className={`${CARD} min-w-0 px-4 py-3`}>
            <dt className="text-[13px] text-slate-500">{label}</dt>
            <dd className="mt-0.5 truncate text-[22px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{value}</dd>
            {sub && <dd className="truncate text-[12px] text-slate-500">{sub}</dd>}
        </div>
    );
}
