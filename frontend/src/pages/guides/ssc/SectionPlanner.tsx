/**
 * ssc-planner: what sectional timing does to one candidate. Set seconds per question and
 * accuracy for each CGL Tier 1 section; the planner compares the old pattern (one 60-minute
 * clock, so time saved in one section can go to another) with the 2026 pattern (15 minutes
 * each, unused time lost). Expected marks use +2 / −0.5 per attempt at the given accuracy.
 *
 * The old-pattern figure is a best case: time goes first to the questions that earn the most
 * marks per second, and no section can take more than its 25 questions.
 */
import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DemoFrame, useWidth } from './replica';

interface Row {
    name: string;
    seconds: number;
    accuracy: number;
}

const START: Row[] = [
    { name: 'Reasoning', seconds: 30, accuracy: 85 },
    { name: 'General Awareness', seconds: 15, accuracy: 70 },
    { name: 'Quantitative Aptitude', seconds: 60, accuracy: 85 },
    { name: 'English', seconds: 30, accuracy: 80 },
];
const PER = 25;
const SECTION = 15 * 60;
const TOTAL = 60 * 60;

const value = (r: Row) => (r.accuracy / 100) * 2 - (1 - r.accuracy / 100) * 0.5;

function sectional(rows: Row[]) {
    return rows.map((r) => {
        const attempts = Math.min(PER, Math.floor(SECTION / r.seconds));
        return { attempts, marks: attempts * value(r), unused: SECTION - attempts * r.seconds };
    });
}

function oneClock(rows: Row[]) {
    let time = TOTAL;
    const attempts = rows.map(() => 0);
    // Best case: the most marks per second first.
    const order = rows.map((r, i) => i).sort((a, b) => value(rows[b]) / rows[b].seconds - value(rows[a]) / rows[a].seconds);
    for (const i of order) {
        if (value(rows[i]) <= 0) continue;
        const n = Math.min(PER, Math.floor(time / rows[i].seconds));
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
    const worst = now.reduce((b, x, i) => (rows[i].seconds * PER - SECTION > rows[b].seconds * PER - SECTION ? i : b), 0);
    const short = Math.max(0, PER - now[worst].attempts);

    const tip =
        lost > 0.5 ? (
            <span key="a">
                Sectional timing costs this candidate about {fmt(lost)} marks. {rows[worst].name} needs {Math.ceil((rows[worst].seconds * PER) / 60)} minutes for 25 questions and now gets 15.
            </span>
        ) : (
            <span key="b">This candidate fits every section in 15 minutes, so the 2026 timer costs nothing. Try a slower section.</span>
        );

    const stepper = (i: number, key: 'seconds' | 'accuracy', step: number, label: string) => (
        <div className="sg-stepper" role="group" aria-label={`${rows[i].name}: ${label}`}>
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
        <DemoFrame id="section-planner" title="What a 15-minute section does to one candidate" tip={tip} onRestart={() => setRows(START)} wide="md">
            <div ref={bodyRef} className={`sg-sp${wide ? ' is-wide' : ''}`}>
                <ul className="sg-sp-list">
                    {rows.map((r, i) => (
                        <li key={r.name} data-short={now[i].attempts < PER || undefined}>
                            <p className="sg-sp-name">
                                <b>{r.name}</b>
                                <small>
                                    {now[i].attempts} of 25 in 15 min · {fmt(now[i].marks)} marks
                                    {now[i].attempts === PER && now[i].unused > 0 ? ` · ${Math.floor(now[i].unused / 60)}:${String(now[i].unused % 60).padStart(2, '0')} unused` : ''}
                                </small>
                            </p>
                            <div className="sg-sp-ctl">
                                <span className="sg-sp-val">
                                    {r.seconds}
                                    <small> s/Q</small>
                                </span>
                                {stepper(i, 'seconds', 5, 'seconds per question')}
                            </div>
                            <div className="sg-sp-ctl">
                                <span className="sg-sp-val">
                                    {r.accuracy}
                                    <small>%</small>
                                </span>
                                {stepper(i, 'accuracy', 5, 'accuracy')}
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="sg-sp-totals">
                    <div>
                        <span>One 60-minute clock</span>
                        <b>{fmt(sum(before))}</b>
                        <small>{before.reduce((s, x) => s + x.attempts, 0)} attempts, best case</small>
                    </div>
                    <div data-tone={lost > 0.5 ? 'down' : undefined}>
                        <span>15 minutes per section</span>
                        <b>{fmt(sum(now))}</b>
                        <small>{now.reduce((s, x) => s + x.attempts, 0)} attempts</small>
                    </div>
                    <p className="sg-sp-fix">
                        {short > 0
                            ? `The fix is speed, not more time: ${rows[worst].name} at ${Math.floor(SECTION / PER)} s a question fits all 25.`
                            : 'Every section fits in 15 minutes. Accuracy is now the lever.'}
                    </p>
                </div>
            </div>
        </DemoFrame>
    );
}
