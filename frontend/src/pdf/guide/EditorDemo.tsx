/**
 * A playable copy of the Panna editor (src/pdf/editor/Workspace.tsx) on a practice
 * certificate. It works like the real one, at its natural size: click a line to edit
 * it in the document's own font (letters missing from the embedded subset are named,
 * as Panna does), erase words for real, white-out, highlight, draw, add shapes, text,
 * a logo or a signature, find and replace, undo and redo. "Download PDF" shows what a
 * PDF reader would find inside the file, which is the point of the whole guide.
 *
 * Everything is in points on an A4 landscape page and drawn by Paper.tsx; the
 * chrome comes from chrome.tsx. Keyboard shortcuts only apply while focus is inside.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, CaseSensitive, CheckCircle2, FilePlus2, Info, Move, Replace, Trash2, WholeWord, X } from 'lucide-react';
import { PANNA } from '../brand';
import { BLOCKS, DOC_FONTS, FAMILIES, PAGE_H, PAGE_W, PAPER, blockById, missingLetters, rgbCss, type RGB } from './certificate';
import { DownloadToast, FormatBarReplica, IconButton, SelectionBarReplica, ToolBarReplica, TopBarReplica, bpFor, type Bp, type DrawDefaults, type Fmt, type TextDefaults, type Tool } from './chrome';
import { DemoFrame, MacWindow } from './frame';
import { useIsoLayoutEffect } from './useIsoLayoutEffect';
import Paper, { blockStyle, fmtOf, isEdited, subsetKey, textOf, tokens, visibleText, type BlockEdit, type DocEdits, type Match } from './Paper';

const CSS_UNITS = 96 / 72;
const FILE = 'certificate-of-merit.pdf';

type Rect = { x0: number; y0: number; x1: number; y1: number };
type Obj =
    | { kind: 'whiteout'; id: string; r: Rect }
    | { kind: 'highlight'; id: string; rects: Rect[]; color: RGB }
    | { kind: 'ink'; id: string; pts: [number, number][]; color: RGB; width: number }
    | { kind: 'shape'; id: string; shape: 'rect' | 'ellipse' | 'line' | 'arrow'; x0: number; y0: number; x1: number; y1: number; color: RGB; width: number; fill: boolean }
    | { kind: 'text'; id: string; x: number; y: number; text: string; fmt: Fmt }
    | { kind: 'art'; id: string; art: 'logo' | 'sign'; r: Rect };

interface Doc {
    blocks: DocEdits;
    objs: Obj[];
}
const EMPTY: Doc = { blocks: {}, objs: [] };

let seq = 0;
const newId = (p: string) => `${p}${++seq}`;

const norm = (a: [number, number], b: [number, number]): Rect => ({ x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) });
const union = (rs: Rect[]): Rect => rs.reduce((u, r) => ({ x0: Math.min(u.x0, r.x0), y0: Math.min(u.y0, r.y0), x1: Math.max(u.x1, r.x1), y1: Math.max(u.y1, r.y1) }));
const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

function bbox(o: Obj): Rect {
    switch (o.kind) {
        case 'whiteout':
        case 'art':
            return o.r;
        case 'highlight':
            return union(o.rects);
        case 'ink': {
            const xs = o.pts.map((p) => p[0]);
            const ys = o.pts.map((p) => p[1]);
            const w = o.width / 2 + 2;
            return { x0: Math.min(...xs) - w, y0: Math.min(...ys) - w, x1: Math.max(...xs) + w, y1: Math.max(...ys) + w };
        }
        case 'shape':
            return { x0: Math.min(o.x0, o.x1) - 2, y0: Math.min(o.y0, o.y1) - 2, x1: Math.max(o.x0, o.x1) + 2, y1: Math.max(o.y0, o.y1) + 2 };
        case 'text': {
            const lines = (o.text || 'Type here').split('\n');
            const w = Math.max(...lines.map((l) => l.length)) * o.fmt.size * 0.55;
            return { x0: o.x, y0: o.y, x1: o.x + Math.max(w, 24), y1: o.y + lines.length * o.fmt.size * 1.2 };
        }
    }
}

function translate(o: Obj, dx: number, dy: number): Obj {
    const r = (q: Rect) => ({ x0: q.x0 + dx, y0: q.y0 + dy, x1: q.x1 + dx, y1: q.y1 + dy });
    switch (o.kind) {
        case 'whiteout':
        case 'art':
            return { ...o, r: r(o.r) };
        case 'highlight':
            return { ...o, rects: o.rects.map(r) };
        case 'ink':
            return { ...o, pts: o.pts.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
        case 'shape':
            return { ...o, x0: o.x0 + dx, y0: o.y0 + dy, x1: o.x1 + dx, y1: o.y1 + dy };
        case 'text':
            return { ...o, x: o.x + dx, y: o.y + dy };
    }
}

/** Pointer drag on an element: move/end receive the distance travelled in CSS pixels. */
function dragOn(ev: ReactPointerEvent<Element>, onMove: (dx: number, dy: number, e: PointerEvent) => void, onEnd: (dx: number, dy: number, moved: boolean, e: PointerEvent) => void, threshold = 3) {
    const el = ev.currentTarget as Element;
    const x0 = ev.clientX;
    const y0 = ev.clientY;
    let moved = false;
    try {
        el.setPointerCapture(ev.pointerId);
    } catch {
        /* not capturable (synthetic event) */
    }
    const move = (e: PointerEvent) => {
        const dx = e.clientX - x0;
        const dy = e.clientY - y0;
        if (!moved && Math.hypot(dx, dy) < threshold) return;
        moved = true;
        onMove(dx, dy, e);
    };
    const up = (e: PointerEvent) => {
        el.removeEventListener('pointermove', move as EventListener);
        el.removeEventListener('pointerup', up as EventListener);
        el.removeEventListener('pointercancel', up as EventListener);
        onEnd(e.clientX - x0, e.clientY - y0, moved, e);
    };
    el.addEventListener('pointermove', move as EventListener);
    el.addEventListener('pointerup', up as EventListener);
    el.addEventListener('pointercancel', up as EventListener);
}

