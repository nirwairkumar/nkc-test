/**
 * Widgets for /cbt-exam-software (see GuideWidget in src/guides/types.ts):
 *   omr-to-cbt   an OMR sheet being filled next to a CBT palette saving each answer
 *   marking-lab  pick an exam, move the counts, watch the score (real marking schemes)
 *   exam-day     a slider and swipeable cards through a CBT, the night before to results
 * Illustrations use example data and say so. Everything is readable without motion.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { GuideWidget as GuideWidgetName } from '@/guides/types';

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

/* ── OMR → CBT ─────────────────────────────────────────────────────────── */

/** Chosen option per row (0–3). */
const OMR_ANSWERS = [1, 3, 0, 2, 1, 2];

/** Puts the pencil tip on the bubble for a row (bubbles 30 px apart, rows 30 px apart). */
const pencilAt = (row: number) => `translate(${50 + 30 * OMR_ANSWERS[row]}px, ${30 * row}px) rotate(-28deg)`;

function OmrToCbt() {
    const { ref, on } = useOnScreen<HTMLElement>();
    const [filled, setFilled] = useState(0);

    useEffect(() => {
        if (!on) return;
        if (prefersReducedMotion()) {
            setFilled(OMR_ANSWERS.length);
            return;
        }
        // One answer every 0.9 s; hold the full sheet, then start again.
        const id = window.setInterval(() => setFilled((f) => (f >= OMR_ANSWERS.length + 3 ? 0 : f + 1)), 900);
        return () => window.clearInterval(id);
    }, [on]);

    const n = Math.min(filled, OMR_ANSWERS.length);
    const done = n === OMR_ANSWERS.length;

    return (
        <figure className="gd-widget" ref={ref}>
            <div className="cbt-omr" aria-hidden="true">
                <div className="cbt-omr-card cbt-omr-card--paper">
                    <p className="cbt-omr-label">On paper</p>
                    <div className="cbt-sheet-paper">
                        <div className="cbt-sheet-head">OMR answer sheet</div>
                        {OMR_ANSWERS.map((pick, row) => (
                            <div className="cbt-omr-row" key={row}>
                                <span className="cbt-omr-n">{row + 1}</span>
                                {[0, 1, 2, 3].map((o) => (
                                    <span key={o} className={`cbt-bubble${row < n && o === pick ? ' is-filled' : ''}`}>
                                        {'ABCD'[o]}
                                    </span>
                                ))}
                            </div>
                        ))}
                        <span className="cbt-pencil" style={{ transform: pencilAt(Math.min(n, OMR_ANSWERS.length - 1)) }} />
                    </div>
                    <p className={`cbt-omr-status${done ? ' is-on' : ''}`}>
                        <b>Marks:</b> after the sheets are scanned
                    </p>
                </div>
                <div className="cbt-omr-arrow">→</div>
                <div className="cbt-omr-card cbt-omr-card--screen">
                    <p className="cbt-omr-label">On screen</p>
                    <div className="cbt-sheet-screen">
                        <div className="cbt-sheet-head">Question palette</div>
                        <div className="cbt-omr-pills">
                            {OMR_ANSWERS.map((_, i) => (
                                <span key={i} className={i < n ? 'is-ans' : i === n ? 'is-cur' : undefined}>
                                    {i + 1}
                                </span>
                            ))}
                        </div>
                        <div className="cbt-saved">
                            {n > 0 && (
                                <span key={n} className="cbt-toast">
                                    <Check className="h-3.5 w-3.5" /> Q{n} saved
                                </span>
                            )}
                        </div>
                    </div>
                    <p className={`cbt-omr-status cbt-omr-status--good${done ? ' is-on' : ''}`}>
                        <b>Marks:</b> the moment the paper is submitted
                    </p>
                </div>
            </div>
            <figcaption>Illustration: the same six answers on an OMR sheet and in a CBT.</figcaption>
        </figure>
    );
}

/* ── Marking lab ───────────────────────────────────────────────────────── */

interface Preset {
    id: string;
    label: string;
    total: number;
    plus: number;
    minus: number;
    minusLabel: string;
    note: string;
    correct: number;
    wrong: number;
}

