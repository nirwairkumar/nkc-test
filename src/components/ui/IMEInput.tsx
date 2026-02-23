import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface IMEInputProps {
    value: string;
    onChange: (value: string) => void;
    typingMode: 'en' | 'hi';
    as?: 'input' | 'textarea';
    className?: string;
    placeholder?: string;
    enablePreview?: boolean;
    [key: string]: any;
}

export const IMEInput: React.FC<IMEInputProps> = ({
    value,
    onChange,
    typingMode,
    as = 'input',
    className,
    enablePreview = true,
    ...props
}) => {
    const Component = as === 'textarea' || props.multiline ? Textarea : Input;
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [lastWordPos, setLastWordPos] = useState<{ start: number, end: number } | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    // Editing state for Auto-Preview
    // Default to false (Preview) if there is a value, ensuring "View first" experience.
    // But if value is empty, we must be in Edit mode so user can type.
    const [isEditing, setIsEditing] = useState(!value);

    // Auto-focus when switching to edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    // Check if we contain math or markup to decide if preview is needed
    // Simple check for LaTeX/Markdown delimiters to avoid unnecessary preview switch on plain text,
    // though rendering all text as Markdown/LaTeX is perfectly valid when enablePreview is true.
    const hasFormatting = value && (value.includes('$') || value.includes('\\') || value.includes('{') || value.includes('*') || value.includes('_') || value.includes('`') || value.includes('#') || value.includes('-') || value.match(/\d+\./));

    // If not enabled or no Formatting, we always stay in "Edit" mode effectively (render input usually)
    // But for consistency, we can just use the toggle logic if enablePreview is true.
    const showPreview = enablePreview && !isEditing && hasFormatting;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (typingMode === 'hi' && e.key === ' ') {
            const cursor = e.currentTarget.selectionStart || 0;
            const text = e.currentTarget.value;
            const textBefore = text.substring(0, cursor);
            const words = textBefore.split(/[\s\n]/);
            const lastWord = words[words.length - 1];

            if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
                e.preventDefault();
                fetch(`https://inputtools.google.com/request?text=${lastWord}&itc=hi-t-i0-und&num=5`)
                    .then(res => res.json())
                    .then(data => {
                        if (data[0] === 'SUCCESS' && data[1][0] && data[1][0][1]) {
                            const suggestionsList = data[1][0][1];
                            const bestMatch = suggestionsList[0];
                            const newValue = text.substring(0, cursor - lastWord.length) + bestMatch + " " + text.substring(cursor);
                            onChange(newValue);

                            setTimeout(() => {
                                if (inputRef.current) {
                                    const newPos = cursor - lastWord.length + bestMatch.length + 1;
                                    inputRef.current.setSelectionRange(newPos, newPos);
                                }
                            }, 0);

                            setSuggestions(suggestionsList);
                            setLastWordPos({
                                start: cursor - lastWord.length,
                                end: cursor - lastWord.length + bestMatch.length
                            });
                        } else {
                            const newValue = text.substring(0, cursor) + " " + text.substring(cursor);
                            onChange(newValue);
                            setTimeout(() => {
                                if (inputRef.current) inputRef.current.setSelectionRange(cursor + 1, cursor + 1);
                            }, 0);
                        }
                    })
                    .catch(() => {
                        const newValue = text.substring(0, cursor) + " " + text.substring(cursor);
                        onChange(newValue);
                    });
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
        const text = value;
        const newValue = text.substring(0, lastWordPos.start) + word + text.substring(lastWordPos.end);
        onChange(newValue);
        setSuggestions([]);
        setLastWordPos(null);
        setTimeout(() => {
            if (inputRef.current) {
                const newPos = lastWordPos.start + word.length;
                inputRef.current.setSelectionRange(newPos, newPos);
                inputRef.current.focus();
            }
        }, 0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursor = e.target.selectionStart || 0;

        if (typingMode === 'hi' && newValue.length > value.length) {
            const charBefore = newValue.charAt(newCursor - 1);
            if (charBefore === ' ') {
                const textBefore = newValue.substring(0, newCursor);
                const words = textBefore.trimEnd().split(/[\s\n]/);
                const lastWord = words[words.length - 1];

                if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
                    fetch(`https://inputtools.google.com/request?text=${lastWord}&itc=hi-t-i0-und&num=5`)
                        .then(res => res.json())
                        .then(data => {
                            if (data[0] === 'SUCCESS' && data[1][0] && data[1][0][1]) {
                                const suggestionsList = data[1][0][1];
                                const bestMatch = suggestionsList[0];
                                const startIdx = newCursor - 1 - lastWord.length;
                                const finalValue = newValue.substring(0, startIdx) + bestMatch + " " + newValue.substring(newCursor);
                                onChange(finalValue);
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        const newPos = startIdx + bestMatch.length + 1;
                                        inputRef.current.setSelectionRange(newPos, newPos);
                                    }
                                }, 0);
                                setSuggestions(suggestionsList);
                                setLastWordPos({ start: startIdx, end: startIdx + bestMatch.length });
                                return;
                            }
                        })
                        .catch(err => console.error(err));
                }
            }
        }
        onChange(newValue);
    };

    const handleBlur = (e: React.FocusEvent) => {
        // Delay blur processing slightly to allow clicks on suggestion buttons to fire first
        // But for switching to preview, we just do it.
        // If clicking a suggestion, that's inside the component? 
        // No, suggestions map is right above.

        // IMPORTANT: If we are clicking a suggestion, we shouldn't close verify.
        // We can check relatedTarget.

        // Actually, let's just use simple toggle.
        if (value && enablePreview) {
            setIsEditing(false);
        }

        if (props.onBlur) props.onBlur(e);
    };

    const handlePreviewClick = () => {
        setIsEditing(true);
    };

    return (
        <div className="w-full group/ime-container">
            {showPreview ? (
                <div
                    onClick={handlePreviewClick}
                    className={cn(
                        "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-text min-h-[40px] hover:border-blue-400 transition-colors bg-slate-50/50 text-left [&_.katex-display]:!my-1 [&_.katex-display]:!mx-0 [&_.katex-display]:!text-left [&_.katex]:!text-left",
                        className
                    )}
                >
                    {/* @ts-ignore */}
                    <Latex strict={false} trust={true}>
                        {value}
                    </Latex>
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
                </>
            )}
        </div>
    );
};
