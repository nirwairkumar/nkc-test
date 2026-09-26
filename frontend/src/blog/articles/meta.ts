/**
 * Metadata of every static article: small enough for the blog feed and the
 * router to import without pulling in any article text. See types.ts.
 */
import type { StaticArticleMeta } from './types';

export const STATIC_BLOG_URL = 'https://blog.testoza.com';

export const WHITE_BOXES_META: StaticArticleMeta = {
    slug: 'stop-painting-white-boxes-on-your-pdfs',
    title: 'Stop painting white boxes on your PDFs',
    seoTitle: 'Edit PDF Text in the Same Font for Free: The Complete Panna Guide',
    description:
        'Most free PDF editors cover old text with a white box. Panna edits PDF text in its own font, erases for real, handles Hindi, and never uploads your file.',
    dek:
        'Most free PDF editors hide your old words under a white rectangle and type the new ones in Arial. We built Panna to change the text inside the PDF instead, in the document’s own font, right in your browser. This guide walks through every tool, explains what happens inside the file, and compares Panna with the editors you already know.',
    category: 'product-news',
    author: 'TestoZa Team',
    datePublished: '2026-09-26T12:00:00+05:30',
    dateModified: '2026-09-26T12:00:00+05:30',
    readMinutes: 27,
    cover: {
        src: '/blog-assets/stop-painting-white-boxes/cover.png',
        alt: 'The words “white boxes” covered by a white patch, next to a certificate edited cleanly in its own font',
        width: 1200,
        height: 630,
    },
    keywords: [
        'edit pdf online free',
        'edit pdf text in same font',
        'free pdf editor no watermark',
        'pdf editor without uploading',
        'erase text from pdf permanently',
        'hindi pdf editor',
        'edit hindi pdf online',
        'sign pdf online free',
        'chatgpt to pdf',
        'latex to pdf',
        'Panna PDF editor',
    ],
    about: { name: 'Panna PDF tools by TestoZa', url: 'https://pdf.testoza.com/' },
};

/** Newest first. */
export const STATIC_ARTICLE_METAS: StaticArticleMeta[] = [WHITE_BOXES_META];

export const staticArticleMeta = (slug: string | undefined): StaticArticleMeta | undefined =>
    slug ? STATIC_ARTICLE_METAS.find((a) => a.slug === slug) : undefined;

/** Canonical URL of a static article. */
export const staticArticleUrl = (slug: string) => `${STATIC_BLOG_URL}/${encodeURIComponent(slug)}`;

/** Absolute URL for an asset path such as the cover image. */
export const staticAssetUrl = (path: string) => (path.startsWith('http') ? path : `${STATIC_BLOG_URL}${path}`);
