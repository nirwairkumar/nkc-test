/**
 * bank-marking: what a question is worth in each bank section, and whether a guess pays.
 * Bank papers print five options and take off a quarter of the question's marks for a wrong
 * answer, which makes a blind guess worth exactly zero in every section — the same bet at a
 * different stake. Pick a section's marking and how many of the five options the candidate
 * can rule out; the lab gives the chance of being right, the average marks one guess is
 * worth, and, for ten such guesses, the spread of net marks (binomial) with the chance of
 * ending below zero. Plain arithmetic, the same for any test software.
 *
 * Size: chart beside the readout from 760 px; stacked and scrolling inside --bk-fit-h on phones.
 */
import { useRef, useState } from 'react';
import { MARKINGS, OPTION_KEYS, guessValue } from '@/guides/bankData';
import { DemoFrame, useWidth } from './replica';

const N = 10;
const OPTIONS = OPTION_KEYS.length;

const choose = (n: number, k: number) => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
};

const signed = (x: number, digits = 2) => {
    const r = parseFloat(x.toFixed(digits));
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

const RULED_OUT = ['None', 'One', 'Two', 'Three'];

export default function MarkingLab() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [mid, setMid] = useState(MARKINGS[0].id);
    const [out, setOut] = useState(0);
    const [hover, setHover] = useState<number | null>(null);
    const m = MARKINGS.find((x) => x.id === mid) ?? MARKINGS[0];
    const left = OPTIONS - out;
    const p = 1 / left;
    const ev = guessValue(m, left);
    /** The edge as a share of the question's marks: 0, 1/16, 1/6, 3/8. */
    const ratio = ev / m.right;

    // Ten guesses: k right, 10 − k wrong.
    const rows = Array.from({ length: N + 1 }, (_, k) => ({ k, net: k * m.right - (N - k) * m.wrong, prob: choose(N, k) * p ** k * (1 - p) ** (N - k) }));
    const below = rows.filter((r) => r.net < -1e-9).reduce((s, r) => s + r.prob, 0);
    const maxProb = Math.max(...rows.map((r) => r.prob));

    const verdict =
        ratio >= 1 / 6 - 1e-9
            ? { tone: 'go', text: 'Worth guessing', why: `Each guess adds ${signed(ev, 3)} marks on average — a sixth of the question or better.` }
            : ratio > 1e-9
              ? { tone: 'edge', text: 'A thin edge', why: `Each guess adds ${signed(ev, 3)} marks on average: a sixteenth of the question. Rule out one more option.` }
              : { tone: 'even', text: 'A coin toss', why: 'Right and wrong cancel out exactly: one in five earns the marks, four cost a quarter each.' };

    const W = 320;
    const H = 150;
    const bw = W / rows.length;
    const shown = hover ?? rows.reduce((b, r) => (r.prob > rows[b].prob ? r.k : b), 0);

    return (
        <DemoFrame
            id="marking-lab"
            title="Five options, −¼ a wrong answer: does a guess pay?"
            tip={
                <span key={`${mid}-${out}`}>
                    {verdict.text}: {verdict.why}
                </span>
            }
            wide="md"
        >
            <div ref={bodyRef} className={`bk-gl${wide ? ' is-wide' : ''}`}>
                <div className="bk-gl-controls">
                    <p className="bk-mini-label">What the question is worth</p>
                    <div className="bk-chips" role="group" aria-label="Marking scheme">
                        {MARKINGS.map((x) => (
                            <button key={x.id} type="button" aria-pressed={x.id === mid} onClick={() => setMid(x.id)} title={x.exams}>
                                {x.label}
                            </button>
                        ))}
                    </div>
                    <p className="bk-gl-exams">{m.exams}</p>
                    <p className="bk-mini-label">Options ruled out, of five (none = a blind guess)</p>
                    <div className="bk-seg bk-seg--full" style={{ ['--n' as string]: RULED_OUT.length, ['--i' as string]: out }} role="group" aria-label="Options ruled out">
                        {RULED_OUT.map((label, n) => (
                            <button key={label} type="button" aria-pressed={n === out} onClick={() => setOut(n)}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <dl className="bk-gl-facts">
                        <div>
                            <dt>Chance it’s right</dt>
                            <dd>{Math.round(p * 100)}%</dd>
                        </div>
                        <div>
                            <dt>Average per guess</dt>
                            <dd data-tone={verdict.tone}>{signed(ev, 3)}</dd>
                        </div>
                        <div>
                            <dt>10 guesses below zero</dt>
                            <dd>{Math.round(below * 100)}%</dd>
                        </div>
                    </dl>
                    <p className="bk-gl-verdict" data-tone={verdict.tone}>
                        <b>{verdict.text}.</b> {verdict.why}
                    </p>
                </div>
                <figure className="bk-gl-chart">
                    <figcaption>Net marks from 10 guesses like this one</figcaption>
                    <svg
                        viewBox={`0 0 ${W} ${H + 34}`}
                        role="img"
                        aria-label={`Bar chart: chance of each net score from ten guesses. Most likely ${signed(rows[shown].net)} marks; ${Math.round(below * 100)}% chance of ending below zero.`}
                    >
                        <line x1="0" x2={W} y1={H} y2={H} className="bk-gl-base" />
                        {rows.map((r, i) => {
                            const h = Math.max(1.5, (r.prob / maxProb) * (H - 22));
                            return (
                                <g key={r.k} onPointerEnter={() => setHover(r.k)} onPointerLeave={() => setHover(null)}>
                                    <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
                                    <rect
                                        x={i * bw + 2}
                                        y={H - h}
                                        width={bw - 4}
                                        height={h}
                                        rx="4"
                                        className={r.net < -1e-9 ? 'is-neg' : r.net > 1e-9 ? 'is-pos' : 'is-zero'}
                                        opacity={hover === null || hover === r.k ? 1 : 0.45}
                                    />
                                    {(i % 2 === 0 || i === shown) && (
                                        <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" className="bk-gl-tick">
                                            {r.k}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        <text x={W / 2} y={H + 30} textAnchor="middle" className="bk-gl-axis">
                            right out of 10
                        </text>
                    </svg>
                    <p className="bk-gl-read" aria-live="polite">
                        <b>
                            {rows[shown].k} right, {N - rows[shown].k} wrong
                        </b>{' '}
                        → {signed(rows[shown].net)} marks · {(rows[shown].prob * 100).toFixed(1)}% likely
                    </p>
                </figure>
            </div>
        </DemoFrame>
    );
}
