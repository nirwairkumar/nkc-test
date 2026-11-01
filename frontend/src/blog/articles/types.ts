/**
 * Static blog articles: long-form pages that live in the codebase instead of
 * the blog CMS (the post editor can't hold custom layouts or animation).
 *
 * Everything under src/blog/articles is plain, dependency-free TypeScript on
 * purpose. The React page renders from it, and the Cloudflare worker
 * (infrastructure/cloudflare-worker/worker.js in the root repo) imports the same
 * files to give crawlers the full article text, head tags and JSON-LD. Keep it
 * free of React, path aliases ("@/…") and browser APIs, or the worker build breaks.
 */

/** A piece of an article body. `html` is trusted, hand-written markup. */
export type ArticleBlock =
    | { type: 'html'; html: string }
    /**
     * An interactive part of the page. The React page renders the named widget;
     * crawlers (and readers without JavaScript) get `fallbackHtml` instead.
     */
    | { type: 'widget'; widget: 'white-box-demo'; fallbackHtml: string };

export interface ArticleSection {
    /** Anchor id, also used by the table of contents. */
    id: string;
    title: string;
    /** Shorter label for the table of contents. */
    tocLabel?: string;
    blocks: ArticleBlock[];
}

export interface ArticleFaq {
    q: string;
    /** Plain text: also used for FAQPage structured data. */
    a: string;
}

export interface ArticleSourceGroup {
    label: string;
    links: { label: string; href: string }[];
}

export interface StaticArticleMeta {
    slug: string;
    /** The on-page headline (H1). */
    title: string;
    /** Title for search results and the browser tab (the site name is added after it). */
    seoTitle: string;
    /** Meta description and blog card summary. */
    description: string;
    /** Standfirst shown under the headline. */
    dek: string;
    /** Blog category value (see CATEGORIES in NewsFeed.tsx). */
    category: string;
    author: string;
    /** ISO dates (Asia/Kolkata midday, so they never shift a day). */
    datePublished: string;
    dateModified: string;
    readMinutes: number;
    cover: { src: string; alt: string; width: number; height: number };
    keywords: string[];
    /** What the article is about, for structured data. */
    about: { name: string; url: string };
}

export interface StaticArticleBody {
    intro: ArticleBlock[];
    sections: ArticleSection[];
    faqs: ArticleFaq[];
    closing: ArticleBlock[];
    sources: ArticleSourceGroup[];
}

export interface StaticArticle {
    meta: StaticArticleMeta;
    body: StaticArticleBody;
}