/** Marking schemes as published for 2026 (see the guide's sources). */
const PRESETS: Preset[] = [
    { id: 'jee', label: 'JEE Main', total: 60, plus: 4, minus: 1, minusLabel: '1', note: 'The 60 multiple-choice questions (20 per subject).', correct: 38, wrong: 10 },
    { id: 'neet', label: 'NEET-UG', total: 180, plus: 4, minus: 1, minusLabel: '1', note: '180 compulsory questions.', correct: 140, wrong: 25 },
    { id: 'cuet', label: 'CUET UG', total: 50, plus: 5, minus: 1, minusLabel: '1', note: 'One 50-question subject paper.', correct: 38, wrong: 7 },
    { id: 'ssc', label: 'SSC CGL', total: 100, plus: 2, minus: 0.5, minusLabel: '0.5', note: 'Tier 1: 100 questions in 60 minutes.', correct: 70, wrong: 18 },
    {
        id: 'gate',
        label: 'GATE',
        total: 30,
        plus: 2,
        minus: 2 / 3,
        minusLabel: '2/3',
        note: 'A sample of 30 two-mark MCQs. Multi-select and numerical questions have no negative marks.',
        correct: 20,
        wrong: 6,
    },
];

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** Animates a number towards its target. */
function useTween(target: number, ms = 500) {
    const [value, setValue] = useState(target);
    const from = useRef(target);
    useEffect(() => {
        if (prefersReducedMotion()) {
            setValue(target);
            from.current = target;
            return;
        }
        const start = from.current;
        const t0 = performance.now();
        let raf = 0;
        const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / ms);
            const v = start + (target - start) * (1 - Math.pow(1 - p, 3));
            setValue(v);
            from.current = v;
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, ms]);
    return value;
}

