/**
 * Pure functions that turn a static article into structured data and into the
 * plain HTML crawlers read. The React page and the Cloudflare worker both call
 * these, so what Google, Bing and AI crawlers see always matches the page.
 */
import { STATIC_BLOG_URL, staticArticleUrl, staticAssetUrl } from './meta';
import type { ArticleBlock, StaticArticle } from './types';

const BLOG_NAME = 'TestoZa Blog';

const escapeText = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A block as plain HTML: widgets become their fallback text. */
export const blockHtml = (block: ArticleBlock) => (block.type === 'html' ? block.html : block.fallbackHtml);

/** Human date in Indian English, e.g. "26 September 2026". */
export function formatArticleDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Words of running text, for the reading time and structured data. */
export function articleWordCount({ meta, body }: StaticArticle): number {
    const html = [
        meta.dek,
        ...body.intro.map(blockHtml),
        ...body.sections.flatMap((s) => [s.title, ...s.blocks.map(blockHtml)]),
        ...body.faqs.flatMap((f) => [f.q, f.a]),
        ...body.closing.map(blockHtml),
    ].join(' ');
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
    return text.split(/\s+/).filter(Boolean).length;
}

/** JSON-LD graph: the article, its FAQ and its breadcrumb. */
export function articleJsonLd(article: StaticArticle) {
    const { meta, body } = article;
    const url = staticArticleUrl(meta.slug);
    const publisher = {
        '@type': 'Organization',
        name: 'TestoZa',
        url: 'https://testoza.com/',
        logo: { '@type': 'ImageObject', url: 'https://testoza.com/favicon.ico' },
    };
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BlogPosting',
                '@id': `${url}#article`,
                headline: meta.title,
                alternativeHeadline: meta.seoTitle,
                description: meta.description,
                image: [staticAssetUrl(meta.cover.src)],
                datePublished: meta.datePublished,
                dateModified: meta.dateModified,
                author: { '@type': 'Organization', name: meta.author, url: 'https://testoza.com/about' },
                publisher,
                mainEntityOfPage: url,
                url,
                inLanguage: 'en-IN',
                articleSection: 'Product guides',
                keywords: meta.keywords.join(', '),
                wordCount: articleWordCount(article),
                about: { '@type': 'WebSite', name: meta.about.name, url: meta.about.url },
                isPartOf: { '@type': 'Blog', '@id': `${STATIC_BLOG_URL}/#blog`, name: BLOG_NAME, url: `${STATIC_BLOG_URL}/` },
            },
            {
                '@type': 'FAQPage',
                '@id': `${url}#faq`,
                mainEntity: body.faqs.map((f) => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: BLOG_NAME, item: `${STATIC_BLOG_URL}/` },
                    { '@type': 'ListItem', position: 2, name: meta.title, item: url },
                ],
            },
        ],
    };
}

/**
 * The whole article as simple, crawlable HTML: headline, byline, every section,
 * the FAQ, the calls to action and the sources. The worker puts it in <main>
 * for crawlers and AI assistants that don't run JavaScript.
 */
export function articleCrawlerHtml(article: StaticArticle): string {
    const { meta, body } = article;
    const toc = body.sections
        .map((s) => `<li><a href="#${s.id}">${escapeText(s.title)}</a></li>`)
        .concat('<li><a href="#faq">Frequently asked questions</a></li>', '<li><a href="#try">Try Panna</a></li>')
        .join('');
    const sections = body.sections
        .map((s) => `<section id="${s.id}"><h2>${escapeText(s.title)}</h2>${s.blocks.map(blockHtml).join('\n')}</section>`)
        .join('\n');
    const faqs = body.faqs.map((f) => `<h3>${escapeText(f.q)}</h3><p>${escapeText(f.a)}</p>`).join('\n');
    const sources = body.sources
        .map((g) => `<li>${escapeText(g.label)}: ${g.links.map((l) => `<a href="${l.href}">${escapeText(l.label)}</a>`).join(', ')}</li>`)
        .join('');

    return `
<article>
<p><a href="${STATIC_BLOG_URL}/">${BLOG_NAME}</a> · Product guide</p>
<h1>${escapeText(meta.title)}</h1>
<p>${escapeText(meta.dek)}</p>
<p>By ${escapeText(meta.author)} · ${formatArticleDate(meta.datePublished)} · ${meta.readMinutes} min read</p>
<p><a href="https://pdf.testoza.com/edit-pdf">Try the free PDF editor at pdf.testoza.com</a></p>
${body.intro.map(blockHtml).join('\n')}
<nav aria-label="In this guide"><h2>In this guide</h2><ol>${toc}</ol></nav>
${sections}
<section id="faq"><h2>Frequently asked questions</h2>
${faqs}
</section>
<section id="try"><h2>Try Panna</h2>
${body.closing.map(blockHtml).join('\n')}
</section>
<section><h2>Sources for the comparison</h2><ul>${sources}</ul></section>
<p><a href="${STATIC_BLOG_URL}/">More articles on the ${BLOG_NAME}</a></p>
</article>
`;
}
