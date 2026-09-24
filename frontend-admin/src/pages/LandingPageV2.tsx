/**
 * Landing Page V2 — PREVIEW BUILD.
 *
 * Lives in the ADMIN app on purpose: it is not shipped in the public bundle and
 * is not reachable from testoza.com. The live landing page
 * (frontend/src/pages/LandingPage.tsx) is untouched.
 *
 * Reachable at /landing-v2 in the admin app, behind the admin gate, and
 * embedded in Admin → Testing Tools for side-by-side review.
 *
 * Implements the recommendations in LANDING_PAGE_AUDIT.md:
 *   C1  one static keyword <h1> (live page rotates it every 4s)
 *   C2  a real hero subheadline (live page renders `&nbsp;`)
 *   C3  every orphaned keyword page linked from nav + footer
 *   C4  proof immediately under the hero, not 6,000px down
 *   M1  says what the product is in the first line
 *   M4  one dominant CTA instead of three equal ones
 *   P3  a concrete, stable LCP element
 *
 * When promoting to production, move this file and ./components/landing-v2/*
 * into frontend/src, swap <a href> for react-router <Link>, and render the
 * JSON-LD through the existing SEO component.
 */

import { useEffect, useState } from 'react';
import LandingV2Hero from '@/components/landing-v2/LandingV2Hero';
import {
    FeatureDeepDives, HowItWorks, ProofBand, QuestionTypesStrip, ValueProps,
} from '@/components/landing-v2/LandingV2Sections';
import {
    Comparison, Faq, FinalCta, LandingV2Footer, Testimonials,
} from '@/components/landing-v2/LandingV2Closing';
import { FAQS, HERO, NAV_LINKS } from '@/components/landing-v2/content';

/** Escaped for a <script> context — JSON.stringify does not escape `<`. */
function safeJsonLd(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

const FAQ_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
};

const APP_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TestoZa',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: HERO.sub,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    // aggregateRating deliberately omitted — adding one without real reviews
    // is a structured-data violation (audit Part 6, item 15).
};

function PreviewBanner() {
    return (
        <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center dark:border-amber-700 dark:bg-amber-950">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Landing Page V2 — internal preview. Not live, not indexed. The public site is unchanged.
            </p>
        </div>
    );
}

function LandingV2Nav() {
    const [scrolled, setScrolled] = useState(false);

    // Nav gains a surface only once the hero starts scrolling away — it floats
    // over the hero at rest, which is what keeps the first viewport feeling open.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-40 transition-colors duration-300 ${
                scrolled
                    ? 'border-b border-white/[0.07] bg-[#020617]/85 backdrop-blur-xl'
                    : 'border-b border-transparent bg-transparent'
            }`}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <a
                    href="#hero-heading"
                    className="flex items-baseline text-xl font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
                >
                    <span className="text-sky-400">Testo</span>
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
                    <span className="text-sky-400">a</span>
                </a>

                {/* Pricing is present here — the live navbar omits it (audit C3). */}
                <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
                    {NAV_LINKS.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            className="rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                        >
                            {l.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <a
                        href="/login"
                        className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-slate-300 transition-colors hover:text-white sm:inline-block"
                    >
                        Log in
                    </a>
                    <a
                        href="/generate-with-ai"
                        className="rounded-lg bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-2 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_6px_16px_-6px_rgba(2,132,199,0.8)] transition-transform duration-200 motion-safe:hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                        Start free
                    </a>
                </div>
            </div>
        </header>
    );
}

export default function LandingPageV2() {
    // Preview only — must never be indexed even if the admin app is crawled.
    useEffect(() => {
        const tag = document.createElement('meta');
        tag.name = 'robots';
        tag.content = 'noindex, nofollow';
        document.head.appendChild(tag);
        const prevTitle = document.title;
        document.title = 'Landing Page V2 (preview) — TestoZa Admin';
        return () => {
            document.head.removeChild(tag);
            document.title = prevTitle;
        };
    }, []);

    return (
        <div className="min-h-screen bg-white font-[Outfit,system-ui,sans-serif] antialiased dark:bg-slate-950">
            <PreviewBanner />
            <LandingV2Nav />

            <main>
                <LandingV2Hero />
                <ProofBand />
                <ValueProps />
                <HowItWorks />
                <FeatureDeepDives />
                <QuestionTypesStrip />
                <Comparison />
                {/* Testimonials disabled: placeholder quotes, no real ones to publish yet. */}
                {/* <Testimonials /> */}
                <Faq />
                <FinalCta />
            </main>

            <LandingV2Footer />

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(APP_SCHEMA) }} />
        </div>
    );
}
