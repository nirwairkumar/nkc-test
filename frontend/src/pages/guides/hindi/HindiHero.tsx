/**
 * Hero for /hindi-online-test-maker: a teacher makes a Hindi question on an iPhone.
 * The builder's question card (questionCard.tsx, phone layout) switches to हिंदी; the
 * question "nirvat mein prakash ki chaal kitni hoti hai" is typed in English letters,
 * each word turning into Hindi on space with the suggestion bar showing; the options
 * fill in and A is marked correct; then the student's exam screen (examScreen.tsx)
 * shows the finished question. Suggestions are the transliteration service's own
 * (recorded in transliterate.ts), so the replay never waits on the network.
 *
 * Size: the phone is drawn at 393 × 852 points, scaled to the stage, and the stage
 * never makes the first screen scroll (see .ht-stage). Plays only while visible;
 * reduced motion shows the finished card.
 */
import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, RotateCw } from 'lucide-react';
import { HERO_HINDI, HERO_ROMAN, PAPER, QUESTIONS, type OptionKey } from '@/guides/hindiData';
import { StatusIcons, useInert } from './replica';
import QuestionCard, { AddQuestionButton, QuestionsHeading, type Ime, type TypingMode } from './questionCard';
import ExamScreen from './examScreen';
import { builtInList } from './transliterate';

const Q1 = QUESTIONS[0];
const KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

interface Frame {
    scene: 0 | 1 | 2 | 3;
    ms: number;
    screen: 'builder' | 'exam';
    mode: TypingMode;
    /** Words already converted, and the word being typed. */
    words: number;
    partial: string;
    bar: boolean;
    /** Options typed in, and the answer. */
    opts: number;
    answer: OptionKey | '';
    pressed?: 'toggle' | OptionKey;
    picked?: OptionKey;
}

const SCRIPT: Frame[] = (() => {
    const f: Frame[] = [];
    const base = { screen: 'builder' as const, mode: 'en' as TypingMode, words: 0, partial: '', bar: false, opts: 0, answer: '' as const };
    f.push({ ...base, scene: 0, ms: 1300 });
    f.push({ ...base, scene: 0, ms: 320, pressed: 'toggle' });
    f.push({ ...base, scene: 0, ms: 700, mode: 'hi' });
    HERO_ROMAN.forEach((word, i) => {
        for (let j = 1; j <= word.length; j++) f.push({ ...base, scene: 1, mode: 'hi', words: i, partial: word.slice(0, j), bar: false, ms: 85 });
        f.push({ ...base, scene: 1, mode: 'hi', words: i + 1, partial: '', bar: true, ms: i === 0 ? 1100 : 480 });
    });
    const typed = { ...base, scene: 2 as const, mode: 'hi' as TypingMode, words: HERO_ROMAN.length, partial: '?' };
    f.push({ ...typed, opts: 0, ms: 600 });
    KEYS.forEach((_, i) => f.push({ ...typed, opts: i + 1, ms: 300 }));
    f.push({ ...typed, opts: 4, pressed: 'A', ms: 300 });
    f.push({ ...typed, opts: 4, answer: 'A', ms: 1500 });
    f.push({ ...typed, scene: 3, screen: 'exam', opts: 4, answer: 'A', ms: 1500 });
    f.push({ ...typed, scene: 3, screen: 'exam', opts: 4, answer: 'A', picked: 'A', ms: 2600 });
    return f;
})();

/** Reduced motion: the finished card. */
const STILL = SCRIPT.findIndex((s) => s.answer === 'A' && s.screen === 'builder');

const CAPTIONS = [
    ['Switch the card to हिंदी', 'Every question card has the switch'],
    ['Type in English letters', 'Each word becomes Hindi when you press space'],
    ['Mark the answer', 'Marks +2, wrong −0.5, copied to the next question'],
    ['Students see clean Hindi', 'On any phone, in the browser'],
] as const;

const noop = () => undefined;

function staticIme(value: string, bar: Ime['bar']): Ime {
    return { value, set: noop, bar, ref: createRef<HTMLTextAreaElement>(), onKeyDown: noop, onChange: noop, pick: noop, typeChar: noop, pressSpace: noop, reset: noop };
}