function Stepper({ label, value, onChange, min, max, tone }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; tone: string }) {
    return (
        <div className="cbt-stepper" style={{ ['--tone' as string]: tone }}>
            <span className="cbt-stepper-label">{label}</span>
            <div className="cbt-stepper-ctl">
                <button type="button" aria-label={`Fewer ${label.toLowerCase()} answers`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
                    <Minus className="h-4 w-4" />
                </button>
                <output aria-live="polite">{value}</output>
                <button type="button" aria-label={`More ${label.toLowerCase()} answers`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function MarkingLab() {
    const [presetId, setPresetId] = useState(PRESETS[0].id);
    const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
    const [correct, setCorrect] = useState(preset.correct);
    const [wrong, setWrong] = useState(preset.wrong);

    const choose = (p: Preset) => {
        setPresetId(p.id);
        setCorrect(p.correct);
        setWrong(p.wrong);
    };

    const blank = preset.total - correct - wrong;
    const earned = correct * preset.plus;
    const lost = wrong * preset.minus;
    const score = earned - lost;
    const max = preset.total * preset.plus;
    const shown = useTween(score);
    const attempted = correct + wrong;
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
    const questionsLost = lost / preset.plus;
    const pct = (v: number) => `${Math.max(0, (v / max) * 100)}%`;

    return (
        <figure className="gd-widget">
            <div className="cbt-lab">
                <div className="cbt-seg" role="tablist" aria-label="Exam">
                    {PRESETS.map((p) => (
                        <button key={p.id} type="button" role="tab" aria-selected={p.id === preset.id} className={p.id === preset.id ? 'is-on' : undefined} onClick={() => choose(p)}>
                            {p.label}
                        </button>
                    ))}
                </div>
                <p className="cbt-lab-rule">
                    <span className="cbt-rule-plus">+{preset.plus} correct</span>
                    <span className="cbt-rule-minus">−{preset.minusLabel} wrong</span>
                    <span className="cbt-rule-zero">0 blank</span>
                </p>
                <p className="cbt-lab-note">{preset.note}</p>

                <div className="cbt-lab-grid">
                    <div className="cbt-lab-steppers">
                        <Stepper label="Correct" value={correct} min={0} max={preset.total - wrong} onChange={setCorrect} tone="#16a34a" />
                        <Stepper label="Wrong" value={wrong} min={0} max={preset.total - correct} onChange={setWrong} tone="#dc2626" />
                        <div className="cbt-stepper cbt-stepper--static">
                            <span className="cbt-stepper-label">Left blank</span>
                            <output>{blank}</output>
                        </div>
                    </div>
                    <div className="cbt-lab-out">
                        <div className="cbt-lab-score">
                            <b>{fmt(Math.round(shown * 100) / 100)}</b>
                            <span>out of {max}</span>
                        </div>
                        <p className="cbt-lab-formula">
                            {correct} × {preset.plus} − {wrong} × {preset.minusLabel} = {fmt(Math.round(score * 100) / 100)}
                        </p>
                        <div className="cbt-lab-bar" aria-hidden="true">
                            <i className="cbt-bar-kept" style={{ width: pct(score) }} />
                            <i className="cbt-bar-lost" style={{ width: pct(lost) }} />
                        </div>
                        <p className="cbt-lab-facts">
                            <span>Accuracy {accuracy}%</span>
                            <span>
                                Negatives cost {fmt(Math.round(lost * 100) / 100)} marks{questionsLost >= 0.5 ? `, about ${fmt(Math.round(questionsLost * 10) / 10)} correct answers’ worth` : ''}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
            <figcaption>In TestoZa these are the test’s marks and negative marks; fractions such as 2/3 are accepted as typed.</figcaption>
        </figure>
    );
}

/* ── Exam day ──────────────────────────────────────────────────────────── */

const STOPS = [
    {
        when: 'The day before',
        title: 'The paper is ready',
        icon: '📄',
        points: [
            'Build it from a PDF or photos with the AI test generator, or upload a full paper with sections and solutions as a JSON file.',
            'Open it with View to see exactly what students will see.',
        ],
    },
    {
        when: 'An hour before',
        title: 'Settings',
        icon: '⚙️',
        points: ['Set the duration and switch the calculator on if the exam allows one.', 'Paid plans: full-screen rule, tab-switch limit, start form, exam window, and whether results show straight away.'],
    },
    {
        when: 'Start time',
        title: 'Go live',
        icon: '▶️',
        points: ['Click Conduct. The test gets its own exam link and leaves public listings.', 'Only you see the results. Share the link in the batch group.'],
    },
    {
        when: 'During the exam',
        title: 'Students write',
        icon: '✍️',
        points: [
            'Progress is kept on each device; signed-in students can resume after a refresh.',
            'A small indicator shows connection drops, and warnings are logged if a student leaves full screen or switches tabs.',
        ],
    },
    {
        when: 'Time’s up',
        title: 'The paper locks',
        icon: '⏱️',
        points: ['Answering stops when the clock reaches zero.', 'A “Time’s Up!” message asks the student to submit their answers.'],
    },
    {
        when: 'Straight after',
        title: 'Results',
        icon: '📊',
        points: [
            'Scores are calculated on the server. Students see their analysis at once, or a “submitted” screen if you hold results.',
            'You get the rank list, section and topic breakdowns, time per question and, on paid plans, an Excel export.',
        ],
    },
];

function ExamDay() {
    const { ref, on } = useOnScreen<HTMLElement>(0.35);
    const trackRef = useRef<HTMLDivElement>(null);
    const [stop, setStop] = useState(0);
    const [touched, setTouched] = useState(false);
    const fromScroll = useRef(false);

    // Play through the day once in view, until the reader takes over.
    useEffect(() => {
        if (!on || touched || prefersReducedMotion()) return;
        const id = window.setInterval(() => setStop((s) => (s + 1) % STOPS.length), 3400);
        return () => window.clearInterval(id);
    }, [on, touched]);

    // Keep the cards in step with the slider.
    useEffect(() => {
        if (fromScroll.current) {
            fromScroll.current = false;
            return;
        }
        const track = trackRef.current;
        const card = track?.children[stop] as HTMLElement | undefined;
        if (track && card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, [stop]);

    // Swiping the cards moves the slider.
    const onScroll = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const cards = Array.from(track.children) as HTMLElement[];
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        cards.forEach((c, i) => {
            if (Math.abs(c.offsetLeft - track.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(cards[best].offsetLeft - track.offsetLeft + cards[best].offsetWidth / 2 - mid)) best = i;
        });
        if (best !== stop) {
            fromScroll.current = true;
            setStop(best);
        }
    }, [stop]);

    const go = (i: number) => {
        setTouched(true);
        setStop(Math.max(0, Math.min(STOPS.length - 1, i)));
    };

    return (
        <figure className="gd-widget" ref={ref}>
            <div className="cbt-day">
                <div className="cbt-day-rail">
                    <button type="button" className="cbt-day-nav" aria-label="Previous step" onClick={() => go(stop - 1)} disabled={stop === 0}>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="cbt-day-slider">
                        <input
                            type="range"
                            min={0}
                            max={STOPS.length - 1}
                            step={1}
                            value={stop}
                            aria-label="Exam day step"
                            aria-valuetext={`${STOPS[stop].when}: ${STOPS[stop].title}`}
                            onChange={(e) => go(Number(e.target.value))}
                            style={{ ['--p' as string]: `${(stop / (STOPS.length - 1)) * 100}%` }}
                        />
                        <div className="cbt-day-ticks" aria-hidden="true">
                            {STOPS.map((s, i) => (
                                <span key={s.when} className={i <= stop ? 'is-past' : undefined} />
                            ))}
                        </div>
                    </div>
                    <button type="button" className="cbt-day-nav" aria-label="Next step" onClick={() => go(stop + 1)} disabled={stop === STOPS.length - 1}>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <div className="cbt-day-track" ref={trackRef} onScroll={onScroll} onPointerDown={() => setTouched(true)}>
                    {STOPS.map((s, i) => (
                        <article key={s.when} className={`cbt-day-card${i === stop ? ' is-on' : ''}`} aria-current={i === stop ? 'step' : undefined}>
                            <div className="cbt-day-top">
                                <span className="cbt-day-icon" aria-hidden="true">
                                    {s.icon}
                                </span>
                                <span className="cbt-day-when">
                                    {i + 1} · {s.when}
                                </span>
                            </div>
                            <h3>{s.title}</h3>
                            <ul>
                                {s.points.map((p) => (
                                    <li key={p}>{p}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </div>
            <figcaption>Drag the slider or swipe the cards. Paid-plan settings are marked as such.</figcaption>
        </figure>
    );
}

export default function CbtWidget({ name }: { name: GuideWidgetName }) {
    if (name === 'omr-to-cbt') return <OmrToCbt />;
    if (name === 'marking-lab') return <MarkingLab />;
    if (name === 'exam-day') return <ExamDay />;
    return null;
}
