import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem'; // Registers \ce{} and \pu{} on this katex instance
import { cn } from '@/lib/utils';

interface LatexRendererProps {
    children: string;
    className?: string;
}

/**
 * Custom LaTeX renderer that uses katex directly (not react-latex-next)
 * so that the mhchem extension is properly registered.
 */
const LatexRenderer: React.FC<LatexRendererProps> = ({ children, className }) => {
    const rendered = useMemo(() => {
        if (!children) return '';

        try {
            let result = children;

            // Image map for placeholders
            const imageMap: Record<string, { src: string; alt: string }> = {};
            let imgIndex = 0;

            const makeImgTag = (src: string, alt: string) => {
                const escapedSrc = src.replace(/"/g, '&quot;');
                const escapedAlt = alt.replace(/"/g, '&quot;');
                // Using max-height/width in pixels since percentage max-widths collapse inside KaTeX table cells.
                return `<img src="${escapedSrc}" alt="${escapedAlt}" style="max-height: 300px; max-width: 400px; object-fit: contain; border-radius: 4px; display: inline-block; vertical-align: middle; margin: 0 4px;" />`;
            };

            const extractImagesFromTex = (tex: string): string => {
                return tex.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
                    const key = `IMGPH${imgIndex++}`;
                    imageMap[key] = { src, alt };
                    return `\\text{${key}}`;
                });
            };

            const swapPlaceholders = (html: string): string => {
                let out = html;
                for (const [key, { src, alt }] of Object.entries(imageMap)) {
                    out = out.split(key).join(makeImgTag(src, alt));
                }
                return out;
            };

            const renderSingleLatexArray = (matchStr: string): string => {
                const arrayRegex = /\\begin\{array\}\s*\{([^}]*)\}\s*([\s\S]*?)\\end\{array\}/;
                const match = matchStr.match(arrayRegex);
                if (!match) return matchStr;

                const [, format, content] = match;

                // Split into rows, handling various LaTeX row separators
                const rows = content.split(/\\\\(?:\s*\[[^\]]*\])?/);

                // Determine alignments and borders from format string (e.g., |l|c|r|)
                const alignments: string[] = [];
                const columnBorders: boolean[] = []; // true if border to the LEFT
                let nextHasBorder = false;

                for (const char of format) {
                    if (char === '|') {
                        nextHasBorder = true;
                    } else if (['l', 'c', 'r'].includes(char)) {
                        alignments.push(char === 'l' ? 'left' : char === 'r' ? 'right' : 'center');
                        columnBorders.push(nextHasBorder);
                        nextHasBorder = false;
                    }
                }
                const hasRightBorder = nextHasBorder;

                let tableHtml = '<table style="border-collapse: collapse; width: auto; margin: 1rem auto; font-family: inherit; line-height: 1.5;">';

                rows.forEach((row, rowIndex) => {
                    const hasHline = row.includes('\\hline');
                    const cleanRow = row.replace(/\\hline/g, '').trim();
                    if (!cleanRow && rowIndex === rows.length - 1) return;

                    const cells = cleanRow.split('&');
                    const rowStyle = hasHline ? 'border-top: 1px solid #cbd5e1;' : '';

                    tableHtml += `<tr style="${rowStyle}">`;

                    cells.forEach((cell, cellIndex) => {
                        const align = alignments[cellIndex] || 'left';
                        const bLeft = columnBorders[cellIndex] ? '1px solid #cbd5e1' : 'none';
                        const bRight = (hasRightBorder && cellIndex === cells.length - 1) ? '1px solid #cbd5e1' : 'none';

                        let renderedCell = '';
                        try {
                            // Sub-cells might just be text or contain images
                            renderedCell = katex.renderToString(cell.trim() || '\\text{ }', {
                                displayMode: false,
                                throwOnError: false,
                                trust: true,
                                strict: false,
                            });
                        } catch (err) {
                            renderedCell = cell.trim();
                        }

                        tableHtml += `<td style="padding: 1rem; text-align: ${align}; border-left: ${bLeft}; border-right: ${bRight}; vertical-align: middle; min-width: max-content;">${swapPlaceholders(renderedCell)}</td>`;
                    });
                    tableHtml += '</tr>';
                });

                // Final bottom border if the content ends with \hline
                if (content.trim().endsWith('\\hline')) {
                    tableHtml = tableHtml.replace(/<\/table>$/, '<tr style="border-top: 1px solid #cbd5e1;"></tr></table>');
                }

                tableHtml += '</table>';
                return tableHtml;
            };

            const processMathBlock = (tex: string, displayMode: boolean): string => {
                try {
                    const safeTex = extractImagesFromTex(tex);
                    
                    let arrayIndex = 0;
                    const arrayMap: Record<string, string> = {};
                    
                    const texWithoutArrays = safeTex.replace(/\\begin\{array\}\s*\{([^}]*)\}\s*([\s\S]*?)\\end\{array\}/g, (matchStr) => {
                        const key = `ARRAYPH${arrayIndex++}`;
                        arrayMap[key] = renderSingleLatexArray(matchStr);
                        return `\\text{${key}}`;
                    });

                    const html = katex.renderToString(texWithoutArrays.trim(), {
                        displayMode,
                        throwOnError: false,
                        trust: true,
                        strict: false,
                    });
                    
                    let finalHtml = swapPlaceholders(html);
                    for (const [key, tableHtml] of Object.entries(arrayMap)) {
                        finalHtml = finalHtml.split(key).join(tableHtml);
                    }
                    return finalHtml;
                } catch (e) {
                    return `<span style="color:red;">${tex}</span>`;
                }
            };

            // 1. Replace display math $$...$$
            result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => processMathBlock(tex, true));

            // 2. Replace inline math $...$
            result = result.replace(/\$([^\$]*?)\$/g, (_match, tex) => processMathBlock(tex, false));

            // 3. Fallback: Search for \begin{array} OUTSIDE of delimiters
            if (result.includes('\\begin{array}')) {
                let arrayIndex = 0;
                const arrayMap: Record<string, string> = {};
                
                result = result.replace(/\\begin\{array\}\s*\{([^}]*)\}\s*([\s\S]*?)\\end\{array\}/g, (matchStr) => {
                    const safeMatch = extractImagesFromTex(matchStr);
                    const tableHtml = renderSingleLatexArray(safeMatch);
                    const key = `ARRAYPHFB${arrayIndex++}`;
                    arrayMap[key] = tableHtml;
                    return key; // Here we are outside math mode, just use direct string replacement
                });
                
                result = swapPlaceholders(result);
                for (const [key, tableHtml] of Object.entries(arrayMap)) {
                    result = result.split(key).join(tableHtml);
                }
            }

            // 4. Finally replace remaining images
            result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => makeImgTag(src, alt));

            return result;
        } catch (e) {
            return children;
        }
    }, [children]);

    return (
        <div className={cn("latex-renderer-container font-medium text-slate-800 dark:text-slate-200", className)}>
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
        </div>
    );
};

export default LatexRenderer;
