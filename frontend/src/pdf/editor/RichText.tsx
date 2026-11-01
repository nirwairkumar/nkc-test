/**
 * The box text is typed in: plain text plus style runs, so a selected word can
 * have its own font, size or colour while the rest keeps the text's style.
 *
 * Between style changes the DOM belongs to the browser (typing, IME, undo);
 * after every input it is read back into text + runs. It is rebuilt from
 * text + runs only when `version` changes, and the selection is put back.
 */
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import type { StyleRun } from '../engine/edits';
import { segments, styleOf, type RunStyle } from '../engine/runs';

/** CSS a run adds on top of the box's own style (camel-case properties, string values). */
export type RunCss = (s: RunStyle) => Partial<Record<'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle' | 'color', string>>;

export interface RichTextHandle {
    /** Selected range [start, end) — kept while a toolbar field has focus — or null when nothing is selected. */
    selection(): [number, number] | null;
    /** Focus with the caret at the end. */
    focus(): void;
}

interface Props {
    text: string;
    runs: StyleRun[];
    /** Change it to rebuild the box from `text` + `runs` (after a style change, or a zoom). */
    version: string;
    runCss: RunCss;
    onChange: (text: string, runs: StyleRun[]) => void;
    /** The selection moved (null: just a caret, or none). */
    onSelect?: (range: [number, number] | null) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
    style: CSSProperties;
    className?: string;
    ariaLabel: string;
    placeholder?: string;
}

const HIGHLIGHT = 'panna-selection';

function ensureHighlightStyle() {
    if (typeof document === 'undefined' || document.querySelector('style[data-panna="highlight"]')) return;
    const el = document.createElement('style');
    el.dataset.panna = 'highlight';
    el.textContent = `::highlight(${HIGHLIGHT}){background-color:rgba(16,185,129,.3)}`;
    document.head.appendChild(el);
}

