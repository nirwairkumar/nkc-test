/**
 * Widgets for /jee-mock-test-platform (see GuideWidget in src/guides/types.ts):
 *   notation-table    what you want → what you tap in the Sy Pad → code written → what students see
 *   ai-before-after   a PDF question, a typical copy-paste, TestoZa's AI import and the code behind it
 *   sypad-playground  a working Sy Pad (SyPadPlayground.tsx)
 *   partial-marks     JEE Advanced multi-correct marking vs TestoZa's proportional credit
 *   batch-report      the teacher's analysis after a mock: rank list and option split per question
 * Illustrations use example data and say so. Everything is readable without motion.
 */
import { useEffect, useRef, useState } from 'react';
import type { GuideWidget as GuideWidgetName } from '@/guides/types';
import SyPadPlayground from './SyPadPlayground';
import { MathText, Tex } from './jeeTex';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Whether the element is on screen (always true with reduced motion or no observer). */
function useOnScreen<T extends HTMLElement>(threshold = 0.3) {
    const ref = useRef<T>(null);
    const [on, setOn] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            setOn(true);
            return;
        }
        const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold });
        io.observe(el);
        return () => io.disconnect();
    }, [threshold]);
    return { ref, on };
}

/* ── Notation table ────────────────────────────────────────────────────── */

/** "tab:…" is a Sy Pad tab, "key:…" a key, anything else plain words. */
interface NotationRow {
    want: string;
    subject: 'Maths' | 'Physics' | 'Chemistry';
    how: string[];
    code: string;
    fallback: string;
}

/** The code is exactly what the Sy Pad writes for these key presses. */
const NOTATION: NotationRow[] = [
    {
        want: 'A definite integral',
        subject: 'Maths',
        how: ['tab:Calculus', 'key:∫ₐᵇ', 'fill 0 and', 'key:▫/▫', 'π over 2, then', 'key:sin', 'key:□ⁿ', '2, x dx'],
        code: String.raw`\int\limits_{0}^{\frac{\pi }{2}}{\sin ^{2}x\,dx}`,
        fallback: '∫₀^(π/2) sin²x dx',
    },
    {
        want: 'A limit',
        subject: 'Maths',
        how: ['tab:Calculus', 'key:lim', 'x → 0, then', 'key:▫/▫', 'key:sin', 'x over x'],
        code: String.raw`\lim_{x \to 0}\frac{\sin x}{x}`,
        fallback: 'lim(x→0) sin x / x',
    },
    {
        want: 'A 3 × 3 determinant',
        subject: 'Maths',
        how: ['tab:Tables', 'key:Det', 'set 3 × 3, fill the cells'],
        code: String.raw`\begin{vmatrix} 1 & x & x^{2} \\ 1 & y & y^{2} \\ 1 & z & z^{2} \end{vmatrix}`,
        fallback: '| 1 x x² ; 1 y y² ; 1 z z² |',
    },
    {
        want: 'Coulomb’s law',
        subject: 'Physics',
        how: ['F =', 'key:▫/▫', '1 over 4', 'key:π', 'tab:Physics', 'key:ε₀', 'key:▫/▫', 'q', 'key:□ₙ', '1 …'],
        code: String.raw`F=\frac{1}{4\pi \varepsilon_0 }\frac{q_{1}q_{2}}{r^{2}}`,
        fallback: 'F = (1/4πε₀) q₁q₂/r²',
    },
    {
        want: 'A redox half-reaction',
        subject: 'Chemistry',
        how: ['tab:Chemistry', 'key:Formula', 'type MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O'],
        code: String.raw`\ce{MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O}`,
        fallback: 'MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O',
    },
    {
        want: 'An equilibrium',
        subject: 'Chemistry',
        how: ['key:Formula', 'type N2 + 3H2 <=> 2NH3'],
        code: String.raw`\ce{N2 + 3H2 <=> 2NH3}`,
        fallback: 'N₂ + 3H₂ ⇌ 2NH₃',
    },
    {
        want: 'A complex ion',
        subject: 'Chemistry',
        how: ['key:Formula', 'type [Fe(CN)6]^4-'],
        code: String.raw`\ce{[Fe(CN)6]^4-}`,
        fallback: '[Fe(CN)₆]⁴⁻',
    },
    {
        want: 'Heat over the arrow',
        subject: 'Chemistry',
        how: ['key:Formula', 'CaCO3, then', 'key:→ with boxes', 'key:Δ', 'key:Formula', 'CaO + CO2'],
        code: String.raw`\ce{CaCO3}\xrightarrow{\Delta }\ce{CaO + CO2}`,
        fallback: 'CaCO₃ →(Δ) CaO + CO₂',
    },
];

