/**
 * testoza.com/ai-test-generator — what an AI test generator does, Extract vs
 * Generate, the settings, the review step, and how teachers, institutes and
 * students use TestoZa's.
 *
 * Text, metadata and structured data live in src/guides (aiTestGenerator.ts);
 * the Cloudflare worker serves the same text to crawlers, so edit the guide
 * there, not here.
 *
 * Unlike the earlier guides this page has its own shell rather than GuidePage:
 * an Apple-style article (calmer type scale, one reading column, a frosted local
 * nav with a contents menu and reading progress, iOS grouped lists), and a hero
 * phone that runs copies of the real /generate-with-ai screens.
 */
import { Fragment, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    ArrowLeftRight,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    ChevronDown,
    ChevronRight,
    GraduationCap,
    HelpCircle,
    List,
    ListChecks,
    ListOrdered,
    ShieldCheck,
    Sigma,
    SlidersHorizontal,
    Sparkles,
    Timer,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { AI_TEST_GENERATOR as GUIDE } from '@/guides/aiTestGenerator';
import { guideAssetUrl, guideUrl } from '@/guides/meta';
import { formatGuideDate, guideClosingTitle, guideCta, guideJsonLd } from '@/guides/render';
import type { GuideBlock } from '@/guides/types';
import AtgHero from './AtgHero';
import AtgWidget from './AtgWidgets';
import './aiTestGenerator.css';

const { meta, body } = GUIDE;
const CANONICAL = guideUrl(meta.path);
const CTA = guideCta(GUIDE);
const KEY_PHRASE = 'AI test generator';
const [TITLE_BEFORE, TITLE_AFTER = ''] = meta.title.split(KEY_PHRASE);

/** Each section's icon tile, in the manner of iOS Settings. */
const LOOK: Record<string, { icon: LucideIcon; tone: string }> = {
    'what-it-does': { icon: Sparkles, tone: '#af52de' },
    'extract-or-generate': { icon: ArrowLeftRight, tone: '#007aff' },
    'how-it-works': { icon: ListOrdered, tone: '#34c759' },
    settings: { icon: SlidersHorizontal, tone: '#8e8e93' },
    'what-it-reads': { icon: Sigma, tone: '#5856d6' },
    review: { icon: ShieldCheck, tone: '#30b0c7' },
    teachers: { icon: BookOpen, tone: '#ff9500' },
    institutes: { icon: Building2, tone: '#ff2d55' },
    students: { icon: GraduationCap, tone: '#af52de' },
    'time-saved': { icon: Timer, tone: '#00c7be' },
    choosing: { icon: ListChecks, tone: '#a2845e' },
    limits: { icon: TriangleAlert, tone: '#ff3b30' },
    faq: { icon: HelpCircle, tone: '#636366' },
};

const NAV = [
    ...body.sections.map((s) => ({ id: s.id, label: s.tocLabel, title: s.title })),
    { id: 'faq', label: 'FAQ', title: 'Frequently asked questions' },
];

/**
 * On testoza.com the worker already puts this guide's JSON-LD in the HTML (not a
 * Helmet tag, so Helmet won't replace it). Adding it again would give Google two
 * FAQPage blocks.
 */
const graphInHtml = () =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]:not([data-rh])')).some((s) =>
        s.textContent?.includes(`${CANONICAL}#article`),
    );

function IconTile({ id }: { id: string }) {
    const look = LOOK[id];
    if (!look) return null;
    const Icon = look.icon;
    return (
        <span className="atg-icon" style={{ ['--tone' as string]: look.tone }} aria-hidden="true">
            <Icon />
        </span>
    );
}

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
    return (
        <>
            {blocks.map((block, i) =>
                block.type === 'html' ? (
                    <div key={i} className="atg-col atg-prose" dangerouslySetInnerHTML={{ __html: block.html }} />
                ) : (
                    <div key={i} className="atg-wide">
                        <AtgWidget name={block.widget} />
                    </div>
                ),
            )}
        </>
    );
}