type Highlights = { set(name: string, h: unknown): void; delete(name: string): void };
const highlights = (): Highlights | null => (typeof CSS !== 'undefined' && 'highlights' in CSS ? (CSS as unknown as { highlights: Highlights }).highlights : null);
const HighlightCtor = (): (new (...r: Range[]) => unknown) | null => (typeof window !== 'undefined' && 'Highlight' in window ? (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight : null);

/** A pieces of the box in text order: a text node, or a line break (BR). */
interface Leaf {
    node: Node;
    start: number;
    len: number;
}

function lastLeaf(root: Node): Node | null {
    let n: Node | null = root.lastChild;
    while (n && n.lastChild && n.nodeName !== 'BR') n = n.lastChild;
    return n;
}

/** Text, runs and leaves of the box as the browser has it now. */
function readBox(root: HTMLElement): { text: string; runs: StyleRun[]; leaves: Leaf[] } {
    let text = '';
    const runs: StyleRun[] = [];
    const leaves: Leaf[] = [];
    const last = lastLeaf(root);
    const add = (node: Node, s: string, style: RunStyle | null) => {
        leaves.push({ node, start: text.length, len: s.length });
        if (!s) return;
        if (style) {
            const prev = runs[runs.length - 1];
            if (prev && prev.end === text.length && JSON.stringify(styleOf(prev)) === JSON.stringify(style)) prev.end += s.length;
            else runs.push({ start: text.length, end: text.length + s.length, ...style });
        }
        text += s;
    };
    const walk = (node: Node, style: RunStyle | null) => {
        node.childNodes.forEach((c) => {
            if (c.nodeType === Node.TEXT_NODE) {
                add(c, (c as Text).data.replace(/\u00a0/g, ' '), style);
            } else if (c instanceof HTMLElement) {
                if (c.tagName === 'BR') {
                    // Our end-of-text filler, or the browser's placeholder after a final line break.
                    const filler = c.dataset.filler !== undefined || (c === last && (text === '' || text.endsWith('\n')));
                    add(c, filler ? '' : '\n', style);
                    return;
                }
                if ((c.tagName === 'DIV' || c.tagName === 'P') && text && !text.endsWith('\n')) add(c, '\n', style);
                let own = style;
                if (c.dataset.run) {
                    try {
                        own = JSON.parse(c.dataset.run) as RunStyle;
                    } catch {
                        /* keep the parent's */
                    }
                }
                walk(c, own);
            }
        });
    };
    walk(root, null);
    return { text, runs, leaves };
}

function offsetOf(root: HTMLElement, leaves: Leaf[], node: Node, offset: number): number {
    if (node.nodeType === Node.TEXT_NODE) {
        const l = leaves.find((x) => x.node === node);
        if (l) return l.start + Math.min(offset, l.len);
    }
    const r = document.createRange();
    r.setStart(root, 0);
    try {
        r.setEnd(node, offset);
    } catch {
        return 0;
    }
    let n = r.toString().length;
    for (const l of leaves) if (l.node.nodeName === 'BR' && l.len && r.intersectsNode(l.node)) n += l.len;
    return n;
}

function pointAt(root: HTMLElement, leaves: Leaf[], off: number): [Node, number] {
    for (const l of leaves) {
        if (l.node.nodeType === Node.TEXT_NODE) {
            if (off <= l.start + l.len) return [l.node, Math.max(0, off - l.start)];
        } else if (off <= l.start) {
            const p = l.node.parentNode!;
            return [p, Array.prototype.indexOf.call(p.childNodes, l.node)];
        }
    }
    return [root, root.childNodes.length];
}

function filler(): HTMLBRElement {
    const br = document.createElement('br');
    br.dataset.filler = '';
    return br;
}

const RichText = forwardRef<RichTextHandle, Props>(function RichText({ text, runs, version, runCss, onChange, onSelect, onKeyDown, style, className, ariaLabel, placeholder }, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    /** Last non-empty selection made inside the box. */
    const saved = useRef<[number, number] | null>(null);
    const latest = useRef({ text, runs, runCss, onChange, onSelect });
    latest.current = { text, runs, runCss, onChange, onSelect };

    const rangeFor = (s: number, e: number): Range | null => {
        const root = rootRef.current;
        if (!root) return null;
        const { leaves } = readBox(root);
        const r = document.createRange();
        r.setStart(...pointAt(root, leaves, s));
        r.setEnd(...pointAt(root, leaves, e));
        return r;
    };

    /** Shows the kept selection while focus is in the toolbar (where the real one can't be). */
    const paintSaved = () => {
        const hl = highlights(), H = HighlightCtor();
        if (!hl || !H) return;
        const root = rootRef.current;
        const sel = saved.current;
        if (!sel || !root || document.activeElement === root) {
            hl.delete(HIGHLIGHT);
            return;
        }
        const r = rangeFor(sel[0], sel[1]);
        if (r) hl.set(HIGHLIGHT, new H(r));
    };

    const restoreSelection = () => {
        const root = rootRef.current;
        const sel = saved.current;
        if (!root || !sel) return;
        if (document.activeElement === root) {
            const r = rangeFor(sel[0], sel[1]);
            const ds = window.getSelection();
            if (r && ds) {
                ds.removeAllRanges();
                ds.addRange(r);
            }
        }
        paintSaved();
    };

    // Rebuild from text + runs.
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const { text: t, runs: rs, runCss: css } = latest.current;
        root.textContent = '';
        for (const seg of segments(t.length, rs)) {
            const node = document.createTextNode(t.slice(seg.start, seg.end));
            if (seg.run) {
                const s = styleOf(seg.run);
                const span = document.createElement('span');
                span.dataset.run = JSON.stringify(s);
                Object.assign(span.style, css(s));
                // Bigger letters must not push the line (and the baseline under the PDF's text) down.
                span.style.lineHeight = '0';
                span.appendChild(node);
                root.appendChild(span);
            } else root.appendChild(node);
        }
        if (!t || t.endsWith('\n')) root.appendChild(filler());
        restoreSelection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version]);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        root.contentEditable = 'plaintext-only';
        // Browsers without plaintext-only: rich mode (paste and shortcuts are handled below).
        if (root.contentEditable !== 'plaintext-only') root.contentEditable = 'true';
        ensureHighlightStyle();
    }, []);

    // Track the selection inside the box; a toolbar field taking focus leaves it as it was.
    useEffect(() => {
        const onSel = () => {
            const root = rootRef.current;
            const ds = window.getSelection();
            if (!root || !ds || !ds.rangeCount) return;
            const r = ds.getRangeAt(0);
            if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return;
            const { leaves } = readBox(root);
            const a = offsetOf(root, leaves, r.startContainer, r.startOffset);
            const b = offsetOf(root, leaves, r.endContainer, r.endOffset);
            const next: [number, number] | null = a === b ? null : [Math.min(a, b), Math.max(a, b)];
            const prev = saved.current;
            saved.current = next;
            if (prev?.[0] !== next?.[0] || prev?.[1] !== next?.[1]) latest.current.onSelect?.(next);
        };
        document.addEventListener('selectionchange', onSel);
        return () => {
            document.removeEventListener('selectionchange', onSel);
            highlights()?.delete(HIGHLIGHT);
        };
    }, []);

    useImperativeHandle(ref, () => ({
        selection: () => saved.current,
        focus: () => {
            const root = rootRef.current;
            if (!root) return;
            root.focus({ preventScroll: true });
            const { leaves, text: t } = readBox(root);
            const r = document.createRange();
            r.setStart(...pointAt(root, leaves, t.length));
            r.collapse(true);
            const ds = window.getSelection();
            ds?.removeAllRanges();
            ds?.addRange(r);
        },
    }));

    const insertText = (s: string) => {
        // execCommand keeps the browser's undo stack; fall back to editing the range by hand.
        if (document.execCommand?.('insertText', false, s)) return;
        const ds = window.getSelection();
        if (!ds?.rangeCount) return;
        const r = ds.getRangeAt(0);
        r.deleteContents();
        const node = document.createTextNode(s);
        r.insertNode(node);
        r.setStartAfter(node);
        r.collapse(true);
        ds.removeAllRanges();
        ds.addRange(r);
        rootRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const onInput = () => {
        const root = rootRef.current;
        if (!root) return;
        const { text: t, runs: rs } = readBox(root);
        // A final line break only shows with something after it.
        if ((!t || t.endsWith('\n')) && !(root.lastChild instanceof HTMLBRElement && root.lastChild.dataset.filler !== undefined)) root.appendChild(filler());
        latest.current.onChange(t, rs);
    };

    return (
        <div className="relative">
            {placeholder && !text && (
                <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 select-none text-slate-400" style={{ font: style.font, lineHeight: style.lineHeight }}>
                    {placeholder}
                </span>
            )}
            <div
                ref={rootRef}
                role="textbox"
                aria-multiline="true"
                aria-label={ariaLabel}
                spellCheck={false}
                suppressContentEditableWarning
                className={className}
                style={style}
                onInput={onInput}
                onFocus={() => highlights()?.delete(HIGHLIGHT)}
                onBlur={() => paintSaved()}
                onKeyDown={(e) => {
                    onKeyDown?.(e);
                    // The browser's own bold/italic/underline would add markup the PDF doesn't know about.
                    if ((e.ctrlKey || e.metaKey) && /^[biu]$/i.test(e.key)) e.preventDefault();
                    if (e.defaultPrevented) return;
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        insertText('\n');
                    }
                }}
                onPaste={(e) => {
                    e.preventDefault();
                    insertText(e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'));
                }}
                onDrop={(e) => e.preventDefault()}
            />
        </div>
    );
});

export default RichText;

/** Width of the widest line, each piece measured in its own font (canvas). */
let measureCtx: CanvasRenderingContext2D | null = null;
export function measureRich(text: string, runs: StyleRun[], baseFont: string, fontOf: (s: RunStyle) => string): number {
    measureCtx ??= document.createElement('canvas').getContext('2d');
    const ctx = measureCtx;
    if (!ctx) return text.length * 8;
    let widest = 0;
    let lineStart = 0;
    for (const line of text.split('\n')) {
        let w = 0;
        for (const seg of segments(text.length, runs)) {
            const s = Math.max(seg.start, lineStart), e = Math.min(seg.end, lineStart + line.length);
            if (e <= s) continue;
            ctx.font = seg.run ? fontOf(styleOf(seg.run)) : baseFont;
            w += ctx.measureText(text.slice(s, e)).width;
        }
        widest = Math.max(widest, w);
        lineStart += line.length + 1;
    }
    return widest;
}
