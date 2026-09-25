/**
 * Every public page of pdf.testoza.com: URL, file it is pre-rendered to, and
 * the search/social metadata. The pre-renderer, the sitemap, the client router
 * and the head tags all read this one table.
 */
import { PANNA } from '../brand';
import { CHATGPT_FAQS, EDITOR_FAQS, HINDI_FAQS, HOME_FAQS, LATEX_FAQS, type Faq } from './content';

export type PageKey = 'home' | 'editor' | 'hindi' | 'latex' | 'chatgpt' | 'notFound';

export interface SiteApp {
    name: string;
    category: string;
    features: string[];
    screenshot: string;
}

export interface SitePage {
    key: PageKey;
    /** Canonical path (no trailing slash). */
    path: string;
    /** Output file in dist-pdf; Cloudflare Pages serves "x.html" at "/x". */
    file: string;
    title: string;
    description: string;
    ogImage: string;
    ogAlt: string;
    /** Label in breadcrumbs and in the tools list. */
    crumb: string;
    app?: SiteApp;
    faqs?: Faq[];
    index: boolean;
}

export const PAGES: SitePage[] = [
    {
        key: 'home',
        path: PANNA.routes.home,
        file: 'index.html',
        title: 'Free PDF Tools — Edit PDFs in the Same Font | Panna',
        description: 'Free PDF tools by TestoZa: edit PDF text in its original font (Hindi & English), erase for real, sign and annotate, and turn LaTeX or ChatGPT maths into PDF.',
        ogImage: '/og/panna.png',
        ogAlt: 'Panna — free PDF tools by TestoZa',
        crumb: 'PDF tools',
        faqs: HOME_FAQS,
        index: true,
    },
    {
        key: 'editor',
        path: PANNA.routes.editor,
        file: 'edit-pdf.html',
        title: 'Edit PDF Online Free — Same Font, No Watermark | Panna',
        description: 'Edit PDF text in its original font, erase for real, add text, images and signatures. Hindi & English. Free, no sign-up, and your file never leaves your device.',
        ogImage: '/og/edit-pdf.png',
        ogAlt: 'Edit PDF text online in the same font — Panna PDF editor',
        crumb: 'Edit PDF',
        app: {
            name: 'Panna PDF Editor',
            category: 'BusinessApplication',
            features: [
                'Edit existing PDF text in the embedded font',
                'Delete text from the file (true erase)',
                'Add text, images and signatures',
                'Highlight, draw, shapes and arrows',
                'Find and replace across pages',
                'Reorder, rotate, duplicate and delete pages',
                'Hindi (Devanagari) editing',
                'Password-protected PDFs',
                'Works offline in the browser — no upload',
            ],
            screenshot: '/screenshots/edit-pdf.webp',
        },
        faqs: EDITOR_FAQS,
        index: true,
    },
    {
        key: 'hindi',
        path: PANNA.routes.hindi,
        file: 'edit-hindi-pdf.html',
        title: 'Edit Hindi PDF Online Free — हिंदी PDF Editor | Panna',
        description: 'Edit Hindi text in any PDF with matras and conjuncts shaped correctly and text kept searchable. Fix names, marks and forms free — no upload, no watermark.',
        ogImage: '/og/edit-hindi-pdf.png',
        ogAlt: 'Edit Hindi PDF online — हिंदी PDF एडिट करें',
        crumb: 'Edit Hindi PDF',
        app: {
            name: 'Panna Hindi PDF Editor',
            category: 'BusinessApplication',
            features: [
                'Edit Unicode Hindi (Devanagari) text in PDFs',
                'Correct matras, conjuncts and reph',
                'Edited Hindi text stays searchable and copyable',
                'Hindi and English in the same document',
                'No upload, no sign-up, no watermark',
            ],
            screenshot: '/screenshots/edit-hindi-pdf.webp',
        },
        faqs: HINDI_FAQS,
        index: true,
    },
    {
        key: 'latex',
        path: PANNA.routes.latex,
        file: 'latex-to-pdf.html',
        title: 'LaTeX to PDF Online — ChatGPT & Gemini Maths to PDF | Panna',
        description: 'Paste maths from ChatGPT, Gemini or Claude, or a full LaTeX document, and download a clean PDF with real, selectable text. Broken formulas repaired. Free.',
        ogImage: '/og/latex-to-pdf.png',
        ogAlt: 'LaTeX to PDF — paste ChatGPT or Gemini maths, download a clean PDF',
        crumb: 'LaTeX to PDF',
        app: {
            name: 'Panna LaTeX to PDF',
            category: 'EducationalApplication',
            features: [
                'ChatGPT \\( \\) and \\[ \\] maths',
                'Gemini and Claude $ and $$ maths',
                'Full LaTeX documents with sections, lists and tables',
                'Numbered equations, matrices and chemistry (mhchem)',
                'Repairs formulas damaged by copying',
                'A4 or Letter pages with visible page breaks',
                'Vector PDF with selectable text, links and bookmarks',
                'Hindi support',
            ],
            screenshot: '/screenshots/latex-to-pdf.webp',
        },
        faqs: LATEX_FAQS,
        index: true,
    },
    {
        key: 'chatgpt',
        path: PANNA.routes.chatgpt,
        file: 'chatgpt-to-pdf.html',
        title: 'ChatGPT to PDF — Save Answers With Maths Intact | Panna',
        description: 'Turn a ChatGPT, Gemini or Claude answer into a clean PDF — equations, tables and Hindi included. Paste, preview real pages, download. Free, no sign-up.',
        ogImage: '/og/chatgpt-to-pdf.png',
        ogAlt: 'ChatGPT to PDF — save AI answers with the maths intact',
        crumb: 'ChatGPT to PDF',
        app: {
            name: 'Panna ChatGPT to PDF',
            category: 'EducationalApplication',
            features: [
                'Saves ChatGPT, Gemini and Claude answers as PDF',
                'Equations typeset properly',
                'Tables, lists and code blocks',
                'Recovers maths from copied web pages',
                'Page preview before download',
                'Selectable, searchable text',
            ],
            screenshot: '/screenshots/chatgpt-to-pdf.webp',
        },
        faqs: CHATGPT_FAQS,
        index: true,
    },
    {
        key: 'notFound',
        path: '/404',
        file: '404.html',
        title: 'Page not found | Panna PDF Tools',
        description: 'This page does not exist. Open the Panna PDF editor or LaTeX to PDF converter instead.',
        ogImage: '/og/panna.png',
        ogAlt: 'Panna — free PDF tools by TestoZa',
        crumb: 'Not found',
        index: false,
    },
];

/** Short or old URLs → canonical page (served as 301s by Cloudflare Pages). */
export const REDIRECTS: [string, string][] = [
    ['/edit', PANNA.routes.editor],
    ['/editor', PANNA.routes.editor],
    ['/pdf-editor', PANNA.routes.editor],
    ['/pdf/editor', PANNA.routes.editor],
    ['/hindi', PANNA.routes.hindi],
    ['/hindi-pdf-editor', PANNA.routes.hindi],
    ['/latex', PANNA.routes.latex],
    ['/convert', PANNA.routes.latex],
    ['/pdf/latex-to-pdf', PANNA.routes.latex],
    ['/chatgpt', PANNA.routes.chatgpt],
    ['/pdf', PANNA.routes.home],
];

export const TOOL_PAGES = PAGES.filter((p) => p.app);

export function pageFor(pathname: string): SitePage {
    const path = pathname.replace(/\/+$/, '').replace(/\.html$/, '') || '/';
    return PAGES.find((p) => p.path === path && p.key !== 'notFound') ?? PAGES[PAGES.length - 1];
}

export const absoluteUrl = (path: string) => `${PANNA.origin}${path === '/' ? '/' : path}`;
