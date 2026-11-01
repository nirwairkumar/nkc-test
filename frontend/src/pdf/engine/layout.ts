/**
 * Groups glyphs into editable text blocks.
 *
 * Lines are split at large horizontal gaps so table cells ("Name of Student",
 * ":", "demo") stay independent — a common failure of online editors, which
 * lump a whole table column into one box. Lines are merged into a paragraph
 * only on positive evidence of word-wrapping (the next line's first word would
 * not have fitted on the previous line), never merely because lines are stacked.
 */
import { colorToCss, glyphBox, type Color, type GlyphRec, type PageModel } from './interpreter';
import type { FontInfo } from './fonts';
import { type Rect, rectUnion } from './matrix';

export interface TextStyle {
    key: string;
    font: FontInfo;
    fontRes: string;
    container: string;
    /** Tf size (text space). */
    fontSize: number;
    /** Effective size in page space. */
    size: number;
    fill: Color;
    stroke: Color;
    renderMode: number;
    hScale: number;
    charSpace: number;
    wordSpace: number;
    rise: number;
    /** Linear part of Tm × CTM (see GlyphRec.lin). */
    lin: [number, number, number, number];
}

/**
 * Smallest unit of text that maps to a fixed set of original glyphs: one char,
 * a ligature ("fi"), or a whole complex-script cluster from /ActualText.
 * Unchanged atoms are re-drawn from their original glyph codes, never re-encoded.
 */
export interface Atom {
    text: string;
    style: number;
    /** Original glyphs (empty for a virtual space made of positioning only). */
    glyphs: GlyphRec[];
    /** Extent along the baseline in the angle frame (page units). */
    u0: number;
    u1: number;
    /** End-of-line hyphenation hyphen: not part of the paragraph's text. */
    soft?: boolean;
}

export interface TextLine {
    glyphs: GlyphRec[];
    atoms: Atom[];
    text: string;
    /** Extent along the baseline and baseline position, in the angle frame. */
    u0: number;
    u1: number;
    v: number;
    size: number;
}

export type Align = 'left' | 'center' | 'right' | 'justify';

export interface TextBlock {
    id: string;
    lines: TextLine[];
    /** Paragraph text: soft-wrapped lines joined with spaces. */
    text: string;
    angle: number;
    bbox: Rect;
    styles: TextStyle[];
    /** Index into styles of the style covering most characters. */
    mainStyle: number;
    align: Align;
    /** Distance between baselines (page units). */
    lineGap: number;
    spaceWidth: number;
    editable: boolean;
    /** Paragraph (multi-line, re-flowable) vs single line segment. */
    paragraph: boolean;
    /** Left and right limits along the baseline for re-flow. */
    uLeft: number;
    uRight: number;
    firstLineIndent: number;
}

export interface PageText {
    blocks: TextBlock[];
    glyphCount: number;
    /** Invisible (OCR) text present — likely a scanned page. */
    hasInvisibleText: boolean;
    /** Page had text we could not decode reliably. */
    hasUnsupportedText: boolean;
}

// Frame helpers: rotate page coords by -angle so the baseline runs along +u.
export const toFrame = (angle: number, x: number, y: number): [number, number] => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [x * c + y * s, -x * s + y * c];
};
export const fromFrame = (angle: number, u: number, v: number): [number, number] => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [u * c - v * s, u * s + v * c];
};

/** Text of a line without a trailing soft (hyphenation) hyphen. */
export const lineText = (l: TextLine) => l.atoms.filter((a) => !a.soft).map((a) => a.text).join('');

/** Whether a line break after this line joins words directly (no space). */
export const joinsDirectly = (l: TextLine) => l.atoms.some((a) => a.soft) || l.text.endsWith('-');

/** Joins wrapped lines into paragraph text: spaces between lines, nothing after a hyphen. */
export function joinLines(lines: TextLine[]): string {
    let out = '';
    lines.forEach((l, i) => {
        if (i > 0 && !joinsDirectly(lines[i - 1])) out += ' ';
        out += lineText(l);
    });
    return out;
}

/**
 * Page-space rectangles (one per line) covering characters [start, end) of a
 * block's paragraph text — the same indexing as `joinLines`.
 */
