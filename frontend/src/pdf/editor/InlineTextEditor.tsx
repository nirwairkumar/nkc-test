/**
 * Edits an existing text block in place. The textarea sits exactly over the
 * original text (same baseline, size and a look-alike font) on an opaque patch
 * of the page's own background colour. On commit the edit goes through the
 * real planner/renderer, which draws the text in the PDF's own embedded font.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PageKey, RGB, TextEdit } from '../engine/edits';
import { colorToRgb } from '../engine/interpreter';
import { fromFrame, type TextBlock } from '../engine/layout';
import type { TextPlan } from '../engine/planner';
import { useEditor, rgbCss } from './EditorContext';
import FormatBar, { type Fmt } from './FormatBar';
import { baselineOffset, familyCss } from './fonts';
import type { View } from './geometry';
import { textEditId } from './store';

export interface CommitInfo {
    text: string;
    box: { left: number; top: number; width: number; height: number };
    background: RGB;
    color: RGB;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    lineHeight: number;
    align: string;
}

export function summarizePlan(plan: TextPlan | undefined | null): string | null {
    if (!plan) return null;
    const parts: string[] = [];
    if (plan.substituted.size) {
        const byFont = new Map<string, string[]>();
        for (const [ch, f] of plan.substituted) if (ch.trim()) byFont.set(f, [...(byFont.get(f) ?? []), ch]);
        const list = [...byFont].map(([f, chars]) => `${chars.slice(0, 8).join(' ')}${chars.length > 8 ? ' …' : ''} → ${f}`);
        if (list.length) parts.push(`Not in this PDF's font: ${list.join('; ')}`);
    }
    if (plan.missing.length) parts.push(`No font can show: ${[...new Set(plan.missing)].join(' ')}`);
    if (plan.overflow) parts.push('Text now runs past the original paragraph');
    return parts.length ? parts.join(' · ') : null;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string): number {
    measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!measureCtx) return text.length * 8;
    measureCtx.font = font;
    return Math.max(...text.split('\n').map((l) => measureCtx!.measureText(l).width));
}

export default function InlineTextEditor({
    pageKey,
    block,
    view,
    edit,
    background,
    onClose,
    onTab,
}: {
    pageKey: PageKey;
    block: TextBlock;
    view: View;
    edit?: TextEdit;
    background: RGB;
    onClose: (info: CommitInfo | null) => void;
    onTab: (dir: 1 | -1, info: CommitInfo | null) => void;
}) {
    const { session, state, dispatch } = useEditor();
    const main = block.styles[block.mainStyle];
    const id = textEditId(pageKey, block.id);
    const docFonts = useMemo(() => session.documentFonts(), [session]);

    const original: Fmt = useMemo(
        () => ({ family: 'original', size: Math.round(main.size * 10) / 10, color: colorToRgb(main.fill), bold: main.font.bold, italic: main.font.italic, align: block.align }),
        [main, block.align],
    );
    const [text, setText] = useState(edit?.text ?? block.text);
    const [fmt, setFmt] = useState<Fmt>({
        family: edit?.family ?? original.family,
        size: edit?.size ?? original.size,
        color: edit?.color ?? original.color,
        bold: edit?.bold ?? original.bold,
        italic: edit?.italic ?? original.italic,
        align: edit?.align ?? original.align,
    });
    const [warning, setWarning] = useState<string | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const done = useRef(false);

    const buildEdit = (t: string, f: Fmt): TextEdit | null => {
        const e: TextEdit = { kind: 'text', id, page: pageKey, blockId: block.id, text: t };
        if (edit?.dx) e.dx = edit.dx;
        if (edit?.dy) e.dy = edit.dy;
        if (f.family !== 'original') e.family = f.family;
        if (Math.abs(f.size - original.size) > 0.05) e.size = f.size;
        if (f.color.some((v, i) => Math.abs(v - original.color[i]) > 0.004)) e.color = f.color;
        if (f.bold !== original.bold) e.bold = f.bold;
        if (f.italic !== original.italic) e.italic = f.italic;
        if (f.align !== original.align) e.align = f.align;
        const styled = e.family !== undefined || e.size !== undefined || !!e.color || e.bold !== undefined || e.italic !== undefined || e.align !== undefined;
        return t === block.text && !styled && !e.dx && !e.dy ? null : e;
    };

    // ---- Geometry
    const sizeScale = fmt.size / main.size;
    const cssFamily = fmt.family === 'original' ? main.font.cssFamily : familyCss(fmt.family, docFonts);
    const fontSize = fmt.size * view.scale;
    const lineHeight = block.paragraph ? block.lineGap * sizeScale * view.scale : fontSize * 1.22;
    const cssFont = `${fmt.italic ? 'italic ' : ''}${fmt.bold ? 700 : 400} ${fontSize}px ${cssFamily}`;
    const first = block.lines[0];
    const left0 = block.paragraph ? block.uLeft : first.u0;
    const [bx, by] = fromFrame(block.angle, left0, first.v);
    const [sx, sy] = view.toScreen(bx + (edit?.dx ?? 0), by + (edit?.dy ?? 0));
    const angle = view.screenAngle(block.angle);
    const baseOff = baselineOffset(cssFamily, fmt.bold, fmt.italic, fontSize, lineHeight);
    const origWidth = (block.paragraph ? block.uRight - block.uLeft : first.u1 - first.u0) * view.scale;
    const width = block.paragraph ? origWidth * Math.max(1, sizeScale) : Math.max(origWidth, measure(text || ' ', cssFont) + fontSize * 0.3);
    let shift = 0;
    if (!block.paragraph && fmt.align === 'right') shift = origWidth - width;
    else if (!block.paragraph && fmt.align === 'center') shift = (origWidth - width) / 2;
    const indent = block.paragraph ? (first.u0 - block.uLeft) * view.scale : 0;

    const [height, setHeight] = useState(lineHeight * Math.max(1, block.lines.length));
    useLayoutEffect(() => {
        // Single lines: exactly one line box per hard line (scrollHeight over-reports for wrap=off).
        if (!block.paragraph) {
            setHeight(lineHeight * Math.max(1, text.split('\n').length));
            return;
        }
        const ta = taRef.current;
        if (!ta) return;
        ta.style.height = '0px';
        const h = Math.max(lineHeight, ta.scrollHeight);
        // Set it directly too: if `h` equals the current state React won't re-apply it.
        ta.style.height = `${h}px`;
        setHeight(h);
    }, [text, fmt, lineHeight, width, block.paragraph]);

    useEffect(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(ta.value.length, ta.value.length);
    }, []);

    const info = (): CommitInfo => ({
        text,
        box: { left: sx + shift, top: sy - baseOff, width, height },
        background,
        color: fmt.color,
        fontFamily: cssFamily,
        fontSize,
        bold: fmt.bold,
        italic: fmt.italic,
        lineHeight,
        align: fmt.align,
    });

    /** Applies the edit; returns ghost info when something visibly changed. */
    const commit = (): CommitInfo | null => {
        if (done.current) return null;
        done.current = true;
        const e = buildEdit(text, fmt);
        if (!e) {
            if (edit) dispatch({ type: 'remove', id });
            return null;
        }
        if (edit && JSON.stringify(edit) === JSON.stringify(e)) return null;
        if (!block.editable) {
            // Font we can't re-encode: remove the old glyphs and retype the text as a new object.
            dispatch({
                type: 'upsertMany',
                edits: [
                    { kind: 'erase', id: `x:${pageKey}:${block.id}`, page: pageKey, rects: [block.bbox], text: true, cover: null },
                    {
                        kind: 'add-text',
                        id: `a:${pageKey}:${block.id}`,
                        page: pageKey,
                        x: bx,
                        y: by,
                        angle: block.angle,
                        text,
                        family: fmt.family === 'original' ? (main.font.fontClass === 'serif' ? 'times' : main.font.fontClass === 'mono' ? 'courier' : 'helvetica') : fmt.family,
                        size: fmt.size,
                        color: fmt.color,
                        bold: fmt.bold,
                        italic: fmt.italic,
                        align: 'left',
                        width: block.paragraph ? block.uRight - block.uLeft : 0,
                        lineHeight: block.paragraph ? block.lineGap / fmt.size : 1.2,
                    },
                ],
            });
            return null;
        }
        dispatch({ type: 'upsert', edit: e });
        return info();
    };

    // Click outside commits.
    useEffect(() => {
        const onDown = (ev: PointerEvent) => {
            if (boxRef.current?.contains(ev.target as Node)) return;
            onClose(commit());
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, fmt]);

    // Live feedback: run the real planner on the draft.
    useEffect(() => {
        const t = setTimeout(async () => {
            const draft = buildEdit(text, fmt);
            if (!draft || !block.editable) return setWarning(null);
            const others = state.edits.filter((e) => e.page === pageKey && e.kind === 'text' && e.id !== id);
            try {
                const rep = await session.plan(pageKey, [...others, draft]);
                setWarning(summarizePlan(rep?.plans.get(id)));
            } catch {
                setWarning(null);
            }
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, fmt]);

    const barAbove = sy - baseOff > 90;

    return (
        <div
            ref={boxRef}
            className="absolute"
            style={{ left: sx + shift, top: sy - baseOff, transform: angle ? `rotate(${angle}rad)` : undefined, transformOrigin: `${-shift}px ${baseOff}px`, zIndex: 30 }}
        >
            <div className={`absolute left-0 ${barAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`} style={{ minWidth: 280 }}>
                <FormatBar
                    value={fmt}
                    onChange={(p) => setFmt((f) => ({ ...f, ...p }))}
                    originalLabel={main.font.displayName}
                    docFonts={docFonts}
                    warning={block.editable ? warning : "This PDF's font can't be re-encoded; your text will be typed in a similar font."}
                    hint={block.paragraph ? 'Ctrl+Enter to finish · Tab: next text · Esc: cancel' : 'Enter to finish · Tab: next text · Esc: cancel'}
                    onRevert={
                        edit
                            ? () => {
                                  done.current = true;
                                  dispatch({ type: 'remove', id });
                                  onClose(null);
                              }
                            : undefined
                    }
                    onDelete={() => {
                        done.current = true;
                        dispatch({ type: 'upsert', edit: { kind: 'text', id, page: pageKey, blockId: block.id, text: '' } });
                        onClose(null);
                    }}
                    onDone={() => onClose(commit())}
                />
            </div>
            <textarea
                ref={taRef}
                value={text}
                rows={1}
                spellCheck={false}
                wrap={block.paragraph ? 'soft' : 'off'}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        done.current = true;
                        onClose(null);
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        onTab(e.shiftKey ? -1 : 1, commit());
                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!block.paragraph && !e.shiftKey))) {
                        e.preventDefault();
                        onClose(commit());
                    }
                }}
                aria-label="Edit text"
                className="block resize-none overflow-hidden border-0 p-0 outline-none ring-2 ring-emerald-500/70 ring-offset-2 selection:bg-emerald-200"
                style={{
                    width,
                    height,
                    font: cssFont,
                    lineHeight: `${lineHeight}px`,
                    color: rgbCss(fmt.color),
                    background: rgbCss(background),
                    whiteSpace: block.paragraph ? 'pre-wrap' : 'pre',
                    textAlign: fmt.align === 'justify' ? 'justify' : fmt.align,
                    textIndent: indent,
                    ['--tw-ring-offset-color' as string]: rgbCss(background),
                }}
            />
        </div>
    );
}
