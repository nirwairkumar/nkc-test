/**
 * Global site footer.
 *
 * Rendered once from Layout.tsx, which decides where it appears — it is
 * suppressed on live test, results and create-test routes. This component does
 * not control its own visibility, so editing it can never reintroduce a footer
 * on a page that deliberately has none.
 *
 * Two carry-overs from the original footer that must not be lost: the
 * registered business address, and the support/LinkedIn contact block.
 *
 * The link columns exist for a concrete reason (LANDING_PAGE_AUDIT.md C3):
 * roughly fifteen keyword landing pages were orphaned — present in the sitemap
 * but linked from nowhere. Sitemaps tell Google a URL exists; internal links
 * tell it the URL matters.
 *
 * Why it looks the way it does (rebuilt October 2026). The Solutions column had
 * reached twenty links because every new long-form guide added a row, and the
 * column was three times taller than its neighbours. The usual answer on large
 * sites is a bounded footer plus a hub page:
 *
 *   - A footer is a curated menu, not a sitemap. Columns stay at seven links or
 *     fewer (design systems that publish a number, such as the University of
 *     Maryland's, cap a mega-footer column at ten; Stripe runs 8–10), and the
 *     grid stays at six columns.
 *   - The long tail moves to /guides (pages/GuidesIndex.tsx). The footer keeps
 *     the five newest guides — the ones that most need discovering — and sends
 *     the rest there. Nothing is orphaned: every guide is on the hub, the
 *     sitemaps and in the other guides' closing links.
 *   - This is now self-limiting. A new guide pushes the oldest out of the
 *     column instead of making the footer one row taller.
 *   - The brand block sits on its own row rather than beside the columns, so the
 *     six columns get about 180px each instead of 125px and labels stop wrapping.
 *   - On phones each column is an accordion. Without it the footer was longer
 *     than most pages. The links stay in the DOM (hidden with CSS, not removed),
 *     which is how Google expects expandable content to be built.
 *
 * To pin a particular guide into the footer, replace GUIDE_METAS.slice(0, 5)
 * below with an explicit list of slugs.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Heart } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { GUIDE_METAS } from '@/guides/meta';

interface FooterLink {
    label: string;
    to: string;
    /** Shown with an arrow; opens in a new tab. */
    external?: boolean;
    /** The link out of a column to its hub, set apart from the items above it. */
    hub?: boolean;
}

/** Short labels: a footer column is ~180px wide, and long names wrap to three lines. */
const GUIDE_LABELS: Record<string, string> = {
    'classplus-alternative': 'Classplus alternative',
    'teachmint-alternative': 'Teachmint alternative',
    'kahoot-alternative': 'Kahoot alternative',
    'testportal-alternative': 'Testportal alternative',
    'bank-exam-mock-test-platform': 'Bank exam mock tests',
    'ssc-mock-test-platform': 'SSC mock tests',
    'jee-advanced-mock-test-software': 'JEE Advanced mocks',
    'chemistry-question-paper-maker': 'Chemistry papers',
    'math-test-maker': 'Math tests with equations',
    'prevent-cheating-in-online-exams': 'Prevent cheating',
    'hindi-online-test-maker': 'Hindi test maker',
    'how-to-conduct-online-exam': 'Conduct an online exam',
    'moodle-alternative': 'Moodle alternative',
    'ai-test-generator': 'AI test generator guide',
    'neet-online-test-software': 'NEET test software',
    'jee-mock-test-platform': 'JEE mock tests',
    'cbt-exam-software': 'CBT exam software',
    'best-online-test-platform': 'Best test platform',
};

/** The five newest guides, then the hub with the rest. GUIDE_METAS is newest first. */
const GUIDE_LINKS: FooterLink[] = [
    ...GUIDE_METAS.slice(0, 5).map((g) => ({ label: GUIDE_LABELS[g.slug] ?? g.seoTitle, to: g.path })),
    { label: `All ${GUIDE_METAS.length} guides`, to: '/guides', hub: true },
];

