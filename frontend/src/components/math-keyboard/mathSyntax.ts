/**
 * Pure LaTeX helpers for the Sy Pad. No React, no KaTeX — easy to reason about.
 *
 * The pad lets people build an expression one key at a time, so the expression is
 * incomplete most of the time (half-typed commands, unclosed braces while erasing).
 * These helpers keep that from ever reaching the question as broken syntax.
 */

export type MathContext = 'math' | 'chemistry' | 'text';

/** Fired when the pad's target box has been re-rendered away (e.g. switched to preview); the builder inserts by key. */
export const SYPAD_INSERT_EVENT = 'sypad:insert';

const TEXT_COMMANDS = new Set(['text', 'textbf', 'textit', 'textrm', 'textsf', 'mbox']);
const CHEM_COMMANDS = new Set(['ce', 'pu']);

/** What the caret is typing into: plain maths, a \ce{} formula, or a \text{} run of words. */
export function contextAt(expr: string, caret: number): MathContext {
    const frames: (string | null)[] = [];
    let pendingCommand: string | null = null;
    const end = Math.min(caret, expr.length);

    for (let i = 0; i < end; i++) {
        const ch = expr[i];
        if (ch === '\\') {
            let j = i + 1;
            while (j < expr.length && /[a-zA-Z]/.test(expr[j])) j++;
            if (j === i + 1) {
                // Escaped symbol such as \{ or \, — never opens a group.
                i++;
                pendingCommand = null;
                continue;
            }
            pendingCommand = expr.slice(i + 1, j);
            i = j - 1;
            continue;
        }
        if (ch === '{') {
            frames.push(pendingCommand);
            pendingCommand = null;
            continue;
        }
        if (ch === '}') {
            frames.pop();
            pendingCommand = null;
            continue;
        }
        if (ch !== ' ') pendingCommand = null;
    }

    for (let f = frames.length - 1; f >= 0; f--) {
        const name = frames[f];
        if (name && TEXT_COMMANDS.has(name)) return 'text';
        if (name && CHEM_COMMANDS.has(name)) return 'chemistry';
    }
    return 'math';
}

/**
 * Closes whatever is left open so KaTeX can render it: drops a lone trailing
 * backslash and unmatched `}`, gives a dangling ^ or _ an empty group, closes
 * open `{`, and ends any unfinished \begin{...}. Complete input comes back unchanged.
 */
export function balanceLatex(expr: string): string {
    let out = '';
    let depth = 0;
    const envs: string[] = [];

    for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];
        if (ch === '\\') {
            if (i === expr.length - 1) break; // lone trailing backslash
            const next = expr[i + 1];
            if (!/[a-zA-Z]/.test(next)) {
                out += ch + next;
                i++;
                continue;
            }
            let j = i + 1;
            while (j < expr.length && /[a-zA-Z]/.test(expr[j])) j++;
            const name = expr.slice(i + 1, j);
            if (name === 'begin' || name === 'end') {
                const m = /^\{([a-zA-Z*]+)\}/.exec(expr.slice(j));
                if (m) {
                    if (name === 'begin') envs.push(m[1]);
                    else {
                        const at = envs.lastIndexOf(m[1]);
                        if (at !== -1) envs.splice(at, 1);
                    }
                }
            }
            out += expr.slice(i, j);
            i = j - 1;
            continue;
        }
        if (ch === '{') depth++;
        if (ch === '}') {
            if (depth === 0) continue; // unmatched closer
            depth--;
        }
        if ((ch === '^' || ch === '_')) {
            const rest = expr.slice(i + 1).trimStart();
            if (rest === '' || rest[0] === '}') {
                out += ch + '{}';
                continue;
            }
        }
        out += ch;
    }

    out += '}'.repeat(depth);
    for (let e = envs.length - 1; e >= 0; e--) out += `\\end{${envs[e]}}`;
    return out;
}

/** Final clean-up before an expression leaves the pad (Insert / Copy). */
export function finalizeLatex(expr: string): string {
    // A dangling ^ or _ at the very end means "nothing typed yet" — drop it rather than keep an empty group.
    const trimmed = expr.replace(/\s+$/, '').replace(/(?<!\\)[\^_]$/, '');
    return balanceLatex(trimmed)
        .replace(/(?<!\\)[\^_]\{\}$/, '')
        .replace(/(\\[,;:! ]|\s)+$/, '');
}

/** Placeholder boxes are a bare `?` sitting between delimiters, e.g. \frac{?}{?}, (?,?), ? & ?. */
const SLOT = /(^|[{(,|&\s])\?(?=$|[}),|&\s\\])/g;

export function countEmptySlots(expr: string): number {
    return (expr.match(SLOT) || []).length;
}

export function clearEmptySlots(expr: string): string {
    return expr.replace(SLOT, '$1');
}

/** Index of the first empty slot's `?`, or -1. */
export function firstEmptySlot(expr: string): number {
    SLOT.lastIndex = 0;
    const m = SLOT.exec(expr);
    SLOT.lastIndex = 0;
    return m ? m.index + m[1].length : -1;
}

/**
 * Backspace that removes whole tokens: `\alpha `, `\,`, an empty `\sqrt{}` or `x^{}`
 * go in one press, so erasing never leaves half a command behind.
 */
export function smartBackspace(expr: string, start: number, end: number): { expr: string; caret: number } {
    if (start !== end) {
        return { expr: expr.slice(0, start) + expr.slice(end), caret: start };
    }
    if (start === 0) return { expr, caret: 0 };

    const before = expr.slice(0, start);
    const after = expr.slice(start);

    // Caret inside an empty group: remove the group together with what owns it.
    if (before.endsWith('{') && after.startsWith('}')) {
        const owner = /(\\[a-zA-Z]+\s*(?:\[[^\]]*\])?|[\^_])?\{$/.exec(before);
        const cut = owner ? owner[0].length : 1;
        return { expr: before.slice(0, before.length - cut) + after.slice(1), caret: start - cut };
    }

    const patterns = [
        /\\[a-zA-Z]+\s?$/,          // \alpha, \times , \Delta
        /\\[,;:!> ]$/,              // spacing commands
        /\\[{}%$&#_|\\]$/,          // escaped symbols and \\ row breaks
    ];
    for (const p of patterns) {
        const m = p.exec(before);
        if (m) {
            return { expr: before.slice(0, before.length - m[0].length) + after, caret: start - m[0].length };
        }
    }

    return { expr: before.slice(0, -1) + after, caret: start - 1 };
}
