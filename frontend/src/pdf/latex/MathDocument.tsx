/**
 * Renders normalized Markdown + maths as a printable document. List markers
 * are real text (not ::marker) so the vector PDF export can see them.
 */
import { Children, cloneElement, isValidElement, memo, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem';
import { ensureEditorFonts } from '../editor/fonts';

export const PAGE_BREAK_MARK = '⟨page-break⟩';

let mathFontsInjected = false;
/**
 * Web fonts the document uses: the Noto families, plus Noto Devanagari merged
 * into KaTeX's own families (by unicode-range), so Hindi inside \text{} is set
 * in the same font the PDF export embeds rather than a random system fallback.
 */
export function ensureDocumentFonts() {
    ensureEditorFonts();
    if (mathFontsInjected || typeof document === 'undefined') return;
    mathFontsInjected = true;
    // Only the style/weight pairs KaTeX itself defines, so its own faces keep matching.
    const faces: [string, 'normal' | 'italic', 400 | 700][] = [
        ['KaTeX_Main', 'normal', 400],
        ['KaTeX_Main', 'normal', 700],
        ['KaTeX_Main', 'italic', 400],
        ['KaTeX_Main', 'italic', 700],
        ['KaTeX_Math', 'italic', 400],
        ['KaTeX_Math', 'italic', 700],
        ['KaTeX_SansSerif', 'normal', 400],
        ['KaTeX_SansSerif', 'normal', 700],
        ['KaTeX_SansSerif', 'italic', 400],
        ['KaTeX_Typewriter', 'normal', 400],
        ['KaTeX_AMS', 'normal', 400],
    ];
    const range = 'U+0900-097F,U+1CD0-1CFF,U+A8E0-A8FF,U+200C-200D,U+25CC';
    const el = document.createElement('style');
    el.dataset.panna = 'math-fonts';
    el.textContent = faces
        .map(
            ([fam, style, weight]) =>
                `@font-face{font-family:${fam};src:url("/pdf-fonts/NotoSansDevanagari-${weight === 700 ? 'Bold' : 'Regular'}.ttf") format("truetype");font-style:${style};font-weight:${weight};unicode-range:${range};font-display:swap}`,
        )
        .join('\n');
    document.head.appendChild(el);
}

function withMarkers(children: ReactNode, marker: (i: number) => string) {
    let i = 0;
    return Children.map(children, (child) => (isValidElement(child) ? cloneElement(child as ReactElement<Record<string, unknown>>, { 'data-marker': marker(i++) }) : child));
}

function MathDocumentInner({ markdown, macros }: { markdown: string; macros: Record<string, string> }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, macros: { ...macros } }]]}
            components={{
                ol: ({ node: _n, start, children, ...rest }) => (
                    <ol className="md-list" {...rest}>
                        {withMarkers(children, (i) => `${(start ?? 1) + i}.`)}
                    </ol>
                ),
                ul: ({ node: _n, children, className, ...rest }) => (
                    <ul className={`md-list ${className ?? ''}`} {...rest}>
                        {withMarkers(children, () => '•')}
                    </ul>
                ),
                li: ({ node: _n, children, ...rest }) => {
                    const marker = (rest as Record<string, unknown>)['data-marker'] as string | undefined;
                    const isTask = typeof rest.className === 'string' && rest.className.includes('task-list-item');
                    return (
                        <li {...rest}>
                            {!isTask && marker && (
                                <span className="md-marker" aria-hidden="true">
                                    {marker}
                                </span>
                            )}
                            {children}
                        </li>
                    );
                },
                p: ({ node: _n, children, ...rest }) => {
                    const flat = Children.toArray(children);
                    if (flat.length === 1 && flat[0] === PAGE_BREAK_MARK) return <div data-page-break="" className="doc-page-break" aria-hidden="true" />;
                    return <p {...rest}>{children}</p>;
                },
                a: ({ node: _n, ...rest }) => <a {...rest} target="_blank" rel="noopener noreferrer" />,
                table: ({ node: _n, ...rest }) => (
                    <div className="doc-table">
                        <table {...rest} />
                    </div>
                ),
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
}

export const MathDocument = memo(MathDocumentInner);

/** Document typography. Kept in one string so preview and export share it exactly. */
export function documentCss(scope: string, opts: { family: 'serif' | 'sans'; sizePt: number }) {
    const body = opts.family === 'serif' ? '"Panna Noto Serif", "Panna Noto Devanagari", serif' : '"Panna Noto Sans", "Panna Noto Devanagari", sans-serif';
    return `
${scope}{font-family:${body};font-size:${opts.sizePt}pt;line-height:1.55;color:#111827;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;counter-reset:katexEqnNo mmlEqnNo}
${scope} h1,${scope} h2,${scope} h3,${scope} h4,${scope} h5{font-weight:700;line-height:1.25;color:#0b1220;margin:1.1em 0 .45em}
${scope} h1{font-size:1.7em}${scope} h2{font-size:1.38em}${scope} h3{font-size:1.18em}${scope} h4,${scope} h5{font-size:1.04em}
${scope} > :first-child{margin-top:0}
${scope} p{margin:.55em 0}
${scope} strong{font-weight:700}
${scope} em{font-style:italic}
${scope} .md-list{list-style:none;margin:.45em 0;padding-left:1.7em}
${scope} li{position:relative;margin:.25em 0}
${scope} .md-marker{position:absolute;left:-1.7em;width:1.35em;text-align:right;font-variant-numeric:tabular-nums}
${scope} li > p{margin:.2em 0}
${scope} .task-list-item input{margin-right:.4em}
${scope} blockquote{margin:.8em 0;padding:.2em 0 .2em 1em;border-left:3px solid #10b981;color:#374151}
${scope} hr{border:0;border-top:1px solid #d1d5db;margin:1.2em 0}
${scope} code{font-family:"Courier New",Courier,monospace;font-size:.92em;background:#f3f4f6;padding:.05em .3em;border-radius:3px}
${scope} pre{background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:.7em .9em;white-space:pre-wrap;font-size:.9em}
${scope} pre code{background:none;padding:0}
${scope} .doc-table{margin:.8em 0}
${scope} table{border-collapse:collapse;width:auto;max-width:100%}
${scope} th,${scope} td{border:1px solid #cbd5e1;padding:.3em .6em;text-align:left;vertical-align:top}
${scope} th{background:#f1f5f9;font-weight:700}
${scope} .katex{font-size:1.08em}
${scope} .katex-display{margin:.75em 0;overflow-x:auto;overflow-y:hidden;padding:.1em 0}
${scope} .katex-error{color:#b91c1c;font-family:"Courier New",monospace;font-size:.9em}
${scope} a{color:#047857;text-decoration:underline}
${scope} img{max-width:100%}
${scope} .doc-page-break{height:0}
`;
}
