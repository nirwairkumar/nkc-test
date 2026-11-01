/**
 * Edits an existing text block in place. The textarea sits exactly over the
 * original text (same baseline, size and a look-alike font) on an opaque patch
 * of the page's own background colour. On commit the edit goes through the
 * real planner/renderer, which draws the text in the PDF's own embedded font.
 * The round handle beside it moves the block (with the same alignment guides
 * as dragging the text itself); the side handles set the width the text wraps to.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Move } from 'lucide-react';
import type { PageKey, RGB, StyleRun, TextEdit } from '../engine/edits';
import { colorToRgb } from '../engine/interpreter';
import { fromFrame, toFrame, type TextBlock } from '../engine/layout';
import type { Rect } from '../engine/matrix';
import { textBox, type TextPlan } from '../engine/planner';
import { normalizeRuns, sameRuns, segments, styleOf } from '../engine/runs';
import { useEditor, rgbCss } from './EditorContext';
import FormatBar, { type Fmt } from './FormatBar';
import { baselineOffset, ensureEditorFonts, familyCss, resetFontMetrics, usesEditorFont } from './fonts';
import RichText, { measureRich, type RichTextHandle, type RunCss } from './RichText';
import { fmtAt, fmtStyle, restyle, runCssFor, runFamilies, runFontFor } from './richFormat';
import type { View } from './geometry';
import GuideLines from './GuideLines';
import { shiftBox, snapEdge, type Box, type Guide, type Item, type Targets } from './guides';
import { blockBaseline, describeOffset, pdfVector, screenVector } from './move';
import { textEditId } from './store';
import { useGuidedDrag } from './useGuidedDrag';

export interface CommitInfo {
    text: string;
    box: { left: number; top: number; width: number; height: number };
    /** Page colour behind the text; null when the text moved off its old spot (nothing to hide there). */
    background: RGB | null;
    /** Where the page still draws the old text until it re-renders, when the text moved away from it. */
    cover?: { left: number; top: number; width: number; height: number; background: RGB };
    color: RGB;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    lineHeight: number;
    align: string;
    /** The text in pieces with their own style (words styled apart), when there are any. */
    parts?: { text: string; css: ReturnType<RunCss> | null }[];
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

/** Same text and layout (offsets aside). */
const sameContent = (a: TextEdit, b: TextEdit) =>
    a.text === b.text &&
    a.family === b.family &&
    a.size === b.size &&
    String(a.color) === String(b.color) &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    sameRuns(a.runs, b.runs) &&
    a.align === b.align &&
    a.width === b.width;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sameEdit = (a: TextEdit, b: TextEdit) => sameContent(a, b) && (a.dx ?? 0) === (b.dx ?? 0) && (a.dy ?? 0) === (b.dy ?? 0);

