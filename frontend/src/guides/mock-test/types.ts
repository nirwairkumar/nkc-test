/**
 * Guides: long-form, keyword-led pages that live on testoza.com itself (not on
 * the blog), such as testoza.com/create-mock-test-online.
 *
 * Everything under src/guides is plain, dependency-free TypeScript on purpose.
 * The React page renders from it, and the Cloudflare worker
 * (infrastructure/cloudflare-worker/worker.js in the root repo) imports the same
 * files to give crawlers and AI assistants the full text, head tags and JSON-LD.
 * Keep it free of React, path aliases ("@/…") and browser APIs, or the worker
 * build breaks. Same rules as src/blog/articles.
 */

/** Interactive parts of a guide. Crawlers (and readers without JavaScript) get `fallbackHtml`. */
export type GuideWidget = 'source-picker' | 'palette-demo' | 'time-matrix';

/** A piece of a guide body. `html` is trusted, hand-written markup. */
export type GuideBlock =
    | { type: 'html'; html: string }
    | { type: 'widget'; widget: GuideWidget; fallbackHtml: string };

export interface GuideSection {
    /** Anchor id, also used by the table of contents. */
    id: string;
    title: string;
    /** Shorter label for the table of contents. */
    tocLabel?: string;
    blocks: GuideBlock[];
}

export interface GuideFaq {
    q: string;
    /** Plain text: also used for FAQPage structured data. */
    a: string;
}

/** One step of the how-to, used for the numbered list and for HowTo structured data. */
export interface GuideStep {
    name: string;
    /** Plain text. */
    text: string;
    /** The same text with links, for the page. Falls back to `text`. */
    html?: string;
}

export interface GuideSource {
    label: string;
    href: string;
}

export interface GuideMeta {
    slug: string;
    /** Path on testoza.com, e.g. "/create-mock-test-online". */
    path: string;
    /** The on-page headline (H1). */
    title: string;
    /** The first words of the H1, drawn in full ink; the rest is drawn lighter. */
    titleLead: string;
    /** Title for search results and the browser tab (the site name is added after it). */
    seoTitle: string;
    /** Meta description. */
    description: string;
    /** Standfirst shown under the headline. */
    dek: string;
    /** Short label above the headline. */
    eyebrow: string;
    author: string;
    /** ISO dates (Asia/Kolkata midday, so they never shift a day). */
    datePublished: string;
    dateModified: string;
    readMinutes: number;
    cover: { src: string; alt: string; width: number; height: number };
    keywords: string[];
    /** The main call to action. */
    cta: { label: string; href: string };
    /** Name of the how-to for HowTo structured data, and its total time (ISO 8601 duration). */
    howTo: { name: string; totalTime: string };
}

export interface GuideBody {
    /** "The short version" bullets shown under the header. Plain text. */
    takeaways: string[];
    intro: GuideBlock[];
    sections: GuideSection[];
    steps: GuideStep[];
    faqs: GuideFaq[];
    closingTitle: string;
    closing: GuideBlock[];
    sources: GuideSource[];
}

export interface Guide {
    meta: GuideMeta;
    body: GuideBody;
}
