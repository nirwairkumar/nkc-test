/**
 * testoza.com/create-mock-test-online — the long-form guide to turning a
 * textbook photo, a PDF or an old question paper into a timed mock test.
 *
 * Text, metadata and structured data live in src/guides; the Cloudflare worker
 * serves the same text to crawlers, so edit the guide there, not here.
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, ChevronRight, Copy, Linkedin, MessageCircle, Twitter } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { CREATE_MOCK_TEST_ONLINE as GUIDE } from '@/guides/mock-test/createMockTestOnline';
import { formatGuideDate, guideAssetUrl, guideJsonLd, guideUrl } from '@/guides/mock-test/render';
import type { GuideBlock, GuideWidget } from '@/guides/mock-test/types';
import { PaletteDemo, PhoneHero, SourcePicker, TimeMatrix } from './MockTestWidgets';
import './createMockTestOnline.css';

const { meta, body } = GUIDE;
const CANONICAL = guideUrl(meta.path);
const JSON_LD = guideJsonLd(GUIDE);
const TITLE_REST = meta.title.slice(meta.titleLead.length).trim();

const WIDGETS: Record<GuideWidget, () => JSX.Element> = {
    'source-picker': SourcePicker,
    'palette-demo': PaletteDemo,
    'time-matrix': TimeMatrix,
};

const TOC = [
    ...body.sections.map((s) => ({ id: s.id, label: s.tocLabel ?? s.title })),
    { id: 'faq', label: 'Questions' },
    { id: 'start', label: 'Start now' },
];

/**
 * On testoza.com the worker already puts this page's JSON-LD in the HTML (not a
 * Helmet tag, so Helmet won't replace it). Adding it again would give Google two
 * FAQPage and two HowTo blocks.
 */
const graphInHtml = () =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]:not([data-rh])')).some((s) =>
        s.textContent?.includes(`${CANONICAL}#article`),
    );

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
    return (
        <>
            {blocks.map((block, i) => {
                if (block.type === 'html') {
                    return <div key={i} className="cmt-html" dangerouslySetInnerHTML={{ __html: block.html }} />;
                }
                const Widget = WIDGETS[block.widget];
                return <Widget key={i} />;
            })}
        </>
    );
}

