import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import LatexRenderer from '@/components/ui/LatexRenderer';

interface IMEInputProps {
    value: string;
    onChange: (value: string) => void;
    typingMode: 'en' | 'hi';
    as?: 'input' | 'textarea';
    className?: string;
    placeholder?: string;
    enablePreview?: boolean;
    /** While editing, show the rendered maths under the box (question builder). */
    livePreview?: boolean;
    [key: string]: any;
}

export interface IMEInputHandle {
    insertAtCursor: (text: string) => void;
    /** Switches to editing (if previewing) and puts the caret at the end. */
    focus: () => void;
}

/** Hindi suggestions (Google Input Tools) for a word typed in English letters. */
async function fetchHindi(word: string): Promise<string[] | null> {
    try {
        const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=hi-t-i0-und&num=5`);
        const data = await res.json();
        const list = data?.[0] === 'SUCCESS' ? data?.[1]?.[0]?.[1] : null;
        return Array.isArray(list) && list.length ? list : null;
    } catch {
        return null;
    }
}

/**
 * Where `word` now stands as a whole word, nearest to where it was typed. Words
 * converted in the meantime change length, so the original position can be off.
 */
function findWord(text: string, word: string, near: number): number {
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

export const IMEInput = React.forwardRef<IMEInputHandle, IMEInputProps>(({
    value,
    onChange,
    typingMode,
    as = 'input',
    className,
    enablePreview = true,
    livePreview = false,
    ...props
}, ref) => {
    const Component = as === 'textarea' || props.multiline ? Textarea : Input;
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [lastWordPos, setLastWordPos] = useState<{ start: number, end: number } | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const lastCursorPosRef = useRef<{ start: number, end: number } | null>(null);
    const caretToEndRef = useRef(false);

    React.useImperativeHandle(ref, () => ({
        insertAtCursor: (text: string) => {
            if (!inputRef.current) {
                const start = lastCursorPosRef.current?.start ?? value.length;
                const end = lastCursorPosRef.current?.end ?? value.length;
                const newValue = value.substring(0, start) + text + value.substring(end);
                onChange(newValue);
                // Stay in the rendered view so the inserted maths/picture shows as it will to students;
                // the next insert lands right after this one.
                lastCursorPosRef.current = { start: start + text.length, end: start + text.length };
                return;
            }
            const el = inputRef.current;
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const newValue = value.substring(0, start) + text + value.substring(end);
            onChange(newValue);
            setTimeout(() => {
                const newPos = start + text.length;
                el.setSelectionRange(newPos, newPos);
                el.focus();
            }, 0);
        },
        focus: () => {
            const el = inputRef.current;
            if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
            } else {
                caretToEndRef.current = true;
                setIsEditing(true);
            }
        }
    }));

    // Editing state for Auto-Preview
    // Default to false (Preview) if there is a value, ensuring "View first" experience.
    // But if value is empty, we must be in Edit mode so user can type.
    const [isEditing, setIsEditing] = useState(!value);
    const isMounted = useRef(false);

    // Auto-focus when switching to edit mode (skip on initial mount)
    useEffect(() => {
        if (isEditing && inputRef.current) {
            if (isMounted.current) {
                inputRef.current.focus();
                if (caretToEndRef.current) {
                    const end = inputRef.current.value.length;
                    inputRef.current.setSelectionRange(end, end);
                    caretToEndRef.current = false;
                }
            }
        }
        isMounted.current = true;
    }, [isEditing]);

    // Text changed while nobody is typing here (filled from a photo, Sy Pad insert, import):
    // show it rendered, the same as after clicking away.
    useEffect(() => {
        const el = inputRef.current;
        if (!enablePreview || !isEditing || !value || !el || document.activeElement === el) return;
        if (/[$\\{*_`#]|!\[/.test(value)) {
            lastCursorPosRef.current = { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length };
            setIsEditing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Auto-resize textarea to fit content height dynamically
    useLayoutEffect(() => {
        if (as === 'textarea' && inputRef.current) {
            const el = inputRef.current;
            const scrollPos = window.scrollY;
            el.style.height = 'auto';
            el.style.overflowY = 'hidden';
            el.style.height = `${el.scrollHeight}px`;
            // Restore scroll position if browser clamped it during the height update
            if (window.scrollY !== scrollPos) {
                window.scrollTo(window.scrollX, scrollPos);
            }
        }
    }, [value, as, isEditing]);

    // Check if we contain math or markup to decide if preview is needed
    // Simple check for LaTeX/Markdown delimiters to avoid unnecessary preview switch on plain text,
    // though rendering all text as Markdown/LaTeX is perfectly valid when enablePreview is true.
    const hasFormatting = value && (value.includes('$') || value.includes('\\') || value.includes('{') || value.includes('*') || value.includes('_') || value.includes('`') || value.includes('#') || value.includes('-') || value.match(/\d+\./) || value.includes('!['));

    // If not enabled or no Formatting, we always stay in "Edit" mode effectively (render input usually)
    // But for consistency, we can just use the toggle logic if enablePreview is true.
    const showPreview = enablePreview && !isEditing && hasFormatting;

    // Hindi typing. A word goes to the transliteration service when space follows it,
    // and the answer can arrive after more keys have been typed. So the space goes in at
    // once, every change is written to the box itself before the parent's state (the
    // next key always lands in the current text), and the word is found again in the
    // text as it is when the answer arrives. Earlier, the answer replaced the whole text
    // captured at the key press, losing letters typed while it was on its way.
    const valueRef = useRef(value);
    valueRef.current = value;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const emit = (next: string, caret: number | null) => {
        const el = inputRef.current;
        if (el && el.value !== next) {
            el.value = next;
            if (caret !== null) el.setSelectionRange(caret, caret);
        }
        valueRef.current = next;
        onChangeRef.current(next);
    };

    const convertWord = (word: string, typedAt: number) => {
        fetchHindi(word).then(list => {
            if (!list) return; // offline or no answer: the word stays in English letters
            const best = list[0];
            const el = inputRef.current;
            const text = el ? el.value : valueRef.current;
            const start = findWord(text, word, typedAt);
            if (start < 0) return; // the word was changed or deleted meanwhile
            const caret = el && document.activeElement === el ? el.selectionStart : null;
            const shift = best.length - word.length;
            emit(text.slice(0, start) + best + text.slice(start + word.length), caret === null ? null : caret > start ? caret + shift : caret);
            setSuggestions(list);
            setLastWordPos({ start, end: start + best.length });
        });
    };

    /** The last space-separated piece before `cursor`, if it is a plain word. */
    const plainWordBefore = (text: string, cursor: number) => {
        const lastWord = text.substring(0, cursor).split(/[\s\n]/).pop() || '';
        return /^[a-zA-Z]+$/.test(lastWord) ? lastWord : null;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (typingMode === 'hi' && e.key === ' ') {
            const el = e.currentTarget;
            const cursor = el.selectionStart ?? el.value.length;
            const lastWord = plainWordBefore(el.value, cursor);
            if (lastWord) {
                e.preventDefault();
                el.setRangeText(' ', cursor, el.selectionEnd ?? cursor, 'end');
                emit(el.value, null);
                convertWord(lastWord, cursor - lastWord.length);
            }
            return;
        }

        if (suggestions.length > 0 && e.key.length === 1) {
            setSuggestions([]);
            setLastWordPos(null);
        }
    };

    const replaceWord = (word: string) => {
        if (!lastWordPos || !inputRef.current) return;
        const el = inputRef.current;
        const text = el.value;
        el.focus();
        emit(text.substring(0, lastWordPos.start) + word + text.substring(lastWordPos.end), lastWordPos.start + word.length);
        setSuggestions([]);
        setLastWordPos(null);
    };

    // Phone keyboards often send no usable key on keydown; the space shows up here instead.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursor = e.target.selectionStart || 0;

        if (typingMode === 'hi' && newValue.length > valueRef.current.length && newValue.charAt(newCursor - 1) === ' ') {
            const lastWord = plainWordBefore(newValue, newCursor - 1);
            if (lastWord) convertWord(lastWord, newCursor - 1 - lastWord.length);
        }
        valueRef.current = newValue;
        onChange(newValue);
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (inputRef.current) {
            lastCursorPosRef.current = {
                start: inputRef.current.selectionStart || 0,
                end: inputRef.current.selectionEnd || 0
            };
        }

        // Prevent unmounting if focus moves to Sy Pad or its trigger
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && (
            relatedTarget.closest('.sy-pad-container') ||
            relatedTarget.classList.contains('sy-pad-container') ||
            relatedTarget.closest('.sy-pad-trigger') ||
            relatedTarget.classList.contains('sy-pad-trigger')
        )) {
            return;
        }

        if (value && enablePreview) {
            setIsEditing(false);
        }

        if (props.onBlur) props.onBlur(e);
    };

    const handlePreviewClick = () => {
        setIsEditing(true);
    };

    return (
        <div className="w-full min-w-0 group/ime-container">
            {showPreview ? (
                <div
                    onClick={handlePreviewClick}
                    className={cn(
                        "w-full min-w-0 overflow-x-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-text min-h-[40px] hover:border-blue-400 transition-colors bg-slate-50/50 text-left [&_.katex-display]:!my-1 [&_.katex-display]:!mx-0 [&_.katex-display]:!text-left [&_.katex]:!text-left",
                        className
                    )}
                >
                    <LatexRenderer>{value}</LatexRenderer>
                </div>
            ) : (
                <>
                    {suggestions.length > 0 && (
                        <div className="flex items-center gap-2 p-1.5 bg-orange-50 border border-orange-100 rounded-t-md overflow-x-auto mb-[-1px] relative z-10">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => { e.preventDefault(); replaceWord(s); }}
                                    className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:bg-orange-100 text-gray-800 whitespace-nowrap shadow-sm"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <Component
                        ref={inputRef as any}
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        className={cn(className, typingMode === 'hi' ? "border-orange-200 focus-visible:ring-orange-200" : "")}
                        autoComplete="off"
                        {...props}
                    />
                    {livePreview && value && (value.includes('$') || value.includes('![')) && (
                        <div className="flex items-start gap-2 border-t border-dashed border-slate-200 px-3 pb-2 pt-1.5 text-left">
                            <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-slate-500">Preview</span>
                            <div className="min-w-0 flex-1 overflow-x-auto text-[15px] text-slate-800 [&_.katex-display]:!my-1 [&_.katex-display]:!text-left">
                                <LatexRenderer>{value}</LatexRenderer>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

IMEInput.displayName = 'IMEInput';
