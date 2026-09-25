/**
 * Serialises planned glyphs into content-stream operators. Every glyph is
 * placed exactly where the planner put it: consecutive glyphs share one TJ
 * array, and the differences between the planned position and the viewer's
 * natural advance become TJ adjustments. Baseline changes open a new Tm.
 */
import type { Face } from './faces';
import type { Color } from './interpreter';
import { fromFrame } from './layout';
import { hex, num } from './lexer';
import type { PlannedGlyph } from './planner';

export function colorOp(c: Color, stroke: boolean): string {
    const v = c.c.map(num).join(' ');
    if (c.space === 'gray') return `${v} ${stroke ? 'G' : 'g'}`;
    if (c.space === 'cmyk') return `${v} ${stroke ? 'K' : 'k'}`;
    return `${v} ${stroke ? 'RG' : 'rg'}`;
}

const colorKey = (c: Color) => c.space + c.c.map((v) => v.toFixed(4)).join(',');

/** PDF text string as UTF-16BE hex with BOM. */
export function utf16Hex(s: string): string {
    let h = '<FEFF';
    for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
    return h + '>';
}

export function emitGlyphs(glyphs: PlannedGlyph[], angle: number, resName: (f: Face) => string): string {
    if (!glyphs.length) return '';
    const out: string[] = ['q', 'BT'];
    let curFill = '';
    let curStroke = '';
    let curTz = 100;
    let curTr = 0;
    let curFont = '';
    let openSpans = 0;

    const segKey = (g: PlannedGlyph) =>
        [g.face.key, g.tf.toFixed(4), g.lin.map((v) => v.toFixed(5)).join(','), g.hScale.toFixed(4), g.renderMode, colorKey(g.fill), colorKey(g.stroke)].join('|');

    let i = 0;
    while (i < glyphs.length) {
        const first = glyphs[i];
        const key = segKey(first);
        // Segment: same style and same baseline (v).
        let j = i + 1;
        while (j < glyphs.length && segKey(glyphs[j]) === key && Math.abs(glyphs[j].v - first.v) < 1e-3) j++;
        const seg = glyphs.slice(i, j);
        i = j;

        const fk = colorKey(first.fill);
        if (fk !== curFill) {
            out.push(colorOp(first.fill, false));
            curFill = fk;
        }
        if (first.renderMode !== 0 && first.renderMode !== 3 && first.renderMode !== 7) {
            const sk = colorKey(first.stroke);
            if (sk !== curStroke) {
                out.push(colorOp(first.stroke, true));
                curStroke = sk;
            }
        }
        const fontKey = resName(first.face) + ' ' + num(first.tf);
        if (fontKey !== curFont) {
            out.push(`/${resName(first.face)} ${num(first.tf)} Tf`);
            curFont = fontKey;
        }
        const tz = first.hScale * 100;
        if (Math.abs(tz - curTz) > 1e-3) {
            out.push(`${num(tz)} Tz`);
            curTz = tz;
        }
        if (first.renderMode !== curTr) {
            out.push(`${first.renderMode} Tr`);
            curTr = first.renderMode;
        }
        const [x, y] = fromFrame(angle, first.u, first.v);
        const l = first.lin;
        out.push(`${num(l[0])} ${num(l[1])} ${num(l[2])} ${num(l[3])} ${num(x)} ${num(y)} Tm`);

        // Page units along the baseline per text-space unit.
        const sx = Math.hypot(l[0], l[1]) || 1;
        const k = first.tf * first.hScale;
        let parts: string[] = [];
        let pen = first.u;
        let str: number[] = [];
        const flushStr = () => {
            if (str.length) parts.push(hex(Uint8Array.from(str)));
            str = [];
        };
        // Close the current TJ; the text position carries on from where it ended.
        const flushTJ = () => {
            flushStr();
            if (parts.length) out.push(`[${parts.join(' ')}] TJ`);
            parts = [];
        };
        for (const g of seg) {
            if (g.actual?.start) {
                flushTJ();
                out.push(`/Span <</ActualText ${utf16Hex(g.actual.text)}>> BDC`);
                openSpans++;
            }
            const delta = g.u - pen;
            if (Math.abs(delta) > 1e-4 && k !== 0) {
                flushStr();
                parts.push(num((-delta / sx) * (1000 / k)));
            }
            for (const b of g.bytes) str.push(b);
            pen = g.u + g.adv;
            if (g.actual?.end && openSpans > 0) {
                flushTJ();
                out.push('EMC');
                openSpans--;
            }
        }
        flushTJ();
    }
    while (openSpans-- > 0) out.push('EMC');
    out.push('ET', 'Q');
    return out.join('\n');
}
