import { createContext, useCallback, useContext, useMemo, useRef, useState, type Dispatch, type ReactNode } from 'react';
import type { PageReport } from '../engine/apply';
import type { PageKey, RGB } from '../engine/edits';
import type { Rect } from '../engine/matrix';
import type { PdfSession } from '../session/session';
import type { View } from './geometry';
import type { Action, EditorState } from './store';

interface CanvasEntry {
    canvas: HTMLCanvasElement;
    view: View;
    /** Device pixels per CSS pixel of the canvas bitmap. */
    ratio: number;
}

export interface SearchMatch {
    page: PageKey;
    blockId: string;
    start: number;
    end: number;
    rects: Rect[];
}

export interface SearchState {
    query: string;
    matches: SearchMatch[];
    active: number;
}

export interface Capture {
    /** The text alone: background and ruling lines transparent. */
    url: string;
    /** The same area with the text painted out and ruling lines kept — hides the text where it was. */
    coverUrl: string;
    rect: Rect;
    background: RGB;
}

/** Mean colour of the most common quantised colour: text pixels are a minority, so the background wins. */
function dominantColor(data: Uint8ClampedArray, pixels: number): [number, number, number] {
    const buckets = new Map<number, [number, number, number, number]>();
    let best: [number, number, number, number] = [0, 255, 255, 255];
    const step = Math.max(1, Math.floor(pixels / 4000)) * 4;
    for (let i = 0; i < data.length; i += step) {
        const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        let b = buckets.get(k);
        if (!b) buckets.set(k, (b = [0, 0, 0, 0]));
        b[0]++;
        b[1] += data[i];
        b[2] += data[i + 1];
        b[3] += data[i + 2];
        if (b[0] > best[0]) best = b;
    }
    return best[0] ? [best[1] / best[0], best[2] / best[0], best[3] / best[0]] : [255, 255, 255];
}

/** 0–255 colour to RGB, snapping near-white to pure white so patches are invisible on white paper. */
const paperRgb = (c: [number, number, number]): RGB => (c.every((v) => v > 240) ? [1, 1, 1] : [c[0] / 255, c[1] / 255, c[2] / 255]);

interface EditorContextValue {
    session: PdfSession;
    state: EditorState;
    dispatch: Dispatch<Action>;
    /** CSS px per PDF point. */
    scale: number;
    reports: Map<PageKey, PageReport>;
    setReport: (key: PageKey, report: PageReport | null) => void;
    registerCanvas: (key: PageKey, entry: CanvasEntry | null) => void;
    /** Dominant colour of the rendered page inside a PDF-space rect (white-out / editor background). */
    sampleBackground: (key: PageKey, rect: Rect) => RGB;
    /**
     * The rendered pixels inside a PDF-space rect with the background made
     * transparent — a movable copy of text while it is dragged. `rect` is the
     * exact area copied; `background` is the colour that was keyed out.
     */
    captureRegion: (key: PageKey, rect: Rect) => Capture | null;
    /** Which block's inline editor is open. */
    editing: { page: PageKey; blockId: string } | null;
    setEditing: (e: { page: PageKey; blockId: string } | null) => void;
    /** Id of the add-text object whose text is being typed. */
    editingObject: string | null;
    setEditingObject: (id: string | null) => void;
    search: SearchState;
    setSearch: (s: SearchState) => void;
}

const Ctx = createContext<EditorContextValue | null>(null);