/** Keeps erased words erased when find & replace changes other parts of the same text. */
function remapErased(old: string, erased: number[] | undefined, reps: { start: number; end: number }[], withText: string): number[] | undefined {
    if (!erased?.length) return undefined;
    const toks = tokens(old);
    const starts: number[] = [];
    let at = 0;
    for (const t of toks) {
        starts.push(at);
        at += t.length;
    }
    const next = (() => {
        let s = old;
        for (const r of [...reps].sort((a, b) => b.start - a.start)) s = s.slice(0, r.start) + withText + s.slice(r.end);
        return s;
    })();
    const newToks = tokens(next);
    const newStarts: number[] = [];
    at = 0;
    for (const t of newToks) {
        newStarts.push(at);
        at += t.length;
    }
    const out: number[] = [];
    for (const i of erased) {
        const a = starts[i];
        const b = a + toks[i].length;
        if (reps.some((r) => r.start < b && r.end > a)) continue;
        const shift = reps.filter((r) => r.end <= a).reduce((n, r) => n + withText.length - (r.end - r.start), 0);
        const k = newStarts.indexOf(a + shift);
        if (k >= 0 && newToks[k] === toks[i]) out.push(k);
    }
    return out.length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Bars that float next to what they belong to, kept inside the visible document area.

function useFloatingBar(anchor: RefObject<HTMLElement>, paper: RefObject<HTMLElement>, scroller: RefObject<HTMLElement>, preferAbove: boolean, deps: unknown[]) {
    const barRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number; maxW: number } | null>(null);
    const measure = useCallback(() => {
        const a = anchor.current?.getBoundingClientRect();
        const p = paper.current?.getBoundingClientRect();
        const sc = scroller.current?.getBoundingClientRect();
        const bar = barRef.current;
        if (!a || !p || !sc || !bar) return;
        const maxW = Math.max(200, sc.width - 16);
        const bw = Math.min(bar.scrollWidth, maxW);
        const bh = bar.offsetHeight;
        const left = Math.min(Math.max(a.left, sc.left + 8), sc.right - bw - 8) - p.left;
        const above = preferAbove && a.top - bh - 10 > p.top;
        const top = above ? a.top - p.top - bh - 8 : a.bottom - p.top + 10;
        setPos((old) => (old && Math.abs(old.left - left) < 0.5 && Math.abs(old.top - top) < 0.5 && old.maxW === maxW ? old : { left, top, maxW }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferAbove]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useIsoLayoutEffect(measure, [measure, ...deps]);
    useEffect(() => {
        const sc = scroller.current;
        sc?.addEventListener('scroll', measure, { passive: true });
        window.addEventListener('resize', measure);
        return () => {
            sc?.removeEventListener('scroll', measure);
            window.removeEventListener('resize', measure);
        };
    }, [measure, scroller]);
    return { barRef, style: { position: 'absolute' as const, left: pos?.left ?? 0, top: pos?.top ?? 0, maxWidth: pos?.maxW, zIndex: 40, visibility: pos ? ('visible' as const) : ('hidden' as const) } };
}

// ---------------------------------------------------------------------------
// The text box opened on a line of the certificate (InlineTextEditor.tsx).

interface Draft {
    id: string;
    text: string;
    fmt: Fmt;
    dx: number;
    dy: number;
    width?: number;
}

function BlockEditor({
    bp,
    s,
    draft,
    setDraft,
    canRevert,
    onCommit,
    onCancel,
    onTab,
    onDelete,
    onRevert,
    paper,
    scroller,
    editorRef,
}: {
    bp: Bp;
    s: number;
    draft: Draft;
    setDraft: (fn: (d: Draft) => Draft) => void;
    canRevert: boolean;
    onCommit: () => void;
    onCancel: () => void;
    onTab: (dir: 1 | -1) => void;
    onDelete: () => void;
    onRevert: () => void;
    paper: RefObject<HTMLElement>;
    scroller: RefObject<HTMLElement>;
    editorRef: RefObject<HTMLDivElement>;
}) {
    const b = blockById(draft.id);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLSpanElement>(null);
    const [w, setW] = useState(0);
    const [h, setH] = useState(0);
    const style = blockStyle(b, { fmt: draft.fmt, dx: draft.dx, dy: draft.dy, width: draft.width }, s);
    const wraps = draft.width !== undefined || b.width !== undefined;
    const lineH = parseFloat(String(style.lineHeight));

    useEffect(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.focus({ preventScroll: true });
        const end = ta.value.length;
        ta.setSelectionRange(end, end);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.id]);

    useIsoLayoutEffect(() => {
        if (mirrorRef.current) setW(mirrorRef.current.offsetWidth + 3);
        const ta = taRef.current;
        if (ta) {
            // Measure at zero height, then set the height straight back: React won't
            // rewrite the style when the measured height hasn't changed.
            ta.style.height = '0px';
            const next = Math.max(ta.scrollHeight, lineH);
            ta.style.height = `${next}px`;
            setH(next);
        }
    }, [draft.text, draft.fmt, draft.width, s, lineH]);

    const missing = draft.fmt.family === 'original' ? missingLetters(draft.text, subsetKey(draft.fmt)) : [];
    const warning = missing.length ? `Not in this PDF's font: ${missing.slice(0, 8).join(' ')}${missing.length > 8 ? ' …' : ''} → ${DOC_FONTS[subsetKey(draft.fmt)].fallback}` : null;
    const bar = useFloatingBar(editorRef, paper, scroller, (b.top + draft.dy) * s > 90, [draft, s, w, h, warning]);

    const beginMove = (ev: ReactPointerEvent<HTMLSpanElement>) => {
        ev.preventDefault();
        ev.stopPropagation();
        const start = { dx: draft.dx, dy: draft.dy };
        dragOn(
            ev,
            (dx, dy) => setDraft((d) => ({ ...d, dx: start.dx + dx / s, dy: start.dy + dy / s })),
            () => taRef.current?.focus({ preventScroll: true }),
            0,
        );
    };
    const beginResize = (ev: ReactPointerEvent<HTMLSpanElement>, side: 'left' | 'right') => {
        ev.preventDefault();
        ev.stopPropagation();
        const startW = draft.width ?? b.width ?? w / s;
        const startDx = draft.dx;
        const minW = Math.max(2 * draft.fmt.size, 12);
        dragOn(
            ev,
            (dx) => {
                const d = dx / s;
                if (b.align === 'center') setDraft((x) => ({ ...x, width: Math.max(minW, startW + (side === 'right' ? 2 * d : -2 * d)) }));
                else if (side === 'right') setDraft((x) => ({ ...x, width: Math.max(minW, startW + d) }));
                else {
                    const nw = Math.max(minW, startW - d);
                    setDraft((x) => ({ ...x, width: nw, dx: startDx + (startW - nw) }));
                }
            },
            () => taRef.current?.focus({ preventScroll: true }),
            0,
        );
    };

    const handleCls = 'absolute h-5 w-2.5 cursor-ew-resize rounded-sm border border-emerald-600 bg-white shadow-sm hover:bg-emerald-50';
    return (
        <>
            <div ref={editorRef} style={{ ...style, zIndex: 30, width: wraps ? style.width : undefined }} data-editor>
                <span ref={mirrorRef} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', left: 0, top: 0 }}>
                    {draft.text || ' '}
                </span>
                <span
                    role="button"
                    aria-label="Move this text"
                    title="Drag to move · Shift: straight line · Alt: no snapping"
                    onPointerDown={beginMove}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute right-full mr-4 flex h-6 w-6 cursor-move items-center justify-center rounded-full bg-emerald-600 text-white shadow ring-2 ring-white hover:bg-emerald-700"
                    style={{ top: (lineH - 24) / 2, touchAction: 'none', fontSize: 12 }}
                >
                    <Move className="h-3.5 w-3.5" />
                </span>
                {(['left', 'right'] as const).map((side) => (
                    <span
                        key={side}
                        aria-hidden="true"
                        title="Drag to change the width — the text re-wraps to fit"
                        onPointerDown={(e) => beginResize(e, side)}
                        onMouseDown={(e) => e.preventDefault()}
                        className={handleCls}
                        style={{ [side]: -11, top: Math.max(0, (h || lineH) / 2 - 10), zIndex: 1, touchAction: 'none' }}
                    />
                ))}
                <textarea
                    ref={taRef}
                    value={draft.text}
                    rows={1}
                    spellCheck={false}
                    wrap={wraps ? 'soft' : 'off'}
                    onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, text: b.paragraph ? v : v.replace(/\n/g, ' ') }));
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            onCancel();
                        } else if (e.key === 'Tab') {
                            e.preventDefault();
                            onTab(e.shiftKey ? -1 : 1);
                        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!b.paragraph && !e.shiftKey))) {
                            e.preventDefault();
                            onCommit();
                        }
                    }}
                    aria-label="Edit text"
                    className="block resize-none overflow-hidden border-0 p-0 outline-none ring-2 ring-emerald-500/70 ring-offset-2 selection:bg-emerald-200"
                    style={
                        {
                            width: wraps ? '100%' : w,
                            height: h || lineH,
                            font: 'inherit',
                            letterSpacing: 'inherit',
                            lineHeight: 'inherit',
                            color: rgbCss(draft.fmt.color),
                            background: PAPER,
                            whiteSpace: wraps ? 'pre-wrap' : 'pre',
                            textAlign: draft.fmt.align,
                            '--tw-ring-offset-color': PAPER,
                        } as CSSProperties
                    }
                />
            </div>
            <div ref={bar.barRef} style={bar.style} data-editor-bar>
                <FormatBarReplica
                    bp={bp}
                    value={draft.fmt}
                    onChange={(p) => setDraft((d) => ({ ...d, fmt: { ...d.fmt, ...p } }))}
                    originalLabel={DOC_FONTS[b.font].label}
                    warning={warning}
                    hint={`${b.paragraph ? 'Ctrl+Enter' : 'Enter'} to finish · Tab: next text · Esc: cancel · drag ✥ to move, the side handles to change the width`}
                    onRevert={canRevert ? onRevert : undefined}
                    onDelete={onDelete}
                    onDone={onCommit}
                />
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Added objects (ObjectsLayer.tsx)

