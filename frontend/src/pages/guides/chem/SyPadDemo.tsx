/**
 * chem-sypad: a working Sy Pad on /chemistry-question-paper-maker, forked from the maths
 * guide's pad with chemistry replays, opening on the Chemistry tab. It uses the real key layout
 * (components/math-keyboard/keys.ts), the real editing rules (mathSyntax.ts) and the
 * real live preview (previewTex.ts), without the test builder around it: Insert drops
 * the formula into a sample question card instead of a question box.
 *
 * Differences from the builder's pad, on purpose: the Tables keys insert a starting
 * grid (the builder opens a grid editor first), there is no docking or dragging,
 * and three "watch it build" replays press real keys.
 *
 * Size: from 860 px the question card and replays sit beside the pad; narrower, they
 * stack and the demo scrolls inside its frame (--cq-fit-h).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, CornerDownLeft, Delete, HelpCircle, Play, Square, Type, X } from 'lucide-react';
import { FIXED_ROWS, TOPICS, type MathKey, type TopicId } from '@/components/math-keyboard/keys';
import {
    clearEmptySlots,
    contextAt,
    countEmptySlots,
    finalizeLatex,
    firstEmptySlot,
    smartBackspace,
    type MathContext,
} from '@/components/math-keyboard/mathSyntax';
import { texToHtml, useKatex } from '../jeeKatex';
import { Tex } from '../jeeTex';
import { DemoFrame } from './replica';
// The question card draws maths as the product's LatexRenderer does (full-size inline fractions).
import { MathText } from './tex';

interface Ed {
    expr: string;
    /** Selection start and end in `expr` (equal when it's a plain caret). */
    s: number;
    e: number;
}

const EMPTY: Ed = { expr: '', s: 0, e: 0 };

/** Mirrors HINTS in MathKeyboard.tsx. */
const HINTS: Record<MathContext, string> = {
    math: 'Maths — tap a key or type. Blue boxes are blanks: click one, then type.',
    chemistry: 'Chemistry — type the formula as plain text: H2O, Fe^3+, 2H2 + O2 -> 2H2O. Numbers become small automatically.',
    text: 'Plain words — type normally, spaces work here. Tap outside the grey words to go back to maths.',
};

/** Mirrors HELP_ROWS in MathKeyboard.tsx. */
const HELP_ROWS: { want: string; how: string; shows: string }[] = [
    { want: 'A fraction', how: 'Tap ▫/▫, fill top and bottom', shows: String.raw`\frac{3}{4}` },
    { want: 'A power', how: 'Tap □ⁿ after the number', shows: 'x^{2}' },
    { want: 'A chemical formula', how: 'Chemistry → Formula, then type H2SO4', shows: String.raw`\ce{H2SO4}` },
    { want: 'A reaction', how: 'Formula, then type 2H2 + O2 -> 2H2O', shows: String.raw`\ce{2H2 + O2 -> 2H2O}` },
    { want: 'Heat or catalyst on the arrow', how: 'Chemistry → the arrow with boxes', shows: String.raw`\xrightarrow{\Delta}` },
    { want: 'Normal words inside maths', how: 'Tap Words, then type', shows: String.raw`\text{speed} = 5\,\text{m/s}` },
    { want: 'A table or match-the-columns', how: 'Open the Tables tab', shows: String.raw`\begin{array}{|c|c|}\hline A & B\\\hline\end{array}` },
    { want: 'Greek letters (α, θ, Δ)', how: 'Physics or Statistics tab', shows: String.raw`\alpha,\ \theta,\ \Delta` },
];

