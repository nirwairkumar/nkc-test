/**
 * Hero for /jee-mock-test-platform: a laptop running TestoZa's test builder.
 * A short script loops while it is on screen:
 *   1. Question 61 (Mathematics) is empty → Fill from photo → a handwritten
 *      question is read → the card fills with the typeset integral and options,
 *      and the option circled in the photo is ticked.
 *   2. Question 33 (Chemistry) → Maths & symbols opens the Sy Pad → Chemistry →
 *      Formula → the redox half-reaction is typed as plain text and drawn live →
 *      Insert puts it into the question.
 * Labels follow the real builder (test-builder/QuestionCard.tsx) and Sy Pad
 * (math-keyboard/MathKeyboard.tsx, keys.ts). Questions are examples.
 * With reduced motion it shows the Sy Pad with the finished formula.
 */
import { useEffect, useRef, useState } from 'react';
import { FIXED_ROWS, TOPICS } from '@/components/math-keyboard/keys';
import { KeyLabel } from './SyPadPlayground';
import { texToHtml, useKatex, type Katex } from './jeeKatex';
import { MathText } from './jeeTex';

type Press = 'photo' | 'maths' | 'chem' | 'formula' | 'insert';

interface Frame {
    scene: 'photo' | 'pad';
    ms: number;
    press?: Press;
    photo?: boolean;
    reading?: boolean;
    filled?: boolean;
    pad?: boolean;
    tab?: 'algebra' | 'chemistry';
    code?: 'slot' | 'type' | 'done';
    added?: boolean;
}

const SCRIPT: Frame[] = [
    { scene: 'photo', ms: 1100 },
    { scene: 'photo', ms: 550, press: 'photo' },
    { scene: 'photo', ms: 700, photo: true },
    { scene: 'photo', ms: 1500, photo: true, reading: true },
    { scene: 'photo', ms: 3300, filled: true },
    { scene: 'pad', ms: 1000 },
    { scene: 'pad', ms: 550, press: 'maths' },
    { scene: 'pad', ms: 800, pad: true, tab: 'algebra' },
    { scene: 'pad', ms: 650, pad: true, tab: 'chemistry', press: 'chem' },
    { scene: 'pad', ms: 750, pad: true, tab: 'chemistry', press: 'formula', code: 'slot' },
    { scene: 'pad', ms: 0, pad: true, tab: 'chemistry', code: 'type' },
    { scene: 'pad', ms: 1000, pad: true, tab: 'chemistry', code: 'done' },
    { scene: 'pad', ms: 650, pad: true, tab: 'chemistry', code: 'done', press: 'insert', added: true },
    { scene: 'pad', ms: 3200, added: true },
];

const TYPING_FRAME = SCRIPT.findIndex((f) => f.code === 'type');
const STILL_FRAME = SCRIPT.findIndex((f) => f.code === 'done');

const FORMULA = 'MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O';
const TYPE_MS = 58;

/** Size the builder is drawn at before scaling (px). */
const UI_W = 820;

const INTEGRAL_Q = String.raw`The value of $\displaystyle\int_{0}^{\pi/2}\frac{\sin x}{\sin x+\cos x}\,dx$ is`;
const INTEGRAL_OPTS = [String.raw`$\frac{\pi}{4}$`, String.raw`$\frac{\pi}{2}$`, String.raw`$\pi$`, '$0$'];
const REDOX_OPTS = ['$M$', String.raw`$\frac{M}{3}$`, String.raw`$\frac{M}{5}$`, String.raw`$\frac{M}{7}$`];

const chemistryKeys = TOPICS.find((t) => t.id === 'chemistry')?.keys ?? [];
const algebraKeys = TOPICS.find((t) => t.id === 'algebra')?.keys ?? [];

const drawn = new Map<string, string | null>();

/** The formula as drawn so far: the longest typed prefix that renders (like the pad's "last good" preview). */
function drawTyped(k: Katex, typed: string): string {
    for (let n = typed.length; n > 0; n--) {
        const tex = String.raw`\ce{${typed.slice(0, n)}}`;
        if (!drawn.has(tex)) drawn.set(tex, texToHtml(k, tex, true));
        const html = drawn.get(tex);
        if (html) return html;
    }
    return '';
}

