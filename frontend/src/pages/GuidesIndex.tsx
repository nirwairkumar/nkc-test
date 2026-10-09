/**
 * testoza.com/guides — the index of every long-form guide in src/guides.
 *
 * Why this page exists: the guides used to be linked only from the footer, one
 * line each, and the column grew by a row with every guide we wrote (20 links
 * and counting). A hub page is the usual answer on large sites: the footer
 * keeps a short, curated list and points here, and this page carries the long
 * tail. It also concentrates the topic in one place for search engines instead
 * of scattering fifteen sitewide boilerplate links across every page.
 *
 * It builds itself from GUIDE_METAS, newest first, so a new guide appears here
 * the moment its metadata lands — there is no list to maintain. The Cloudflare
 * worker generates the crawler version from the same array
 * (infrastructure/cloudflare-worker/worker.js, generateRouteContent).
 */
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Clock } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { GUIDE_METAS, SITE_URL, guideAssetUrl, guideUrl } from '@/guides/meta';
import { formatGuideDate } from '@/guides/render';

const CANONICAL = `${SITE_URL}/guides`;
const TITLE = 'Guides to online tests, exams and mock tests';
const DESCRIPTION =
    'Long-form, practical guides for teachers and coaching institutes: exam patterns and mock tests, making question papers, and running an exam day without surprises.';

/** ItemList so search engines see the collection, not fifteen loose pages. */
const JSON_LD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'CollectionPage',
            '@id': `${CANONICAL}#page`,
            url: CANONICAL,
            name: TITLE,
            description: DESCRIPTION,
            isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}#website` },
        },
        {
            '@type': 'ItemList',
            '@id': `${CANONICAL}#list`,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            numberOfItems: GUIDE_METAS.length,
            itemListElement: GUIDE_METAS.map((g, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: guideUrl(g.path),
                name: g.seoTitle,
            })),
        },
        {
            '@type': 'BreadcrumbList',
            '@id': `${CANONICAL}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'TestoZa', item: SITE_URL },
                { '@type': 'ListItem', position: 2, name: 'Guides', item: CANONICAL },
            ],
        },
    ],
};

/** The dek is a paragraph; a card shows its first sentence. */
const firstSentence = (text: string) => {
    const end = text.indexOf('. ');
    return end > 60 ? `${text.slice(0, end + 1)}` : text;
};

function GuideCard({ meta, featured }: { meta: (typeof GUIDE_METAS)[number]; featured?: boolean }) {
    return (
        <li className={featured ? 'sm:col-span-2' : undefined}>
            <Link
                to={meta.path}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.07] transition-all hover:-translate-y-0.5 hover:ring-sky-500/40 hover:shadow-[0_12px_32px_-18px_rgba(2,132,199,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-slate-900 dark:ring-white/10"
            >
                <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${featured ? 'aspect-[2.4/1]' : 'aspect-[1.91/1]'}`}>
                    <img
                        src={meta.cover.src}
                        alt=""
                        width={meta.cover.width}
                        height={meta.cover.height}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-left transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                </div>
                <div className={`flex flex-1 flex-col p-5 ${featured ? 'sm:p-6' : ''}`}>
                    <h2 className={`text-pretty font-semibold tracking-tight text-slate-900 dark:text-white ${featured ? 'text-xl sm:text-[22px]' : 'text-[17px]'}`}>
                        {meta.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">{firstSentence(meta.dek)}</p>
                    <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {meta.readMinutes} min read
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            •
                        </span>
                        {formatGuideDate(meta.dateModified)}
                        <span className="ml-auto inline-flex items-center gap-1 font-medium text-sky-600 transition-transform group-hover:translate-x-0.5 dark:text-sky-400">
                            Read
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                    </p>
                </div>
            </Link>
        </li>
    );
}

export default function GuidesIndex() {
    const [newest, ...rest] = GUIDE_METAS;

    return (
        <div className="min-h-screen bg-slate-50 font-[Outfit,system-ui,sans-serif] dark:bg-slate-950">
            <SEO title={TITLE} description={DESCRIPTION} url={CANONICAL} canonicalUrl={CANONICAL} type="website" schemas={[JSON_LD]} />
            <Helmet>
                <meta name="robots" content="index, follow, max-image-preview:large" />
                <meta property="og:image" content={guideAssetUrl(newest.cover.src)} />
            </Helmet>

            <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
                <nav aria-label="Breadcrumb" className="text-xs text-slate-500 dark:text-slate-500">
                    <Link to="/" className="hover:text-sky-600 dark:hover:text-sky-400">
                        TestoZa
                    </Link>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-slate-700 dark:text-slate-300">Guides</span>
                </nav>

                <header className="mt-4 max-w-2xl">
                    <h1 className="text-pretty text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{TITLE}</h1>
                    <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
                        Written for teachers, coaching institutes and schools, with TestoZa as the worked example. Each one is practical rather than promotional: real exam patterns,
                        demos you can use on this page, and an honest list of what the software still can’t do.
                    </p>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">
                        {GUIDE_METAS.length} guides · newest first
                    </p>
                </header>

                <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <GuideCard meta={newest} featured />
                    {rest.map((meta) => (
                        <GuideCard key={meta.slug} meta={meta} />
                    ))}
                </ul>

                <section className="mt-14 rounded-2xl bg-white p-6 ring-1 ring-slate-900/[0.07] dark:bg-slate-900 dark:ring-white/10 sm:p-8">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Start with one real test</h2>
                    <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        Every guide ends the same way, because it is the only advice that works: take one paper you were going to run anyway, put it online, and give it to one batch.
                        Making and sharing tests is free.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                            to="/generate-with-ai"
                            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                        >
                            Upload a paper, let AI type it
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Link
                            to="/create-test"
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                            Write your own questions
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
