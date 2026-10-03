/**
 * hindi-typing: the test builder's question card, typing Hindi in English letters.
 * The reader switches the card to हिंदी and types; each word goes to the same
 * transliteration service TestoZa uses (transliterate.ts), so any Hindi word works.
 * "Type it for me" types the classic stem "nimnalikhit mein se kaun sa kathan satya
 * hai"; the tricky-word chips show a wrong first guess and its fix. The options are
 * already typed (question 5 of the example paper), so the card is complete once the
 * stem is in.
 *
 * Size: wide screens put the card's window and a 300 px side panel side by side at
 * --ht-fit-h; narrow screens stack the window (shorter) over a compact control row.
 * The card renders at its natural size with sm: resolved for the window's width.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Keyboard, Sparkles, WifiOff } from 'lucide-react';
import { PAPER, QUESTIONS, STEM_ROMAN, type OptionKey } from '@/guides/hindiData';
import { BrowserWindow, DemoFrame, Toasts, useReducedMotion, useToasts, useWidth } from './replica';
import QuestionCard, { AddQuestionButton, QuestionsHeading, useIme, type Conversion, type TypingMode } from './questionCard';

const Q5 = QUESTIONS[4];

/** Chips: a word whose first guess is wrong, and what to type instead. */
const TRICKY: { word: string; label: string }[] = [
    { word: 'kam', label: 'kam' },
    { word: 'grah', label: 'grah' },
    { word: 'graha', label: 'graha' },
    { word: 'vigyaan', label: 'vigyaan' },
    { word: 'SI', label: 'SI' },
];

const TOOL_TOASTS = {
    photo: 'Fill from photo opens the camera in TestoZa and types the question for you.',
    picture: 'Picture adds an image to the question in TestoZa.',
    maths: 'Maths & symbols opens Sy Pad, the maths keyboard, in TestoZa.',
    option: 'Add option adds E, F and so on in TestoZa.',
} as const;

