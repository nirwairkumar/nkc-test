/**
 * Serializable edit model. Edits reference pages by their key in the ORIGINAL
 * document and existing text by block id, so the same list can be replayed on
 * a single-page preview copy and on the full document at export time.
 */
import type { Align } from './layout';
import type { Rect } from './matrix';

export type RGB = [number, number, number];

/** Page identity: `p<index>` for pages of the original file, the slot key for inserted blank pages. */
export type PageKey = string;

export const pageKeyOf = (index: number): PageKey => `p${index}`;
export const pageIndexOf = (key: PageKey): number => (/^p\d+$/.test(key) ? Number(key.slice(1)) : -1);

/**
 * Font family ids offered in the UI:
 *  'original' — keep the text's own embedded fonts (default)
 *  'helvetica' | 'times' | 'courier' — PDF standard fonts (no embedding needed)
 *  'noto-sans' | 'noto-serif' | 'noto-devanagari' — embedded Unicode fonts
 *  `doc:<ref>` — another font already used in this document
 */
export type FamilyId = string;

export interface TextEdit {
    kind: 'text';
    id: string;
    page: PageKey;
    blockId: string;
    /** Full new text of the block. Soft wraps are spaces; '\n' is a hard line break. '' deletes. */
    text: string;
    family?: FamilyId;
    /** New effective size in page units. */
    size?: number;
    color?: RGB;
    bold?: boolean;
    italic?: boolean;
    align?: Align;
    /** Move offset in page units. */
    dx?: number;
    dy?: number;
    /**
     * Width of the text's box in page units; the text wraps inside it. The box
     * keeps the edge (or centre) the original text was aligned to.
     */
    width?: number;
}

export interface AddTextEdit {
    kind: 'add-text';
    id: string;
    page: PageKey;
    /** Baseline start of the first line, page space. */
    x: number;
    y: number;
    /** Baseline direction (radians, page space) — keeps text upright on rotated pages. */
    angle: number;
    text: string;
    family: FamilyId;
    size: number;
    color: RGB;
    bold: boolean;
    italic: boolean;
    align: Align;
    /** Wrap width in page units (0 = no wrapping). */
    width: number;
    /** Line height as a multiple of size. */
    lineHeight: number;
}

export interface EraseEdit {
    kind: 'erase';
    id: string;
    page: PageKey;
    rects: Rect[];
    /** Remove text glyphs inside the rects from the content (true removal). */
    text: boolean;
    /** Paint over the area as well (white-out) with this colour; null = don't cover. */
    cover: RGB | null;
}

export interface HighlightEdit {
    kind: 'highlight';
    id: string;
    page: PageKey;
    rects: Rect[];
    color: RGB;
    opacity: number;
}

export interface InkEdit {
    kind: 'ink';
    id: string;
    page: PageKey;
    paths: [number, number][][];
    color: RGB;
    width: number;
    opacity: number;
}

export interface ShapeEdit {
    kind: 'shape';
    id: string;
    page: PageKey;
    shape: 'rect' | 'ellipse' | 'line' | 'arrow';
    /** For line/arrow: from (x0,y0) to (x1,y1), not normalised. */
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    stroke: RGB | null;
    fill: RGB | null;
    width: number;
    opacity: number;
}

export interface ImageEdit {
    kind: 'image';
    id: string;
    page: PageKey;
    rect: Rect;
    /** Key into the session's image store. */
    imageId: string;
    /** Clockwise quarter turns of the image inside rect. */
    rotation?: number;
    opacity?: number;
}

export type PageEdit = TextEdit | AddTextEdit | EraseEdit | HighlightEdit | InkEdit | ShapeEdit | ImageEdit;

/** Page arrangement for export: order, rotation and inserted blank pages. */
export interface PageSlot {
    /** Original page index, or -1 for an inserted blank page. */
    src: number;
    /** Extra clockwise rotation in degrees (multiple of 90). */
    rotate: number;
    /** Size for blank pages (points). */
    size?: [number, number];
    /** Unique id: UI key, and the page key of an inserted blank page. */
    key: string;
}

export interface StoredImage {
    bytes: Uint8Array;
    mime: 'image/png' | 'image/jpeg';
    width: number;
    height: number;
}

/** Edits that change page content itself (baked into the preview render). */
export const isBaked = (e: PageEdit) => e.kind === 'text' || e.kind === 'erase';

/** Content edits first, then overlay objects in creation order — matches what the editor shows. */
export const applyOrder = (edits: PageEdit[]) => [...edits.filter(isBaked), ...edits.filter((e) => !isBaked(e))];
