import katex from 'katex';
import 'katex/dist/contrib/mhchem';
import { katexTrust } from '@/utils/sanitize';

/* Maths that would show in red, or show wrongly, with a fix the creator can accept in one
   tap (AI review screen and test builder). A fix is only offered once KaTeX has rendered
   it, so accepting one never turns a formula red. */

// Control characters left where JSON decoded an unescaped LaTeX command
// ("\frac" -> form feed + "rac", "\text" -> tab + "ext", "\beta" -> backspace + "eta").
export function restoreDecodedCommands(text: string): string {
    return text
        // eslint-disable-next-line no-control-regex -- matching these control characters is the point
        .replace(/\x0c(?=[A-Za-z])/g, '\\f')
        // eslint-disable-next-line no-control-regex -- as above
        .replace(/\x08(?=[A-Za-z])/g, '\\b')
        .replace(/\t(ext|extbf|extit|extrm|imes|heta|an|anh|au|frac|ilde|o|op|riangle|herefore)(?![A-Za-z])/g, '\\t$1')
        .replace(/\r(ight|ho|ightarrow|angle|ceil|floor|m)(?![A-Za-z])/g, '\\r$1');
}

/**
 * Math written with every command over-escaped ("\\frac", "47^\\circ") renders as a line
 * break followed by the plain word, or as a red error. When a block has such commands and
 * no correctly escaped ones, halve each even run of backslashes. Mirrors the importer's
 * backend normaliser, so questions saved before that fix display correctly too.
 */
export function repairOverEscapedMath(tex: string): string {
    if (!/(?<!\\)\\\\[A-Za-z]{2}/.test(tex) || /(?<!\\)\\[A-Za-z]{2}/.test(tex)) return tex;
    return tex.replace(/\\+/g, run => (run.length % 2 === 0 ? run.slice(0, run.length / 2) : run));
}

export interface LatexIssue {
    /** Same text, same fix: one key, so "keep as written" covers every copy. */
    key: string;
    /** "Won't display", "Shows wrong", "Missing $". */
    title: string;
    /** Why, in a few words. */
    reason: string;
    /** As written, delimiters included. */
    original: string;
    /** What replaces it; renders on its own. */
    replacement: string;
    /** The whole text with this one fix made. */
    next: string;
}

// ── Does it render? ──────────────────────────────────────────────────────────

const KATEX_OPTIONS = { throwOnError: true, strict: false, trust: katexTrust } as const;
const renderCache = new Map<string, boolean>();

