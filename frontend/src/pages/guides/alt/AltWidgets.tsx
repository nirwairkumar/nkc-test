/**
 * The four widgets the "alternative" guides share. One component each, driven by the
 * AltRival for the page (src/guides/altData.ts), so /classplus-alternative and
 * /kahoot-alternative run the same code with different text:
 *
 *   alt-fit      what you use the other product for → keep it, move the exams, or switch
 *   alt-compare  one question at a time: their answer, ours, and what it costs you
 *   alt-marking  one question scored their way and scored your exam's way
 *   alt-move     moving one paper across, as a checklist with the clock running
 *
 * Crawlers get each widget's fallbackHtml from the guide file instead, written from the
 * same data, so the text Google reads matches what a reader sees.
 *
 * Size: these are reading pages, so every widget is a card the width of the text column
 * (the compare and marking widgets take .al-wide, up to 1000px) and no taller than
 * --al-fit-h, scrolling inside that. Nothing here opens full screen, nothing animates on
 * a loop, and no type is larger than the H2 above it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    type LucideIcon,
    Check,
    Info,
    Lightbulb,
    RotateCw,
    ShieldCheck,
    Sparkles,
    X,
    Zap,
} from 'lucide-react';
import type { GuideWidget } from '@/guides/types';
import { type AltRival, LAB_QUESTION, SCHEMES, type Verdict, mark, speedPoints } from '@/guides/altData';
import AltIcon from './AltIcon';

/** iOS switch (51 × 31), as on the other guides. */
function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} className="al-switch" onClick={() => onChange(!checked)}>
            <i />
        </button>
    );
}

// ── alt-fit ─────────────────────────────────────────────────────────────────

function verdictOf(core: number, exam: number): Verdict {
    if (!core && !exam) return 'none';
    if (!core) return 'switch';
    if (core >= 3 || !exam) return 'keep';
    return 'split';
}

const VERDICT_ICON: Record<Verdict, LucideIcon> = { none: Info, keep: ShieldCheck, split: Sparkles, switch: Zap };

