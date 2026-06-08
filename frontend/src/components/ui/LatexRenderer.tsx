import * as React from 'react';
import { useMemo, useState, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem'; // Registers \ce{} and \pu{} on this katex instance
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface LatexRendererProps {
    children: string;
    className?: string;
}

/**
 * Custom LaTeX renderer that uses katex directly (not react-latex-next)
 * so that the mhchem extension is properly registered.
 */
const LatexRenderer: React.FC<LatexRendererProps> = ({ children, className }) => {
    const [maximizedTable, setMaximizedTable] = useState<string | null>(null);
    const tableDataRef = useRef<Record<string, string>>({});

    const rendered = useMemo(() => {
        if (!children) return '';

        try {
            let result = children;
            tableDataRef.current = {}; // Clear previous table data

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

            // Brace-aware splitter: splits a string on a delimiter only when
            // the delimiter occurs at brace depth 0. This preserves nested
            // commands like \substack{... \\ ...} and \xrightarrow{...&...}.
            const splitAtDepthZero = (str: string, delimiter: string): string[] => {
                const parts: string[] = [];
                let depth = 0;
                let current = '';
                let i = 0;
                while (i < str.length) {
                    if (str[i] === '{') {
                        depth++;
                        current += str[i];
                        i++;
                    } else if (str[i] === '}') {
                        depth = Math.max(0, depth - 1);
                        current += str[i];
                        i++;
                    } else if (depth === 0 && str.startsWith(delimiter, i)) {
                        parts.push(current);
                        current = '';
                        i += delimiter.length;
                    } else {
                        current += str[i];
                        i++;
                    }
                }
                parts.push(current);
                return parts;
            };

            const renderSingleLatexArray = (matchStr: string, tableId: string): string => {
                const arrayRegex = /\\begin\{array\}\s*\{([^}]*)\}\s*([\s\S]*?)\\end\{array\}/;
                const match = matchStr.match(arrayRegex);
                if (!match) return matchStr;

                const [, format, content] = match;

                // Split into rows using brace-aware splitting on \\
                // This preserves \\ inside nested braces (e.g. \substack{a \\ b})
                const rows = splitAtDepthZero(content, '\\\\');

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

                const hasBottomBorder = content.trim().endsWith('\\hline');
                let tableHtml = `<table style="${hasBottomBorder ? 'border-bottom: 1px solid #cbd5e1;' : ''}">`;

                rows.forEach((row, rowIndex) => {
                    const hasHline = row.includes('\\hline');
                    const cleanRow = row.replace(/\\hline/g, '').trim();
                    if (!cleanRow && rowIndex === rows.length - 1) return;

                    // Brace-aware cell splitting on &
                    const cells = splitAtDepthZero(cleanRow, '&');
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

                        tableHtml += `<td style="text-align: ${align}; border-left: ${bLeft}; border-right: ${bRight}; vertical-align: middle; min-width: max-content;">${swapPlaceholders(renderedCell)}</td>`;
                    });
                    tableHtml += '</tr>';
                });

                tableHtml += '</table>';

                // Wrap table with interactive controls
                const wrappedHtml = `
                    <div class="table-wrapper">
                        <button class="table-maximize-btn" data-table-id="${tableId}" title="Full Screen View">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                        </button>
                        <div class="overflow-x-auto">
                            ${tableHtml}
                        </div>
                    </div>
                `;

                tableDataRef.current[tableId] = tableHtml;
                return wrappedHtml;
            };

            const processMathBlock = (tex: string, displayMode: boolean): string => {
                try {
                    let processedTex = extractImagesFromTex(tex);

                    // Add support for \vspace in math blocks
                    // LaTeX uses \vspace for vertical spacing, but KaTeX requires environments to stack correctly.
                    // We replace \vspace{1em} with \\[1em] and wrap the content in a gathered environment.
                    if (processedTex.includes('\\vspace')) {
                        processedTex = processedTex.replace(/\\vspace\{([^}]*)\}/g, '\\\\[$1]');
                        // If it contains vertical breaks but isn't wrapped in a stacking environment, wrap it.
                        if (!processedTex.includes('\\begin{gathered}') && !processedTex.includes('\\begin{aligned}')) {
                            processedTex = `\\begin{gathered} ${processedTex} \\end{gathered}`;
                        }
                    }

                    let arrayIndex = 0;
                    const arrayMap: Record<string, string> = {};

                    const texWithoutArrays = processedTex.replace(/\\begin\{array\}\s*\{([^}]*)\}\s*([\s\S]*?)\\end\{array\}/g, (matchStr) => {
                        const tableId = `TABLE_${Math.random().toString(36).substr(2, 9)}`;
                        const key = `ARRAYPH${arrayIndex++}`;
                        arrayMap[key] = renderSingleLatexArray(matchStr, tableId);
                        return `\\text{${key}}`;
                    });

                    const isInline = !displayMode;
                    const finalTex = isInline ? `\\displaystyle ${texWithoutArrays.trim()}` : texWithoutArrays.trim();
                    const html = katex.renderToString(finalTex, {
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

            let blockIndex = 0;
            const blockMap: Record<string, string> = {};

            const saveBlock = (html: string) => {
                const key = `__BLOCK_PH_${blockIndex++}__`;
                blockMap[key] = html;
                return key;
            };

            // 1. Replace display math $$...$$ and \[...\]
            // Using lookbehind to ignore escaped \$$
            result = result.replace(/(?<!\\)\$\$\s*([\s\S]*?)\s*(?<!\\)\$\$/g, (_match, tex) => saveBlock(processMathBlock(tex, true)));
            result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_match, tex) => saveBlock(processMathBlock(tex, true)));

            // 2. Replace inline math $...$ and \(...\)
            // Using lookbehind to ignore escaped \$
            result = result.replace(/(?<!\\)\$((?:\\\$|[^\$])*?)(?<!\\)\$/g, (_match, tex) => saveBlock(processMathBlock(tex, false)));
            result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, tex) => saveBlock(processMathBlock(tex, false)));

            // 3. Fallback: Search for \begin{array} OUTSIDE of delimiters
            if (result.includes('\\begin{array}')) {
                result = result.replace(/\\begin\{array\}\s*\{([^}]*)\}\s*([\s\S]*?)\\end\{array\}/g, (matchStr) => {
                    const safeMatch = extractImagesFromTex(matchStr);
                    const tableId = `TABLE_FB_${Math.random().toString(36).substr(2, 9)}`;
                    const tableHtml = renderSingleLatexArray(safeMatch, tableId);
                    return saveBlock(tableHtml);
                });
            }

            // 4. Finally replace remaining images outside of math
            result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => saveBlock(makeImgTag(src, alt)));

            // 5. Convert newlines to <br/> tags
            result = result.replace(/\n/g, '<br/>');

            // 5.5 Replace escaped dollars with literal dollars outside of math blocks
            result = result.replace(/\\\$/g, '$');

            // 6. Restore math blocks and images
            result = result.replace(/__BLOCK_PH_\d+__/g, (match) => blockMap[match] || match);

            // Just in case any IMGPH placeholders leaked out:
            result = swapPlaceholders(result);

            return result;
        } catch (e) {
            return children;
        }
    }, [children]);

    const handleContainerClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.table-maximize-btn') as HTMLElement;
        if (btn) {
            const tableId = btn.getAttribute('data-table-id');
            if (tableId && tableDataRef.current[tableId]) {
                setMaximizedTable(tableDataRef.current[tableId]);
            }
        }
    };

    return (
        <React.Fragment>
            <div
                className={cn("latex-renderer-container font-medium text-slate-800 dark:text-slate-200", className)}
                onClick={handleContainerClick}
            >
                <span dangerouslySetInnerHTML={{ __html: rendered }} />
            </div>

            <Dialog open={!!maximizedTable} onOpenChange={(open) => !open && setMaximizedTable(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none sm:rounded-2xl">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                        <div className="p-6 overflow-x-auto custom-scrollbar modal-table-content">
                            {maximizedTable && (
                                <div
                                    className="latex-renderer-container"
                                    dangerouslySetInnerHTML={{ __html: maximizedTable }}
                                />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
};

export default LatexRenderer;
