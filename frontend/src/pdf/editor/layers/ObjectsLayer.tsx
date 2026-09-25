/**
 * Added objects: new text boxes, images/signatures, shapes, ink, highlights
 * and erase regions. Rendered as HTML/SVG (identical to the vector output) so
 * they can be selected, dragged and resized without re-rendering the page.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Eraser, RotateCw, Trash2 } from 'lucide-react';
import type { AddTextEdit, PageKey, RGB } from '../../engine/edits';
import type { FontInfo } from '../../engine/fonts';
import type { Rect } from '../../engine/matrix';
import { useEditor, rgbCss } from '../EditorContext';
import FormatBar, { ColorDots, Divider, IconButton, type Fmt } from '../FormatBar';
import { baselineOffset, ensureEditorFonts, familyCss, resetFontMetrics } from '../fonts';
import type { View } from '../geometry';
import GuideLines from '../GuideLines';
import { buildTargets, shiftBox, snapMove, toBox, type Baseline, type Box, type Guide, type SnapSpec } from '../guides';
import { objectItems, screenRules, textItems } from '../move';
import { imageUrl, isObject, objectBounds, translateEdit, type ObjectEdit } from '../objects';

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'p0' | 'p1';

interface Drag {
    id: string;
    mode: 'move' | 'resize';
    handle?: Handle;
    x: number;
    y: number;
    dx: number;
    dy: number;
    orig: ObjectEdit;
    /** Alignment guides for moves (none when the object has no known extent). */
    snap?: SnapSpec;
    guides?: Guide[];
    /** Moved far enough to count as a drag (a click must not snap the object anywhere). */
    started?: boolean;
}

