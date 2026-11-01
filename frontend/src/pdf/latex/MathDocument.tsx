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

import { PAGE_BREAK_MARK } from './documentStyle';

export { PAGE_BREAK_MARK };

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
