import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Keyboard, Languages, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
    LANGUAGES, type FieldMode, type TypingLanguage,
    getLanguage, loadVisitorLocale, setSecondLanguage, useLanguageSuggestions, useSecondLanguage,
} from '@/lib/typingLanguages';

/**
 * "English | मराठी ▾" — the typing-language switch on the test name, description and
 * every question. Until a second language is picked its half is a 文A icon that opens
 * the menu; once picked, every switch on the page shows that language. Tapping the
 * language when it is already on opens the menu again to change it.
 */
export function LanguageSwitch({ value, onChange }: { value: string; onChange: (mode: FieldMode) => void }) {
    const second = useSecondLanguage();
    const [open, setOpen] = useState(false);
    const onSecond = value !== 'en' && !!second;

    // Look up the teacher's state/country now, so the menu opens with it already known.
    useEffect(() => { loadVisitorLocale(); }, []);

    const pick = (code: string) => {
        const changed = code !== second?.code;
        setSecondLanguage(code);
        onChange('second');
        setOpen(false);
        const lang = getLanguage(code);
        if (changed && lang) {
            toast(`${lang.native} typing is on`, {
                description: lang.itc
                    ? `Type in English letters — each word turns into ${lang.native} when you press space.`
                    : needsKeyboard(lang)
                        ? `Type with the ${lang.name} keyboard on your phone or computer.`
                        : 'Type as usual; letters like é or ñ come from your keyboard.',
            });
        }
    };

    const segment = 'flex h-6 items-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50';
    const on = 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.15)]';
    const off = 'text-slate-500 hover:text-slate-800';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div role="group" aria-label="Typing language" className="flex h-7 shrink-0 items-center rounded-full bg-slate-100 p-0.5 text-[12px] font-semibold">
                    <button
                        type="button"
                        aria-pressed={!onSecond}
                        onClick={() => onChange('en')}
                        title="Type in English"
                        className={cn(segment, 'px-2.5', !onSecond ? on : off)}
                    >
                        English
                    </button>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-pressed={second ? onSecond : undefined}
                            aria-label={second ? `Type in ${second.name}` : 'Choose another typing language'}
                            onClick={e => {
                                // Off → switch this box to the language. On → open the menu to change it.
                                if (second && !onSecond) {
                                    e.preventDefault();
                                    onChange('second');
                                }
                            }}
                            title={second
                                ? (onSecond ? 'Change the language' : `Type in ${second.name}`)
                                : 'Type in another language — Hindi, Marathi, Bengali, Arabic…'}
                            className={cn(segment, second ? 'gap-0.5 pl-2.5 pr-1.5' : 'w-8 justify-center', onSecond ? on : off, open && !onSecond && 'bg-white/70 text-slate-800')}
                        >
                            {second ? (
                                <>
                                    <span lang={second.code} className="max-w-[7.5rem] truncate">{second.native}</span>
                                    <ChevronDown className={cn('h-3 w-3 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')} strokeWidth={2.5} />
                                </>
                            ) : (
                                <Languages className="h-3.5 w-3.5" strokeWidth={2.25} />
                            )}
                        </button>
                    </PopoverTrigger>
                </div>
            </PopoverAnchor>
            <LanguageMenuContent current={second?.code ?? null} onPick={pick} />
        </Popover>
    );
}

/**
 * The menu as a popover body, for any trigger inside a <Popover>. `typing` (the builder)
 * marks keyboard-only languages and explains English-letter typing; the AI import's
 * output-language picker turns that off, since the AI writes the text itself.
 */
export function LanguageMenuContent({
    current, onPick, typing = true, align = 'end',
}: {
    current: string | null;
    onPick: (code: string) => void;
    typing?: boolean;
    align?: 'start' | 'center' | 'end';
}) {
    return (
        <PopoverContent
            align={align}
            sideOffset={8}
            collisionPadding={12}
            onOpenAutoFocus={e => {
                // On phones, focusing the search would throw up the keyboard over the list.
                if (window.matchMedia?.('(pointer: coarse)').matches) e.preventDefault();
            }}
            className={cn(
                'flex w-[min(600px,calc(100vw-24px))] max-h-[min(540px,var(--radix-popover-content-available-height))] flex-col overflow-hidden',
                'rounded-[18px] border-0 bg-white/95 p-0 text-slate-900 backdrop-blur-xl',
                'shadow-[0_22px_60px_-14px_rgba(15,23,42,0.38),0_0_0_0.5px_rgba(15,23,42,0.14)]',
                'origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:duration-200',
            )}
        >
            <LanguageMenu current={current} onPick={onPick} typing={typing} />
        </PopoverContent>
    );
}

/** Its own script and no English-letter typing (Korean, Thai, Burmese…): the teacher needs that keyboard. */
const needsKeyboard = (l: TypingLanguage) => !l.itc && !!l.script;

