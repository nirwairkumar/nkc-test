import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Loader2, Printer } from 'lucide-react';
import { ResultRow, SessionResults, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { fullDate, minutesText, percentile, topicSplit } from '@/components/exams/examFormat';

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

/**
 * /exams/:id/report-cards — one A4 page per student, ready to print or save as PDF.
 * This is what a coaching institute hands to parents.
 */
export default function ReportCardsPage() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<SessionResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [only, setOnly] = useState<string>('all');

    useEffect(() => {
        examSessionsApi.results(id).then(setData).catch(err => setError(problemOf(err).message));
    }, [id]);

    const rows = useMemo(() => (data ? (only === 'all' ? data.rows : data.rows.filter(r => r.attempt_id === only)) : []), [data, only]);

    if (error) return <p className="p-10 text-center text-[16px] text-slate-700">{error}</p>;
    if (!data) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>;

    return (
        <div className="min-h-[100dvh] bg-slate-100 print:bg-white">
            <Helmet><title>{`Report cards · ${data.test.title} · ${data.name}`}</title></Helmet>
            <style>{'@page { size: A4; margin: 12mm; } @media print { .rc-page { break-after: page; box-shadow: none !important; margin: 0 !important; } }'}</style>

            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
                <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <button type="button" onClick={() => navigate(`/exams/${id}`)} className="-ml-2 inline-flex h-9 items-center rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer">
                        <ChevronLeft className="h-5 w-5" /> Exam room
                    </button>
                    <div className="flex items-center gap-2">
                        <select value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Which candidates" className="h-10 rounded-xl bg-slate-100 px-3 text-[14px] text-slate-800 outline-none">
                            <option value="all">All {data.rows.length} candidates</option>
                            {data.rows.map(r => <option key={r.attempt_id} value={r.attempt_id}>{r.name}</option>)}
                        </select>
                        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-white hover:bg-[hsl(200,95%,30%)] cursor-pointer">
                            <Printer className="h-4 w-4" /> Print or save as PDF
                        </button>
                    </div>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="p-10 text-center text-[16px] text-slate-600">No results yet.</p>
            ) : (
                <div className="mx-auto max-w-[860px] space-y-6 px-4 py-6 print:max-w-none print:space-y-0 print:p-0">
                    {rows.map(r => <ReportCard key={r.attempt_id} data={data} row={r} />)}
                </div>
            )}
        </div>
    );
}

/** Driven by marks. Rank only adds praise in a class big enough for rank to mean something. */
function remark(percent: number | null, pctile: number, classSize: number): string {
    const p = percent ?? 0;
    if (p >= 85 || (classSize >= 10 && pctile >= 90 && p >= 60)) return 'Excellent work. Keep up this level of preparation.';
    if (p >= 65) return 'Good performance. Revising the weaker sections will lift the score further.';
    if (p >= 40) return 'Fair attempt. Regular practice of the weak topics is needed.';
    return 'Needs attention. Please meet the teacher to plan extra practice.';
}

