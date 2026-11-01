/**
 * The page shell every testoza.com guide shares: SEO head, dark hero, sticky
 * segmented section navigation, the short-answer card, sections, FAQ, closing
 * calls to action, sources and the floating button.
 *
 * Each guide supplies its own hero visual and widgets (so a guide's page chunk
 * only carries its own animations). Text, metadata and structured data live in
 * src/guides; the Cloudflare worker serves the same text to crawlers, so edit
 * the guide there, not here.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { guideAssetUrl, guideUrl } from '@/guides/meta';
import { formatGuideDate, guideClosingTitle, guideCta, guideJsonLd } from '@/guides/render';
import type { Guide, GuideBlock, GuideWidget } from '@/guides/types';
import './guidePage.css';

export interface GuidePageProps {
    guide: Guide;
    /** Words of the headline that get the gradient and the underline. */
    keyPhrase: string;
    /** The hero's visual (right column on wide screens). */
    hero: ReactNode;
    /** The quieter second hero button. A "#section" href scrolls within the page. */
    secondaryCta: { label: string; href: string };
    /** Renders this guide's widgets. */
    renderWidget: (name: GuideWidget) => ReactNode;
    /** Extra class on the root, for a guide's own styles. */
    className?: string;
    /** Line under the byline. */
    tagline?: string;
}

/**
 * On testoza.com the worker already puts the guide's JSON-LD in the HTML (not a
 * Helmet tag, so Helmet won't replace it). Adding it again would give Google two
 * FAQPage blocks.
 */
const graphInHtml = (canonical: string) =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]:not([data-rh])')).some((s) =>
        s.textContent?.includes(`${canonical}#article`),
    );

function Blocks({ blocks, renderWidget }: { blocks: GuideBlock[]; renderWidget: GuidePageProps['renderWidget'] }) {
    return (
        <>
            {blocks.map((block, i) =>
                block.type === 'html' ? (
                    <div key={i} className="gd-prose" dangerouslySetInnerHTML={{ __html: block.html }} />
                ) : (
                    <Fragment key={i}>{renderWidget(block.widget)}</Fragment>
                ),
            )}
        </>
    );
}

