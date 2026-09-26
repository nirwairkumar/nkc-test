/**
 * blog.testoza.com/stop-painting-white-boxes-on-your-pdfs — the complete guide to
 * Panna (pdf.testoza.com), written as a static article because the blog editor
 * can't hold custom layouts or animation.
 *
 * Text, metadata and structured data live in src/blog/articles; the Cloudflare
 * worker serves the same text to crawlers, so edit the article there, not here.
 */
import { Fragment, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Check, Copy, Linkedin, MessageCircle, Twitter } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { BLOG_NAME, blogHomePath } from '@/lib/blog';
import { staticArticleUrl, staticAssetUrl } from '@/blog/articles/meta';
import { articleJsonLd, formatArticleDate } from '@/blog/articles/render';
import { STOP_PAINTING_WHITE_BOXES as ARTICLE } from '@/blog/articles/stopPaintingWhiteBoxes';
import type { ArticleBlock } from '@/blog/articles/types';
import WhiteBoxDemo from './WhiteBoxDemo';
import './stopPaintingWhiteBoxes.css';

const { meta, body } = ARTICLE;
const CANONICAL = staticArticleUrl(meta.slug);
const EDITOR_URL = 'https://pdf.testoza.com/edit-pdf';
const FONTS =
    'https://fonts.googleapis.com/css2?family=Gloock&family=Noto+Sans+Devanagari:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap';
const JSON_LD = articleJsonLd(ARTICLE);

/**
 * On blog.testoza.com the worker already puts this article's JSON-LD in the HTML
 * (not a Helmet tag, so Helmet won't replace it). Adding it again would give
 * Google two FAQPage blocks.
 */
const graphInHtml = () =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]:not([data-rh])')).some((s) =>
        s.textContent?.includes(`${CANONICAL}#article`),
    );

/** The words in the headline that get their own white box. */
const PATCHED = 'white boxes';
const [TITLE_BEFORE, TITLE_AFTER] = meta.title.split(PATCHED);

const TOC = [
    ...body.sections.map((s) => ({ id: s.id, label: s.tocLabel ?? s.title })),
    { id: 'faq', label: 'Questions' },
    { id: 'try', label: 'Try Panna' },
];

function Blocks({ blocks }: { blocks: ArticleBlock[] }) {
    return (
        <>
            {blocks.map((block, i) =>
                block.type === 'html' ? (
                    <div key={i} className="wbx-html" dangerouslySetInnerHTML={{ __html: block.html }} />
                ) : (
                    <WhiteBoxDemo key={i} />
                ),
            )}
        </>
    );
}