function ReportCard({ data, row }: { data: SessionResults; row: ResultRow }) {
    const total = data.rows.length;
    const pctile = percentile(row.score, data.rows.map(r => r.score));
    const attempted = row.correct + row.wrong + row.partial;
    const accuracy = attempted ? Math.round((row.correct / attempted) * 100) : null;
    const { strong, weak } = topicSplit(row.topics);
    const institute = data.test.institution_name || data.batch || '';

    return (
        <article className="rc-page mx-auto bg-white p-8 text-slate-900 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] print:p-0 sm:p-10" style={{ maxWidth: 794 }}>
            <header className="flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                    {data.test.institution_logo && <img src={data.test.institution_logo} alt="" className="h-14 w-14 object-contain" />}
                    <div>
                        <p className="text-[20px] font-bold leading-tight">{institute || 'Report card'}</p>
                        <p className="text-[13px] text-slate-600">{data.batch ? `${data.batch} · ` : ''}{fullDate(data.opens_at)}</p>
                    </div>
                </div>
                <p className="text-right text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">Report card</p>
            </header>

            <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 text-[14px]">
                <p><span className="text-slate-500">Candidate</span><br /><span className="text-[18px] font-semibold">{row.name}</span></p>
                <p><span className="text-slate-500">Roll number</span><br /><span className="text-[18px] font-semibold">{row.roll_no || '—'}</span></p>
                <p className="col-span-2 mt-2"><span className="text-slate-500">Exam</span><br /><span className="font-semibold">{data.test.title}</span> · {data.name}</p>
            </section>

            <section className="mt-6 grid grid-cols-4 gap-3 text-center">
                <Big label="Marks" value={`${fmt(row.score)} / ${fmt(row.max_marks)}`} />
                <Big label="Percentage" value={row.percent !== null ? `${fmt(row.percent)}%` : '—'} />
                <Big label="Rank" value={`${row.rank} / ${total}`} />
                <Big label="Percentile" value={String(pctile)} />
            </section>

            <section className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
                <Small label="Batch average" value={`${fmt(data.summary.average)} / ${fmt(data.max_marks)}`} />
                <Small label="Highest in batch" value={`${fmt(data.summary.highest)} / ${fmt(data.max_marks)}`} />
                <Small label="Time taken" value={row.time_taken_seconds !== null ? minutesText(row.time_taken_seconds) : '—'} />
            </section>

            {row.sections.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">Section-wise marks</h2>
                    <table className="mt-2 w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="border-b border-slate-300 text-left text-slate-600">
                                <th className="py-1.5 font-semibold">Section</th>
                                <th className="py-1.5 text-right font-semibold">Marks</th>
                                <th className="py-1.5 text-right font-semibold">Correct</th>
                                <th className="py-1.5 text-right font-semibold">Wrong</th>
                                <th className="py-1.5 text-right font-semibold">Skipped</th>
                                <th className="py-1.5 text-right font-semibold">Batch avg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {row.sections.map((s, i) => (
                                <tr key={s.name} className="border-b border-slate-100">
                                    <td className="py-1.5">{s.name}</td>
                                    <td className="py-1.5 text-right font-semibold tabular-nums">{fmt(s.score)} / {fmt(s.max)}</td>
                                    <td className="py-1.5 text-right tabular-nums">{s.correct}</td>
                                    <td className="py-1.5 text-right tabular-nums">{s.wrong}</td>
                                    <td className="py-1.5 text-right tabular-nums">{s.unattempted}</td>
                                    <td className="py-1.5 text-right tabular-nums text-slate-600">{fmt(data.section_averages[i]?.average)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            <section className="mt-6 grid grid-cols-4 gap-3 text-center text-[13px]">
                <Small label="Correct" value={String(row.correct)} />
                <Small label="Wrong" value={String(row.wrong)} />
                <Small label="Skipped" value={String(row.unattempted)} />
                <Small label="Accuracy" value={accuracy !== null ? `${accuracy}%` : '—'} />
            </section>

            {(strong.length > 0 || weak.length > 0) && (
                <section className="mt-6 grid grid-cols-2 gap-6 text-[13px]">
                    <div>
                        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Strong topics</h2>
                        {strong.length
                            ? <ul className="mt-1.5 list-disc pl-5">{strong.map(t => <li key={t.name}>{t.name} ({fmt(t.score)}/{fmt(t.max)})</li>)}</ul>
                            : <p className="mt-1.5 text-slate-500">None above 60% yet.</p>}
                    </div>
                    <div>
                        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-rose-700">Needs practice</h2>
                        {weak.length
                            ? <ul className="mt-1.5 list-disc pl-5">{weak.map(t => <li key={t.name}>{t.name} ({fmt(t.score)}/{fmt(t.max)})</li>)}</ul>
                            : <p className="mt-1.5 text-slate-500">No topic below 50%.</p>}
                    </div>
                </section>
            )}

            <section className="mt-6 rounded-lg border border-slate-200 p-4">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">Remarks</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed">{remark(row.percent, pctile, total)}</p>
            </section>

            <footer className="mt-12 grid grid-cols-2 gap-10 text-[12px] text-slate-500">
                <div className="border-t border-slate-400 pt-1.5">Teacher's signature</div>
                <div className="border-t border-slate-400 pt-1.5">Parent's signature</div>
            </footer>
            <p className="mt-6 text-center text-[10px] text-slate-400">Marks checked automatically by TestoZa</p>
        </article>
    );
}

function Big({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 px-2 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
            <p className="mt-1 text-[20px] font-bold tabular-nums">{value}</p>
        </div>
    );
}

function Small({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-slate-50 px-3 py-2 print:border print:border-slate-200 print:bg-white">
            <p className="text-slate-500">{label}</p>
            <p className="font-semibold tabular-nums">{value}</p>
        </div>
    );
}
