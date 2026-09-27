/**
 * Google Ads landing pages: testoza.com/quiz-creator and /assessment-platform.
 *
 * Visual-first and light on words: every section is a picture with a headline.
 * Copy lives in src/landing/adsLanding.ts (the Cloudflare worker serves the same
 * text to crawlers). Read the compliance note at the top of that file before
 * adding wording: no proctoring terms, no invented testimonials or ratings.
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { ADS_CTA, ADS_SOURCES, ADS_STEPS, adsFaqSchema, adsLandingFor } from '@/landing/adsLanding';
import {
    AnyPhone,
    Audiences,
    LanguageCard,
    QuestionTypes,
    QuizPhone,
    ScoreRing,
    ShareCard,
    SourceIcon,
    TryOne,
} from './ads/AdsLandingWidgets';
import './ads/adsLanding.css';

const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TestoZa',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: 'https://testoza.com/',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
};

export default function GoogleAdsLanding() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const copy = adsLandingFor(pathname);
    const rootRef = useRef<HTMLDivElement>(null);
    const heroCtaRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef<HTMLElement>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [floatOn, setFloatOn] = useState(false);
    const [floatPeek, setFloatPeek] = useState(true);
    // On testoza.com the worker already puts this page's FAQPage JSON-LD in the HTML
    // (script#schema-faq, not a Helmet tag); adding it again would duplicate it.
    const [faqInHtml] = useState(
        () => !!document.querySelector('script#schema-faq:not([data-rh])')?.textContent?.includes(copy.faqs[0].q),
    );

    // Sections rise in as they arrive. Content is visible without JavaScript:
    // the hidden state needs the qcl-js class.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        root.classList.add('qcl-js');
        const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-in');
                        io.unobserve(e.target);
                    }
                }
            },
            { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
        );
        items.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [pathname]);

    // Floating button: after the hero's button scrolls away, until the closing card.
    // On phones it steps aside while reading down, like Safari's toolbar.
    useEffect(() => {
        const cta = heroCtaRef.current;
        const closing = closingRef.current;
        if (!cta || !closing || !('IntersectionObserver' in window)) return;
        let ctaVisible = true;
        let closingReached = false;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.target === cta) ctaVisible = e.isIntersecting;
                if (e.target === closing) closingReached = e.isIntersecting || e.boundingClientRect.top < 0;
            }
            setFloatOn(!ctaVisible && !closingReached);
        });
        io.observe(cta);
        io.observe(closing);

        let lastY = window.scrollY;
        const narrow = window.matchMedia?.('(max-width: 1023px)');
        const onScroll = () => {
            const dy = window.scrollY - lastY;
            if (!narrow?.matches) setFloatPeek(true);
            else if (Math.abs(dy) > 6) setFloatPeek(dy < 0);
            if (Math.abs(dy) > 6) lastY = window.scrollY;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            io.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    // Links are real links (crawlable); same-site ones open inside the app.
    const onClick = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement).closest('a');
        if (!link || !link.href) return;
        let url: URL;
        try {
            url = new URL(link.href);
        } catch {
            return;
        }
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname) return; // in-page anchors
        analytics.track('ads_landing_cta', { page: copy.path, target: url.pathname, where: link.dataset.where ?? 'body' });
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    const cta = (where: string, className = 'qcl-btn qcl-btn--primary') => (
        <a className={className} href={ADS_CTA.href} data-where={where}>
            {copy.ctaLabel}
            <ArrowRight className="qcl-btn-arrow" aria-hidden="true" />
        </a>
    );

    return (
        <div className="qcl" ref={rootRef} onClick={onClick}>
            <SEO
                title={copy.seoTitle}
                description={copy.description}
                canonicalUrl={`https://testoza.com${copy.path}`}
                keywords={copy.keywords}
                schemas={faqInHtml ? [softwareSchema] : [adsFaqSchema(copy), softwareSchema]}
            />

            {/* Hero */}
            <header className="qcl-hero">
                <div className="qcl-hero-bg" aria-hidden="true" />
                <div className="qcl-hero-inner">
                    <div className="qcl-hero-copy">
                        <p className="qcl-eyebrow">{copy.eyebrow}</p>
                        <h1 className="qcl-h1">
                            <span>{copy.h1Lead}</span> <span className="qcl-h1-rest">{copy.h1Rest}</span>
                        </h1>
                        <p className="qcl-sub">{copy.sub}</p>
                        <div className="qcl-actions" ref={heroCtaRef}>
                            {cta('hero')}
                            <a className="qcl-btn qcl-btn--glass" href="#how">See how it works</a>
                        </div>
                        <ul className="qcl-proof" aria-label="At a glance">
                            <li>Free to start</li>
                            <li>No app for students</li>
                            <li>English &amp; <span lang="hi">हिंदी</span></li>
                            <li>Auto-graded</li>
                        </ul>
                    </div>
                    <QuizPhone />
                </div>
            </header>

            {/* Four ways in */}
            <section className="qcl-sec" aria-labelledby="qcl-ways">
                <h2 id="qcl-ways" className="qcl-h2" data-reveal>{copy.waysTitle}</h2>
                <ul className="qcl-sources">
                    {ADS_SOURCES.map((s, i) => {
                        return (
                            <li key={s.id} data-reveal style={{ ['--d' as string]: i }}>
                                <a href={s.href} className="qcl-source" data-src={s.id}>
                                    <span className="qcl-appicon"><SourceIcon id={s.id} /></span>
                                    <b>{s.label}</b>
                                    <span>{s.caption}</span>
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Three steps */}
            <section className="qcl-sec" id="how" aria-labelledby="qcl-steps">
                <h2 id="qcl-steps" className="qcl-h2" data-reveal>{copy.stepsTitle}</h2>
                <ol className="qcl-steps">
                    {ADS_STEPS.map((s, i) => (
                        <li key={s.title} data-reveal style={{ ['--d' as string]: i }}>
                            <div className={`qcl-step-art qcl-step-art--${i}`} aria-hidden="true">
                                {i === 0 && (<><span className="qcl-doc"><i /><i /><i /><i /></span><span className="qcl-arrow-up" /></>)}
                                {i === 1 && (<><span className="qcl-qcard"><i /><i /></span><span className="qcl-qcard"><i /><i /></span><span className="qcl-sparkle">✦</span></>)}
                                {i === 2 && (<><span className="qcl-link-pill" /><span className="qcl-ticks"><i /><i /><i /></span></>)}
                            </div>
                            <span className="qcl-step-n">{i + 1}</span>
                            <h3>{s.title}</h3>
                            <p>{s.caption}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Bento grid */}
            <section className="qcl-sec" aria-labelledby="qcl-grid">
                <h2 id="qcl-grid" className="qcl-h2" data-reveal>{copy.gridTitle}</h2>
                <div className="qcl-bento">
                    <article className="qcl-cell qcl-cell--wide" data-reveal>
                        <h3>Every question type</h3>
                        <p>MCQs, numericals, passages, maths.</p>
                        <QuestionTypes />
                    </article>
                    <article className="qcl-cell qcl-cell--tall" data-reveal style={{ ['--d' as string]: 1 }}>
                        <h3>Instant results</h3>
                        <p>Scores the moment they submit.</p>
                        <ScoreRing />
                    </article>
                    <article className="qcl-cell" data-reveal style={{ ['--d' as string]: 2 }}>
                        <h3>English + <span lang="hi">हिंदी</span></h3>
                        <LanguageCard />
                    </article>
                    <article className="qcl-cell qcl-cell--price" data-reveal style={{ ['--d' as string]: 3 }}>
                        <span className="qcl-price">₹0</span>
                        <h3>Unlimited quizzes</h3>
                        <p>And unlimited students.</p>
                    </article>
                    <article className="qcl-cell" data-reveal style={{ ['--d' as string]: 4 }}>
                        <h3>Any phone</h3>
                        <p>No app to install.</p>
                        <AnyPhone />
                    </article>
                    <article className="qcl-cell qcl-cell--wide" data-reveal style={{ ['--d' as string]: 5 }}>
                        <h3>Share one link</h3>
                        <p>WhatsApp, email or Google Classroom.</p>
                        <ShareCard />
                    </article>
                </div>
            </section>

            {/* Try one */}
            <section className="qcl-sec qcl-sec--narrow" aria-labelledby="qcl-try">
                <h2 id="qcl-try" className="qcl-h2" data-reveal>{copy.tryTitle}</h2>
                <TryOne />
            </section>

            {/* Who it's for */}
            <section className="qcl-sec qcl-sec--narrow" aria-labelledby="qcl-aud">
                <h2 id="qcl-aud" className="qcl-h2" data-reveal>{copy.audienceTitle}</h2>
                <Audiences />
            </section>

            {/* FAQ */}
            <section className="qcl-sec qcl-sec--narrow" aria-labelledby="qcl-faq">
                <h2 id="qcl-faq" className="qcl-h2" data-reveal>Questions</h2>
                <div className="qcl-faq" data-reveal>
                    {copy.faqs.map((f, i) => (
                        <div key={f.q} className={`qcl-faq-item${openFaq === i ? ' is-open' : ''}`}>
                            <h3>
                                <button
                                    type="button"
                                    id={`qcl-faq-q-${i}`}
                                    aria-expanded={openFaq === i}
                                    aria-controls={`qcl-faq-a-${i}`}
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span>{f.q}</span>
                                    <ChevronRight className="qcl-faq-chev" aria-hidden="true" />
                                </button>
                            </h3>
                            <div className="qcl-faq-a" id={`qcl-faq-a-${i}`} role="region" aria-labelledby={`qcl-faq-q-${i}`}>
                                <div><p>{f.a}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Closing */}
            <section className="qcl-closing" ref={closingRef} aria-labelledby="qcl-close" data-reveal>
                <div className="qcl-closing-glow" aria-hidden="true" />
                <h2 id="qcl-close">{copy.closingTitle}</h2>
                <p>{copy.closingSub}</p>
                <div className="qcl-actions qcl-actions--center">
                    {cta('closing')}
                    <a className="qcl-btn qcl-btn--dark" href="/pricing">See pricing</a>
                </div>
            </section>

            <a
                className={`qcl-floatcta${floatOn && floatPeek ? ' is-on' : ''}`}
                href={ADS_CTA.href}
                data-where="float"
                tabIndex={floatOn && floatPeek ? 0 : -1}
                aria-hidden={!(floatOn && floatPeek)}
            >
                {copy.ctaLabel}
                <ArrowRight className="qcl-btn-arrow" aria-hidden="true" />
            </a>
        </div>
    );
}