/** Whether LatexRenderer would draw this formula (not the red error). */
function renders(tex: string): boolean {
    let ok = renderCache.get(tex);
    if (ok === undefined) {
        // The renderer's own repairs, so a formula it already rescues is not flagged.
        const prepared = repairOverEscapedMath(tex.replace(/(?<!\\)\bce\{/g, '\\ce{'));
        try {
            katex.renderToString(prepared, KATEX_OPTIONS);
            ok = true;
        } catch {
            ok = false;
        }
        if (renderCache.size > 2000) renderCache.clear();
        renderCache.set(tex, ok);
    }
    return ok;
}

// ── Repairs ──────────────────────────────────────────────────────────────────

type Repair = { reason: string; fix: (tex: string) => string };

const TEXT_ARG = /\\(text(?:bf|it|rm|sf|tt|normal|up)?|mbox)\{([^{}$]*)\}/g;

/** Commands KaTeX doesn't know that AI and Word paste in, with ones it does. */
const SUBSTITUTES: Record<string, string> = {
    textdegree: '^{\\circ}',
    degreecelsius: '^{\\circ}\\text{C}',
    celsius: '^{\\circ}\\text{C}',
    textmu: '\\mu',
    micro: '\\mu',
    ohm: '\\Omega',
};

/** Drops a } that closes nothing and closes any { left open. */
function balanceBraces(tex: string): string {
    let depth = 0;
    let out = '';
    for (let i = 0; i < tex.length; i++) {
        const c = tex[i];
        if (c === '\\') {
            out += c + (tex[i + 1] ?? '');
            i++;
            continue;
        }
        if (c === '}') {
            if (depth === 0) continue;
            depth--;
        } else if (c === '{') {
            depth++;
        }
        out += c;
    }
    return out + '}'.repeat(depth);
}

/** For a formula KaTeX rejects, tried in order until one renders. */
const REPAIRS: Repair[] = [
    {
        // \text{_____}: a blank line, the commonest AI slip.
        reason: 'Inside \\text{ }, each _ of a blank needs a \\ before it',
        fix: tex => tex.replace(TEXT_ARG, (_m, cmd: string, body: string) =>
            `\\${cmd}{${body.replace(/(?<!\\)_{2,}|(?<!\\)_(?![A-Za-z0-9{])/g, run => run.replace(/_/g, '\\_'))}}`),
    },
    {
        reason: 'Inside \\text{ }, &, # and % need a \\ in front',
        fix: tex => tex.replace(TEXT_ARG, (_m, cmd: string, body: string) => `\\${cmd}{${body.replace(/(?<!\\)([&#%])/g, '\\$1')}}`),
    },
    { reason: '& on its own needs a \\ in front', fix: tex => (/\\begin\{/.test(tex) ? tex : tex.replace(/(?<!\\)&/g, '\\&')) },
    { reason: '# needs a \\ in front', fix: tex => tex.replace(/(?<!\\)#/g, '\\#') },
    {
        reason: 'Uses a command the maths display doesn’t know',
        fix: tex => tex.replace(/\\([A-Za-z]+)(?![A-Za-z])/g, (m, name: string) => SUBSTITUTES[name] ?? m),
    },
    { reason: 'A { or } is missing', fix: balanceBraces },
];

/** For a formula that renders, but not as written. */
const SILENT_REPAIRS: Repair[] = [
    { reason: '% hides everything after it; write \\%', fix: tex => tex.replace(/(?<!\\)%/g, '\\%') },
    {
        // 10^-3 shows as 10⁻3 and x^10 as x¹0.
        reason: 'A power or subscript longer than one character needs { }',
        fix: tex => (/\\(ce|pu)\{/.test(tex)
            ? tex
            : tex.replace(/(?<!\\)([\^_])(-?\d+(?:\.\d+)?|-[A-Za-z])/g, (m, op: string, arg: string) => (arg.length > 1 ? `${op}{${arg}}` : m))),
    },
];

function applyRepairs(tex: string, repairs: Repair[], stopWhenRenders: boolean): { tex: string; reasons: string[] } {
    let current = tex;
    const reasons: string[] = [];
    for (const repair of repairs) {
        const next = repair.fix(current);
        if (next === current) continue;
        current = next;
        reasons.push(repair.reason);
        if (stopWhenRenders && renders(current)) break;
    }
    return { tex: current, reasons };
}

/** A formula as it should be written, or null when it is fine (or beyond a safe fix). */
function fixTex(tex: string): { tex: string; title: string; reasons: string[] } | null {
    let title = 'Shows wrong';
    let current = tex;
    const reasons: string[] = [];
    if (!renders(tex)) {
        const repaired = applyRepairs(tex, REPAIRS, true);
        if (!renders(repaired.tex)) return null;
        title = 'Won’t display';
        current = repaired.tex;
        reasons.push(...repaired.reasons);
    }
    const polished = applyRepairs(current, SILENT_REPAIRS, false);
    if (polished.tex !== current && renders(polished.tex)) {
        current = polished.tex;
        reasons.push(...polished.reasons);
    }
    return current === tex ? null : { tex: current, title, reasons };
}

// ── Where the maths is ───────────────────────────────────────────────────────

/** Same patterns, same order as LatexRenderer, so both agree on what is maths. */
const MATH_PATTERNS = [
    /(?<!\\)\$\$\s*([\s\S]*?)\s*(?<!\\)\$\$/g,
    /\\\[([\s\S]*?)\\\]/g,
    /(?<!\\)\$((?:\\\$|[^$])*?)(?<!\\)\$/g,
    /\\\(([\s\S]*?)\\\)/g,
];
const MASK = '\u0000';

interface MathBlock { start: number; end: number; open: string; tex: string; close: string }

/** The maths blocks, and the text with each one blanked out (same length). */
function findMath(text: string): { blocks: MathBlock[]; masked: string } {
    const blocks: MathBlock[] = [];
    let masked = text;
    for (const pattern of MATH_PATTERNS) {
        masked = masked.replace(pattern, (whole: string, tex: string, at: number) => {
            const texAt = whole.indexOf(tex, whole.startsWith('$$') || whole.startsWith('\\') ? 2 : 1);
            blocks.push({ start: at, end: at + whole.length, open: whole.slice(0, texAt), tex, close: whole.slice(texAt + tex.length) });
            return MASK.repeat(whole.length);
        });
    }
    return { blocks, masked };
}

// ── Maths written outside $ … $ ──────────────────────────────────────────────

type WordKind = 'tex' | 'escaped' | 'number' | 'operator' | 'letter' | 'plain';
interface Word { start: number; end: number; text: string; kind: WordKind; open: number }

const COMMAND = /\\[A-Za-z]{2,}/;
const SCRIPT = /[\^_]\{|[\w)\]}]\^-?\w/;
const NOT_MATHS = /!\[|\]\(|https?:|www\./;

function wordKind(w: string): WordKind {
    if (NOT_MATHS.test(w)) return 'plain';
    if (COMMAND.test(w) || SCRIPT.test(w)) return 'tex';
    if (/\\[_%&#]/.test(w)) return 'escaped';
    if (/^[-+]?\d+(?:[.,]\d+)?$/.test(w)) return 'number';
    if (/^(?:[-+=<>×÷−±*/]|<=|>=|!=)$/.test(w)) return 'operator';
    if (/^[A-Za-z]$/.test(w)) return 'letter';
    return 'plain';
}

/** Only spaces between two words: no line break, no maths block. */
const joinable = (masked: string, a: { end: number }, b: { start: number }) => /^[ \t]+$/.test(masked.slice(a.end, b.start));

/** Braces opened minus closed. */
const braceDepth = (s: string) => (s.match(/(?<!\\)\{/g) || []).length - (s.match(/(?<!\\)\}/g) || []).length;

/** Runs of words that look like LaTeX, with the numbers and operators around them. */
function texRuns(words: Word[], masked: string): Array<[number, number]> {
    const runs: Array<[number, number]> = [];
    let i = 0;
    while (i < words.length) {
        if (words[i].kind !== 'tex') { i++; continue; }
        let a = i;
        let b = i;
        // Later LaTeX words join across numbers and operators ("5 \times 10^{-3}").
        for (let j = i + 1; j < words.length && joinable(masked, words[j - 1], words[j]); j++) {
            const k = words[j].kind;
            if (k === 'tex') b = j;
            else if (k !== 'number' && k !== 'operator' && k !== 'letter') break;
        }
        const glue = (k: WordKind) => k === 'number' || k === 'operator';
        while (a > 0 && joinable(masked, words[a - 1], words[a])
            && (glue(words[a - 1].kind) || (words[a - 1].kind === 'letter' && words[a].kind === 'operator'))) a--;
        while (b < words.length - 1 && joinable(masked, words[b], words[b + 1])
            && (glue(words[b + 1].kind) || (words[b + 1].kind === 'letter' && words[b].kind === 'operator'))) b++;
        // An operator left hanging at either end belongs to the sentence, not the formula.
        while (words[a].kind === 'operator' && a < b) a++;
        while (words[b].kind === 'operator' && b > a) b--;
        runs.push([a, b]);
        i = b + 1;
    }
    return runs;
}

/** Trailing full stops and unmatched brackets stay in the sentence. */
function trimRun(text: string, start: number, end: number): [number, number] {
    for (;;) {
        const s = text.slice(start, end);
        const opens = (s.match(/\(/g) || []).length;
        const closes = (s.match(/\)/g) || []).length;
        if (/[.,;:!?]$/.test(s) && !/\\[.,;:!?]$/.test(s)) end--;
        else if (s.endsWith(')') && closes > opens) end--;
        else if (s.startsWith('(') && opens > closes) start++;
        else return [start, end];
    }
}

// ── All of it ────────────────────────────────────────────────────────────────

const issueCache = new Map<string, LatexIssue[]>();

/** Every formula in `text` that has a safe fix, in reading order. */
export function findLatexIssues(input: string): LatexIssue[] {
    if (!input || !/[\\$^%&#]/.test(input)) return [];
    const cached = issueCache.get(input);
    if (cached) return cached;

    const text = restoreDecodedCommands(input);
    const { blocks, masked } = findMath(text);
    const found: Array<Omit<LatexIssue, 'key' | 'next'> & { start: number; end: number }> = [];

    for (const block of blocks) {
        if (!block.tex.trim() || /\\begin\{array\}|!\[|\\vspace/.test(block.tex)) continue;
        const fixed = fixTex(block.tex);
        if (!fixed) continue;
        found.push({
            start: block.start,
            end: block.end,
            title: fixed.title,
            reason: fixed.reasons.join(' · '),
            original: text.slice(block.start, block.end),
            replacement: block.open + fixed.tex + block.close,
        });
    }

    // A lone $ is a formula still being typed (or money): leave the plain text alone.
    if (!/(?<!\\)\$/.test(masked)) {
        const words: Word[] = [];
        // eslint-disable-next-line no-control-regex -- the mask character splits words at a formula
        for (const m of masked.matchAll(/[^\s\u0000]+/g)) {
            const at = m.index ?? 0;
            const last = words[words.length - 1];
            // "\text{ mL}", "\textbf{Assertion (A):}": braces holding spaces stay one word.
            if (last && last.open > 0 && joinable(masked, last, { start: at })) {
                last.end = at + m[0].length;
                last.text = text.slice(last.start, last.end);
                last.open += braceDepth(m[0]);
                continue;
            }
            words.push({ start: at, end: at + m[0].length, text: m[0], kind: 'plain', open: braceDepth(m[0]) });
        }
        words.forEach(w => { w.kind = wordKind(w.text); });
        for (const [a, b] of texRuns(words, masked)) {
            const [start, end] = trimRun(text, words[a].start, words[b].end);
            if (end <= start) continue;
            const run = text.slice(start, end);
            const plain = run.match(/^\\text\{([^{}$]*)\}$/);
            let replacement: string;
            let reason: string;
            if (plain) {
                // \text{_____} or \text{ mL} outside maths: it was only ever words.
                replacement = plain[1].replace(/\\([_%&#])/g, '$1');
                reason = '\\text{ } outside $ … $ shows as code';
            } else {
                const tex = repairOverEscapedMath(run);
                const fixed = renders(tex) ? { tex, reasons: [] as string[] } : applyRepairs(tex, REPAIRS, true);
                if (!renders(fixed.tex)) continue;
                const polished = applyRepairs(fixed.tex, SILENT_REPAIRS, false);
                const usePolished = renders(polished.tex);
                // Touching another formula, a space keeps "$…$$…$" from reading as $$.
                const before = masked[start - 1] === MASK ? ' ' : '';
                const after = masked[end] === MASK ? ' ' : '';
                replacement = `${before}$${usePolished ? polished.tex : fixed.tex}$${after}`;
                reason = ['Maths needs $ before and after it', ...fixed.reasons, ...(usePolished ? polished.reasons : [])].join(' · ');
            }
            found.push({ start, end, title: 'Missing $', reason, original: run, replacement });
        }
        for (const w of words) {
            if (w.kind !== 'escaped') continue;
            found.push({
                start: w.start,
                end: w.end,
                title: 'Shows wrong',
                reason: 'Outside $ … $ the \\ shows as it is',
                original: w.text,
                replacement: w.text.replace(/\\([_%&#])/g, '$1'),
            });
        }
    }

    const issues = found
        .filter(f => f.replacement !== f.original)
        .sort((x, y) => x.start - y.start)
        .map(({ start, end, ...f }) => ({
            ...f,
            key: `${f.original}\u0001${f.replacement}`,
            next: text.slice(0, start) + f.replacement + text.slice(end),
        }));
    if (issueCache.size > 500) issueCache.clear();
    issueCache.set(input, issues);
    return issues;
}

// ── "Keep as written" ────────────────────────────────────────────────────────
// Remembered for the visit, across both screens, so a dismissed fix stays dismissed
// when a card remounts or the review screen hands over to the builder.

const kept = new Set<string>();
const listeners = new Set<() => void>();
let keptVersion = 0;

export function keepAsWritten(key: string) {
    kept.add(key);
    keptVersion++;
    listeners.forEach(fn => fn());
}

export const isKept = (key: string) => kept.has(key);

/** For useSyncExternalStore. */
export function subscribeKept(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
export const getKeptVersion = () => keptVersion;
