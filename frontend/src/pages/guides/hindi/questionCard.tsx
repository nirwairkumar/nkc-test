/**
 * The question card from TestoZa's test builder (components/test-builder/QuestionCard.tsx)
 * with its Hindi typing (components/ui/IMEInput.tsx), for the typing demo and the hero.
 *
 * Class strings are the product's, merged with the app's own cn() as the product merges
 * them; sm: variants are resolved by the `d` flag. Hindi typing follows IMEInput: in
 * हिंदी mode, pressing space after a word made only of letters sends it to the
 * transliteration service, the first suggestion replaces it, and up to five sit in the
 * orange bar until the next letter is typed. One difference, on purpose: the product
 * waits for the service before it inserts the space (so a letter typed during that
 * wait can be lost); here the space goes in at once and the word is swapped when the
 * answer arrives, if it is still there.
 */
import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from 'react';
import { Camera, Check, ChevronDown, GripVertical, ImageIcon, Plus, Sigma, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptionKey } from '@/guides/hindiData';
import { isPlainWord, suggest, type SuggestSource } from './transliterate';

export type TypingMode = 'en' | 'hi';

export interface Conversion {
    roman: string;
    hindi: string;
    list: string[];
    source: SuggestSource;
}

/* ── components/ui/textarea.tsx and the card's own class strings ────────── */

const TEXTAREA_BASE =
    'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const SELECT_TRIGGER =
    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1';
const FIELD = 'rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-900/[0.07] transition-[background-color,box-shadow] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/45';
const BARE_TEXTAREA = 'w-full resize-none border-0 bg-transparent shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 text-slate-900';
const TOOL_BTN =
    'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold transition-[background-color,transform] motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';
const ICON_BTN =
    'flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';

/* ── Hindi typing for one text box ─────────────────────────────────────── */

export interface Ime {
    value: string;
    set: (v: string) => void;
    bar: { list: string[]; start: number; end: number } | null;
    ref: RefObject<HTMLTextAreaElement>;
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    pick: (word: string) => void;
    /** Scripted typing (the "Type for me" button and the hero): one character at the end. */
    typeChar: (ch: string) => void;
    /** Scripted space at the end, converting the last word in Hindi mode. */
    pressSpace: () => void;
    reset: (v?: string) => void;
}

/** The last space-separated piece before `cursor`, as IMEInput splits it. */
const lastToken = (text: string, cursor: number) => text.slice(0, cursor).split(/[\s\n]/).pop() ?? '';

/**
 * Where `word` now stands as a whole word, nearest to where it was typed. Earlier
 * words may have been swapped for (shorter or longer) Hindi in the meantime, so the
 * original position can be a few characters off.
 */
function findWord(text: string, word: string, near: number) {
    let best = -1;
    let dist = Infinity;
    for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + 1)) {
        const startsWord = i === 0 || /\s/.test(text[i - 1]);
        const endsWord = i + word.length === text.length || /\s/.test(text[i + word.length]);
        if (startsWord && endsWord && Math.abs(i - near) < dist) {
            dist = Math.abs(i - near);
            best = i;
        }
    }
    return best;
}

