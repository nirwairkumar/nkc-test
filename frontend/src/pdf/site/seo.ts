/**
 * Head tags and JSON-LD for pdf.testoza.com. The pre-renderer writes them into
 * each page's HTML (so crawlers and AI bots get them without running JS), and
 * applyHead() keeps them in sync when the user navigates inside the app.
 */
import { PANNA } from '../brand';
import { DEFINITIONS, UPDATED } from './content';
import { PAGES, TOOL_PAGES, absoluteUrl, type SitePage } from './routes';

const ORG_ID = `${PANNA.testoza}/#organization`;
const SITE_ID = `${PANNA.origin}/#website`;

const ORGANIZATION = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'TestoZa Educational Systems',
    alternateName: 'TestoZa',
    url: PANNA.testoza,
    logo: { '@type': 'ImageObject', url: `${PANNA.testoza}/logo-testoza-square.png` },
    sameAs: ['https://www.linkedin.com/company/testoza'],
    address: {
        '@type': 'PostalAddress',
        streetAddress: '1st Floor, Nirmaan, Sudha & Shankar Inv Hub, IIT Madras',
        addressLocality: 'Chennai',
        addressRegion: 'Tamil Nadu',
        postalCode: '600036',
        addressCountry: 'IN',
    },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@testoza.com', availableLanguage: ['English', 'Hindi'] },
};

const WEBSITE = {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${PANNA.origin}/`,
    name: 'Panna PDF Tools',
    alternateName: ['Panna by TestoZa', 'TestoZa PDF tools'],
    description: DEFINITIONS.home,
    inLanguage: 'en',
    publisher: { '@id': ORG_ID },
};

export function structuredData(page: SitePage): object {
    const url = absoluteUrl(page.path);
    const graph: object[] = [ORGANIZATION, WEBSITE];
    graph.push({
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        isPartOf: { '@id': SITE_ID },
        inLanguage: page.key === 'hindi' ? ['en', 'hi'] : 'en',
        dateModified: UPDATED,
        primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(page.ogImage), width: 1200, height: 630 },
        ...(page.key !== 'home' ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
        ...(page.app ? { mainEntity: { '@id': `${url}#app` } } : {}),
        publisher: { '@id': ORG_ID },
    });
    if (page.key !== 'home') {
        graph.push({
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'PDF tools', item: `${PANNA.origin}/` },
                { '@type': 'ListItem', position: 2, name: page.crumb, item: url },
            ],
        });
    } else {
        graph.push({
            '@type': 'ItemList',
            '@id': `${url}#tools`,
            name: 'Panna PDF tools',
            itemListElement: TOOL_PAGES.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.app!.name, url: absoluteUrl(t.path) })),
        });
    }
    if (page.app) {
        graph.push({
            '@type': 'WebApplication',
            '@id': `${url}#app`,
            name: page.app.name,
            url,
            description: DEFINITIONS[page.key as keyof typeof DEFINITIONS] ?? page.description,
            applicationCategory: page.app.category,
            operatingSystem: 'Windows, macOS, Linux, Android, iOS',
            browserRequirements: 'Requires JavaScript. Works in current Chrome, Edge, Firefox and Safari.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
            isAccessibleForFree: true,
            featureList: page.app.features,
            screenshot: absoluteUrl(page.app.screenshot),
            inLanguage: ['en', 'hi'],
            publisher: { '@id': ORG_ID },
            creator: { '@id': ORG_ID },
        });
    }
    if (page.faqs?.length) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        });
    }
    return { '@context': 'https://schema.org', '@graph': graph };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** JSON for a <script> element: "</script>" can't appear inside it. */
export const scriptJson = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c');

const robots = (page: SitePage) => (page.index ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow');

/** The page-specific part of <head>, as HTML (used by the pre-renderer). */
export function headHtml(page: SitePage): string {
    const url = absoluteUrl(page.path);
    const og = absoluteUrl(page.ogImage);
    const lines = [
        `<title>${esc(page.title)}</title>`,
        `<meta name="description" content="${esc(page.description)}" />`,
        `<meta name="robots" content="${robots(page)}" />`,
        page.index ? `<link rel="canonical" href="${url}" />` : '',
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="Panna by TestoZa" />`,
        `<meta property="og:locale" content="en_IN" />`,
        `<meta property="og:title" content="${esc(page.title)}" />`,
        `<meta property="og:description" content="${esc(page.description)}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:image" content="${og}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${esc(page.ogAlt)}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:site" content="@testoza" />`,
        `<meta name="twitter:title" content="${esc(page.title)}" />`,
        `<meta name="twitter:description" content="${esc(page.description)}" />`,
        `<meta name="twitter:image" content="${og}" />`,
        page.index ? `<script type="application/ld+json" id="ld-json">${scriptJson(structuredData(page))}</script>` : '',
    ];
    return lines.filter(Boolean).join('\n    ');
}

// ---------------------------------------------------------------------------
// Client: keep <head> in step with in-app navigation

function upsert(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) {
    let el = document.head.querySelector<HTMLElement>(selector);
    if (!el) {
        el = create();
        document.head.appendChild(el);
    }
    set(el);
}
const meta = (attr: 'name' | 'property', key: string, content: string) =>
    upsert(
        `meta[${attr}="${key}"]`,
        () => {
            const m = document.createElement('meta');
            m.setAttribute(attr, key);
            return m;
        },
        (el) => el.setAttribute('content', content),
    );

export function applyHead(page: SitePage) {
    if (typeof document === 'undefined') return;
    const url = absoluteUrl(page.path);
    const og = absoluteUrl(page.ogImage);
    document.title = page.title;
    meta('name', 'description', page.description);
    meta('name', 'robots', robots(page));
    meta('property', 'og:title', page.title);
    meta('property', 'og:description', page.description);
    meta('property', 'og:url', url);
    meta('property', 'og:image', og);
    meta('property', 'og:image:alt', page.ogAlt);
    meta('name', 'twitter:title', page.title);
    meta('name', 'twitter:description', page.description);
    meta('name', 'twitter:image', og);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (page.index) {
        upsert(
            'link[rel="canonical"]',
            () => {
                const l = document.createElement('link');
                l.rel = 'canonical';
                return l;
            },
            (el) => el.setAttribute('href', url),
        );
        upsert(
            'script#ld-json',
            () => {
                const s = document.createElement('script');
                s.type = 'application/ld+json';
                s.id = 'ld-json';
                return s;
            },
            (el) => (el.textContent = scriptJson(structuredData(page))),
        );
    } else {
        canonical?.remove();
        document.head.querySelector('script#ld-json')?.remove();
    }
}

export const SITEMAP_PAGES = PAGES.filter((p) => p.index);