/** Colours the commands in a line of code, so it reads as code rather than noise. */
function CodeLine({ code }: { code: string }) {
    const parts = code.split(/(\\[a-zA-Z]+|[{}^_])/g).filter(Boolean);
    return (
        <code className="jn-code">
            {parts.map((p, i) => (
                <span key={i} className={p.startsWith('\\') ? 'jn-cmd' : /^[{}^_]$/.test(p) ? 'jn-punct' : undefined}>
                    {p}
                </span>
            ))}
        </code>
    );
}

function NotationTable() {
    const [showCode, setShowCode] = useState(true);
    return (
        <figure className="gd-widget">
            <div className="jn">
                <div className="jn-head">
                    <span className="jn-head-title">Eight things JEE papers need</span>
                    <label className="jn-switch">
                        <span>Show the code written for you</span>
                        <input type="checkbox" role="switch" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} />
                        <i aria-hidden="true" />
                    </label>
                </div>
                <ol className="jn-rows">
                    {NOTATION.map((row) => (
                        <li key={row.want} className="jn-row">
                            <div className="jn-want">
                                <span className={`jn-subject jn-subject--${row.subject.toLowerCase()}`}>{row.subject}</span>
                                <strong>{row.want}</strong>
                            </div>
                            <div className="jn-how" aria-label="What you do in the Sy Pad">
                                {row.how.map((h, i) =>
                                    h.startsWith('tab:') ? (
                                        <span key={i} className="jn-tab">
                                            {h.slice(4)}
                                        </span>
                                    ) : h.startsWith('key:') ? (
                                        <kbd key={i} className="jn-key">
                                            {h.slice(4)}
                                        </kbd>
                                    ) : (
                                        <span key={i} className="jn-words">
                                            {h}
                                        </span>
                                    ),
                                )}
                            </div>
                            <div className="jn-see" aria-label="What students see">
                                <Tex tex={row.code} fallback={row.fallback} display />
                            </div>
                            {showCode && (
                                <div className="jn-codewrap">
                                    <span className="jn-code-label">Written for you</span>
                                    <CodeLine code={row.code} />
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
            <figcaption>Left: what you want. Middle: what you tap in the Sy Pad. Right: what students see. The grey line is the code you never type.</figcaption>
        </figure>
    );
}

/* ── AI: before and after ──────────────────────────────────────────────── */

const AI_VIEWS = [
    { id: 'pdf', label: 'PDF page' },
    { id: 'paste', label: 'Copy-paste' },
    { id: 'ai', label: 'TestoZa AI' },
    { id: 'code', label: 'The code' },
] as const;

type AiView = (typeof AI_VIEWS)[number]['id'];

const AI_QUESTION = String.raw`The number of moles of $\ce{KMnO4}$ that will be needed to react completely with one mole of ferrous oxalate ($\ce{FeC2O4}$) in acidic solution is`;
const AI_OPTIONS = [String.raw`$\frac{3}{5}$`, String.raw`$\frac{2}{5}$`, String.raw`$\frac{4}{5}$`, '$1$'];

function PaperFrac({ n, d }: { n: string; d: string }) {
    return (
        <span className="ja-frac">
            <span>{n}</span>
            <span>{d}</span>
        </span>
    );
}

function AiBeforeAfter() {
    const { ref, on } = useOnScreen<HTMLElement>(0.35);
    const [view, setView] = useState<AiView>('pdf');
    const [touched, setTouched] = useState(false);

    // Step through the four views once in view, until the reader picks one.
    useEffect(() => {
        if (!on || touched || prefersReducedMotion()) return;
        const id = window.setInterval(() => {
            setView((v) => AI_VIEWS[(AI_VIEWS.findIndex((x) => x.id === v) + 1) % AI_VIEWS.length].id);
        }, 3400);
        return () => window.clearInterval(id);
    }, [on, touched]);

    return (
        <figure className="gd-widget" ref={ref}>
            <div className="ja">
                <div className="ja-seg" role="tablist" aria-label="Compare">
                    {AI_VIEWS.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            role="tab"
                            aria-selected={view === v.id}
                            className={view === v.id ? 'is-on' : undefined}
                            onClick={() => {
                                setTouched(true);
                                setView(v.id);
                            }}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                <div className="ja-stage">
                    {view === 'pdf' && (
                        <div className="ja-view ja-paper" key="pdf">
                            <p className="ja-file">Chemistry DPP 07.pdf · page 3</p>
                            <p className="ja-paper-q">
                                <b>12.</b> The number of moles of KMnO<sub>4</sub> that will be needed to react completely with one mole of ferrous oxalate (FeC
                                <sub>2</sub>O<sub>4</sub>) in acidic solution is
                            </p>
                            <p className="ja-paper-opts">
                                <span>
                                    (a) <PaperFrac n="3" d="5" />
                                </span>
                                <span>
                                    (b) <PaperFrac n="2" d="5" />
                                </span>
                                <span>
                                    (c) <PaperFrac n="4" d="5" />
                                </span>
                                <span>(d) 1</span>
                            </p>
                        </div>
                    )}
                    {view === 'paste' && (
                        <div className="ja-view ja-paste" key="paste">
                            <p className="ja-file">Pasted into a typical online form</p>
                            <pre>
                                {'12. The number of moles of '}
                                <mark>KMnO4</mark>
                                {' that will be needed to react completely with one mole of ferrous oxalate ('}
                                <mark>FeC2O4</mark>
                                {') in acidic solution is\n(a) '}
                                <mark>{'3\n5'}</mark>
                                {'\n(b) '}
                                <mark>{'2\n5'}</mark>
                                {'\n(c) '}
                                <mark>{'4\n5'}</mark>
                                {'\n(d) 1'}
                            </pre>
                            <p className="ja-verdict ja-verdict--bad">Subscripts lost, fractions split across lines. Someone now retypes it.</p>
                        </div>
                    )}
                    {view === 'ai' && (
                        <div className="ja-view ja-card" key="ai">
                            <div className="ja-card-head">
                                <span className="ja-card-q">Question 12</span>
                                <span className="ja-badge">Extracted</span>
                                <span className="ja-marks">
                                    <b>+4</b> <em>−1</em>
                                </span>
                            </div>
                            <p className="ja-card-text">
                                <MathText text={AI_QUESTION} />
                            </p>
                            <ul className="ja-card-opts">
                                {AI_OPTIONS.map((o, i) => (
                                    <li key={o}>
                                        <span>{'ABCD'[i]}</span>
                                        <MathText text={o} />
                                    </li>
                                ))}
                            </ul>
                            <p className="ja-verdict ja-verdict--good">Typeset, editable, ready for the exam screen.</p>
                        </div>
                    )}
                    {view === 'code' && (
                        <div className="ja-view ja-codeview" key="code">
                            <p className="ja-file">What the AI wrote into the question (you never type this)</p>
                            <pre>
                                <CodeLine code={AI_QUESTION} />
                                {'\n'}
                                {AI_OPTIONS.map((o, i) => (
                                    <span key={o}>
                                        {'\n'}
                                        {'ABCD'[i]}. <CodeLine code={o} />
                                    </span>
                                ))}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
            <figcaption>A classic JEE chemistry question (answer: 3/5). The copy-paste is a typical result; PDFs vary.</figcaption>
        </figure>
    );
}

/* ── JEE Advanced partial marks ────────────────────────────────────────── */

const LETTERS = ['A', 'B', 'C', 'D'] as const;

/** JEE Advanced one-or-more-correct: +4 all, +1 per correct option picked otherwise, −2 for any wrong one. */
function jeeAdvanced(key: Set<string>, picked: Set<string>) {
    if (picked.size === 0) return { score: 0, rule: 'Nothing picked: 0.' };
    if ([...picked].some((p) => !key.has(p))) return { score: -2, rule: 'A wrong option was picked: −2.' };
    if (picked.size === key.size) return { score: 4, rule: 'Every correct option picked: +4.' };
    return { score: picked.size, rule: `${picked.size} of ${key.size} correct options picked, none wrong: +${picked.size}.` };
}

/** TestoZa (backend/app/services/scoring.py): marks × picked ÷ correct, any wrong option costs the negative mark. */
function testoza(key: Set<string>, picked: Set<string>) {
    if (picked.size === 0) return { score: 0, rule: 'Nothing picked: 0.' };
    if ([...picked].some((p) => !key.has(p))) return { score: -2, rule: 'A wrong option costs the negative mark: −2.' };
    if (picked.size === key.size) return { score: 4, rule: 'All correct options: full marks, +4.' };
    const score = (4 * picked.size) / key.size;
    return { score, rule: `4 × ${picked.size} ÷ ${key.size} = ${fmt(score)}.` };
}

const fmt = (v: number) => {
    const r = Math.round(v * 100) / 100;
    return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}`;
};

const PRESETS: { label: string; key: string; picked: string }[] = [
    { label: 'Stopped at 2 of 3', key: 'ABD', picked: 'AB' },
    { label: 'Stopped at 1 of 2', key: 'AC', picked: 'C' },
    { label: '3 of 4', key: 'ABCD', picked: 'ABD' },
    { label: 'All correct', key: 'ABD', picked: 'ABD' },
    { label: 'One wrong pick', key: 'ABD', picked: 'ABC' },
];

function PartialMarks() {
    const [key, setKey] = useState(() => new Set(PRESETS[0].key));
    const [picked, setPicked] = useState(() => new Set(PRESETS[0].picked));

    const toggle = (set: Set<string>, letter: string, update: (s: Set<string>) => void, keepOne: boolean) => {
        const next = new Set(set);
        if (next.has(letter)) {
            if (keepOne && next.size === 1) return; // a question needs at least one correct option
            next.delete(letter);
        } else next.add(letter);
        update(next);
    };

    const adv = jeeAdvanced(key, picked);
    const tz = testoza(key, picked);
    const diff = Math.round((tz.score - adv.score) * 100) / 100;
    const presetOn = (p: (typeof PRESETS)[number]) =>
        p.key.length === key.size && [...p.key].every((l) => key.has(l)) && p.picked.length === picked.size && [...p.picked].every((l) => picked.has(l));

    return (
        <figure className="gd-widget">
            <div className="jp">
                <div className="jp-presets">
                    {PRESETS.map((p) => (
                        <button
                            key={p.label}
                            type="button"
                            className={presetOn(p) ? 'is-on' : undefined}
                            aria-pressed={presetOn(p)}
                            onClick={() => {
                                setKey(new Set(p.key));
                                setPicked(new Set(p.picked));
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="jp-rows">
                    <div className="jp-row">
                        <span className="jp-row-label">Correct options</span>
                        <div className="jp-bubbles">
                            {LETTERS.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    className={`jp-bubble jp-bubble--key${key.has(l) ? ' is-on' : ''}`}
                                    aria-pressed={key.has(l)}
                                    aria-label={`Option ${l} is ${key.has(l) ? '' : 'not '}correct`}
                                    onClick={() => toggle(key, l, setKey, true)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="jp-row">
                        <span className="jp-row-label">Student picked</span>
                        <div className="jp-bubbles">
                            {LETTERS.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    className={`jp-bubble jp-bubble--pick${picked.has(l) ? ' is-on' : ''}${picked.has(l) && !key.has(l) ? ' is-wrong' : ''}`}
                                    aria-pressed={picked.has(l)}
                                    aria-label={`Student ${picked.has(l) ? 'picked' : 'did not pick'} option ${l}`}
                                    onClick={() => toggle(picked, l, setPicked, false)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="jp-out" aria-live="polite">
                    <div className="jp-score">
                        <span className="jp-score-who">JEE Advanced</span>
                        <b className={adv.score < 0 ? 'is-neg' : undefined}>{fmt(adv.score)}</b>
                        <span className="jp-score-rule">{adv.rule}</span>
                    </div>
                    <div className="jp-score jp-score--us">
                        <span className="jp-score-who">TestoZa</span>
                        <b className={tz.score < 0 ? 'is-neg' : undefined}>{fmt(tz.score)}</b>
                        <span className="jp-score-rule">{tz.rule}</span>
                    </div>
                </div>
                <p className={`jp-verdict${diff === 0 ? ' is-same' : ''}`}>
                    {diff === 0 ? 'Same score.' : `TestoZa gives ${fmt(diff).replace('+', '')} more on this question.`}
                </p>
            </div>
            <figcaption>A +4 question with −2 for a wrong option. Tap the circles to change the answer key and the student’s picks.</figcaption>
        </figure>
    );
}

/* ── Batch report ──────────────────────────────────────────────────────── */

/** Example batch: every score is correct × 4 − wrong, with correct + wrong ≤ 75. */
const RANKS = [
    { roll: '031', correct: 64, wrong: 4 },
    { roll: '014', correct: 61, wrong: 7 },
    { roll: '047', correct: 59, wrong: 6 },
    { roll: '009', correct: 57, wrong: 11 },
    { roll: '052', correct: 55, wrong: 14 },
];

const HARD = [
    {
        q: 38,
        subject: 'Chemistry',
        topic: 'KMnO₄ and ferrous oxalate',
        time: '2m 40s',
        correctOpt: 'A',
        split: { A: 22, B: 58, C: 12, D: 8 },
        insight: '58% picked B (2/5): they counted the oxalate’s electrons and forgot the iron.',
    },
    {
        q: 61,
        subject: 'Mathematics',
        topic: '∫ sin x ÷ (sin x + cos x)',
        time: '3m 05s',
        correctOpt: 'A',
        split: { A: 31, B: 44, C: 15, D: 10 },
        insight: '44% picked B (π/2): they added the two forms of the integral and forgot to halve.',
    },
    {
        q: 9,
        subject: 'Physics',
        topic: 'Rolling on an incline',
        time: '2m 10s',
        correctOpt: 'B',
        split: { A: 18, B: 35, C: 39, D: 8 },
        insight: '39% picked C: they took the moment of inertia about the centre instead of the contact point.',
    },
] as const;

const SUBJECTS = [
    { name: 'Physics', avg: 58 },
    { name: 'Chemistry', avg: 66 },
    { name: 'Mathematics', avg: 49 },
];

function BatchReport() {
    const { ref, on } = useOnScreen<HTMLElement>(0.3);
    const [pick, setPick] = useState(0);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (!on || touched || prefersReducedMotion()) return;
        const id = window.setInterval(() => setPick((p) => (p + 1) % HARD.length), 4200);
        return () => window.clearInterval(id);
    }, [on, touched]);

    const q = HARD[pick];

    return (
        <figure className="gd-widget" ref={ref}>
            <div className={`jb${on ? ' is-on' : ''}`}>
                <div className="jb-head">
                    <div>
                        <p className="jb-kicker">Results · Batch A</p>
                        <p className="jb-title">Sunday full mock 07</p>
                    </div>
                    <span className="jb-count">
                        <i aria-hidden="true" /> 61 of 64 submitted
                    </span>
                </div>

                <div className="jb-grid">
                    <section className="jb-panel" aria-label="Rank list">
                        <p className="jb-panel-title">Rank list</p>
                        <ol className="jb-ranks">
                            {RANKS.map((r, i) => (
                                <li key={r.roll}>
                                    <span className="jb-rank">{i + 1}</span>
                                    <span className="jb-roll">Roll {r.roll}</span>
                                    <span className="jb-score">
                                        {r.correct * 4 - r.wrong}
                                        <small>/300</small>
                                    </span>
                                    <span className="jb-pm">
                                        <b>+{r.correct * 4}</b> <em>−{r.wrong}</em>
                                    </span>
                                </li>
                            ))}
                        </ol>
                        <div className="jb-subjects">
                            {SUBJECTS.map((s) => (
                                <div key={s.name} className="jb-subject">
                                    <span>{s.name}</span>
                                    <span className="jb-bar" aria-hidden="true">
                                        <i style={{ width: `${s.avg}%` }} />
                                    </span>
                                    <b>
                                        {s.avg}
                                        <small>/100</small>
                                    </b>
                                </div>
                            ))}
                            <p className="jb-subjects-note">Batch average by subject</p>
                        </div>
                    </section>

                    <section className="jb-panel" aria-label="Hardest questions">
                        <p className="jb-panel-title">Hardest questions</p>
                        <div className="jb-qtabs" role="tablist" aria-label="Question">
                            {HARD.map((h, i) => (
                                <button
                                    key={h.q}
                                    type="button"
                                    role="tab"
                                    aria-selected={pick === i}
                                    className={pick === i ? 'is-on' : undefined}
                                    onClick={() => {
                                        setTouched(true);
                                        setPick(i);
                                    }}
                                >
                                    Q{h.q}
                                    <small>{h.split[h.correctOpt]}% right</small>
                                </button>
                            ))}
                        </div>
                        <div className="jb-q" key={q.q}>
                            <p className="jb-q-meta">
                                {q.subject} · {q.topic} · avg {q.time}
                            </p>
                            <ul className="jb-split">
                                {(['A', 'B', 'C', 'D'] as const).map((o) => {
                                    const pct = q.split[o];
                                    const top = Math.max(...Object.values(q.split));
                                    const correct = o === q.correctOpt;
                                    return (
                                        <li key={o} className={`${correct ? 'is-correct' : ''}${!correct && pct === top ? ' is-trap' : ''}`}>
                                            <span className="jb-opt">{o}</span>
                                            <span className="jb-split-bar" aria-hidden="true">
                                                <i style={{ width: `${pct}%` }} />
                                            </span>
                                            <b>{pct}%</b>
                                        </li>
                                    );
                                })}
                            </ul>
                            <p className="jb-insight">{q.insight}</p>
                        </div>
                    </section>
                </div>
            </div>
            <figcaption>Illustration with example data. The real analysis also lists every student’s time taken and each question’s average time.</figcaption>
        </figure>
    );
}

export default function JeeWidget({ name }: { name: GuideWidgetName }) {
    if (name === 'notation-table') return <NotationTable />;
    if (name === 'ai-before-after') return <AiBeforeAfter />;
    if (name === 'sypad-playground') return <SyPadPlayground />;
    if (name === 'partial-marks') return <PartialMarks />;
    if (name === 'batch-report') return <BatchReport />;
    return null;
}
