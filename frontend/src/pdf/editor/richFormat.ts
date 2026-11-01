/**
 * Toolbar formatting with style runs: a change applies to the selected words
 * only, or — with nothing (or everything) selected — to the whole text.
 */
import type { StyleRun } from '../engine/edits';
import type { FontInfo } from '../engine/fonts';
import { clearRunFields, patchRuns, runAt, styleOf, type RunStyle } from '../engine/runs';
import { rgbCss } from './EditorContext';
import type { Fmt } from './FormatBar';
import { familyCss } from './fonts';
import type { RunCss } from './RichText';

/** Style fields of a format (alignment always belongs to the whole text). */
export const fmtStyle = (f: Fmt): RunStyle => ({ family: f.family, size: f.size, color: f.color, bold: f.bold, italic: f.italic });

/** Format to show for a selection starting at `at`: the text's own, with that run's fields on top. */
export function fmtAt(f: Fmt, runs: StyleRun[], at: number | null): Fmt {
    const r = at === null ? null : runAt(runs, at);
    return r ? { ...f, ...styleOf(r) } : f;
}

/**
 * Applies a toolbar change. With words selected only they change; otherwise
 * the whole text does, and its runs stop overriding the changed fields.
 */
export function restyle(f: Fmt, runs: StyleRun[], length: number, sel: [number, number] | null, patch: Partial<Fmt>): { fmt: Fmt; runs: StyleRun[] } {
    const { align, ...style } = patch;
    let fmt = align ? { ...f, align } : f;
    const keys = (Object.keys(style) as (keyof RunStyle)[]).filter((k) => style[k] !== undefined);
    if (!keys.length) return { fmt, runs };
    if (!sel || (sel[0] <= 0 && sel[1] >= length)) {
        fmt = { ...fmt, ...style };
        return { fmt, runs: clearRunFields(runs, keys, length, fmtStyle(fmt)) };
    }
    return { fmt, runs: patchRuns(runs, length, sel[0], sel[1], style, fmtStyle(fmt)) };
}

/** CSS a run adds in the editor (`original` is the PDF font's look-alike). */
export function runCssFor(scale: number, originalCss: string, docFonts: FontInfo[]): RunCss {
    return (s) => {
        const css: ReturnType<RunCss> = {};
        if (s.family !== undefined) css.fontFamily = s.family === 'original' ? originalCss : familyCss(s.family, docFonts);
        if (s.size !== undefined) css.fontSize = `${s.size * scale}px`;
        if (s.bold !== undefined) css.fontWeight = s.bold ? '700' : '400';
        if (s.italic !== undefined) css.fontStyle = s.italic ? 'italic' : 'normal';
        if (s.color) css.color = rgbCss(s.color);
        return css;
    };
}

/** Canvas font string of a run on top of the text's own format (for measuring). */
export function runFontFor(f: Fmt, scale: number, originalCss: string, docFonts: FontInfo[]): (s: RunStyle) => string {
    return (s) => {
        const family = s.family ?? f.family;
        const css = family === 'original' ? originalCss : familyCss(family, docFonts);
        return `${(s.italic ?? f.italic) ? 'italic ' : ''}${(s.bold ?? f.bold) ? 700 : 400} ${(s.size ?? f.size) * scale}px ${css}`;
    };
}

/** CSS font stacks the runs use (to wait for bundled web fonts). */
export const runFamilies = (runs: StyleRun[], originalCss: string, docFonts: FontInfo[]) =>
    [...new Set(runs.filter((r) => r.family !== undefined).map((r) => (r.family === 'original' ? originalCss : familyCss(r.family!, docFonts))))];
