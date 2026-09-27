/**
 * Pure functions that turn a guide into structured data and into the plain HTML
 * crawlers read. The React page and the Cloudflare worker both call these, so
 * what Google, Bing and AI assistants see always matches the page.
 */
import type { Guide, GuideBlock } from './types';

export const SITE_URL = 'https://testoza.com';

const escapeText = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Canonical URL of a guide. */
export const guideUrl = (path: string) => `${SITE_URL}${path}`;

/** Absolute URL for an asset path such as the cover image. */
export const guideAssetUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);

/** A block as plain HTML: widgets become their fallback text. */
export const guideBlockHtml = (block: GuideBlock) => (block.type === 'html' ? block.html : block.fallbackHtml);

/** Human date in Indian English, e.g. "27 September 2026". */
export function formatGuideDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Words of running text, for structured data. */
export function guideWordCount({ meta, body }: Guide): number {
    const html = [
        meta.title,
        meta.dek,
        ...body.takeaways,
        ...body.intro.map(guideBlockHtml),
        ...body.sections.flatMap((s) => [s.title, ...s.blocks.map(guideBlockHtml)]),
        ...body.faqs.flatMap((f) => [f.q, f.a]),
        body.closingTitle,
        ...body.closing.map(guideBlockHtml),
    ].join(' ');
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
    return text.split(/\s+/).filter(Boolean).length;
}

/** JSON-LD graph: the page, the article, the how-to, the FAQ and the breadcrumb. */
export function guideJsonLd(guide: Guide) {
    const { meta, body } = guide;
    const url = guideUrl(meta.path);
    const image = guideAssetUrl(meta.cover.src);
    const publisher = {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'TestoZa',
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-testoza-square.png` },
    };
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: meta.seoTitle,
                description: meta.description,
                inLanguage: 'en-IN',
                isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'TestoZa', url: `${SITE_URL}/` },
                primaryImageOfPage: { '@type': 'ImageObject', url: image, width: meta.cover.width, height: meta.cover.height },
                datePublished: meta.datePublished,
                dateModified: meta.dateModified,
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            {
                '@type': 'Article',
                '@id': `${url}#article`,
                headline: meta.title,
                alternativeHeadline: meta.seoTitle,
                description: meta.description,
                image: [image],
                datePublished: meta.datePublished,
                dateModified: meta.dateModified,
                author: { '@type': 'Organization', name: meta.author, url: `${SITE_URL}/about` },
                publisher,
                mainEntityOfPage: { '@id': `${url}#webpage` },
                url,
                inLanguage: 'en-IN',
                articleSection: 'Guides',
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
                citation: body.sources.map((s) => s.href),
            },
            {
                '@type': 'HowTo',
                '@id': `${url}#howto`,
                name: meta.howTo.name,
                description: meta.description,
                totalTime: meta.howTo.totalTime,
                image,
                supply: [{ '@type': 'HowToSupply', name: 'A textbook page, notes, a PDF or a question paper' }],
                tool: [
                    { '@type': 'HowToTool', name: 'A phone camera or a scanner' },
                    { '@type': 'HowToTool', name: 'A free TestoZa account' },
                ],
                step: body.steps.map((s, i) => ({
                    '@type': 'HowToStep',
                    position: i + 1,
                    name: s.name,
                    text: s.text,
                    url: `${url}#step-by-step`,
                })),
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
                '@id': `${url}#breadcrumb`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'TestoZa', item: `${SITE_URL}/` },
                    { '@type': 'ListItem', position: 2, name: meta.titleLead, item: url },
                ],
            },
        ],
    };
}

/**
 * The whole guide as simple, crawlable HTML: headline, byline, takeaways, every
 * section, the FAQ, the call to action and the sources. The worker puts it in
 * <main> for crawlers and AI assistants that don't run JavaScript.
 */
export function guideCrawlerHtml(guide: Guide): string {
    const { meta, body } = guide;
    const toc = body.sections
        .map((s) => `<li><a href="#${s.id}">${escapeText(s.title)}</a></li>`)
        .concat('<li><a href="#faq">Frequently asked questions</a></li>', `<li><a href="#start">${escapeText(body.closingTitle)}</a></li>`)
        .join('');
    const sections = body.sections
        .map((s) => `<section id="${s.id}"><h2>${escapeText(s.title)}</h2>\n${s.blocks.map(guideBlockHtml).join('\n')}</section>`)
        .join('\n');
    const faqs = body.faqs.map((f) => `<h3>${escapeText(f.q)}</h3>\n<p>${escapeText(f.a)}</p>`).join('\n');
    const sources = body.sources.map((s) => `<li><a href="${s.href}">${escapeText(s.label)}</a></li>`).join('');

    return `
<article>
<nav aria-label="Breadcrumb"><a href="${SITE_URL}/">TestoZa</a> › ${escapeText(meta.titleLead)}</nav>
<p>${escapeText(meta.eyebrow)}</p>
<h1>${escapeText(meta.title)}</h1>
<p>${escapeText(meta.dek)}</p>
<p>By ${escapeText(meta.author)} · Updated <time datetime="${meta.dateModified}">${formatGuideDate(meta.dateModified)}</time> · ${meta.readMinutes} min read</p>
<p><a href="${meta.cta.href}">${escapeText(meta.cta.label)}</a></p>
<section aria-labelledby="short-version"><h2 id="short-version">The short version</h2><ul>${body.takeaways.map((t) => `<li>${escapeText(t)}</li>`).join('')}</ul></section>
${body.intro.map(guideBlockHtml).join('\n')}
<nav aria-label="In this guide"><h2>In this guide</h2><ol>${toc}</ol></nav>
${sections}
<section id="faq"><h2>Frequently asked questions</h2>
${faqs}
</section>
<section id="start"><h2>${escapeText(body.closingTitle)}</h2>
${body.closing.map(guideBlockHtml).join('\n')}
</section>
<section><h2>Sources</h2><ul>${sources}</ul></section>
</article>
`;
}