/** Starting grids for the Tables keys (in the builder these open the grid editor). */
const TABLE_PRESETS: Record<string, string> = {
    __TABLE_HEADER: String.raw`\begin{array}{c|c} x & y \\ \hline ? & ? \\ ? & ? \end{array}`,
    __TABLE_EMPTY: String.raw`\begin{array}{cc} ? & ? \\ ? & ? \end{array}`,
    __TABLE_GRID: String.raw`\begin{array}{|c|c|} \hline ? & ? \\ \hline ? & ? \\ \hline \end{array}`,
    __TABLE_MATCH: String.raw`\begin{array}{llll} & \textbf{List-I} & & \textbf{List-II} \\ (P) & ? & (1) & ? \\ (Q) & ? & (2) & ? \\ (R) & ? & (3) & ? \\ (S) & ? & (4) & ? \end{array}`,
    __TABLE_LIST: String.raw`\begin{array}{ll} ? & ? \\ ? & ? \end{array}`,
    __TABLE_MATRIX: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}`,
    __TABLE_DETERMINANT: String.raw`\begin{vmatrix} 1 & 0 \\ 0 & 1 \end{vmatrix}`,
    __TABLE_ARROW: String.raw`\xrightarrow[?]{?}`,
};

/* ── editing (the same rules as MathKeyboard.tsx) ─────────────────────────── */

function insertPiece(p: Ed, latex: string): Ed {
    // Inside \ce{} and \text{} the space key means a real space, not a maths gap.
    const piece = latex === String.raw`\,` && contextAt(p.expr, p.s) !== 'math' ? ' ' : latex;
    const expr = p.expr.slice(0, p.s) + piece + p.expr.slice(p.e);
    const slot = piece.indexOf('?');
    if (slot !== -1 && countEmptySlots(piece) > 0) return { expr, s: p.s + slot, e: p.s + slot + 1 };
    const caret = p.s + piece.length;
    return { expr, s: caret, e: caret };
}

function applyKey(p: Ed, latex: string): Ed {
    const { expr, s, e } = p;
    if (latex === '__BACK__') {
        const r = smartBackspace(expr, s, e);
        return { expr: r.expr, s: r.caret, e: r.caret };
    }
    if (latex === '__CLEAR__') return EMPTY;
    if (latex === '__LEFT__') {
        const m = /\\[a-zA-Z]+\s?$/.exec(expr.slice(0, s));
        const pos = m ? s - m[0].length : Math.max(0, s - 1);
        return { expr, s: pos, e: pos };
    }
    if (latex === '__RIGHT__') {
        const m = /^\\[a-zA-Z]+\s?/.exec(expr.slice(s));
        const pos = m ? s + m[0].length : Math.min(expr.length, s + 1);
        return { expr, s: pos, e: pos };
    }
    return insertPiece(p, TABLE_PRESETS[latex] ?? latex);
}

/** Typing one character, as on a physical keyboard. */
function typeChar(p: Ed, ch: string): Ed {
    if (ch === ' ') return insertPiece(p, contextAt(p.expr, p.s) === 'math' ? String.raw`\,` : ' ');
    const expr = p.expr.slice(0, p.s) + ch + p.expr.slice(p.e);
    return { expr, s: p.s + ch.length, e: p.s + ch.length };
}

/* ── demos: real key presses, replayed ────────────────────────────────────── */

type Step = { tab: TopicId } | { key: string } | { char: string } | { slot: true };

const chars = (text: string): Step[] => Array.from(text, (char) => ({ char }));

const CE = String.raw`\ce{?}`;

const DEMOS: { id: string; icon: string; label: string; steps: Step[] }[] = [
    {
        // Formula, then plain typing: \ce{MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O}
        id: 'redox',
        icon: 'e⁻',
        label: 'Half-reaction',
        steps: [{ tab: 'chemistry' }, { key: CE }, ...chars('MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O')],
    },
    {
        // \ce{2KClO3}\xrightarrow[\Delta ]{\ce{MnO2}}\ce{2KCl + 3O2}\ce{^} (the ↑ key)
        id: 'arrow',
        icon: 'Δ',
        label: 'Catalyst and heat',
        steps: [
            { tab: 'chemistry' },
            { key: CE },
            ...chars('2KClO3'),
            { key: '__RIGHT__' },
            { key: '__TABLE_ARROW' },
            { key: String.raw`\Delta ` },
            { slot: true },
            { key: CE },
            ...chars('MnO2'),
            { key: '__RIGHT__' },
            { key: '__RIGHT__' },
            { key: CE },
            ...chars('2KCl + 3O2'),
            { key: '__RIGHT__' },
            { key: String.raw`\ce{^}` },
        ],
    },
    {
        // K_{c}=\frac{[\ce{NH3}]^{2}}{[\ce{N2}][\ce{H2}]^{3}}
        id: 'kc',
        icon: 'K',
        label: 'Equilibrium constant',
        steps: [
            { tab: 'chemistry' },
            ...chars('K'),
            { key: '_{?}' },
            ...chars('c'),
            { key: '__RIGHT__' },
            { key: '=' },
            { key: String.raw`\frac{?}{?}` },
            { key: '[' },
            { key: CE },
            ...chars('NH3'),
            { key: '__RIGHT__' },
            { key: ']' },
            { key: '^{?}' },
            { key: '2' },
            { key: '__RIGHT__' },
            { slot: true },
            { key: '[' },
            { key: CE },
            ...chars('N2'),
            { key: '__RIGHT__' },
            { key: ']' },
            { key: '[' },
            { key: CE },
            ...chars('H2'),
            { key: '__RIGHT__' },
            { key: ']' },
            { key: '^{?}' },
            { key: '3' },
        ],
    },
];

const stepDelay = (step: Step) => ('char' in step ? 75 : 'tab' in step ? 480 : 'slot' in step ? 420 : 520);

const FIXED_KEYS = new Set(FIXED_ROWS.flat().map((k) => k.latex));

type Flash = { kind: 'key'; latex: string } | { kind: 'tab'; id: TopicId } | { kind: 'type' } | { kind: 'slot' } | null;

/* ── small pieces ─────────────────────────────────────────────────────────── */

/** A key's face: the fraction icon, rendered TeX, or plain text (as in MathKeyboard.tsx). */
export function KeyLabel({ k }: { k: MathKey }) {
    if (k.latex === String.raw`\frac{?}{?}`) {
        return (
            <span className="sp-frac-icon" aria-hidden="true">
                <i />
                <b />
                <i />
            </span>
        );
    }
    const text = k.display ?? k.label;
    if (/[\\^_]/.test(text)) return <Tex tex={text} fallback={k.label} />;
    return <>{text}</>;
}

/** Phone width: the pad shows the number pad or the tab's keys, switched by "123" (as in the builder). */
const NARROW = '(max-width: 639px)';

function useNarrow() {
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW).matches);
    useEffect(() => {
        const mq = window.matchMedia?.(NARROW);
        if (!mq) return;
        const on = () => setNarrow(mq.matches);
        on();
        mq.addEventListener?.('change', on);
        return () => mq.removeEventListener?.('change', on);
    }, []);
    return narrow;
}

/* ── the pad ──────────────────────────────────────────────────────────────── */

export default function SyPadDemo() {
    const k = useKatex();
    const narrow = useNarrow();
    const [ed, setEd] = useState<Ed>(EMPTY);
    const [topic, setTopic] = useState<TopicId>('chemistry');
    const [pane, setPane] = useState<'digits' | 'topic'>('topic');
    const [abc, setAbc] = useState(false);
    const [shift, setShift] = useState(false);
    const [help, setHelp] = useState(false);
    const [notice, setNotice] = useState<null | { kind: 'slots' | 'invalid'; action: 'insert' | 'copy'; count?: number }>(null);
    const [tableNote, setTableNote] = useState(false);
    const [question, setQuestion] = useState('');
    const [inserted, setInserted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [demo, setDemo] = useState<{ id: string; i: number } | null>(null);
    const [flash, setFlash] = useState<Flash>(null);
    const [nudge, setNudge] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const segRef = useRef<HTMLDivElement>(null);

    // The pad opens on Chemistry, near the end of the tab strip: keep the chosen tab in
    // view by scrolling the strip itself (never the page).
    useEffect(() => {
        const seg = segRef.current;
        if (!seg) return;
        const reveal = () => {
            const on = seg.querySelector<HTMLElement>('[aria-selected="true"]');
            if (!on) return;
            const s = seg.getBoundingClientRect();
            const r = on.getBoundingClientRect();
            if (r.left < s.left) seg.scrollLeft -= s.left - r.left + 8;
            else if (r.right > s.right) seg.scrollLeft += r.right - s.right + 8;
        };
        reveal();
        // Again once the strip has its final width (fonts, rotation).
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(reveal);
        ro.observe(seg);
        return () => ro.disconnect();
    }, [topic, pane, narrow]);
    const edRef = useRef(ed);
    edRef.current = ed;
    const lastGoodRef = useRef('');
    const finePointer = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;

    const context: MathContext = useMemo(() => contextAt(ed.expr, ed.s), [ed.expr, ed.s]);

    // Keep the code line's selection in step with the pad (only while it has focus,
    // so the page never scrolls to it on its own).
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!el || document.activeElement !== el) return;
        if (el.selectionStart !== ed.s || el.selectionEnd !== ed.e) {
            try {
                el.setSelectionRange(ed.s, ed.e);
            } catch {
                /* input type without selection support */
            }
        }
    }, [ed]);

    const stopDemo = useCallback(() => {
        setDemo(null);
        setFlash(null);
    }, []);

    const focusCode = useCallback(() => {
        if (finePointer) inputRef.current?.focus({ preventScroll: true });
    }, [finePointer]);

    const edit = useCallback((next: (p: Ed) => Ed) => {
        setEd(next);
        setNotice(null);
        setNudge(false);
    }, []);

    const pressKey = useCallback(
        (latex: string, fromDemo = false) => {
            if (!fromDemo) stopDemo();
            setTableNote(latex.startsWith('__TABLE_'));
            if (latex === '__ABC__') {
                setAbc(true);
                return;
            }
            edit((p) => applyKey(p, latex));
            if (!fromDemo) focusCode();
        },
        [edit, focusCode, stopDemo],
    );

    const chooseTopic = (id: TopicId) => {
        setTopic(id);
        setPane('topic');
        setAbc(false);
        setHelp(false);
    };

    /* Insert / Copy, with the pad's checks */
    const commit = (action: 'insert' | 'copy', force = false) => {
        stopDemo();
        const current = edRef.current.expr;
        if (!current.trim()) return;
        const slots = countEmptySlots(current);
        if (slots > 0 && !force) {
            setNotice({ kind: 'slots', action, count: slots });
            const at = firstEmptySlot(current);
            if (at !== -1) setEd({ expr: current, s: at, e: at + 1 });
            return;
        }
        const latex = finalizeLatex(force ? clearEmptySlots(current) : current);
        if (!latex) return;
        if (!force && k && !texToHtml(k, latex, true)) {
            setNotice({ kind: 'invalid', action });
            return;
        }
        const text = `$${latex}$`;
        setNotice(null);
        setNudge(false);
        if (action === 'copy') {
            navigator.clipboard
                ?.writeText(text)
                .then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                })
                .catch(() => {});
            return;
        }
        setQuestion((q) => (q ? `${q} ${text}` : text));
        setInserted(true);
        window.setTimeout(() => setInserted(false), 1400);
        setEd(EMPTY);
        setTableNote(false);
    };

    /* Demos */
    const startDemo = (id: string) => {
        if (demo?.id === id) {
            stopDemo();
            return;
        }
        setEd(EMPTY);
        setAbc(false);
        setHelp(false);
        setNotice(null);
        setTableNote(false);
        setNudge(false);
        setDemo({ id, i: 0 });
    };

    useEffect(() => {
        if (!demo) return;
        const script = DEMOS.find((d) => d.id === demo.id);
        if (!script) return;
        if (demo.i >= script.steps.length) {
            setDemo(null);
            setFlash(null);
            setNudge(true);
            return;
        }
        const step = script.steps[demo.i];
        if ('tab' in step) {
            setTopic(step.tab);
            setPane('topic');
            setFlash({ kind: 'tab', id: step.tab });
        } else if ('key' in step) {
            if (FIXED_KEYS.has(step.key)) setPane('digits');
            else if (!step.key.startsWith('__')) setPane('topic');
            setFlash({ kind: 'key', latex: step.key });
            pressKey(step.key, true);
        } else if ('char' in step) {
            setFlash({ kind: 'type' });
            setEd((p) => typeChar(p, step.char));
        } else {
            setFlash({ kind: 'slot' });
            setEd((p) => {
                const at = firstEmptySlot(p.expr);
                return at === -1 ? p : { expr: p.expr, s: at, e: at + 1 };
            });
        }
        const t = window.setTimeout(() => setDemo((cur) => (cur && cur.id === demo.id ? { ...cur, i: cur.i + 1 } : cur)), stepDelay(step));
        return () => window.clearTimeout(t);
    }, [demo, pressKey]);

    /* Preview: strict, then lenient, then without the caret; else the last good one */
    const preview = useMemo(() => {
        if (!ed.expr.trim()) {
            lastGoodRef.current = '';
            return { html: '', stale: false };
        }
        if (!k) return { html: '', stale: true };
        const html =
            texToHtml(k, k.prepare(ed.expr, ed.s), true) ??
            texToHtml(k, k.prepare(ed.expr, ed.s, true), true) ??
            texToHtml(k, k.prepare(ed.expr, null, true), true);
        if (html) {
            lastGoodRef.current = html;
            return { html, stale: false };
        }
        return { html: lastGoodRef.current.replace(/math-cursor/g, 'math-cursor-off'), stale: true };
    }, [k, ed.expr, ed.s]);

    /* Clicking the preview moves the caret to that symbol (same mapping as the builder) */
    const onPreviewClick = (e: ReactMouseEvent<HTMLDivElement>) => {
        stopDemo();
        const els = Array.from(e.currentTarget.querySelectorAll('.math-placeholder, .math-token'));
        const place = (s: number, end = s) => {
            setEd((p) => ({ ...p, s, e: end }));
            focusCode();
        };
        if (els.length === 0) {
            place(ed.expr.length);
            return;
        }
        const first = els[0].getBoundingClientRect();
        const last = els[els.length - 1].getBoundingClientRect();
        if (e.clientX < first.left - 10) return place(0);
        if (e.clientX > last.right + 10) return place(ed.expr.length);
        let best: Element | null = null;
        let min = Infinity;
        for (const el of els) {
            const r = el.getBoundingClientRect();
            const d = (e.clientX - (r.left + r.width / 2)) ** 2 + (e.clientY - (r.top + r.height / 2)) ** 2;
            if (d < min) {
                min = d;
                best = el;
            }
        }
        const idx = best && Array.from(best.classList).find((c) => c.startsWith('token-idx-'));
        if (!best || !idx) return;
        const raw = parseInt(idx.replace('token-idx-', ''), 10);
        if (best.classList.contains('math-placeholder')) place(raw, raw + 1);
        else {
            const r = best.getBoundingClientRect();
            place(e.clientX - r.left < r.width / 2 ? raw : raw + 1);
        }
    };

    const topicData = TOPICS.find((t) => t.id === topic) ?? TOPICS[0];
    const slotsLeft = countEmptySlots(ed.expr);
    const hint = !ed.expr
        ? 'Build a formula here, then press Insert to put it into Question 1.'
        : tableNote
          ? 'Tables: here you get a starting grid to fill. In the test builder this opens a grid editor where you add rows and columns first.'
          : slotsLeft > 0 && context === 'math'
            ? `${slotsLeft} blue ${slotsLeft === 1 ? 'box is' : 'boxes are'} still empty — click one, then type.`
            : HINTS[context];

    const isFlashKey = (latex: string) => flash?.kind === 'key' && flash.latex === latex;

    const renderKey = (key: MathKey, i: number, small = false) => (
        <button
            key={i}
            type="button"
            title={key.hint ?? key.label}
            aria-label={key.hint ?? key.label}
            onClick={() => pressKey(key.latex)}
            className={[
                'sp-key',
                key.className === 'action' ? 'sp-key--func' : key.className === 'highlight' ? 'sp-key--accent' : '',
                key.className === 'italic' ? 'sp-key--italic' : '',
                key.className === 'space-key' ? 'sp-key--space' : '',
                small ? 'sp-key--small' : '',
                isFlashKey(key.latex) ? 'is-flash' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {key.className === 'space-key' ? <span className="sp-space-label">space</span> : <KeyLabel k={key} />}
        </button>
    );

    const letter = (ch: string) => {
        const out = shift ? ch.toUpperCase() : ch;
        return (
            <button key={ch} type="button" className="sp-key" onClick={() => pressKey(out)}>
                {out}
            </button>
        );
    };

    const running = demo ? DEMOS.find((d) => d.id === demo.id) : null;

    const restart = () => {
        stopDemo();
        setEd(EMPTY);
        setQuestion('');
        setInserted(false);
        setTopic('chemistry');
        setPane('topic');
        setAbc(false);
        setHelp(false);
        setNotice(null);
        setTableNote(false);
        setNudge(false);
    };

    return (
        <DemoFrame
            id="sypad-demo"
            title="The Sy Pad’s Chemistry keys, working"
            tip={
                inserted ? (
                    <span key="t2">In the card: the code the box stores, and what students see.</span>
                ) : running ? (
                    <span key="t1">Watch the keys light up, then press Insert.</span>
                ) : (
                    <span key="t0">{narrow ? 'Tap Formula, then type H2SO4. Replays are under the keys.' : 'Press a replay, or tap Formula and type H2SO4 yourself.'}</span>
                )
            }
            onRestart={restart}
            wide="lg"
            caption="The same keys and editing rules as the Sy Pad in TestoZa’s test builder. Here, Tables insert a starting grid; in the builder they open a grid editor first."
        >
            <div className="sp">
                <div className="sp-side">
                {/* The question the formula goes into */}
                <div className={`sp-card${inserted ? ' is-added' : ''}`}>
                    <div className="sp-card-head">
                        <span className="sp-card-q">Question 1</span>
                        <span className="sp-card-type">Single correct</span>
                        {question && (
                            <button type="button" className="sp-card-clear" onClick={() => setQuestion('')}>
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="sp-card-box" aria-label="What the question box stores">
                        {question ? <code>{question}</code> : <span className="sp-card-empty">Type your question here…</span>}
                    </div>
                    <div className="sp-card-preview" aria-live="polite">
                        <span className="sp-card-tag">Preview</span>
                        <div className="sp-card-math">
                            {question ? <MathText text={question} /> : <span className="sp-card-empty">Press Insert and your formula appears here, the way students will see it.</span>}
                        </div>
                    </div>
                </div>

                {/* Replays */}
                <div className="sp-demos">
                    <span className="sp-demos-label">Watch it build:</span>
                    {DEMOS.map((d) => (
                        <button key={d.id} type="button" className={`sp-demo${demo?.id === d.id ? ' is-on' : ''}`} onClick={() => startDemo(d.id)} aria-pressed={demo?.id === d.id}>
                            <span aria-hidden="true">{d.icon}</span>
                            {d.label}
                            {demo?.id === d.id ? <Square className="h-3 w-3" aria-label="Stop" /> : <Play className="h-3 w-3" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
                </div>

                {/* The pad */}
                <div
                    className="sp-pad"
                    role="region"
                    aria-label="Sy Pad — maths and chemistry keyboard (try it)"
                    onMouseDown={(e) => {
                        // Keep the code line focused while keys are pressed, like the real pad.
                        if (!(e.target as HTMLElement).closest('input, textarea')) e.preventDefault();
                    }}
                >
                    <div className="sp-bar">
                        <span aria-hidden="true" className="sp-grip" />
                        <span className="sp-target">
                            <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            Goes into <strong>Question 1</strong>
                        </span>
                        <button type="button" className={`sp-help${help ? ' is-on' : ''}`} onClick={() => setHelp((v) => !v)} aria-pressed={help}>
                            <HelpCircle className="h-4 w-4" aria-hidden="true" />
                            <span>How to</span>
                        </button>
                    </div>

                    <div className="sp-display">
                        <div className="sp-display-row">
                            <div className="sp-preview" onClick={onPreviewClick} title="Click a blue box or a symbol to edit there" aria-label="Formula preview">
                                {preview.html ? (
                                    <div className={preview.stale ? 'is-stale' : undefined} dangerouslySetInnerHTML={{ __html: preview.html }} />
                                ) : (
                                    <span className="sp-preview-empty">{ed.expr.trim() ? 'Loading maths…' : 'Your formula appears here'}</span>
                                )}
                                {preview.stale && preview.html && <span className="sp-keep">keep typing…</span>}
                            </div>
                            <button type="button" className={`sp-insert${nudge ? ' is-nudge' : ''}`} onClick={() => commit('insert')} disabled={!ed.expr.trim()}>
                                {inserted ? <Check className="h-4 w-4" aria-hidden="true" /> : <CornerDownLeft className="h-4 w-4" aria-hidden="true" />}
                                {inserted ? 'Added' : 'Insert'}
                            </button>
                        </div>
                        <div className={`sp-code${flash?.kind === 'type' ? ' is-typing' : ''}`}>
                            <span className="sp-code-label">Code</span>
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode={finePointer ? 'text' : 'none'}
                                spellCheck={false}
                                autoComplete="off"
                                aria-label="Formula code"
                                value={ed.expr}
                                placeholder="or type here, e.g. \ce{H2SO4}"
                                onChange={(e) => {
                                    stopDemo();
                                    const el = e.target;
                                    edit(() => ({ expr: el.value, s: el.selectionStart ?? el.value.length, e: el.selectionEnd ?? el.value.length }));
                                }}
                                onSelect={(e) => {
                                    const el = e.currentTarget;
                                    const s = el.selectionStart ?? 0;
                                    const end = el.selectionEnd ?? s;
                                    setEd((p) => (p.expr === el.value && (p.s !== s || p.e !== end) ? { ...p, s, e: end } : p));
                                }}
                                onKeyDown={(e) => {
                                    stopDemo();
                                    const el = e.currentTarget;
                                    const cur = el.value;
                                    const start = el.selectionStart ?? cur.length;
                                    const end = el.selectionEnd ?? start;
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commit('insert');
                                    } else if (e.key === ' ') {
                                        e.preventDefault();
                                        edit(() => typeChar({ expr: cur, s: start, e: end }, ' '));
                                    } else if (e.key === 'Backspace') {
                                        e.preventDefault();
                                        edit(() => applyKey({ expr: cur, s: start, e: end }, '__BACK__'));
                                    } else if (e.key === '{') {
                                        // Braces stay paired so a half-typed group never breaks the formula.
                                        e.preventDefault();
                                        const inner = cur.slice(start, end);
                                        edit(() => ({ expr: `${cur.slice(0, start)}{${inner}}${cur.slice(end)}`, s: start + 1, e: start + 1 + inner.length }));
                                    } else if (e.key === '}' && start === end && cur[start] === '}') {
                                        e.preventDefault();
                                        edit(() => ({ expr: cur, s: start + 1, e: start + 1 }));
                                    }
                                }}
                            />
                            <button type="button" className="sp-copy" onClick={() => commit('copy')} disabled={!ed.expr.trim()} title="Copy the formula with $…$ to paste anywhere">
                                {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <div className="sp-hint" aria-live="polite">
                        {notice ? (
                            <div className="sp-notice">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>
                                    {notice.kind === 'slots'
                                        ? `${notice.count} blue ${notice.count === 1 ? 'box is' : 'boxes are'} still empty.`
                                        : 'This formula looks unfinished.'}
                                </span>
                                <button type="button" onClick={() => commit(notice.action, true)}>
                                    {notice.action === 'copy' ? 'Copy anyway' : 'Insert anyway'}
                                </button>
                                <button type="button" className="sp-notice-x" onClick={() => setNotice(null)} aria-label="Dismiss">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : running ? (
                            <span className="sp-hint-demo">
                                Building: <strong>{running.label}</strong> — watch the keys light up.
                            </span>
                        ) : (
                            <span className={`sp-hint-text sp-hint--${context}`}>
                                {context !== 'math' && ed.expr && <b>{context === 'chemistry' ? 'Chemistry' : 'Words'}</b>}
                                {nudge ? 'Done. Your turn: press Insert.' : hint}
                            </span>
                        )}
                    </div>

                    <div className="sp-tabs">
                        <div className="sp-seg" role="tablist" aria-label="Key sets" ref={segRef}>
                            {narrow && (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={pane === 'digits' && !abc}
                                    className={pane === 'digits' && !abc && !help ? 'is-on' : undefined}
                                    onClick={() => {
                                        setPane('digits');
                                        setAbc(false);
                                        setHelp(false);
                                    }}
                                >
                                    123
                                </button>
                            )}
                            {TOPICS.map((t) => {
                                const on = topic === t.id && (pane === 'topic' || !narrow) && !abc && !help;
                                const flashing = flash?.kind === 'tab' && flash.id === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={on}
                                        className={`${on ? 'is-on' : ''}${flashing ? ' is-flash' : ''}` || undefined}
                                        onClick={() => {
                                            stopDemo();
                                            chooseTopic(t.id);
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            className="sp-words"
                            title="Normal words inside a formula — e.g. speed = 5 m/s"
                            onClick={() => pressKey(String.raw`\text{?}`)}
                        >
                            <Type className="h-3.5 w-3.5" aria-hidden="true" /> Words
                        </button>
                    </div>

                    <div className="sp-keys">
                        {help ? (
                            <div className="sp-helptable">
                                <table>
                                    <tbody>
                                        {HELP_ROWS.map((r) => (
                                            <tr key={r.want}>
                                                <th scope="row">{r.want}</th>
                                                <td>{r.how}</td>
                                                <td className="sp-help-shows">
                                                    <Tex tex={r.shows} fallback="" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : abc ? (
                            <div className="sp-abc">
                                <div className="sp-row">{['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(letter)}</div>
                                <div className="sp-row sp-row--inset">{['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(letter)}</div>
                                <div className="sp-row">
                                    <button type="button" className={`sp-key ${shift ? '' : 'sp-key--func'} sp-key--wide`} onClick={() => setShift((v) => !v)} aria-pressed={shift} title="Capital letters">
                                        ⇧
                                    </button>
                                    {['z', 'x', 'c', 'v', 'b', 'n', 'm', ','].map(letter)}
                                    <button type="button" className="sp-key sp-key--func sp-key--wide" onClick={() => pressKey('__BACK__')} aria-label="Delete">
                                        <Delete className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="sp-row">
                                    <button type="button" className="sp-key sp-key--func sp-key--wide" onClick={() => setAbc(false)}>
                                        123
                                    </button>
                                    <button type="button" className="sp-key sp-key--func sp-key--wide" onClick={() => pressKey(String.raw`\quad `)} title="Wide gap (tab)">
                                        ⇥
                                    </button>
                                    <button type="button" className="sp-key sp-key--space" onClick={() => pressKey(String.raw`\,`)}>
                                        <span className="sp-space-label">space</span>
                                    </button>
                                    <button type="button" className="sp-key sp-key--wide" onClick={() => pressKey('.')}>
                                        .
                                    </button>
                                    <button type="button" className="sp-key sp-key--func sp-key--wide" onClick={() => pressKey('\n')} title="New line">
                                        ↵
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="sp-grid">
                                <div className={`sp-pane sp-pane--digits${pane === 'digits' || !narrow ? ' is-on' : ''}`}>
                                    {FIXED_ROWS.map((row, ri) => (
                                        <div className="sp-row" key={ri}>
                                            {row.map((key, ki) => renderKey(key, ki))}
                                        </div>
                                    ))}
                                </div>
                                <div className={`sp-pane sp-pane--topic${pane === 'topic' || !narrow ? ' is-on' : ''}${topic === 'tables' ? ' is-tables' : ''}`}>
                                    {topicData.keys.map((row, ri) => (
                                        <div className="sp-row" key={ri}>
                                            {row.map((key, ki) => renderKey(key, ki, true))}
                                        </div>
                                    ))}
                                </div>
                                <div className="sp-edit">
                                    <button type="button" className="sp-key sp-key--func" onClick={() => pressKey('__BACK__')} aria-label="Delete" title="Delete (removes a whole symbol at a time)">
                                        <Delete className="h-5 w-5" />
                                    </button>
                                    <button type="button" className={`sp-key sp-key--func${isFlashKey('__LEFT__') ? ' is-flash' : ''}`} onClick={() => pressKey('__LEFT__')} aria-label="Move cursor left">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button type="button" className={`sp-key sp-key--func${isFlashKey('__RIGHT__') ? ' is-flash' : ''}`} onClick={() => pressKey('__RIGHT__')} aria-label="Move cursor right">
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                    <button type="button" className="sp-key sp-key--func sp-key--clear" onClick={() => pressKey('__CLEAR__')} title="Clear the whole formula">
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DemoFrame>
    );
}