export default function HindiHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const deviceRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.65);
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    useInert(deviceRef, true);

    // Play only while visible; reduced motion gets a still frame.
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setStep(STILL);
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.25 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // The web view is drawn at 393 × 852 points and scaled to the screen.
    useEffect(() => {
        const el = screenRef.current;
        if (!el) return;
        const fit = () => setScale(el.clientWidth / 393);
        fit();
        if (!('ResizeObserver' in window)) return;
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!running) return;
        const id = window.setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
        return () => window.clearTimeout(id);
    }, [running, step]);

    const frame = SCRIPT[step];

    // While the options go in, the page scrolls down to them, as a person would.
    const viewportRef = useRef<HTMLDivElement>(null);
    const optionsShown = frame.scene === 2 && frame.screen === 'builder';
    useEffect(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const list = vp.querySelector<HTMLElement>('ul');
        const top = optionsShown && list ? Math.max(0, list.getBoundingClientRect().top / scale - vp.getBoundingClientRect().top / scale + vp.scrollTop - 150) : 0;
        vp.scrollTo({ top, behavior: optionsShown ? 'smooth' : 'auto' });
    }, [optionsShown, scale]);
    // Converted words, then the word being typed. The question mark goes right after
    // the last word (space, backspace, "?", as the guide explains).
    const typed = HERO_HINDI.slice(0, frame.words).join(' ');
    const text = frame.partial === '?' ? `${typed}?` : typed && (frame.partial || frame.bar) ? `${typed} ${frame.partial}` : typed || frame.partial;
    const barWord = frame.bar && frame.words > 0 ? HERO_ROMAN[frame.words - 1] : null;

    const question = useMemo(() => staticIme(text, barWord ? { list: builtInList(barWord), start: 0, end: 0 } : null), [text, barWord]);
    const opts = useMemo(() => Object.fromEntries(KEYS.map((k, i) => [k, staticIme(i < frame.opts ? Q1.hi.options[k] : '', null)])) as Record<OptionKey, Ime>, [frame.opts]);

    return (
        <div className="ht-stage-wrap" ref={rootRef}>
            <div
                className="ht-stage"
                role="img"
                aria-label="Animation: on a phone, a teacher switches TestoZa’s question card from English to हिंदी, types “nirvat mein prakash ki chaal kitni hoti hai” in English letters, and each word turns into Hindi: निर्वात में प्रकाश की चाल कितनी होती है? The options appear and A is marked correct. Then the same question shows on a student’s exam screen, in Hindi."
            >
                <div className="ht-iphone" aria-hidden="true" ref={deviceRef}>
                    <i className="ht-iphone-key ht-iphone-key--action" />
                    <i className="ht-iphone-key ht-iphone-key--up" />
                    <i className="ht-iphone-key ht-iphone-key--down" />
                    <i className="ht-iphone-key ht-iphone-key--power" />
                    <div className="ht-iphone-screen" ref={screenRef}>
                        <div className="ht-canvas ht-screen" style={{ transform: `scale(${scale})` }}>
                            <div className="ht-island" />
                            <div className="ht-statusbar">
                                <span>9:41</span>
                                <StatusIcons />
                            </div>
                            {frame.screen === 'builder' ? (
                                <div className="ht-viewport" ref={viewportRef}>
                                    <div className="bg-background px-3 pt-4" key="builder">
                                        <QuestionsHeading count={1} marks={PAPER.right} />
                                        <QuestionCard
                                            d={false}
                                            mode={frame.mode}
                                            question={question}
                                            options={opts}
                                            answer={frame.answer}
                                            marks={[String(PAPER.right), String(PAPER.wrong)]}
                                            interactive={false}
                                            pressedToggle={frame.pressed === 'toggle'}
                                            pressedAnswer={frame.pressed && frame.pressed !== 'toggle' ? frame.pressed : null}
                                            focused={frame.scene === 1}
                                        />
                                        <div className="h-4" />
                                        <AddQuestionButton interactive={false} />
                                        <div style={{ height: 260 }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="ht-viewport ht-viewport--app ht-stage-in" key="exam">
                                    <ExamScreen q={Q1} index={0} lang="hi" selected={frame.picked ?? null} seconds={PAPER.minutes * 60 - 52} fontSize={18} />
                                </div>
                            )}
                            <div className="ht-safari">
                                <div className="ht-safari-bar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span>
                                        <Lock style={{ width: 12, height: 12 }} /> app.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="ht-safari-home" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="ht-stage-caption" aria-hidden="true">
                <p key={frame.scene} className="is-swap">
                    <b>{CAPTIONS[frame.scene][0]}</b>
                    {CAPTIONS[frame.scene][1]}
                </p>
                <div className="ht-dots">
                    {CAPTIONS.map((_, i) => (
                        <i key={i} className={i === frame.scene ? 'is-on' : undefined} />
                    ))}
                </div>
            </div>
        </div>
    );
}