export function useIme(initial: string, mode: TypingMode, onConverted?: (c: Conversion) => void, onPicked?: (word: string) => void): Ime {
    const [value, setValue] = useState(initial);
    const [bar, setBar] = useState<Ime['bar']>(null);
    const ref = useRef<HTMLTextAreaElement>(null);
    const valueRef = useRef(value);
    const modeRef = useRef(mode);
    const cbRef = useRef(onConverted);
    const pickRef = useRef(onPicked);
    modeRef.current = mode;
    cbRef.current = onConverted;
    pickRef.current = onPicked;

    const write = useCallback((v: string) => {
        valueRef.current = v;
        setValue(v);
    }, []);

    /**
     * The text box itself is changed first, then React's state. A word swapped in
     * between two keystrokes is then already in the box when the next key lands, so
     * fast typing never loses a conversion or a letter.
     */
    const apply = useCallback(
        (next: string, caret: number | null) => {
            const el = ref.current;
            if (el && el.value !== next) {
                el.value = next;
                if (caret !== null) el.setSelectionRange(caret, caret);
            }
            write(next);
        },
        [write],
    );

    const convert = useCallback(
        (word: string, typedAt: number) => {
            suggest(word).then((res) => {
                if (!res) return;
                const best = res.list[0];
                const el = ref.current;
                const cur = el ? el.value : valueRef.current;
                const start = findWord(cur, word, typedAt);
                if (start < 0) return;
                const next = cur.slice(0, start) + best + cur.slice(start + word.length);
                const caret = el && document.activeElement === el ? el.selectionStart : null;
                apply(next, caret === null ? null : caret > start ? caret + best.length - word.length : caret);
                setBar({ list: res.list, start, end: start + best.length });
                cbRef.current?.({ roman: word, hindi: best, list: res.list, source: res.source });
            });
        },
        [apply],
    );

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (modeRef.current === 'hi' && e.key === ' ') {
            const el = e.currentTarget;
            const cursor = el.selectionStart ?? el.value.length;
            const token = lastToken(el.value, cursor);
            if (token && isPlainWord(token)) {
                e.preventDefault();
                el.setRangeText(' ', cursor, el.selectionEnd ?? cursor, 'end');
                write(el.value);
                convert(token, cursor - token.length);
            }
            return;
        }
        if (bar && e.key.length === 1) setBar(null);
    };

    // Phones often send no usable key on keydown; IMEInput converts on the change instead.
    const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        const cursor = e.target.selectionStart ?? next.length;
        if (modeRef.current === 'hi' && next.length > valueRef.current.length && next.charAt(cursor - 1) === ' ') {
            const token = lastToken(next.slice(0, cursor).trimEnd(), cursor);
            if (token && isPlainWord(token)) convert(token, cursor - 1 - token.length);
        }
        write(next);
    };

    const pick = (word: string) => {
        if (!bar) return;
        const el = ref.current;
        const cur = el ? el.value : valueRef.current;
        el?.focus();
        apply(cur.slice(0, bar.start) + word + cur.slice(bar.end), bar.start + word.length);
        setBar(null);
        pickRef.current?.(word);
    };

    const typeChar = (ch: string) => {
        setBar(null);
        apply(valueRef.current + ch, null);
    };

    const pressSpace = () => {
        const text = valueRef.current;
        const token = lastToken(text, text.length);
        apply(text + ' ', null);
        if (modeRef.current === 'hi' && token && isPlainWord(token)) convert(token, text.length - token.length);
    };

    const reset = (v = initial) => {
        setBar(null);
        apply(v, null);
    };

    return { value, set: (v: string) => apply(v, null), bar, ref, onKeyDown, onChange, pick, typeChar, pressSpace, reset };
}

/* ── The text box: IMEInput's suggestion bar over the product's textarea ── */

