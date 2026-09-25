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
            // Mode of quantised colours: text pixels are a minority, background wins.
            const counts = new Map<number, number>();
            let best = 0, bestKey = 0x7fff;
            const step = Math.max(1, Math.floor((w * h) / 4000)) * 4;
            for (let i = 0; i < data.length; i += step) {
                const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
                const c = (counts.get(k) ?? 0) + 1;
                counts.set(k, c);
                if (c > best) {
                    best = c;
                    bestKey = k;
                }
            }
            const q = (v: number) => Math.min(1, ((v << 3) + 4) / 255);
            const rgb: RGB = [q((bestKey >> 10) & 31), q((bestKey >> 5) & 31), q(bestKey & 31)];
            // Snap near-white to pure white so white-outs are invisible on white paper.
            return rgb.every((v) => v > 0.94) ? [1, 1, 1] : rgb;
        } catch {
            return [1, 1, 1];
        }
    }, []);

    const value = useMemo(
        () => ({ session, state, dispatch, scale, reports, setReport, registerCanvas, sampleBackground, editing, setEditing, editingObject, setEditingObject, search, setSearch }),
        [session, state, dispatch, scale, reports, setReport, registerCanvas, sampleBackground, editing, editingObject, search],
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
