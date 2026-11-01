/**
 * Turns whatever people paste — ChatGPT / Gemini answers, copy-paste mangled
 * maths, or a full LaTeX document — into Markdown that remark-math + KaTeX
 * render correctly.
 *
 * Things it repairs (all seen in real pastes):
 *  - \( … \) and \[ … \] delimiters (ChatGPT's default), which remark-math ignores
 *  - "[ … ]" / "( … )" left behind when copying ChatGPT's rendered maths drops the backslashes
 *  - $$…$$ written inline in a sentence (Gemini) and $$ fences sharing a line with maths
 *  - align/equation/matrix/cases environments written outside any math delimiters
 *  - bare \ce{…} chemistry, bare "\frac{a}{b} = c" lines
 *  - "$5 and $10" currency being mistaken for maths
 *  - '|' inside maths breaking GFM table rows
 *  - JSON-escaped pastes where every backslash is doubled
 *  - \newcommand / \def / \DeclareMathOperator definitions (turned into KaTeX macros)
 *  - complete LaTeX documents (\documentclass … \end{document})
 */

export interface NormalizeResult {
    markdown: string;
    macros: Record<string, string>;
    /** Human-readable list of repairs applied (shown as hints in the UI). */
    notes: string[];
}

/** Must match PAGE_BREAK_MARK in documentStyle.ts. */
const PAGE_BREAK = '⟨page-break⟩';

const MATH_ENVS = 'equation|align|alignat|gather|multline|flalign|eqnarray|displaymath|math|split';
const MATRIX_ENVS = '[pbBvV]?matrix|smallmatrix|cases|dcases|rcases|array|aligned|alignedat|gathered|subarray';