function FitWidget({ rival }: { rival: AltRival }) {
    const first = rival.uses.find((u) => u.kind === 'core')!.id;
    const exams = rival.uses.filter((u) => u.kind === 'exam');
    const [on, setOn] = useState<Record<string, boolean>>({ [first]: true, [exams[0].id]: true, [exams[1].id]: true });

    const core = rival.uses.filter((u) => u.kind === 'core' && on[u.id]);
    const exam = rival.uses.filter((u) => u.kind === 'exam' && on[u.id]);
    const verdict = verdictOf(core.length, exam.length);
    const v = rival.verdicts[verdict];
    const VIcon = VERDICT_ICON[verdict];

    const group = (kind: 'core' | 'exam', title: string, hint: string) => (
        <div>
            <p className="al-rows-label">
                <b>{title}</b>
                <span>{hint}</span>
            </p>
            <ul className="al-rows">
                {rival.uses
                    .filter((u) => u.kind === kind)
                    .map((u) => (
                        <li key={u.id}>
                            <span className="al-tile" data-tone={u.tone} aria-hidden="true">
                                <AltIcon name={u.icon} strokeWidth={2.2} />
                            </span>
                            <label htmlFor={`al-use-${u.id}`}>{u.label}</label>
                            <Switch id={`al-use-${u.id}`} label={u.label} checked={!!on[u.id]} onChange={(val) => setOn((o) => ({ ...o, [u.id]: val }))} />
                        </li>
                    ))}
            </ul>
        </div>
    );

    return (
        <figure className="al-widget">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">What do you use {rival.name} for?</p>
                        <p className="al-panel-sub">Switch on what your week actually looks like.</p>
                    </div>
                </div>
                <div className="al-wbody">
                    <div className="al-split">
                        {group('core', `What ${rival.name} is for`, `${core.length} on`)}
                        {group('exam', 'The testing part', `${exam.length} on`)}
                    </div>
                    <div className="al-verdict" data-tone={verdict} aria-live="polite">
                        <h4>
                            <VIcon aria-hidden="true" /> {v.title}
                        </h4>
                        <p>{v.text}</p>
                        {verdict !== 'none' && (
                            <p className="al-verdict-count">
                                <b>{core.length}</b> of {rival.uses.filter((u) => u.kind === 'core').length} things {rival.name} is for, <b>{exam.length}</b> of{' '}
                                {exams.length} testing jobs.
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <figcaption>
                Nobody should move software they are using properly. This is the first question, and for plenty of institutes the answer is “keep what you have”.
            </figcaption>
        </figure>
    );
}

// ── alt-compare ─────────────────────────────────────────────────────────────

function CompareWidget({ rival }: { rival: AltRival }) {
    const [i, setI] = useState(0);
    const theme = rival.themes[i];
    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">{rival.name} and TestoZa, question by question</p>
                        <p className="al-panel-sub">Pick what you want to know.</p>
                    </div>
                </div>
                <div className="al-chips" role="group" aria-label="What to compare">
                    {rival.themes.map((t, n) => (
                        <button key={t.id} type="button" aria-pressed={n === i} onClick={() => setI(n)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="al-wbody">
                    <p className="al-vs-q">{theme.question}</p>
                    <div className="al-vs" key={theme.id}>
                        <div className="al-vs-card" data-side="them">
                            <h4>
                                <X aria-hidden="true" /> {rival.name}
                            </h4>
                            <ul className="al-vs-list">
                                {theme.them.map((line, n) => (
                                    <li key={n} dangerouslySetInnerHTML={{ __html: line }} />
                                ))}
                            </ul>
                        </div>
                        <div className="al-vs-card al-vs-card--us" data-side="us">
                            <h4>
                                <Check aria-hidden="true" /> TestoZa
                            </h4>
                            <ul className="al-vs-list">
                                {theme.us.map((line, n) => (
                                    <li key={n} dangerouslySetInnerHTML={{ __html: line }} />
                                ))}
                            </ul>
                        </div>
                    </div>
                    <p className="al-vs-takeaway">
                        <Lightbulb aria-hidden="true" />
                        <span>
                            <b>What it means for you. </b>
                            {theme.takeaway}
                        </span>
                    </p>
                </div>
            </div>
            <figcaption>
                {rival.name} facts are from its own pages, checked on 10 October 2026. Prices and plan limits change; where a figure is only published by listing
                sites, it is described as that rather than quoted as fact.
            </figcaption>
        </figure>
    );
}

// ── alt-marking ─────────────────────────────────────────────────────────────

/** The clock for Kahoot-style scoring: 20 seconds, counted in tenths. */
const TICK = 100;

function MarkingWidget({ rival }: { rival: AltRival }) {
    const { scoring } = rival;
    const limit = scoring.seconds ?? 0;
    const [schemeI, setSchemeI] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);
    const [left, setLeft] = useState(limit);
    const timer = useRef<number | null>(null);
    const scheme = SCHEMES[schemeI];
    const right = picked === LAB_QUESTION.correct;

    const stop = useCallback(() => {
        if (timer.current !== null) {
            window.clearInterval(timer.current);
            timer.current = null;
        }
    }, []);

    // The clock runs only while the question is unanswered, and only for speed scoring.
    useEffect(() => {
        if (scoring.kind !== 'speed' || picked) {
            stop();
            return;
        }
        timer.current = window.setInterval(() => setLeft((s) => Math.max(0, Math.round((s - TICK / 1000) * 10) / 10)), TICK);
        return stop;
    }, [picked, scoring.kind, stop]);

    const reset = () => {
        setPicked(null);
        setLeft(limit);
    };

    const theirs = !picked
        ? null
        : scoring.kind === 'speed'
          ? right
              ? speedPoints(left, limit, scoring.best)
              : 0
          : right
            ? scoring.best
            : 0;
    const ours = !picked ? null : right ? scheme.right : -scheme.wrong;

    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">The same answer, scored two ways</p>
                        <p className="al-panel-sub">Answer the question. Right or wrong, both are worth trying.</p>
                    </div>
                    <div className="al-demo-controls">
                        <div className="al-seg" style={{ ['--n' as string]: SCHEMES.length, ['--i' as string]: schemeI }} role="group" aria-label="Marking scheme">
                            {SCHEMES.map((s, n) => (
                                <button key={s.id} type="button" aria-pressed={n === schemeI} onClick={() => setSchemeI(n)}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="al-restart" onClick={reset}>
                            <RotateCw aria-hidden="true" /> <span>Again</span>
                        </button>
                    </div>
                </div>

                <div className="al-wbody">
                    <div className="al-lab">
                        <div className="al-screen al-qcard">
                            {scoring.kind === 'speed' && (
                                <div className="al-clock">
                                    <p className="al-clock-read">
                                        <span>Worth now</span>
                                        <b>{picked ? (right ? theirs : 0) : speedPoints(left, limit, scoring.best)} pts</b>
                                    </p>
                                    <div className="al-clock-bar">
                                        <i style={{ transform: `scaleX(${limit ? left / limit : 0})` }} />
                                    </div>
                                </div>
                            )}
                            <div className="al-qcard-top">
                                <b>{LAB_QUESTION.subject}</b>
                                <span className="al-qcard-marks">
                                    +{mark(scheme.right)} / {scheme.wrong ? `−${mark(scheme.wrong)}` : '0'}
                                </span>
                            </div>
                            <p className="al-qcard-q">{LAB_QUESTION.text}</p>
                            <div className="al-opts">
                                {LAB_QUESTION.options.map((o) => {
                                    const chosen = picked === o.key;
                                    const verdict = !picked || !chosen ? undefined : o.key === LAB_QUESTION.correct ? 'right' : 'wrong';
                                    return (
                                        <button
                                            key={o.key}
                                            type="button"
                                            data-key={o.key}
                                            data-verdict={verdict}
                                            aria-pressed={chosen}
                                            onClick={() => setPicked(o.key)}
                                        >
                                            <i>{o.key}</i>
                                            <span>{o.text}</span>
                                            {verdict === 'right' && <Check aria-hidden="true" />}
                                            {verdict === 'wrong' && <X aria-hidden="true" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="al-score" aria-live="polite">
                            <div className="al-score-tile" data-side="them">
                                <p>
                                    <X aria-hidden="true" /> {scoring.label}
                                </p>
                                <p className="al-score-value">
                                    <span key={`t${theirs}`}>{theirs === null ? '—' : theirs}</span>
                                    <small>{scoring.kind === 'speed' ? 'points' : theirs === 1 ? 'mark' : 'marks'}</small>
                                </p>
                                <p className="al-score-why">{picked ? (right ? scoring.rightWhy : scoring.wrongWhy) : 'Pick an option to see both numbers.'}</p>
                            </div>
                            <div className="al-score-tile" data-side="us">
                                <p>
                                    <Check aria-hidden="true" /> TestoZa · {scheme.full}
                                </p>
                                <p className="al-score-value" data-sign={ours !== null && ours < 0 ? 'minus' : undefined}>
                                    <span key={`o${ours}`}>{ours === null ? '—' : mark(ours)}</span>
                                    <small>{Math.abs(ours ?? 0) === 1 ? 'mark' : 'marks'}</small>
                                </p>
                                <p className="al-score-why">
                                    {picked
                                        ? right
                                            ? `+${mark(scheme.right)} for a correct answer. ${scheme.note}`
                                            : scheme.wrong
                                              ? `−${mark(scheme.wrong)} for a wrong tick, where a blank would have been 0. ${scheme.note}`
                                              : `Nothing off on this scheme. ${scheme.note}`
                                        : 'The marks you typed on the question, and nothing else.'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="al-wfoot">
                        <Info aria-hidden="true" />
                        <span>
                            <b>Why this matters. </b>
                            Under +4/−1, four wrong guesses wipe out a correct answer. Under scoring with no penalty, guessing is free — so students who practise there
                            arrive at the real exam with the wrong instinct.
                        </span>
                    </p>
                </div>
            </div>
            <figcaption>
                {scoring.kind === 'speed'
                    ? 'The points on the left follow Kahoot’s published formula: 1 − (time taken ÷ time limit) ÷ 2, times the points possible.'
                    : 'The marks on the right are the two numbers on a TestoZa question card: Marks and Wrong.'}
            </figcaption>
        </figure>
    );
}

// ── alt-move ────────────────────────────────────────────────────────────────

function MoveWidget({ rival }: { rival: AltRival }) {
    const [done, setDone] = useState<Record<string, boolean>>({});
    const total = rival.steps.length;
    const count = rival.steps.filter((s) => done[s.id]).length;
    const minutes = rival.steps.filter((s) => !done[s.id]).reduce((a, s) => a + s.minutes, 0);
    const r = 35;
    const c = 2 * Math.PI * r;

    return (
        <figure className="al-widget">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">Moving one paper across</p>
                        <p className="al-panel-sub">Tick them off as you go. This is the whole job.</p>
                    </div>
                </div>
                <div className="al-wbody">
                    <div className="al-move">
                        <ul className="al-todo">
                            {rival.steps.map((s) => (
                                <li key={s.id}>
                                    <button type="button" aria-pressed={!!done[s.id]} onClick={() => setDone((d) => ({ ...d, [s.id]: !d[s.id] }))}>
                                        <i>
                                            <Check aria-hidden="true" />
                                        </i>
                                        <span className="al-todo-text">
                                            <b>{s.title}</b>
                                            <span>{s.detail}</span>
                                        </span>
                                        <span className="al-todo-mins">{s.minutes} min</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="al-done">
                            <div className="al-done-ring">
                                <svg viewBox="0 0 84 84" aria-hidden="true">
                                    <circle className="bg" cx="42" cy="42" r={r} />
                                    <circle className="fg" cx="42" cy="42" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - count / total)} />
                                </svg>
                                <b>
                                    {count}/{total}
                                </b>
                            </div>
                            <p aria-live="polite">
                                {count === total ? (
                                    <>
                                        <b>Done</b>That was the migration.
                                    </>
                                ) : (
                                    <>
                                        <b>{minutes} min left</b>
                                        {count ? 'Keep going.' : 'One paper, start to finish.'}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <figcaption>
                Minutes are an honest estimate for a 30-question paper you already have, including reading every question once before it goes live.
            </figcaption>
        </figure>
    );
}

export default function AltWidget({ name, rival }: { name: GuideWidget; rival: AltRival }) {
    switch (name) {
        case 'alt-fit':
            return <FitWidget rival={rival} />;
        case 'alt-compare':
            return <CompareWidget rival={rival} />;
        case 'alt-marking':
            return <MarkingWidget rival={rival} />;
        case 'alt-move':
            return <MoveWidget rival={rival} />;
        default:
            return null;
    }
}
