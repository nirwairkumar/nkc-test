/**
 * ssc-guess: should a candidate guess? Pick a marking scheme and how many options they can
 * rule out; the lab gives the chance of being right, the average marks a guess is worth,
 * and, for ten such guesses, the spread of net marks (binomial) with the chance of ending
 * below zero. Plain arithmetic, the same for any test software.
 *
 * Size: chart beside the readout from 760 px; stacked and scrolling inside --sg-fit-h on phones.
 */
import { useRef, useState } from 'react';
import { MARKINGS, guessValue } from '@/guides/sscData';
import { DemoFrame, useWidth } from './replica';

const N = 10;

const choose = (n: number, k: number) => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
};

const signed = (x: number, digits = 2) => {
    const r = parseFloat(x.toFixed(digits));
    return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
};

export default function GuessLab() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [mid, setMid] = useState(MARKINGS[0].id);
    const [out, setOut] = useState(0);
    const [hover, setHover] = useState<number | null>(null);
    const m = MARKINGS.find((x) => x.id === mid) ?? MARKINGS[0];
    const left = 4 - out;
    const p = 1 / left;
    const ev = guessValue(m, left);

    // Ten guesses: k right, 10 − k wrong.
    const rows = Array.from({ length: N + 1 }, (_, k) => ({ k, net: k * m.right - (N - k) * m.wrong, prob: choose(N, k) * p ** k * (1 - p) ** (N - k) }));
    const below = rows.filter((r) => r.net < -1e-9).reduce((s, r) => s + r.prob, 0);
    const maxProb = Math.max(...rows.map((r) => r.prob));

    const verdict =
        ev > 0.05
            ? { tone: 'go', text: 'Worth guessing', why: `On average each guess adds ${signed(ev)} mark${Math.abs(ev - 1) < 1e-9 ? '' : 's'}.` }
            : ev > -0.05
              ? { tone: 'even', text: 'No gain on average', why: 'Right and wrong cancel out. Rule out an option first.' }
              : { tone: 'stop', text: 'Don’t guess', why: `On average each guess costs ${signed(ev)} marks.` };

    const W = 320;
    const H = 150;
    const bw = W / rows.length;
    const shown = hover ?? rows.reduce((b, r) => (r.prob > rows[b].prob ? r.k : b), 0);

    return (
        <DemoFrame id="guess-lab" title="Guess or skip? The arithmetic of negative marking" tip={<span key={`${mid}-${out}`}>{verdict.text}: {verdict.why}</span>} wide="md">
            <div ref={bodyRef} className={`sg-gl${wide ? ' is-wide' : ''}`}>
                <div className="sg-gl-controls">
                    <p className="sg-mini-label">Marking</p>
                    <div className="sg-chips" role="group" aria-label="Marking scheme">
                        {MARKINGS.map((x) => (
                            <button key={x.id} type="button" aria-pressed={x.id === mid} onClick={() => setMid(x.id)} title={x.exams}>
                                {x.label}
                            </button>
                        ))}
                    </div>
                    <p className="sg-gl-exams">{m.exams}</p>
                    <p className="sg-mini-label">Options ruled out</p>
                    <div className="sg-seg sg-seg--full" style={{ ['--n' as string]: 3, ['--i' as string]: out }} role="group" aria-label="Options ruled out">
                        {[0, 1, 2].map((n) => (
                            <button key={n} type="button" aria-pressed={n === out} onClick={() => setOut(n)}>
                                {n === 0 ? 'None (blind)' : n === 1 ? 'One' : 'Two'}
                            </button>
                        ))}
                    </div>
                    <dl className="sg-gl-facts">
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
                    <p className="sg-gl-verdict" data-tone={verdict.tone}>
                        <b>{verdict.text}.</b> {verdict.why}
                    </p>
                </div>
                <figure className="sg-gl-chart">
                    <figcaption>Net marks from 10 guesses like this one</figcaption>
                    <svg viewBox={`0 0 ${W} ${H + 34}`} role="img" aria-label={`Bar chart: chance of each net score from ten guesses. Most likely ${signed(rows[shown].net)} marks; ${Math.round(below * 100)}% chance of ending below zero.`}>
                        <line x1="0" x2={W} y1={H} y2={H} className="sg-gl-base" />
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
                                        <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" className="sg-gl-tick">
                                            {r.k}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        <text x={W / 2} y={H + 30} textAnchor="middle" className="sg-gl-axis">
                            right out of 10
                        </text>
                    </svg>
                    <p className="sg-gl-read" aria-live="polite">
                        <b>{rows[shown].k} right, {N - rows[shown].k} wrong</b> → {signed(rows[shown].net)} marks · {(rows[shown].prob * 100).toFixed(1)}% likely
                    </p>
                </figure>
            </div>
        </DemoFrame>
    );
}
