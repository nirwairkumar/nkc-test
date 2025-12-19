
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { transliterateWord } from '@/lib/ime';
import { cn } from '@/lib/utils';

interface IMEInputProps {
    value: string;
    onChange: (value: string) => void;
    typingMode: 'en' | 'hi';
    as?: 'input' | 'textarea';
    className?: string;
    placeholder?: string;
    [key: string]: any; // Spread other props
}

export const IMEInput: React.FC<IMEInputProps> = ({
    value,
    onChange,
    typingMode,
    as = 'input',
    className,
    ...props
}) => {
    const Component = as === 'textarea' ? Textarea : Input;
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [currentWordStart, setCurrentWordStart] = useState<number | null>(null);
    const inputRef = useRef<any>(null);

    // Close suggestions on click outside or blur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setSuggestions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorUrl = e.target.selectionStart || 0;

        onChange(newValue);

        if (typingMode !== 'hi') {
            setSuggestions([]);
            return;
        }

        // Detect word being typed
        const textBeforeCursor = newValue.slice(0, cursorUrl);
        const words = textBeforeCursor.split(/[\s\n]/);
        const currentWord = words[words.length - 1];

        if (currentWord && /^[a-zA-Z]+$/.test(currentWord)) {
            // It's a valid English-like word being typed
            setCurrentWordStart(cursorUrl - currentWord.length);
            const transliterations = transliterateWord(currentWord);
            setSuggestions(transliterations);
            setSuggestionIndex(0);
        } else {
            setSuggestions([]);
            setCurrentWordStart(null);
        }
    };

    const applySuggestion = (suggestion: string) => {
        if (currentWordStart === null || !inputRef.current) return;

        // Use current cursor position to determine end of word
        // But since we are selecting, we might have moved? 
        // Best to use "currentWordStart" + length of whatever generated the suggestions?
        // Actually, we need to reconstruct from the input's current value.
        // Re-calculate current word based on inputRef value to depend on latest state
        const val = inputRef.current.value;
        const cursor = inputRef.current.selectionStart || 0;

        // Find the word boundary at cursor
        // (Simplified: we assume we are AT the end of the word or inside it)
        // But our "onChange" logic assumes typing at the END. 
        // Let's rely on stored "currentWordStart" and replace until current cursor.

        const beforeWord = val.slice(0, currentWordStart);
        const afterCursor = val.slice(cursor);

        // The part to replace is from currentWordStart to cursor
        const newValue = beforeWord + suggestion + afterCursor;

        onChange(newValue);
        setSuggestions([]);

        // Restore cursor position roughly (after the inserted word)
        // We need a timeout for React to update the value first
        setTimeout(() => {
            if (inputRef.current) {
                const newCursorPos = beforeWord.length + suggestion.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionIndex(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            applySuggestion(suggestions[suggestionIndex]);
        } else if (e.key === 'Escape') {
            setSuggestions([]);
        } else if (e.key === ' ' && suggestions.length > 0) {
            // Optional: Space selects the first suggestion? 
            // Standard IME often selects first suggestion on space
            e.preventDefault(); // Prevent space briefly
            applySuggestion(suggestions[suggestionIndex]);
            // Then we need to append the space that triggered it? 
            // In standard IME, space commits the word AND adds a space.
            setTimeout(() => {
                onChange(inputRef.current!.value + ' ');
            }, 0);
        }
    };

    return (
        <div className="relative w-full">
            <Component
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className={cn(className, typingMode === 'hi' ? "border-orange-200 focus-visible:ring-orange-200" : "")}
                autoComplete="off"
                {...props}
            />
            {suggestions.length > 0 && (
                <div
                    className="absolute z-50 w-full bg-white border border-slate-200 shadow-lg rounded-md mt-1 overflow-hidden max-h-40 overflow-y-auto"
                    style={{ bottom: as === 'textarea' ? 'auto' : undefined, top: as === 'textarea' ? undefined : undefined }}
                // Positioning logic is simple: just below input. 
                // For textarea, it might float weirdly if long. 
                // Ideally we use a library like floating-ui, but per constraints we keep it simple.
                // We'll just stick it to the bottom of the input container.
                >
                    <div className="flex flex-col bg-white">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                className={cn(
                                    "px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 outline-none transition-colors flex justify-between",
                                    idx === suggestionIndex ? "bg-orange-50 text-orange-900" : ""
                                )}
                                onClick={() => applySuggestion(s)}
                            >
                                <span className="font-medium">{s}</span>
                                {idx < 9 && <span className="text-xs text-slate-400 opacity-50">{idx + 1}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
