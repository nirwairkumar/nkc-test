/**
 * Global site footer.
 *
 * Rendered once from Layout.tsx, which decides where it appears — it is
 * suppressed on live test, results and create-test routes. This component does
 * not control its own visibility, so editing it can never reintroduce a footer
 * on a page that deliberately has none.
 *
 * Structure follows the V2 landing design, with two deliberate carry-overs
 * from the previous footer that V2 did not have and which must not be lost:
 * the registered business address, and the support/LinkedIn contact block.
 *
 * The four link columns exist for a concrete reason (LANDING_PAGE_AUDIT.md
 * C3): roughly fifteen keyword landing pages were orphaned — present in the
 * sitemap but linked from nowhere. Sitemaps tell Google a URL exists; internal
 * links tell it the URL matters. Putting them in the shared footer means every
 * page on the site passes equity to them, not just the homepage.
 */

import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const LINK_COLUMNS = [
    {
        title: 'Create',
        links: [
            { label: 'AI test generator', to: '/generate-with-ai' },
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
            { label: 'Panna PDF tools', to: 'https://pdf.testoza.com/' },
            { label: 'Free PDF editor', to: 'https://pdf.testoza.com/edit-pdf' },
            { label: 'Hindi PDF editor', to: 'https://pdf.testoza.com/edit-hindi-pdf' },
            { label: 'LaTeX to PDF', to: 'https://pdf.testoza.com/latex-to-pdf' },
            { label: 'ChatGPT to PDF', to: 'https://pdf.testoza.com/chatgpt-to-pdf' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About TestoZa', to: '/about' },
            { label: 'Support', to: '/support' },
            { label: 'Privacy policy', to: '/privacy-policy' },
            { label: 'Terms & conditions', to: '/terms-and-conditions' },
        ],
    },
] as const;

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative w-full mt-auto border-t border-slate-200 bg-white font-[Outfit,system-ui,sans-serif] dark:border-white/[0.06] dark:bg-slate-950">
            <div className="container mx-auto px-4 pt-12 pb-6 sm:px-6 sm:pt-14 sm:pb-6">
                <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 lg:gap-8">
                    {/* Brand + contact */}
                    <div className="sm:col-span-2 md:col-span-3 lg:col-span-2">
                        <Link to="/" className="inline-block hover:opacity-95 transition-opacity">
                            <p className="flex items-baseline font-bold tracking-tight text-2xl">
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
                        <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            The free online test maker for teachers, coaching institutes and
                            schools. Create, conduct and analyse exams — powered by AI.
                        </p>

                        <dl className="mt-6 space-y-2 text-sm">
                            <div className="flex flex-wrap items-center gap-x-1.5">
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
                            <div className="flex flex-wrap items-center gap-x-1.5">
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
                            <div className="flex gap-x-1.5">
                                <dt className="shrink-0 font-medium text-slate-900 dark:text-slate-200">Address:</dt>
                                <dd className="text-xs text-slate-600 dark:text-slate-400">
                                    1st Floor, Nirmaan, Sudha &amp; Shankar Inv Hub, IIT Madras,
                                    Chennai, Tamil Nadu 600036, India
                                </dd>
                            </div>
                        </dl>

                        <p className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ SSL encrypted &amp; privacy protected
                        </p>
                    </div>

                    {/* Link columns — the orphaned-page fix (audit C3) */}
                    {LINK_COLUMNS.map((col) => (
                        <nav key={col.title} aria-labelledby={`footer-${col.title}`}>
                            <h2
                                id={`footer-${col.title}`}
                                className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900 dark:text-white"
                            >
                                {col.title}
                            </h2>
                            <ul className="mt-4 space-y-2.5">
                                {col.links.map((l) => {
                                    const cls =
                                        'text-sm text-slate-600 transition-colors hover:text-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 dark:text-slate-400 dark:hover:text-sky-400';
                                    return (
                                        <li key={l.to}>
                                            {/* Other TestoZa subdomains (pdf.) open in a new tab. No
                                                noreferrer: both sites share one GA4 property, so the
                                                referrer lets it credit testoza.com for the visit. */}
                                            {l.to.startsWith('https://') ? (
                                                <a
                                                    href={l.to}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className={`inline-flex items-center gap-1 ${cls}`}
                                                >
                                                    {l.label}
                                                    <span aria-hidden="true" className="text-[10px] text-slate-400">↗</span>
                                                </a>
                                            ) : (
                                                <Link to={l.to} className={cls}>
                                                    {l.label}
                                                </Link>
                                            )}
                                        </li>
                                    );
                                })}
                                {/* Blog lives on a subdomain, so it stays a plain anchor */}
                                {col.title === 'Company' && (
                                    <li>
                                        <a
                                            href="https://blog.testoza.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                                        >
                                            Blog &amp; news
                                            <span aria-hidden="true" className="text-[10px] text-slate-400">↗</span>
                                        </a>
                                    </li>
                                )}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="mt-8 border-t border-slate-200 pt-5 text-center dark:border-white/[0.06] sm:mt-10 sm:pt-5">
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span>© 2026 TestoZa Educational Systems. All rights reserved.</span>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-1.5">
                            Made with
                            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" aria-label="love" />
                            in India
                            <span className="inline-flex items-center ml-0.5" title="India">
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