export function blockTextRects(block: TextBlock, start: number, end: number): Rect[] {
    const out: Rect[] = [];
    let pos = 0;
    block.lines.forEach((line, li) => {
        if (li > 0 && !joinsDirectly(block.lines[li - 1])) pos += 1;
        let box: Rect | null = null;
        for (const a of line.atoms) {
            if (a.soft) continue;
            const n = Array.from(a.text).length;
            if (pos < end && pos + n > start) {
                for (const g of a.glyphs) box = rectUnion(box, glyphBox(g));
            }
            pos += n;
        }
        if (box) out.push(box);
    });
    return out;
}

/**
 * Width a whitespace atom really occupies: from the end of the previous atom to
 * the start of the next (includes Tw, kerning and any virtual gap).
 */
export function spaceGap(line: TextLine, i: number): number {
    const prev = line.atoms[i - 1];
    const next = line.atoms[i + 1];
    if (prev && next) return Math.max(0, next.u0 - prev.u1);
    const a = line.atoms[i];
    return Math.max(0, a.u1 - a.u0);
}

const SPACE_GAP = 0.13; // em — gap that reads as a word space
const SPLIT_GAP = 1.0; // em — gap that splits a line into separate segments
const LIST_START = /^([•●▪◦‣⁃■□✓✔\-–—*]\s|\(?\d{1,3}[.)]\s|\(?[a-zA-Z][.)]\s|\(?[ivxIVX]{1,4}[.)]\s)/;

const angleBucket = (a: number) => Math.round(a * 50) / 50; // ~1.1° buckets

function styleKey(g: GlyphRec): string {
    const f = g.fill;
    return [
        g.font.ref?.toString() ?? g.font.baseFont,
        g.fontRes,
        g.container,
        g.fontSize.toFixed(3),
        g.size.toFixed(2),
        f.space + f.c.map((v) => v.toFixed(3)).join(','),
        g.renderMode,
        g.hScale.toFixed(3),
        g.charSpace.toFixed(3),
        g.wordSpace.toFixed(3),
        g.rise.toFixed(2),
    ].join('|');
}

interface Run {
    angle: number;
    glyphs: GlyphRec[];
    dup: Set<GlyphRec>;
    u0: number;
    uEnd: number;
    v: number;
    size: number;
    cluster: number;
}

