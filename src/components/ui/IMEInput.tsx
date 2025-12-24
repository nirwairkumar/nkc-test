import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';


interface IMEInputProps {
    value: string;
    onChange: (value: string) => void;
    typingMode: 'en' | 'hi';
    as?: 'input' | 'textarea';
    className?: string;
    placeholder?: string;
    [key: string]: any;
}

export const IMEInput: React.FC<IMEInputProps> = ({
    value,
    onChange,
    typingMode,
    as = 'input',
    className,
    ...props
}) => {
    // Only difference: Textarea vs Input
    // Ideally we always use Textarea for multi-line support as asked, or we respect 'as' prop but default to Textarea for questions?
    // User requested: "fix the issue so the user can type next line... (question and all options text-area)"
    // So we should force Textarea or ensure the passed component supports multiline.
    // The "Input" component is usually single line. We will prefer Textarea.

    // Actually, for specific fields like "Option A" which are usually short, user MIGHT want multiline but it looks like a single line input.
    // Let's stick with the prop but default question to Textarea in parent. 
    // However, user specifically asked "question and all options text-area". 
    // So we will override for options too if they are currently passed as 'input'.

    const Component = as === 'textarea' || props.multiline ? Textarea : Input;

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [lastWordPos, setLastWordPos] = useState<{ start: number, end: number } | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // If Enter is pressed, let it work naturally for new lines (if it's a textarea)
        // unless we are selecting a suggestion? No, user wants natural behavior.
        // We only intercept Space for transliteration.

        if (typingMode === 'hi' && e.key === ' ') {
            const cursor = e.currentTarget.selectionStart || 0;
            const text = e.currentTarget.value;

            // Get text before cursor
            const textBefore = text.substring(0, cursor);
            const words = textBefore.split(/[\s\n]/); // Split by space or newline
            const lastWord = words[words.length - 1];

            if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
                e.preventDefault(); // Stop space

                // Fetch suggestion
                fetch(`https://inputtools.google.com/request?text=${lastWord}&itc=hi-t-i0-und&num=5`)
                    .then(res => res.json())
                    .then(data => {
                        if (data[0] === 'SUCCESS' && data[1][0] && data[1][0][1]) {
                            const suggestionsList = data[1][0][1];
                            const bestMatch = suggestionsList[0];

                            const newValue = text.substring(0, cursor - lastWord.length) + bestMatch + " " + text.substring(cursor);
                            onChange(newValue);

                            // Set cursor position: (cursor - lastWordLen) + bestMatchLen + 1 (space)
                            // We need to wait for render or use a layout effect, but simple timeout usually works in simple inputs
                            setTimeout(() => {
                                if (inputRef.current) {
                                    const newPos = cursor - lastWord.length + bestMatch.length + 1;
                                    inputRef.current.setSelectionRange(newPos, newPos);
                                }
                            }, 0);

                            // Show suggestions bar
                            setSuggestions(suggestionsList);
                            setLastWordPos({
                                start: cursor - lastWord.length,
                                end: cursor - lastWord.length + bestMatch.length
                            });
                        } else {
                            // Fallback
                            const newValue = text.substring(0, cursor) + " " + text.substring(cursor);
                            onChange(newValue);
                            setTimeout(() => {
                                if (inputRef.current) {
                                    inputRef.current.setSelectionRange(cursor + 1, cursor + 1);
                                }
                            }, 0);
                        }
                    })
                    .catch(() => {
                        // Fallback
                        const newValue = text.substring(0, cursor) + " " + text.substring(cursor);
                        onChange(newValue);
                    });
            }
            return;
        }

        // On any other key, clear suggestions (unless it's navigation?)
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
        setLastWordPos(null); // Or update it? No, once replaced, we are done.

        setTimeout(() => {
            if (inputRef.current) {
                const newPos = lastWordPos.start + word.length;
                inputRef.current.setSelectionRange(newPos, newPos);
                inputRef.current.focus();
            }
        }, 0);
    };

    return (
        <div className="w-full">
            {/* Suggestions Bar - Fixed wording to not include "Suggestions:" label as requested */}
            {suggestions.length > 0 && (
                <div className="flex items-center gap-2 p-1.5 bg-orange-50 border border-orange-100 rounded-t-md overflow-x-auto mb-[-1px] relative z-10">
                    {suggestions.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => replaceWord(s)}
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
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(className, typingMode === 'hi' ? "border-orange-200 focus-visible:ring-orange-200" : "")}
                autoComplete="off"
                {...props}
            />
        </div>
    );
};
