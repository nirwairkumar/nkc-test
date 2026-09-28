/**
 * Maths for the JEE guide. Until KaTeX has loaded (jeeKatex.ts), a formula shows
 * its plain-text fallback, so nothing flashes raw code.
 */
import { Fragment } from 'react';
import { texToHtml, useKatex, type Katex } from './jeeKatex';

const cache = new Map<string, string | null>();

function cachedTex(k: Katex, tex: string, display: boolean) {
    const key = `${display ? 'D' : 'I'}${tex}`;
    if (!cache.has(key)) cache.set(key, texToHtml(k, tex, display));
    return cache.get(key) ?? null;
}

export function Tex({ tex, fallback, display = false, className }: { tex: string; fallback?: string; display?: boolean; className?: string }) {
    const k = useKatex();
    const out = k ? cachedTex(k, tex, display) : null;
    if (!out) return <span className={`jt-fallback${className ? ` ${className}` : ''}`}>{fallback ?? tex}</span>;
    return <span className={className} dangerouslySetInnerHTML={{ __html: out }} />;
}

/** Text with $…$ maths in it, the way question boxes store it. */
export function MathText({ text }: { text: string }) {
    const parts = text.split(/(\$[^$]+\$)/g).filter(Boolean);
    return (
        <>
            {parts.map((part, i) =>
                part.length > 2 && part.startsWith('$') && part.endsWith('$') ? (
                    <Tex key={i} tex={part.slice(1, -1)} />
                ) : (
                    <Fragment key={i}>{part}</Fragment>
                ),
            )}
        </>
    );
}
