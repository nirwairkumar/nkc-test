/**
 * Phone number with its country calling code, picked for the visitor: where Cloudflare
 * says they are (lib/typingLanguages loadVisitorLocale, cached a day), else the region in
 * their browser language, else India. They can change it; we never override their pick.
 *
 * The country picker is a native <select> under a styled label, so phones get their own
 * wheel/list and keyboards and screen readers work as usual. Country letters stand in for
 * flags, which Windows can't draw.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DIAL_CODES, dialCountries, guessCountryFromBrowser } from '@/lib/dialCodes';
import { loadVisitorLocale } from '@/lib/typingLanguages';

interface Props {
    id?: string;
    /** "+<code> <number>", or '' when no number is typed. */
    onChange: (full: string) => void;
    /** Clears the number (after a successful send). */
    resetKey?: number;
}

export default function PhoneField({ id, onChange, resetKey }: Props) {
    const countries = useMemo(dialCountries, []);
    const [country, setCountry] = useState(() => guessCountryFromBrowser() || 'IN');
    const [number, setNumber] = useState('');
    const picked = useRef(false);

    useEffect(() => {
        let alive = true;
        loadVisitorLocale().then(({ country: c }) => {
            if (alive && !picked.current && c && DIAL_CODES[c]) setCountry(c);
        });
        return () => { alive = false; };
    }, []);

    useEffect(() => { setNumber(''); }, [resetKey]);

    useEffect(() => {
        const digits = number.replace(/[^\d]/g, '');
        onChange(digits ? `+${DIAL_CODES[country]} ${number.trim()}` : '');
    }, [country, number, onChange]);

    return (
        <div className="flex h-10 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-transparent transition-shadow focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/40 sm:max-w-[320px]">
            <div className="relative flex shrink-0 items-center gap-1.5 border-r border-slate-200/80 pl-3 pr-2 text-[14px] text-slate-800">
                <span className="rounded bg-white px-1 text-[10px] font-bold tracking-wide text-slate-500 ring-1 ring-slate-900/10">{country}</span>
                <span className="tabular-nums">+{DIAL_CODES[country]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <select
                    value={country}
                    onChange={e => { picked.current = true; setCountry(e.target.value); }}
                    aria-label="Country code"
                    className="absolute inset-0 cursor-pointer opacity-0"
                >
                    {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>
                    ))}
                </select>
            </div>
            <input
                id={id}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={number}
                onChange={e => setNumber(e.target.value.replace(/[^\d\s-]/g, '').slice(0, 20))}
                placeholder="Phone number"
                className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
        </div>
    );
}
