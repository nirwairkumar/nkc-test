/**
 * testoza.com/neet-online-test-software: what NEET online test software has to do,
 * how institutes build and run full NEET mocks, the +4/−1 arithmetic, and what
 * aspirants get.
 *
 * This page has its own shell and stylesheet (neetGuide.css): a light hero with an
 * iPhone running the real exam screen, a sticky chapter bar with a contents menu,
 * and iOS grouped lists on a compact type scale. The text, metadata and structured
 * data live in src/guides/neetOnlineTestSoftware.ts, which the Cloudflare worker
 * also serves to crawlers, so edit the guide there.
 */
import { Fragment, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, ChevronRight, List, Sparkles } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { guideAssetUrl, guideUrl } from '@/guides/meta';
import { formatGuideDate, guideClosingTitle, guideCta, guideJsonLd } from '@/guides/render';
import { NEET_ONLINE_TEST_SOFTWARE as GUIDE } from '@/guides/neetOnlineTestSoftware';
import type { GuideBlock } from '@/guides/types';
import NeetHero from './NeetHero';
import NeetWidget from './NeetWidgets';
import './neetGuide.css';

const KEY_PHRASE = 'NEET online test software';

/**
 * On testoza.com the worker already puts the guide's JSON-LD in the HTML (not a
 * Helmet tag). Adding it again would give Google two FAQPage blocks.
 */
const graphInHtml = (canonical: string) =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]:not([data-rh])')).some((s) => s.textContent?.includes(`${canonical}#article`));

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
    return (
        <>
            {blocks.map((block, i) =>
                block.type === 'html' ? (
                    <div key={i} className="ng-prose" dangerouslySetInnerHTML={{ __html: block.html }} />
                ) : (
                    <Fragment key={i}>
                        <NeetWidget name={block.widget} />
                    </Fragment>
                ),
            )}
        </>
    );
}

interface Chapter {
    id: string;
    title: string;
}

