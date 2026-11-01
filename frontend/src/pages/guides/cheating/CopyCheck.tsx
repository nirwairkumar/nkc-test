/**
 * The copying check from "After the exam": a sample batch of eight candidates who
 * answered the same twelve questions (src/guides/cheatingData.ts BATCH). Pick two and
 * their answers line up against the key: the same right answer (proves little), the same
 * wrong answer (the evidence), both wrong but different. The chance figure assumes wrong
 * answers spread evenly over the three wrong options, as the guide explains. "Pairs
 * worth a look" ranks all 28 pairs by shared wrong answers.
 *
 * TestoZa doesn't run this comparison; it is a check a teacher does by hand, which the
 * guide says plainly.
 */
import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { BATCH, BATCH_KEY, EXAM, comparePair, oneIn, type Candidate } from '@/guides/cheatingData';
import { DemoFrame, useWidth } from './replica';

const score = (c: Candidate) =>
    BATCH_KEY.reduce((s, k, i) => (c.answers[i] === '-' ? s : c.answers[i] === k ? s + EXAM.right : s - EXAM.wrong), 0);
const maxScore = BATCH_KEY.length * EXAM.right;
const avgMinutes = Math.round(BATCH.reduce((s, c) => s + c.minutes, 0) / BATCH.length);

const PAIRS = (() => {
    const out: { a: Candidate; b: Candidate; sameWrong: number; sameRight: number }[] = [];
    for (let i = 0; i < BATCH.length; i++)
        for (let j = i + 1; j < BATCH.length; j++) {
            const r = comparePair(BATCH[i], BATCH[j]);
            out.push({ a: BATCH[i], b: BATCH[j], sameWrong: r.sameWrong, sameRight: r.sameRight });
        }
    return out.sort((x, y) => y.sameWrong - x.sameWrong || y.sameRight - x.sameRight);
})();

