/**
 * Draws the practice certificate (certificate.ts) at a given scale, with any edits
 * applied: changed text (letters missing from the embedded subset drawn in the
 * fallback font, as Panna does), erased words (removed, leaving their space, so
 * nothing else moves), formatting, moves and wrap widths. Used by the playable
 * editor, the hero phone and the page thumbnail.
 */
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Move } from 'lucide-react';
import { BLOCKS, DOC_FONTS, FALLBACK_CSS, FAMILIES, PAGE_H, PAGE_W, PAPER, SUBSETS, rgbCss, type Block, type FontKey } from './certificate';
import type { Fmt } from './chrome';

export interface BlockEdit {
    text?: string;
    /** Indexes (in tokens(text)) of erased words. */
    erased?: number[];
    fmt?: Partial<Fmt>;
    dx?: number;
    dy?: number;
    width?: number;
}
export type DocEdits = Record<string, BlockEdit>;

export interface Match {
    blockId: string;
    start: number;
    end: number;
}

/** Words and the spaces between them, as separate tokens. */
export const tokens = (text: string) => text.split(/(\s+)/).filter((t) => t.length);

export const textOf = (b: Block, e?: BlockEdit) => e?.text ?? b.text;

/** The text a PDF reader would find in the block: erased words are gone. */
export function visibleText(b: Block, e?: BlockEdit): string {
    const er = new Set(e?.erased ?? []);
    return tokens(textOf(b, e))
        .map((t, i) => (er.has(i) ? '' : t))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

export function fmtOf(b: Block, e?: BlockEdit): Fmt {
    const f = DOC_FONTS[b.font];
    return {
        family: e?.fmt?.family ?? 'original',
        size: e?.fmt?.size ?? b.size,
        color: e?.fmt?.color ?? b.color,
        bold: e?.fmt?.bold ?? f.weight === 700,
        italic: e?.fmt?.italic ?? f.italic,
        align: e?.fmt?.align ?? b.align,
    };
}

/** Which embedded font the block uses once formatted (bold/italic pick the matching subset). */
export const subsetKey = (f: Fmt): FontKey => (f.bold ? 'bold' : f.italic ? 'italic' : 'regular');

export const familyCss = (b: Block, f: Fmt) => (f.family === 'original' ? DOC_FONTS[b.font].css : (FAMILIES.find((x) => x.id === f.family)?.css ?? FAMILIES[0].css));

export const isEdited = (b: Block, e?: BlockEdit) => !!e && ((e.text !== undefined && e.text !== b.text) || !!e.erased?.length || !!e.fmt || !!e.dx || !!e.dy || e.width !== undefined);

/** Position and type of a block on the page, in CSS pixels. */
export function blockStyle(b: Block, e: BlockEdit | undefined, s: number): CSSProperties {
    const f = fmtOf(b, e);
    const w = e?.width ?? b.width;
    const x = b.x + (e?.dx ?? 0);
    const top = b.top + (e?.dy ?? 0);
    const base: CSSProperties = {
        position: 'absolute',
        top: top * s,
        fontFamily: familyCss(b, f),
        fontWeight: f.bold ? 700 : 400,
        fontStyle: f.italic ? 'italic' : 'normal',
        fontSize: f.size * s,
        lineHeight: `${(b.lineHeight * f.size * s) / b.size}px`,
        letterSpacing: b.tracking ? `${b.tracking}em` : undefined,
        color: rgbCss(f.color),
        textAlign: f.align,
        fontKerning: 'normal',
    };
    if (w !== undefined) return { ...base, left: (b.align === 'center' ? x - w / 2 : x) * s, width: w * s, whiteSpace: 'pre-wrap' };
    return { ...base, left: x * s, transform: b.align === 'center' ? 'translateX(-50%)' : undefined, whiteSpace: 'pre' };
}

/** One token's characters, split where the font (subset or fallback) or a search match changes. */
function TokenText({ text, from, font, original, matches }: { text: string; from: number; font: FontKey; original: boolean; matches: { start: number; end: number; active: boolean }[] }) {
    const chars = Array.from(text);
    const out: ReactNode[] = [];
    let run = '';
    let runKey = '';
    let pos = from;
    const flush = (key: string) => {
        if (!run) return;
        const [miss, m] = key.split('|');
        const style: CSSProperties = {};
        if (miss === '1') style.fontFamily = FALLBACK_CSS;
        if (m !== '-') {
            style.background = m === 'a' ? 'rgba(16,185,129,0.38)' : 'rgba(250,204,21,0.38)';
            style.borderRadius = 2;
            if (m === 'a') style.outline = '2px solid rgb(5 150 105)';
        }
        out.push(
            <span key={out.length} style={style}>
                {run}
            </span>,
        );
        run = '';
    };
    for (const ch of chars) {
        const miss = original && ch.trim() && !SUBSETS[font].has(ch) ? '1' : '0';
        const hit = matches.find((m) => pos >= m.start && pos < m.end);
        const key = `${miss}|${hit ? (hit.active ? 'a' : 'm') : '-'}`;
        if (key !== runKey) {
            flush(runKey);
            runKey = key;
        }
        run += ch;
        pos += ch.length;
    }
    flush(runKey);
    return <>{out}</>;
}

export function BlockText({ b, e, matches = [] }: { b: Block; e?: BlockEdit; matches?: { start: number; end: number; active: boolean }[] }) {
    const f = fmtOf(b, e);
    const er = new Set(e?.erased ?? []);
    let at = 0;
    return (
        <>
            {tokens(textOf(b, e)).map((t, i) => {
                const from = at;
                at += t.length;
                return (
                    <span key={i} data-t={i} style={er.has(i) ? { visibility: 'hidden' } : undefined}>
                        <TokenText text={t} from={from} font={subsetKey(f)} original={f.family === 'original'} matches={matches} />
                    </span>
                );
            })}
        </>
    );
}

/** The certificate's printed artwork: borders, rules, the signature and the seal. */
export function PaperArt() {
    return (
        <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <rect x="16" y="16" width="810" height="563" fill="none" stroke="#14532d" strokeWidth="3" />
            <rect x="25" y="25" width="792" height="545" fill="none" stroke="#b59a4a" strokeWidth="0.9" />
            {[
                [25, 25],
                [817, 25],
                [25, 570],
                [817, 570],
            ].map(([cx, cy]) => (
                <path key={`${cx}-${cy}`} d={`M${cx} ${cy - 7}L${cx + 7} ${cy}L${cx} ${cy + 7}L${cx - 7} ${cy}Z`} fill="#b59a4a" />
            ))}
            <line x1="281" y1="196" x2="561" y2="196" stroke="#b59a4a" strokeWidth="0.9" />
            <line x1="140" y1="466" x2="280" y2="466" stroke="#334155" strokeWidth="0.7" />
            <line x1="562" y1="466" x2="702" y2="466" stroke="#334155" strokeWidth="0.7" />
            {/* The principal's signature */}
            <path
                d="M152 456 C 158 432, 172 426, 169 444 S 158 463, 177 452 C 186 446, 190 438, 195 449 C 198 457, 204 453, 209 446 C 214 440, 219 449, 224 452 C 231 456, 238 440, 245 444 C 251 448, 255 453, 268 444"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* School seal */}
            <g transform="translate(421 474)">
                <circle r="40" fill="#0f766e" fillOpacity="0.07" stroke="#0f766e" strokeWidth="1.6" />
                <circle r="33" fill="none" stroke="#0f766e" strokeWidth="0.7" strokeDasharray="2 2.4" />
                <path d="M0 -17 L5 -6 L17 -5 L8 3 L10.5 15 L0 9 L-10.5 15 L-8 3 L-17 -5 L-5 -6 Z" fill="#0f766e" fillOpacity="0.85" />
            </g>
        </svg>
    );
}