function ShareButtons({ where }: { where: string }) {
    const [copied, setCopied] = useState(false);
    const share = (network: string, url: string) => {
        analytics.track('blog_share', { article: meta.slug, network, where });
        window.open(url, '_blank', 'noopener');
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(CANONICAL);
            setCopied(true);
            toast.success('Link copied');
            setTimeout(() => setCopied(false), 2500);
            analytics.track('blog_share', { article: meta.slug, network: 'copy', where });
        } catch {
            toast.error('Could not copy. The link is ' + CANONICAL);
        }
    };
    const url = encodeURIComponent(CANONICAL);
    const text = encodeURIComponent(meta.title);
    return (
        <div className="wbx-share">
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

export default function StopPaintingWhiteBoxes() {
    const rootRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef<HTMLHeadingElement>(null);
    const [progress, setProgress] = useState(0);
    const [active, setActive] = useState(TOC[0].id);
    const [floatOn, setFloatOn] = useState(false);
    const [ldInHtml] = useState(graphInHtml);

    // Reading progress and the section the reader is in (for the contents rail).
    useEffect(() => {
        let queued = false;
        const update = () => {
            queued = false;
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
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

    // Highlighter strokes draw in as they scroll into view.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const marks = Array.from(root.querySelectorAll<HTMLElement>('.wbx-mark'));
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !('IntersectionObserver' in window)) {
            marks.forEach((m) => m.classList.add('is-on'));
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-on');
                        io.unobserve(e.target);
                    }
                }
            },
            { rootMargin: '0px 0px -18% 0px' },
        );
        marks.forEach((m) => io.observe(m));
        return () => io.disconnect();
    }, []);

    // The floating "Try Panna free" button: shown once the hero's button has
    // scrolled away, hidden again when the closing links are on screen.
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

    // Count clicks through to the tools, so the blog can see what readers try.
    const onClick = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement).closest('a');
        if (!link || !link.href) return;
        try {
            const url = new URL(link.href);
            if (['pdf.testoza.com', 'testoza.com', 'www.testoza.com', 'app.testoza.com'].includes(url.hostname)) {
                analytics.track('blog_cta_click', { article: meta.slug, target: `${url.hostname}${url.pathname}` });
            }
        } catch {
            /* not a URL we track */
        }
    };

    const published = formatArticleDate(meta.datePublished);

    return (
        <div className="wbx" ref={rootRef} onClick={onClick}>
            <SEO
                title={meta.seoTitle}
                siteName={BLOG_NAME}
                description={meta.description}
                image={staticAssetUrl(meta.cover.src)}
                type="article"
                url={CANONICAL}
                canonicalUrl={CANONICAL}
                schemas={ldInHtml ? [] : [JSON_LD]}
            />
            <Helmet>
                <link rel="stylesheet" href={FONTS} />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta property="article:published_time" content={meta.datePublished} />
                <meta property="article:modified_time" content={meta.dateModified} />
                <meta property="og:image:width" content={String(meta.cover.width)} />
                <meta property="og:image:height" content={String(meta.cover.height)} />
                <meta property="og:image:alt" content={meta.cover.alt} />
            </Helmet>

            <div className="wbx-progress" aria-hidden="true">
                <div style={{ transform: `scaleX(${progress})` }} />
            </div>

            <div className="wbx-layout">
                <nav className="wbx-rail" aria-label="Jump to section">
                    <p className="wbx-eyebrow">In this guide</p>
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

                <article className="wbx-col">
                    <header className="wbx-head wide">
                        <div className="wbx-crumbs wbx-eyebrow">
                            <Link to={blogHomePath}>
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {BLOG_NAME}
                            </Link>
                            <span aria-hidden="true">·</span>
                            <span>Product guide</span>
                        </div>
                        <h1 className="wbx-h1">
                            {TITLE_BEFORE}
                            <span className="wbx-patch-wrap" title="The original words are still underneath">
                                <span className="wbx-patch-under">{PATCHED}</span>
                                {/* Letters are drawn with CSS (data-ch), so the heading's text says "white boxes" once. */}
                                <span className="wbx-patch" aria-hidden="true">
                                    <span className="wbx-patch-text">
                                        {Array.from(PATCHED).map((ch, i) => (
                                            <span key={i} data-ch={ch === ' ' ? ' ' : ch} style={{ ['--i' as string]: i }} />
                                        ))}
                                    </span>
                                </span>
                            </span>
                            {TITLE_AFTER}
                        </h1>
                        <p className="wbx-dek">{meta.dek}</p>
                        <div className="wbx-byline">
                            <span className="wbx-author">
                                <img src="/logo-testoza-square.svg" alt="" width={34} height={34} />
                                {meta.author}
                            </span>
                            <time dateTime={meta.datePublished}>{published}</time>
                            <span>{meta.readMinutes} min read</span>
                        </div>
                        <div className="wbx-actions" ref={actionsRef}>
                            <a className="wbx-cta" href={EDITOR_URL} target="_blank" rel="noopener">
                                Try the free PDF editor<span className="wbx-cta-arrow" aria-hidden="true">→</span>
                            </a>
                            <ShareButtons where="top" />
                        </div>
                    </header>

                    <Blocks blocks={body.intro} />

                    <nav className="wbx-toc" aria-labelledby="wbx-toc-title">
                        <p className="wbx-eyebrow" id="wbx-toc-title">
                            In this guide
                        </p>
                        <ol>
                            {TOC.map((item) => (
                                <li key={item.id}>
                                    <a href={`#${item.id}`}>{item.label}</a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    {body.sections.map((section) => (
                        <Fragment key={section.id}>
                            <h2 id={section.id}>{section.title}</h2>
                            <Blocks blocks={section.blocks} />
                        </Fragment>
                    ))}

                    <h2 id="faq">Frequently asked questions</h2>
                    <dl className="wbx-faq">
                        {body.faqs.map((f) => (
                            <div key={f.q}>
                                <dt>{f.q}</dt>
                                <dd>{f.a}</dd>
                            </div>
                        ))}
                    </dl>

                    <h2 id="try" ref={closingRef}>
                        Try Panna
                    </h2>
                    <Blocks blocks={body.closing} />

                    <div className="wbx-end">
                        <span className="wbx-share-label">Know someone who fights with PDFs? Share this guide.</span>
                        <ShareButtons where="bottom" />
                    </div>

                    <footer className="wbx-sources">
                        <p>
                            <strong>Sources for the comparison</strong> (checked September 2026)
                        </p>
                        <ul>
                            {body.sources.map((group) => (
                                <li key={group.label}>
                                    {group.label}:{' '}
                                    {group.links.map((l, i) => (
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
                        <p>Product names belong to their owners. Screenshots show Panna’s own interface.</p>
                    </footer>
                </article>
            </div>

            <a className={`wbx-float${floatOn ? ' is-on' : ''}`} href={EDITOR_URL} target="_blank" rel="noopener" tabIndex={floatOn ? 0 : -1} aria-hidden={!floatOn}>
                Try Panna free<span className="wbx-cta-arrow" aria-hidden="true">→</span>
            </a>
        </div>
    );
}