const LINK_COLUMNS: { title: string; links: readonly FooterLink[] }[] = [
    {
        title: 'Create',
        links: [
            { label: 'AI test generator', to: '/generate-with-ai' },
            { label: 'Create a mock test online', to: '/create-mock-test-online' },
            { label: 'Manual test builder', to: '/create-test' },
            { label: 'PDF to quiz', to: '/pdf-to-quiz' },
            { label: 'AI question generator', to: '/ai-question-generator' },
            { label: 'MCQ test maker', to: '/mcq-test-maker' },
            { label: 'Online quiz maker', to: '/online-quiz-maker' },
        ],
    },
    {
        title: 'Solutions',
        links: [
            { label: 'Online test maker', to: '/online-test-maker' },
            { label: 'Online exam software', to: '/online-exam-software' },
            { label: 'Exam software for schools', to: '/exam-software-for-schools' },
            { label: 'Online tests for coaching', to: '/online-test-for-coaching' },
            { label: 'Online proctoring software', to: '/online-proctoring-software' },
            { label: 'Assessment platform', to: '/assessment-platform' },
        ],
    },
    { title: 'Guides', links: GUIDE_LINKS },
    {
        title: 'Platform',
        links: [
            { label: 'Pricing and plans', to: '/pricing' },
            { label: 'Auto-grading software', to: '/auto-grading-software' },
            { label: 'Quiz creator', to: '/quiz-creator' },
            { label: 'Browse tests', to: '/more-tests' },
            { label: 'User guide', to: '/user-guide' },
        ],
    },
    {
        // Panna — TestoZa's free PDF tools, served from pdf.testoza.com (src/pdf).
        title: 'PDF tools',
        links: [
            { label: 'Panna PDF tools', to: 'https://pdf.testoza.com/', external: true },
            { label: 'Free PDF editor', to: 'https://pdf.testoza.com/edit-pdf', external: true },
            { label: 'Hindi PDF editor', to: 'https://pdf.testoza.com/edit-hindi-pdf', external: true },
            { label: 'LaTeX to PDF', to: 'https://pdf.testoza.com/latex-to-pdf', external: true },
            { label: 'ChatGPT to PDF', to: 'https://pdf.testoza.com/chatgpt-to-pdf', external: true },
            // The complete Panna guide (a static article on the blog, src/blog/articles).
            { label: 'Panna guide', to: 'https://blog.testoza.com/stop-painting-white-boxes-on-your-pdfs', external: true },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About TestoZa', to: '/about' },
            { label: 'Support', to: '/support' },
            { label: 'Blog & news', to: 'https://blog.testoza.com', external: true },
            { label: 'Privacy policy', to: '/privacy-policy' },
            { label: 'Terms & conditions', to: '/terms-and-conditions' },
        ],
    },
];

const LINK_CLS =
    'text-sm text-slate-600 transition-colors hover:text-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:text-slate-400 dark:hover:text-sky-400';

function FooterLinkItem({ link }: { link: FooterLink }) {
    return (
        <li>
            {/* Other TestoZa subdomains (pdf., blog.) open in a new tab. No
                noreferrer: the sites share one GA4 property, so the referrer
                lets it credit testoza.com for the visit. */}
            {link.external ? (
                <a href={link.to} target="_blank" rel="noopener" className={`inline-flex items-center gap-1 ${LINK_CLS}`}>
                    {link.label}
                    <span aria-hidden="true" className="text-[10px] text-slate-400">
                        ↗
                    </span>
                </a>
            ) : link.hub ? (
                <Link
                    to={link.to}
                    className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:text-sky-400 dark:hover:text-sky-300"
                >
                    {link.label}
                    <span aria-hidden="true">→</span>
                </Link>
            ) : (
                <Link to={link.to} className={LINK_CLS}>
                    {link.label}
                </Link>
            )}
        </li>
    );
}

const HEADING_CLS = 'text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900 dark:text-white';

/**
 * One column: a heading with its links from 768px up, an accordion below it.
 * On a phone the toggle is a real button with aria-expanded; on a laptop the
 * heading is plain text and every link is in the page, so there are no dead
 * controls in the keyboard order either way.
 */