export function EditorProvider({
    session,
    state,
    dispatch,
    scale,
    children,
}: {
    session: PdfSession;
    state: EditorState;
    dispatch: Dispatch<Action>;
    scale: number;
    children: ReactNode;
}) {
    const [reports, setReports] = useState(new Map<PageKey, PageReport>());
    const canvases = useRef(new Map<PageKey, CanvasEntry>());
    const [editing, setEditing] = useState<{ page: PageKey; blockId: string } | null>(null);
    const [editingObject, setEditingObject] = useState<string | null>(null);
    const [search, setSearch] = useState<SearchState>({ query: '', matches: [], active: 0 });

    const setReport = useCallback((key: PageKey, report: PageReport | null) => {
        setReports((prev) => {
            if (!report && !prev.has(key)) return prev;
            const next = new Map(prev);
            if (report) next.set(key, report);
            else next.delete(key);
            return next;
        });
    }, []);

    const registerCanvas = useCallback((key: PageKey, entry: CanvasEntry | null) => {
        if (entry) canvases.current.set(key, entry);
        else canvases.current.delete(key);
    }, []);

    const sampleBackground = useCallback((key: PageKey, rect: Rect): RGB => {
        const entry = canvases.current.get(key);
        if (!entry) return [1, 1, 1];
        const { canvas, view, ratio } = entry;
        const r = view.rectToScreen(rect);
        const pad = 2;
        const x = Math.max(0, Math.floor((r.left - pad) * ratio));
        const y = Math.max(0, Math.floor((r.top - pad) * ratio));
        const w = Math.min(canvas.width - x, Math.ceil((r.width + 2 * pad) * ratio));
        const h = Math.min(canvas.height - y, Math.ceil((r.height + 2 * pad) * ratio));
        if (w <= 0 || h <= 0) return [1, 1, 1];
        try {
            const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(x, y, w, h).data;
            return paperRgb(dominantColor(data, w * h));
        } catch {
            return [1, 1, 1];
        }
    }, []);

    const captureRegion = useCallback((key: PageKey, rect: Rect): Capture | null => {
        const entry = canvases.current.get(key);
        if (!entry) return null;
        const { canvas, view, ratio } = entry;
        const r = view.rectToScreen(rect);
        const pad = 2;
        const x = Math.max(0, Math.floor((r.left - pad) * ratio));
        const y = Math.max(0, Math.floor((r.top - pad) * ratio));
        const w = Math.min(canvas.width, Math.ceil((r.left + r.width + pad) * ratio)) - x;
        const h = Math.min(canvas.height, Math.ceil((r.top + r.height + pad) * ratio)) - y;
        if (w <= 0 || h <= 0) return null;
        try {
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
            const text = ctx.getImageData(x, y, w, h);
            const cover = ctx.getImageData(x, y, w, h);
            const d = text.data;
            const bg = dominantColor(d, w * h);
            const dist = (i: number) => Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));
            let far = 0;
            for (let i = 0; i < d.length; i += 4) far = Math.max(far, dist(i));
            const opaque = Math.max(48, far);
            const alpha = new Float32Array(w * h);
            for (let p = 0; p < w * h; p++) {
                const dd = dist(p * 4);
                alpha[p] = dd <= 8 ? 0 : Math.min(1, dd / opaque);
            }
            // Lines running right across the area (table rules, cell edges) belong to the
            // page, not the text: glyphs never fill a whole column or row of the padded copy.
            const rule = new Uint8Array(w * h);
            const cols: number[] = [];
            const rows: number[] = [];
            for (let cx = 0; cx < w; cx++) {
                let full = true;
                for (let cy = 0; cy < h && full; cy++) full = alpha[cy * w + cx] > 0;
                if (full) cols.push(cx);
            }
            for (let cy = 0; cy < h; cy++) {
                let full = true;
                for (let cx = 0; cx < w && full; cx++) full = alpha[cy * w + cx] > 0;
                if (full) rows.push(cy);
            }
            // A textured or scanned background fills everything: then there are no rules to keep.
            if (cols.length < w * 0.4 && rows.length < h * 0.4) {
                for (const cx of cols) for (let cy = 0; cy < h; cy++) rule[cy * w + cx] = 1;
                for (const cy of rows) rule.fill(1, cy * w, cy * w + w);
            }
            const c = cover.data;
            for (let p = 0; p < w * h; p++) {
                const i = p * 4;
                // Un-blend from the background: alpha grows with the distance from it and the
                // colour is recovered, so anti-aliased edges look the same on any background.
                const a = rule[p] ? 0 : alpha[p];
                if (a > 0) for (let k = 0; k < 3; k++) d[i + k] = bg[k] + (d[i + k] - bg[k]) / a;
                d[i + 3] = Math.round(a * 255);
                if (!rule[p]) for (let k = 0; k < 3; k++) c[i + k] = bg[k];
            }
            const out = document.createElement('canvas');
            out.width = w;
            out.height = h;
            const octx = out.getContext('2d')!;
            octx.putImageData(text, 0, 0);
            const url = out.toDataURL();
            octx.putImageData(cover, 0, 0);
            return { url, coverUrl: out.toDataURL(), rect: view.rectToPdf(x / ratio, y / ratio, (x + w) / ratio, (y + h) / ratio), background: paperRgb(bg) };
        } catch {
            return null;
        }
    }, []);

    const value = useMemo(
        () => ({ session, state, dispatch, scale, reports, setReport, registerCanvas, sampleBackground, captureRegion, editing, setEditing, editingObject, setEditingObject, search, setSearch }),
        [session, state, dispatch, scale, reports, setReport, registerCanvas, sampleBackground, captureRegion, editing, editingObject, search],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditor() {
    const v = useContext(Ctx);
    if (!v) throw new Error('useEditor outside EditorProvider');
    return v;
}

export const rgbCss = (c: RGB, a = 1) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

export const hexToRgb = (hex: string): RGB => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [0, 0, 0];
};

export const rgbToHex = (c: RGB) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