function Art({ art }: { art: 'logo' | 'sign' }) {
    if (art === 'sign')
        return (
            <svg viewBox="0 0 140 50" className="h-full w-full" aria-hidden="true">
                <path
                    d="M8 36 C 14 12, 28 6, 26 24 S 16 44, 34 32 C 44 24, 50 16, 54 28 C 57 36, 62 32, 68 24 C 74 16, 78 30, 84 32 C 92 34, 98 18, 106 22 C 112 25, 116 31, 132 20 M 40 42 C 70 38, 100 36, 128 38"
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
            <path d="M32 3 L57 12 V30 C57 45 46 56 32 61 C18 56 7 45 7 30 V12 Z" fill="#065f46" />
            <path d="M32 9 L51 16 V30 C51 41 43 50 32 55 C21 50 13 41 13 30 V16 Z" fill="none" stroke="#fcd34d" strokeWidth="1.6" />
            <path d="M19 26 C25 23 29 24 32 27 C35 24 39 23 45 26 V42 C39 39 35 40 32 43 C29 40 25 39 19 42 Z" fill="#ecfdf5" />
            <path d="M32 27 V43" stroke="#065f46" strokeWidth="1.4" />
        </svg>
    );
}

function TextObject({ o, s, editing, selected, interactive, onDown, onChange, onDone, onDelete, bp, paper, scroller }: {
    o: Extract<Obj, { kind: 'text' }>;
    s: number;
    editing: boolean;
    selected: boolean;
    interactive: boolean;
    onDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onChange: (p: Partial<Extract<Obj, { kind: 'text' }>>) => void;
    onDone: () => void;
    onDelete: () => void;
    bp: Bp;
    paper: RefObject<HTMLElement>;
    scroller: RefObject<HTMLElement>;
}) {
    const fam = FAMILIES.find((f) => f.id === o.fmt.family)?.css ?? FAMILIES[0].css;
    const font = { fontFamily: fam, fontSize: o.fmt.size * s, fontWeight: o.fmt.bold ? 700 : 400, fontStyle: o.fmt.italic ? 'italic' : 'normal', lineHeight: 1.2, color: rgbCss(o.fmt.color) } as const;
    const boxRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const bar = useFloatingBar(boxRef, paper, scroller, o.y * s > 90, [o, s, editing]);
    useEffect(() => {
        if (editing) taRef.current?.focus({ preventScroll: true });
    }, [editing]);
    useIsoLayoutEffect(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.style.height = '0px';
        ta.style.height = `${ta.scrollHeight}px`;
        ta.style.width = '0px';
        ta.style.width = `${Math.max(ta.scrollWidth + 2, 3 * o.fmt.size * s)}px`;
    }, [o.text, o.fmt, s, editing]);
    if (editing)
        return (
            <>
                <div ref={boxRef} className="absolute" style={{ left: o.x * s, top: o.y * s, zIndex: 30, pointerEvents: 'auto' }} data-editor>
                    <textarea
                        ref={taRef}
                        value={o.text}
                        rows={1}
                        placeholder="Type here"
                        spellCheck={false}
                        wrap="off"
                        onChange={(e) => onChange({ text: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                                e.preventDefault();
                                e.stopPropagation();
                                onDone();
                            }
                        }}
                        aria-label="New text"
                        className="block resize-none overflow-hidden border-0 bg-transparent p-0 outline-none ring-2 ring-emerald-500/70 ring-offset-2 placeholder:text-slate-400"
                        style={{ ...font, whiteSpace: 'pre' }}
                    />
                </div>
                <div ref={bar.barRef} style={{ ...bar.style, pointerEvents: 'auto' }} data-editor-bar>
                    <FormatBarReplica bp={bp} value={o.fmt} onChange={(p) => onChange({ fmt: { ...o.fmt, ...p } })} hint="Ctrl+Enter or Esc to finish" onDelete={onDelete} onDone={onDone} showAlign={false} />
                </div>
            </>
        );
    return (
        <div
            onPointerDown={interactive ? onDown : undefined}
            className={`absolute select-none ${interactive ? 'cursor-move' : ''} ${selected ? 'outline outline-2 outline-offset-2 outline-emerald-500' : interactive ? 'hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-emerald-400' : ''}`}
            style={{ left: o.x * s, top: o.y * s, ...font, whiteSpace: 'pre', pointerEvents: interactive ? 'auto' : 'none', touchAction: 'none' }}
        >
            {o.text}
        </div>
    );
}

function ShapeSvg({ o, s, interactive, onDown }: { o: Extract<Obj, { kind: 'shape' | 'ink' }>; s: number; interactive: boolean; onDown: (e: ReactPointerEvent<SVGElement>) => void }) {
    const pe = interactive ? 'visiblePainted' : 'none';
    const common = { onPointerDown: interactive ? onDown : undefined, style: { pointerEvents: pe, cursor: interactive ? 'move' : undefined } as CSSProperties };
    if (o.kind === 'ink') {
        const d = o.pts.map((p, i) => `${i ? 'L' : 'M'}${p[0] * s} ${p[1] * s}`).join(' ');
        return <path d={d} fill="none" stroke={rgbCss(o.color)} strokeWidth={Math.max(1, o.width * s)} strokeLinecap="round" strokeLinejoin="round" {...common} />;
    }
    const sw = Math.max(1, o.width * s);
    const g = { stroke: rgbCss(o.color), strokeWidth: sw, fill: o.fill ? 'rgb(237 242 255)' : 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    const [x0, y0, x1, y1] = [o.x0 * s, o.y0 * s, o.x1 * s, o.y1 * s];
    if (o.shape === 'rect') return <rect x={Math.min(x0, x1)} y={Math.min(y0, y1)} width={Math.abs(x1 - x0)} height={Math.abs(y1 - y0)} {...g} {...common} />;
    if (o.shape === 'ellipse') return <ellipse cx={(x0 + x1) / 2} cy={(y0 + y1) / 2} rx={Math.abs(x1 - x0) / 2} ry={Math.abs(y1 - y0) / 2} {...g} {...common} />;
    if (o.shape === 'line') return <line x1={x0} y1={y0} x2={x1} y2={y1} {...g} {...common} />;
    const a = Math.atan2(y1 - y0, x1 - x0);
    const L = Math.max(8, sw * 4);
    const head = `M${x1 - L * Math.cos(a - 0.45)} ${y1 - L * Math.sin(a - 0.45)} L${x1} ${y1} L${x1 - L * Math.cos(a + 0.45)} ${y1 - L * Math.sin(a + 0.45)}`;
    return (
        <g {...common}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} {...g} />
            <path d={head} {...g} fill="none" />
        </g>
    );
}

// ---------------------------------------------------------------------------
// Find & replace (FindPanel.tsx)