/** Sticky iOS-style segmented control; the white thumb slides to the section being read. */
function SegmentedNav({ items, active }: { items: { id: string; label: string }[]; active: string }) {
    const listRef = useRef<HTMLOListElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

    useLayoutEffect(() => {
        const list = listRef.current;
        const link = list?.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`);
        if (!list || !link) return;
        setThumb({ x: link.offsetLeft, w: link.offsetWidth });
        // Keep the active segment in view on narrow screens.
        const scroller = scrollRef.current;
        if (scroller && scroller.scrollWidth > scroller.clientWidth) {
            const target = link.offsetLeft - scroller.clientWidth / 2 + link.offsetWidth / 2;
            scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        }
    }, [active]);

    return (
        <nav className="gd-segnav" aria-label="Sections of this guide">
            <div className="gd-segnav-scroll" ref={scrollRef}>
                <ol ref={listRef}>
                    {thumb && (
                        <li aria-hidden="true" className="gd-segthumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />
                    )}
                    {items.map((item) => (
                        <li key={item.id}>
                            <a href={`#${item.id}`} className={active === item.id ? 'is-active' : undefined} aria-current={active === item.id ? 'true' : undefined}>
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    );
}

export default function GuidePage({
    guide,
    keyPhrase,
    hero,
    secondaryCta,
    renderWidget,
    className,
    tagline = 'Made in India for teachers and students',
}: GuidePageProps) {
    const { meta, body } = guide;
    const canonical = guideUrl(meta.path);
    const cta = guideCta(guide);
    const [titleBefore, titleAfter = ''] = meta.title.split(keyPhrase);
    const nav = [...body.sections.map((s) => ({ id: s.id, label: s.tocLabel })), { id: 'faq', label: 'FAQ' }];

    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef<HTMLElement>(null);
    const [progress, setProgress] = useState(0);
    const [active, setActive] = useState(nav[0].id);
    const [floatOn, setFloatOn] = useState(false);
    const [ldInHtml] = useState(() => graphInHtml(canonical));
    const [jsonLd] = useState(() => guideJsonLd(guide));
    const navIds = nav.map((n) => n.id).join(',');

    // Reading progress and the section being read.
    useEffect(() => {
        const ids = navIds.split(',');
        let queued = false;
        const update = () => {
            queued = false;
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
            const line = window.innerHeight * 0.35;
            let current = ids[0];
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = id;
            }
            setActive(current);
        };
        const onScroll = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [navIds]);

    // Sections fade and rise in as they arrive. Content is always in the DOM;
    // the hidden start state applies only once this runs (the .is-js class).
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const items = Array.from(root.querySelectorAll<HTMLElement>('.gd-reveal'));
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-in'));
            return;
        }
        root.classList.add('is-js');
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-in');
                        io.unobserve(e.target);
                    }
                }
            },
            { rootMargin: '0px 0px -12% 0px', threshold: 0.04 },
        );
        items.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    // Floating button: after the hero's buttons scroll away, until the closing section.
    useEffect(() => {
        const actions = actionsRef.current;
        const closing = closingRef.current;
        if (!actions || !closing || !('IntersectionObserver' in window)) return;
        let actionsVisible = true;
        let closingReached = false;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.target === actions) actionsVisible = e.isIntersecting;
                if (e.target === closing) closingReached = e.isIntersecting || e.boundingClientRect.top < 0;
            }
            setFloatOn(!actionsVisible && !closingReached);
        });
        io.observe(actions);
        io.observe(closing);
        return () => io.disconnect();
    }, []);

    // Internal links in the guide text navigate inside the app; clicks through
    // to the product are counted.
    const onClick = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement).closest('a');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) return;
        if (href.startsWith('/')) {
            analytics.track('guide_cta_click', { guide: meta.slug, target: href.split('?')[0] });
            if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !link.target) {
                e.preventDefault();
                navigate(href);
            }
        }
    };

    const published = formatGuideDate(meta.dateModified);
    const closingTitle = guideClosingTitle(guide);

    return (
        <div className={`gd${className ? ` ${className}` : ''}`} ref={rootRef} onClick={onClick}>
            <SEO
                title={meta.seoTitle}
                description={meta.description}
                image={guideAssetUrl(meta.cover.src)}
                type="article"
                url={canonical}
                canonicalUrl={canonical}
                keywords={meta.keywords}
                schemas={ldInHtml ? [] : [jsonLd]}
            />
            <Helmet>
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta property="article:published_time" content={meta.datePublished} />
                <meta property="article:modified_time" content={meta.dateModified} />
                <meta property="og:image:width" content={String(meta.cover.width)} />
                <meta property="og:image:height" content={String(meta.cover.height)} />
                <meta property="og:image:alt" content={meta.cover.alt} />
            </Helmet>

            <div className="gd-progress" aria-hidden="true">
                <div style={{ transform: `scaleX(${progress})` }} />
            </div>

            <header className="gd-hero">
                <div className="gd-hero-grid">
                    <div>
                        <nav className="gd-crumbs" aria-label="Breadcrumb">
                            <Link to="/">TestoZa</Link>
                            <span aria-hidden="true">›</span>
                            <span>Guides</span>
                        </nav>
                        <p className="gd-eyebrow">
                            <b>Guide</b> Updated {published} · {meta.readMinutes} min read
                        </p>
                        <h1 className="gd-h1">
                            {titleBefore}
                            <span className="gd-h1-key">
                                <span>{keyPhrase}</span>
                            </span>
                            {titleAfter}
                        </h1>
                        <p className="gd-dek">{meta.dek}</p>
                        <div className="gd-actions" ref={actionsRef}>
                            <Link to={cta.href} className="gd-btn">
                                <span>{cta.label}</span>
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            {secondaryCta.href.startsWith('#') ? (
                                <a href={secondaryCta.href} className="gd-btn gd-btn--glass">
                                    <span>{secondaryCta.label}</span>
                                </a>
                            ) : (
                                <Link to={secondaryCta.href} className="gd-btn gd-btn--glass">
                                    <span>{secondaryCta.label}</span>
                                </Link>
                            )}
                        </div>
                        <div className="gd-byline">
                            <img src="/logo-testoza-square.svg" alt="" width={32} height={32} />
                            <span>
                                By <strong>{meta.author}</strong>
                            </span>
                            <span>{tagline}</span>
                        </div>
                    </div>
                    {hero}
                </div>
                <div className="gd-hero-fade" aria-hidden="true" />
            </header>

            <SegmentedNav items={nav} active={active} />

            <article className="gd-body">
                <div className="gd-lead">
                    <Blocks blocks={body.intro} renderWidget={renderWidget} />
                </div>

                <aside className="gd-answer gd-reveal" aria-label="The short answer">
                    <div className="gd-answer-in">
                        <p className="gd-answer-label">
                            <Sparkles className="h-4 w-4" aria-hidden="true" /> The short answer
                        </p>
                        <p>{body.answer}</p>
                    </div>
                </aside>

                {body.sections.map((section) => (
                    <section key={section.id} id={section.id} className="gd-section gd-reveal" aria-labelledby={`${section.id}-title`}>
                        {section.kicker && <p className="gd-kicker">{section.kicker}</p>}
                        <h2 className="gd-h2" id={`${section.id}-title`}>
                            {section.title}
                        </h2>
                        <Blocks blocks={section.blocks} renderWidget={renderWidget} />
                    </section>
                ))}

                <section id="faq" className="gd-section gd-reveal" aria-labelledby="faq-title">
                    <p className="gd-kicker">Questions</p>
                    <h2 className="gd-h2" id="faq-title">
                        Frequently asked questions
                    </h2>
                    <div className="gd-faq">
                        {body.faqs.map((f, i) => (
                            <details key={f.q} open={i === 0}>
                                <summary>{f.q}</summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="gd-closing gd-reveal" ref={closingRef} aria-labelledby="start-title">
                    <p className="gd-kicker">Your turn</p>
                    <h2 className="gd-h2" id="start-title">
                        {closingTitle}
                    </h2>
                    <Blocks blocks={body.closing} renderWidget={renderWidget} />
                </section>

                <footer className="gd-sources">
                    <h2>Sources</h2>
                    <ul>
                        {body.sources.map((g) => (
                            <li key={g.label}>
                                {g.label}:{' '}
                                {g.links.map((l, i) => (
                                    <Fragment key={l.href}>
                                        {i > 0 && ', '}
                                        <a href={l.href} target="_blank" rel="noopener noreferrer">
                                            {l.label}
                                        </a>
                                    </Fragment>
                                ))}
                            </li>
                        ))}
                    </ul>
                    <p>
                        Written by the {meta.author}. Last updated {published}. Spotted something out of date?{' '}
                        <Link to="/support">Tell us</Link>.
                    </p>
                </footer>
            </article>

            <Link to={cta.href} className={`gd-float${floatOn ? ' is-on' : ''}`} aria-hidden={!floatOn} tabIndex={floatOn ? 0 : -1}>
                <i aria-hidden="true" />
                {cta.label}
            </Link>
        </div>
    );
}