export default function ObjectsLayer({ pageKey, view, overlay }: { pageKey: PageKey; view: View; overlay: HTMLElement | null }) {
    const { session, state, dispatch, reports, editingObject, setEditingObject } = useEditor();
    const objects = useMemo(() => state.edits.filter((e): e is ObjectEdit => e.page === pageKey && isObject(e)), [state.edits, pageKey]);
    const selectedId = state.selection?.kind === 'object' ? state.selection.id : null;
    const interactive = state.tool === 'edit';
    const [drag, setDrag] = useState<Drag | null>(null);
    const docFonts = useMemo(() => session.documentFonts(), [session]);
    const layerRef = useRef<HTMLDivElement>(null);

    useEffect(() => ensureEditorFonts(), []);

    // Global move/up listeners while dragging.
    const dragRef = useRef<Drag | null>(null);
    dragRef.current = drag;
    const dragging = drag !== null;
    useEffect(() => {
        if (!dragging) return;
        const move = (ev: PointerEvent) =>
            setDrag((d) => {
                if (!d) return d;
                const rx = ev.clientX - d.x, ry = ev.clientY - d.y;
                const started = d.started || Math.hypot(rx, ry) >= 3;
                if (!started) return d;
                if (d.mode !== 'move' || !d.snap) return { ...d, dx: rx, dy: ry, started };
                const s = snapMove(d.snap, rx, ry, { lock: ev.shiftKey, free: ev.altKey });
                return { ...d, dx: s.dx, dy: s.dy, guides: s.guides, started };
            });
        const up = () => {
            const d = dragRef.current;
            if (d && (Math.abs(d.dx) > 1 || Math.abs(d.dy) > 1)) {
                const next = d.mode === 'move' ? moved(d.orig, d.dx, d.dy, view) : resized(d.orig, d.handle!, d.dx, d.dy, view);
                if (next) dispatch({ type: 'upsert', edit: next });
            }
            setDrag(null);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, [dragging, view, dispatch]);

    /** Guides for moving `o`: its screen box and baseline, and everything else on the page. */
    const snapFor = (o: ObjectEdit): SnapSpec | undefined => {
        let box: Box | null = null;
        let baseline: Baseline | undefined;
        const layer = layerRef.current;
        if (o.kind === 'add-text') {
            const el = layer?.querySelector(`[data-object-id="${CSS.escape(o.id)}"]`);
            if (el && layer) {
                const r = el.getBoundingClientRect();
                const h = layer.getBoundingClientRect();
                box = { left: r.left - h.left, top: r.top - h.top, right: r.right - h.left, bottom: r.bottom - h.top };
            }
            if (Math.abs(view.screenAngle(o.angle)) < 0.01) baseline = { axis: 'y', pos: view.toScreen(o.x, o.y)[1] };
        } else {
            const bb = objectBounds(o);
            if (bb) box = toBox(view.rectToScreen(bb));
        }
        if (!box) return undefined;
        const analysis = session.analyze(pageKey);
        const page = { width: view.width, height: view.height };
        const items = [...textItems(analysis?.text.blocks ?? [], state.edits, pageKey, reports.get(pageKey), view), ...objectItems(state.edits, pageKey, view, overlay?.parentElement ?? null, o.id)];
        return { box, baseline, targets: buildTargets(items, page, screenRules(view, analysis?.model.rules ?? [])), page };
    };

    const startDrag = (e: RPointerEvent, o: ObjectEdit, mode: 'move' | 'resize', handle?: Handle) => {
        if (!interactive || e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        if (editingObject && editingObject !== o.id) setEditingObject(null);
        dispatch({ type: 'select', selection: { kind: 'object', id: o.id } });
        setDrag({ id: o.id, mode, handle, x: e.clientX, y: e.clientY, dx: 0, dy: 0, orig: o, snap: mode === 'move' ? snapFor(o) : undefined });
    };

    // While dragging, show the object at its tentative position.
    const live = (o: ObjectEdit): ObjectEdit => {
        if (!drag || drag.id !== o.id) return o;
        return (drag.mode === 'move' ? moved(o, drag.dx, drag.dy, view) : resized(o, drag.handle!, drag.dx, drag.dy, view)) ?? o;
    };

    const pe = interactive ? 'auto' : 'none';
    const shapes = objects.filter((o) => o.kind === 'shape' || o.kind === 'ink');

    return (
        <div ref={layerRef} className="absolute inset-0" style={{ zIndex: 20, pointerEvents: 'none' }}>
            {/* Highlights (multiply, like a marker) */}
            {objects
                .filter((o) => o.kind === 'highlight')
                .map((o0) => {
                    const o = live(o0) as Extract<ObjectEdit, { kind: 'highlight' }>;
                    return o.rects.map((r, i) => (
                        <div
                            key={o.id + i}
                            onPointerDown={(e) => startDrag(e, o0, 'move')}
                            className={interactive ? 'cursor-move' : ''}
                            style={{ position: 'absolute', ...view.rectToScreen(r), background: rgbCss(o.color, o.opacity), mixBlendMode: 'multiply', pointerEvents: pe }}
                        />
                    ));
                })}

            {/* Erase regions are baked into the page; show an outline so they can be picked */}
            {interactive &&
                objects
                    .filter((o) => o.kind === 'erase')
                    .map((o0) => {
                        const o = live(o0) as Extract<ObjectEdit, { kind: 'erase' }>;
                        return o.rects.map((r, i) => (
                            <div
                                key={o.id + i}
                                title="Erased area"
                                onPointerDown={(e) => startDrag(e, o0, 'move')}
                                className={`absolute cursor-pointer rounded-sm ${selectedId === o.id ? 'ring-2 ring-emerald-500' : 'hover:outline-dashed hover:outline-1 hover:outline-slate-400'}`}
                                style={{ ...view.rectToScreen(r), pointerEvents: pe, background: drag?.id === o.id && o.cover ? rgbCss(o.cover) : undefined }}
                            />
                        ));
                    })}

            {/* Shapes and ink */}
            {shapes.length > 0 && (
                <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: 'none' }}>
                    {shapes.map((o0) => (
                        <ShapeSvg key={o0.id} o={live(o0)} view={view} onPointerDown={(e) => startDrag(e, o0, 'move')} interactive={interactive} />
                    ))}
                </svg>
            )}

            {/* Images / signatures */}
            {objects
                .filter((o) => o.kind === 'image')
                .map((o0) => {
                    const o = live(o0) as Extract<ObjectEdit, { kind: 'image' }>;
                    const img = session.images.get(o.imageId);
                    if (!img) return null;
                    const b = view.rectToScreen(o.rect);
                    const turns = (((o.rotation ?? 0) % 4) + 4) % 4;
                    const swap = turns % 2 === 1;
                    return (
                        <div key={o.id} onPointerDown={(e) => startDrag(e, o0, 'move')} className={interactive ? 'cursor-move' : ''} style={{ position: 'absolute', ...b, pointerEvents: pe, opacity: o.opacity ?? 1 }}>
                            <img
                                src={imageUrl(o.imageId, img.bytes, img.mime)}
                                alt=""
                                draggable={false}
                                className="absolute left-1/2 top-1/2 max-w-none select-none"
                                style={{ width: swap ? b.height : b.width, height: swap ? b.width : b.height, transform: `translate(-50%, -50%) rotate(${turns * 90}deg)` }}
                            />
                        </div>
                    );
                })}

            {/* New text boxes */}
            {objects
                .filter((o): o is AddTextEdit => o.kind === 'add-text')
                .map((o0) => (
                    <AddTextBox
                        key={o0.id}
                        o={live(o0) as AddTextEdit}
                        view={view}
                        selected={selectedId === o0.id}
                        editing={editingObject === o0.id}
                        interactive={interactive}
                        docFonts={docFonts}
                        onPointerDown={(e) => {
                            if (editingObject !== o0.id) startDrag(e, o0, 'move');
                        }}
                        onResize={(e) => startDrag(e, o0, 'resize', 'e')}
                        onStartEditing={() => setEditingObject(o0.id)}
                        onCommit={(text, patch) => {
                            setEditingObject(null);
                            if (!text.trim()) dispatch({ type: 'remove', id: o0.id });
                            else dispatch({ type: 'upsert', edit: { ...o0, ...patch, text } });
                        }}
                        onStyle={(patch) => dispatch({ type: 'upsert', edit: { ...o0, ...patch } })}
                        onDelete={() => {
                            setEditingObject(null);
                            dispatch({ type: 'remove', id: o0.id });
                        }}
                    />
                ))}

            {/* Selection frame, handles and object toolbar */}
            {interactive && selectedId && <Selection objects={objects} selectedId={selectedId} live={live} view={view} dragging={!!drag} startDrag={startDrag} />}

            {drag?.snap && drag.started && <GuideLines overlay={overlay} guides={drag.guides ?? []} box={shiftBox(drag.snap.box, drag.dx, drag.dy)} />}
        </div>
    );
}

function Selection({
    objects,
    selectedId,
    live,
    view,
    dragging,
    startDrag,
}: {
    objects: ObjectEdit[];
    selectedId: string;
    live: (o: ObjectEdit) => ObjectEdit;
    view: View;
    dragging: boolean;
    startDrag: (e: RPointerEvent, o: ObjectEdit, mode: 'move' | 'resize', handle?: Handle) => void;
}) {
    const o0 = objects.find((o) => o.id === selectedId);
    if (!o0 || o0.kind === 'add-text') return null;
    const o = live(o0);
    const bb = objectBounds(o);
    if (!bb) return null;
    const b = view.rectToScreen(bb);
    const resizable = o.kind === 'image' || (o.kind === 'shape' && (o.shape === 'rect' || o.shape === 'ellipse'));
    const isLine = o.kind === 'shape' && (o.shape === 'line' || o.shape === 'arrow');
    const handleCls = 'absolute h-3 w-3 rounded-full border-2 border-emerald-600 bg-white shadow';
    return (
        <>
            <div className="absolute rounded-sm ring-2 ring-emerald-500" style={{ ...b, pointerEvents: 'none' }} />
            {resizable &&
                (['nw', 'ne', 'sw', 'se'] as Handle[]).map((h) => (
                    <div
                        key={h}
                        onPointerDown={(e) => startDrag(e, o0, 'resize', h)}
                        className={handleCls}
                        style={{
                            left: (h.includes('w') ? b.left : b.left + b.width) - 6,
                            top: (h.includes('n') ? b.top : b.top + b.height) - 6,
                            cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
                            pointerEvents: 'auto',
                            touchAction: 'none',
                        }}
                    />
                ))}
            {isLine &&
                (['p0', 'p1'] as Handle[]).map((h) => {
                    const s = o as Extract<ObjectEdit, { kind: 'shape' }>;
                    const [x, y] = view.toScreen(h === 'p0' ? s.x0 : s.x1, h === 'p0' ? s.y0 : s.y1);
                    return <div key={h} onPointerDown={(e) => startDrag(e, o0, 'resize', h)} className={`${handleCls} cursor-crosshair`} style={{ left: x - 6, top: y - 6, pointerEvents: 'auto', touchAction: 'none' }} />;
                })}
            {!dragging && (
                <div className="absolute" style={{ left: b.left, top: b.top > 56 ? b.top - 50 : b.top + b.height + 8, pointerEvents: 'auto', zIndex: 40 }}>
                    <ObjectBar o={o0} />
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------

function moved(o: ObjectEdit, dx: number, dy: number, view: View): ObjectEdit {
    const [ax, ay] = view.toPdf(0, 0);
    const [bx, by] = view.toPdf(dx, dy);
    return translateEdit(o, bx - ax, by - ay);
}

function resized(o: ObjectEdit, handle: Handle, dx: number, dy: number, view: View): ObjectEdit | null {
    const [ax, ay] = view.toPdf(0, 0);
    const [bx, by] = view.toPdf(dx, dy);
    if (o.kind === 'add-text') {
        // Width handle: wrap width in PDF units.
        const start = o.width > 0 ? o.width : 120;
        return { ...o, width: Math.max(20, start + Math.hypot(bx - ax, by - ay) * Math.sign(dx || 1)) };
    }
    if (o.kind === 'shape' && (handle === 'p0' || handle === 'p1')) {
        return handle === 'p0' ? { ...o, x0: o.x0 + bx - ax, y0: o.y0 + by - ay } : { ...o, x1: o.x1 + bx - ax, y1: o.y1 + by - ay };
    }
    const bb = o.kind === 'image' ? o.rect : o.kind === 'shape' ? { x0: Math.min(o.x0, o.x1), y0: Math.min(o.y0, o.y1), x1: Math.max(o.x0, o.x1), y1: Math.max(o.y0, o.y1) } : null;
    if (!bb) return null;
    const s = view.rectToScreen(bb);
    let l = s.left, t = s.top, r = s.left + s.width, b = s.top + s.height;
    if (handle.includes('w')) l += dx;
    if (handle.includes('e')) r += dx;
    if (handle.includes('n')) t += dy;
    if (handle.includes('s')) b += dy;
    if (o.kind === 'image') {
        // Keep the aspect ratio for images and signatures.
        const ar = s.width / s.height;
        const w = Math.max(12, r - l), h = w / ar;
        if (handle.includes('n')) t = b - h;
        else b = t + h;
        if (handle.includes('w')) l = r - w;
        else r = l + w;
    }
    if (r - l < 6 || b - t < 6) return null;
    const pr: Rect = view.rectToPdf(l, t, r, b);
    if (o.kind === 'image') return { ...o, rect: pr };
    if (o.kind === 'shape') return { ...o, x0: pr.x0, y0: pr.y0, x1: pr.x1, y1: pr.y1 };
    return null;
}

function ShapeSvg({ o, view, onPointerDown, interactive }: { o: ObjectEdit; view: View; onPointerDown: (e: RPointerEvent) => void; interactive: boolean }) {
    const common = {
        onPointerDown,
        style: { pointerEvents: (interactive ? 'visiblePainted' : 'none') as 'visiblePainted' | 'none', cursor: interactive ? 'move' : undefined },
    };
    if (o.kind === 'ink') {
        const d = o.paths.map((p) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${view.toScreen(x, y).map((v) => v.toFixed(1)).join(' ')}`).join(' ')).join(' ');
        return <path d={d} fill="none" stroke={rgbCss(o.color)} strokeOpacity={o.opacity} strokeWidth={Math.max(1, o.width * view.scale)} strokeLinecap="round" strokeLinejoin="round" {...common} />;
    }
    if (o.kind !== 'shape') return null;
    const sw = Math.max(1, o.width * view.scale);
    const [x0, y0] = view.toScreen(o.x0, o.y0);
    const [x1, y1] = view.toScreen(o.x1, o.y1);
    const g = { stroke: o.stroke ? rgbCss(o.stroke) : 'none', strokeWidth: sw, fill: o.fill ? rgbCss(o.fill) : 'none', opacity: o.opacity, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    if (o.shape === 'rect') return <rect x={Math.min(x0, x1)} y={Math.min(y0, y1)} width={Math.abs(x1 - x0)} height={Math.abs(y1 - y0)} {...g} {...common} />;
    if (o.shape === 'ellipse') return <ellipse cx={(x0 + x1) / 2} cy={(y0 + y1) / 2} rx={Math.abs(x1 - x0) / 2} ry={Math.abs(y1 - y0) / 2} {...g} {...common} />;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const len = Math.max(6, o.width * 4) * view.scale;
    const head =
        o.shape === 'arrow'
            ? `M${x1 + len * Math.cos(ang + Math.PI - 0.45)} ${y1 + len * Math.sin(ang + Math.PI - 0.45)} L${x1} ${y1} L${x1 + len * Math.cos(ang + Math.PI + 0.45)} ${y1 + len * Math.sin(ang + Math.PI + 0.45)}`
            : '';
    return (
        <g {...common}>
            {/* Wide invisible hit area so thin lines are easy to grab */}
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="transparent" strokeWidth={Math.max(12, sw)} />
            <path d={`M${x0} ${y0} L${x1} ${y1} ${head}`} {...g} fill="none" />
        </g>
    );
}

const OBJECT_COLORS: RGB[] = [
    [0, 0, 0],
    [0.86, 0.15, 0.15],
    [0.09, 0.4, 0.85],
    [0.05, 0.55, 0.3],
    [1, 0.9, 0.2],
    [1, 1, 1],
];

function ObjectBar({ o }: { o: ObjectEdit }) {
    const { dispatch, sampleBackground } = useEditor();
    const set = (patch: Partial<ObjectEdit>) => dispatch({ type: 'upsert', edit: { ...o, ...patch } as ObjectEdit });
    const colorOf = o.kind === 'shape' ? (o.stroke ?? o.fill) : o.kind === 'ink' || o.kind === 'highlight' ? o.color : null;
    const setColor = (c: RGB) => {
        if (o.kind === 'shape') set(o.stroke ? { stroke: c } : { fill: c });
        else set({ color: c } as Partial<ObjectEdit>);
    };
    return (
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" onPointerDown={(e) => e.stopPropagation()}>
            {colorOf !== null && <ColorDots value={colorOf} onChange={setColor} colors={OBJECT_COLORS} />}
            {o.kind === 'shape' && (o.shape === 'rect' || o.shape === 'ellipse') && (
                <button
                    type="button"
                    onClick={() => set({ fill: o.fill ? null : (o.stroke ?? [0.9, 0.9, 0.9]) })}
                    className={`h-8 rounded-md px-2 text-[12px] font-medium ${o.fill ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    Fill
                </button>
            )}
            {(o.kind === 'shape' || o.kind === 'ink') && (
                <label className="flex items-center gap-1 px-1 text-[11px] text-slate-500">
                    Width
                    <input type="range" min={0.5} max={12} step={0.5} value={o.width} onChange={(e) => set({ width: +e.target.value })} className="w-20 accent-emerald-600" />
                </label>
            )}
            {(o.kind === 'image' || o.kind === 'shape' || o.kind === 'ink' || o.kind === 'highlight') && (
                <label className="flex items-center gap-1 px-1 text-[11px] text-slate-500">
                    Opacity
                    <input type="range" min={0.1} max={1} step={0.05} value={o.opacity ?? 1} onChange={(e) => set({ opacity: +e.target.value } as Partial<ObjectEdit>)} className="w-16 accent-emerald-600" />
                </label>
            )}
            {o.kind === 'image' && (
                <IconButton label="Rotate" onClick={() => set({ rotation: ((o.rotation ?? 0) + 1) % 4 })}>
                    <RotateCw className="h-4 w-4" />
                </IconButton>
            )}
            {o.kind === 'erase' && (
                <button
                    type="button"
                    onClick={() => set({ cover: o.cover ? null : sampleBackground(o.page, o.rects[0]) })}
                    className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium ${o.cover ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Also paint over images and lines in this area"
                >
                    <Eraser className="h-3.5 w-3.5" /> White-out
                </button>
            )}
            <Divider />
            <IconButton label="Delete" danger onClick={() => dispatch({ type: 'remove', id: o.id })}>
                <Trash2 className="h-4 w-4" />
            </IconButton>
        </div>
    );
}

// ---------------------------------------------------------------------------

function AddTextBox({
    o,
    view,
    selected,
    editing,
    interactive,
    docFonts,
    onPointerDown,
    onResize,
    onStartEditing,
    onCommit,
    onStyle,
    onDelete,
}: {
    o: AddTextEdit;
    view: View;
    selected: boolean;
    editing: boolean;
    interactive: boolean;
    docFonts: FontInfo[];
    onPointerDown: (e: RPointerEvent) => void;
    onResize: (e: RPointerEvent) => void;
    onStartEditing: () => void;
    onCommit: (text: string, patch: Partial<AddTextEdit>) => void;
    onStyle: (patch: Partial<AddTextEdit>) => void;
    onDelete: () => void;
}) {
    const [text, setText] = useState(o.text);
    const [fmt, setFmt] = useState<Fmt>({ family: o.family, size: o.size, color: o.color, bold: o.bold, italic: o.italic, align: o.align });
    const boxRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const [, bump] = useState(0);

    useEffect(() => setText(o.text), [o.text]);
    useEffect(() => setFmt({ family: o.family, size: o.size, color: o.color, bold: o.bold, italic: o.italic, align: o.align }), [o.family, o.size, o.color, o.bold, o.italic, o.align]);

    const f = editing ? fmt : { family: o.family, size: o.size, color: o.color, bold: o.bold, italic: o.italic, align: o.align };
    const css = familyCss(f.family, docFonts);
    // Web fonts change metrics once loaded; re-measure then.
    useEffect(() => {
        if (!f.family.startsWith('noto') || !document.fonts) return;
        document.fonts
            .load(`${f.bold ? 700 : 400} 16px ${css}`, text || 'a')
            .then(() => {
                resetFontMetrics();
                bump((n) => n + 1);
            })
            .catch(() => {});
    }, [css, f.bold]); // eslint-disable-line react-hooks/exhaustive-deps

    const fontSize = f.size * view.scale;
    const lh = f.size * (o.lineHeight || 1.25) * view.scale;
    const off = baselineOffset(css, f.bold, f.italic, fontSize, lh);
    const [sx, sy] = view.toScreen(o.x, o.y);
    const angle = view.screenAngle(o.angle);
    const width = o.width > 0 ? o.width * view.scale : undefined;

    const style = {
        font: `${f.italic ? 'italic ' : ''}${f.bold ? 700 : 400} ${fontSize}px ${css}`,
        lineHeight: `${lh}px`,
        color: rgbCss(f.color),
        textAlign: f.align === 'justify' ? ('justify' as const) : f.align,
        whiteSpace: width ? ('pre-wrap' as const) : ('pre' as const),
        width,
    };

    useLayoutEffect(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.style.height = '0px';
        ta.style.height = `${Math.max(lh, ta.scrollHeight)}px`;
        if (!width) {
            ta.style.width = '0px';
            ta.style.width = `${Math.max(fontSize * 2, ta.scrollWidth + 2)}px`;
        }
    }, [text, fmt, lh, width, fontSize, editing]);

    useEffect(() => {
        if (editing) taRef.current?.focus({ preventScroll: true });
    }, [editing]);

    // Clicking elsewhere finishes typing.
    useEffect(() => {
        if (!editing) return;
        const onDown = (ev: PointerEvent) => {
            if (boxRef.current?.contains(ev.target as Node)) return;
            onCommit(text, fmt);
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [editing, text, fmt]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            ref={boxRef}
            data-object-id={o.id}
            className="absolute"
            style={{ left: sx, top: sy - off, transform: angle ? `rotate(${angle}rad)` : undefined, transformOrigin: `0 ${off}px`, pointerEvents: interactive || editing ? 'auto' : 'none', zIndex: selected || editing ? 35 : undefined }}
        >
            {(selected || editing) && interactive && (
                <div className={`absolute left-0 ${sy - off > 90 ? 'bottom-full mb-2' : 'top-full mt-2'}`} style={{ minWidth: 280 }}>
                    <FormatBar
                        value={f}
                        docFonts={docFonts}
                        onChange={(p) => {
                            if (editing) setFmt((x) => ({ ...x, ...p }));
                            else onStyle(p as Partial<AddTextEdit>);
                        }}
                        onDelete={onDelete}
                        onDone={editing ? () => onCommit(text, fmt) : undefined}
                        hint={editing ? 'Ctrl+Enter or click outside to finish' : 'Drag to move · double-click to edit'}
                    />
                </div>
            )}
            {editing ? (
                <textarea
                    ref={taRef}
                    value={text}
                    spellCheck={false}
                    placeholder="Type here"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                            e.preventDefault();
                            onCommit(text, fmt);
                        }
                    }}
                    aria-label="New text"
                    className="block resize-none overflow-hidden border-0 bg-transparent p-0 outline-none ring-2 ring-emerald-500/70 ring-offset-2 placeholder:text-slate-400"
                    style={style}
                />
            ) : (
                <div
                    onPointerDown={onPointerDown}
                    onDoubleClick={() => interactive && onStartEditing()}
                    className={`select-none ${interactive ? 'cursor-move' : ''} ${selected ? 'outline outline-2 outline-offset-2 outline-emerald-500' : interactive ? 'hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-emerald-400' : ''}`}
                    style={style}
                >
                    {o.text || ' '}
                </div>
            )}
            {selected && interactive && !editing && (
                <div
                    onPointerDown={onResize}
                    title="Drag to set wrap width"
                    className="absolute -right-2 top-1/2 h-4 w-2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-emerald-600 bg-white"
                    style={{ touchAction: 'none' }}
                />
            )}
        </div>
    );
}