export interface PaperProps {
    scale: number;
    edits: DocEdits;
    /** The block being edited: its text is hidden under the text box. */
    hideId?: string | null;
    /** Edit-text tool: blocks get hover rings and open on click. */
    onOpen?: (id: string) => void;
    selectedId?: string | null;
    onFrameDown?: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
    onFrameClick?: (id: string) => void;
    matches?: (Match & { active: boolean })[];
    children?: ReactNode;
    className?: string;
    shadow?: boolean;
}

export default function Paper({ scale: s, edits, hideId, onOpen, selectedId, onFrameDown, onFrameClick, matches = [], children, className = '', shadow = true }: PaperProps) {
    return (
        <div
            className={`relative bg-white ${shadow ? 'shadow-[0_1px_3px_rgba(15,23,42,0.12),0_8px_24px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5' : ''} ${className}`}
            style={{ width: PAGE_W * s, height: PAGE_H * s, background: PAPER }}
            data-paper
        >
            <PaperArt />
            {BLOCKS.map((b) => {
                const e = edits[b.id];
                if (e?.text === '') return null;
                const edited = isEdited(b, e);
                const ms = matches.filter((m) => m.blockId === b.id);
                return (
                    <div key={b.id} data-block={b.id} style={{ ...blockStyle(b, e, s), visibility: hideId === b.id ? 'hidden' : undefined }}>
                        <BlockText b={b} e={e} matches={ms} />
                        {onOpen && selectedId !== b.id && (
                            <button
                                type="button"
                                onClick={() => onOpen(b.id)}
                                title="Click to edit · drag to move"
                                aria-label={`Edit text: ${visibleText(b, e).slice(0, 60)}`}
                                className={`group absolute cursor-text rounded-[2px] outline-none transition-colors ${
                                    edited ? 'bg-emerald-400/[0.07] ring-1 ring-emerald-500/40' : ''
                                } hover:bg-emerald-400/10 hover:ring-1 hover:ring-emerald-500/70 focus-visible:ring-2 focus-visible:ring-emerald-500`}
                                style={{ inset: '-1px -2px', font: 'inherit', letterSpacing: 'normal' }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute right-full top-1/2 hidden h-5 w-5 -translate-y-1/2 cursor-move items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-white group-hover:flex"
                                >
                                    <Move className="h-3 w-3" />
                                </span>
                            </button>
                        )}
                        {selectedId === b.id && (
                            <div
                                data-selected-frame
                                role="button"
                                tabIndex={-1}
                                aria-label={`Selected text: ${visibleText(b, e).slice(0, 60)} — drag to move, click to edit`}
                                title="Drag to move · click to edit"
                                onPointerDown={(ev) => onFrameDown?.(ev, b.id)}
                                onClick={() => onFrameClick?.(b.id)}
                                className="absolute cursor-move rounded-[2px] ring-2 ring-emerald-500"
                                style={{ inset: '-1px -2px', zIndex: 20, touchAction: 'none' }}
                            />
                        )}
                    </div>
                );
            })}
            {children}
        </div>
    );
}