export default function TypingDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 860;
    const reduced = useReducedMotion();
    const { items: toasts, push } = useToasts();

    const [mode, setMode] = useState<TypingMode>('en');
    const [answer, setAnswer] = useState<OptionKey | ''>('B');
    const [last, setLast] = useState<(Conversion & { picked?: boolean }) | null>(null);
    const [converted, setConverted] = useState(0);
    const [picked, setPicked] = useState(false);
    const [auto, setAuto] = useState(false);
    const [run, setRun] = useState(0);
    const timers = useRef<number[]>([]);

    const onConverted = (c: Conversion) => {
        setLast(c);
        setConverted((n) => n + 1);
    };
    const onPicked = (word: string) => {
        setPicked(true);
        setLast((prev) => (prev ? { ...prev, hindi: word, picked: true } : prev));
    };

    const question = useIme('', mode, onConverted, onPicked);
    const optA = useIme(Q5.hi.options.A, mode, onConverted, onPicked);
    const optB = useIme(Q5.hi.options.B, mode, onConverted, onPicked);
    const optC = useIme(Q5.hi.options.C, mode, onConverted, onPicked);
    const optD = useIme(Q5.hi.options.D, mode, onConverted, onPicked);
    const options = { A: optA, B: optB, C: optC, D: optD };

    // On a short window the builder's heading would push the text box out of sight:
    // start scrolled to the card.
    const scrollRef = useRef<HTMLDivElement>(null);
    const toCard = () => {
        const sc = scrollRef.current;
        const card = sc?.querySelector<HTMLElement>('[data-question-card]');
        if (sc && card && !wide) sc.scrollTo({ top: Math.max(0, card.offsetTop - 10), behavior: reduced ? 'auto' : 'smooth' });
    };
    useEffect(() => {
        toCard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wide, run]);

    const stopAuto = () => {
        timers.current.forEach((t) => window.clearTimeout(t));
        timers.current = [];
        setAuto(false);
    };
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

    const restart = () => {
        stopAuto();
        setMode('en');
        setAnswer('B');
        setLast(null);
        setConverted(0);
        setPicked(false);
        question.reset('');
        (Object.keys(options) as OptionKey[]).forEach((k) => options[k].reset(Q5.hi.options[k]));
        setRun((r) => r + 1);
    };

    /** Types words into the question as a person would: letters, then space. */
    const typeWords = (words: readonly string[], { from = 0, letterMs = reduced ? 0 : 70, spaceMs = reduced ? 0 : 420 } = {}) => {
        stopAuto();
        setAuto(true);
        let t = from;
        words.forEach((word) => {
            for (const ch of word) {
                t += letterMs;
                timers.current.push(window.setTimeout(() => question.typeChar(ch), t));
            }
            t += spaceMs;
            timers.current.push(window.setTimeout(() => question.pressSpace(), t));
        });
        timers.current.push(window.setTimeout(() => setAuto(false), t + 60));
    };

    const typeForMe = () => {
        toCard();
        if (mode !== 'hi') setMode('hi');
        question.reset('');
        typeWords(STEM_ROMAN, { from: mode === 'hi' ? 0 : 450 });
    };

    const tryWord = (word: string) => {
        toCard();
        if (mode !== 'hi') setMode('hi');
        const v = question.value;
        if (v && !/\s$/.test(v)) question.set(`${v} `);
        typeWords([word], { from: mode === 'hi' ? 0 : 350, letterMs: reduced ? 0 : 60, spaceMs: reduced ? 0 : 260 });
    };

    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    const steps = [
        { done: mode === 'hi', text: 'Switch the card to हिंदी' },
        { done: converted > 0, text: 'Type a word in English letters, then space' },
        { done: picked, text: 'Tap a suggestion to swap the word' },
    ];
    const tip = !steps[0].done ? (
        <span key="t0">Switch the card to हिंदी, next to “Single correct”.</span>
    ) : !steps[1].done ? (
        <span key="t1">Type a word in English letters, then press space.</span>
    ) : !steps[2].done ? (
        <span key="t2">Wrong word? Tap another one in the orange bar.</span>
    ) : (
        <span key="t3">That’s all there is to it. Try “kam”, then “SI”.</span>
    );

    const readout = last ? (
        <p className="ht-type-readout" aria-live="polite">
            <code>{last.roman}</code>
            <span aria-hidden="true">→</span>
            <b lang="hi">{last.hindi}</b>
            <small>{last.picked ? 'picked from the suggestion bar' : last.source === 'google' ? 'from Google’s transliteration, as in TestoZa' : 'from this page’s built-in list (the service didn’t answer)'}</small>
        </p>
    ) : (
        <p className="ht-type-readout is-empty">The word you type and the Hindi it becomes will show here.</p>
    );

    const card = (
        <div className="bg-background p-3 sm:p-5" style={{ minHeight: '100%' }}>
            {!online && (
                <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-inset ring-red-600/15">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    <span>You are offline. Your work is kept on this device; Hindi typing needs the internet.</span>
                </div>
            )}
            <QuestionsHeading count={1} marks={PAPER.right} />
            <QuestionCard
                d={wide || width >= 640}
                mode={mode}
                onMode={(m) => {
                    setMode(m);
                    if (m === 'hi') question.ref.current?.focus();
                }}
                question={question}
                options={options}
                answer={answer}
                onAnswer={setAnswer}
                marks={[String(PAPER.right), String(PAPER.wrong)]}
                interactive
                onTool={(t) => push(TOOL_TOASTS[t])}
                nudgeToggle={mode === 'en'}
            />
            <div className="h-4" />
            <AddQuestionButton interactive onClick={() => push(mode === 'hi' ? 'A new question starts in हिंदी, like the one before it.' : 'A new question starts in the language you used last.')} />
        </div>
    );

    return (
        <DemoFrame id="typing-demo" title="Type Hindi in English letters" tip={tip} onRestart={restart} wide="lg" caption="The question card from TestoZa’s test builder. Words go to Google’s transliteration service, as they do in TestoZa; if it can’t be reached, the suggested words still work from a built-in list.">
            <div ref={bodyRef} key={run} className={`ht-type${wide ? ' is-wide' : ''}`}>
                <BrowserWindow url="app.testoza.com/create-test" phone={!wide && width < 560} className="ht-type-window">
                    <div className="ht-scroll" ref={scrollRef}>
                        <div className="ht-screen" style={{ minHeight: '100%' }}>
                            {card}
                        </div>
                    </div>
                    <Toasts items={toasts} />
                </BrowserWindow>

                <aside className="ht-type-side" aria-label="Try it">
                    {wide && (
                        <>
                            <p className="ht-mini-label">Try it</p>
                            <ol className="ht-type-steps">
                                {steps.map((s, i) => (
                                    <li key={i} className={s.done ? 'is-done' : undefined}>
                                        <i aria-hidden="true">{s.done ? <Check /> : i + 1}</i>
                                        <span>{s.text}</span>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                    <div className="ht-type-actions">
                        <button type="button" className="ht-action" onClick={auto ? stopAuto : typeForMe}>
                            {auto ? <Keyboard aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                            {auto ? 'Stop typing' : 'Type it for me'}
                        </button>
                    </div>
                    <p className="ht-mini-label">{wide ? 'A wrong first guess, then its fix' : 'Try'}</p>
                    <div className="ht-type-chips" role="group" aria-label="Words to try">
                        {TRICKY.map((t) => (
                            <button key={t.word} type="button" onClick={() => tryWord(t.word)} disabled={auto}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {readout}
                </aside>
            </div>
        </DemoFrame>
    );
}
