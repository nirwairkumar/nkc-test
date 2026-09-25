/**
 * Creation gestures for the active tool: click to place text, drag to erase /
 * white-out / highlight / draw shapes, freehand ink.
 */
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { PageEdit, PageKey } from '../../engine/edits';
import { glyphBox } from '../../engine/interpreter';
import type { Rect } from '../../engine/matrix';
import type { PdfSession } from '../../session/session';
import { useEditor, rgbCss } from '../EditorContext';
import { baselineOffset, familyCss } from '../fonts';
import type { View } from '../geometry';
import { simplify } from '../objects';
import { newId, type DrawDefaults } from '../store';

export default function ToolLayer({ pageKey, view }: { pageKey: PageKey; view: View }) {
    const { session, state, dispatch, sampleBackground, setEditingObject } = useEditor();
    const tool = state.tool;
    const [start, setStart] = useState<[number, number] | null>(null);
    const [cur, setCur] = useState<[number, number] | null>(null);
    const points = useRef<[number, number][]>([]);
    const layer = useRef<HTMLDivElement>(null);

    if (tool === 'edit') return null;

    const local = (e: RPointerEvent): [number, number] => {
        const r = layer.current!.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
    };

    const placeText = ([x, y]: [number, number]) => {
        const t = state.text;
        const css = familyCss(t.family);
        const fontPx = t.size * view.scale;
        const off = baselineOffset(css, t.bold, t.italic, fontPx, fontPx * 1.25);
        const [px, py] = view.toPdf(x, y + off);
        const id = newId('a');
        dispatch({
            type: 'upsert',
            edit: { kind: 'add-text', id, page: pageKey, x: px, y: py, angle: view.uprightPdfAngle(), text: '', family: t.family, size: t.size, color: t.color, bold: t.bold, italic: t.italic, align: t.align, width: 0, lineHeight: 1.25 },
        });
        dispatch({ type: 'tool', tool: 'edit' });
        dispatch({ type: 'select', selection: { kind: 'object', id } });
        setEditingObject(id);
    };

    const onDown = (e: RPointerEvent) => {
        if (e.button !== 0) return;
        const p = local(e);
        if (tool === 'text') {
            e.preventDefault();
            placeText(p);
            return;
        }
        (e.target as Element).setPointerCapture(e.pointerId);
        setStart(p);
        setCur(p);
        points.current = [p];
    };

    const onMove = (e: RPointerEvent) => {
        if (!start) return;
        const p = local(e);
        setCur(p);
        if (tool === 'draw') points.current.push(p);
    };

    const onUp = () => {
        if (!start || !cur) return;
        const [x0, y0] = start;
        const [x1, y1] = cur;
        setStart(null);
        setCur(null);
        const tiny = Math.abs(x1 - x0) < 4 && Math.abs(y1 - y0) < 4;
        const d = state.draw;
        const r = view.rectToPdf(x0, y0, x1, y1);
        let edit: PageEdit | null = null;
        if ((tool === 'erase' || tool === 'whiteout') && !tiny) {
            edit = { kind: 'erase', id: newId('x'), page: pageKey, rects: [r], text: true, cover: tool === 'whiteout' ? sampleBackground(pageKey, r) : null };
        } else if (tool === 'highlight' && !tiny) {
            const rects = textRectsIn(session, pageKey, r);
            edit = { kind: 'highlight', id: newId('h'), page: pageKey, rects: rects.length ? rects : [r], color: d.highlight, opacity: 0.45 };
        } else if ((tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'arrow') && !tiny) {
            const [px0, py0] = view.toPdf(x0, y0);
            const [px1, py1] = view.toPdf(x1, y1);
            edit = { kind: 'shape', id: newId('s'), page: pageKey, shape: tool, x0: px0, y0: py0, x1: px1, y1: py1, stroke: d.stroke, fill: d.fill, width: d.width, opacity: 1 };
        } else if (tool === 'draw') {
            const pts = points.current.map(([x, y]) => view.toPdf(x, y));
            if (pts.length >= 2) edit = { kind: 'ink', id: newId('i'), page: pageKey, paths: [simplify(pts)], color: d.stroke, width: d.width, opacity: 1 };
        }
        points.current = [];
        if (edit) dispatch({ type: 'upsert', edit });
    };

    const d = state.draw;
    return (
        <div
            ref={layer}
            className="absolute inset-0"
            style={{ zIndex: 25, cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => {
                setStart(null);
                setCur(null);
            }}
        >
            {start && cur && tool !== 'draw' && (tool === 'line' || tool === 'arrow' ? (
                <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                    <line x1={start[0]} y1={start[1]} x2={cur[0]} y2={cur[1]} stroke={rgbCss(d.stroke)} strokeWidth={Math.max(1, d.width * view.scale)} strokeLinecap="round" />
                </svg>
            ) : (
                <div
                    className="pointer-events-none absolute"
                    style={{ left: Math.min(start[0], cur[0]), top: Math.min(start[1], cur[1]), width: Math.abs(cur[0] - start[0]), height: Math.abs(cur[1] - start[1]), ...previewStyle(tool, d, view.scale) }}
                />
            ))}
            {tool === 'draw' && start && points.current.length > 1 && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                    <polyline points={points.current.map((p) => p.join(',')).join(' ')} fill="none" stroke={rgbCss(d.stroke)} strokeWidth={Math.max(1, d.width * view.scale)} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </div>
    );
}

function previewStyle(tool: string, d: DrawDefaults, scale: number) {
    switch (tool) {
        case 'erase':
            return { border: '1.5px dashed rgb(220 38 38)', background: 'rgba(220,38,38,0.06)' };
        case 'whiteout':
            return { background: 'rgba(255,255,255,0.92)', border: '1px solid rgb(148 163 184)' };
        case 'highlight':
            return { background: rgbCss(d.highlight, 0.45), mixBlendMode: 'multiply' as const };
        case 'ellipse':
            return { border: `${Math.max(1, d.width * scale)}px solid ${rgbCss(d.stroke)}`, borderRadius: '50%', background: d.fill ? rgbCss(d.fill) : undefined };
        default:
            return { border: `${Math.max(1, d.width * scale)}px solid ${rgbCss(d.stroke)}`, background: d.fill ? rgbCss(d.fill) : undefined };
    }
}

/** Per-line rectangles covering the text whose glyph centres fall inside `r` (marker-style highlight). */
export function textRectsIn(session: PdfSession, pageKey: PageKey, r: Rect): Rect[] {
    const a = session.analyze(pageKey);
    if (!a) return [];
    const out: Rect[] = [];
    for (const b of a.text.blocks) {
        for (const line of b.lines) {
            let box: Rect | null = null;
            for (const atom of line.atoms) {
                for (const g of atom.glyphs) {
                    const gb = glyphBox(g);
                    const cx = (gb.x0 + gb.x1) / 2, cy = (gb.y0 + gb.y1) / 2;
                    if (cx < r.x0 || cx > r.x1 || cy < r.y0 || cy > r.y1) continue;
                    box = box ? { x0: Math.min(box.x0, gb.x0), y0: Math.min(box.y0, gb.y0), x1: Math.max(box.x1, gb.x1), y1: Math.max(box.y1, gb.y1) } : gb;
                }
            }
            if (box) out.push(box);
        }
    }
    return out;
}
