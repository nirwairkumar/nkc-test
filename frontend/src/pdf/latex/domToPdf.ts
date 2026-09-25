/**
 * Vector PDF export of a rendered document (Markdown + KaTeX).
 *
 * Instead of a screenshot (blurry, unselectable) or the print dialog (extra
 * steps, different in every browser), we read the browser's own layout —
 * where every word, rule, background, KaTeX SVG and image ended up — and
 * redraw it with pdf-lib in the very same font files (KaTeX's TTFs, Noto).
 * Words are shaped by the PDF editor's engine, so kerning, ligatures and Hindi
 * conjuncts match the preview, and the text stays selectable and searchable.
 */
import {
    PDFDocument,
    PDFHexString,
    PDFName,
    PDFString,
    clip,
    concatTransformationMatrix,
    drawSvgPath,
    endPath,
    popGraphicsState,
    pushGraphicsState,
    rectangle,
    rgb,
    type PDFDict,
    type PDFOperator,
    type PDFPage,
    type PDFRef,
} from 'pdf-lib';
import { emitGlyphs } from '../engine/emit';
import { CustomFace, FaceRegistry, notoId, type Face, type ShapedGlyph } from '../engine/faces';
import type { Color } from '../engine/interpreter';
import { encodeLatin1 } from '../engine/lexer';
import type { PlannedGlyph } from '../engine/planner';
import { NOT_PAINTED, PT_PER_PX, docFrame, measurePages, pageIndexAt, type PageSetup } from './paging';

import KaTeX_AMS_Regular from 'katex/dist/fonts/KaTeX_AMS-Regular.ttf?url';
import KaTeX_Caligraphic_Bold from 'katex/dist/fonts/KaTeX_Caligraphic-Bold.ttf?url';
import KaTeX_Caligraphic_Regular from 'katex/dist/fonts/KaTeX_Caligraphic-Regular.ttf?url';
import KaTeX_Fraktur_Bold from 'katex/dist/fonts/KaTeX_Fraktur-Bold.ttf?url';
import KaTeX_Fraktur_Regular from 'katex/dist/fonts/KaTeX_Fraktur-Regular.ttf?url';
import KaTeX_Main_Bold from 'katex/dist/fonts/KaTeX_Main-Bold.ttf?url';
import KaTeX_Main_BoldItalic from 'katex/dist/fonts/KaTeX_Main-BoldItalic.ttf?url';
import KaTeX_Main_Italic from 'katex/dist/fonts/KaTeX_Main-Italic.ttf?url';
import KaTeX_Main_Regular from 'katex/dist/fonts/KaTeX_Main-Regular.ttf?url';
import KaTeX_Math_BoldItalic from 'katex/dist/fonts/KaTeX_Math-BoldItalic.ttf?url';
import KaTeX_Math_Italic from 'katex/dist/fonts/KaTeX_Math-Italic.ttf?url';
import KaTeX_SansSerif_Bold from 'katex/dist/fonts/KaTeX_SansSerif-Bold.ttf?url';
import KaTeX_SansSerif_Italic from 'katex/dist/fonts/KaTeX_SansSerif-Italic.ttf?url';
import KaTeX_SansSerif_Regular from 'katex/dist/fonts/KaTeX_SansSerif-Regular.ttf?url';
import KaTeX_Script_Regular from 'katex/dist/fonts/KaTeX_Script-Regular.ttf?url';
import KaTeX_Size1_Regular from 'katex/dist/fonts/KaTeX_Size1-Regular.ttf?url';
import KaTeX_Size2_Regular from 'katex/dist/fonts/KaTeX_Size2-Regular.ttf?url';
import KaTeX_Size3_Regular from 'katex/dist/fonts/KaTeX_Size3-Regular.ttf?url';
import KaTeX_Size4_Regular from 'katex/dist/fonts/KaTeX_Size4-Regular.ttf?url';
import KaTeX_Typewriter_Regular from 'katex/dist/fonts/KaTeX_Typewriter-Regular.ttf?url';

const KATEX: Record<string, string> = {
    'AMS-Regular': KaTeX_AMS_Regular,
    'Caligraphic-Bold': KaTeX_Caligraphic_Bold,
    'Caligraphic-Regular': KaTeX_Caligraphic_Regular,
    'Fraktur-Bold': KaTeX_Fraktur_Bold,
    'Fraktur-Regular': KaTeX_Fraktur_Regular,
    'Main-Bold': KaTeX_Main_Bold,
    'Main-BoldItalic': KaTeX_Main_BoldItalic,
    'Main-Italic': KaTeX_Main_Italic,
    'Main-Regular': KaTeX_Main_Regular,
    'Math-BoldItalic': KaTeX_Math_BoldItalic,
    'Math-Italic': KaTeX_Math_Italic,
    'SansSerif-Bold': KaTeX_SansSerif_Bold,
    'SansSerif-Italic': KaTeX_SansSerif_Italic,
    'SansSerif-Regular': KaTeX_SansSerif_Regular,
    'Script-Regular': KaTeX_Script_Regular,
    'Size1-Regular': KaTeX_Size1_Regular,
    'Size2-Regular': KaTeX_Size2_Regular,
    'Size3-Regular': KaTeX_Size3_Regular,
    'Size4-Regular': KaTeX_Size4_Regular,
    'Typewriter-Regular': KaTeX_Typewriter_Regular,
};