export default function JeeHero() {
    const k = useKatex();
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.6);
    const [running, setRunning] = useState(false);
    const [step, setStep] = useState(0);
    const [typed, setTyped] = useState(0);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setStep(STILL_FRAME);
            setTyped(FORMULA.length);
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.2 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // The builder is drawn UI_W px wide and scaled to fit the laptop screen.
    useEffect(() => {
        const el = screenRef.current;
        if (!el) return;
        const fit = () => setScale(el.clientWidth / UI_W);
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Advance the script; the typing frame advances once the formula is typed.
    useEffect(() => {
        if (!running) return;
        if (step === TYPING_FRAME) {
            if (typed >= FORMULA.length) {
                const id = window.setTimeout(() => setStep((s) => s + 1), 250);
                return () => window.clearTimeout(id);
            }
            const id = window.setTimeout(() => setTyped((t) => t + 1), TYPE_MS);
            return () => window.clearTimeout(id);
        }
        const id = window.setTimeout(() => {
            setStep((s) => {
                if (s + 1 >= SCRIPT.length) {
                    setTyped(0);
                    return 0;
                }
                return s + 1;
            });
        }, SCRIPT[step].ms);
        return () => window.clearTimeout(id);
    }, [running, step, typed]);

    const f = SCRIPT[step];
    const pressed = (p: Press) => (f.press === p ? ' is-pressed' : '');
    const typedText = f.code === 'type' ? FORMULA.slice(0, typed) : f.code === 'done' || f.added ? FORMULA : '';

    const previewHtml = k && typedText ? drawTyped(k, typedText) : '';
    const topicKeys = f.tab === 'chemistry' ? chemistryKeys : algebraKeys;
    const chemContext = f.code === 'slot' || f.code === 'type' || f.code === 'done';

    return (
        <div
            className="jh-stage"
            ref={rootRef}
            role="img"
            aria-label="Animation: in TestoZa's test builder, a handwritten integral question is read from a photo and appears typeset with its options; then the Sy Pad keyboard builds the chemical equation MnO4− + 8H+ + 5e− → Mn2+ + 4H2O from plain typing and inserts it into a chemistry question."
        >
            <div className={`jh-chip jh-chip--a${f.scene === 'photo' && (f.reading || f.filled) ? ' is-on' : ''}`} aria-hidden="true">
                <i>✦</i> Read from a handwritten photo
            </div>
            <div className={`jh-chip jh-chip--b${f.code === 'done' || f.added ? ' is-on' : ''}`} aria-hidden="true">
                <i>Σ</i> Not one line of LaTeX typed
            </div>

            <div className="jh-laptop" aria-hidden="true">
                <div className="jh-lid">
                    <span className="jh-cam" />
                    <div className="jh-screen" ref={screenRef}>
                        <div className="jh-ui" style={{ transform: `scale(${scale})` }}>
                            <div className="jh-top">
                                <span className="jh-back">‹ My tests</span>
                                <span className="jh-title">JEE Main · Full mock 07</span>
                                <span className="jh-saved">✓ Saved</span>
                                <span className="jh-conduct">Conduct</span>
                            </div>
                            <div className="jh-secs">
                                <span>Physics · 25</span>
                                <span className={f.scene === 'pad' ? 'is-on' : undefined}>Chemistry · 25</span>
                                <span className={f.scene === 'photo' ? 'is-on' : undefined}>Mathematics · 25</span>
                            </div>

                            <div className={`jh-body${f.pad ? ' is-lifted' : ''}`}>
                                {f.scene === 'photo' ? (
                                    <div className="jh-card" key="q61">
                                        <div className="jh-card-head">
                                            <b>Question 61</b>
                                            <span className="jh-pill">Single correct</span>
                                            <span className="jh-lang">
                                                <i className="is-on">English</i>
                                                <i>हिंदी</i>
                                            </span>
                                        </div>
                                        {f.filled && (
                                            <div className="jh-banner">
                                                <b>Filled from your photo — please read it once.</b> Answer <b>A</b> was marked in the photo, so it is ticked below.
                                            </div>
                                        )}
                                        <div className={`jh-field${f.reading ? ' is-reading' : ''}`}>
                                            {f.filled ? <MathText text={INTEGRAL_Q} /> : <span className="jh-ph">{f.reading ? 'Reading your photo…' : 'Type your question here…'}</span>}
                                        </div>
                                        <div className="jh-tools">
                                            <span className={`jh-tool jh-tool--primary${f.filled ? ' is-quiet' : ''}${pressed('photo')}`}>📷 Fill from photo</span>
                                            <span className="jh-tool">Picture</span>
                                            <span className="jh-tool">Σ Maths &amp; symbols</span>
                                            <span className="jh-marks">
                                                <b>+4</b> <em>−1</em>
                                            </span>
                                        </div>
                                        <ul className="jh-opts">
                                            {INTEGRAL_OPTS.map((o, i) => (
                                                <li key={o} className={f.filled && i === 0 ? 'is-correct' : undefined}>
                                                    <span className="jh-opt-letter">{f.filled && i === 0 ? '✓' : 'ABCD'[i]}</span>
                                                    {f.filled ? <MathText text={o} /> : <span className="jh-ph">Option {'ABCD'[i]}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="jh-card" key="q33">
                                        <div className="jh-card-head">
                                            <b>Question 33</b>
                                            <span className="jh-pill">Single correct</span>
                                            <span className="jh-lang">
                                                <i className="is-on">English</i>
                                                <i>हिंदी</i>
                                            </span>
                                        </div>
                                        <div className={`jh-field${f.pad ? ' is-target' : ''}`}>
                                            In acidic medium, the half-reaction{' '}
                                            {f.added ? (
                                                <span className="jh-inserted">
                                                    <MathText text={String.raw`$\ce{${FORMULA}}$`} />
                                                </span>
                                            ) : (
                                                <span className="jh-caret" />
                                            )}{' '}
                                            shows that the equivalent weight of <MathText text={String.raw`$\ce{KMnO4}$`} /> (molar mass M) is
                                        </div>
                                        <div className="jh-tools">
                                            <span className="jh-tool jh-tool--quiet">📷 Fill from photo</span>
                                            <span className="jh-tool">Picture</span>
                                            <span className={`jh-tool${pressed('maths')}`}>Σ Maths &amp; symbols</span>
                                            <span className="jh-marks">
                                                <b>+4</b> <em>−1</em>
                                            </span>
                                        </div>
                                        <ul className="jh-opts">
                                            {REDOX_OPTS.map((o, i) => (
                                                <li key={o} className={i === 2 ? 'is-correct' : undefined}>
                                                    <span className="jh-opt-letter">{i === 2 ? '✓' : 'ABCD'[i]}</span>
                                                    <MathText text={o} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* A photo of a handwritten question */}
                            <div className={`jh-photo${f.photo ? ' is-on' : ''}${f.reading ? ' is-reading' : ''}`}>
                                <p className="jh-photo-q">
                                    Q. ∫<sub>0</sub>
                                    <sup>π/2</sup> sin x / (sin x + cos x) dx = ?
                                </p>
                                <p className="jh-photo-opts">
                                    <span className="is-circled">(a) π/4</span>
                                    <span>(b) π/2</span>
                                    <span>(c) π</span>
                                    <span>(d) 0</span>
                                </p>
                                <span className="jh-photo-scan" />
                            </div>

                            {/* The Sy Pad */}
                            <div className={`jh-pad${f.pad ? ' is-open' : ''}`}>
                                <div className="jh-pad-bar">
                                    <span className="jh-grip" />
                                    <span className="jh-target">↵ Goes into <b>Question 33</b></span>
                                    <span className="jh-pad-help">? How to</span>
                                    <span className="jh-pad-done">Done</span>
                                </div>
                                <div className="jh-display">
                                    <div className="jh-display-row">
                                        <div className="jh-preview">
                                            {f.code === 'slot' ? (
                                                <span className="jh-slot">?</span>
                                            ) : previewHtml ? (
                                                <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                            ) : (
                                                <span className="jh-ph">Your formula appears here</span>
                                            )}
                                            {f.code === 'type' && <span className="jh-blink" />}
                                        </div>
                                        <span className={`jh-insert${pressed('insert')}`}>{f.added ? '✓ Added' : '↵ Insert'}</span>
                                    </div>
                                    <div className="jh-code">
                                        <span>CODE</span>
                                        <code>{f.code === 'slot' ? String.raw`\ce{?}` : typedText ? String.raw`\ce{${typedText}}` : ''}</code>
                                    </div>
                                </div>
                                <div className={`jh-hint${chemContext ? ' is-chem' : ''}`}>
                                    {chemContext ? (
                                        <>
                                            <b>Chemistry</b> type the formula as plain text: H2O, Fe^3+, 2H2 + O2 -&gt; 2H2O
                                        </>
                                    ) : (
                                        'Build your formula here, then press Insert to put it into Question 33.'
                                    )}
                                </div>
                                <div className="jh-tabs">
                                    <div className="jh-seg">
                                        {TOPICS.map((t) => (
                                            <span
                                                key={t.id}
                                                className={`${t.id === f.tab ? 'is-on' : ''}${t.id === 'chemistry' && f.press === 'chem' ? ' is-pressed' : ''}`}
                                            >
                                                {t.label}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="jh-words">Aa Words</span>
                                </div>
                                <div className="jh-keys">
                                    <div className="jh-pane">
                                        {FIXED_ROWS.map((row, ri) => (
                                            <div className="jh-row" key={ri}>
                                                {row.map((key, ki) => (
                                                    <span key={ki} className={`jh-key${key.className === 'action' ? ' jh-key--func' : ''}${key.className === 'space-key' ? ' jh-key--space' : ''}${key.className === 'italic' ? ' jh-key--italic' : ''}`}>
                                                        {key.className === 'space-key' ? 'space' : <KeyLabel k={key} />}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="jh-pane jh-pane--topic">
                                        {topicKeys.map((row, ri) => (
                                            <div className="jh-row" key={ri}>
                                                {row.map((key, ki) => (
                                                    <span
                                                        key={ki}
                                                        className={`jh-key jh-key--small${key.className === 'highlight' ? ' jh-key--accent' : ''}${key.className === 'italic' ? ' jh-key--italic' : ''}${key.latex === String.raw`\ce{?}` && f.press === 'formula' ? ' is-pressed' : ''}`}
                                                    >
                                                        <KeyLabel k={key} />
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="jh-edit">
                                        <span className="jh-key jh-key--func">⌫</span>
                                        <span className="jh-key jh-key--func">‹</span>
                                        <span className="jh-key jh-key--func">›</span>
                                        <span className="jh-key jh-key--func jh-key--clear">Clear</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="jh-base">
                    <i />
                </div>
            </div>
        </div>
    );
}
