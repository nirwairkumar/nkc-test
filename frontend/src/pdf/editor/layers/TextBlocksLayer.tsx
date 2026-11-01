/**
 * Every text block on the page: hover outlines, click to edit, drag (or the
 * arrow keys) to move it with alignment guides, Tab to jump to the next field.
 * Until the page re-renders, "ghosts" stand in for committed text and "lifts"
 * (a copy of the block's own pixels) for moved blocks.
 */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Move } from 'lucide-react';
import type { PageKey, RGB, TextEdit } from '../../engine/edits';
import type { TextBlock } from '../../engine/layout';
import type { Rect } from '../../engine/matrix';
import { useEditor, rgbCss } from '../EditorContext';
import type { View } from '../geometry';
import GuideLines from '../GuideLines';
import { buildTargets, shiftBox, toBox, type Box, type Item, type Targets } from '../guides';
import InlineTextEditor, { type CommitInfo } from '../InlineTextEditor';
import { blockBaseline, canMove, describeOffset, objectItems, offsetAction, pdfVector, screenRules, screenVector, textItems } from '../move';
import { textEditId } from '../store';
import { useGuidedDrag } from '../useGuidedDrag';

interface Ghost extends CommitInfo {
    id: string;
}

/** A moved block, drawn from a copy of its pixels until the page re-renders. */
interface Lift {
    /** Area copied (page space); the text alone, and the area with the text painted out (null if the copy failed). */
    crop: Rect;
    url: string | null;
    coverUrl: string | null;
    /** The block where the canvas draws it, and the page colour that hides it there. */
    bbox: Rect;
    background: RGB;
    /** Offset (page units) the canvas draws the block at. */
    base: Offset;
}

type Offset = [number, number];
const ZERO: Offset = [0, 0];