export interface ExportOptions extends PageSetup {
    title?: string;
    pageNumbers: boolean;
    /** Font of the page numbers. */
    family: 'serif' | 'sans';
}

// ---------------------------------------------------------------------------
// What the browser painted, in document CSS px

type RGBA = [number, number, number, number];

interface Box {
    x: number;
    top: number;
    bottom: number;
    w: number;
}
interface TextRun {
    text: string;
    x: number;
    top: number;
    baseline: number;
    sizePx: number;
    families: string[];
    bold: boolean;
    italic: boolean;
    color: RGBA;
    css: string;
}
interface Fill extends Box {
    color: RGBA;
}
interface Rounded extends Box {
    radius: number;
    fill: RGBA | null;
    border: { w: number; color: RGBA } | null;
}
interface SvgPaint {
    d: string;
    fill: RGBA | null;
    stroke: RGBA | null;
    strokeWidth: number;
}
interface SvgItem {
    top: number;
    paths: SvgPaint[];
    /** SVG user unit (u,v) -> document px: x = ox + u*sx, y = oy + v*sy */
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    clip: Box;
}
interface Scene {
    texts: TextRun[];
    fills: Fill[];
    rounded: Rounded[];
    svgs: SvgItem[];
    images: (Box & { src: string })[];
    links: (Box & { href: string })[];
    checks: (Box & { checked: boolean })[];
    headings: { title: string; level: number; top: number }[];
}

function parseColor(c: string): RGBA | null {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map((v) => parseFloat(v));
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
}
const shown = (c: RGBA | null): c is RGBA => !!c && c[3] > 0.02;
/** Text colours with transparency are flattened onto the white page. */
const onWhite = (c: RGBA): Color => ({ space: 'rgb', c: [0, 1, 2].map((i) => 1 - c[3] * (1 - c[i])) });
const pdfRgb = (c: RGBA) => rgb(c[0], c[1], c[2]);
const alpha = (c: RGBA) => (c[3] < 0.999 ? c[3] : undefined);
const familyList = (css: string) =>
    css
        .split(',')
        .map((f) => f.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);

let measureCtx: CanvasRenderingContext2D | null = null;
const ascentCache = new Map<string, number>();
/** Ascent (px) the browser uses for a CSS font: text rect top + ascent = baseline. */
function ascentOf(css: string, sizePx: number): number {
    let a = ascentCache.get(css);
    if (a === undefined) {
        measureCtx ??= document.createElement('canvas').getContext('2d');
        let asc = 0;
        if (measureCtx) {
            measureCtx.font = css;
            asc = measureCtx.measureText('Hg').fontBoundingBoxAscent;
        }
        a = asc > 0 ? asc / sizePx : 0.9;
        ascentCache.set(css, a);
    }
    return a * sizePx;
}