function Picker({ label, value, other, onChange }: { label: string; value: string; other: string; onChange: (id: string) => void }) {
    return (
        <label className="pc-cc-pick">
            <span>{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                {BATCH.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.id === other}>
                        {c.name} · {c.roll}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default function CopyCheck() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [aId, setA] = useState('aisha');
    const [bId, setB] = useState('dev');
    const a = BATCH.find((c) => c.id === aId) ?? BATCH[0];
    const b = BATCH.find((c) => c.id === bId) ?? BATCH[1];
    const r = useMemo(() => comparePair(a, b), [a, b]);

    const level = r.sameWrong >= 5 ? 'high' : r.sameWrong >= 3 ? 'mid' : 'low';
    const verdict =
        level === 'high'
            ? { title: 'Worth a conversation', text: `${r.sameWrong} identical wrong answers would happen by chance about ${oneIn(r.chance).replace('1 in', 'once in')} pairs. Ask both to talk you through two of them.` }
            : level === 'mid'
              ? { title: 'Look at the questions', text: 'A few shared wrong answers can come from one popular trap option. Check whether the same wrong option is the obvious mistake.' }
              : { title: 'Nothing unusual', text: r.sameRight > 6 ? 'They agree because they are right. Shared right answers prove nothing.' : 'Too few shared wrong answers to mean anything.' };

    const cell = (i: number) => {
        const k = BATCH_KEY[i];
        const x = a.answers[i];
        const y = b.answers[i];
        if (x === '-' || y === '-') return 'skip';
        if (x === k && y === k) return 'right';
        if (x !== k && y !== k) return x === y ? 'same-wrong' : 'diff-wrong';
        return 'split';
    };

    const restart = () => {
        setA('aisha');
        setB('dev');
    };

    const pairs = (
        <div className="pc-cc-pairs">
            <p className="pc-mini-label">Pairs worth a look</p>
            <ul>
                {PAIRS.slice(0, wide ? 5 : 3).map((p) => {
                    const on = (p.a.id === aId && p.b.id === bId) || (p.a.id === bId && p.b.id === aId);
                    return (
                        <li key={`${p.a.id}-${p.b.id}`}>
                            <button
                                type="button"
                                aria-pressed={on}
                                onClick={() => {
                                    setA(p.a.id);
                                    setB(p.b.id);
                                }}
                            >
                                <span>
                                    {p.a.name.split(' ')[0]} &amp; {p.b.name.split(' ')[0]}
                                </span>
                                <b data-hot={p.sameWrong >= 5 || undefined}>{p.sameWrong} same wrong</b>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    return (
        <DemoFrame
            title="Check two answer sheets for copying"
            tip={
                <span key={`${aId}-${bId}`}>
                    {level === 'high' ? 'Same wrong options, again and again: this is the pattern that matters.' : 'Pick two candidates, or a pair from the list.'}
                </span>
            }
            onRestart={restart}
            wide="md"
            caption="A made-up batch of eight candidates and twelve questions. TestoZa doesn’t compare answer sheets for you; this is the check to do by hand."
        >
            <div ref={bodyRef} className={`pc-cc${wide ? ' is-wide' : ''}`}>
                {wide && pairs}
                <div className="pc-cc-main">
                    <div className="pc-cc-pickers">
                        <Picker label="Candidate" value={aId} other={bId} onChange={setA} />
                        <Picker label="Compare with" value={bId} other={aId} onChange={setB} />
                    </div>
                    <div className="pc-cc-grid-wrap">
                        <table className="pc-cc-grid">
                            <caption className="pc-sr">Answers to twelve questions</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Q</th>
                                    {BATCH_KEY.map((_, i) => (
                                        <th key={i} scope="col">
                                            {i + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="is-key">
                                    <th scope="row">Key</th>
                                    {BATCH_KEY.map((k, i) => (
                                        <td key={i}>{k}</td>
                                    ))}
                                </tr>
                                {[a, b].map((c) => (
                                    <tr key={c.id}>
                                        <th scope="row">{c.name.split(' ')[0]}</th>
                                        {BATCH_KEY.map((_, i) => (
                                            <td key={i} data-c={cell(i)} data-own={c.answers[i] === '-' ? 'skip' : c.answers[i] === BATCH_KEY[i] ? 'right' : 'wrong'}>
                                                {c.answers[i] === '-' ? '–' : c.answers[i]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="pc-cc-legend" aria-hidden="true">
                        <span data-c="right">Same right</span>
                        <span data-c="same-wrong">Same wrong</span>
                        <span data-c="diff-wrong">Both wrong, different</span>
                    </div>
                    <dl className="pc-cc-stats">
                        <div>
                            <dt>Same right answers</dt>
                            <dd>{r.sameRight}</dd>
                        </div>
                        <div data-hot={r.sameWrong >= 5 || undefined}>
                            <dt>Same wrong answers</dt>
                            <dd>{r.sameWrong}</dd>
                        </div>
                        <div>
                            <dt>By chance</dt>
                            <dd>{r.sameWrong === 0 ? '—' : oneIn(r.chance)}</dd>
                        </div>
                    </dl>
                    <div className="pc-cc-people">
                        {[a, b].map((c) => (
                            <p key={c.id}>
                                <b>{c.name}</b>
                                <span>
                                    {score(c)}/{maxScore}
                                </span>
                                <span data-fast={c.minutes < avgMinutes * 0.7 || undefined}>
                                    <Clock aria-hidden="true" /> {c.minutes} min
                                </span>
                                {c.warnings > 0 && (
                                    <span data-warn>
                                        <AlertTriangle aria-hidden="true" /> {c.warnings}
                                    </span>
                                )}
                            </p>
                        ))}
                        <p className="pc-cc-avg">Batch average: {avgMinutes} min</p>
                    </div>
                    <div className="pc-cc-verdict" data-level={level} key={`${aId}-${bId}`}>
                        <b>{verdict.title}</b>
                        <span>{verdict.text}</span>
                    </div>
                    {!wide && pairs}
                </div>
            </div>
        </DemoFrame>
    );
}
