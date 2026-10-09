/**
 * bank-planner: what a 20-minute section does to one candidate. Set seconds per question and
 * accuracy for each section of a 100-mark prelims paper (30 / 35 / 35 questions, one mark
 * each, a quarter off for a wrong answer); the planner compares one 60-minute clock, where
 * time saved in one section can go to another, with 20 minutes a section, where it is lost.
 *
 * The one-clock figure is a best case: time goes first to the questions that earn the most
 * marks per second, and no section can take more than its own questions.
 */
import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DemoFrame, useWidth } from './replica';

interface Row {
    name: string;
    /** Questions in the section. */
    count: number;
    seconds: number;
    accuracy: number;
}

const START: Row[] = [
    { name: 'English', count: 30, seconds: 25, accuracy: 75 },
    { name: 'Quantitative Aptitude', count: 35, seconds: 55, accuracy: 80 },
    { name: 'Reasoning Ability', count: 35, seconds: 30, accuracy: 85 },
];
/** Every question is worth a mark, and a wrong one costs a quarter. */
const PLUS = 1;
const MINUS = 0.25;
const SECTION = 20 * 60;
const TOTAL = START.length * SECTION;

const value = (r: Row) => (r.accuracy / 100) * PLUS - (1 - r.accuracy / 100) * MINUS;

function sectional(rows: Row[]) {
    return rows.map((r) => {
        const attempts = Math.min(r.count, Math.floor(SECTION / r.seconds));
        return { attempts, marks: attempts * value(r), unused: SECTION - attempts * r.seconds };
    });
}

function oneClock(rows: Row[]) {
    let time = TOTAL;
    const attempts = rows.map(() => 0);
    // Best case: the most marks per second first.
    const order = rows.map((_, i) => i).sort((a, b) => value(rows[b]) / rows[b].seconds - value(rows[a]) / rows[a].seconds);
    for (const i of order) {
        if (value(rows[i]) <= 0) continue;
        const n = Math.min(rows[i].count, Math.floor(time / rows[i].seconds));
        attempts[i] = n;
        time -= n * rows[i].seconds;
    }
    return rows.map((r, i) => ({ attempts: attempts[i], marks: attempts[i] * value(r) }));
}

const fmt = (n: number) => parseFloat(n.toFixed(1));

export default function SectionPlanner() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [rows, setRows] = useState(START);
    const set = (i: number, key: 'seconds' | 'accuracy', delta: number) =>
        setRows((rs) =>
            rs.map((r, k) => (k !== i ? r : { ...r, [key]: key === 'seconds' ? Math.min(120, Math.max(10, r.seconds + delta)) : Math.min(100, Math.max(30, r.accuracy + delta)) })),
        );

    const now = sectional(rows);
    const before = oneClock(rows);
    const sum = (xs: { marks: number }[]) => xs.reduce((s, x) => s + x.marks, 0);
    const lost = sum(before) - sum(now);
    // The section that overruns its 20 minutes by the most.
    const worst = now.reduce((b, _, i) => (rows[i].seconds * rows[i].count - SECTION > rows[b].seconds * rows[b].count - SECTION ? i : b), 0);
    const short = Math.max(0, rows[worst].count - now[worst].attempts);
    const fixSeconds = Math.floor(SECTION / rows[worst].count);

    const tip =
        lost > 0.5 ? (
            <span key="a">
                The sectional clock costs this candidate about {fmt(lost)} marks. {rows[worst].name} needs {Math.ceil((rows[worst].seconds * rows[worst].count) / 60)} minutes for its {rows[worst].count}{' '}
                questions and gets 20.
            </span>
        ) : (
            <span key="b">This candidate fits every section into 20 minutes, so the sectional clock costs nothing. Try making a section slower.</span>
        );

    const stepper = (i: number, key: 'seconds' | 'accuracy', step: number, label: string) => (
        <div className="bk-stepper" role="group" aria-label={`${rows[i].name}: ${label}`}>
            <button type="button" onClick={() => set(i, key, -step)} aria-label={`Less ${label}`}>
                <Minus />
            </button>
            <i aria-hidden="true" />
            <button type="button" onClick={() => set(i, key, step)} aria-label={`More ${label}`}>
                <Plus />
            </button>
        </div>
    );

    return (
        <DemoFrame id="section-planner" title="What a 20-minute section does to one candidate" tip={tip} onRestart={() => setRows(START)} wide="md">
            <div ref={bodyRef} className={`bk-sp${wide ? ' is-wide' : ''}`}>
                <ul className="bk-sp-list">
                    {rows.map((r, i) => (
                        <li key={r.name} data-short={now[i].attempts < r.count || undefined}>
                            <p className="bk-sp-name">
                                <b>{r.name}</b>
                                <small>
                                    {now[i].attempts} of {r.count} in 20 min · {fmt(now[i].marks)} marks
                                    {now[i].attempts === r.count && now[i].unused > 0 ? ` · ${Math.floor(now[i].unused / 60)}:${String(now[i].unused % 60).padStart(2, '0')} unused` : ''}
                                </small>
                            </p>
                            <div className="bk-sp-ctl">
                                <span className="bk-sp-val">
                                    {r.seconds}
                                    <small> s/Q</small>
                                </span>
                                {stepper(i, 'seconds', 5, 'seconds per question')}
                            </div>
                            <div className="bk-sp-ctl">
                                <span className="bk-sp-val">
                                    {r.accuracy}
                                    <small>%</small>
                                </span>
                                {stepper(i, 'accuracy', 5, 'accuracy')}
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="bk-sp-totals">
                    <div>
                        <span>One 60-minute clock</span>
                        <b>{fmt(sum(before))}</b>
                        <small>{before.reduce((s, x) => s + x.attempts, 0)} attempts, best case</small>
                    </div>
                    <div data-tone={lost > 0.5 ? 'down' : undefined}>
                        <span>20 minutes per section</span>
                        <b>{fmt(sum(now))}</b>
                        <small>{now.reduce((s, x) => s + x.attempts, 0)} attempts</small>
                    </div>
                    <p className="bk-sp-fix">
                        {short > 0
                            ? `The fix is speed, not more time: ${rows[worst].name} at ${fixSeconds} s a question fits all ${rows[worst].count}.`
                            : 'Every section fits in 20 minutes. Accuracy is now the lever.'}
                    </p>
                </div>
            </div>
        </DemoFrame>
    );
}
