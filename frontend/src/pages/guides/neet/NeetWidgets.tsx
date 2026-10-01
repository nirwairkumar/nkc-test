/**
 * Interactive parts of /neet-online-test-software. Crawlers get each widget's
 * fallbackHtml from src/guides/neetOnlineTestSoftware.ts instead.
 *
 *   neet-time-planner    split the three hours between subjects (iOS sliders)
 *   neet-exam-demo       ExamDemo.tsx: a playable six-question mini-mock
 *   neet-ai-import       AiImportDemo.tsx: the AI processing screen, replayed
 *   neet-batch-audit     the teacher's analysis page (FullTestAnalysisPage.tsx)
 *   neet-score-lab       NEET score and the expected value of guessing
 *   neet-student-result  the student's results page (ResultsPage.tsx)
 *
 * Example batch and student numbers are illustrative; NEET 2026 figures come from
 * NTA's result press release of 16 July 2026.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { BarChart2, CheckCircle2, ChevronRight, Clock, Award, Eye, HelpCircle, Lock, Target, Users, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuideWidget } from '@/guides/types';
import AiImportDemo from './AiImportDemo';
import ExamDemo from './ExamDemo';
import ResultsScreen, { type ResultSection } from './ResultsScreen';

// ── Shared iOS controls ─────────────────────────────────────────────────────

function Segmented<T extends string | number>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    return (
        <div className="ng-seg" role="group" aria-label={label} style={{ '--n': options.length, '--i': i } as CSSProperties}>
            {options.map((o) => (
                <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Slider({
    id,
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    output,
    color,
    marker,
}: {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    output: ReactNode;
    color?: string;
    /** A tick on the track, e.g. the break-even point. */
    marker?: { at: number; label: string };
}) {
    const p = ((value - min) / (max - min)) * 100;
    return (
        <div className="ng-slider">
            <div className="ng-slider-top">
                <label htmlFor={id}>
                    {color && <i style={{ '--dot': color } as CSSProperties} />}
                    {label}
                </label>
                <output htmlFor={id}>{output}</output>
            </div>
            <div className="ng-range-wrap">
                <input
                    id={id}
                    className="ng-range"
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={{ '--p': `${p}%`, '--fill': color } as CSSProperties}
                />
                {marker && (
                    <span className="ng-range-mark" style={{ left: `calc(13px + (100% - 26px) * ${(marker.at - min) / (max - min)})` }} aria-hidden="true">
                        <i />
                        <small>{marker.label}</small>
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Time planner ────────────────────────────────────────────────────────────

type Subject = 'bio' | 'chem' | 'phy';
const SUBJECTS: Record<Subject, { name: string; questions: number; color: string }> = {
    bio: { name: 'Biology', questions: 90, color: 'var(--ng-biology)' },
    chem: { name: 'Chemistry', questions: 45, color: 'var(--ng-chemistry)' },
    phy: { name: 'Physics', questions: 45, color: 'var(--ng-physics)' },
};
const ORDERS: { value: number; label: string; order: Subject[] }[] = [
    { value: 0, label: 'Biology first', order: ['bio', 'chem', 'phy'] },
    { value: 1, label: 'Physics first', order: ['phy', 'chem', 'bio'] },
    { value: 2, label: 'Chemistry first', order: ['chem', 'bio', 'phy'] },
];

const clockAt = (minutesAfterTwo: number) => {
    const total = 14 * 60 + Math.round(minutesAfterTwo);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')}`;
};

function TimePlanner() {
    const [budget, setBudget] = useState(180);
    const [orderIdx, setOrderIdx] = useState(0);
    const [mins, setMins] = useState<Record<Subject, number>>({ bio: 75, chem: 45, phy: 50 });
    const order = ORDERS[orderIdx].order;
    const used = mins.bio + mins.chem + mins.phy;
    const spare = budget - used;
    const parts = [...order.map((k) => ({ key: k as Subject | 'review', minutes: mins[k] })), { key: 'review' as const, minutes: Math.max(0, spare) }];
    const scale = Math.max(budget, used);
    let at = 0;
    const blocks = parts.map((part) => {
        const block = { ...part, start: at };
        at += part.minutes;
        return block;
    });

    return (
        <figure className="ng-widget">
            <div className="ng-panel">
                <div className="ng-panel-head">
                    <div>
                        <p className="ng-panel-title">Plan your three hours</p>
                        <p className="ng-panel-sub">The paper starts at 2:00 p.m. Move the sliders.</p>
                    </div>
                    <Segmented<number>
                        label="Exam length"
                        value={budget}
                        onChange={setBudget}
                        options={[
                            { value: 180, label: '3 h' },
                            { value: 195, label: '3 h 15 min' },
                        ]}
                    />
                </div>

                <div className="ng-plan" aria-hidden="true">
                    <div className="ng-plan-bar">
                        {blocks.map((b) =>
                            b.minutes > 0 ? (
                                <span
                                    key={b.key}
                                    className={b.key === 'review' ? 'is-review' : undefined}
                                    style={{ flexGrow: b.minutes, '--c': b.key === 'review' ? undefined : SUBJECTS[b.key].color } as CSSProperties}
                                >
                                    <b>{b.key === 'review' ? 'Review' : SUBJECTS[b.key].name}</b>
                                    <small>{b.minutes} min</small>
                                </span>
                            ) : null,
                        )}
                    </div>
                    <div className="ng-plan-ticks">
                        {blocks
                            .filter((b, i) => {
                                // A label too close to the next one (or to the end) would collide with it.
                                const next = blocks[i + 1]?.start ?? scale;
                                return b.minutes > 0 && (next - b.start) / scale >= 0.08;
                            })
                            .map((b) => (
                                <span key={b.key} style={{ left: `${(b.start / scale) * 100}%` }}>
                                    {clockAt(b.start)}
                                </span>
                            ))}
                        <span style={{ left: '100%' }} className="is-end">
                            {clockAt(scale)}
                        </span>
                    </div>
                </div>

                <div className="ng-plan-order">
                    <Segmented<number> label="Order" value={orderIdx} onChange={setOrderIdx} options={ORDERS.map(({ value, label }) => ({ value, label }))} />
                </div>

                <div className="ng-plan-sliders">
                    {order.map((k) => {
                        const s = SUBJECTS[k];
                        const perQ = Math.round((mins[k] * 60) / s.questions);
                        return (
                            <Slider
                                key={k}
                                id={`ng-plan-${k}`}
                                label={`${s.name} · ${s.questions} questions`}
                                color={s.color}
                                value={mins[k]}
                                min={20}
                                max={120}
                                step={5}
                                onChange={(v) => setMins((m) => ({ ...m, [k]: v }))}
                                output={
                                    <>
                                        {mins[k]} min<small>{perQ} s a question</small>
                                    </>
                                }
                            />
                        );
                    })}
                </div>

                <div className={cn('ng-plan-sum', spare < 0 && 'is-over')} role="status">
                    {spare >= 0 ? (
                        <>
                            <b>{spare} min</b> left to revisit questions marked for review{spare < 5 ? '. That’s tight.' : '.'}
                        </>
                    ) : (
                        <>
                            <b>{-spare} min over.</b> Take time from a subject you’re faster at.
                        </>
                    )}
                </div>
            </div>
            <figcaption>An average of 60 seconds a question. Many students give Biology less and Physics more.</figcaption>
        </figure>
    );
}

// ── Score lab ───────────────────────────────────────────────────────────────

/** NEET (UG) 2026, from NTA's result press release of 16 July 2026. */
const NTA_2026: [number, string][] = [
    [700, 'Only 19 candidates scored above 700 in NEET 2026.'],
    [650, '1,492 candidates scored 650 or more in NEET 2026.'],
    [600, '10,160 candidates scored 600 or more in NEET 2026.'],
    [500, '90,780 candidates scored 500 or more in NEET 2026.'],
];

function binomialBelow(n: number, p: number, limit: number) {
    // P(K < limit) for K ~ Binomial(n, p)
    let total = 0;
    let coeff = 1;
    for (let k = 0; k <= n; k++) {
        if (k > 0) coeff = (coeff * (n - k + 1)) / k;
        if (k < limit) total += coeff * p ** k * (1 - p) ** (n - k);
    }
    return Math.min(1, Math.max(0, total));
}

function Ring({ value, max }: { value: number; max: number }) {
    const r = 52;
    const c = 2 * Math.PI * r;
    const f = Math.max(0, Math.min(1, value / max));
    return (
        <svg className="ng-ring-lg" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={r} className="bg" />
            <circle cx="60" cy="60" r={r} className="fg" strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
        </svg>
    );
}

function ScoreLab() {
    const [tab, setTab] = useState<'score' | 'guess'>('score');
    const [attempted, setAttempted] = useState(168);
    const [accuracy, setAccuracy] = useState(91);
    const [unsure, setUnsure] = useState(20);
    const [ruled, setRuled] = useState(0);
    const [hit, setHit] = useState(25);

    const right = Math.round((attempted * accuracy) / 100);
    const wrong = attempted - right;
    const blank = 180 - attempted;
    const score = 4 * right - wrong;
    const context = NTA_2026.find(([min]) => (min === 700 ? score > 700 : score >= min))?.[1] ?? 'Below 500: 90,780 candidates scored 500 or more in NEET 2026.';

    const p = hit / 100;
    const expected = unsure * (5 * p - 1);
    const loseChance = useMemo(() => binomialBelow(unsure, p, unsure / 5), [unsure, p]);
    const pickRuled = (v: number) => {
        setRuled(v);
        setHit(Math.round(100 / (4 - v)));
    };

    return (
        <figure className="ng-widget">
            <div className="ng-panel">
                <div className="ng-panel-head">
                    <Segmented<'score' | 'guess'>
                        label="Calculator"
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'score', label: 'Your score' },
                            { value: 'guess', label: 'Should you guess?' },
                        ]}
                    />
                </div>

                {tab === 'score' ? (
                    <div className="ng-lab">
                        <div className="ng-lab-dial">
                            <Ring value={Math.max(0, score)} max={720} />
                            <div className="ng-lab-dial-in" aria-live="polite">
                                <b>{score}</b>
                                <span>out of 720</span>
                            </div>
                        </div>
                        <div className="ng-lab-controls">
                            <Slider id="ng-att" label="Questions attempted" value={attempted} min={0} max={180} onChange={setAttempted} output={<>{attempted}<small>of 180</small></>} />
                            <Slider id="ng-acc" label="Accuracy" value={accuracy} min={0} max={100} onChange={setAccuracy} output={<>{accuracy}%<small>{right} right</small></>} color="var(--ng-green)" />
                            <dl className="ng-lab-rows">
                                <div>
                                    <dt>Right</dt>
                                    <dd>
                                        {right} × 4 = <b className="is-plus">+{4 * right}</b>
                                    </dd>
                                </div>
                                <div>
                                    <dt>Wrong</dt>
                                    <dd>
                                        {wrong} × −1 = <b className="is-minus">−{wrong}</b>
                                    </dd>
                                </div>
                                <div>
                                    <dt>Left blank</dt>
                                    <dd>
                                        {blank} × 0 = <b>0</b>
                                    </dd>
                                </div>
                            </dl>
                            <p className="ng-lab-note">{context} Every wrong answer turned right adds 5 marks.</p>
                        </div>
                    </div>
                ) : (
                    <div className="ng-lab ng-lab--guess">
                        <div className="ng-lab-big" aria-live="polite">
                            <b className={expected > 0.05 ? 'is-plus' : expected < -0.05 ? 'is-minus' : undefined}>
                                {expected > 0 ? '+' : expected < 0 ? '−' : ''}
                                {Math.abs(expected).toFixed(1)}
                            </b>
                            <span>marks on average from these {unsure} answers</span>
                            <p>
                                {expected > 0.05 ? 'Answering pays on average.' : expected < -0.05 ? 'Leaving them blank is better.' : 'About break-even.'} Chance they cost you marks this time:{' '}
                                <strong>{Math.round(loseChance * 100)}%</strong>.
                            </p>
                        </div>
                        <div className="ng-lab-controls">
                            <Slider id="ng-unsure" label="Questions you’re unsure about" value={unsure} min={1} max={40} onChange={setUnsure} output={unsure} />
                            <div className="ng-lab-field">
                                <span>Options you can rule out</span>
                                <Segmented<number>
                                    label="Options you can rule out"
                                    value={ruled}
                                    onChange={pickRuled}
                                    options={[
                                        { value: 0, label: 'None' },
                                        { value: 1, label: 'One' },
                                        { value: 2, label: 'Two' },
                                    ]}
                                />
                            </div>
                            <Slider
                                id="ng-hit"
                                label="How often you’re right on them"
                                value={hit}
                                min={0}
                                max={100}
                                onChange={setHit}
                                output={`${hit}%`}
                                color={hit >= 20 ? 'var(--ng-green)' : 'var(--ng-red)'}
                                marker={{ at: 20, label: 'Break-even' }}
                            />
                            <p className="ng-lab-note">
                                Each answer is worth 4p − (1 − p) marks on average, where p is your chance of being right. Picking at random gives p = {Math.round(100 / (4 - ruled))}% here. Your real rate on doubtful questions may be lower: wrong options are written to be tempting.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <figcaption>NEET marking: +4 for a right answer, −1 for a wrong one, 0 for a blank.</figcaption>
        </figure>
    );
}

// ── Batch analysis (FullTestAnalysisPage) ───────────────────────────────────

interface AuditQ {
    qNum: number;
    topic: string;
    text: string;
    accuracyPct: number;
    avgTimeSeconds: number;
    discriminationIndex: number;
    dist: Record<'A' | 'B' | 'C' | 'D', number>;
}

const AUDIT: AuditQ[] = [
    {
        qNum: 118,
        topic: 'Body Fluids and Circulation',
        text: 'Which one of the following statements about human blood is incorrect?',
        accuracyPct: 34,
        avgTimeSeconds: 48,
        discriminationIndex: 0.41,
        dist: { A: 6, B: 52, C: 8, D: 34 },
    },
    {
        qNum: 64,
        topic: 'Chemical Bonding and Molecular Structure',
        text: 'Match List-I with List-II (molecules BeCl₂, BF₃, CH₄, PCl₅ and their shapes).',
        accuracyPct: 81,
        avgTimeSeconds: 41,
        discriminationIndex: 0.22,
        dist: { A: 81, B: 7, C: 9, D: 3 },
    },
    {
        qNum: 27,
        topic: 'Motion in a Plane',
        text: 'A projectile is fired at 30° to the horizontal with a speed of 40 m s⁻¹. Its time of flight is (g = 10 m s⁻²):',
        accuracyPct: 46,
        avgTimeSeconds: 94,
        discriminationIndex: 0.38,
        dist: { A: 18, B: 46, C: 21, D: 9 },
    },
    {
        qNum: 142,
        topic: 'Human Reproduction',
        text: 'Given below are two statements: Statement I: Fertilisation in humans takes place in the ampullary region of the fallopian tube. Statement II: The corpus luteum secretes large amounts of progesterone.',
        accuracyPct: 58,
        avgTimeSeconds: 63,
        discriminationIndex: -0.08,
        dist: { A: 22, B: 58, C: 12, D: 6 },
    },
];

/** FullTestAnalysisPage labels a question by its accuracy when no difficulty is set. */
const difficultyOf = (acc: number) => (acc >= 75 ? 'Easy' : acc >= 40 ? 'Medium' : 'Hard');

function BatchAudit() {
    const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
    const [modal, setModal] = useState<AuditQ | null>(null);
    const toggle = (i: number) =>
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });

    const tile = (label: string, Icon: typeof Users, iconClass: string, value: ReactNode, sub: ReactNode, extra = '') => (
        <div className={cn('bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between transition-all', extra)}>
            <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5 shrink-0', iconClass)} />
            </div>
            <div>
                {value}
                {sub}
            </div>
        </div>
    );

    return (
        <figure className="ng-widget ng-wide">
            <div className="ng-window">
                <div className="ng-window-bar" aria-hidden="true">
                    <div className="ng-window-lights">
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="ng-window-url">
                        <Lock /> testoza.com/test-analysis
                    </div>
                </div>
                <div className="ng-screen relative bg-slate-50 p-3 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {tile(
                            'Total Students',
                            Users,
                            'text-indigo-600',
                            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">86</p>,
                            <p className="text-[10px] sm:text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 84 Completed
                            </p>,
                        )}
                        {tile(
                            'Avg Score',
                            BarChart2,
                            'text-blue-600',
                            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                412 <span className="text-xs font-bold text-slate-400">/ 720</span>
                            </p>,
                            <p className="text-[10px] sm:text-xs font-medium text-slate-600 mt-1">
                                Median: <strong>405</strong>
                            </p>,
                        )}
                        {tile(
                            'High / Low',
                            Award,
                            'text-amber-600',
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">668</span>
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500">/ 141</span>
                            </div>,
                            <p className="text-[10px] sm:text-xs font-medium text-slate-600 mt-1">
                                Max: <strong>720</strong>
                            </p>,
                        )}
                        {tile(
                            'Avg Time',
                            Clock,
                            'text-violet-600',
                            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">2h 41m</p>,
                            <p className="text-[10px] sm:text-xs font-medium text-slate-600 mt-1">
                                Completion: <strong>97.7%</strong>
                            </p>,
                        )}
                        {tile(
                            'Avg Accuracy',
                            Target,
                            'text-emerald-600',
                            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">61.4%</p>,
                            <p className="text-[10px] sm:text-xs font-medium text-slate-600 mt-1">
                                Attempts: <strong>86</strong>
                            </p>,
                            'col-span-2 sm:col-span-1',
                        )}
                    </div>

                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-amber-600" />
                                    Item Response &amp; Distractor Misconception Audit
                                </h3>
                                <p className="text-xs text-slate-400">Reveals which option distractors trapped students and highlights flawed questions</p>
                            </div>
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl shrink-0 self-start sm:self-auto">180 Questions Evaluated</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {AUDIT.map((q, idx) => {
                                const difficulty = difficultyOf(q.accuracyPct);
                                const expanded = open.has(idx);
                                return (
                                    <div key={q.qNum}>
                                        <button
                                            type="button"
                                            aria-expanded={expanded}
                                            onClick={() => toggle(idx)}
                                            className="w-full text-left flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors group select-none"
                                        >
                                            <ChevronRight className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200', expanded && 'rotate-90')} />
                                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0 min-w-[52px] text-center">Q#{q.qNum}</span>
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0',
                                                    difficulty === 'Easy'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : difficulty === 'Medium'
                                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                          : 'bg-rose-50 text-rose-700 border-rose-200',
                                                )}
                                            >
                                                {difficulty}
                                            </span>
                                            <span className="flex-1 text-xs text-slate-700 font-medium truncate min-w-0">{q.text}</span>
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                                                    q.accuracyPct >= 70 ? 'bg-emerald-50 text-emerald-700' : q.accuracyPct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700',
                                                )}
                                            >
                                                {q.accuracyPct}%
                                            </span>
                                        </button>
                                        {expanded && (
                                            <div className="px-4 sm:px-10 pb-4 pt-2 bg-slate-50/60 border-t border-slate-100 space-y-3">
                                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{q.text}</p>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Topic: {q.topic}</p>
                                                <div className="space-y-2 pt-1">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-500 font-semibold">Option Breakdown:</span>
                                                        <span className="text-slate-700 font-bold">Accuracy: {q.accuracyPct}%</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                                            <div key={opt} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                                                                <div className="text-[10px] text-slate-400 font-semibold mb-1">{opt}</div>
                                                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                                                                    <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${q.dist[opt]}%` }} />
                                                                </div>
                                                                <strong className="text-xs text-slate-800">{q.dist[opt]}%</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-1 gap-2">
                                                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                                                        <span>
                                                            Avg Time: <strong className="text-slate-600">{q.avgTimeSeconds}s</strong>
                                                        </span>
                                                        <span>
                                                            Discrim: <strong className="text-slate-600">{q.discriminationIndex}</strong>
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setModal(q)}
                                                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 px-3 text-xs border-slate-200 text-slate-700 hover:bg-white cursor-pointer font-medium')}
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Full Distractor Audit
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {modal && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={() => setModal(null)}>
                            <div
                                className="ng-pop bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
                                role="dialog"
                                aria-modal="true"
                                aria-label={`Question ${modal.qNum} distractor audit`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">Q#{modal.qNum}</span>
                                        <span className="font-bold text-slate-900 text-sm">{modal.topic}</span>
                                    </div>
                                    <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-200">{modal.text}</div>
                                <div className="space-y-2 pt-1">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Option Selection Frequency</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                            <div key={opt} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                                                <span className="font-bold text-slate-700">Option {opt}</span>
                                                <span className="font-black text-indigo-600">{modal.dist[opt]}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy Rate</span>
                                        <p className="font-bold text-slate-900">{modal.accuracyPct}%</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Discrimination Index</span>
                                        <p className="font-bold text-slate-900">{modal.discriminationIndex}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setModal(null)} className={cn(buttonVariants(), 'w-full bg-slate-900 text-white text-xs rounded-xl h-9')}>
                                    Close Audit
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <figcaption>
                Example batch. Q#118: 52% picked B, a true statement (neutrophils are the most common white cells) that they believed false. Q#142: a negative discrimination index, so check the key.
            </figcaption>
        </figure>
    );
}

// ── Student result (ResultsPage) ────────────────────────────────────────────

const STUDENT: ResultSection[] = [
    { name: 'Physics', totalQ: 45, correct: 34, wrong: 6, skipped: 5 },
    { name: 'Chemistry', totalQ: 45, correct: 38, wrong: 4, skipped: 3 },
    { name: 'Botany', totalQ: 45, correct: 41, wrong: 2, skipped: 2 },
    { name: 'Zoology', totalQ: 45, correct: 40, wrong: 3, skipped: 2 },
];

function StudentResult() {
    return (
        <figure className="ng-widget ng-wide">
            <div className="ng-window">
                <div className="ng-window-bar" aria-hidden="true">
                    <div className="ng-window-lights">
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="ng-window-url">
                        <Lock /> testoza.com/results
                    </div>
                </div>
                <ResultsScreen title="NEET Full Mock 07" sections={STUDENT} />
            </div>
            <figcaption>Example result: 153 right and 15 wrong, so 4 × 153 − 15 = 597. Further down the page: the time matrix and every question’s solution.</figcaption>
        </figure>
    );
}

export default function NeetWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'neet-time-planner':
            return <TimePlanner />;
        case 'neet-exam-demo':
            return <ExamDemo />;
        case 'neet-ai-import':
            return <AiImportDemo />;
        case 'neet-batch-audit':
            return <BatchAudit />;
        case 'neet-score-lab':
            return <ScoreLab />;
        case 'neet-student-result':
            return <StudentResult />;
        default:
            return null;
    }
}