function FooterColumn({ title, links }: { title: string; links: readonly FooterLink[] }) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const id = `footer-${title.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <nav aria-labelledby={id} className="border-b border-slate-200/80 md:border-0 dark:border-white/[0.06] dark:md:border-0">
            <h2 id={id} className={isMobile ? undefined : `${HEADING_CLS} md:py-0`}>
                {isMobile ? (
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        aria-controls={`${id}-list`}
                        className={`flex min-h-[44px] w-full items-center justify-between py-3 text-left ${HEADING_CLS}`}
                    >
                        {title}
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                ) : (
                    title
                )}
            </h2>
            {/* Always in the document, hidden with CSS when a phone section is
                closed. The links are what the footer is for, so they must stay
                crawlable whatever viewport the crawler uses. */}
            <ul id={`${id}-list`} className={`space-y-3 pb-4 md:mt-4 md:block md:space-y-2.5 md:pb-0 ${open ? 'block' : 'hidden'}`}>
                {links.map((l) => (
                    <FooterLinkItem key={l.to} link={l} />
                ))}
            </ul>
        </nav>
    );
}

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative w-full mt-auto border-t border-slate-200 bg-white font-[Outfit,system-ui,sans-serif] dark:border-white/[0.06] dark:bg-slate-950">
            <div className="container mx-auto px-4 pt-10 pb-6 sm:px-6 sm:pt-12">
                {/* ── Brand and contact, on one row so the columns below get the full width ── */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-sm">
                        <Link to="/" className="inline-block transition-opacity hover:opacity-95">
                            <p className="flex items-baseline text-2xl font-bold tracking-tight">
                                <span className="text-sky-500 dark:text-sky-400">Testo</span>
                                <span
                                    className="mx-[0.02em] text-[1.26em] font-black"
                                    style={{
                                        background: 'linear-gradient(to bottom, #FFE885, #F4B838, #9E6400)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    Z
                                </span>
                                <span className="text-sky-500 dark:text-sky-400">a</span>
                            </p>
                        </Link>
                        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            The free online test maker for teachers, coaching institutes and schools. Create, conduct and analyse exams — powered by AI.
                        </p>
                        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ SSL encrypted &amp; privacy protected
                        </p>
                    </div>

                    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:max-w-md">
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                            <dt className="font-medium text-slate-900 dark:text-slate-200">Email:</dt>
                            <dd>
                                <a
                                    href="mailto:support@testoza.com"
                                    className="text-slate-600 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                                >
                                    support@testoza.com
                                </a>
                            </dd>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                            <dt className="font-medium text-slate-900 dark:text-slate-200">LinkedIn:</dt>
                            <dd>
                                <a
                                    href="https://www.linkedin.com/company/testoza"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-sky-600 transition-colors hover:underline dark:text-sky-400"
                                >
                                    linkedin.com/company/testoza
                                </a>
                            </dd>
                        </div>
                        <div className="flex gap-x-1.5 sm:col-span-2">
                            <dt className="shrink-0 font-medium text-slate-900 dark:text-slate-200">Address:</dt>
                            <dd className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                1st Floor, Nirmaan, Sudha &amp; Shankar Inv Hub, IIT Madras, Chennai, Tamil Nadu 600036, India
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* ── Link columns — the orphaned-page fix (audit C3), capped and bounded ── */}
                <div className="mt-6 grid border-t border-slate-200/80 pt-2 md:mt-10 md:grid-cols-3 md:gap-x-8 md:gap-y-9 md:border-0 md:pt-0 lg:grid-cols-6 lg:gap-x-6 dark:border-white/[0.06]">
                    {LINK_COLUMNS.map((col) => (
                        <FooterColumn key={col.title} title={col.title} links={col.links} />
                    ))}
                </div>

                <div className="mt-8 border-t border-slate-200 pt-5 text-center dark:border-white/[0.06] sm:mt-10">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-slate-500 sm:flex-row sm:gap-2.5 sm:text-sm dark:text-slate-400">
                        <span>© {currentYear} TestoZa Educational Systems. All rights reserved.</span>
                        <span className="hidden text-slate-300 sm:inline dark:text-slate-700" aria-hidden="true">
                            •
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            Made with
                            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" aria-label="love" />
                            in India
                            <span className="ml-0.5 inline-flex items-center" title="India">
                                <svg
                                    className="h-3 w-4.5 rounded-[2px] shadow-xs ring-1 ring-black/10 dark:ring-white/10"
                                    viewBox="0 0 900 600"
                                    aria-label="India flag"
                                >
                                    <rect width="900" height="200" fill="#FF9933" />
                                    <rect y="200" width="900" height="200" fill="#FFFFFF" />
                                    <rect y="400" width="900" height="200" fill="#138808" />
                                    <circle cx="450" cy="300" r="80" fill="#000080" />
                                    <circle cx="450" cy="300" r="64" fill="#FFFFFF" />
                                    <circle cx="450" cy="300" r="16" fill="#000080" />
                                </svg>
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