export function normalizeMath(input: string): NormalizeResult {
    const notes = new Set<string>();
    const macros: Record<string, string> = {};
    let s = input.replace(/\r\n?/g, '\n').replace(/ /g, ' ').replace(/[​﻿]/g, '');

    // JSON-escaped text: "\\frac{a}{b}" everywhere instead of "\frac{a}{b}".
    const doubled = (s.match(/\\\\[a-zA-Z]{2,}/g) || []).length;
    const single = (s.match(/(?<!\\)\\[a-zA-Z]{2,}/g) || []).length;
    if (doubled >= 3 && doubled > single * 0.8) {
        s = s.replace(/\\\\/g, '\\');
        notes.add('Removed doubled backslashes');
    }

    // ---- Protect code (except LaTeX in code fences, which we unwrap)
    const code: string[] = [];
    const protect = (t: string) => `\u0000C${code.push(t) - 1}\u0000`;
    s = s.replace(/^(```|~~~)[ \t]*([\w+-]*)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm, (m, _fence, lang: string, body: string) => {
        if (/^(latex|tex|math|katex)$/i.test(lang) || (!lang && looksLikeLatex(body))) {
            notes.add('Unwrapped LaTeX from a code block');
            return body;
        }
        return protect(m);
    });
    s = s.replace(/`[^`\n]+`/g, (m) => protect(m));

    // ---- Full LaTeX documents
    if (/\\documentclass|\\begin\{document\}/.test(s) || (s.match(/\\(section|subsection|maketitle|begin\{(itemize|enumerate|tabular)\})/g) || []).length >= 2) {
        s = latexToMarkdown(s, macros);
        notes.add('Converted a LaTeX document');
    }

    // ---- Macro definitions anywhere; explicit page breaks on their own line
    s = extractMacros(s, macros);
    s = s.replace(/^[ \t]*\\(newpage|pagebreak|clearpage)[ \t]*$/gm, `\n${PAGE_BREAK}\n`);

    // ---- Delimiters: \[ \] and \( \)
    s = s.replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_m, body: string) => {
        notes.add('Converted \\[ … \\] to display maths');
        return `\n$$\n${body.trim()}\n$$\n`;
    });
    s = s.replace(/(?<!\\)\\\(([\s\S]+?)(?<!\\)\\\)/g, (_m, body: string) => {
        notes.add('Converted \\( … \\) to inline maths');
        return `$${body.trim()}$`;
    });

    // ---- ChatGPT copy-paste damage: display maths left as "[" … "]" lines
    s = s.replace(/^[ \t]*\[[ \t]*\n([\s\S]*?)\n[ \t]*\][ \t]*$/gm, (m, body: string) => {
        if (!mathy(body)) return m;
        notes.add('Restored display maths that lost its backslashes');
        return `$$\n${body.trim()}\n$$`;
    });
    s = s.replace(/^[ \t]*\[ (.+) \][ \t]*$/gm, (m, body: string) => {
        if (!mathy(body)) return m;
        notes.add('Restored display maths that lost its backslashes');
        return `$$\n${body.trim()}\n$$`;
    });
    // …and inline maths left as "( x^2 )" with padding spaces
    s = s.replace(/(^|[^\w$\\])\( ((?:[^()\n]|\([^()\n]*\))+?) \)/gm, (m, pre: string, body: string) => {
        if (!/\\[a-zA-Z]+|[\^_]\{|[\^_][a-zA-Z0-9]/.test(body)) return m;
        notes.add('Restored inline maths that lost its backslashes');
        return `${pre}$${body.trim()}$`;
    });

    // ---- Whole lines of bare LaTeX maths ("\frac{a}{b} = c" with no delimiters)
    s = wrapBareMathLines(s, notes);

    // ---- Tokenise into maths / text so later fixes only touch the right parts
    const segs = tokenize(s);
    let out = '';
    for (const seg of segs) {
        if (seg.kind === 'display') out += `\n$$\n${cleanMath(seg.text)}\n$$\n`;
        else if (seg.kind === 'inline') out += `$${cleanMath(seg.text)}$`;
        else out += fixText(seg.text, notes);
    }
    s = out;

    // ---- Tables: '|' inside inline maths breaks GFM cells
    s = s
        .split('\n')
        .map((line) => (/^\s*\|/.test(line) ? line.replace(/\$([^$\n]+)\$/g, (_m, b: string) => `$${b.replace(/\\\|/g, '\\Vert ').replace(/\|/g, '\\vert ')}$`) : line))
        .join('\n');

    // ---- Tidy: collapse 3+ blank lines, restore code
    s = s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
    s = s.replace(/\u0000C(\d+)\u0000/g, (_m, i: string) => code[+i]);
    return { markdown: s, macros, notes: [...notes] };
}

// ---------------------------------------------------------------------------

function looksLikeLatex(t: string): boolean {
    return /\\(documentclass|begin\{|section|frac|sqrt|sum|int|alpha|beta|mathbb|textbf)|\$\$/.test(t);
}

/** Removes {…} groups (arguments), leaving the top-level text. */
const stripGroups = (t: string) => {
    let out = '';
    let depth = 0;
    for (const ch of t) {
        if (ch === '{') depth++;
        else if (ch === '}') depth = Math.max(0, depth - 1);
        else if (!depth) out += ch;
    }
    return out;
};

/** Heuristic: does this text read like maths rather than prose? */
function mathy(t: string): boolean {
    if (!/\\[a-zA-Z]+|[\^_]\{|[=+\-*/<>]/.test(t)) return false;
    // Prose has several plain words outside command arguments.
    const words = stripGroups(t.replace(/\\[a-zA-Z]+/g, ' ')).match(/[A-Za-zऀ-ॿ]{2,}/g) || [];
    return words.length <= 2;
}

/**
 * Wraps whole lines that are clearly bare LaTeX maths in $$. Skips fenced
 * maths, lines inside \begin…\end environments (wrapped later as a unit) and
 * lines that already contain '$'.
 */
function wrapBareMathLines(s: string, notes: Set<string>): string {
    let inFence = false;
    let envDepth = 0;
    return s
        .split('\n')
        .map((line) => {
            const l = line.trim();
            if (l === '$$') {
                inFence = !inFence;
                return line;
            }
            const begins = (l.match(/\\begin\{/g) || []).length;
            const ends = (l.match(/\\end\{/g) || []).length;
            const inside = envDepth > 0 || begins > 0;
            envDepth = Math.max(0, envDepth + begins - ends);
            if (inFence || inside || !l || /\$|\u0000/.test(l) || /^[#>|*\-+]|^\d+[.)]\s/.test(l)) return line;
            if (/\\(frac|dfrac|tfrac|sqrt|sum|int|oint|lim|prod|left|right|cdot|times|leq|geq|neq|infty|partial|nabla|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|vec|hat|bar)\b|[\^_]\{/.test(l) && mathy(l)) {
                notes.add('Wrapped bare LaTeX lines as maths');
                return `\n$$\n${l}\n$$\n`;
            }
            return line;
        })
        .join('\n');
}

type Seg = { kind: 'text' | 'inline' | 'display'; text: string };

/**
 * Splits text into maths and non-maths using Pandoc's rules for single '$':
 * an opening '$' must be followed by a non-space, a closing '$' preceded by a
 * non-space and not followed by a digit — so "$5 and $10" stays text.
 */
function tokenize(s: string): Seg[] {
    const segs: Seg[] = [];
    let text = '';
    let i = 0;
    const flush = () => {
        if (text) segs.push({ kind: 'text', text });
        text = '';
    };
    while (i < s.length) {
        const c = s[i];
        if (c === '\\' && i + 1 < s.length) {
            text += c + s[i + 1];
            i += 2;
            continue;
        }
        if (c === '\u0000') {
            const end = s.indexOf('\u0000', i + 1);
            text += s.slice(i, end + 1);
            i = end + 1;
            continue;
        }
        if (c === '$' && s[i + 1] === '$') {
            const close = findUnescaped(s, '$$', i + 2);
            if (close > 0) {
                flush();
                segs.push({ kind: 'display', text: s.slice(i + 2, close) });
                i = close + 2;
                continue;
            }
        }
        if (c === '$' && s[i + 1] && !/\s/.test(s[i + 1])) {
            let j = i + 1;
            let found = -1;
            while (j < s.length) {
                if (s[j] === '\\') {
                    j += 2;
                    continue;
                }
                if (s[j] === '\n' && s[j + 1] === '\n') break; // no maths across paragraphs
                if (s[j] === '$') {
                    if (!/\s/.test(s[j - 1]) && !/\d/.test(s[j + 1] ?? '') && s[j + 1] !== '$') found = j;
                    break;
                }
                j++;
            }
            if (found > 0) {
                flush();
                segs.push({ kind: 'inline', text: s.slice(i + 1, found) });
                i = found + 1;
                continue;
            }
            // A lone '$' (currency): make it literal so remark-math leaves it alone.
            text += '\\$';
            i++;
            continue;
        }
        text += c;
        i++;
    }
    flush();
    return segs;
}

function findUnescaped(s: string, needle: string, from: number): number {
    let i = from;
    while (i < s.length) {
        const k = s.indexOf(needle, i);
        if (k < 0) return -1;
        let bs = 0;
        for (let j = k - 1; j >= 0 && s[j] === '\\'; j--) bs++;
        if (bs % 2 === 0) return k;
        i = k + 1;
    }
    return -1;
}

/** Fixes inside a maths segment. */
function cleanMath(m: string): string {
    let t = m.trim();
    t = t.replace(/\\label\{[^}]*\}/g, '');
    // Markdown-escaped subscripts from rich-text copies: "x\_1" -> "x_1" (only if no real '_').
    if (/\\_/.test(t) && !/(?<!\\)_/.test(t)) t = t.replace(/\\_/g, '_');
    // eqnarray is not in KaTeX: an rcl array looks the same.
    t = t.replace(/\\begin\{eqnarray\*?\}/g, '\\begin{array}{rcl}').replace(/\\end\{eqnarray\*?\}/g, '\\end{array}');
    // Stand-alone math environments: KaTeX wants them without extra wrapping.
    return t;
}

/** Fixes inside prose. */
function fixText(t: string, notes: Set<string>): string {
    // Maths wrapped here is held aside so the command pass below can't wrap inside it again.
    const held: string[] = [];
    const hold = (m: string) => `\u0002${held.push(m) - 1}\u0002`;
    // Math environments written outside any delimiters.
    const envRe = new RegExp(`\\\\begin\\{(${MATH_ENVS}|${MATRIX_ENVS})(\\*?)\\}([\\s\\S]*?)\\\\end\\{\\1\\2\\}`, 'g');
    t = t.replace(envRe, (m, env: string, _star: string, body: string) => {
        notes.add('Wrapped a maths environment for rendering');
        if (env === 'math') return hold(`$${body.trim()}$`);
        if (env === 'displaymath') return hold(`\n$$\n${body.trim()}\n$$\n`);
        return hold(`\n$$\n${cleanMath(m)}\n$$\n`);
    });
    // Bare chemistry.
    t = t.replace(/(?<![\w$\\])\\ce\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_m, b: string) => {
        notes.add('Wrapped chemistry (\\ce) for rendering');
        return hold(`$\\ce{${b}}$`);
    });
    return wrapInlineCommands(t, notes).replace(/\u0002(\d+)\u0002/g, (_m, i: string) => held[+i]);
}

const INLINE_CMDS =
    'frac|dfrac|tfrac|sqrt|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Pi|Sigma|Phi|Psi|Omega|times|cdot|div|pm|mp|leq|geq|neq|approx|equiv|infty|partial|nabla|degree|circ|vec|hat|bar|overline|mathbb|mathrm|sum|int|lim|log|ln|sin|cos|tan|rightarrow|leftarrow|Rightarrow|to';

/** "where \alpha is the angle" -> "where $\alpha$ is the angle" (commands with their arguments). */
function wrapInlineCommands(t: string, notes: Set<string>): string {
    const re = new RegExp(`\\\\(?:${INLINE_CMDS})(?![a-zA-Z])`, 'g');
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
        let end = m.index + m[0].length;
        // Swallow argument groups and immediate sub/superscripts: \frac{a}{b}, \sqrt[3]{x}, \alpha_1^2
        for (;;) {
            if (t[end] === '[') {
                const close = t.indexOf(']', end);
                if (close < 0) break;
                end = close + 1;
            } else if (t[end] === '{') {
                end = group(t, end)[1];
            } else if ((t[end] === '_' || t[end] === '^') && t[end + 1]) {
                end = t[end + 1] === '{' ? group(t, end + 1)[1] : end + 2;
            } else break;
        }
        out += t.slice(last, m.index) + `$${t.slice(m.index, end)}$`;
        last = end;
        re.lastIndex = end;
        notes.add('Wrapped LaTeX commands found in text');
    }
    return out + t.slice(last);
}

function extractMacros(s: string, macros: Record<string, string>): string {
    // \newcommand{\R}{\mathbb{R}}  \renewcommand\x[1]{...}  \def\foo{...}  \DeclareMathOperator{\tr}{tr}
    const group = '\\{((?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*)\\}';
    s = s.replace(new RegExp(`\\\\(?:re)?newcommand\\*?\\s*\\{?\\s*(\\\\[a-zA-Z]+)\\s*\\}?\\s*(?:\\[(\\d)\\])?\\s*${group}`, 'g'), (_m, name: string, _n: string, body: string) => {
        macros[name] = body;
        return '';
    });
    s = s.replace(new RegExp(`\\\\def\\s*(\\\\[a-zA-Z]+)\\s*(?:#\\d)*\\s*${group}`, 'g'), (_m, name: string, body: string) => {
        macros[name] = body;
        return '';
    });
    s = s.replace(new RegExp(`\\\\DeclareMathOperator\\*?\\s*\\{\\s*(\\\\[a-zA-Z]+)\\s*\\}\\s*${group}`, 'g'), (_m, name: string, body: string) => {
        macros[name] = `\\operatorname{${body}}`;
        return '';
    });
    return s;
}

// ---------------------------------------------------------------------------
// LaTeX document -> Markdown

/** Reads a balanced {…} group starting at s[i] === '{'; returns [content, indexAfter]. */
function group(s: string, i: number): [string, number] {
    if (s[i] !== '{') return ['', i];
    let depth = 0;
    for (let j = i; j < s.length; j++) {
        if (s[j] === '\\') {
            j++;
            continue;
        }
        if (s[j] === '{') depth++;
        else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
}

/** Replaces \cmd{arg} (balanced) using fn(arg). */
function replaceCmd(s: string, cmd: string, fn: (arg: string) => string): string {
    const re = new RegExp(`\\\\${cmd}\\*?\\s*(?=\\{)`, 'g');
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
        const [arg, end] = group(s, m.index + m[0].length);
        out += s.slice(last, m.index) + fn(arg);
        last = end;
        re.lastIndex = end;
    }
    return out + s.slice(last);
}

export function latexToMarkdown(src: string, macros: Record<string, string> = {}): string {
    let s = src;
    // Comments (unescaped %) — but not inside \url{…}.
    s = s.replace(/(^|[^\\])%.*$/gm, '$1');

    let title = '', author = '', date = '';
    s = replaceCmd(s, 'title', (a) => ((title = a), ''));
    s = replaceCmd(s, 'author', (a) => ((author = a.replace(/\\and/g, ',').replace(/\\\\/g, ', ')), ''));
    s = replaceCmd(s, 'date', (a) => ((date = a.replace(/\\today/g, new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))), ''));

    s = extractMacros(s, macros);
    const body = /\\begin\{document\}([\s\S]*?)(\\end\{document\}|$)/.exec(s);
    if (body) s = body[1];

    // Protect maths: the text-mode rules below (\\ breaks, \{ escapes, --) must not touch it.
    const mathStore: string[] = [];
    const keep = (m: string) => `\u0001M${mathStore.push(m) - 1}\u0001`;
    s = s.replace(new RegExp(`\\\\begin\\{(${MATH_ENVS}|${MATRIX_ENVS})(\\*?)\\}[\\s\\S]*?\\\\end\\{\\1\\2\\}`, 'g'), keep);
    s = s.replace(/\$\$[\s\S]+?\$\$|(?<!\\)\\\[[\s\S]+?(?<!\\)\\\]|(?<!\\)\\\([\s\S]+?(?<!\\)\\\)|(?<!\\)\$(?:\\.|[^$\\\n])+?\$/g, keep);

    // Text-mode symbols (before lists/tables, which emit Markdown like "---").
    s = s
        .replace(/---/g, '—')
        .replace(/--/g, '–')
        .replace(/``/g, '“')
        .replace(/''/g, '”')
        .replace(/(?<!\\)~/g, ' ')
        .replace(/\\([%&#_{}])/g, (_m, c: string) => (c === '&' ? '\u0003' : c))
        .replace(/\\ldots\b|\\dots\b/g, '…');

    // Preamble-ish and layout commands with no visual meaning here.
    s = s.replace(/\\(usepackage|documentclass|geometry|pagestyle|thispagestyle|setlength|setcounter|bibliographystyle|hypersetup|graphicspath)(\[[^\]]*\])?(\{[^}]*\})*/g, '');
    s = s.replace(/\\(noindent|centering|raggedright|raggedleft|small|large|Large|LARGE|huge|Huge|normalsize|footnotesize|scriptsize|tiny|bigskip|medskip|smallskip|hfill|vfill|par(?![a-z])|indent|tableofcontents|clearpage)\b/g, (m) => (m === '\\par' ? '\n\n' : ''));
    s = s.replace(/\\(vspace|hspace)\*?\{[^}]*\}/g, '');
    s = s.replace(/\\(newpage|pagebreak)\b/g, `\n\n${PAGE_BREAK}\n\n`);
    s = s.replace(/\\maketitle\b/g, () => {
        const parts = [title && `# ${title}`, author && `*${author}*`, date && `*${date}*`].filter(Boolean);
        return parts.length ? `\n\n${parts.join('\n\n')}\n\n` : '';
    });

    // Sections
    const heads: [string, string][] = [['part', '#'], ['chapter', '#'], ['section', '##'], ['subsection', '###'], ['subsubsection', '####'], ['paragraph', '#####']];
    for (const [cmd, h] of heads) s = replaceCmd(s, cmd, (a) => `\n\n${h} ${a.trim()}\n\n`);

    // Inline formatting
    s = replaceCmd(s, 'textbf', (a) => `**${a}**`);
    s = replaceCmd(s, 'textit', (a) => `*${a}*`);
    s = replaceCmd(s, 'emph', (a) => `*${a}*`);
    s = replaceCmd(s, 'textsl', (a) => `*${a}*`);
    s = replaceCmd(s, 'texttt', (a) => `\`${a}\``);
    // No raw HTML: the renderer doesn't allow it, so use maths for super/subscripts.
    s = replaceCmd(s, 'underline', (a) => a);
    s = replaceCmd(s, 'textsuperscript', (a) => `$^{\\text{${a}}}$`);
    s = replaceCmd(s, 'textsubscript', (a) => `$_{\\text{${a}}}$`);
    s = replaceCmd(s, 'textrm', (a) => a);
    s = replaceCmd(s, 'text', (a) => a);
    s = replaceCmd(s, 'url', (a) => `<${a}>`);
    s = s.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '[$2]($1)');
    s = replaceCmd(s, 'footnote', (a) => ` (${a})`);
    s = s.replace(/\\(label|ref|eqref|cite)\{[^}]*\}/g, '');
    s = s.replace(/\\LaTeX\b/g, 'LaTeX').replace(/\\TeX\b/g, 'TeX');

    // Lists (innermost first so nesting works)
    for (let guard = 0; guard < 20 && /\\begin\{(itemize|enumerate|description)\}/.test(s); guard++) {
        s = s.replace(/\\begin\{(itemize|enumerate|description)\}(?:\[[^\]]*\])?((?:(?!\\begin\{(?:itemize|enumerate|description)\})[\s\S])*?)\\end\{\1\}/g, (_m, env: string, inner: string) => {
            const items = inner.split(/\\item\b/).slice(1);
            return (
                '\n' +
                items
                    .map((it, k) => {
                        let label = '';
                        it = it.replace(/^\s*\[([^\]]*)\]/, (_x, l: string) => ((label = l), ''));
                        const text = it.trim().replace(/\n(?!\s*$)/g, '\n   ');
                        const bullet = env === 'enumerate' ? `${k + 1}.` : '-';
                        return `${bullet} ${label ? `**${label}** ` : ''}${text}`;
                    })
                    .join('\n') +
                '\n'
            );
        });
    }

    // Quotes, centre
    s = s.replace(/\\begin\{(quote|quotation)\}([\s\S]*?)\\end\{\1\}/g, (_m, _e, b: string) => '\n' + b.trim().split('\n').map((l: string) => `> ${l.trim()}`).join('\n') + '\n');
    s = s.replace(/\\begin\{(center|flushleft|flushright|minipage)\}(\{[^}]*\})?([\s\S]*?)\\end\{\1\}/g, '\n$3\n');

    // Tables
    s = s.replace(/\\begin\{table\*?\}(\[[^\]]*\])?|\\end\{table\*?\}|\\caption\{[^}]*\}/g, '');
    s = s.replace(/\\begin\{tabular\*?\}(\{[^}]*\})?\{[^}]*\}([\s\S]*?)\\end\{tabular\*?\}/g, (_m, _w, body: string) => tabularToMarkdown(body));
    s = s.replace(/\\begin\{figure\*?\}[\s\S]*?\\end\{figure\*?\}/g, '');

    // Line breaks outside maths: "\\" -> markdown hard break.
    s = s.replace(/(?<![\\$])\\\\(\[[^\]]*\])?[ \t]*\n?/g, '  \n');
    // Escaped '&' was held back so table cells split correctly.
    s = s.replace(/\u0003/g, '&');
    // Restore maths (placeholders can nest: \[ … \begin{pmatrix}…\end{pmatrix} … \]).
    for (let guard = 0; guard < 10 && /\u0001M\d+\u0001/.test(s); guard++) {
        s = s.replace(/\u0001M(\d+)\u0001/g, (_m, i: string) => mathStore[+i]);
    }
    return s;
}

function tabularToMarkdown(body: string): string {
    const rows = body
        .replace(/\\(hline|toprule|midrule|bottomrule)\b|\\cline\{[^}]*\}/g, '')
        .split(/\\\\/)
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) =>
            r.split(/(?<!\\)&/).map((c) =>
                c
                    .replace(/\\multicolumn\{\d+\}\{[^}]*\}\{([^}]*)\}/g, '$1')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\|/g, '\\|'),
            ),
        );
    if (!rows.length) return '';
    const cols = Math.max(...rows.map((r) => r.length));
    const line = (r: string[]) => '| ' + Array.from({ length: cols }, (_, i) => r[i] ?? '').join(' | ') + ' |';
    return '\n\n' + [line(rows[0]), '| ' + Array(cols).fill('---').join(' | ') + ' |', ...rows.slice(1).map(line)].join('\n') + '\n\n';
}
