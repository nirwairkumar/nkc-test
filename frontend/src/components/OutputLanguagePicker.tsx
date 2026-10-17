import React, { useState } from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { LanguageMenuContent } from '@/components/test-builder/LanguageSwitch';
import { cn } from '@/lib/utils';
import { getLanguage, setSecondLanguage, useLanguageSuggestions, useSecondLanguage } from '@/lib/typingLanguages';

const CHIP = 'px-2.5 py-1 rounded-lg text-xs font-medium transition-all';
const ON = 'bg-indigo-600 text-white shadow-sm';
const OFF = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';

/**
 * AI import's "Language Output": Same as Material · English · <the teacher's own language> · 文A ▾.
 * The third chip is the builder's second language if one was picked, otherwise the first
 * suggestion for where the teacher is (Maharashtra → मराठी, Bangladesh → বাংলা). 文A opens
 * the builder's language menu; a pick there becomes the page-wide second language too.
 *
 * `value` holds what the API takes: 'default', or English language names in order —
 * two or more make a bilingual paper with the first on top (pdf_vision_pipeline.build_prompt).
 */
export function OutputLanguagePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const second = useSecondLanguage();
    const { codes } = useLanguageSuggestions();
    const regional = second ?? getLanguage(codes[0]) ?? null;
    const [open, setOpen] = useState(false);

    const toggle = (name: string) => {
        if (name === 'default') { onChange(['default']); return; }
        const rest = value.filter(l => l !== 'default');
        const next = rest.includes(name) ? rest.filter(l => l !== name) : [...rest, name];
        onChange(next.length ? next : ['default']);
    };

    const pickFromMenu = (code: string) => {
        const lang = getLanguage(code);
        setOpen(false);
        if (!lang) return;
        setSecondLanguage(code);
        const rest = value.filter(l => l !== 'default');
        // The new language takes the old one's place, so a bilingual paper keeps its order.
        const next = regional && rest.includes(regional.name)
            ? rest.map(l => (l === regional.name ? lang.name : l))
            : [...rest, lang.name];
        onChange(next.filter((l, i) => next.indexOf(l) === i));
    };

    // Languages chosen earlier that are no longer the third chip (another tab changed it).
    const extras = value.filter(l => l !== 'default' && l !== 'English' && l !== regional?.name);

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" onClick={() => toggle('default')} className={cn(CHIP, value.includes('default') ? ON : OFF)}>
                Same as Material
            </button>
            <button type="button" onClick={() => toggle('English')} className={cn(CHIP, value.includes('English') ? ON : OFF)}>
                English
            </button>
            {regional && (
                <button
                    type="button"
                    lang={regional.code}
                    title={regional.name}
                    onClick={() => { setSecondLanguage(regional.code); toggle(regional.name); }}
                    className={cn(CHIP, value.includes(regional.name) ? ON : OFF)}
                >
                    {regional.native}
                </button>
            )}
            {extras.map(name => (
                <button key={name} type="button" onClick={() => toggle(name)} title={`${name} — tap to remove`} className={cn(CHIP, ON)}>
                    {name}
                </button>
            ))}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label="Choose another language"
                        title="Another language — Marathi, Bengali, Tamil, Arabic…"
                        className={cn(CHIP, 'inline-flex items-center gap-0.5 px-2', open ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : OFF)}
                    >
                        <Languages className="h-3.5 w-3.5" strokeWidth={2.25} />
                        <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform duration-200', open && 'rotate-180')} strokeWidth={2.5} />
                    </button>
                </PopoverTrigger>
                <LanguageMenuContent current={second?.code ?? null} onPick={pickFromMenu} typing={false} align="start" />
            </Popover>
        </div>
    );
}