const escapeRe = (q: string) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function FindPanelReplica({
    query,
    setQuery,
    replace,
    setReplace,
    matchCase,
    setMatchCase,
    whole,
    setWhole,
    total,
    active,
    go,
    onOne,
    onAll,
    onClose,
}: {
    query: string;
    setQuery: (v: string) => void;
    replace: string;
    setReplace: (v: string) => void;
    matchCase: boolean;
    setMatchCase: (v: boolean) => void;
    whole: boolean;
    setWhole: (v: boolean) => void;
    total: number;
    active: number;
    go: (i: number) => void;
    onOne: () => void;
    onAll: () => void;
    onClose: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);
    return (
        <div
            className="w-[min(380px,calc(100vw-24px))] max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)]"
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    onClose();
                }
            }}
        >
            <div className="flex items-center gap-1.5">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') go(active + (e.shiftKey ? -1 : 1));
                    }}
                    placeholder="Find in document"
                    aria-label="Find"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button type="button" aria-label="Match case" title="Match case" aria-pressed={matchCase} onClick={() => setMatchCase(!matchCase)} className={`flex h-9 w-9 items-center justify-center rounded-lg ${matchCase ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <CaseSensitive className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Whole word" title="Whole word" aria-pressed={whole} onClick={() => setWhole(!whole)} className={`flex h-9 w-9 items-center justify-center rounded-lg ${whole ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <WholeWord className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Close find" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
                <input
                    value={replace}
                    onChange={(e) => setReplace(e.target.value)}
                    placeholder="Replace with"
                    aria-label="Replace with"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button type="button" disabled={!total} onClick={onOne} className="h-9 rounded-lg px-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40">
                    Replace
                </button>
                <button type="button" disabled={!total} onClick={onAll} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-2.5 text-[13px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-40">
                    <Replace className="h-3.5 w-3.5" /> All
                </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{query ? (total ? `${active + 1} of ${total}` : 'No matches') : 'Search all pages'}</span>
                <div className="flex gap-1">
                    <button type="button" aria-label="Previous match" disabled={!total} onClick={() => go(active - 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40">
                        <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Next match" disabled={!total} onClick={() => go(active + 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40">
                        <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// "What's inside the file": the copy test after Download.

function FileSheet({ doc, onClose }: { doc: Doc; onClose: () => void }) {
    const rows = BLOCKS.map((b) => {
        const e = doc.blocks[b.id];
        const text = e?.text === '' ? '' : visibleText(b, e);
        const changed = isEdited(b, e) && (e?.text !== undefined || !!e?.erased?.length);
        const erased = e?.erased?.length ?? 0;
        return { id: b.id, text, changed, deleted: e?.text === '', erased };
    });
    const added = doc.objs.filter((o): o is Extract<Obj, { kind: 'text' }> => o.kind === 'text' && !!o.text.trim());
    const fallbackLetters = new Set<string>();
    for (const b of BLOCKS) {
        const e = doc.blocks[b.id];
        if (!e?.text) continue;
        const f = fmtOf(b, e);
        if (f.family === 'original') missingLetters(visibleText(b, e), subsetKey(f)).forEach((c) => fallbackLetters.add(c));
    }
    const erasedWords = rows.reduce((n, r) => n + r.erased, 0) + rows.filter((r) => r.deleted).length;
    const covered = doc.objs.filter((o) => o.kind === 'whiteout').length;
    const changes = Object.keys(doc.blocks).length + doc.objs.length;
    return (
        <div className="ep-sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="ep-sheet-title">
            <button type="button" className="ep-sheet-scrim" aria-label="Close" onClick={onClose} />
            <div className="ep-sheet">
                <div className="ep-sheet-grip" aria-hidden="true" />
                <div className="ep-sheet-head">
                    <div>
                        <p className="ep-sheet-kicker">The copy test</p>
                        <h3 id="ep-sheet-title">What a PDF reader finds in this file</h3>
                    </div>
                    <button type="button" className="ep-sheet-x" onClick={onClose} aria-label="Close">
                        <X aria-hidden="true" />
                    </button>
                </div>
                <p className="ep-sheet-lede">
                    {changes ? (
                        <>
                            You made {changes} {changes === 1 ? 'change' : 'changes'}. This is the text you’d get by selecting everything in the downloaded PDF and pasting it into a note.
                        </>
                    ) : (
                        <>Nothing has changed yet. Edit a line, erase a word or add text, then download again.</>
                    )}
                </p>
                <ol className="ep-sheet-text">
                    {rows
                        .filter((r) => r.text)
                        .map((r) => (
                            <li key={r.id} className={r.changed ? 'is-changed' : undefined}>
                                {r.text}
                                {r.changed && <small>{r.erased ? 'erased words removed' : 'edited'}</small>}
                            </li>
                        ))}
                    {added.map((o) => (
                        <li key={o.id} className="is-added">
                            {o.text}
                            <small>added</small>
                        </li>
                    ))}
                </ol>
                <ul className="ep-sheet-facts">
                    <li>
                        <b>Fonts</b>
                        <span>
                            Georgia, Georgia Bold and Georgia Italic, the certificate’s own embedded subsets
                            {fallbackLetters.size ? `. Times for ${[...fallbackLetters].join(' ')} only, which the subsets don’t contain` : ''}
                            {added.length ? '. Your added text in its chosen font' : ''}.
                        </span>
                    </li>
                    <li>
                        <b>Hidden text</b>
                        <span>
                            None.{' '}
                            {erasedWords
                                ? `${erasedWords} erased ${erasedWords === 1 ? 'word was' : 'words were'} deleted from the page, not covered${covered ? ', and the text under your white-out went with it' : ''}.`
                                : covered
                                  ? 'The text under your white-out was deleted too.'
                                  : 'Nothing is hiding under a box.'}
                        </span>
                    </li>
                    <li>
                        <b>Watermark</b>
                        <span>None, and no account was needed.</span>
                    </li>
                </ul>
                <div className="ep-sheet-actions">
                    <Link className="ep-btn" to={PANNA.routes.editor}>
                        Edit your own PDF
                    </Link>
                    <button type="button" className="ep-btn ep-btn--plain" onClick={onClose}>
                        Keep practising
                    </button>
                </div>
                <p className="ep-sheet-note">This page is a practice copy. The real editor at pdf.testoza.com/edit-pdf writes these changes into your PDF and saves it to your device.</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------

interface Toast {
    id: number;
    kind: 'success' | 'info' | 'download';
    title: string;
    desc?: string;
}

export default function EditorDemo() {
    const [hist, setHist] = useState<{ past: Doc[]; doc: Doc; future: Doc[] }>({ past: [], doc: EMPTY, future: [] });
    const doc = hist.doc;
    const docRef = useRef(doc);
    docRef.current = doc;

    const [tool, setTool] = useState<Tool>('edit');
    const [draw, setDraw] = useState<DrawDefaults>({ stroke: [0.86, 0.15, 0.15], width: 2, fill: false, highlight: [1, 0.9, 0.2] });
    const [textDefaults, setTextDefaults] = useState<TextDefaults>({ family: 'helvetica', size: 12, color: [0, 0, 0] });
    const [draft, setDraft] = useState<Draft | null>(null);
    const [selected, setSelected] = useState<{ kind: 'block' | 'obj'; id: string } | null>(null);
    const [editingObj, setEditingObj] = useState<string | null>(null);
    const [live, setLive] = useState<{ id: string; dx: number; dy: number } | null>(null);
    const [toolDrag, setToolDrag] = useState<{ a: [number, number]; b: [number, number]; pts: [number, number][] } | null>(null);
    const [findOpen, setFindOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [replaceWith, setReplaceWith] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [whole, setWhole] = useState(false);
    const [activeMatch, setActiveMatch] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [sheet, setSheet] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [fileName, setFileName] = useState(FILE);
    const [panel, setPanel] = useState<boolean | null>(null);
    const [zoom, setZoom] = useState<number | null>(null);
    const [progress, setProgress] = useState({ edited: false, found: false, tools: false, downloaded: false });
    const [width, setWidth] = useState(1040);
    const [mainW, setMainW] = useState(888);
    const [selAtTop, setSelAtTop] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLElement>(null);
    const paperRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const centred = useRef(false);

    const bp = bpFor(width);
    const panelOpen = (panel ?? bp >= 3) && bp >= 2;
    const pad = mainW < 640 ? 16 : 48;
    const fitScale = Math.min(2.5 * CSS_UNITS, Math.max(0.25 * CSS_UNITS, (mainW - pad) / PAGE_W));
    // On a phone the page is shown a little larger than its width (the reader pans), so the
    // certificate's 14 pt text stays readable instead of shrinking to 6 px.
    const s = zoom ?? (bp === 0 ? Math.max(fitScale, 0.62) : fitScale);

    // ---- Measure the window and the document area
    useEffect(() => {
        const root = rootRef.current;
        const main = scrollRef.current;
        if (!root || !main) return;
        const ro = new ResizeObserver(() => {
            setWidth(root.clientWidth);
            setMainW(main.clientWidth);
        });
        ro.observe(root);
        ro.observe(main);
        return () => ro.disconnect();
    }, []);

    // Phones: start centred on the text column.
    useIsoLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el || centred.current || bp !== 0) return;
        if (el.scrollWidth > el.clientWidth) {
            el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
            centred.current = true;
        }
    }, [bp, s]);

    const toast = useCallback((t: Omit<Toast, 'id'>, ms = 4200) => {
        const id = Date.now() + Math.random();
        setToasts((list) => [...list.slice(-2), { ...t, id }]);
        window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), ms);
    }, []);

    const commit = useCallback((fn: (d: Doc) => Doc) => {
        setHist((h) => {
            const next = fn(h.doc);
            if (next === h.doc) return h;
            return { past: [...h.past, h.doc].slice(-100), doc: next, future: [] };
        });
    }, []);
    const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), doc: h.past[h.past.length - 1], future: [h.doc, ...h.future] } : h));
    const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.doc], doc: h.future[0], future: h.future.slice(1) } : h));

    const reset = () => {
        setHist({ past: [], doc: EMPTY, future: [] });
        setTool('edit');
        setDraft(null);
        setSelected(null);
        setEditingObj(null);
        setFindOpen(false);
        setQuery('');
        setReplaceWith('');
        setSheet(false);
        setToasts([]);
        setFileName(FILE);
        setZoom(null);
        setProgress({ edited: false, found: false, tools: false, downloaded: false });
        centred.current = false;
        scrollRef.current?.scrollTo({ top: 0 });
    };

    // ---- Editing a line of the certificate
    const openBlock = useCallback((id: string) => {
        const b = blockById(id);
        const e = docRef.current.blocks[id];
        setDraft({ id, text: e?.erased?.length ? visibleText(b, e) : textOf(b, e), fmt: fmtOf(b, e), dx: e?.dx ?? 0, dy: e?.dy ?? 0, width: e?.width });
        setSelected(null);
        setEditingObj(null);
    }, []);

    const draftRef = useRef(draft);
    draftRef.current = draft;

    const finishDraft = useCallback(
        (then: 'select' | 'none' = 'select') => {
            const d = draftRef.current;
            if (!d) return;
            const b = blockById(d.id);
            const e = docRef.current.blocks[d.id];
            const before = e?.erased?.length ? visibleText(b, e) : textOf(b, e);
            const orig = fmtOf(b, undefined);
            const fmtDiff: Partial<Fmt> = {};
            (Object.keys(orig) as (keyof Fmt)[]).forEach((k) => {
                if (JSON.stringify(d.fmt[k]) !== JSON.stringify(orig[k])) (fmtDiff as Record<string, unknown>)[k] = d.fmt[k];
            });
            const textChanged = d.text !== before;
            const ne: BlockEdit = {
                text: textChanged ? (d.text === b.text ? undefined : d.text) : e?.text,
                erased: textChanged ? undefined : e?.erased,
                fmt: Object.keys(fmtDiff).length ? fmtDiff : undefined,
                dx: d.dx || undefined,
                dy: d.dy || undefined,
                width: d.width,
            };
            const empty = Object.values(ne).every((v) => v === undefined);
            const same = JSON.stringify(ne) === JSON.stringify({ text: e?.text, erased: e?.erased, fmt: e?.fmt, dx: e?.dx, dy: e?.dy, width: e?.width });
            if (!same) {
                commit((doc) => {
                    const blocks = { ...doc.blocks };
                    if (empty) delete blocks[d.id];
                    else blocks[d.id] = ne;
                    return { ...doc, blocks };
                });
                setProgress((p) => ({ ...p, edited: true }));
            }
            setDraft(null);
            setSelected(then === 'select' && d.text !== '' ? { kind: 'block', id: d.id } : null);
        },
        [commit],
    );

    const tabFrom = (dir: 1 | -1) => {
        const d = draftRef.current;
        if (!d) return;
        finishDraft('none');
        const order = BLOCKS.filter((b) => docRef.current.blocks[b.id]?.text !== '' || b.id === d.id);
        const i = order.findIndex((b) => b.id === d.id);
        const next = order[(i + dir + order.length) % order.length];
        // The new state lands after this event; open on the next frame.
        requestAnimationFrame(() => openBlock(next.id));
    };

    // Finishing on a click outside the text box (the real editor commits on pointerdown outside).
    useEffect(() => {
        if (!draft && !editingObj) return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as HTMLElement;
            if (t.closest('[data-editor], [data-editor-bar]')) return;
            if (draftRef.current) finishDraft(t.closest('[data-paper]') ? 'none' : 'select');
            if (editingObjRef.current) finishObj();
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!draft, editingObj, finishDraft]);

    // ---- Objects
    const editingObjRef = useRef(editingObj);
    editingObjRef.current = editingObj;
    const finishObj = () => {
        const id = editingObjRef.current;
        if (!id) return;
        setEditingObj(null);
        const o = docRef.current.objs.find((x) => x.id === id);
        if (o?.kind === 'text' && !o.text.trim()) {
            setHist((h) => ({ ...h, doc: { ...h.doc, objs: h.doc.objs.filter((x) => x.id !== id) } }));
            setSelected(null);
        } else setSelected({ kind: 'obj', id });
    };
    const updateObj = (id: string, patch: Partial<Obj>) => setHist((h) => ({ ...h, doc: { ...h.doc, objs: h.doc.objs.map((o) => (o.id === id ? ({ ...o, ...patch } as Obj) : o)) } }));
    const removeObj = (id: string) => {
        commit((d) => ({ ...d, objs: d.objs.filter((o) => o.id !== id) }));
        setSelected(null);
        setEditingObj(null);
    };
    const placeArt = (art: 'logo' | 'sign') => {
        const [w, h] = art === 'logo' ? [64, 64] : [140, 50];
        const id = newId('a');
        const cx = PAGE_W / 2;
        const cy = art === 'logo' ? 300 : 330;
        commit((d) => ({ ...d, objs: [...d.objs, { kind: 'art', id, art, r: { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 } }] }));
        setTool('edit');
        setSelected({ kind: 'obj', id });
        setProgress((p) => ({ ...p, tools: true }));
        toast({
            kind: 'info',
            title: art === 'logo' ? 'A sample logo was placed' : 'A sample signature was placed',
            desc: art === 'logo' ? 'In the real editor, Image opens your photos (PNG, JPEG, WebP or GIF). Drag it into place.' : 'In the real editor you draw, type or upload your own signature. Drag it into place.',
        });
    };

    const startObjDrag = (ev: ReactPointerEvent<Element>, o: Obj) => {
        if (tool !== 'edit') return;
        ev.stopPropagation();
        const wasSelected = selected?.kind === 'obj' && selected.id === o.id;
        setSelected({ kind: 'obj', id: o.id });
        dragOn(
            ev,
            (dx, dy) => setLive({ id: o.id, dx: dx / s, dy: dy / s }),
            (dx, dy, moved) => {
                setLive(null);
                if (moved) commit((d) => ({ ...d, objs: d.objs.map((x) => (x.id === o.id ? translate(x, dx / s, dy / s) : x)) }));
                else if (wasSelected && o.kind === 'text') setEditingObj(o.id);
            },
        );
    };

    // ---- Moving the selected line of text
    const startBlockDrag = (ev: ReactPointerEvent<HTMLDivElement>, id: string) => {
        ev.stopPropagation();
        dragOn(
            ev,
            (dx, dy) => setLive({ id, dx: dx / s, dy: dy / s }),
            (dx, dy, moved) => {
                setLive(null);
                if (!moved) {
                    openBlock(id);
                    return;
                }
                commit((d) => {
                    const e = d.blocks[id] ?? {};
                    return { ...d, blocks: { ...d.blocks, [id]: { ...e, dx: (e.dx ?? 0) + dx / s, dy: (e.dy ?? 0) + dy / s } } };
                });
                setProgress((p) => ({ ...p, edited: true }));
            },
            4,
        );
    };
    const nudge = (id: string, dx: number, dy: number) =>
        commit((d) => {
            const e = d.blocks[id] ?? {};
            return { ...d, blocks: { ...d.blocks, [id]: { ...e, dx: (e.dx ?? 0) + dx || undefined, dy: (e.dy ?? 0) + dy || undefined } } };
        });

    // ---- Drag tools: erase, white-out, highlight, shapes, draw; click to add text
    const toPt = (e: { clientX: number; clientY: number }): [number, number] => {
        const r = paperRef.current!.getBoundingClientRect();
        return [(e.clientX - r.left) / s, (e.clientY - r.top) / s];
    };

    /** Words whose centre falls inside `r` (points), read from the drawn page. */
    const wordsIn = (r: Rect) => {
        const paper = paperRef.current;
        if (!paper) return [];
        const pr = paper.getBoundingClientRect();
        const hits: { blockId: string; t: number; r: Rect }[] = [];
        paper.querySelectorAll<HTMLElement>('[data-block] [data-t]').forEach((span) => {
            if (!span.textContent?.trim() || span.style.visibility === 'hidden') return;
            const blk = span.closest<HTMLElement>('[data-block]')!;
            if (blk.style.visibility === 'hidden') return;
            const c = span.getBoundingClientRect();
            const q = { x0: (c.left - pr.left) / s, y0: (c.top - pr.top) / s, x1: (c.right - pr.left) / s, y1: (c.bottom - pr.top) / s };
            const cx = (q.x0 + q.x1) / 2;
            const cy = (q.y0 + q.y1) / 2;
            if (cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1) hits.push({ blockId: blk.dataset.block!, t: Number(span.dataset.t), r: q });
        });
        return hits;
    };
    const eraseWords = (d: Doc, hits: { blockId: string; t: number }[]): Doc => {
        if (!hits.length) return d;
        const blocks = { ...d.blocks };
        for (const h of hits) {
            const e = blocks[h.blockId] ?? {};
            const er = new Set(e.erased ?? []);
            er.add(h.t);
            blocks[h.blockId] = { ...e, erased: [...er].sort((a, b) => a - b) };
        }
        return { ...d, blocks };
    };

    const onToolDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
        if (ev.button !== 0) return;
        const a = toPt(ev);
        if (tool === 'text') {
            const id = newId('t');
            commit((d) => ({ ...d, objs: [...d.objs, { kind: 'text', id, x: a[0], y: a[1] - textDefaults.size * 0.6, text: '', fmt: { family: textDefaults.family, size: textDefaults.size, color: textDefaults.color, bold: false, italic: false, align: 'left' } }] }));
            setEditingObj(id);
            setSelected(null);
            setTool('edit');
            setProgress((p) => ({ ...p, tools: true }));
            ev.preventDefault();
            return;
        }
        ev.preventDefault();
        const pts: [number, number][] = [a];
        setToolDrag({ a, b: a, pts });
        dragOn(
            ev,
            (_dx, _dy, e) => {
                const b = toPt(e);
                if (tool === 'draw') pts.push(b);
                setToolDrag({ a, b, pts: [...pts] });
            },
            (_dx, _dy, moved, e) => {
                setToolDrag(null);
                if (!moved) return;
                const b = toPt(e);
                const r = norm(a, b);
                setProgress((p) => ({ ...p, tools: true }));
                if (tool === 'erase') {
                    const hits = wordsIn(r);
                    if (!hits.length) toast({ kind: 'info', title: 'No text there', desc: 'Drag a box over the words you want to remove.' }, 2600);
                    commit((d) => eraseWords(d, hits));
                } else if (tool === 'whiteout') {
                    const hits = wordsIn(r);
                    commit((d) => ({ ...eraseWords(d, hits), objs: [...d.objs, { kind: 'whiteout', id: newId('w'), r }] }));
                } else if (tool === 'highlight') {
                    const hits = wordsIn(r);
                    const lines = new Map<string, Rect[]>();
                    for (const h of hits) {
                        const k = `${h.blockId}:${Math.round(h.r.y0)}`;
                        lines.set(k, [...(lines.get(k) ?? []), h.r]);
                    }
                    const rects = [...lines.values()].map(union);
                    commit((d) => ({ ...d, objs: [...d.objs, { kind: 'highlight', id: newId('h'), rects: rects.length ? rects : [r], color: draw.highlight }] }));
                } else if (tool === 'draw') {
                    if (pts.length >= 2) commit((d) => ({ ...d, objs: [...d.objs, { kind: 'ink', id: newId('i'), pts: [...pts], color: draw.stroke, width: draw.width }] }));
                } else if (tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'arrow') {
                    commit((d) => ({ ...d, objs: [...d.objs, { kind: 'shape', id: newId('s'), shape: tool, x0: a[0], y0: a[1], x1: b[0], y1: b[1], color: draw.stroke, width: draw.width, fill: draw.fill }] }));
                }
            },
            2,
        );
    };

    // ---- Find & replace
    const matches = useMemo<Match[]>(() => {
        if (!query) return [];
        const body = escapeRe(query);
        const re = new RegExp(whole ? `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])` : body, matchCase ? 'gu' : 'giu');
        const out: Match[] = [];
        for (const b of BLOCKS) {
            const e = doc.blocks[b.id];
            if (e?.text === '') continue;
            const text = textOf(b, e);
            const er = new Set(e?.erased ?? []);
            const spans: [number, number][] = [];
            let at = 0;
            tokens(text).forEach((t, i) => {
                if (er.has(i)) spans.push([at, at + t.length]);
                at += t.length;
            });
            for (const m of text.matchAll(re)) {
                const start = m.index ?? 0;
                const end = start + m[0].length;
                if (end > start && !spans.some(([a, z]) => a < end && z > start)) out.push({ blockId: b.id, start, end });
            }
        }
        return out;
    }, [query, matchCase, whole, doc]);
    const active = matches.length ? Math.min(activeMatch, matches.length - 1) : 0;

    const applyReplace = (targets: Match[]) => {
        if (!targets.length) return 0;
        commit((d) => {
            const blocks = { ...d.blocks };
            const byBlock = new Map<string, Match[]>();
            for (const m of targets) byBlock.set(m.blockId, [...(byBlock.get(m.blockId) ?? []), m]);
            for (const [id, ms] of byBlock) {
                const b = blockById(id);
                const e = blocks[id];
                const old = textOf(b, e);
                let text = old;
                for (const m of [...ms].sort((x, y) => y.start - x.start)) text = text.slice(0, m.start) + replaceWith + text.slice(m.end);
                blocks[id] = { ...e, text: text === b.text ? undefined : text, erased: remapErased(old, e?.erased, ms, replaceWith) };
            }
            return { ...d, blocks };
        });
        setProgress((p) => ({ ...p, found: true, edited: true }));
        return targets.length;
    };

    // ---- Download
    const download = () => {
        if (exporting) return;
        if (draftRef.current) finishDraft('none');
        if (editingObjRef.current) finishObj();
        setExporting(true);
        window.setTimeout(() => {
            setExporting(false);
            setSheet(true);
            setProgress((p) => ({ ...p, downloaded: true }));
            toast({ kind: 'download', title: 'Your PDF is downloaded' }, 6000);
        }, 650);
    };

    // ---- Keyboard (only while focus is inside the demo)
    const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        const el = e.target as HTMLElement;
        const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
        const mod = e.ctrlKey || e.metaKey;
        const k = e.key.toLowerCase();
        if (mod && k === 's') {
            e.preventDefault();
            download();
            return;
        }
        if (mod && k === 'f') {
            e.preventDefault();
            setFindOpen(true);
            return;
        }
        if (typing) return;
        if (mod && k === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
        } else if (mod && k === 'y') {
            e.preventDefault();
            redo();
        } else if ((k === 'delete' || k === 'backspace') && selected?.kind === 'obj') {
            e.preventDefault();
            removeObj(selected.id);
        } else if (k.startsWith('arrow') && selected?.kind === 'block' && !mod) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            nudge(selected.id, k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0);
        } else if (k === 'escape') {
            setFindOpen(false);
            setSelected(null);
            setTool('edit');
        } else if (!mod && !e.altKey) {
            const map: Record<string, Tool> = { v: 'edit', t: 'text', e: 'erase', w: 'whiteout', h: 'highlight', d: 'draw' };
            if (map[k]) {
                setTool(map[k]);
                setSelected(null);
            }
        }
    };

    // ---- Where the selection bar sits (SelectionBar.tsx keeps out of the text's way)
    useIsoLayoutEffect(() => {
        if (selected?.kind !== 'block') return;
        const check = () => {
            const host = scrollRef.current?.getBoundingClientRect();
            const frame = paperRef.current?.querySelector('[data-selected-frame]')?.getBoundingClientRect();
            if (host && frame) setSelAtTop(frame.bottom > host.bottom - 96 && frame.top > host.top + 96);
        };
        check();
        const sc = scrollRef.current;
        sc?.addEventListener('scroll', check, { passive: true });
        return () => sc?.removeEventListener('scroll', check);
    }, [selected, doc, s]);

    // ---- What the reader sees
    const edits: DocEdits = useMemo(() => {
        if (!live || selected?.kind !== 'block') return doc.blocks;
        const e = doc.blocks[live.id] ?? {};
        return { ...doc.blocks, [live.id]: { ...e, dx: (e.dx ?? 0) + live.dx, dy: (e.dy ?? 0) + live.dy } };
    }, [doc.blocks, live, selected]);
    const objs = live && selected?.kind === 'obj' ? doc.objs.map((o) => (o.id === live.id ? translate(o, live.dx, live.dy) : o)) : doc.objs;
    const changes = Object.keys(doc.blocks).length + doc.objs.length;
    const edited = changes > 0;
    const selBlock = selected?.kind === 'block' ? blockById(selected.id) : null;
    const selObj = selected?.kind === 'obj' ? objs.find((o) => o.id === selected.id) : null;
    const missingNow = draft && draft.fmt.family === 'original' ? missingLetters(draft.text, subsetKey(draft.fmt)) : [];

    const tip: ReactNode = sheet ? (
        <>That’s the copy test: no old text hiding under boxes. Your own PDF works the same way in the real editor.</>
    ) : draft ? (
        missingNow.length ? (
            <>
                This certificate’s font has no <b>{missingNow.slice(0, 3).join(' ')}</b>, so Panna names it and borrows just that letter from Times.
            </>
        ) : blockById(draft.id).paragraph ? (
            <>
                Type your change, then press <b>Done</b> (or <kbd>Ctrl</kbd> <kbd>Enter</kbd>: in a paragraph, Enter adds a line). It stays in Georgia, the certificate’s own font.
            </>
        ) : (
            <>
                Type your change, then press <kbd>Enter</kbd>. It stays in Georgia, the certificate’s own font.
            </>
        )
    ) : !progress.edited ? (
        <>
            Click the date in the middle paragraph, change 14 to 15 and press <b>Done</b>.
        </>
    ) : !progress.found && !progress.tools ? (
        <>
            Now press <span className="ep-kbd-icon">⌕</span> to replace “14 March” on the whole page, or erase the certificate number.
        </>
    ) : !progress.downloaded ? (
        <>
            Try Erase, Highlight or Sign too, then press <b>Download PDF</b> to see what’s inside the file.
        </>
    ) : (
        <>Undo, redo, or start again whenever you like.</>
    );

    return (
        <DemoFrame id="try-it" title="Edit this certificate" tip={tip} onRestart={reset} caption="A working copy of the Panna editor on a practice certificate. Nothing on this page is uploaded or saved.">
            {() => (
                <MacWindow url="pdf.testoza.com/edit-pdf">
                    <div ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown} className="relative flex h-full flex-col bg-slate-100 font-[Outfit,system-ui,sans-serif] outline-none">
                        <TopBarReplica
                            bp={bp}
                            fileName={fileName}
                            onFileName={setFileName}
                            changes={changes}
                            zoom={s / CSS_UNITS}
                            onZoom={(z) => setZoom(Math.min(5, Math.max(0.25, z)) * CSS_UNITS)}
                            onFit={() => setZoom(null)}
                            fit={zoom === null}
                            canUndo={hist.past.length > 0}
                            canRedo={hist.future.length > 0}
                            onUndo={undo}
                            onRedo={redo}
                            onFind={() => setFindOpen((o) => !o)}
                            onDownload={download}
                            exporting={exporting}
                            panelOpen={panelOpen}
                            onPanel={() => setPanel(!panelOpen)}
                        />
                        <ToolBarReplica
                            bp={bp}
                            tool={tool}
                            onTool={(t) => {
                                if (draftRef.current) finishDraft('none');
                                setTool(t);
                                setSelected(null);
                            }}
                            onImage={() => placeArt('logo')}
                            onSign={() => placeArt('sign')}
                            draw={draw}
                            onDraw={(p) => setDraw((d) => ({ ...d, ...p }))}
                            text={textDefaults}
                            onText={(p) => setTextDefaults((d) => ({ ...d, ...p }))}
                            scale={s}
                        />

                        <div className="relative flex min-h-0 flex-1">
                            {panelOpen && (
                                <aside className="block w-[152px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
                                    <nav aria-label="Pages" className="flex flex-col gap-3 px-3 py-4">
                                        <div className="group relative flex flex-col items-center">
                                            <button type="button" aria-label="Go to page 1" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="overflow-hidden rounded-md shadow-sm ring-2 ring-emerald-500 ring-offset-2 transition">
                                                <Paper scale={116 / PAGE_W} edits={{}} shadow={false} />
                                            </button>
                                            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                1{edited && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Edited" />}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toast({ kind: 'info', title: 'Pages work in the real editor', desc: 'Reorder, rotate, duplicate, insert a blank page or delete one from these thumbnails.' })}
                                            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
                                        >
                                            <FilePlus2 className="h-3.5 w-3.5" /> Blank page
                                        </button>
                                    </nav>
                                </aside>
                            )}
                            <main
                                ref={scrollRef as RefObject<HTMLElement>}
                                className="relative min-w-0 flex-1 overflow-auto overscroll-contain"
                                aria-label="Document"
                                onPointerDown={(e) => {
                                    // A click on empty space deselects.
                                    if (tool === 'edit' && !(e.target as HTMLElement).closest('button, [role="button"], [data-obj], [data-editor], [data-editor-bar]')) setSelected(null);
                                }}
                            >
                                <div className={`mx-auto flex w-max min-w-full flex-col items-center gap-5 py-5 ${bp >= 1 ? 'px-6' : 'px-2'}`}>
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div ref={paperRef} className="relative">
                                            <Paper
                                                scale={s}
                                                edits={edits}
                                                hideId={draft?.id}
                                                onOpen={tool === 'edit' ? openBlock : undefined}
                                                selectedId={tool === 'edit' && !draft ? (selBlock?.id ?? null) : null}
                                                onFrameDown={startBlockDrag}
                                                matches={findOpen ? matches.map((m, i) => ({ ...m, active: i === active })) : []}
                                            >
                                                {/* Added objects */}
                                                <div className="absolute inset-0" style={{ zIndex: 20, pointerEvents: 'none' }}>
                                                    {objs.map((o) => {
                                                        const interactive = tool === 'edit' && !draft;
                                                        if (o.kind === 'whiteout')
                                                            return (
                                                                <div
                                                                    key={o.id}
                                                                    data-obj
                                                                    onPointerDown={interactive ? (e) => startObjDrag(e, o) : undefined}
                                                                    className={interactive ? 'cursor-move' : ''}
                                                                    style={{ position: 'absolute', left: o.r.x0 * s, top: o.r.y0 * s, width: (o.r.x1 - o.r.x0) * s, height: (o.r.y1 - o.r.y0) * s, background: PAPER, pointerEvents: interactive ? 'auto' : 'none', touchAction: 'none' }}
                                                                />
                                                            );
                                                        if (o.kind === 'highlight')
                                                            return o.rects.map((r, i) => (
                                                                <div
                                                                    key={`${o.id}-${i}`}
                                                                    data-obj
                                                                    onPointerDown={interactive ? (e) => startObjDrag(e, o) : undefined}
                                                                    style={{ position: 'absolute', left: r.x0 * s, top: r.y0 * s, width: (r.x1 - r.x0) * s, height: (r.y1 - r.y0) * s, background: rgba(o.color, 0.45), mixBlendMode: 'multiply', pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'move' : undefined, touchAction: 'none' }}
                                                                />
                                                            ));
                                                        if (o.kind === 'art')
                                                            return (
                                                                <div
                                                                    key={o.id}
                                                                    data-obj
                                                                    onPointerDown={interactive ? (e) => startObjDrag(e, o) : undefined}
                                                                    className={interactive ? 'cursor-move' : ''}
                                                                    style={{ position: 'absolute', left: o.r.x0 * s, top: o.r.y0 * s, width: (o.r.x1 - o.r.x0) * s, height: (o.r.y1 - o.r.y0) * s, pointerEvents: interactive ? 'auto' : 'none', touchAction: 'none' }}
                                                                >
                                                                    <Art art={o.art} />
                                                                </div>
                                                            );
                                                        if (o.kind === 'text')
                                                            return (
                                                                <div key={o.id} data-obj>
                                                                    <TextObject
                                                                        o={o}
                                                                        s={s}
                                                                        bp={bp}
                                                                        editing={editingObj === o.id}
                                                                        selected={selected?.kind === 'obj' && selected.id === o.id}
                                                                        interactive={interactive}
                                                                        onDown={(e) => startObjDrag(e, o)}
                                                                        onChange={(p) => updateObj(o.id, p)}
                                                                        onDone={finishObj}
                                                                        onDelete={() => removeObj(o.id)}
                                                                        paper={paperRef}
                                                                        scroller={scrollRef}
                                                                    />
                                                                </div>
                                                            );
                                                        return null;
                                                    })}
                                                    <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: 'none' }}>
                                                        {objs.map((o) => (o.kind === 'shape' || o.kind === 'ink' ? <ShapeSvg key={o.id} o={o} s={s} interactive={tool === 'edit' && !draft} onDown={(e) => startObjDrag(e, o)} /> : null))}
                                                    </svg>
                                                    {selObj && selObj.kind !== 'text' && tool === 'edit' && (
                                                        <>
                                                            <div
                                                                className="absolute rounded-sm ring-2 ring-emerald-500"
                                                                style={{ left: bbox(selObj).x0 * s, top: bbox(selObj).y0 * s, width: (bbox(selObj).x1 - bbox(selObj).x0) * s, height: (bbox(selObj).y1 - bbox(selObj).y0) * s, pointerEvents: 'none' }}
                                                            />
                                                            <div
                                                                className="absolute"
                                                                data-obj
                                                                style={{ left: bbox(selObj).x0 * s, top: bbox(selObj).y0 * s > 56 ? bbox(selObj).y0 * s - 50 : bbox(selObj).y1 * s + 8, pointerEvents: 'auto', zIndex: 40 }}
                                                            >
                                                                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]" onPointerDown={(e) => e.stopPropagation()}>
                                                                    <IconButton label="Delete" danger onClick={() => removeObj(selObj.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </IconButton>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Drag tools */}
                                                {tool !== 'edit' && (
                                                    <div className="absolute inset-0" style={{ zIndex: 25, cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }} onPointerDown={onToolDown}>
                                                        {toolDrag &&
                                                            tool !== 'draw' &&
                                                            (tool === 'line' || tool === 'arrow' ? (
                                                                <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                                                                    <line x1={toolDrag.a[0] * s} y1={toolDrag.a[1] * s} x2={toolDrag.b[0] * s} y2={toolDrag.b[1] * s} stroke={rgbCss(draw.stroke)} strokeWidth={Math.max(1, draw.width * s)} strokeLinecap="round" />
                                                                </svg>
                                                            ) : (
                                                                <div
                                                                    className="pointer-events-none absolute"
                                                                    style={{
                                                                        left: Math.min(toolDrag.a[0], toolDrag.b[0]) * s,
                                                                        top: Math.min(toolDrag.a[1], toolDrag.b[1]) * s,
                                                                        width: Math.abs(toolDrag.b[0] - toolDrag.a[0]) * s,
                                                                        height: Math.abs(toolDrag.b[1] - toolDrag.a[1]) * s,
                                                                        ...(tool === 'erase'
                                                                            ? { border: '1.5px dashed rgb(220 38 38)', background: 'rgba(220,38,38,0.06)' }
                                                                            : tool === 'whiteout'
                                                                              ? { background: 'rgba(255,255,255,0.92)', border: '1px solid rgb(148 163 184)' }
                                                                              : tool === 'highlight'
                                                                                ? { background: rgba(draw.highlight, 0.45), mixBlendMode: 'multiply' as const }
                                                                                : { border: `${Math.max(1, draw.width * s)}px solid ${rgbCss(draw.stroke)}`, borderRadius: tool === 'ellipse' ? '50%' : undefined, background: draw.fill ? 'rgb(237 242 255)' : undefined }),
                                                                    }}
                                                                />
                                                            ))}
                                                        {toolDrag && tool === 'draw' && toolDrag.pts.length > 1 && (
                                                            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                                                                <polyline points={toolDrag.pts.map((p) => `${p[0] * s},${p[1] * s}`).join(' ')} fill="none" stroke={rgbCss(draw.stroke)} strokeWidth={Math.max(1, draw.width * s)} strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                )}

                                                {draft && (
                                                    <BlockEditor
                                                        bp={bp}
                                                        s={s}
                                                        draft={draft}
                                                        setDraft={(fn) => setDraft((d) => (d ? fn(d) : d))}
                                                        canRevert={!!doc.blocks[draft.id]}
                                                        onCommit={() => finishDraft('select')}
                                                        onCancel={() => {
                                                            setDraft(null);
                                                            setSelected(null);
                                                        }}
                                                        onTab={tabFrom}
                                                        onDelete={() => {
                                                            const id = draft.id;
                                                            commit((d) => ({ ...d, blocks: { ...d.blocks, [id]: { text: '' } } }));
                                                            setDraft(null);
                                                            setProgress((p) => ({ ...p, edited: true }));
                                                        }}
                                                        onRevert={() => {
                                                            const id = draft.id;
                                                            commit((d) => {
                                                                const blocks = { ...d.blocks };
                                                                delete blocks[id];
                                                                return { ...d, blocks };
                                                            });
                                                            setDraft(null);
                                                        }}
                                                        paper={paperRef}
                                                        scroller={scrollRef}
                                                        editorRef={editorRef}
                                                    />
                                                )}
                                            </Paper>
                                        </div>
                                        <span className="select-none text-[11px] font-medium text-slate-500">1 / 1</span>
                                    </div>
                                </div>
                            </main>

                            {findOpen && (
                                <div className="absolute right-3 top-3 z-50 max-w-[calc(100%-24px)]">
                                    <FindPanelReplica
                                        query={query}
                                        setQuery={(v) => {
                                            setQuery(v);
                                            setActiveMatch(0);
                                        }}
                                        replace={replaceWith}
                                        setReplace={setReplaceWith}
                                        matchCase={matchCase}
                                        setMatchCase={setMatchCase}
                                        whole={whole}
                                        setWhole={setWhole}
                                        total={matches.length}
                                        active={active}
                                        go={(i) => {
                                            const n = matches.length;
                                            if (n) setActiveMatch(((i % n) + n) % n);
                                        }}
                                        onOne={() => {
                                            const m = matches[active];
                                            if (m) applyReplace([m]);
                                        }}
                                        onAll={() => {
                                            const n = applyReplace(matches);
                                            toast({ kind: 'success', title: `Replaced ${n} ${n === 1 ? 'match' : 'matches'}` }, 2600);
                                        }}
                                        onClose={() => setFindOpen(false)}
                                    />
                                </div>
                            )}

                            {selBlock && tool === 'edit' && !draft && (
                                <SelectionBarReplica
                                    bp={bp}
                                    text={visibleText(selBlock, doc.blocks[selBlock.id])}
                                    atTop={selAtTop}
                                    onEdit={() => openBlock(selBlock.id)}
                                    onNudge={(dx, dy, big) => nudge(selBlock.id, dx * (big ? 10 : 1), dy * (big ? 10 : 1))}
                                    moved={!!(doc.blocks[selBlock.id]?.dx || doc.blocks[selBlock.id]?.dy)}
                                    onBack={() =>
                                        commit((d) => {
                                            const e = { ...d.blocks[selBlock.id], dx: undefined, dy: undefined };
                                            return { ...d, blocks: { ...d.blocks, [selBlock.id]: e } };
                                        })
                                    }
                                />
                            )}
                            {bp < 2 && <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-medium text-white">Page 1 / 1</div>}
                        </div>

                        {/* sonner, top-center */}
                        <div className="ep-toasts" aria-live="polite">
                            {toasts.map((t) =>
                                t.kind === 'download' ? (
                                    <DownloadToast key={t.id} onClose={() => setToasts((l) => l.filter((x) => x.id !== t.id))} />
                                ) : (
                                    <div key={t.id} className={`ep-toast ${t.kind === 'info' ? 'ep-toast--info' : ''}`} role="status">
                                        {t.kind === 'info' ? <Info className="ep-toast-icon" aria-hidden="true" /> : <CheckCircle2 className="ep-toast-icon" aria-hidden="true" />}
                                        <div className="ep-toast-text">
                                            <b>{t.title}</b>
                                            {t.desc && <span>{t.desc}</span>}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>

                        {sheet && <FileSheet doc={doc} onClose={() => setSheet(false)} />}
                    </div>
                </MacWindow>
            )}
        </DemoFrame>
    );
}
