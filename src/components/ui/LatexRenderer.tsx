import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem'; // Registers \ce{} and \pu{} on this katex instance

interface LatexRendererProps {
    children: string;
    className?: string;
}

/**
 * Custom LaTeX renderer that uses katex directly (not react-latex-next)
 * so that the mhchem extension is properly registered.
 * 
 * Supports:
 *  - Inline math: $...$
 *  - Display math: $$...$$
 *  - Chemistry: \ce{H2O}, \ce{CH4 + 2O2 -> CO2 + 2H2O}
 *  - Physical units: \pu{1.23 J mol-1 K-1}
 */
const LatexRenderer: React.FC<LatexRendererProps> = ({ children, className }) => {
    const rendered = useMemo(() => {
        if (!children) return '';

        try {
            // Split on display math ($$...$$) and inline math ($...$)
            // Process display math first, then inline
            let result = children;

            // 1. Replace display math $$...$$
            result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
                try {
                    return katex.renderToString(tex.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        trust: true,
                        strict: false,
                    });
                } catch (e) {
                    return `<span class="katex-error" style="color:red;">${tex}</span>`;
                }
            });

            // 2. Replace inline math $...$
            result = result.replace(/\$([^\$]*?)\$/g, (_match, tex) => {
                try {
                    return katex.renderToString(tex.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        trust: true,
                        strict: false,
                    });
                } catch (e) {
                    return `<span class="katex-error" style="color:red;">${tex}</span>`;
                }
            });

            return result;
        } catch (e) {
            return children;
        }
    }, [children]);

    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: rendered }}
        />
    );
};

export default LatexRenderer;