const cssFont = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)}px ${cs.fontFamily}`;

/** Heading text for bookmarks, with formulas given as their TeX source. */
function headingTitle(el: Element): string {
    const copy = el.cloneNode(true) as Element;
    copy.querySelectorAll('.katex').forEach((k) => k.replaceWith(k.querySelector('annotation')?.textContent ?? ''));
    copy.querySelectorAll('.md-marker').forEach((k) => k.remove());
    return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function collect(root: HTMLElement): Scene {
    const { X, Y, k } = docFrame(root);
    const scene: Scene = { texts: [], fills: [], rounded: [], svgs: [], images: [], links: [], checks: [], headings: [] };
    const styles = new Map<Element, CSSStyleDeclaration>();
    const style = (el: Element) => {
        let s = styles.get(el);
        if (!s) styles.set(el, (s = getComputedStyle(el)));
        return s;
    };
    const box = (r: DOMRect): Box => ({ x: X(r.left), top: Y(r.top), bottom: Y(r.bottom), w: r.width / k });
    const range = document.createRange();

    const addText = (text: string, r: DOMRect, cs: CSSStyleDeclaration, color: RGBA) => {
        const sizePx = parseFloat(cs.fontSize);
        const css = cssFont(cs);
        const top = Y(r.top);
        scene.texts.push({
            text,
            x: X(r.left),
            top,
            baseline: top + ascentOf(css, sizePx),
            sizePx,
            families: familyList(cs.fontFamily),
            bold: parseInt(cs.fontWeight, 10) >= 600,
            italic: cs.fontStyle !== 'normal',
            color,
            css,
        });
    };

    const words = (node: Text) => {
        const parent = node.parentElement;
        if (!parent || !node.data.trim()) return;
        const cs = style(parent);
        if (cs.visibility !== 'visible') return;
        const color = parseColor(cs.color) ?? [0, 0, 0, 1];
        if (!shown(color)) return; // \phantom
        const re = /\S+/g;
        for (let m = re.exec(node.data); m; m = re.exec(node.data)) {
            const word = m[0];
            range.setStart(node, m.index);
            range.setEnd(node, m.index + word.length);
            const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
            const pieces: { text: string; r: DOMRect }[] = [];
            if (rects.length === 1) pieces.push({ text: word, r: rects[0] });
            else if (rects.length > 1) {
                // A long word wrapped (overflow-wrap): one piece per line.
                let i = 0;
                for (const ch of Array.from(word)) {
                    range.setStart(node, m.index + i);
                    range.setEnd(node, m.index + i + ch.length);
                    i += ch.length;
                    const cr = range.getClientRects()[0];
                    const last = pieces[pieces.length - 1];
                    if (last && (!cr || Math.abs(cr.top - last.r.top) < 2)) last.text += ch;
                    else if (cr) pieces.push({ text: ch, r: cr });
                }
            }
            for (const p of pieces) {
                const text = p.text.replace(/[​⁠﻿]/g, '');
                if (text) addText(text, p.r, cs, color);
            }
        }
    };

    const paintBox = (el: HTMLElement, cs: CSSStyleDeclaration) => {
        const bg = parseColor(cs.backgroundColor);
        const side = (s: 'top' | 'right' | 'bottom' | 'left') => {
            const w = parseFloat(cs.getPropertyValue(`border-${s}-width`));
            const st = cs.getPropertyValue(`border-${s}-style`);
            const c = parseColor(cs.getPropertyValue(`border-${s}-color`));
            return w > 0 && st !== 'none' && st !== 'hidden' && shown(c) ? { w, color: c } : null;
        };
        const sides = [side('top'), side('right'), side('bottom'), side('left')];
        if (!shown(bg) && !sides.some(Boolean)) return;
        const [t, r, b, l] = sides;
        const inline = cs.display === 'inline';
        const rects = inline ? Array.from(el.getClientRects()) : [el.getBoundingClientRect()];
        const radius = parseFloat(cs.borderTopLeftRadius) || 0;
        const uniform = sides.every((s) => !s) || sides.every((s) => s && t && s.w === t.w && s.color.join() === t.color.join());
        const table = el.closest('table');
        // Collapsed table borders are shared by neighbouring cells and centred on the cell edge.
        const c = (el.tagName === 'TD' || el.tagName === 'TH') && table && style(table).borderCollapse === 'collapse' ? 0.5 : 0;
        for (const rc of rects) {
            if (rc.width <= 0 || rc.height <= 0) continue;
            const bx = box(rc);
            if (radius > 0.5 && uniform && !c) {
                scene.rounded.push({ ...bx, radius, fill: shown(bg) ? bg : null, border: t });
                continue;
            }
            if (shown(bg)) scene.fills.push({ ...bx, color: bg });
            const lw = l?.w ?? 0;
            const rw = r?.w ?? 0;
            if (t) scene.fills.push({ x: bx.x - c * lw, w: bx.w + c * (lw + rw), top: bx.top - c * t.w, bottom: bx.top + (1 - c) * t.w, color: t.color });
            if (b) scene.fills.push({ x: bx.x - c * lw, w: bx.w + c * (lw + rw), top: bx.bottom - (1 - c) * b.w, bottom: bx.bottom + c * b.w, color: b.color });
            if (l) scene.fills.push({ x: bx.x - c * l.w, w: l.w, top: bx.top, bottom: bx.bottom, color: l.color });
            if (r) scene.fills.push({ x: bx.x + bx.w - (1 - c) * r.w, w: r.w, top: bx.top, bottom: bx.bottom, color: r.color });
        }
    };

    /** Underline / strike-through of links, <u>, <del>: one line per line box. */
    const decorations = (el: HTMLElement, cs: CSSStyleDeclaration) => {
        const line = cs.textDecorationLine;
        if (!line || line === 'none') return;
        const color = parseColor(cs.textDecorationColor) ?? parseColor(cs.color);
        if (!shown(color)) return;
        const sizePx = parseFloat(cs.fontSize);
        const asc = ascentOf(cssFont(cs), sizePx);
        const thick = Math.max(0.6, sizePx * 0.055);
        for (const rc of Array.from(el.getClientRects())) {
            if (rc.width <= 0) continue;
            const bx = box(rc);
            const base = bx.top + asc;
            if (line.includes('underline')) scene.fills.push({ x: bx.x, w: bx.w, top: base + sizePx * 0.1, bottom: base + sizePx * 0.1 + thick, color });
            if (line.includes('line-through')) scene.fills.push({ x: bx.x, w: bx.w, top: base - sizePx * 0.3, bottom: base - sizePx * 0.3 + thick, color });
        }
    };

    let eqn = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
            n.nodeType === Node.ELEMENT_NODE && ((n as Element).matches(NOT_PAINTED) || n.nodeName.toLowerCase() === 'svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) {
            words(n as Text);
            continue;
        }
        const el = n as HTMLElement;
        const cs = style(el);
        if (cs.display === 'none' || el.hasAttribute('data-page-break')) continue;
        if (el instanceof HTMLImageElement) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) scene.images.push({ ...box(r), src: el.currentSrc || el.src });
            continue;
        }
        if (el instanceof HTMLInputElement) {
            if (el.type === 'checkbox') scene.checks.push({ ...box(el.getBoundingClientRect()), checked: el.checked });
            continue;
        }
        if (el instanceof HTMLAnchorElement && /^(https?|mailto):/i.test(el.href)) {
            for (const r of Array.from(el.getClientRects())) if (r.width > 0) scene.links.push({ ...box(r), href: el.href });
        }
        if (/^H[1-3]$/.test(el.tagName)) {
            const title = headingTitle(el);
            if (title) scene.headings.push({ title, level: +el.tagName[1], top: Y(el.getBoundingClientRect().top) });
        }
        // KaTeX numbers equations with a CSS counter in ::before, which is not in the DOM.
        if (el.classList.contains('eqn-num')) {
            eqn++;
            const r = el.getBoundingClientRect();
            if (r.width > 0) addText(`(${eqn})`, r, cs, parseColor(cs.color) ?? [0, 0, 0, 1]);
        }
        paintBox(el, cs);
        decorations(el, cs);
    }

    for (const svg of Array.from(root.querySelectorAll('svg'))) {
        if (svg.closest(NOT_PAINTED)) continue;
        const scs = style(svg);
        if (scs.display === 'none' || scs.visibility !== 'visible') continue;
        const r = svg.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const w = r.width / k;
        const h = r.height / k;
        const vb = svg.viewBox?.baseVal;
        const hasVb = !!vb && vb.width > 0 && vb.height > 0;
        const [vbx, vby, vbw, vbh] = hasVb ? [vb.x, vb.y, vb.width, vb.height] : [0, 0, w, h];
        let sx = w / vbw;
        let sy = h / vbh;
        let ox = X(r.left);
        let oy = Y(r.top);
        const par = svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
        if (hasVb && !par.startsWith('none')) {
            const s = par.includes('slice') ? Math.max(sx, sy) : Math.min(sx, sy);
            ox += par.includes('xMid') ? (w - vbw * s) / 2 : par.includes('xMax') ? w - vbw * s : 0;
            oy += par.includes('YMid') ? (h - vbh * s) / 2 : par.includes('YMax') ? h - vbh * s : 0;
            sx = sy = s;
        }
        ox -= vbx * sx;
        oy -= vby * sy;
        // KaTeX draws long SVGs (radicals, stretchy arrows, braces) and crops them with overflow:hidden.
        let clipBox: Box = box(r);
        for (let a = svg.parentElement; a && a !== root; a = a.parentElement) {
            const acs = style(a);
            if (acs.overflowX === 'visible' && acs.overflowY === 'visible') continue;
            const ab = box(a.getBoundingClientRect());
            const x0 = Math.max(clipBox.x, ab.x);
            const x1 = Math.min(clipBox.x + clipBox.w, ab.x + ab.w);
            clipBox = { x: x0, w: Math.max(0, x1 - x0), top: Math.max(clipBox.top, ab.top), bottom: Math.min(clipBox.bottom, ab.bottom) };
        }
        if (clipBox.w <= 0 || clipBox.bottom <= clipBox.top) continue;
        const paths: SvgPaint[] = [];
        svg.querySelectorAll('path, line, rect').forEach((p) => {
            const pcs = style(p);
            if (pcs.display === 'none' || pcs.visibility !== 'visible') return;
            let d = '';
            let fill = pcs.fill === 'none' ? null : parseColor(pcs.fill);
            const stroke = pcs.stroke === 'none' ? null : parseColor(pcs.stroke);
            const strokeWidth = parseFloat(pcs.strokeWidth) || 0;
            if (p instanceof SVGLineElement) {
                d = `M${p.x1.baseVal.value} ${p.y1.baseVal.value} L${p.x2.baseVal.value} ${p.y2.baseVal.value}`;
                fill = null;
            } else if (p instanceof SVGRectElement) {
                const [x, y, rw, rh] = [p.x.baseVal.value, p.y.baseVal.value, p.width.baseVal.value, p.height.baseVal.value];
                d = `M${x} ${y} H${x + rw} V${y + rh} H${x} Z`;
            } else d = p.getAttribute('d') ?? '';
            const hasStroke = shown(stroke) && strokeWidth > 0;
            if (d && (shown(fill) || hasStroke)) paths.push({ d, fill: shown(fill) ? fill : null, stroke: hasStroke ? stroke : null, strokeWidth });
        });
        if (paths.length) scene.svgs.push({ top: clipBox.top, paths, ox, oy, sx, sy, clip: clipBox });
    }
    return scene;
}

// ---------------------------------------------------------------------------
// Drawing

const bytesCache = new Map<string, Promise<Uint8Array>>();
function loadBytes(url: string): Promise<Uint8Array> {
    let p = bytesCache.get(url);
    if (!p) {
        p = fetch(url).then(async (r) => {
            if (!r.ok) throw new Error(`${url}: ${r.status}`);
            return new Uint8Array(await r.arrayBuffer());
        });
        bytesCache.set(url, p);
        p.catch(() => bytesCache.delete(url));
    }
    return p;
}

async function imageBytes(src: string): Promise<{ bytes: Uint8Array; png: boolean } | null> {
    try {
        const blob = await (await fetch(src)).blob();
        if (blob.type === 'image/png' || blob.type === 'image/jpeg') return { bytes: new Uint8Array(await blob.arrayBuffer()), png: blob.type === 'image/png' };
        const bmp = await createImageBitmap(blob);
        const c = document.createElement('canvas');
        c.width = bmp.width;
        c.height = bmp.height;
        c.getContext('2d')?.drawImage(bmp, 0, 0);
        const png = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
        return png ? { bytes: new Uint8Array(await png.arrayBuffer()), png: true } : null;
    } catch {
        return null; // cross-origin image without CORS: skipped
    }
}

/** Characters no PDF font here can show (emoji…) are drawn as a crisp image. */
async function rasterText(text: string, css: string, color: RGBA) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.font = css;
    const m = ctx.measureText(text);
    const asc = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
    if (!(m.width > 0 && asc + desc > 0)) return null;
    const scale = 4;
    c.width = Math.ceil(m.width * scale);
    c.height = Math.ceil((asc + desc) * scale);
    ctx.scale(scale, scale);
    ctx.font = css;
    ctx.fillStyle = `rgba(${color[0] * 255},${color[1] * 255},${color[2] * 255},${color[3]})`;
    ctx.fillText(text, 0, asc);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    return blob ? { bytes: new Uint8Array(await blob.arrayBuffer()), width: m.width, height: asc + desc, descent: desc } : null;
}

/** KaTeX face closest to a requested style, as the browser would pick it. */
function katexKey(family: string, bold: boolean, italic: boolean): string | null {
    const name = family.slice('KaTeX_'.length);
    const want = bold && italic ? 'BoldItalic' : bold ? 'Bold' : italic ? 'Italic' : 'Regular';
    for (const v of [want, bold ? 'Bold' : 'Regular', italic ? 'Italic' : 'Regular', 'Regular', 'Italic', 'BoldItalic', 'Bold']) {
        if (KATEX[`${name}-${v}`]) return `katex:${name}-${v}`;
    }
    return null;
}

/** PDF faces to try, in the order the CSS font-family list would. */
function faceChain(families: string[], bold: boolean, italic: boolean): string[] {
    const out: string[] = [];
    const add = (key: string | null) => {
        if (key && !out.includes(key)) out.push(key);
    };
    const noto = (fam: string) => 'noto:' + notoId(fam, bold, italic);
    for (const f of families) {
        const low = f.toLowerCase();
        if (f.startsWith('KaTeX_')) add(katexKey(f, bold, italic));
        else if (low.includes('devanagari') || low === 'mangal' || low === 'nirmala ui') add(noto('noto-devanagari'));
        else if (low.includes('noto serif')) add(noto('noto-serif'));
        else if (low.includes('noto sans')) add(noto('noto-sans'));
        else if (/courier|mono|consolas/.test(low)) add(`std:courier:${+bold}:${+italic}`);
        else if (low.includes('times')) add(`std:times:${+bold}:${+italic}`);
        else if (/arial|helvetica|liberation sans/.test(low)) add(`std:helvetica:${+bold}:${+italic}`);
        else if (low === 'serif') add(noto('noto-serif'));
        else add(noto('noto-sans'));
    }
    add(noto('noto-devanagari'));
    add(noto('noto-sans'));
    add('noto:noto-sans');
    return out;
}

function roundedPath(x: number, y: number, w: number, h: number, r: number): string {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

const asciiHex = (s: string) =>
    Array.from(new TextEncoder().encode(s))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

/** Bookmarks panel from the h1–h3 headings, nested by level. */
function addOutline(doc: PDFDocument, entries: { title: string; level: number; page: PDFRef; y: number }[]) {
    if (entries.length < 2) return;
    const ctx = doc.context;
    interface Node {
        ref: PDFRef;
        dict: PDFDict;
        level: number;
        children: Node[];
    }
    const root: Node = { ref: ctx.nextRef(), dict: ctx.obj({ Type: 'Outlines' }), level: 0, children: [] };
    const stack: Node[] = [root];
    for (const e of entries) {
        while (stack.length > 1 && stack[stack.length - 1].level >= e.level) stack.pop();
        const parent = stack[stack.length - 1];
        const node: Node = {
            ref: ctx.nextRef(),
            dict: ctx.obj({ Title: PDFHexString.fromText(e.title.slice(0, 200)), Parent: parent.ref, Dest: [e.page, 'XYZ', null, e.y, null] }),
            level: e.level,
            children: [],
        };
        parent.children.push(node);
        stack.push(node);
    }
    const link = (n: Node): number => {
        let count = 0;
        n.children.forEach((c, i) => {
            if (i > 0) c.dict.set(PDFName.of('Prev'), n.children[i - 1].ref);
            if (i < n.children.length - 1) c.dict.set(PDFName.of('Next'), n.children[i + 1].ref);
            count += 1 + link(c);
        });
        if (n.children.length) {
            n.dict.set(PDFName.of('First'), n.children[0].ref);
            n.dict.set(PDFName.of('Last'), n.children[n.children.length - 1].ref);
            n.dict.set(PDFName.of('Count'), ctx.obj(count));
        }
        ctx.assign(n.ref, n.dict);
        return count;
    };
    link(root);
    doc.catalog.set(PDFName.of('Outlines'), root.ref);
}

export async function renderDomToPdf(root: HTMLElement, opts: ExportOptions): Promise<Uint8Array> {
    await document.fonts?.ready;
    const pages = measurePages(root, opts);
    const scene = collect(root);
    const [pw, ph] = opts.size;
    const m = opts.margin;
    const k = PT_PER_PX;
    const PX = (x: number) => m + x * k;
    const PY = (y: number, i: number) => ph - m - (y - pages[i][0]) * k;

    const doc = await PDFDocument.create();
    doc.setTitle(opts.title || 'Document', { showInWindowTitleBar: true });
    doc.setProducer('Panna LaTeX to PDF by TestoZa (testoza.com/pdf)');
    doc.setCreator('Panna by TestoZa');
    const all = scene.texts.map((t) => t.text).join('');
    const deva = (all.match(/[ऀ-ॿ]/g) ?? []).length;
    doc.catalog.set(PDFName.of('Lang'), PDFString.of(deva > all.length * 0.3 ? 'hi-IN' : 'en-IN'));

    const pdfPages: PDFPage[] = pages.map(() => doc.addPage([pw, ph]));

    // Fonts ------------------------------------------------------------------
    const registry = new FaceRegistry(doc, (file) => loadBytes(`/pdf-fonts/${file}`));
    const faces = new Map<string, Promise<Face | null>>();
    const face = (key: string): Promise<Face | null> => {
        let p = faces.get(key);
        if (!p) {
            p = (async (): Promise<Face | null> => {
                const [kind, a, b, c] = key.split(':');
                if (kind === 'std') return registry.stdFace(a as 'courier' | 'times' | 'helvetica', b === '1', c === '1');
                if (kind === 'noto') {
                    await registry.prepare([a]);
                    return registry.customFace(a);
                }
                const font = await doc.embedFont(await loadBytes(KATEX[a]), { subset: true, customName: `KaTeX_${a}` });
                return new CustomFace(font, `katex-${a}`, `KaTeX ${a}`, a.includes('Bold'), a.includes('Italic'));
            })().catch((e) => {
                console.warn('[panna] font unavailable', key, e);
                return null;
            });
            faces.set(key, p);
        }
        return p;
    };
    const shapes = new Map<string, ShapedGlyph[]>();
    const shape = (f: Face, text: string) => {
        const key = f.key + '\u0000' + text;
        let s = shapes.get(key);
        if (!s) shapes.set(key, (s = f.shape(text)));
        return s;
    };

    // 1. Backgrounds, borders, rules --------------------------------------------
    const slices = (top: number, bottom: number, draw: (i: number, y: number, h: number) => void) => {
        pages.forEach(([s, e], i) => {
            const a = Math.max(top, s);
            const b = Math.min(bottom, e);
            if (b > a + 0.01) draw(i, PY(b, i), Math.max((b - a) * k, 0.25));
        });
    };
    const fillBox = (f: Fill) =>
        slices(f.top, f.bottom, (i, y, h) => pdfPages[i].drawRectangle({ x: PX(f.x), y, width: Math.max(f.w * k, 0.25), height: h, color: pdfRgb(f.color), opacity: alpha(f.color) }));
    for (const r of scene.rounded) {
        const i = pageIndexAt(pages, r.top);
        const [s, e] = pages[i];
        if (r.top >= s - 0.5 && r.bottom <= e + 0.5) {
            const x = r.x * k;
            const y = (r.top - s) * k;
            const w = r.w * k;
            const h = (r.bottom - r.top) * k;
            const rad = r.radius * k;
            if (r.fill) pdfPages[i].drawSvgPath(roundedPath(x, y, w, h, rad), { x: m, y: ph - m, color: pdfRgb(r.fill), opacity: alpha(r.fill) });
            if (r.border) {
                const bw = r.border.w * k;
                pdfPages[i].drawSvgPath(roundedPath(x + bw / 2, y + bw / 2, w - bw, h - bw, Math.max(0, rad - bw / 2)), {
                    x: m,
                    y: ph - m,
                    borderColor: pdfRgb(r.border.color),
                    borderWidth: bw,
                    borderOpacity: alpha(r.border.color),
                });
            }
        } else {
            // Split over two pages: square corners.
            if (r.fill) fillBox({ ...r, color: r.fill });
            if (r.border) {
                const { w: bw, color } = r.border;
                fillBox({ x: r.x, w: r.w, top: r.top, bottom: r.top + bw, color });
                fillBox({ x: r.x, w: r.w, top: r.bottom - bw, bottom: r.bottom, color });
                fillBox({ x: r.x, w: bw, top: r.top, bottom: r.bottom, color });
                fillBox({ x: r.x + r.w - bw, w: bw, top: r.top, bottom: r.bottom, color });
            }
        }
    }
    scene.fills.forEach(fillBox);
    for (const c of scene.checks) {
        const i = pageIndexAt(pages, c.top);
        const size = Math.min(c.w, c.bottom - c.top) * k;
        const x = PX(c.x);
        const y = PY(c.bottom, i);
        pdfPages[i].drawRectangle({ x, y, width: size, height: size, borderColor: rgb(0.42, 0.45, 0.5), borderWidth: 0.75 });
        if (c.checked) {
            pdfPages[i].drawSvgPath(`M${size * 0.2} ${size * 0.52} L${size * 0.42} ${size * 0.74} L${size * 0.8} ${size * 0.28}`, { x, y: y + size, borderColor: rgb(0.02, 0.47, 0.34), borderWidth: 1.2 });
        }
    }

    // 2. Images ----------------------------------------------------------------
    for (const img of scene.images) {
        const data = await imageBytes(img.src);
        if (!data) continue;
        const emb = data.png ? await doc.embedPng(data.bytes) : await doc.embedJpg(data.bytes);
        const i = pageIndexAt(pages, img.top);
        const h = (img.bottom - img.top) * k;
        pdfPages[i].drawImage(emb, { x: PX(img.x), y: PY(img.top, i) - h, width: img.w * k, height: h });
    }

    // 3. KaTeX SVGs (radicals, stretchy arrows, braces, \cancel) ---------------
    for (const s of scene.svgs) {
        const i = pageIndexAt(pages, s.top);
        const ops: PDFOperator[] = [pushGraphicsState()];
        ops.push(rectangle(PX(s.clip.x), PY(s.clip.bottom, i), s.clip.w * k, (s.clip.bottom - s.clip.top) * k), clip(), endPath());
        // drawSvgPath flips v, so (u,v) lands at (PX(ox + u*sx), PY(oy + v*sy)).
        ops.push(concatTransformationMatrix(s.sx * k, 0, 0, s.sy * k, PX(s.ox), PY(s.oy, i)));
        for (const p of s.paths) {
            ops.push(
                ...drawSvgPath(p.d, {
                    x: 0,
                    y: 0,
                    scale: 1,
                    color: p.fill ? pdfRgb(p.fill) : undefined,
                    borderColor: p.stroke ? pdfRgb(p.stroke) : undefined,
                    borderWidth: p.stroke ? p.strokeWidth : 0,
                }).filter(Boolean),
            );
        }
        ops.push(popGraphicsState());
        pdfPages[i].pushOperators(...ops);
    }

    // 4. Text ------------------------------------------------------------------
    const glyphsByPage: PlannedGlyph[][] = pages.map(() => []);
    const place = (i: number, f: Face, shaped: ShapedGlyph[], x: number, base: number, size: number, fill: Color, slant = 0) => {
        let pen = x;
        const lin: [number, number, number, number] = [1, 0, slant, 1];
        for (const g of shaped) {
            glyphsByPage[i].push({
                face: f,
                bytes: g.bytes,
                u: pen + g.xOffset * size,
                v: base + g.yOffset * size,
                adv: g.advance * size,
                tf: size,
                lin,
                hScale: 1,
                renderMode: 0,
                fill,
                stroke: fill,
                ascent: f.ascent,
                descent: f.descent,
                actual: g.cluster,
            });
            pen += g.xAdvance * size;
        }
        return pen;
    };
    let prev: { i: number; base: number; end: number; size: number; face: Face | null; fill: Color } | null = null;
    for (const run of scene.texts) {
        const i = pageIndexAt(pages, run.top);
        const chain = await Promise.all(faceChain(run.families, run.bold, run.italic).map(face));
        const size = run.sizePx * k;
        const base = PY(run.baseline, i);
        const fill = onWhite(run.color);
        const inKatex = run.families[0]?.startsWith('KaTeX_');
        // A real space glyph between words on one line, so copy/paste and search see the word
        // breaks (viewers can't guess them across Hindi ActualText spans).
        if (prev && prev.i === i && Math.abs(prev.base - base) < size * 0.3 && PX(run.x) - prev.end > Math.min(size, prev.size) * 0.12) {
            const sp = prev.face?.space ? prev.face : (chain.find((c) => c?.space) ?? null);
            if (sp?.space) place(i, sp, [sp.space], prev.end, prev.base, prev.size, prev.fill);
        }
        // Split the word where the browser would switch fonts; marks stay with their base.
        const pieces: { face: Face | null; text: string }[] = [];
        for (const ch of Array.from(run.text)) {
            const cur = pieces[pieces.length - 1];
            const attach = /\p{M}|[‌‍]/u.test(ch) && cur?.face?.supports(ch);
            const f = attach ? cur.face : (chain.find((c) => c?.supports(ch)) ?? null);
            if (cur && cur.face === f) cur.text += ch;
            else pieces.push({ face: f, text: ch });
        }
        let pen = PX(run.x);
        for (const piece of pieces) {
            if (!piece.face) {
                const img = await rasterText(piece.text, run.css, run.color);
                if (img) {
                    const png = await doc.embedPng(img.bytes);
                    pdfPages[i].drawImage(png, { x: pen, y: base - img.descent * k, width: img.width * k, height: img.height * k });
                    pen += img.width * k;
                }
                continue;
            }
            // Browsers slant fonts that have no italic (Devanagari); so do we.
            const slant = run.italic && !piece.face.italic && !inKatex ? 0.2 : 0;
            pen = place(i, piece.face, shape(piece.face, piece.text), pen, base, size, fill, slant);
        }
        prev = { i, base, end: pen, size, face: pieces[pieces.length - 1]?.face ?? null, fill };
    }

    // 5. Page numbers ----------------------------------------------------------
    if (opts.pageNumbers && pages.length > 1) {
        const f = await face(opts.family === 'serif' ? 'noto:noto-serif' : 'noto:noto-sans');
        if (f) {
            const size = 9;
            const grey: Color = { space: 'rgb', c: [0.42, 0.45, 0.5] };
            pages.forEach((_, i) => {
                const shaped = shape(f, `${i + 1} / ${pages.length}`);
                const width = shaped.reduce((s, g) => s + g.xAdvance * size, 0);
                place(i, f, shaped, (pw - width) / 2, Math.max(12, m / 2 - size / 3), size, grey);
            });
        }
    }

    pdfPages.forEach((page, i) => {
        const glyphs = glyphsByPage[i];
        if (!glyphs.length) return;
        const names = new Map<string, string>();
        const resName = (f: Face) => {
            let n = names.get(f.key);
            if (!n) {
                n = `T${names.size}`;
                page.node.setFontDictionary(PDFName.of(n), (f as unknown as { pdfFont: { ref: PDFRef } }).pdfFont.ref);
                names.set(f.key, n);
            }
            return n;
        };
        const content = emitGlyphs(glyphs, 0, resName);
        page.node.addContentStream(doc.context.register(doc.context.flateStream(encodeLatin1(content))));
    });

    // 6. Links and bookmarks ---------------------------------------------------
    for (const l of scene.links) {
        const i = pageIndexAt(pages, l.top);
        const annot = doc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [PX(l.x), PY(l.bottom, i), PX(l.x + l.w), PY(l.top, i)],
            Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFHexString.of(asciiHex(l.href)) },
        });
        pdfPages[i].node.addAnnot(doc.context.register(annot));
    }
    addOutline(
        doc,
        scene.headings.map((h) => {
            const i = pageIndexAt(pages, h.top);
            return { title: h.title, level: h.level, page: pdfPages[i].ref, y: Math.min(ph, PY(h.top, i) + 6) };
        }),
    );

    return doc.save({ useObjectStreams: true });
}