function ShareButtons({ where }: { where: string }) {
    const [copied, setCopied] = useState(false);
    const share = (network: string, url: string) => {
        analytics.track('guide_share', { guide: meta.slug, network, where });
        window.open(url, '_blank', 'noopener');
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(CANONICAL);
            setCopied(true);
            toast.success('Link copied');
            setTimeout(() => setCopied(false), 2500);
            analytics.track('guide_share', { guide: meta.slug, network: 'copy', where });
        } catch {
            toast.error('Could not copy. The link is ' + CANONICAL);
        }
    };
    const url = encodeURIComponent(CANONICAL);
    const text = encodeURIComponent(meta.titleLead);
    return (
        <div className="cmt-share">
            <button type="button" title="Share on WhatsApp" aria-label="Share on WhatsApp" onClick={() => share('whatsapp', `https://api.whatsapp.com/send?text=${text}%20${url}`)}>
                <MessageCircle className="h-[18px] w-[18px]" />
            </button>
            <button type="button" title="Share on LinkedIn" aria-label="Share on LinkedIn" onClick={() => share('linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${url}`)}>
                <Linkedin className="h-[18px] w-[18px]" />
            </button>
            <button type="button" title="Share on X" aria-label="Share on X" onClick={() => share('x', `https://twitter.com/intent/tweet?url=${url}&text=${text}`)}>
                <Twitter className="h-[18px] w-[18px]" />
            </button>
            <button type="button" title="Copy link" aria-label="Copy link" onClick={copy}>
                {copied ? <Check className="h-[18px] w-[18px]" /> : <Copy className="h-[18px] w-[18px]" />}
            </button>
        </div>
    );
}

function Faq() {
    const [open, setOpen] = useState<number | null>(0);
    return (
        <div className="cmt-faq" data-reveal>
            {body.faqs.map((f, i) => (
                <div key={f.q} className={`cmt-faq-item${open === i ? ' is-open' : ''}`}>
                    <h3>
                        <button
                            type="button"
                            id={`cmt-faq-q-${i}`}
                            aria-expanded={open === i}
                            aria-controls={`cmt-faq-a-${i}`}
                            onClick={() => setOpen(open === i ? null : i)}
                        >
                            <span>{f.q}</span>
                            <ChevronRight className="cmt-faq-chev" aria-hidden="true" />
                        </button>
                    </h3>
                    <div className="cmt-faq-a" id={`cmt-faq-a-${i}`} role="region" aria-labelledby={`cmt-faq-q-${i}`}>
                        <div>
                            <p>{f.a}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function CreateMockTestOnline() {
    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef<HTMLElement>(null);
    const [progress, setProgress] = useState(0);
    const [active, setActive] = useState(TOC[0].id);
    const [floatOn, setFloatOn] = useState(false);
    const [floatPeek, setFloatPeek] = useState(true);
    const [ldInHtml] = useState(graphInHtml);

    // Reading progress, the section the reader is in (for the contents rail), and
    // scroll direction: on phones and tablets the floating button behaves like
    // Safari's toolbar, out of the way while reading down, back on scrolling up.
    useEffect(() => {
        let queued = false;
        let lastY = window.scrollY;
        const narrow = window.matchMedia?.('(max-width: 1023px)');
        const update = () => {
            queued = false;
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
            const dy = window.scrollY - lastY;
            if (!narrow?.matches) setFloatPeek(true);
            else if (Math.abs(dy) > 6) setFloatPeek(dy < 0);
            if (Math.abs(dy) > 6 || !narrow?.matches) lastY = window.scrollY;
            const line = window.innerHeight * 0.3;
            let current = TOC[0].id;
            for (const item of TOC) {
                const el = document.getElementById(item.id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = item.id;
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
    }, []);

    // Cards and lists rise into place as they scroll into view. Everything is
    // visible without JavaScript: the hidden state needs the cmt-js class.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        root.classList.add('cmt-js');
        const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !('IntersectionObserver' in window)) {
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
            { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
        );
        items.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    // The floating button: shown once the hero's buttons have scrolled away,
    // hidden again when the closing call to action is on screen.
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

    // Links in the guide's HTML: count clicks through to the product, and open
    // same-site links inside the app (testoza.com then hands app pages straight
    // to app.testoza.com instead of loading this site a second time).
    const onClick = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement).closest('a');
        if (!link || !link.href) return;
        let url: URL;
        try {
            url = new URL(link.href);
        } catch {
            return;
        }
        if (['testoza.com', 'www.testoza.com', 'app.testoza.com', 'pdf.testoza.com'].includes(url.hostname) || url.origin === window.location.origin) {
            if (url.pathname !== meta.path) {
                analytics.track('guide_cta_click', { guide: meta.slug, target: `${url.hostname}${url.pathname}` });
            }
        }
        const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && link.target !== '_blank';
        if (!plain || e.defaultPrevented || url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return; // in-page anchors scroll natively
        e.preventDefault();
        navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    const updated = formatGuideDate(meta.dateModified);

    return (
        <div className="cmt" ref={rootRef} onClick={onClick}>
            <SEO
                title={meta.seoTitle}
                description={meta.description}
                image={guideAssetUrl(meta.cover.src)}
                type="article"
                url={CANONICAL}
                canonicalUrl={CANONICAL}
                keywords={meta.keywords}
                schemas={ldInHtml ? [] : [JSON_LD]}
            />
            <Helmet>
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta property="article:published_time" content={meta.datePublished} />
                <meta property="article:modified_time" content={meta.dateModified} />
                <meta property="og:image:width" content={String(meta.cover.width)} />
                <meta property="og:image:height" content={String(meta.cover.height)} />
                <meta property="og:image:alt" content={meta.cover.alt} />
                <meta property="og:locale" content="en_IN" />
            </Helmet>

            <div className="cmt-progress" aria-hidden="true">
                <div style={{ transform: `scaleX(${progress})` }} />
            </div>

            <header className="cmt-hero">
                <div className="cmt-hero-bg" aria-hidden="true" />
                <div className="cmt-hero-inner">
                    <div className="cmt-hero-copy">
                        <nav className="cmt-crumbs" aria-label="Breadcrumb">
                            <Link to="/">TestoZa</Link>
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            <span aria-current="page">{meta.eyebrow}</span>
                        </nav>
                        <h1 className="cmt-h1">
                            <span className="cmt-h1-lead">{meta.titleLead}</span> <span className="cmt-h1-rest">{TITLE_REST}</span>
                        </h1>
                        <p className="cmt-dek">{meta.dek}</p>
                        <div className="cmt-actions" ref={actionsRef}>
                            <a className="cmt-btn cmt-btn--primary" href={meta.cta.href}>
                                {meta.cta.label}
                                <span className="cmt-btn-arrow" aria-hidden="true">→</span>
                            </a>
                            <a className="cmt-btn cmt-btn--glass" href="#step-by-step">
                                See the steps
                            </a>
                        </div>
                        <ul className="cmt-proof" aria-label="At a glance">
                            <li>Free to start</li>
                            <li>Photo, PDF or Word</li>
                            <li>English &amp; Hindi</li>
                            <li>Any phone browser</li>
                        </ul>
                    </div>
                    <PhoneHero />
                </div>
                <div className="cmt-byline">
                    <span className="cmt-author">
                        <img src="/logo-testoza-square.svg" alt="" width={28} height={28} />
                        {meta.author}
                    </span>
                    <span>
                        Updated <time dateTime={meta.dateModified}>{updated}</time>
                    </span>
                    <span>{meta.readMinutes} min read</span>
                    <ShareButtons where="top" />
                </div>
            </header>

            <div className="cmt-layout">
                <nav className="cmt-rail" aria-label="Jump to section">
                    <p className="cmt-eyebrow">In this guide</p>
                    <ol>
                        {TOC.map((item) => (
                            <li key={item.id}>
                                <a href={`#${item.id}`} className={active === item.id ? 'is-active' : undefined}>
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <article className="cmt-col">
                    <section className="cmt-tldr" aria-labelledby="cmt-tldr-title" data-reveal>
                        <h2 id="cmt-tldr-title">The short version</h2>
                        <ul>
                            {body.takeaways.map((t) => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                    </section>

                    <Blocks blocks={body.intro} />

                    <nav className="cmt-toc" aria-labelledby="cmt-toc-title" data-reveal>
                        <p className="cmt-eyebrow" id="cmt-toc-title">
                            In this guide
                        </p>
                        <ol>
                            {TOC.map((item) => (
                                <li key={item.id}>
                                    <a href={`#${item.id}`}>
                                        <span>{item.label}</span>
                                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    {body.sections.map((section) => (
                        <section key={section.id} id={section.id} className="cmt-sec" aria-labelledby={`${section.id}-title`}>
                            <h2 id={`${section.id}-title`}>{section.title}</h2>
                            <Blocks blocks={section.blocks} />
                        </section>
                    ))}

                    <section id="faq" className="cmt-sec cmt-sec--faq" aria-labelledby="faq-title">
                        <h2 id="faq-title">Frequently asked questions</h2>
                        <Faq />
                    </section>

                    <section id="start" className="cmt-closing" aria-labelledby="start-title" ref={closingRef} data-reveal>
                        <div className="cmt-closing-glow" aria-hidden="true" />
                        <h2 id="start-title">{body.closingTitle}</h2>
                        <Blocks blocks={body.closing} />
                    </section>

                    <div className="cmt-end">
                        <span>Know someone with an exam coming up? Send them this guide.</span>
                        <ShareButtons where="bottom" />
                    </div>

                    <footer className="cmt-sources">
                        <p>
                            <strong>Sources</strong>
                        </p>
                        <ol>
                            {body.sources.map((s) => (
                                <li key={s.href}>
                                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                                        {s.label}
                                    </a>
                                </li>
                            ))}
                        </ol>
                        <p>Exam names belong to their conducting bodies. TestoZa is not affiliated with the NTA, SSC or UPSC.</p>
                    </footer>
                </article>
            </div>

            <a
                className={`cmt-float${floatOn && floatPeek ? ' is-on' : ''}`}
                href={meta.cta.href}
                tabIndex={floatOn && floatPeek ? 0 : -1}
                aria-hidden={!(floatOn && floatPeek)}
            >
                {meta.cta.label}
                <span className="cmt-btn-arrow" aria-hidden="true">→</span>
            </a>
        </div>
    );
}