/** Frosted local nav: title, a contents pull-down that names the section being read, reading progress and the CTA. */
function LocalNav({ active, progress }: { active: string; progress: number }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const current = NAV.find((n) => n.id === active);

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

    const r = 8;
    const c = 2 * Math.PI * r;

    return (
        <nav className="atg-localnav" aria-label="This guide">
            <div className="atg-localnav-in" ref={wrapRef}>
                <a href="#top" className="atg-ln-title">
                    AI test generator
                </a>
                <button
                    type="button"
                    className="atg-ln-menu"
                    aria-expanded={open}
                    aria-controls="atg-contents"
                    aria-label={current ? `Contents. Now reading: ${current.title}` : 'Contents'}
                    onClick={() => setOpen((o) => !o)}
                >
                    <List className="atg-ln-menu-list" aria-hidden="true" />
                    <span aria-hidden="true">{current ? current.label : 'Contents'}</span>
                    <ChevronDown className="atg-ln-menu-chev" aria-hidden="true" />
                </button>
                <svg className="atg-ln-ring" viewBox="0 0 20 20" role="img" aria-label={`${Math.round(progress * 100)}% read`}>
                    <circle cx="10" cy="10" r={r} />
                    <circle cx="10" cy="10" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
                </svg>
                <Link to={CTA.href} className="atg-ln-cta">
                    Try it free
                </Link>
                {open && (
                    <div className="atg-menu" id="atg-contents" role="menu">
                        <p>In this guide</p>
                        {NAV.map((n) => (
                            <a key={n.id} href={`#${n.id}`} role="menuitem" onClick={() => setOpen(false)} aria-current={n.id === active ? 'true' : undefined}>
                                {n.id === active ? <Check aria-hidden="true" /> : <span />}
                                <span>{n.label}</span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
}

export default function AiTestGenerator() {
    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [active, setActive] = useState('');
    const [ldInHtml] = useState(graphInHtml);
    const [jsonLd] = useState(() => guideJsonLd(GUIDE));

    // Reading progress and the section being read.
    useEffect(() => {
        const ids = NAV.map((n) => n.id);
        let queued = false;
        const update = () => {
            queued = false;
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
            const line = window.innerHeight * 0.3;
            let current = '';
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
    }, []);

    // Sections fade and rise in as they arrive. Content is always in the DOM;
    // the hidden start state applies only once this runs (the .is-js class).
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const items = Array.from(root.querySelectorAll<HTMLElement>('.atg-reveal'));
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
            { rootMargin: '0px 0px -8% 0px', threshold: 0.02 },
        );
        items.forEach((el) => io.observe(el));
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

    const updated = formatGuideDate(meta.dateModified);

    return (
        <div className="atg" ref={rootRef} onClick={onClick} id="top">
            <SEO
                title={meta.seoTitle}
                description={meta.description}
                image={guideAssetUrl(meta.cover.src)}
                type="article"
                url={CANONICAL}
                canonicalUrl={CANONICAL}
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

            <LocalNav active={active} progress={progress} />

            <header className="atg-hero">
                <div className="atg-hero-grid">
                    <div>
                        <nav className="atg-crumbs" aria-label="Breadcrumb">
                            <Link to="/">TestoZa</Link>
                            <ChevronRight size={12} aria-hidden="true" />
                            <span>Guides</span>
                        </nav>
                        <p className="atg-eyebrow">
                            <b>
                                <Sparkles aria-hidden="true" />
                                Guide
                            </b>
                            Updated {updated} · {meta.readMinutes} min read
                        </p>
                        <h1 className="atg-h1">
                            {TITLE_BEFORE}
                            <span className="atg-h1-key">{KEY_PHRASE}</span>
                            {TITLE_AFTER}
                        </h1>
                        <p className="atg-dek">{meta.dek}</p>
                        <div className="atg-actions">
                            <Link to={CTA.href} className="atg-btn">
                                {CTA.label}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                            <a href="#how-it-works" className="atg-textlink">
                                See how it works
                                <ChevronRight aria-hidden="true" />
                            </a>
                        </div>
                        <div className="atg-byline">
                            <img src="/logo-testoza-square.svg" alt="" width={28} height={28} />
                            <span>
                                By <strong>{meta.author}</strong>
                            </span>
                            <i aria-hidden="true" />
                            <span>Made in India for teachers, institutes and students</span>
                        </div>
                    </div>
                    <AtgHero />
                </div>
            </header>

            <article className="atg-article">
                <div className="atg-lead">
                    <Blocks blocks={body.intro} />
                </div>

                <div className="atg-col">
                    <aside className="atg-answer" aria-label="The short answer">
                        <div className="atg-answer-in">
                            <p className="atg-answer-label">
                                <i aria-hidden="true">
                                    <Sparkles />
                                </i>
                                The short answer
                            </p>
                            <p>{body.answer}</p>
                        </div>
                    </aside>

                    <nav className="atg-toc" aria-labelledby="atg-toc-title">
                        <h2 id="atg-toc-title">In this guide</h2>
                        <ol>
                            {NAV.map((n) => (
                                <li key={n.id}>
                                    <a href={`#${n.id}`}>
                                        <IconTile id={n.id} />
                                        <span>{n.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>
                </div>

                {body.sections.map((section) => (
                    <section key={section.id} id={section.id} className="atg-section atg-reveal" aria-labelledby={`${section.id}-title`}>
                        <div className="atg-col">
                            <p className="atg-sechead" style={{ ['--tone' as string]: LOOK[section.id]?.tone }}>
                                <IconTile id={section.id} />
                                {section.kicker}
                            </p>
                            <h2 className="atg-h2" id={`${section.id}-title`}>
                                {section.title}
                            </h2>
                        </div>
                        <Blocks blocks={section.blocks} />
                    </section>
                ))}

                <section id="faq" className="atg-section atg-reveal" aria-labelledby="faq-title">
                    <div className="atg-col">
                        <p className="atg-sechead" style={{ ['--tone' as string]: LOOK.faq.tone }}>
                            <IconTile id="faq" />
                            Questions
                        </p>
                        <h2 className="atg-h2" id="faq-title">
                            Frequently asked questions
                        </h2>
                        <div className="atg-faq">
                            {body.faqs.map((f, i) => (
                                <details key={f.q} open={i === 0}>
                                    <summary>{f.q}</summary>
                                    <p>{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="start" className="atg-section atg-reveal" aria-labelledby="start-title">
                    <div className="atg-col">
                        <h2 className="atg-h2" id="start-title">
                            {guideClosingTitle(GUIDE)}
                        </h2>
                        <div className="atg-closing-actions">
                            <Link to={CTA.href} className="atg-btn">
                                {CTA.label}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                            <Link to="/create-test" className="atg-textlink">
                                Or build a test by hand
                                <ChevronRight aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                    <div style={{ height: 24 }} />
                    <Blocks blocks={body.closing} />
                </section>

                <footer className="atg-col">
                    <div className="atg-sources">
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
                            Written by the {meta.author}. Last updated {updated}. Spotted something out of date? <Link to="/support">Tell us</Link>.
                        </p>
                    </div>
                </footer>
            </article>
        </div>
    );
}
