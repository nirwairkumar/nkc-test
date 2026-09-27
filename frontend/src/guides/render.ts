/**
 * Pure functions that turn a guide into structured data and into the plain HTML
 * crawlers read. The React page and the Cloudflare worker both call these, so
 * what Google, Bing and AI crawlers see always matches the page.
 */
import { formatArticleDate } from '../blog/articles/render';
import { SITE_URL, guideAssetUrl, guideUrl } from './meta';
import type { Guide, GuideBlock } from './types';

export { formatArticleDate as formatGuideDate };

const escapeText = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A block as plain HTML: widgets become their fallback text. */
export const guideBlockHtml = (block: GuideBlock) => (block.type === 'html' ? block.html : block.fallbackHtml);

/** Words of running text, for structured data. */
export function guideWordCount({ meta, body }: Guide): number {
    const markup = [
        meta.dek,
        body.answer,
        ...body.intro.map(guideBlockHtml),
        ...body.sections.flatMap((s) => [s.title, ...s.blocks.map(guideBlockHtml)]),
        ...body.faqs.flatMap((f) => [f.q, f.a]),
        ...body.closing.map(guideBlockHtml),
    ].join(' ');
    const text = markup.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
    return text.split(/\s+/).filter(Boolean).length;
}

/** JSON-LD graph: the article, its FAQ and its breadcrumb. */
export function guideJsonLd(guide: Guide) {
    const { meta, body } = guide;
    const url = guideUrl(meta.path);
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Article',
                '@id': `${url}#article`,
                headline: meta.title,
                alternativeHeadline: meta.seoTitle,
                description: meta.description,
                abstract: body.answer,
                image: [guideAssetUrl(meta.cover.src)],
                datePublished: meta.datePublished,
                dateModified: meta.dateModified,
                author: { '@type': 'Organization', name: meta.author, url: `${SITE_URL}/about` },
                publisher: {
                    '@type': 'Organization',
                    name: 'TestoZa',
                    url: `${SITE_URL}/`,
                    logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.ico` },
                },
                mainEntityOfPage: url,
                url,
                inLanguage: 'en-IN',
                keywords: meta.keywords.join(', '),
                wordCount: guideWordCount(guide),
                about: {
                    '@type': 'SoftwareApplication',
                    name: 'TestoZa',
                    url: `${SITE_URL}/`,
                    applicationCategory: 'EducationalApplication',
                    operatingSystem: 'Web',
                    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
                },
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
                    { '@type': 'ListItem', position: 1, name: 'TestoZa', item: `${SITE_URL}/` },
                    { '@type': 'ListItem', position: 2, name: meta.title, item: url },
                ],
            },
        ],
    };
}

/**
 * The whole guide as simple, crawlable HTML. The worker puts it in <main> for
 * crawlers and AI assistants that don't run JavaScript.
 */
export function guideCrawlerHtml(guide: Guide): string {
    const { meta, body } = guide;
    const nav = body.sections
        .map((s) => `<li><a href="#${s.id}">${escapeText(s.title)}</a></li>`)
        .concat('<li><a href="#faq">Frequently asked questions</a></li>')
        .join('');
    const sections = body.sections
        .map((s) => `<section id="${s.id}"><h2>${escapeText(s.title)}</h2>${s.blocks.map(guideBlockHtml).join('\n')}</section>`)
        .join('\n');
    const faqs = body.faqs.map((f) => `<h3>${escapeText(f.q)}</h3><p>${escapeText(f.a)}</p>`).join('\n');
    const sources = body.sources
        .map((g) => `<li>${escapeText(g.label)}: ${g.links.map((l) => `<a href="${l.href}">${escapeText(l.label)}</a>`).join(', ')}</li>`)
        .join('');

    return `
<article>
<p><a href="${SITE_URL}/">TestoZa</a> · Guide</p>
<h1>${escapeText(meta.title)}</h1>
<p>${escapeText(meta.dek)}</p>
<p>By ${escapeText(meta.author)} · ${formatArticleDate(meta.datePublished)} · ${meta.readMinutes} min read</p>
<p><a href="${SITE_URL}/generate-with-ai">Make a test with AI on TestoZa, free</a></p>
${body.intro.map(guideBlockHtml).join('\n')}
<aside><h2>The short answer</h2><p>${escapeText(body.answer)}</p></aside>
<nav aria-label="In this guide"><h2>In this guide</h2><ol>${nav}</ol></nav>
${sections}
<section id="faq"><h2>Frequently asked questions</h2>
${faqs}
</section>
<section id="start"><h2>Start with one real test</h2>
${body.closing.map(guideBlockHtml).join('\n')}
</section>
<section><h2>Sources</h2><ul>${sources}</ul></section>
</article>
`;
}