function ImeBox({ ime, mode, className, placeholder, label, rows, interactive }: { ime: Ime; mode: TypingMode; className: string; placeholder: string; label: string; rows?: number; interactive: boolean }) {
    // IMEInput grows a textarea to fit its text.
    useLayoutEffect(() => {
        const el = ime.ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.overflowY = 'hidden';
        el.style.height = `${el.scrollHeight}px`;
    }, [ime.value, ime.ref]);

    return (
        <div className="w-full min-w-0 group/ime-container">
            {ime.bar && ime.bar.list.length > 0 && (
                <div className="flex items-center gap-2 p-1.5 bg-orange-50 border border-orange-100 rounded-t-md overflow-x-auto mb-[-1px] relative z-10">
                    {ime.bar.list.map((s, idx) => (
                        <button
                            key={idx}
                            type="button"
                            tabIndex={interactive ? 0 : -1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault();
                                ime.pick(s);
                            }}
                            className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:bg-orange-100 text-gray-800 whitespace-nowrap shadow-sm"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            <textarea
                ref={ime.ref}
                value={ime.value}
                onChange={ime.onChange}
                onKeyDown={ime.onKeyDown}
                placeholder={placeholder}
                aria-label={label}
                rows={rows}
                readOnly={!interactive}
                tabIndex={interactive ? 0 : -1}
                autoComplete="off"
                spellCheck={false}
                lang={mode === 'hi' ? 'hi' : undefined}
                className={cn(TEXTAREA_BASE, cn(className, mode === 'hi' ? 'border-orange-200 focus-visible:ring-orange-200' : ''))}
            />
        </div>
    );
}

/* ── QuestionCard's pieces ─────────────────────────────────────────────── */

export function LanguageToggle({ value, onChange, interactive, pressed, nudge }: { value: TypingMode; onChange?: (v: TypingMode) => void; interactive: boolean; pressed?: boolean; nudge?: boolean }) {
    return (
        <div role="radiogroup" aria-label="Typing language" className={`flex h-8 items-center rounded-full bg-slate-100 p-0.5 text-[12.5px] font-semibold${nudge ? ' ht-nudge-ring' : ''}`}>
            {(
                [
                    ['en', 'English'],
                    ['hi', 'हिंदी'],
                ] as const
            ).map(([v, label]) => (
                <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={value === v}
                    tabIndex={interactive ? 0 : -1}
                    onClick={() => onChange?.(v)}
                    title={v === 'hi' ? 'Type in English letters, get Hindi (e.g. "namaste" → नमस्ते)' : 'Type in English'}
                    className={cn(
                        'h-7 rounded-full px-2.5 transition-all',
                        value === v ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.15)]' : 'text-slate-500 hover:text-slate-800',
                        pressed && v === 'hi' && 'is-pressed',
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

function MarkField({ label, value, tone }: { label: string; value: string; tone: 'plus' | 'minus' }) {
    return (
        <label className="flex h-9 items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1 text-[12.5px] font-medium text-slate-600">
            {label}
            <span className="flex h-7 items-center rounded-full bg-white px-1.5 shadow-sm ring-1 ring-slate-900/[0.06]">
                <span className={cn('text-[13px] font-bold', tone === 'plus' ? 'text-emerald-600' : 'text-red-600')}>{tone === 'plus' ? '+' : '−'}</span>
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    readOnly
                    tabIndex={-1}
                    aria-label={label}
                    className={cn('w-8 bg-transparent text-center text-[14px] font-bold tabular-nums focus:outline-none', tone === 'plus' ? 'text-slate-900' : 'text-red-600')}
                />
            </span>
        </label>
    );
}

export interface CardProps {
    d: boolean;
    mode: TypingMode;
    onMode?: (m: TypingMode) => void;
    question: Ime;
    options: Record<OptionKey, Ime>;
    answer: OptionKey | '';
    onAnswer?: (k: OptionKey) => void;
    marks: [string, string];
    interactive: boolean;
    /** A tool the demo doesn't run (Fill from photo, Picture, Maths & symbols, Add option). */
    onTool?: (tool: 'photo' | 'picture' | 'maths' | 'option') => void;
    pressedToggle?: boolean;
    nudgeToggle?: boolean;
    /** Scripted replays: draw the question box as focused, and press an option letter. */
    focused?: boolean;
    pressedAnswer?: OptionKey | null;
}

export default function QuestionCard({ d, mode, onMode, question, options, answer, onAnswer, marks, interactive, onTool, pressedToggle, nudgeToggle, focused, pressedAnswer }: CardProps) {
    const tab = interactive ? 0 : -1;
    const isEmpty = !question.value.trim();
    const needsAnswer = !isEmpty && !answer;
    const keys = Object.keys(options) as OptionKey[];
    return (
        <article
            data-question-card="true"
            className="relative min-w-0 bg-white transition-[box-shadow,opacity] rounded-2xl ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-18px_rgba(15,23,42,0.22)]"
        >
            <header className={cn('flex flex-wrap items-center gap-x-2 gap-y-2 px-3.5 pt-3.5', d && 'px-5')}>
                <span className="drag-handle -ml-1 flex h-8 w-6 cursor-grab items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing" title="Drag to move">
                    <GripVertical className="h-4 w-4" />
                </span>
                {/* An <h3> in the product; a plain element here so the guide's outline stays the guide's. */}
                <p className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">Question 1</p>
                <span
                    aria-label="Question type"
                    className={cn(SELECT_TRIGGER, 'h-8 w-auto gap-1.5 rounded-full border-0 bg-slate-100 px-3 text-[13px] font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-0')}
                >
                    <span style={{ pointerEvents: 'none' }}>Single correct</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <LanguageToggle value={mode} onChange={onMode} interactive={interactive} pressed={pressedToggle} nudge={nudgeToggle} />
                    <button type="button" disabled title="A test needs at least one question" aria-label="Delete question" className={cn(ICON_BTN, 'hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30')}>
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </header>

            <div className={cn('space-y-3 px-3.5 pb-4 pt-3', d && 'px-5 pb-5')}>
                <div className={cn(FIELD, focused && 'bg-white ring-2 ring-sky-500/45')}>
                    <ImeBox
                        ime={question}
                        mode={mode}
                        interactive={interactive}
                        label="Question 1 text"
                        placeholder="Type your question here…"
                        className={cn(BARE_TEXTAREA, 'min-h-[76px] p-3 text-[17px] leading-relaxed', d && 'px-4')}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        tabIndex={tab}
                        onClick={() => onTool?.('photo')}
                        className={cn(TOOL_BTN, isEmpty ? 'bg-sky-600 text-white shadow-[0_6px_16px_-8px_rgba(2,132,199,0.9)] hover:bg-sky-700' : 'bg-sky-50 text-sky-800 hover:bg-sky-100')}
                        title="Photo of a printed or handwritten question — we type it for you"
                    >
                        <Camera className="h-4 w-4" /> Fill from photo
                    </button>
                    <button type="button" tabIndex={tab} onClick={() => onTool?.('picture')} className={cn(TOOL_BTN, 'bg-slate-100 text-slate-700 hover:bg-slate-200/80')}>
                        <ImageIcon className="h-4 w-4" /> Picture
                    </button>
                    <button type="button" tabIndex={tab} onClick={() => onTool?.('maths')} className={cn(TOOL_BTN, 'sy-pad-trigger bg-slate-100 text-slate-700 hover:bg-slate-200/80')} title="Fractions, powers, chemical formulas, tables">
                        <Sigma className="h-4 w-4" /> Maths &amp; symbols
                    </button>
                    <div className={cn('flex w-full items-center gap-1.5', d && 'ml-auto w-auto')}>
                        <MarkField label="Marks" tone="plus" value={marks[0]} />
                        <MarkField label="Wrong" tone="minus" value={marks[1]} />
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p className="text-[13px] font-semibold text-slate-500">Answer options</p>
                        {needsAnswer ? <p className="flex items-center gap-1 text-[13px] font-medium text-amber-700">Tap the letter of the correct answer</p> : <p className="text-[13px] text-slate-400">Tap a letter to mark it correct</p>}
                    </div>
                    <ul className="space-y-2">
                        {keys.map((key) => {
                            const selected = answer === key;
                            return (
                                <li
                                    key={key}
                                    className={cn(
                                        'group/option flex items-start gap-2.5 rounded-xl p-1.5 pr-1 ring-1 ring-inset transition-[background-color,box-shadow]',
                                        d && 'gap-3',
                                        selected ? 'bg-emerald-50/80 ring-emerald-500/45' : 'bg-white ring-slate-900/[0.09] hover:ring-slate-900/15',
                                        'focus-within:ring-2 focus-within:ring-sky-500/40',
                                    )}
                                >
                                    <button
                                        type="button"
                                        tabIndex={tab}
                                        onClick={() => onAnswer?.(key)}
                                        aria-pressed={selected}
                                        aria-label={selected ? `Option ${key} is correct` : `Mark option ${key} as correct`}
                                        title={selected ? 'Correct answer' : 'Mark as correct'}
                                        className={cn(
                                            'flex h-9 w-9 shrink-0 items-center justify-center text-[15px] font-bold transition-all motion-safe:active:scale-95',
                                            'rounded-full',
                                            selected ? 'bg-emerald-500 text-white shadow-[0_4px_10px_-4px_rgba(16,185,129,0.8)]' : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-900/[0.06] hover:bg-slate-200',
                                            pressedAnswer === key && 'is-pressed',
                                        )}
                                    >
                                        {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : key}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <ImeBox ime={options[key]} mode={mode} interactive={interactive} label={`Question 1 option ${key}`} placeholder={`Option ${key}`} rows={1} className={cn(BARE_TEXTAREA, 'min-h-[36px] px-1 py-1.5 text-[16px] leading-normal')} />
                                    </div>
                                    {selected && d && <span className="mt-2 shrink-0 text-[12px] font-semibold text-emerald-700">Correct</span>}
                                    <div className={cn('flex shrink-0 items-center opacity-100 transition-opacity', d && 'opacity-0 group-hover/option:opacity-100 group-focus-within/option:opacity-100')} aria-hidden="true">
                                        <span className={ICON_BTN} title="Add a picture to this option">
                                            <ImageIcon className="h-4 w-4" />
                                        </span>
                                        <span className={cn(ICON_BTN, 'hover:bg-red-50 hover:text-red-600')} title="Remove this option">
                                            <X className="h-4 w-4" />
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <button type="button" tabIndex={tab} onClick={() => onTool?.('option')} className={cn(TOOL_BTN, 'mt-2 text-sky-700 hover:bg-sky-50')}>
                        <Plus className="h-4 w-4" /> Add option
                    </button>
                </div>
            </div>
        </article>
    );
}

/** TestBuilder's "Questions" heading and the "Add question" button around the card. */
export function QuestionsHeading({ count, marks }: { count: number; marks: number }) {
    return (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
                <p className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">Questions</p>
                <p className="text-[14px] text-slate-500 tabular-nums">
                    {count} question{count === 1 ? '' : 's'} · {marks} mark{marks === 1 ? '' : 's'}
                </p>
            </div>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-sky-700 hover:bg-sky-50">
                <Sigma className="h-4 w-4" /> Maths &amp; chemistry help
                <ChevronDown className="h-4 w-4 transition-transform" />
            </span>
        </div>
    );
}

export function AddQuestionButton({ onClick, interactive }: { onClick?: () => void; interactive: boolean }) {
    return (
        <button
            type="button"
            tabIndex={interactive ? 0 : -1}
            onClick={onClick}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 text-[16px] font-semibold text-sky-700 transition-colors hover:border-sky-400 hover:bg-sky-50"
        >
            <Plus className="h-5 w-5" /> Add question
        </button>
    );
}
