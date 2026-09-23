/**
 * M6 (SECURITY_THREAT_MODEL_AND_PLAN.md) — XSS sink hardening.
 *
 * Access and refresh tokens live in localStorage, so ANY script execution in this
 * origin is a full account takeover. Until tokens move to httpOnly cookies, the
 * practical defence is to make sure nothing user-authored ever reaches the DOM as
 * live HTML. Every `dangerouslySetInnerHTML` that renders content somebody else
 * authored must go through this module.
 *
 * Two distinct sinks exist in this app:
 *   1. Rich text written by a creator and shown to test-takers
 *      (e.g. `test.revision_notes` on TestIntroPage) -> sanitizeHtml()
 *   2. KaTeX output for question/option content -> katexTrust() + sanitizeHtml()
 */

import DOMPurify from 'dompurify';

/** Protocols that must never appear in an href/src we render. */
const DANGEROUS_PROTOCOLS = ['javascript', 'data', 'vbscript', 'file', 'blob'];

/**
 * Sanitize creator-authored rich text (study notes, descriptions, previews).
 *
 * Allows the formatting a rich-text editor produces and KaTeX's output markup,
 * and drops scripts, event handlers, iframes, forms and dangerous URLs.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            // Block / text structure
            'p', 'div', 'span', 'br', 'hr', 'blockquote', 'pre', 'code',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            // Inline formatting
            'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins',
            'sub', 'sup', 'small', 'mark', 'abbr',
            // Links and media
            'a', 'img', 'figure', 'figcaption',
            // Tables
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
            // KaTeX output
            'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext', 'annotation',
            'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mstyle',
            'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'mspace', 'mpadded',
            'svg', 'path', 'line', 'g', 'rect',
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'width', 'height',
            'class', 'style', 'colspan', 'rowspan', 'align', 'dir', 'lang',
            'target', 'rel',
            // KaTeX / MathML presentation attributes
            'mathvariant', 'displaystyle', 'scriptlevel', 'stretchy', 'accent',
            'viewBox', 'preserveAspectRatio', 'd', 'fill', 'x', 'y', 'x1', 'x2', 'y1', 'y2',
            'aria-hidden', 'encoding',
        ],
        // Block every URI scheme except the safe ones. This is what stops
        // href="javascript:..." and src="data:text/html,...".
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'base'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onanimationstart', 'formaction', 'srcdoc'],
        // Keep <a target="_blank"> from handing the opener window to the linked page.
        ADD_ATTR: ['target'],
    });
}

/**
 * KaTeX `trust` callback.
 *
 * Both renderers previously passed `trust: true`, which enables every "trusted"
 * command — including `\href`, so `\href{javascript:alert(1)}{x}` in a question or
 * option rendered as a clickable XSS payload. This keeps the commands the content
 * actually relies on (images, html classes/ids for styling) and allows `\href` only
 * for safe protocols.
 */
export function katexTrust(context: { command?: string; url?: string; protocol?: string }): boolean {
    const command = context?.command;
    const protocol = (context?.protocol || '').toLowerCase().replace(/:$/, '');

    if (DANGEROUS_PROTOCOLS.includes(protocol)) return false;

    switch (command) {
        case '\\htmlClass':
        case '\\htmlId':
        case '\\htmlData':
        case '\\includegraphics':
            return true;
        case '\\href':
        case '\\url':
            // `_relative` is KaTeX's marker for a same-origin relative URL.
            return protocol === 'http' || protocol === 'https' || protocol === 'mailto' || protocol === '_relative';
        case '\\htmlStyle':
            // Arbitrary CSS enables clickjacking-style overlays; not needed here.
            return false;
        default:
            return false;
    }
}

/**
 * Escape a string for embedding inside a <script> block (e.g. JSON-LD).
 *
 * JSON.stringify does NOT escape `<`, so a test title containing `</script>` would
 * close the tag early and everything after it would run as script.
 */
export function safeJsonLd(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