export default function TextBlocksLayer({ pageKey, view, pending, overlay }: { pageKey: PageKey; view: View; pending: boolean; overlay: HTMLElement | null }) {
    const { session, state, dispatch, reports, editing, setEditing, sampleBackground, captureRegion } = useEditor();
    const analysis = useMemo(() => session.analyze(pageKey), [session, pageKey]);
    const blocks = useMemo(() => analysis?.text.blocks ?? [], [analysis]);
    const report = reports.get(pageKey);
    const [ghosts, setGhosts] = useState<Ghost[]>([]);
    const [lifts, setLifts] = useState<ReadonlyMap<string, Lift>>(() => new Map());
    const drag = useGuidedDrag();
    const dragOrigin = useRef<Offset>(ZERO);
    const draggingId = useRef<string | null>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const active = state.tool === 'edit';

    useEffect(() => {
        if (pending) return;
        setGhosts((gs) => (gs.length ? [] : gs));
        // The canvas now draws every block where it belongs; keep only a copy that is still being dragged.
        setLifts((m) => {
            if (!m.size) return m;
            const keep = draggingId.current ? m.get(draggingId.current) : undefined;
            return new Map<string, Lift>(keep ? [[draggingId.current!, keep]] : []);
        });
    }, [pending]);

    const editsById = useMemo(() => {
        const m = new Map<string, TextEdit>();
        for (const e of state.edits) if (e.kind === 'text' && e.page === pageKey) m.set(e.id, e);
        return m;
    }, [state.edits, pageKey]);

    // Blocks retyped as new objects because their font can't be re-encoded.
    const replaced = useMemo(() => {
        const prefix = `x:${pageKey}:`;
        return new Set(state.edits.filter((e) => e.id.startsWith(prefix)).map((e) => e.id.slice(prefix.length)));
    }, [state.edits, pageKey]);

    const editOf = (b: TextBlock) => editsById.get(textEditId(pageKey, b.id));
    const offsetOf = (b: TextBlock): Offset => {
        const e = editOf(b);
        return [e?.dx ?? 0, e?.dy ?? 0];
    };
    const hidden = (b: TextBlock) => editOf(b)?.text === '' || replaced.has(b.id);
    /** Where the canvas draws the block now (page space). */
    const renderedBox = (b: TextBlock): Rect => report?.plans.get(textEditId(pageKey, b.id))?.bbox ?? b.bbox;
    const liveOffset = (b: TextBlock): Offset => {
        const d = drag.state;
        if (d?.id !== b.id) return offsetOf(b);
        const [px, py] = pdfVector(view, d.dx, d.dy);
        return [dragOrigin.current[0] + px, dragOrigin.current[1] + py];
    };
    /** Screen box of the block where it is shown now. */
    const shownBox = (b: TextBlock): Box => {
        const lift = lifts.get(b.id);
        if (!lift) return toBox(view.rectToScreen(renderedBox(b)));
        const off = liveOffset(b);
        const [sx, sy] = screenVector(view, off[0] - lift.base[0], off[1] - lift.base[1]);
        return shiftBox(toBox(view.rectToScreen(lift.bbox)), sx, sy);
    };
    const liftOf = (b: TextBlock, base: Offset): Lift => {
        const bbox = renderedBox(b);
        const copy = captureRegion(pageKey, bbox);
        return { crop: copy?.rect ?? bbox, url: copy?.url ?? null, coverUrl: copy?.coverUrl ?? null, bbox, background: copy?.background ?? sampleBackground(pageKey, bbox), base };
    };
    const dropLift = (id: string) =>
        setLifts((m) => {
            if (!m.has(id)) return m;
            const next = new Map(m);
            next.delete(id);
            return next;
        });

    // Offsets changed without a drag (arrow keys, undo/redo, the editor's move handle):
    // copy those blocks' pixels now, while the canvas still shows them, so they move at once.
    const seenOffsets = useRef<Map<string, Offset> | null>(null);
    useLayoutEffect(() => {
        const now = new Map<string, Offset>();
        for (const e of editsById.values()) if (e.dx || e.dy) now.set(e.blockId, [e.dx ?? 0, e.dy ?? 0]);
        const prev = seenOffsets.current;
        seenOffsets.current = now;
        if (!prev) return;
        const moved: [TextBlock, Offset][] = [];
        for (const b of blocks) {
            const p = prev.get(b.id) ?? ZERO;
            const n = now.get(b.id) ?? ZERO;
            if ((p[0] !== n[0] || p[1] !== n[1]) && !lifts.has(b.id) && !ghosts.some((g) => g.id === b.id)) moved.push([b, p]);
        }
        if (!moved.length) return;
        setLifts((m) => {
            const next = new Map(m);
            for (const [b, p] of moved) if (!next.has(b.id)) next.set(b.id, liftOf(b, p));
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editsById]);

    const selectedId = state.selection?.kind === 'block' && state.selection.page === pageKey ? state.selection.blockId : null;
    const isEditing = (b: TextBlock) => editing?.page === pageKey && editing.blockId === b.id;
    const selected = active && selectedId ? blocks.find((b) => b.id === selectedId && !hidden(b) && !isEditing(b) && canMove(b)) : undefined;

    // Clicking anywhere else (except the selection bar) lets go of the selected block.
    useEffect(() => {
        if (!selected) return;
        const onDown = (ev: PointerEvent) => {
            const t = ev.target as Element;
            if (frameRef.current?.contains(t) || t.closest?.('[data-keep-selection]')) return;
            dispatch({ type: 'select', selection: null });
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [selected, dispatch]);

    if (!blocks.length) {
        return analysis?.text.hasInvisibleText && active ? <ScannedHint /> : null;
    }

    const select = (page: PageKey, blockId: string) => dispatch({ type: 'select', selection: { kind: 'block', page, blockId } });
    const open = (b: TextBlock) => {
        setEditing({ page: pageKey, blockId: b.id });
        select(pageKey, b.id);
    };

    const moveTo = (b: TextBlock, off: Offset) => {
        const action = offsetAction(pageKey, b, editOf(b), off[0], off[1]);
        if (action) dispatch(action);
        // Nothing changes, so no render will retire the copy.
        else if (!pending) dropLift(b.id);
    };

    const targetsFor = (exclude: string, home?: Item): Targets =>
        buildTargets(
            [...textItems(blocks, state.edits, pageKey, report, view, exclude, shownBox), ...objectItems(state.edits, pageKey, view, overlay?.parentElement ?? null)],
            { width: view.width, height: view.height },
            screenRules(view, analysis?.model.rules ?? []),
            home,
        );

    const beginMove = (e: RPointerEvent, b: TextBlock, threshold: number) => {
        if (!active || !canMove(b)) return;
        const origin = offsetOf(b);
        const start = shownBox(b);
        drag.begin(e, b.id, {
            threshold,
            snap: () => {
                const [hx, hy] = screenVector(view, -origin[0], -origin[1]);
                return {
                    box: start,
                    baseline: blockBaseline(view, b, origin),
                    targets: targetsFor(b.id, { box: shiftBox(start, hx, hy), baseline: blockBaseline(view, b, ZERO) }),
                    page: { width: view.width, height: view.height },
                };
            },
            onStart: () => {
                dragOrigin.current = origin;
                draggingId.current = b.id;
                setGhosts((gs) => gs.filter((g) => g.id !== b.id));
                setLifts((m) => (m.has(b.id) ? m : new Map(m).set(b.id, liftOf(b, origin))));
            },
            onEnd: (dx, dy) => {
                draggingId.current = null;
                const [px, py] = pdfVector(view, dx, dy);
                moveTo(b, [origin[0] + px, origin[1] + py]);
                select(pageKey, b.id);
            },
            onCancel: () => {
                draggingId.current = null;
                if (!pending) dropLift(b.id);
            },
        });
    };

    const editingBlock = editing?.page === pageKey ? blocks.find((b) => b.id === editing.blockId) : undefined;
    const addGhost = (b: TextBlock, info: CommitInfo | null) => {
        if (info) setGhosts((gs) => [...gs.filter((x) => x.id !== b.id), { ...info, id: b.id }]);
    };

    const openNeighbour = (from: TextBlock, dir: 1 | -1) => {
        const editable = blocks.filter((b) => b.editable && !replaced.has(b.id));
        const next = editable[editable.findIndex((b) => b.id === from.id) + dir];
        if (next) {
            open(next);
            return;
        }
        // Continue on the next/previous page.
        const order = state.slots.filter((s) => s.src >= 0).map((s) => `p${s.src}`);
        const targetKey = order[order.indexOf(pageKey) + dir];
        if (!targetKey) {
            setEditing(null);
            return;
        }
        const tb = session.analyze(targetKey)?.text.blocks.filter((b) => b.editable) ?? [];
        const target = dir === 1 ? tb[0] : tb[tb.length - 1];
        setEditing(target ? { page: targetKey, blockId: target.id } : null);
        if (target) select(targetKey, target.id);
        document.querySelector(`[data-page-key="${targetKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const dragged = drag.state ? blocks.find((b) => b.id === drag.state!.id) : undefined;
    const framed = dragged ?? selected;
    const framedBox = framed && shownBox(framed);

    return (
        <div className={`absolute inset-0 ${active ? '' : 'pointer-events-none'}`} style={{ zIndex: 10 }}>
            {/* Moved blocks: page colour where the canvas still draws them, their own pixels where they are going */}
            {[...lifts].map(([id, lift]) => {
                const b = blocks.find((x) => x.id === id);
                if (!b || hidden(b)) return null;
                const cover = view.rectToScreen(lift.bbox);
                const crop = view.rectToScreen(lift.crop);
                const off = liveOffset(b);
                const [sx, sy] = screenVector(view, off[0] - lift.base[0], off[1] - lift.base[1]);
                return (
                    <Fragment key={id}>
                        {lift.coverUrl ? (
                            <img
                                src={lift.coverUrl}
                                alt=""
                                draggable={false}
                                className="pointer-events-none absolute max-w-none select-none"
                                style={{ left: crop.left, top: crop.top, width: crop.width, height: crop.height }}
                            />
                        ) : (
                            <div className="pointer-events-none absolute" style={{ left: cover.left - 1, top: cover.top - 1, width: cover.width + 2, height: cover.height + 2, background: rgbCss(lift.background) }} />
                        )}
                        {!isEditing(b) &&
                            (lift.url ? (
                                <img
                                    src={lift.url}
                                    alt=""
                                    draggable={false}
                                    className="pointer-events-none absolute max-w-none select-none"
                                    style={{ left: crop.left + sx, top: crop.top + sy, width: crop.width, height: crop.height }}
                                />
                            ) : (
                                <div
                                    className="pointer-events-none absolute rounded-[2px] outline-dashed outline-1 outline-emerald-600"
                                    style={{ left: cover.left + sx, top: cover.top + sy, width: cover.width, height: cover.height }}
                                />
                            ))}
                    </Fragment>
                );
            })}

            {active &&
                blocks.map((b) => {
                    if (hidden(b) || isEditing(b) || b.id === framed?.id) return null;
                    const edit = editOf(b);
                    const box = shownBox(b);
                    const movable = canMove(b);
                    return (
                        <button
                            key={b.id}
                            type="button"
                            data-block-id={b.id}
                            onPointerDown={(e) => {
                                // Touch drags scroll the page; on touch, tap to edit and use the editor's move handle.
                                if (e.pointerType !== 'touch') beginMove(e, b, 4);
                            }}
                            onClick={() => {
                                if (!drag.consumeClick()) open(b);
                            }}
                            title={b.editable ? 'Click to edit · drag to move' : "This text's font can't be re-encoded — your edit will be retyped in a similar font"}
                            className={`group absolute cursor-text rounded-[2px] outline-none transition-colors ${
                                edit ? 'bg-emerald-400/[0.07] ring-1 ring-emerald-500/40' : ''
                            } hover:bg-emerald-400/10 hover:ring-1 hover:ring-emerald-500/70 focus-visible:ring-2 focus-visible:ring-emerald-500`}
                            style={{ left: box.left - 2, top: box.top - 1, width: box.right - box.left + 4, height: box.bottom - box.top + 2 }}
                            aria-label={`Edit text: ${b.text.slice(0, 60)}`}
                        >
                            {movable && (
                                <span
                                    aria-hidden="true"
                                    title="Drag to move"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        beginMove(e, b, 0);
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="absolute right-full top-1/2 hidden h-5 w-5 -translate-y-1/2 cursor-move items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-white group-hover:flex"
                                    style={{ touchAction: 'none' }}
                                >
                                    <Move className="h-3 w-3" />
                                </span>
                            )}
                        </button>
                    );
                })}

            {pending &&
                ghosts.map((g) => (
                    <Fragment key={g.id}>
                        {g.cover && (
                            <div
                                className="pointer-events-none absolute"
                                style={{ left: g.cover.left - 1, top: g.cover.top - 1, width: g.cover.width + 2, height: g.cover.height + 2, background: rgbCss(g.cover.background) }}
                            />
                        )}
                        <div
                            className="pointer-events-none absolute overflow-hidden whitespace-pre-wrap"
                            style={{
                                left: g.box.left,
                                top: g.box.top,
                                width: g.box.width,
                                minHeight: g.box.height,
                                background: g.background ? rgbCss(g.background) : 'transparent',
                                color: rgbCss(g.color),
                                fontFamily: g.fontFamily,
                                fontSize: g.fontSize,
                                fontWeight: g.bold ? 700 : 400,
                                fontStyle: g.italic ? 'italic' : 'normal',
                                lineHeight: `${g.lineHeight}px`,
                                textAlign: g.align === 'justify' ? 'justify' : (g.align as 'left'),
                            }}
                        >
                            {g.text}
                        </div>
                    </Fragment>
                ))}

            {/* The selected (or dragged) block: drag it or click to edit. Its buttons live in the
                selection bar at the bottom of the view, so nothing covers the rows around it. */}
            {framed && framedBox && (
                <div
                    ref={frameRef}
                    data-selected-frame
                    role="button"
                    tabIndex={-1}
                    aria-label={`Selected text: ${framed.text.slice(0, 60)} — drag to move, click to edit`}
                    title="Drag to move · click to edit"
                    onPointerDown={(e) => beginMove(e, framed, e.pointerType === 'touch' ? 8 : 3)}
                    onClick={() => {
                        if (!drag.consumeClick()) open(framed);
                    }}
                    className="absolute cursor-move rounded-[2px] ring-2 ring-emerald-500"
                    style={{
                        left: framedBox.left - 2,
                        top: framedBox.top - 1,
                        width: framedBox.right - framedBox.left + 4,
                        height: framedBox.bottom - framedBox.top + 2,
                        zIndex: 20,
                        touchAction: 'none',
                    }}
                />
            )}

            {editingBlock && (
                <InlineTextEditor
                    key={editingBlock.id}
                    pageKey={pageKey}
                    block={editingBlock}
                    view={view}
                    edit={editOf(editingBlock)}
                    rendered={renderedBox(editingBlock)}
                    background={sampleBackground(pageKey, renderedBox(editingBlock))}
                    overlay={overlay}
                    targets={(home) => targetsFor(editingBlock.id, home)}
                    onClose={(info, how) => {
                        addGhost(editingBlock, info);
                        setEditing(null);
                        if (how) dispatch({ type: 'select', selection: null });
                    }}
                    onTab={(dir, info) => {
                        addGhost(editingBlock, info);
                        openNeighbour(editingBlock, dir);
                    }}
                />
            )}

            {dragged && framedBox && <GuideLines overlay={overlay} guides={drag.state!.guides} box={framedBox} readout={describeOffset(view, ...liveOffset(dragged))} />}
        </div>
    );
}

function ScannedHint() {
    return (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-white shadow">
            Scanned page — use <b>White-out</b> and <b>Add text</b> to change it
        </div>
    );
}