export function analyzeText(model: PageModel): PageText {
    const glyphs = model.glyphs;
    const hasInvisibleText = glyphs.some((g) => !g.visible && g.renderMode === 3 && g.unicode.trim());
    const visible = glyphs.filter((g) => g.visible);
    const hasUnsupportedText = visible.some((g) => !g.font.editable);

    // 1. Runs in content order.
    const runs: Run[] = [];
    let cur: Run | null = null;
    for (const g of visible) {
        const [u, v] = toFrame(g.angle, g.x, g.y);
        const [ue] = toFrame(g.angle, g.ex, g.ey);
        const sameCluster = cur && g.cluster >= 0 && g.cluster === cur.cluster;
        const fits =
            cur &&
            Math.abs(cur.angle - g.angle) < 0.02 &&
            (sameCluster ||
                (Math.abs(v - cur.v) < 0.25 * Math.max(cur.size, g.size) &&
                    g.size / cur.size < 1.45 &&
                    cur.size / g.size < 1.45 &&
                    u >= cur.uEnd - (g.ex === g.x || g.cluster >= 0 ? 1.0 : 0.5) * g.size &&
                    u - cur.uEnd <= SPLIT_GAP * Math.max(cur.size, g.size)));
        if (!fits || !cur) {
            cur = { angle: g.angle, glyphs: [g], dup: new Set(), u0: u, uEnd: ue, v, size: g.size, cluster: g.cluster };
            runs.push(cur);
            continue;
        }
        // Fake-bold / double-drawn text: same char at (almost) the same spot.
        const dupOf = cur.glyphs
            .slice(-40)
            .find((o) => o.unicode === g.unicode && g.unicode !== '' && Math.hypot(o.x - g.x, o.y - g.y) < 0.12 * g.size);
        if (dupOf) cur.dup.add(g);
        cur.glyphs.push(g);
        cur.uEnd = Math.max(cur.uEnd, ue);
        cur.u0 = Math.min(cur.u0, u);
        cur.cluster = g.cluster;
        if (!dupOf && g.unicode.trim()) cur.size = Math.max(cur.size, g.size);
    }

    // 2. Merge collinear runs that are adjacent on the same baseline (out-of-order content).
    const byAngle = new Map<number, Run[]>();
    for (const r of runs) {
        const b = angleBucket(r.angle);
        if (!byAngle.has(b)) byAngle.set(b, []);
        byAngle.get(b)!.push(r);
    }
    const lines: { angle: number; run: Run }[] = [];
    for (const [, group] of byAngle) {
        group.sort((a, b) => b.v - a.v || a.u0 - b.u0);
        const merged: Run[] = [];
        for (const r of group) {
            const target = merged.find(
                (m) =>
                    Math.abs(m.v - r.v) < 0.2 * Math.max(m.size, r.size) &&
                    r.u0 - m.uEnd >= -0.3 * r.size &&
                    r.u0 - m.uEnd <= SPLIT_GAP * Math.max(m.size, r.size) &&
                    Math.max(m.size, r.size) / Math.min(m.size, r.size) < 1.45,
            );
            if (target) {
                target.glyphs.push(...r.glyphs);
                r.dup.forEach((d) => target.dup.add(d));
                target.uEnd = Math.max(target.uEnd, r.uEnd);
            } else merged.push(r);
        }
        for (const r of merged) lines.push({ angle: r.angle, run: r });
    }

    // 3. Build TextLines of atoms, with virtual spaces and style indexes.
    const styles: TextStyle[] = [];
    const styleIdx = new Map<string, number>();
    const getStyle = (g: GlyphRec) => {
        const k = styleKey(g);
        let i = styleIdx.get(k);
        if (i === undefined) {
            i = styles.length;
            styleIdx.set(k, i);
            styles.push({
                key: k,
                font: g.font,
                fontRes: g.fontRes,
                container: g.container,
                fontSize: g.fontSize,
                size: g.size,
                fill: g.fill,
                stroke: g.stroke,
                renderMode: g.renderMode,
                hScale: g.hScale,
                charSpace: g.charSpace,
                wordSpace: g.wordSpace,
                rise: g.rise,
                lin: g.lin,
            });
        }
        return i;
    };

    const built: (TextLine & { angle: number })[] = [];
    for (const { angle, run } of lines) {
        // Content order inside each run; merged runs were appended left-to-right.
        const ordered = run.glyphs.map((g) => ({ g, u: toFrame(angle, g.x, g.y)[0], ue: toFrame(angle, g.ex, g.ey)[0] }));
        const atoms: Atom[] = [];
        let prevEnd = -Infinity;
        let size = 0;
        for (const { g, u, ue } of ordered) {
            const last = atoms[atoms.length - 1];
            // Duplicate (fake-bold) glyphs and cluster continuations belong to the previous atom.
            if (run.dup.has(g) || !g.unicode) {
                if (last && last.glyphs.length) {
                    last.glyphs.push(g);
                    last.u1 = Math.max(last.u1, ue);
                } else {
                    atoms.push({ text: '', style: getStyle(g), glyphs: [g], u0: u, u1: ue });
                }
                prevEnd = Math.max(prevEnd, ue);
                continue;
            }
            const gap = u - prevEnd;
            const prevText = last?.text ?? '';
            if (atoms.length && gap > SPACE_GAP * g.size && !/\s$/.test(prevText) && !/^\s/.test(g.unicode)) {
                atoms.push({ text: ' ', style: getStyle(g), glyphs: [], u0: prevEnd, u1: u });
            }
            atoms.push({ text: g.unicode.replace(/ /g, ' '), style: getStyle(g), glyphs: [g], u0: u, u1: ue });
            prevEnd = Math.max(prevEnd, ue);
            size = Math.max(size, g.size);
        }
        // Leading/trailing whitespace atoms are folded into neighbours: their glyphs
        // must still be removed with the line, but the text has no stray spaces.
        while (atoms.length > 1 && !atoms[0].text.trim()) {
            atoms[1].glyphs.unshift(...atoms[0].glyphs);
            atoms.shift();
        }
        while (atoms.length > 1 && !atoms[atoms.length - 1].text.trim()) {
            atoms[atoms.length - 2].glyphs.push(...atoms[atoms.length - 1].glyphs);
            atoms.pop();
        }
        const text = atoms.map((a) => a.text).join('');
        if (!text.trim()) continue;
        const us = run.glyphs.filter((g) => !run.dup.has(g)).flatMap((g) => [toFrame(angle, g.x, g.y)[0], toFrame(angle, g.ex, g.ey)[0]]);
        built.push({ angle, glyphs: run.glyphs, atoms, text, u0: Math.min(...us), u1: Math.max(...us), v: run.v, size: size || run.size });
    }

    // 4. Paragraph grouping.
    type Draft = { angle: number; lines: typeof built; align: Align | null; gap: number };
    const drafts: Draft[] = [];
    const sorted = [...built].sort((a, b) => angleBucket(a.angle) - angleBucket(b.angle) || b.v - a.v || a.u0 - b.u0);

    const firstWordWidth = (l: TextLine) => {
        const sp = l.atoms.findIndex((a) => /\s/.test(a.text));
        const end = sp < 0 ? l.atoms.length - 1 : sp - 1;
        return end >= 0 ? l.atoms[end].u1 - l.atoms[0].u0 : 0;
    };
    const wordCount = (l: TextLine) => l.text.trim().split(/\s+/).length;

    /** Right edge of the text column a line belongs to: lines sharing its left edge nearby. */
    const columnRight = (l: (typeof built)[number]) => {
        let r = l.u1;
        for (const o of built) {
            if (angleBucket(o.angle) !== angleBucket(l.angle)) continue;
            if (Math.abs(o.u0 - l.u0) > 1.0 * l.size) continue;
            if (Math.abs(o.v - l.v) > 40 * l.size) continue;
            r = Math.max(r, o.u1);
        }
        return r;
    };

    /** Another segment on the same baseline starting just right of `l` (a table cell). */
    const hasRightNeighbour = (l: (typeof built)[number], within: number) =>
        built.some(
            (o) =>
                o !== l &&
                angleBucket(o.angle) === angleBucket(l.angle) &&
                Math.abs(o.v - l.v) < 0.3 * l.size &&
                o.u0 > l.u1 - 0.1 * l.size &&
                o.u0 - l.u1 < within,
        );

    for (const line of sorted) {
        let attached = false;
        if (!LIST_START.test(line.text)) {
            for (const d of drafts) {
                if (angleBucket(d.angle) !== angleBucket(line.angle)) continue;
                const last = d.lines[d.lines.length - 1];
                const dv = last.v - line.v;
                const sz = Math.max(last.size, line.size);
                if (dv < 0.85 * sz || dv > 2.1 * sz) continue;
                if (sz / Math.min(last.size, line.size) > 1.2) continue;
                if (d.lines.length > 1 && Math.abs(dv - d.gap) > 0.15 * d.gap) continue;

                // Left edge must match (or line 1 carries a first-line indent).
                const bodyLeft = d.lines.length > 1 ? Math.min(...d.lines.slice(1).map((l) => l.u0)) : last.u0;
                const leftAligned = Math.abs(line.u0 - bodyLeft) < 0.6 * sz;
                const indent = d.lines.length === 1 && last.u0 > line.u0 && last.u0 - line.u0 < 5 * sz;
                if (!leftAligned && !indent) continue;

                // Wrap evidence: the next line's first word could not have fitted on `last`
                // before the column's right margin.
                const space = 0.3 * sz;
                const fww = firstWordWidth(line);
                const colRight = Math.max(columnRight(last), columnRight(line));
                if (last.u1 + 0.5 * space + fww < colRight - 0.25 * sz) continue;
                // Sentence-like line, not a label or list item (short, or sitting next to a cell).
                if (wordCount(last) < 6 && last.u1 - last.u0 < 12 * sz) continue;
                if (hasRightNeighbour(last, fww + 2 * space)) continue;
                // Centred stacks (titles, addresses) have aligned centres but drifting left edges.
                const centreDiff = Math.abs((last.u0 + last.u1) / 2 - (line.u0 + line.u1) / 2);
                if (!indent && centreDiff < 0.3 * sz && Math.abs(last.u0 - line.u0) > 0.3 * sz) continue;

                d.lines.push(line);
                d.align = 'left';
                if (d.lines.length === 2) d.gap = dv;
                attached = true;
                break;
            }
        }
        if (!attached) drafts.push({ angle: line.angle, lines: [line], align: null, gap: 0 });
    }

    // Text margins per angle, used to guess how single lines are anchored.
    const margins = new Map<number, { left: number; right: number }>();
    for (const l of built) {
        const b = angleBucket(l.angle);
        const m = margins.get(b);
        if (!m) margins.set(b, { left: l.u0, right: l.u1 });
        else {
            m.left = Math.min(m.left, l.u0);
            m.right = Math.max(m.right, l.u1);
        }
    }

    // 5. Finalise blocks.
    const blocks: TextBlock[] = drafts.map((d) => {
        const angle = d.angle;
        const ls = d.lines;
        // End-of-line hyphenation ("com-" / "pile"): the hyphen is not part of the text.
        for (let i = 0; i < ls.length - 1; i++) {
            const atoms = ls[i].atoms;
            const last = atoms[atoms.length - 1];
            const before = atoms[atoms.length - 2]?.text ?? '';
            const nextFirst = ls[i + 1].atoms[0]?.text ?? '';
            if (last && /^[-­‐]$/.test(last.text) && /\p{Ll}$/u.test(before) && /^\p{Ll}/u.test(nextFirst)) last.soft = true;
        }
        let bbox: Rect | null = null;
        for (const l of ls) for (const g of l.glyphs) bbox = rectUnion(bbox, glyphBox(g));
        const counts = new Map<number, number>();
        for (const l of ls) for (const a of l.atoms) counts.set(a.style, (counts.get(a.style) ?? 0) + a.text.length);
        const mainStyle = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
        const main = styles[mainStyle];
        const uLeft = Math.min(...ls.map((l) => l.u0));
        const uRight = Math.max(...ls.map((l) => l.u1));

        let align: Align = d.align ?? 'left';
        if (ls.length >= 2 && align === 'left') {
            const body = ls.slice(0, -1);
            const flushRight = body.every((l) => Math.abs(l.u1 - uRight) < 0.35 * l.size);
            if (flushRight && ls[ls.length - 1].u1 < uRight - 2 * main.size) align = 'justify';
            else if (flushRight && body.length >= 2) align = 'justify';
        }

        // Typical word space: prefer real space glyphs (virtual gaps can be table gutters).
        const real: number[] = [];
        const virtual: number[] = [];
        for (const l of ls) {
            l.atoms.forEach((a, i) => {
                if (a.text !== ' ') return;
                (a.glyphs.length ? real : virtual).push(spaceGap(l, i));
            });
        }
        const pick = real.length ? real : virtual;
        pick.sort((a, b) => a - b);
        const spaceWidth = pick.length ? pick[Math.floor((pick.length - 1) / 2)] : 0.26 * main.size;

        const paragraph = ls.length > 1;
        let lineAlign: Align = 'left';
        if (!paragraph) {
            const m = margins.get(angleBucket(angle))!;
            const l = ls[0];
            const sz = l.size;
            const mid = (l.u0 + l.u1) / 2;
            if (l.u0 - m.left > 2 * sz && Math.abs(mid - (m.left + m.right) / 2) < 0.6 * sz) lineAlign = 'center';
            else if (l.u0 - m.left > 4 * sz && Math.abs(l.u1 - m.right) < 0.8 * sz) lineAlign = 'right';
        }

        const text = joinLines(ls);
        const editable = ls.every((l) => l.glyphs.every((g) => g.font.editable)) && text.trim().length > 0;
        const first = ls[0].glyphs[0];
        return {
            id: 'b:' + first.key,
            lines: ls.map(({ angle: _a, ...l }) => l),
            text,
            angle,
            bbox: bbox!,
            styles,
            mainStyle,
            align: paragraph ? align : lineAlign,
            lineGap: paragraph ? d.gap || ls[0].v - ls[1].v : main.size * 1.2,
            spaceWidth: Math.min(Math.max(spaceWidth, 0.15 * main.size), 0.5 * main.size),
            editable,
            paragraph,
            uLeft,
            uRight,
            firstLineIndent: paragraph ? ls[0].u0 - Math.min(...ls.slice(1).map((l) => l.u0)) : 0,
        };
    });

    // Reading order: top-to-bottom, then left-to-right.
    blocks.sort((a, b) => b.bbox.y1 - a.bbox.y1 || a.bbox.x0 - b.bbox.x0);
    return { blocks, glyphCount: visible.length, hasInvisibleText, hasUnsupportedText };
}

export const styleCss = (s: TextStyle) => ({
    color: colorToCss(s.fill),
    fontFamily: s.font.cssFamily,
    fontWeight: s.font.bold ? 700 : 400,
    fontStyle: s.font.italic ? 'italic' : 'normal',
});