export default function InlineTextEditor({
    pageKey,
    block,
    view,
    edit,
    rendered,
    background,
    overlay,
    targets,
    onClose,
    onTab,
}: {
    pageKey: PageKey;
    block: TextBlock;
    view: View;
    edit?: TextEdit;
    /** Where the page currently draws this block (page space). */
    rendered: Rect;
    background: RGB;
    overlay: HTMLElement | null;
    /** Alignment targets for moving or resizing the block (given its original place when moving). */
    targets: (home?: Item) => Targets;
    /** `how` is set when the editor closed by cancelling or clicking elsewhere (the block is let go). */
    onClose: (info: CommitInfo | null, how?: 'cancel' | 'outside') => void;
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
    /** Offset (page units) the block will be drawn at; the page draws it at `committed` for now. */
    const committed: [number, number] = [edit?.dx ?? 0, edit?.dy ?? 0];
    const [off, setOff] = useState<[number, number]>(committed);
    const moved = off[0] !== committed[0] || off[1] !== committed[1];
    /** Width (page units) the text wraps to, when the user has set one. */
    const [boxW, setBoxW] = useState<number | null>(edit?.width ?? null);
    const [warning, setWarning] = useState<string | null>(null);
    /** Words styled apart from the rest of the text. */
    const [runs, setRuns] = useState<StyleRun[]>(edit?.runs ?? []);
    /** Bumped when a style change must redraw the text box. */
    const [styleVersion, setStyleVersion] = useState(0);
    /** Selected range in the text box (formatting then applies to it only). */
    const [sel, setSel] = useState<[number, number] | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const rich = useRef<RichTextHandle>(null);
    const done = useRef(false);
    const drag = useGuidedDrag();
    const resize = useGuidedDrag();
    /** Screen box of the text while it is dragged or resized (for guide labels). */
    const dragBox = useRef<Box | null>(null);
    const first = block.lines[0];
    const naturalW = block.paragraph ? block.uRight - block.uLeft : first.u1 - first.u0;

    const buildEdit = (t: string, f: Fmt, rs: StyleRun[] = runs): TextEdit | null => {
        const e: TextEdit = { kind: 'text', id, page: pageKey, blockId: block.id, text: t };
        if (Math.abs(off[0]) >= 0.01) e.dx = round2(off[0]);
        if (Math.abs(off[1]) >= 0.01) e.dy = round2(off[1]);
        if (f.family !== 'original') e.family = f.family;
        if (Math.abs(f.size - original.size) > 0.05) e.size = f.size;
        if (f.color.some((v, i) => Math.abs(v - original.color[i]) > 0.004)) e.color = f.color;
        if (f.bold !== original.bold) e.bold = f.bold;
        if (f.italic !== original.italic) e.italic = f.italic;
        const r = normalizeRuns(rs, t.length, fmtStyle(f));
        if (r.length) e.runs = r;
        if (f.align !== original.align) e.align = f.align;
        if (boxW !== null && Math.abs(boxW - naturalW) > 0.5) e.width = round2(boxW);
        const styled =
            e.family !== undefined || e.size !== undefined || !!e.color || e.bold !== undefined || e.italic !== undefined || !!e.runs || e.align !== undefined || e.width !== undefined;
        return t === block.text && !styled && !e.dx && !e.dy ? null : e;
    };

    // ---- Geometry (along the baseline: u; the planner's own box when a width is set)
    const sizeScale = fmt.size / main.size;
    const cssFamily = fmt.family === 'original' ? main.font.cssFamily : familyCss(fmt.family, docFonts);
    const fontSize = fmt.size * view.scale;
    const lineHeight = block.paragraph ? block.lineGap * sizeScale * view.scale : fontSize * 1.25;
    const cssFont = `${fmt.italic ? 'italic ' : ''}${fmt.bold ? 700 : 400} ${fontSize}px ${cssFamily}`;
    const runCss = useMemo(() => runCssFor(view.scale, main.font.cssFamily, docFonts), [view.scale, main.font, docFonts]);
    const runFont = runFontFor(fmt, view.scale, main.font.cssFamily, docFonts);
    /** Toolbar shows the selected words' style, else the whole text's. */
    const shown = fmtAt(fmt, runs, sel ? sel[0] : null);
    const applyFormat = (p: Partial<Fmt>) => {
        const next = restyle(fmt, runs, text.length, rich.current?.selection() ?? null, p);
        setFmt(next.fmt);
        if (!sameRuns(next.runs, runs)) {
            setRuns(next.runs);
            setStyleVersion((v) => v + 1);
        }
    };
    // Bundled fonts (e.g. the full Playfair Display) arrive after the box first draws: re-measure then.
    const [, bump] = useState(0);
    const families = [cssFamily, ...runFamilies(runs, main.font.cssFamily, docFonts)].filter(usesEditorFont).join('|');
    useEffect(() => {
        ensureEditorFonts();
        if (!families || !document.fonts) return;
        let live = true;
        Promise.all(families.split('|').flatMap((f) => [400, 700].map((w) => document.fonts.load(`${w} 16px ${f}`, text || 'a'))))
            .then(() => {
                if (!live) return;
                resetFontMetrics();
                bump((n) => n + 1);
            })
            .catch(() => {});
        return () => {
            live = false;
        };
    }, [families]); // eslint-disable-line react-hooks/exhaustive-deps
    const box = boxW !== null ? textBox(block, boxW) : null;
    /** The text wraps: paragraphs always, single lines once given a width. */
    const wraps = block.paragraph || box !== null;
    const left0 = box ? box.left : block.paragraph ? block.uLeft : first.u0;
    const [bx, by] = fromFrame(block.angle, left0, first.v);
    const [sx, sy] = view.toScreen(bx + off[0], by + off[1]);
    const angle = view.screenAngle(block.angle);
    const baseOff = baselineOffset(cssFamily, fmt.bold, fmt.italic, fontSize, lineHeight);
    const origWidth = naturalW * view.scale;
    const width = box
        ? (box.right - box.left) * view.scale
        : block.paragraph
          ? origWidth * Math.max(1, sizeScale)
          : Math.max(origWidth, measureRich(text || ' ', runs, cssFont, runFont) + fontSize * 0.3);
    let shift = 0;
    if (!wraps && fmt.align === 'right') shift = origWidth - width;
    else if (!wraps && fmt.align === 'center') shift = (origWidth - width) / 2;
    const indent = block.paragraph ? (first.u0 - block.uLeft) * view.scale : 0;

    const [height, setHeight] = useState(lineHeight * Math.max(1, block.lines.length));
    useLayoutEffect(() => {
        const el = boxRef.current?.querySelector<HTMLElement>('[role="textbox"]');
        if (!el) return;
        setHeight(Math.max(lineHeight, el.offsetHeight));
    }, [text, runs, fmt, lineHeight, width, wraps, styleVersion]);

    useEffect(() => rich.current?.focus(), []);

    /** Moved or re-boxed: the text no longer sits exactly on its old rendering, which must be hidden separately. */
    const detached = moved || boxW !== (edit?.width ?? null);

    const info = (): CommitInfo => ({
        text,
        box: { left: sx + shift, top: sy - baseOff, width, height },
        background: detached ? null : background,
        cover: detached ? { ...view.rectToScreen(rendered), background } : undefined,
        color: fmt.color,
        fontFamily: cssFamily,
        fontSize,
        bold: fmt.bold,
        italic: fmt.italic,
        lineHeight,
        align: fmt.align,
        parts: runs.length ? segments(text.length, runs).map((s) => ({ text: text.slice(s.start, s.end), css: s.run ? runCss(styleOf(s.run)) : null })) : undefined,
    });

    /** Applies the edit; returns ghost info when the text itself visibly changed. */
    const commit = (): CommitInfo | null => {
        if (done.current) return null;
        done.current = true;
        const e = buildEdit(text, fmt);
        if (!e) {
            if (edit) dispatch({ type: 'remove', id });
            return null;
        }
        if (edit && sameEdit(edit, e)) return null;
        const before: TextEdit = edit ?? { kind: 'text', id, page: pageKey, blockId: block.id, text: block.text };
        if (!block.editable && !sameContent(before, e)) {
            // Font we can't re-encode: remove the old glyphs and retype the text as a new object, where it now sits.
            const lookAlike = main.font.webFamily ?? (main.font.fontClass === 'serif' ? 'times' : main.font.fontClass === 'mono' ? 'courier' : 'helvetica');
            const family = fmt.family !== 'original' ? fmt.family : lookAlike;
            const addRuns = normalizeRuns(
                (e.runs ?? []).map((r) => (r.family === 'original' ? { ...r, family: lookAlike } : r)),
                text.length,
                fmtStyle({ ...fmt, family }),
            );
            dispatch({
                type: 'upsertMany',
                remove: edit ? [id] : undefined,
                edits: [
                    { kind: 'erase', id: `x:${pageKey}:${block.id}`, page: pageKey, rects: [block.bbox], text: true, cover: null },
                    {
                        kind: 'add-text',
                        id: `a:${pageKey}:${block.id}`,
                        page: pageKey,
                        x: bx + off[0],
                        y: by + off[1],
                        angle: block.angle,
                        text,
                        family,
                        size: fmt.size,
                        color: fmt.color,
                        bold: fmt.bold,
                        italic: fmt.italic,
                        ...(addRuns.length ? { runs: addRuns } : {}),
                        align: box ? fmt.align : 'left',
                        width: box ? box.right - box.left : block.paragraph ? block.uRight - block.uLeft : 0,
                        lineHeight: block.paragraph ? block.lineGap / fmt.size : 1.25,
                    },
                ],
            });
            return null;
        }
        dispatch({ type: 'upsert', edit: e });
        // A pure move is shown from a copy of the real rendering (see TextBlocksLayer); changed text by a ghost.
        return sameContent(before, e) ? null : info();
    };

    // Click outside commits.
    useEffect(() => {
        const onDown = (ev: PointerEvent) => {
            if (boxRef.current?.contains(ev.target as Node)) return;
            onClose(commit(), 'outside');
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, fmt, runs, off, boxW]);

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
    }, [text, fmt, runs, boxW]);

    const beginMove = (e: RPointerEvent) => {
        e.stopPropagation();
        const ta = textEl();
        const layer = boxRef.current?.parentElement;
        if (!ta || !layer) return;
        const origin = off;
        drag.begin(e, block.id, {
            threshold: 0,
            snap: () => {
                const r = ta.getBoundingClientRect();
                const o = layer.getBoundingClientRect();
                const box = { left: r.left - o.left, top: r.top - o.top, right: r.right - o.left, bottom: r.bottom - o.top };
                dragBox.current = box;
                const [hx, hy] = screenVector(view, -origin[0], -origin[1]);
                return {
                    box,
                    baseline: blockBaseline(view, block, origin),
                    targets: targets({ box: shiftBox(box, hx, hy), baseline: blockBaseline(view, block, [0, 0]) }),
                    page: { width: view.width, height: view.height },
                };
            },
            onMove: (dx, dy) => {
                const [px, py] = pdfVector(view, dx, dy);
                setOff([origin[0] + px, origin[1] + py]);
            },
            onEnd: () => textEl()?.focus({ preventScroll: true }),
            onCancel: () => {
                setOff(origin);
                textEl()?.focus({ preventScroll: true });
            },
        });
    };

    /** Drag a side: the text wraps to the new width while the other side stays where it is. */
    const beginResize = (e: RPointerEvent, side: 'left' | 'right') => {
        e.stopPropagation();
        const ta = textEl();
        const layer = boxRef.current?.parentElement;
        if (!ta || !layer) return;
        const startOff = off, startW = boxW;
        const [du0, dv0] = toFrame(block.angle, off[0], off[1]);
        // The box's sides along the baseline (page units), move offset included.
        const L0 = left0 + shift / view.scale + du0;
        const R0 = L0 + width / view.scale;
        const minW = Math.max(2 * fmt.size, 12);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const r = ta.getBoundingClientRect();
        const o = layer.getBoundingClientRect();
        const start: Box = { left: r.left - o.left, top: r.top - o.top, right: r.right - o.left, bottom: r.bottom - o.top };
        const edge0 = side === 'left' ? start.left : start.right;
        // Guides only for text running across the screen.
        const tg = angle ? null : targets();
        resize.begin(e, block.id, {
            threshold: 0,
            cursor: 'ew-resize',
            resolve: (dx, dy, mods) => {
                let along = dx * cos + dy * sin;
                let guides: Guide[] = [];
                if (tg) {
                    const s = snapEdge(tg, edge0 + along, side === 'left' ? 'start' : 'end', [start.top, start.bottom], mods.free);
                    along = s.x - edge0;
                    guides = s.guides;
                }
                dragBox.current = side === 'left' ? { ...start, left: edge0 + along } : { ...start, right: edge0 + along };
                return { dx: along, dy: 0, guides };
            },
            onMove: (along) => {
                const d = along / view.scale;
                const L = side === 'left' ? Math.min(L0 + d, R0 - minW) : L0;
                const R = side === 'right' ? Math.max(R0 + d, L0 + minW) : R0;
                const w = R - L;
                setBoxW(w);
                // The planner anchors the box by the original alignment; offset it so this side stays put.
                setOff(fromFrame(block.angle, L - textBox(block, w).left, dv0));
            },
            onEnd: () => textEl()?.focus({ preventScroll: true }),
            onCancel: () => {
                setBoxW(startW);
                setOff(startOff);
                textEl()?.focus({ preventScroll: true });
            },
        });
    };

    function textEl() {
        return boxRef.current?.querySelector<HTMLElement>('[role="textbox"]') ?? null;
    }

    const barAbove = sy - baseOff > 90;
    const cover = detached ? view.rectToScreen(rendered) : null;
    const handleCls = 'absolute h-5 w-2.5 cursor-ew-resize rounded-sm border border-emerald-600 bg-white shadow-sm hover:bg-emerald-50';

    return (
        <>
            {/* The page still draws the text at its old place until the edit is applied */}
            {cover && (
                <div className="pointer-events-none absolute" style={{ left: cover.left - 1, top: cover.top - 1, width: cover.width + 2, height: cover.height + 2, background: rgbCss(background) }} />
            )}
            <div
                ref={boxRef}
                className="absolute"
                style={{ left: sx + shift, top: sy - baseOff, transform: angle ? `rotate(${angle}rad)` : undefined, transformOrigin: `${-shift}px ${baseOff}px`, zIndex: 30 }}
            >
                {!drag.state && !resize.state && (
                    <div className={`absolute left-0 ${barAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`} style={{ minWidth: 280 }}>
                        <FormatBar
                            value={shown}
                            onChange={applyFormat}
                            originalLabel={main.font.displayName}
                            docFonts={docFonts}
                            warning={block.editable ? warning : "This PDF's font can't be re-encoded; your text will be typed in a similar font."}
                            hint={
                                sel
                                    ? 'Font, size, colour, bold and italic now change only the selected text'
                                    : `${block.paragraph ? 'Ctrl+Enter' : 'Enter'} to finish · select words to style just them · Tab: next text · Esc: cancel · drag ✥ to move`
                            }
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
                )}
                <span
                    role="button"
                    aria-label="Move this text"
                    title="Drag to move · Shift: straight line · Alt: no snapping"
                    onPointerDown={beginMove}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute right-full mr-4 flex h-6 w-6 cursor-move items-center justify-center rounded-full bg-emerald-600 text-white shadow ring-2 ring-white hover:bg-emerald-700"
                    style={{ top: (lineHeight - 24) / 2, touchAction: 'none' }}
                >
                    <Move className="h-3.5 w-3.5" />
                </span>
                {(['left', 'right'] as const).map((side) => (
                    <span
                        key={side}
                        data-resize={side}
                        aria-hidden="true"
                        title="Drag to change the width — the text re-wraps to fit"
                        onPointerDown={(e) => beginResize(e, side)}
                        onMouseDown={(e) => e.preventDefault()}
                        className={handleCls}
                        style={{ [side]: -11, top: Math.max(0, height / 2 - 10), zIndex: 1, touchAction: 'none' }}
                    />
                ))}
                <RichText
                    ref={rich}
                    text={text}
                    runs={runs}
                    version={`${styleVersion}:${view.scale}`}
                    runCss={runCss}
                    onChange={(t, rs) => {
                        setText(t);
                        setRuns(rs);
                    }}
                    onSelect={setSel}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            done.current = true;
                            onClose(null, 'cancel');
                        } else if (e.key === 'Tab') {
                            e.preventDefault();
                            onTab(e.shiftKey ? -1 : 1, commit());
                        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!block.paragraph && !e.shiftKey))) {
                            e.preventDefault();
                            onClose(commit());
                        } else if ((e.ctrlKey || e.metaKey) && /^[bi]$/i.test(e.key)) {
                            e.preventDefault();
                            applyFormat(e.key.toLowerCase() === 'b' ? { bold: !shown.bold } : { italic: !shown.italic });
                        }
                    }}
                    ariaLabel="Edit text"
                    className="block overflow-hidden border-0 p-0 outline-none ring-2 ring-emerald-500/70 ring-offset-2 selection:bg-emerald-200"
                    style={{
                        width,
                        minHeight: lineHeight,
                        font: cssFont,
                        lineHeight: `${lineHeight}px`,
                        color: rgbCss(fmt.color),
                        // Off its old rendering (which the cover hides), let the page show through for lining up.
                        background: detached ? 'transparent' : rgbCss(background),
                        whiteSpace: wraps ? 'pre-wrap' : 'pre',
                        textAlign: fmt.align === 'justify' ? 'justify' : fmt.align,
                        textIndent: indent,
                        ['--tw-ring-offset-color' as string]: rgbCss(background),
                    }}
                />
            </div>
            {drag.state && dragBox.current && (
                <GuideLines overlay={overlay} guides={drag.state.guides} box={shiftBox(dragBox.current, drag.state.dx, drag.state.dy)} readout={describeOffset(view, off[0], off[1])} />
            )}
            {resize.state && dragBox.current && (
                <GuideLines
                    overlay={overlay}
                    guides={resize.state.guides}
                    // The text re-wraps as the width changes: follow its current height.
                    box={{ ...dragBox.current, bottom: Math.max(dragBox.current.bottom, dragBox.current.top + height) }}
                    readout={`width ${(((boxW ?? naturalW) * 25.4) / 72).toFixed(1)} mm`}
                />
            )}
        </>
    );
}