const KeyboardMark = ({ small }: { small?: boolean }) => (
    <Keyboard className={cn('shrink-0 text-slate-300', small ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-label="Needs its own keyboard" />
);

/* ── the menu: search, the local languages, then every language ─────────────── */

function LanguageMenu({ current, onPick, typing }: { current: string | null; onPick: (code: string) => void; typing: boolean }) {
    const { codes, place } = useLanguageSuggestions();
    const [query, setQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    const q = query.trim().toLowerCase();
    const results = useMemo(() => {
        if (!q) return LANGUAGES;
        const score = (l: TypingLanguage) => {
            const name = l.name.toLowerCase();
            const native = l.native.toLowerCase();
            if (name.startsWith(q) || native.startsWith(q) || l.code.toLowerCase() === q) return 0;
            if (name.includes(q) || native.includes(q)) return 1;
            return -1;
        };
        return LANGUAGES.map(l => [l, score(l)] as const).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1]).map(([l]) => l);
    }, [q]);
    const suggested = codes.map(c => getLanguage(c)).filter((l): l is TypingLanguage => !!l);

    /** Arrow keys move through the grid; columns read from the grid itself. */
    const onListKey = (e: React.KeyboardEvent) => {
        const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 0, ArrowDown: 0 };
        if (!(e.key in keys)) return;
        const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-lang-item]') ?? []);
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        if (at < 0) return;
        const grid = (document.activeElement as HTMLElement).closest('[data-lang-grid]');
        const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 1;
        const step = e.key === 'ArrowUp' ? -cols : e.key === 'ArrowDown' ? cols : keys[e.key];
        const next = items[Math.min(items.length - 1, Math.max(0, at + step))];
        if (next) { e.preventDefault(); next.focus(); }
    };

    return (
        <>
            <div className="border-b border-slate-900/[0.07] p-2.5">
                <label className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/45">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && results[0]) { e.preventDefault(); onPick(results[0].code); }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                listRef.current?.querySelector<HTMLButtonElement>('[data-lang-item]')?.focus();
                            }
                        }}
                        placeholder="Search languages"
                        aria-label="Search languages"
                        className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-[14px]"
                    />
                </label>
            </div>

            <div ref={listRef} onKeyDown={onListKey} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2.5">
                {!q && suggested.length > 0 && (
                    <section aria-label="Suggested languages" className="pt-3">
                        <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                            {place ? `Suggested for ${place}` : 'Suggested for you'}
                        </h3>
                        <div data-lang-grid className="grid grid-cols-2 gap-2">
                            {suggested.map(l => (
                                <button
                                    key={l.code}
                                    type="button"
                                    data-lang-item
                                    onClick={() => onPick(l.code)}
                                    aria-pressed={current === l.code}
                                    className={cn(
                                        'flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition-[background-color,box-shadow,transform] motion-safe:active:scale-[0.98]',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
                                        current === l.code ? 'bg-sky-50 ring-sky-500/50' : 'bg-slate-50 ring-slate-900/[0.06] hover:bg-sky-50/70 hover:ring-sky-500/25',
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span lang={l.code} className="block truncate text-[16px] font-semibold leading-tight text-slate-900">{l.native}</span>
                                        <span className="block truncate text-[12px] text-slate-500">{l.name}</span>
                                    </span>
                                    {current === l.code
                                        ? <Check className="h-4 w-4 shrink-0 text-sky-600" strokeWidth={3} />
                                        : typing && needsKeyboard(l) && <KeyboardMark />}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section aria-label={q ? 'Matching languages' : 'All languages'} className="pt-3">
                    {!q && (
                        <h3 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">All languages</h3>
                    )}
                    {results.length ? (
                        <div data-lang-grid className="grid grid-cols-2 gap-x-1 sm:grid-cols-3">
                            {results.map(l => {
                                const selected = current === l.code;
                                const sameName = l.native.toLowerCase() === l.name.toLowerCase();
                                return (
                                    <button
                                        key={l.code}
                                        type="button"
                                        data-lang-item
                                        onClick={() => onPick(l.code)}
                                        aria-pressed={selected}
                                        title={!typing ? l.name : l.itc ? `${l.name} — type in English letters` : needsKeyboard(l) ? `${l.name} — type with a ${l.name} keyboard` : l.name}
                                        className={cn(
                                            'flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
                                            selected ? 'bg-sky-50' : 'hover:bg-slate-100',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span lang={l.code} className={cn('block truncate text-[14px] font-medium leading-snug', selected ? 'text-sky-800' : 'text-slate-900')}>{l.native}</span>
                                            {!sameName && <span className="block truncate text-[11.5px] leading-snug text-slate-500">{l.name}</span>}
                                        </span>
                                        {selected
                                            ? <Check className="h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                                            : typing && needsKeyboard(l) && <KeyboardMark small />}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="px-1 py-6 text-center text-[13.5px] text-slate-500">No language called “{query.trim()}”.</p>
                    )}
                </section>
            </div>

            {typing && (
                <p className="flex items-start gap-1.5 border-t border-slate-900/[0.07] bg-slate-50/80 px-3.5 py-2 text-[11.5px] leading-snug text-slate-500">
                    <Keyboard className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>Marked languages need their own keyboard. For the rest, type in English letters — हिंदी, العربية, 中文 and others appear when you press space.</span>
                </p>
            )}
        </>
    );
}