/** Sticky bar: reading progress ring, the chapter being read, and a contents menu. */
function ChapterBar({ chapters, active, progress, onJump }: { chapters: Chapter[]; active: number; progress: number; onJump: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const r = 8.5;
    const c = 2 * Math.PI * r;

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const current = chapters[active];
    return (
        <nav className="ng-chapter" aria-label="Sections of this guide">
            <div className="ng-chapter-in" ref={wrapRef}>
                <svg className="ng-ring" viewBox="0 0 22 22" aria-hidden="true">
                    <circle className="bg" cx="11" cy="11" r={r} />
                    <circle className="fg" cx="11" cy="11" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
                </svg>
                <p className="ng-chapter-title" aria-live="polite">
                    <span key={current.id}>
                        <small>
                            {active + 1}/{chapters.length}
                        </small>
                        {current.title}
                    </span>
                </p>
                <button type="button" className="ng-chapter-btn" aria-expanded={open} aria-controls="ng-contents" onClick={() => setOpen((o) => !o)}>
                    <List aria-hidden="true" /> Contents
                </button>
                {open && (
                    <div className="ng-menu" id="ng-contents">
                        <ol>
                            {chapters.map((ch, i) => (
                                <li key={ch.id}>
                                    <a
                                        href={`#${ch.id}`}
                                        aria-current={i === active ? 'true' : undefined}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setOpen(false);
                                            onJump(ch.id);
                                        }}
                                    >
                                        <small>{i + 1}</small>
                                        <span>{ch.title}</span>
                                        {i === active && <Check aria-hidden="true" />}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default function NeetOnlineTestSoftware() {
    const { meta, body } = GUIDE;
    const canonical = guideUrl(meta.path);
    const cta = guideCta(GUIDE);
    const [titleBefore, titleAfter = ''] = meta.title.split(KEY_PHRASE);
    const chapters: Chapter[] = [
        { id: 'intro', title: 'Introduction' },
        ...body.sections.map((s) => ({ id: s.id, title: s.title })),
        { id: 'faq', title: 'Frequently asked questions' },
    ];

    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef<HTMLElement>(null);
    const [progress, setProgress] = useState(0);
    const [active, setActive] = useState(0);
    const [floatOn, setFloatOn] = useState(false);
    const [ldInHtml] = useState(() => graphInHtml(canonical));
    const [jsonLd] = useState(() => guideJsonLd(GUIDE));
    const chapterIds = chapters.map((c) => c.id).join(',');

    // Reading progress and the chapter being read.
    useEffect(() => {
        const ids = chapterIds.split(',');
        let queued = false;
        const update = () => {
            queued = false;
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
            const line = window.innerHeight * 0.3;
            let current = 0;
            ids.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = i;
            });
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
    }, [chapterIds]);

    // Sections fade and rise in once. Content is always in the DOM; the hidden
    // start state applies only after this runs (.is-js).
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const items = Array.from(root.querySelectorAll<HTMLElement>('.ng-reveal'));
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
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
            { rootMargin: '0px 0px -10% 0px', threshold: 0.02 },
        );
        items.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    // Floating button: after the hero's buttons scroll away, until the closing card,
    // and never over the playable exam (it would cover the exam's own buttons).
    useEffect(() => {
        const actions = actionsRef.current;
        const closing = closingRef.current;
        const demo = document.getElementById('try-it');
        if (!actions || !closing || !('IntersectionObserver' in window)) return;
        let actionsVisible = true;
        let closingReached = false;
        let demoVisible = false;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.target === actions) actionsVisible = e.isIntersecting || e.boundingClientRect.top > 0;
                if (e.target === closing) closingReached = e.isIntersecting || e.boundingClientRect.top < 0;
                if (e.target === demo) demoVisible = e.isIntersecting;
            }
            setFloatOn(!actionsVisible && !closingReached && !demoVisible);
        });
        io.observe(actions);
        io.observe(closing);
        if (demo) io.observe(demo);
        return () => io.disconnect();
    }, []);

    const jump = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', `#${id}`);
    };

    // In-page links scroll; links into the app navigate inside it and are counted.
    const onClick = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement).closest('a');
        if (!link || e.defaultPrevented) return;
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) {
            e.preventDefault();
            jump(href.slice(1));
            return;
        }
        if (href.startsWith('/')) {
            analytics.track('guide_cta_click', { guide: meta.slug, target: href.split(/[?#]/)[0] });
            if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !link.target) {
                e.preventDefault();
                navigate(href);
            }
        }
    };

    const published = formatGuideDate(meta.dateModified);
    const sectionNumber = (i: number) => i + 2;

    return (
        <div className="ng" ref={rootRef} onClick={onClick}>
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
                {/* Inter stands in for SF on devices without it; Apple devices never download it. */}
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&display=swap" />
            </Helmet>

            <div className="ng-progress" aria-hidden="true">
                <i style={{ transform: `scaleX(${progress})` }} />
            </div>

            <header className="ng-hero">
                <div className="ng-hero-in">
                    <div>
                        <nav className="ng-crumbs" aria-label="Breadcrumb">
                            <Link to="/">TestoZa</Link>
                            <ChevronRight aria-hidden="true" style={{ width: 12, height: 12 }} />
                            <span>Guides</span>
                        </nav>
                        <p className="ng-eyebrow">
                            <b>Guide</b>
                            <span>
                                Updated {published} · {meta.readMinutes} min read
                            </span>
                        </p>
                        <h1 className="ng-h1">
                            {titleBefore}
                            <span className="ng-h1-key">{KEY_PHRASE}</span>
                            {titleAfter}
                        </h1>
                        <p className="ng-dek">{meta.dek}</p>
                        <div className="ng-actions" ref={actionsRef}>
                            <Link to={cta.href} className="ng-btn">
                                {cta.label}
                            </Link>
                            <a href="#try-it" className="ng-more">
                                <span>Try the exam screen</span>
                                <ChevronRight aria-hidden="true" />
                            </a>
                        </div>
                        <dl className="ng-stats">
                            <div>
                                <dt>Questions</dt>
                                <dd>180</dd>
                            </div>
                            <div>
                                <dt>Marks</dt>
                                <dd>720</dd>
                            </div>
                            <div>
                                <dt>Time</dt>
                                <dd>
                                    3<small>h</small>
                                </dd>
                            </div>
                            <div>
                                <dt>Marking</dt>
                                <dd>+4/−1</dd>
                            </div>
                        </dl>
                        <div className="ng-byline">
                            <img src="/logo-testoza-square.svg" alt="" width={24} height={24} />
                            <span>
                                By <strong>{meta.author}</strong>
                            </span>
                            <span>Made in India for NEET faculty, institutes and aspirants</span>
                        </div>
                    </div>
                    <NeetHero />
                </div>
            </header>

            <ChapterBar chapters={chapters} active={active} progress={progress} onJump={jump} />

            <article className="ng-body">
                <section id="intro" className="ng-section ng-lead" style={{ marginTop: 0 }} aria-label="Introduction">
                    <Blocks blocks={body.intro} />
                </section>

                <aside className="ng-answer ng-reveal" aria-label="The short answer">
                    <p className="ng-answer-label">
                        <Sparkles aria-hidden="true" /> The short answer
                    </p>
                    <p>{body.answer}</p>
                </aside>

                <nav className="ng-reveal" aria-label="In this guide">
                    <p className="ng-group-label">In this guide</p>
                    <ol className="ng-toc">
                        {chapters.slice(1).map((ch, i) => (
                            <li key={ch.id}>
                                <a href={`#${ch.id}`}>
                                    <small>{i + 2}</small>
                                    <span>{ch.title}</span>
                                    <ChevronRight aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                {body.sections.map((section, i) => (
                    <section key={section.id} id={section.id} className="ng-section ng-reveal" aria-labelledby={`${section.id}-title`}>
                        <p className="ng-kicker">
                            <small>{sectionNumber(i)}</small>
                            {section.kicker}
                        </p>
                        <h2 className="ng-h2" id={`${section.id}-title`}>
                            {section.title}
                        </h2>
                        <Blocks blocks={section.blocks} />
                    </section>
                ))}

                <section id="faq" className="ng-section ng-reveal" aria-labelledby="faq-title">
                    <p className="ng-kicker">
                        <small>{chapters.length}</small>
                        Questions
                    </p>
                    <h2 className="ng-h2" id="faq-title">
                        Frequently asked questions
                    </h2>
                    <div className="ng-faq">
                        {body.faqs.map((f, i) => (
                            <details key={f.q} open={i === 0}>
                                <summary>{f.q}</summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="ng-closing ng-reveal" ref={closingRef} aria-labelledby="start-title">
                    <p className="ng-kicker">Your turn</p>
                    <h2 className="ng-h2" id="start-title">
                        {guideClosingTitle(GUIDE)}
                    </h2>
                    <Blocks blocks={body.closing} />
                </section>

                <footer className="ng-sources">
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
                        Written by the {meta.author}. Last updated {published}. Exam facts checked against NTA’s notices and the reports linked above. Spotted something out of date?{' '}
                        <Link to="/support">Tell us</Link>.
                    </p>
                </footer>
            </article>

            <Link to={cta.href} className={`ng-float${floatOn ? ' is-on' : ''}`} aria-hidden={!floatOn} tabIndex={floatOn ? 0 : -1}>
                {cta.label}
                <i aria-hidden="true">
                    <ArrowRight />
                </i>
            </Link>
        </div>
    );
}
