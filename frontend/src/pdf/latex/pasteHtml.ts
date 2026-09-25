/**
 * Selecting a rendered answer in ChatGPT, Gemini, Claude or Wikipedia and
 * copying it gives garbled plain text ("x2x^2"): every formula is in the page
 * several times (MathML, TeX annotation, HTML glyphs). The HTML flavour of the
 * clipboard still carries each formula's TeX source, so we rebuild Markdown
 * with $…$ maths from it — headings, lists, tables and code included.
 */

/** A copy button's Markdown already has TeX with delimiters: keep that. */
const HAS_SOURCE = /\\\(|\\\[|\$\$|\\begin\{|(^|[^\\])\$[^\s$]/;
const HAS_MATH_MARKUP = /katex|application\/x-tex|<math[\s>]|data-math=|data-tex=|data-latex=|math\/tex|mwe-math/i;

/** Markdown to insert for a paste, or null to let the browser paste the plain text. */
export function markdownFromPaste(html: string, plain: string): string | null {
    if (!html || !HAS_MATH_MARKUP.test(html) || HAS_SOURCE.test(plain)) return null;
    const md = htmlToMarkdown(html);
    return md.trim() ? md : null;
}

/** Display maths is held aside while text whitespace is tidied, so its line layout survives. */
let held: string[] = [];

export function htmlToMarkdown(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    held = [];
    const md = blocks(doc.body)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .replace(/\u0002(\d+)\u0002/g, (_m, i: string) => held[+i]);
    held = [];
    return md;
}

// ---------------------------------------------------------------------------
// Maths

interface MathSrc {
    tex: string;
    display: boolean;
}

const stripDisplaystyle = (t: string) => {
    const m = /^\s*\{\\displaystyle\s*([\s\S]*)\}\s*$/.exec(t);
    return (m ? m[1] : t).trim();
};

function mathOf(el: Element): MathSrc | null {
    const cls = typeof el.className === 'string' ? el.className : '';
    // KaTeX: ChatGPT, Claude, Perplexity, Notion…
    if (el.classList.contains('katex-display') || el.classList.contains('katex')) {
        const ann = el.querySelector('annotation[encoding="application/x-tex"]');
        if (ann?.textContent) return { tex: ann.textContent, display: el.classList.contains('katex-display') || !!el.closest('.katex-display') };
    }
    for (const attr of ['data-math', 'data-tex', 'data-latex']) {
        const v = el.getAttribute(attr);
        if (v) return { tex: v, display: /block|display/i.test(cls) || el.tagName === 'DIV' };
    }
    // Wikipedia: MathML with alttext plus a fallback image — take it once.
    if (el.classList.contains('mwe-math-element')) {
        const tex = el.querySelector('math')?.getAttribute('alttext') || el.querySelector('img')?.getAttribute('alt') || '';
        if (tex) return { tex: stripDisplaystyle(tex), display: !!el.querySelector('.mwe-math-mathml-display, .mwe-math-fallback-image-display') };
    }
    // MathJax 2
    if (el.tagName === 'SCRIPT' && /math\/tex/i.test(el.getAttribute('type') ?? '')) return { tex: el.textContent ?? '', display: /mode=display/i.test(el.getAttribute('type') ?? '') };
    // MathML (MathJax 3's assistive copy, Word, many sites)
    if (el.localName === 'math') {
        const ann = el.querySelector('annotation[encoding="application/x-tex"], annotation[encoding="TeX"], annotation[encoding="text/x-tex"]');
        const tex = ann?.textContent || el.getAttribute('alttext') || mathmlToTex(el);
        if (tex.trim()) return { tex: stripDisplaystyle(tex), display: el.getAttribute('display') === 'block' };
    }
    return null;
}

const FUNCS = new Set('sin cos tan cot sec csc sinh cosh tanh arcsin arccos arctan log ln lg exp lim max min sup inf det gcd deg arg dim ker Pr'.split(' '));
const INVISIBLE: Record<string, string> = { '⁡': '', '⁢': '', '⁣': '', '⁤': '+', '−': '-' };
const ACCENTS: Record<string, string> = { '^': '\\hat', 'ˆ': '\\hat', '¯': '\\bar', '‾': '\\overline', '→': '\\vec', '⃗': '\\vec', '˙': '\\dot', '¨': '\\ddot', '~': '\\tilde', '˜': '\\tilde' };
const FENCES: Record<string, string> = { '{': '\\{', '}': '\\}', '': '.', '⟨': '\\langle', '⟩': '\\rangle', '‖': '\\|' };
const texChar = (t: string) => t.replace(/[{}#%&_$]/g, (c) => '\\' + c).replace(/\\(?![{}#%&_$])/g, '\\backslash ');

/** Enough MathML → TeX for pages that keep no TeX source (MathJax 3, Word). */
function mathmlToTex(el: Element): string {
    const kids = Array.from(el.children);
    const sub = (i: number) => (kids[i] ? mathmlToTex(kids[i]) : '');
    const all = () => kids.map(mathmlToTex).join(' ');
    const text = (el.textContent ?? '').trim();
    switch (el.localName) {
        case 'mi':
            return text.length > 1 ? (FUNCS.has(text) ? `\\${text}` : `\\mathrm{${text}}`) : texChar(text);
        case 'mn':
            return text;
        case 'mo':
            if (text in INVISIBLE) return INVISIBLE[text];
            return /^[a-z]{2,}$/i.test(text) ? (FUNCS.has(text) ? `\\${text}` : `\\operatorname{${text}}`) : texChar(text);
        case 'mtext':
            return text ? `\\text{${texChar(el.textContent ?? '')}}` : '\\ ';
        case 'mspace':
            return '\\ ';
        case 'msup':
            return `{${sub(0)}}^{${sub(1)}}`;
        case 'msub':
            return `{${sub(0)}}_{${sub(1)}}`;
        case 'msubsup':
        case 'munderover':
            return `{${sub(0)}}_{${sub(1)}}^{${sub(2)}}`;
        case 'mfrac':
            return `\\frac{${sub(0)}}{${sub(1)}}`;
        case 'msqrt':
            return `\\sqrt{${all()}}`;
        case 'mroot':
            return `\\sqrt[${sub(1)}]{${sub(0)}}`;
        case 'mover': {
            const acc = ACCENTS[(kids[1]?.textContent ?? '').trim()];
            return acc ? `${acc}{${sub(0)}}` : `\\overset{${sub(1)}}{${sub(0)}}`;
        }
        case 'munder':
            return `\\underset{${sub(1)}}{${sub(0)}}`;
        case 'mtable':
            return `\\begin{matrix} ${kids.map((row) => Array.from(row.children).map(mathmlToTex).join(' & ')).join(' \\\\ ')} \\end{matrix}`;
        case 'mfenced': {
            const f = (c: string) => FENCES[c] ?? c;
            const sep = (el.getAttribute('separators') ?? ',').trim()[0] ?? ',';
            return `\\left${f(el.getAttribute('open') ?? '(')} ${kids.map(mathmlToTex).join(sep)} \\right${f(el.getAttribute('close') ?? ')')}`;
        }
        case 'menclose':
            return /box/.test(el.getAttribute('notation') ?? '') ? `\\boxed{${all()}}` : all();
        case 'semantics':
            return sub(0);
        case 'annotation':
        case 'annotation-xml':
        case 'mphantom':
            return '';
        default:
            return all();
    }
}

// ---------------------------------------------------------------------------
// HTML → Markdown

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'IFRAME', 'OBJECT', 'CANVAS', 'VIDEO', 'AUDIO', 'HEAD', 'TITLE', 'META', 'LINK']);
const BLOCK = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DETAILS', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'UL',
]);

const skipped = (el: Element) => SKIP.has(el.tagName) || el.localName === 'svg' || (el.getAttribute('aria-hidden') === 'true' && !mathOf(el));

function wrap(s: string, mark: string) {
    const t = s.trim();
    if (!t) return s;
    return (/^\s/.test(s) ? ' ' : '') + mark + t + mark + (/\s$/.test(s) ? ' ' : '');
}

const mathMd = (m: MathSrc) => (m.display ? `\n\n\u0002${held.push(`$$\n${m.tex.trim()}\n$$`) - 1}\u0002\n\n` : `$${m.tex.trim()}$`);

function inline(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ').replace(/\$/g, '\\$');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const math = mathOf(el);
    if (math) return mathMd(math);
    if (skipped(el)) return '';
    const inner = () => Array.from(el.childNodes).map(inline).join('');
    switch (el.tagName) {
        case 'BR':
            return '  \n';
        case 'STRONG':
        case 'B':
            return wrap(inner(), '**');
        case 'EM':
        case 'I':
            return wrap(inner(), '*');
        case 'DEL':
        case 'S':
            return wrap(inner(), '~~');
        case 'CODE': {
            const t = el.textContent ?? '';
            const fence = t.includes('`') ? '``' : '`';
            return `${fence}${t}${fence}`;
        }
        case 'SUP':
            return `$^{\\text{${texChar(el.textContent ?? '')}}}$`;
        case 'SUB':
            return `$_{\\text{${texChar(el.textContent ?? '')}}}$`;
        case 'A': {
            const href = el.getAttribute('href') ?? '';
            const t = inner().trim();
            return /^https?:/i.test(href) && t && t !== href ? `[${t}](${href})` : t;
        }
        case 'IMG': {
            const src = el.getAttribute('src') ?? '';
            return /^https?:/i.test(src) ? `![${el.getAttribute('alt') ?? ''}](${src})` : '';
        }
        default:
            return inner();
    }
}

/** Block children as Markdown blocks; loose inline content becomes paragraphs. */
function blocks(el: Element): string[] {
    const out: string[] = [];
    let para = '';
    const flush = () => {
        const t = para.replace(/ *\n */g, (m) => (m.startsWith('  ') ? '  \n' : '\n')).trim();
        if (t) out.push(t);
        para = '';
    };
    for (const c of Array.from(el.childNodes)) {
        if (c.nodeType === Node.ELEMENT_NODE && BLOCK.has((c as Element).tagName) && !mathOf(c as Element)) {
            flush();
            out.push(...block(c as Element));
        } else para += inline(c);
    }
    flush();
    return out;
}

function block(el: Element): string[] {
    if (skipped(el)) return [];
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) {
        const t = inline(el).replace(/\s+/g, ' ').trim();
        return t ? [`${'#'.repeat(+tag[1])} ${t}`] : [];
    }
    switch (tag) {
        case 'HR':
            return ['---'];
        case 'PRE': {
            const code = el.querySelector('code') ?? el;
            const lang = /language-([\w+#-]+)/.exec(code.className)?.[1] ?? '';
            return ['```' + lang + '\n' + (code.textContent ?? '').replace(/\n$/, '') + '\n```'];
        }
        case 'BLOCKQUOTE':
            return [
                blocks(el)
                    .join('\n\n')
                    .split('\n')
                    .map((l) => (l ? `> ${l}` : '>'))
                    .join('\n'),
            ];
        case 'UL':
        case 'OL':
            return [list(el)];
        case 'TABLE':
            return [table(el)];
        default:
            return blocks(el);
    }
}

function list(el: Element): string {
    const ordered = el.tagName === 'OL';
    let n = parseInt(el.getAttribute('start') ?? '1', 10) || 1;
    const items: string[] = [];
    for (const li of Array.from(el.children)) {
        if (li.tagName !== 'LI') continue;
        const marker = ordered ? `${n++}. ` : '- ';
        const pad = ' '.repeat(marker.length);
        const body = blocks(li)
            .join('\n\n')
            .split('\n')
            .map((l, i) => (i === 0 ? marker + l : l ? pad + l : l))
            .join('\n');
        items.push(body || marker.trim());
    }
    return items.join('\n');
}

/** `|` separates cells, except inside $…$ (the normaliser turns those into \vert). */
const escapeCell = (s: string) =>
    s
        .split(/(\$[^$]*\$)/)
        .map((part, i) => (i % 2 ? part : part.replace(/\|/g, '\\|')))
        .join('');

function table(el: Element): string {
    const rows = Array.from(el.querySelectorAll('tr')).filter((tr) => tr.closest('table') === el);
    const cells = rows.map((tr) =>
        Array.from(tr.children)
            .filter((c) => c.tagName === 'TD' || c.tagName === 'TH')
            .map((c) => escapeCell(inline(c).replace(/\s+/g, ' ').trim())),
    );
    const width = Math.max(1, ...cells.map((r) => r.length));
    const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
    if (!cells.length) return '';
    return [line(cells[0]), line(Array(width).fill('---')), ...cells.slice(1).map(line)].join('\n');
}
