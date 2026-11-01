/**
 * Chemistry and maths for /chemistry-question-paper-maker, drawn the way TestoZa's
 * LatexRenderer draws it: text with $…$ around LaTeX, inline maths prefixed with
 * \displaystyle (full-size fractions in a sentence), KaTeX with mhchem for \ce{} and
 * \pu{}. KaTeX loads on demand through the JEE guide's loader
 * (jeeKatex.ts), so the article never waits for it; until then a formula shows its
 * plain-text version.
 */
import { Fragment } from 'react';
import { texToHtml, useKatex, type Katex } from '../jeeKatex';

const cache = new Map<string, string | null>();

function render(k: Katex, tex: string, display: boolean) {
    const key = `${display ? 'D' : 'I'}${tex}`;
    if (!cache.has(key)) cache.set(key, texToHtml(k, display ? tex : `\\displaystyle ${tex}`, display));
    return cache.get(key) ?? null;
}

/** One formula. */
export function Tex({ tex, plain, display = false, className }: { tex: string; plain?: string; display?: boolean; className?: string }) {
    const k = useKatex();
    const out = k ? render(k, tex, display) : null;
    if (!out) return <span className={`cq-tex-wait${className ? ` ${className}` : ''}`}>{plain ?? tex}</span>;
    return <span className={className} dangerouslySetInnerHTML={{ __html: out }} />;
}

/** Question or option text with $…$ maths in it. `plain` stands in until KaTeX has loaded. */
export function MathText({ text, plain }: { text: string; plain?: string }) {
    const k = useKatex();
    if (!k) return <span className="cq-tex-wait">{plain ?? text.replace(/\$/g, '')}</span>;
    const parts = text.split(/(\$[^$]+\$)/g).filter(Boolean);
    return (
        <>
            {parts.map((part, i) => {
                if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
                    const html = render(k, part.slice(1, -1), false);
                    return html ? <span key={i} dangerouslySetInnerHTML={{ __html: html }} /> : <Fragment key={i}>{part}</Fragment>;
                }
                return <Fragment key={i}>{part}</Fragment>;
            })}
        </>
    );
}
