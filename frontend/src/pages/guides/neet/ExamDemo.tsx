/**
 * The playable NEET mini-mock on /neet-online-test-software: TestoZa's real
 * pre-exam screen, then the NTA-style exam screen (ExamScreen) with six questions,
 * six minutes and +4/−1 marking, then the results page and an answer review.
 *
 * Behaviour follows src/pages/TestPage.tsx: picking an option answers the question
 * at once; Save & Next moves on (on the last question it shows TestPage's toast);
 * Review toggles the mark; Ans & Review marks and moves on; the phone's flag does
 * "Ans & Review" when the question is answered and toggles the mark otherwise; a
 * question turns red once visited and left unanswered; the timer can be hidden
 * except in the last five minutes; at zero, answering locks and "Time's Up!" asks
 * for the submission. Time spent on each question is tracked as the product does.
 *
 * Wide containers get the desktop layout (palette on the right) in a browser
 * window; narrow ones the phone layout at its real size.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle, Clock, Info, Lock, PlayCircle, RotateCcw, TriangleAlert, XCircle, MinusCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MINI_MOCK, MINI_MOCK_MARKS, MINI_MOCK_SECONDS, MINI_MOCK_TITLE, type OptionKey } from '@/guides/neetMiniMock';
import ExamScreen, { type Control, type ExamLayout, type PillState } from './ExamScreen';
import ResultsScreen, { type ResultSection } from './ResultsScreen';

const SECTION_NAMES = ['Physics', 'Chemistry', 'Botany', 'Zoology'] as const;
const SECTIONS = SECTION_NAMES.map((name) => ({ name, count: MINI_MOCK.filter((q) => q.section === name).length }));
const SECTION_START = SECTIONS.map((_, i) => SECTIONS.slice(0, i).reduce((a, s) => a + s.count, 0));
const LAST = MINI_MOCK.length - 1;

type Phase = 'intro' | 'exam' | 'result';

interface ExamState {
    phase: Phase;
    current: number;
    answers: Partial<Record<number, OptionKey>>;
    marked: Set<number>;
    visited: Set<number>;
    seconds: number;
    timeHidden: boolean;
    sheetOpen: boolean;
    dialog: 'submit' | 'timeup' | null;
    toast: string | null;
}

const fresh = (): ExamState => ({
    phase: 'intro',
    current: 0,
    answers: {},
    marked: new Set(),
    visited: new Set([0]),
    seconds: MINI_MOCK_SECONDS,
    timeHidden: false,
    sheetOpen: false,
    dialog: null,
    toast: null,
});

function pill(s: ExamState, i: number): PillState {
    const answered = s.answers[i] !== undefined;
    const marked = s.marked.has(i);
    if (answered && marked) return 'revans';
    if (marked) return 'rev';
    if (answered) return 'ans';
    return s.visited.has(i) ? 'na' : 'nv';
}

function Gateway({ phone, onStart }: { phone: boolean; onStart: () => void }) {
    return (
        <div className="ng-screen h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center p-4">
            <div className={cn('w-full max-w-2xl bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl shadow-2xl space-y-6 my-auto', phone ? 'p-6' : 'p-8')}>
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl mb-2">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <h3 className={cn('font-extrabold tracking-tight text-slate-900', phone ? 'text-2xl' : 'text-3xl')}>{MINI_MOCK_TITLE}</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">Please review the guidelines below before beginning your attempt.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        ['Questions', String(MINI_MOCK.length)],
                        ['Duration', `${MINI_MOCK_SECONDS / 60}m`],
                        ['Passing Marks', 'N/A'],
                    ].map(([label, value]) => (
                        <div key={label} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</span>
                            <p className="text-lg font-bold text-slate-800">{value}</p>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700">Important Rules:</h4>
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex gap-3 text-sm text-slate-600">
                            <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-slate-800">Do Not Close or Switch Tabs:</span> Leaving the browser page or switching tabs might trigger cheating warnings or auto-submit your exam.
                            </div>
                        </div>
                        <div className="flex gap-3 text-sm text-slate-600">
                            <Clock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-slate-800">Continuous Timer:</span> Once started, the countdown timer cannot be paused or stopped under any circumstances.
                            </div>
                        </div>
                        <div className="flex gap-3 text-sm text-slate-600">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-slate-800">Auto-Save Active:</span> Your answers are continuously synced and saved to the cloud, allowing recovery in case of connection failure.
                            </div>
                        </div>
                    </div>
                </div>
                <div className={cn('pt-2 flex gap-3', phone ? 'flex-col' : 'flex-row')}>
                    <span
                        className={cn(
                            buttonVariants({ variant: 'outline' }),
                            'py-6 text-sm font-bold rounded-2xl border-2 border-slate-100 hover:bg-slate-50 transition-all',
                            phone ? 'w-full' : 'w-1/3',
                        )}
                        title="Not available in this demo"
                    >
                        Exit Portal
                    </span>
                    <button
                        type="button"
                        onClick={onStart}
                        className={cn(
                            buttonVariants(),
                            'py-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2',
                            phone ? 'w-full' : 'w-2/3',
                        )}
                    >
                        <PlayCircle className="w-5 h-5" />
                        Start Examination Now
                    </button>
                </div>
            </div>
        </div>
    );
}

const fmtSeconds = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

export default function ExamDemo() {
    const rootRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<ExamLayout>('phone');
    const [s, setS] = useState<ExamState>(fresh);
    const times = useRef<number[]>(MINI_MOCK.map(() => 0));
    const enteredAt = useRef(0);
    const [review, setReview] = useState<number[] | null>(null);

    useLayoutEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const fit = () => setLayout(el.clientWidth >= 860 ? 'desktop' : 'phone');
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Time on each question, as the product records it.
    const flushTime = useCallback((index: number) => {
        if (!enteredAt.current) return;
        times.current[index] += Math.max(0, Math.round((Date.now() - enteredAt.current) / 1000));
        enteredAt.current = Date.now();
    }, []);

    const goTo = useCallback(
        (index: number) => {
            setS((prev) => {
                if (index === prev.current) return prev;
                flushTime(prev.current);
                const visited = new Set(prev.visited).add(index);
                return { ...prev, current: index, visited, sheetOpen: false };
            });
        },
        [flushTime],
    );

    // The clock runs only during the exam.
    useEffect(() => {
        if (s.phase !== 'exam' || s.dialog === 'timeup') return;
        const id = window.setInterval(() => {
            setS((prev) => {
                if (prev.seconds <= 1) return { ...prev, seconds: 0, dialog: 'timeup', sheetOpen: false };
                return { ...prev, seconds: prev.seconds - 1 };
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [s.phase, s.dialog]);

    useEffect(() => {
        if (!s.toast) return;
        const id = window.setTimeout(() => setS((prev) => ({ ...prev, toast: null })), 3200);
        return () => window.clearTimeout(id);
    }, [s.toast]);

    const timeUp = s.dialog === 'timeup';

    const submit = () => {
        flushTime(s.current);
        enteredAt.current = 0;
        setReview([...times.current]);
        setS((prev) => ({ ...prev, phase: 'result', dialog: null, sheetOpen: false }));
        rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };

    const onControl = (c: Control) => {
        if (c.startsWith('opt-')) {
            if (timeUp) return;
            const key = c.slice(4) as OptionKey;
            setS((prev) => ({ ...prev, answers: { ...prev.answers, [prev.current]: key } }));
            return;
        }
        if (c.startsWith('pal-')) return goTo(Number(c.slice(4)));
        if (c.startsWith('tab-')) return goTo(SECTION_START[Number(c.slice(4))]);
        switch (c) {
            case 'save':
                if (s.current === LAST) return setS((prev) => ({ ...prev, toast: 'This is the last question. Please click Submit Test at the top right.' }));
                return goTo(s.current + 1);
            case 'back':
                if (s.current > 0) goTo(s.current - 1);
                return;
            case 'clear':
                if (timeUp) return;
                return setS((prev) => {
                    const answers = { ...prev.answers };
                    delete answers[prev.current];
                    return { ...prev, answers };
                });
            case 'review':
                return setS((prev) => {
                    const marked = new Set(prev.marked);
                    if (marked.has(prev.current)) marked.delete(prev.current);
                    else marked.add(prev.current);
                    return { ...prev, marked };
                });
            case 'ansrev':
            case 'flag': {
                const answered = s.answers[s.current] !== undefined;
                if (c === 'flag' && !answered) return onControl('review');
                setS((prev) => ({ ...prev, marked: new Set(prev.marked).add(prev.current) }));
                if (s.current === LAST) return setS((prev) => ({ ...prev, toast: 'Question marked for review.' }));
                return goTo(s.current + 1);
            }
            case 'fab':
                return setS((prev) => ({ ...prev, sheetOpen: true }));
            case 'close-sheet':
                return setS((prev) => ({ ...prev, sheetOpen: false }));
            case 'eye':
                return setS((prev) => ({ ...prev, timeHidden: !prev.timeHidden }));
            case 'submit':
                return setS((prev) => ({ ...prev, dialog: 'submit', sheetOpen: false }));
            case 'cancel':
                return setS((prev) => (prev.dialog === 'submit' ? { ...prev, dialog: null } : prev));
            case 'confirm':
                return submit();
        }
    };

    const start = () => {
        times.current = MINI_MOCK.map(() => 0);
        enteredAt.current = Date.now();
        setReview(null);
        setS({ ...fresh(), phase: 'exam' });
    };

    const restart = () => {
        enteredAt.current = 0;
        setReview(null);
        setS(fresh());
    };

    const phone = layout === 'phone';
    const results: ResultSection[] = SECTIONS.map((sec) => {
        const qs = MINI_MOCK.map((q, i) => ({ q, i })).filter(({ q }) => q.section === sec.name);
        const correct = qs.filter(({ q, i }) => s.answers[i] === q.answer).length;
        const answered = qs.filter(({ i }) => s.answers[i] !== undefined).length;
        return { name: sec.name, totalQ: sec.count, correct, wrong: answered - correct, skipped: sec.count - answered, marksPer: MINI_MOCK_MARKS.correct, negative: MINI_MOCK_MARKS.wrong };
    });

    return (
        <figure className="ng-widget ng-wide ng-demo" id="try-it" ref={rootRef} aria-label="A working NEET mini-mock on TestoZa's exam screen">
            <div className="ng-demo-bar">
                <div className="ng-demo-chips">
                    <span>6 questions</span>
                    <span>6 minutes</span>
                    <span>+4 / −1</span>
                </div>
                {s.phase !== 'intro' && (
                    <button type="button" className="ng-demo-restart" onClick={restart}>
                        <RotateCcw aria-hidden="true" /> Start again
                    </button>
                )}
            </div>
            <div className={cn('ng-window', phone && 'ng-window--phone')}>
                <div className="ng-window-bar" aria-hidden="true">
                    <div className="ng-window-lights">
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="ng-window-url">
                        <Lock /> testoza.com{s.phase === 'result' ? '/results' : '/test/neet-mini-mock'}
                    </div>
                </div>
                <div className="ng-demo-screen">
                    {s.phase === 'intro' && <Gateway phone={phone} onStart={start} />}
                    {s.phase === 'exam' && (
                        <ExamScreen
                            layout={layout}
                            live
                            title={MINI_MOCK_TITLE}
                            sections={SECTIONS}
                            current={s.current}
                            question={MINI_MOCK[s.current]}
                            selected={s.answers[s.current]}
                            states={MINI_MOCK.map((_, i) => pill(s, i))}
                            seconds={s.seconds}
                            marks={{ plus: MINI_MOCK_MARKS.correct, minus: MINI_MOCK_MARKS.wrong }}
                            timeHidden={s.timeHidden}
                            sheetOpen={s.sheetOpen}
                            dialog={s.dialog}
                            onControl={onControl}
                        />
                    )}
                    {s.phase === 'result' && (
                        <div className="h-full overflow-y-auto">
                            <ResultsScreen title={MINI_MOCK_TITLE} sections={results} phone={phone} studentName="Your" />
                        </div>
                    )}
                    {s.toast && (
                        <div className={cn('ng-toast', phone && 'ng-toast--phone')} role="status">
                            <Info aria-hidden="true" />
                            {s.toast}
                        </div>
                    )}
                </div>
            </div>

            {s.phase === 'result' && review && (
                <div className="ng-review">
                    <p className="ng-group-label">Your answers</p>
                    <ol className="ng-review-list">
                        {MINI_MOCK.map((q, i) => {
                            const picked = s.answers[i];
                            const status = picked === undefined ? 'skipped' : picked === q.answer ? 'right' : 'wrong';
                            const Icon = status === 'right' ? CheckCircle : status === 'wrong' ? XCircle : MinusCircle;
                            return (
                                <li key={q.id} className={`is-${status}`}>
                                    <Icon aria-hidden="true" />
                                    <div>
                                        <p className="ng-review-head">
                                            <b>
                                                Q{q.id} · {q.section}
                                            </b>
                                            <span>{q.format}</span>
                                            <span>{fmtSeconds(review[i])}</span>
                                        </p>
                                        <p>
                                            {status === 'skipped' ? 'Not answered (0).' : `You picked ${picked}${status === 'right' ? ' (+4).' : ` (−1). The answer is ${q.answer}.`}`} {q.why}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}
            <figcaption>
                {s.phase === 'result'
                    ? 'Marked +4 for a right answer and −1 for a wrong one, on the same results page students see after a real test.'
                    : 'TestoZa’s exam screen with its own buttons, palette and timer. Nothing you do here is saved.'}
            </figcaption>
        </figure>
    );
}
