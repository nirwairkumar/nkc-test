/**
 * pdf.testoza.com/how-to-edit-a-pdf — the long-form guide to editing a PDF, with a
 * playable copy of the Panna editor, a PDF X-ray, a PDF check-up, a Hindi shaping
 * demo and a comparison of every common method.
 *
 * Own shell and stylesheet (guide.css, prefix ep-): iOS grouped lists on a compact
 * type scale, a frosted chapter bar under the site header, and demos that fit the
 * window (--ep-fit-h) with a full-window mode. The page is pre-rendered, so every
 * word below is in the HTML that search engines and AI assistants read. Title,
 * description and structured data come from site/routes.ts and ./data.ts.
 */
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, List, Sparkles } from 'lucide-react';
import { analytics } from '@/lib/analytics/tracker';
import { PANNA } from '../brand';
import PannaHeader from '../ui/PannaHeader';
import { PannaMark } from '../ui/PannaLogo';
import { GUIDE_ANSWER, GUIDE_FAQS, GUIDE_META, GUIDE_SOURCES, GUIDE_STEPS } from './data';
import EditorDemo from './EditorDemo';
import HeroPhone from './HeroPhone';
import HindiShaping from './HindiShaping';
import MethodsTable from './MethodsTable';
import Triage from './Triage';
import XRay from './XRay';
import './guide.css';

const BLOG_GUIDE = 'https://blog.testoza.com/stop-painting-white-boxes-on-your-pdfs';

interface Chapter {
    id: string;
    kicker: string;
    title: string;
}

const CHAPTERS: Chapter[] = [
    { id: 'steps', kicker: 'Quick start', title: 'How to edit a PDF online, step by step' },
    { id: 'why-the-font-changes', kicker: 'Why it’s hard', title: 'Why the font changes when you edit a PDF' },
    { id: 'check-your-pdf', kicker: 'Before you start', title: 'Find out what kind of PDF you have' },
    { id: 'change-text', kicker: 'Text', title: 'How to change text without changing the font' },
    { id: 'remove-text', kicker: 'Deleting', title: 'How to remove text from a PDF properly' },
    { id: 'scanned-pdf', kicker: 'Scans', title: 'How to edit a scanned PDF' },
    { id: 'hindi-pdf', kicker: 'Hindi', title: 'How to edit a Hindi PDF' },
    { id: 'sign-and-fill', kicker: 'Forms', title: 'How to sign, fill in and mark up a PDF' },
    { id: 'on-a-phone', kicker: 'Mobile', title: 'How to edit a PDF on your phone' },
    { id: 'compared', kicker: 'Alternatives', title: 'Other ways to edit a PDF, compared' },
    { id: 'is-it-safe', kicker: 'Privacy', title: 'Is it safe to edit a PDF online?' },
    { id: 'problems', kicker: 'Fixes', title: 'Common problems and how to fix them' },
];

const ALL: Chapter[] = [{ id: 'intro', kicker: '', title: 'Introduction' }, ...CHAPTERS, { id: 'faq', kicker: 'Questions', title: 'Frequently asked questions' }];

function Section({ chapter, children }: { chapter: Chapter; children: ReactNode }) {
    const n = ALL.findIndex((c) => c.id === chapter.id) + 1;
    return (
        <section id={chapter.id} className="ep-section ep-reveal" aria-labelledby={`${chapter.id}-title`}>
            <p className="ep-kicker">
                <small>{n}</small>
                {chapter.kicker}
            </p>
            <h2 className="ep-h2" id={`${chapter.id}-title`}>
                {chapter.title}
            </h2>
            {children}
        </section>
    );
}

const ch = (id: string) => CHAPTERS.find((c) => c.id === id)!;

/** Sticky bar: reading progress ring, the chapter being read, and a contents menu. */
function ChapterBar({ active, progress, onJump }: { active: number; progress: number; onJump: (id: string) => void }) {
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

    const current = ALL[active];
    return (
        <nav className="ep-chapter" aria-label="Sections of this guide">
            <div className="ep-chapter-in" ref={wrapRef}>
                <svg className="ep-ring" viewBox="0 0 22 22" aria-hidden="true">
                    <circle className="bg" cx="11" cy="11" r={r} />
                    <circle className="fg" cx="11" cy="11" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
                </svg>
                <p className="ep-chapter-title" aria-live="polite">
                    <span key={current.id}>
                        <small>
                            {active + 1}/{ALL.length}
                        </small>
                        {current.title}
                    </span>
                </p>
                <button type="button" className="ep-chapter-btn" aria-expanded={open} aria-controls="ep-contents" onClick={() => setOpen((o) => !o)}>
                    <List aria-hidden="true" /> Contents
                </button>
                {open && (
                    <div className="ep-menu" id="ep-contents">
                        <ol>
                            {ALL.map((chapter, i) => (
                                <li key={chapter.id}>
                                    <a
                                        href={`#${chapter.id}`}
                                        aria-current={i === active ? 'true' : undefined}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setOpen(false);
                                            onJump(chapter.id);
                                        }}
                                    >
                                        <small>{i + 1}</small>
                                        <span>{chapter.title}</span>
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

const K = ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>;

export default function HowToEditPdf() {
    const rootRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef<HTMLElement>(null);
    const [progress, setProgress] = useState(0);
    const [active, setActive] = useState(0);
    const [floatOn, setFloatOn] = useState(false);
    const [before, after = ''] = GUIDE_META.h1.split(GUIDE_META.keyPhrase);

    // Reading progress and the chapter being read.
    useEffect(() => {
        let queued = false;
        const update = () => {
            queued = false;
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
            const line = window.innerHeight * 0.3;
            let current = 0;
            ALL.forEach((c, i) => {
                const el = document.getElementById(c.id);
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
    }, []);

    // Sections fade in once. Content is always in the HTML; the hidden start state
    // applies only after this runs (.is-js), so crawlers and no-JS readers see it all.
    useEffect(() => {
        const root = rootRef.current;
        if (!root || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
        const items = Array.from(root.querySelectorAll<HTMLElement>('.ep-reveal'));
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
            { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
        );
        items.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    // Floating button: after the hero's buttons scroll away, before the closing card,
    // and never over a demo (it would cover the demo's own controls).
    useEffect(() => {
        const actions = actionsRef.current;
        const closing = closingRef.current;
        const demos = Array.from(document.querySelectorAll<HTMLElement>('.ep-widget'));
        if (!actions || !closing || !('IntersectionObserver' in window)) return;
        let actionsVisible = true;
        let closingReached = false;
        const demosVisible = new Set<Element>();
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.target === actions) actionsVisible = e.isIntersecting || e.boundingClientRect.top > 0;
                else if (e.target === closing) closingReached = e.isIntersecting || e.boundingClientRect.top < 0;
                else if (e.isIntersecting) demosVisible.add(e.target);
                else demosVisible.delete(e.target);
            }
            setFloatOn(!actionsVisible && !closingReached && demosVisible.size === 0);
        });
        io.observe(actions);
        io.observe(closing);
        demos.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    const jump = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', `#${id}`);
    };

    // In-page links scroll smoothly; links to the tools are counted.
    const onClick = (e: MouseEvent<HTMLDivElement>) => {
        const link = (e.target as HTMLElement).closest('a');
        if (!link || e.defaultPrevented) return;
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) {
            e.preventDefault();
            jump(href.slice(1));
        } else if (href.startsWith('/') || href.includes('testoza.com')) {
            analytics.track('guide_cta_click', { guide: 'how-to-edit-a-pdf', target: href.split(/[?#]/)[0] });
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f5f7]">
            <PannaHeader />
            <div className="ep" ref={rootRef} onClick={onClick}>
                <div className="ep-progress" aria-hidden="true">
                    <i style={{ transform: `scaleX(${progress})` }} />
                </div>

                <header className="ep-hero">
                    <div className="ep-hero-in">
                        <div>
                            <nav className="ep-crumbs" aria-label="Breadcrumb">
                                <Link to={PANNA.routes.home}>PDF tools</Link>
                                <ChevronRight aria-hidden="true" />
                                <span>How to edit a PDF</span>
                            </nav>
                            <p className="ep-eyebrow">
                                <b>Guide</b>
                                <span>
                                    Updated <time dateTime={GUIDE_META.dateModified}>{GUIDE_META.dateLabel}</time> · {GUIDE_META.readMinutes} min read
                                </span>
                            </p>
                            <h1 className="ep-h1">
                                {before}
                                <span className="ep-h1-key">{GUIDE_META.keyPhrase}</span>
                                {after}
                            </h1>
                            <p className="ep-dek">{GUIDE_META.dek}</p>
                            <div className="ep-actions" ref={actionsRef}>
                                <Link to={PANNA.routes.editor} className="ep-btn">
                                    Open the free PDF editor
                                </Link>
                                <a href="#try-it" className="ep-more">
                                    <span>Practise on this page</span>
                                    <ChevronRight aria-hidden="true" />
                                </a>
                            </div>
                            <dl className="ep-stats">
                                <div>
                                    <dt>Price</dt>
                                    <dd>₹0</dd>
                                </div>
                                <div>
                                    <dt>Sign-up</dt>
                                    <dd>None</dd>
                                </div>
                                <div>
                                    <dt>Files uploaded</dt>
                                    <dd>0</dd>
                                </div>
                                <div>
                                    <dt>Watermark</dt>
                                    <dd>None</dd>
                                </div>
                            </dl>
                            <div className="ep-byline">
                                <PannaMark className="h-6 w-6" />
                                <span>
                                    By the <strong>{GUIDE_META.author}</strong>
                                </span>
                                <span>For students, teachers, offices and anyone with a PDF to fix</span>
                            </div>
                        </div>
                        <HeroPhone />
                    </div>
                </header>

                <ChapterBar active={active} progress={progress} onJump={jump} />

                <article className="ep-body">
                    <section id="intro" className="ep-section ep-lead" aria-label="Introduction">
                        <div className="ep-prose">
                            <p>
                                A PDF is built to look the same on every screen and every printer. That’s why everyone sends one, and why changing one is harder than it should be. You spot a wrong date on a certificate, a misspelt
                                name on an offer letter or an old fee on a school circular, and the Word file it came from is long gone.
                            </p>
                            <p>
                                So you search for a free PDF editor, and one of three things happens. The fix comes out in a different font. The download asks for an account or a card. Or the editor paints a white box over the
                                old words and types the new ones on top, which leaves the old words in the file for anyone who copies the text.
                            </p>
                            <p>
                                This guide shows how to avoid all three. It explains how text works inside a PDF and how to tell what kind of PDF you have. Then it covers changing text, deleting it properly, fixing scans and Hindi
                                documents, signing forms and working from a phone. It also compares the tools you may already have, including Word, Google Docs, Acrobat and Preview.
                            </p>
                            <p>
                                The examples use <strong>Panna</strong>, the free PDF editor we make at TestoZa, because it changes the text inside the file in the document’s own font. There’s a working copy of it a little further
                                down. Practise on its sample certificate before you touch your own document.
                            </p>
                        </div>
                    </section>

                    <aside className="ep-answer ep-reveal" aria-label="The short answer">
                        <p className="ep-answer-label">
                            <Sparkles aria-hidden="true" /> The short answer
                        </p>
                        <p>{GUIDE_ANSWER}</p>
                    </aside>

                    <nav className="ep-reveal" aria-label="In this guide">
                        <p className="ep-group-label">In this guide</p>
                        <ol className="ep-toc">
                            {ALL.slice(1).map((c, i) => (
                                <li key={c.id}>
                                    <a href={`#${c.id}`}>
                                        <small>{i + 2}</small>
                                        <span>{c.title}</span>
                                        <ChevronRight aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <Section chapter={ch('steps')}>
                        <div className="ep-prose">
                            <p>If your PDF came from Word, Google Docs, a website, a bank or a billing program, it contains real text, and a typical fix takes under a minute.</p>
                            <ol className="ep-steps">
                                {GUIDE_STEPS.map((s) => (
                                    <li key={s.title}>
                                        <strong>{s.title}</strong>
                                        {s.title === 'Open the PDF' ? (
                                            <>
                                                Go to <Link to={PANNA.routes.editor}>pdf.testoza.com/edit-pdf</Link> and drop the file on the page, or tap Choose PDF. It opens inside your browser; nothing is uploaded.
                                            </>
                                        ) : (
                                            s.text
                                        )}
                                    </li>
                                ))}
                            </ol>
                            <p>
                                Now try it on the certificate below. Fix the date first: click it, change 14 to 15 and press <strong>Done</strong> (or <K>Ctrl</K> <K>Enter</K>, because it’s a paragraph). The new digits
                                sit in the certificate’s own Georgia. Then try the other tools and press{' '}
                                <strong>Download PDF</strong> to see what a PDF reader would find in the result.
                            </p>
                        </div>
                        <EditorDemo />
                        <div className="ep-prose">
                            <h3>Shortcuts worth learning</h3>
                            <ul className="ep-list ep-keys">
                                <li>
                                    <span>
                                        <K>V</K> <K>T</K> <K>E</K> <K>W</K> <K>H</K> <K>D</K>
                                    </span>
                                    Edit text, Add text, Erase, White-out, Highlight, Draw
                                </li>
                                <li>
                                    <span>
                                        <K>Enter</K> · <K>Ctrl</K> <K>Enter</K>
                                    </span>
                                    Finish a line · finish a paragraph
                                </li>
                                <li>
                                    <span>
                                        <K>Tab</K> · <K>Esc</K>
                                    </span>
                                    Jump to the next piece of text · cancel
                                </li>
                                <li>
                                    <span>
                                        <K>Ctrl</K> <K>F</K>
                                    </span>
                                    Find and replace on every page
                                </li>
                                <li>
                                    <span>
                                        <K>Ctrl</K> <K>Z</K> · <K>Ctrl</K> <K>Y</K>
                                    </span>
                                    Undo · redo, up to 100 steps
                                </li>
                                <li>
                                    <span>
                                        <K>Ctrl</K> <K>S</K>
                                    </span>
                                    Download the PDF
                                </li>
                            </ul>
                            <p className="ep-small">On a Mac, use ⌘ wherever it says Ctrl.</p>
                        </div>
                    </Section>

                    <Section chapter={ch('why-the-font-changes')}>
                        <div className="ep-prose">
                            <p>
                                A Word document stores paragraphs. A PDF stores drawing instructions: put these characters, in this font, at this size, at exactly this point on the page. Nothing in the file says that two lines
                                belong to the same paragraph, or that a column of numbers is a table. A viewer simply follows the instructions, which is why a PDF looks identical everywhere.
                            </p>
                            <p>
                                Fonts are the bigger problem. To keep files small, most programs embed only the letters a document actually uses, which is called a <strong>subset</strong>. A certificate set in Georgia might carry
                                thirty or forty Georgia characters and nothing else. Inside the file, a subset’s name starts with six capital letters and a plus sign, such as <code>BCDEFG+Georgia</code>.
                            </p>
                            <p>
                                An editor that can’t write with a subset has two ways out. It can retype your change in a standard font such as Arial or Helvetica, which is why so many corrected PDFs have one line in the wrong
                                typeface. Or it can use a font installed on your computer. Adobe’s help explains that when a font isn’t available on the system, Acrobat substitutes a fallback font: Minion Pro for Latin text.
                            </p>
                            <p>The X-ray below shows a third shortcut, the one that matters most. A white-box editor doesn’t change the original instruction at all. It paints a box over the old words and draws new ones on top.</p>
                        </div>
                        <XRay />
                        <div className="ep-prose">
                            <p>
                                Panna takes the harder route. It reads every character on the page with its position, font, size and colour, and groups the characters back into lines and paragraphs. Then it rewrites only the
                                characters you changed, using the same embedded font. If you type a letter the subset doesn’t contain, it says so, with a note such as <em>“Not in this PDF’s font: R → Times”</em>, and draws only
                                that letter in the closest standard font. Everything you didn’t touch stays exactly as it was.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('check-your-pdf')}>
                        <div className="ep-prose">
                            <p>Every method in this guide depends on one question: is there real text in your PDF, or a picture of text? Thirty seconds of checking can save an hour spent with the wrong tool.</p>
                            <p>Open the file in any viewer and try to select a single word. Then copy it and paste it into a note, or a WhatsApp chat with yourself. What you see tells you what you have.</p>
                        </div>
                        <Triage />
                        <div className="ep-prose">
                            <p>
                                PDFs made by software, such as Word, Google Docs, Tally, a school’s management system or a bank statement download, almost always contain real text. Phone scans and photocopier scans don’t, unless
                                someone ran text recognition on them. Older Hindi documents, especially ones typed for offices and printing presses, are often in Kruti Dev or DevLys. They look like Hindi but are stored as English
                                letters.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('change-text')}>
                        <div className="ep-prose">
                            <p>
                                With a digital PDF, open the file and keep <strong>Edit text</strong> selected (press <K>V</K>). Move the pointer over the page and each piece of text lights up green. Click one and a text box opens
                                exactly on top of it, at the same size and position, with a format bar above it. The font menu’s first entry reads <em>Original</em>, followed by the font’s name.
                            </p>
                            <h3>Lines, paragraphs and tables</h3>
                            <p>
                                A single line finishes when you press <K>Enter</K>. In a paragraph, Enter starts a new line and <K>Ctrl</K> <K>Enter</K> finishes. The text re-wraps inside the paragraph’s original width, starting
                                from the line you changed; lines above it are left alone, and justified text stays justified.
                            </p>
                            <p>
                                Tables are where most editors go wrong, because they treat a whole column as one text box. Panna splits text wherever there’s a wide gap. On a marksheet, “Name of Student”, the colon and the name
                                are three separate pieces, so fixing one cell doesn’t nudge its neighbours.
                            </p>
                            <h3>Letters the font doesn’t have</h3>
                            <p>
                                Subsets cut both ways. On the practice certificate, change “Ananya Sharma” to “Rahul Verma” and Panna warns you that R and V aren’t in the italic font, because the original never used them. Those
                                two letters then come from Times Italic. In most documents the difference is hard to see, and you know exactly what changed, which beats an editor that switches fonts without telling you.
                            </p>
                            <p>If a borrowed letter stands out, pick a single standard font for the whole line from the format bar, such as Times New Roman or Noto Serif, so at least the line is consistent.</p>
                            <h3>The same change on every page</h3>
                            <p>
                                Press <K>Ctrl</K> <K>F</K>, or the magnifier, to find and replace across the whole document. Replacements are ordinary edits, so a bold name stays bold and the font stays the same. It’s the
                                quickest way to fix a date on sixty certificates saved in one PDF, or a roll number on every page of a report. If some matches sit in text that can’t be edited, Panna tells you how many it skipped.
                            </p>
                            <h3>Moving text</h3>
                            <p>
                                Drag a line to move it. Guides snap it to the edges, centres and baselines of nearby text and to the middle of the page, and a read-out shows how far it has moved in millimetres. The arrow keys
                                nudge it by one point (ten with <K>Shift</K>), and the selection bar has a button that puts it back where it started.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('remove-text')}>
                        <div className="ep-prose">
                            <p>There are three ways to make words disappear from a PDF. Only one of them takes the words out of the file.</p>
                            <ul className="ep-list">
                                <li data-tone="green">
                                    <strong>Erase</strong>
                                    Panna’s Erase tool (<K>E</K>) deletes the characters from the page’s drawing instructions. Lines, colours and pictures behind them stay where they were. When you download, a clean-up pass removes
                                    everything the file no longer uses, so the words can’t be copied, searched or recovered.
                                </li>
                                <li data-tone="orange">
                                    <strong>White-out</strong>
                                    White-out (<K>W</K>) covers an area with the page’s own colour, sampled from the paper, so it disappears into cream or grey pages. On a page with real text, Panna deletes the text underneath as
                                    well. A scanned page is only a picture, so there white-out paints over it while the original image stays in the file.
                                </li>
                                <li data-tone="red">
                                    <strong>A white or black box</strong>
                                    Drawing a box in most other tools only hides the words. They’re still in the file, and anyone can copy them out.
                                </li>
                            </ul>
                            <p>
                                That last mistake has embarrassed lawyers in public. On 8 January 2019, a court filing by Paul Manafort’s lawyers went online with black boxes over its sensitive passages. Reporters selected the
                                text, copied it and published what was underneath.
                            </p>
                            <h3>Check a file before you send it</h3>
                            <ol className="ep-steps">
                                <li>
                                    <strong>Select everything</strong>
                                    Open the downloaded PDF and press <K>Ctrl</K> <K>A</K> (<K>⌘</K> <K>A</K> on a Mac).
                                </li>
                                <li>
                                    <strong>Copy and paste</strong>
                                    Paste it into a plain note.
                                </li>
                                <li>
                                    <strong>Search the note</strong>
                                    Look for the words you removed. If they’re in the note, they’re in the file.
                                </li>
                            </ol>
                            <p className="ep-note">
                                For legal, medical or financial documents where removal has to be certain, keep the original safe and check every page with the copy test. On scans, remember that white-out covers the picture
                                but doesn’t delete it; re-scan a clean copy instead.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('scanned-pdf')}>
                        <div className="ep-prose">
                            <p>
                                A scanned PDF is a photograph of a page wrapped in a PDF file. You can’t select the words because, as far as the computer knows, there are no words, only pixels. Panna notices this and shows a note
                                at the top of the page: <em>“Scanned page — use White-out and Add text to change it.”</em>
                            </p>
                            <h3>Change a few words</h3>
                            <ol className="ep-steps">
                                <li>
                                    <strong>Cover the old words</strong>
                                    Choose White-out (<K>W</K>) and drag over them. It matches the colour of the paper.
                                </li>
                                <li>
                                    <strong>Type the new words</strong>
                                    Choose Add text (<K>T</K>) and click where they should go.
                                </li>
                                <li>
                                    <strong>Match the look</strong>
                                    Times New Roman suits most printed letters, Helvetica (Arial) suits forms and typed notices, and Courier suits typewriter text. Adjust the size until the new words line up with the old ones.
                                </li>
                                <li>
                                    <strong>Download</strong>
                                    Then zoom in on the result. Small mismatches show up best at 200%.
                                </li>
                            </ol>
                            <h3>Make the whole scan editable</h3>
                            <p>
                                That needs OCR (optical character recognition), which turns the picture into text. Panna doesn’t have OCR yet. Google Docs can do it for free when the file is 2 MB or smaller: upload the PDF to
                                Google Drive, right-click it and choose <em>Open with › Google Docs</em>. Google’s own help says tables, columns, lists and footnotes are unlikely to survive, so expect to rebuild the layout. Paid
                                tools such as Adobe Acrobat can recognise the text and keep the page looking as it did.
                            </p>
                            <p>If you’re scanning again, scan at 300 dpi in black and white or greyscale. OCR is far more accurate on a straight, clean scan than on a phone photo taken at an angle.</p>
                        </div>
                    </Section>

                    <Section chapter={ch('hindi-pdf')}>
                        <div className="ep-prose">
                            <p>
                                Hindi adds a second layer of difficulty: Devanagari isn’t drawn in the order the file stores it. The <span lang="hi">ि</span> matra is stored after its consonant but drawn before it. A halant joins
                                two consonants into one shape, as in <span lang="hi">क्ष</span> and <span lang="hi">त्र</span>. A <span lang="hi">र</span> before another consonant turns into a small hook on top, as in{' '}
                                <span lang="hi">धर्म</span>. Turning stored characters into the right shapes is called <strong>text shaping</strong>. Editors that skip it produce the broken Hindi on the right below.
                            </p>
                        </div>
                        <HindiShaping />
                        <div className="ep-prose">
                            <p>Whether you can edit a Hindi PDF in place depends on how it was typed.</p>
                            <ul className="ep-list">
                                <li data-tone="green">
                                    <strong>Unicode Hindi: edit in place</strong>
                                    Mangal, Nirmala UI, Noto and Kokila, and anything made in Word, Google Docs or Chrome. Panna writes new Hindi in Noto Sans Devanagari with correct matras and conjuncts, and keeps the real
                                    characters, so the text stays searchable and copyable.
                                </li>
                                <li data-tone="orange">
                                    <strong>Kruti Dev, DevLys, Chanakya: erase and retype</strong>
                                    These fonts draw Hindi shapes on top of English letters, so <span lang="hi">हिन्दी</span> is stored as “fgUnh” and editing it in place gives gibberish. Erase the line and type it again with
                                    Add text. The new line is proper Unicode Hindi.
                                </li>
                                <li data-tone="red">
                                    <strong>Scans: white-out and type</strong>
                                    The same method as any scanned page.
                                </li>
                            </ul>
                            <p>
                                To type Hindi on a phone, add Hindi to Gboard or the iPhone keyboard and type phonetically: “namaste” becomes <span lang="hi">नमस्ते</span>. On Windows, go to Settings › Time &amp; language ›
                                Language &amp; region, add Hindi and switch keyboards with <K>Win</K> <K>Space</K>. Or write the line in Google Docs or WhatsApp and paste it in. The{' '}
                                <Link to={PANNA.routes.hindi}>Hindi PDF editor</Link> has the same tools with instructions in Hindi.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('sign-and-fill')}>
                        <div className="ep-prose">
                            <p>Plenty of edits don’t change any existing text. Most forms just need something added: a name in a box, a tick, a signature, a photograph.</p>
                            <h3>Fill in a form</h3>
                            <p>
                                Choose <strong>Add text</strong> (<K>T</K>), click inside a box and type. Set the font, size and colour in the toolbar before you click; Helvetica at 11 or 12 pt matches most printed forms. Panna
                                doesn’t have a separate mode for interactive form fields yet, but Add text works on any form, printed or digital.
                            </p>
                            <h3>Sign</h3>
                            <p>
                                Tap <strong>Sign</strong> and choose how: draw with a finger, stylus or mouse; type your name in one of four handwriting styles; or upload a photo of your signature on white paper, and Panna removes
                                the paper. Drag the signature into place and resize it. Your last four signatures stay on your device for one-tap reuse, and you can delete any of them.
                            </p>
                            <p className="ep-note">
                                A signature image isn’t a digital signature. When a bank, court or government portal asks for a Digital Signature Certificate (DSC) or Aadhaar eSign, that’s a separate, cryptographic process done
                                with those services.
                            </p>
                            <h3>Highlight, draw and add shapes</h3>
                            <p>
                                Highlight (<K>H</K>) snaps to the lines of text and blends like a real marker, so the words stay sharp. Draw (<K>D</K>) is freehand ink in four colours or any custom colour. Rectangle, ellipse, line
                                and arrow are for marking up a page; tick <em>Filled</em> for a solid shape.
                            </p>
                            <h3>Add a logo, photo or stamp</h3>
                            <p>
                                <strong>Image</strong> inserts a PNG, JPEG, WebP or GIF in the middle of the page you’re looking at. You can move it, resize it, rotate it in 90° steps and change its opacity. Large photos are
                                scaled to 2,400 pixels on the longest side, so the PDF stays light enough to email.
                            </p>
                            <h3>Reorder, rotate and delete pages</h3>
                            <p>
                                The page thumbnails on the left let you drag pages into a new order, rotate them, duplicate one, insert a blank page the size of its neighbour, or delete one. Every page action can be undone.
                                Merging, splitting and compressing PDFs are the next tools planned for Panna.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('on-a-phone')}>
                        <div className="ep-prose">
                            <p>You don’t need an app. The same editor runs in Chrome on Android and Safari on iPhone, and the phone in the animation at the top of this page shows the whole flow.</p>
                            <ol className="ep-steps">
                                <li>
                                    <strong>Open the editor</strong>
                                    Go to pdf.testoza.com/edit-pdf and tap Choose PDF. Pick the file from Downloads, Google Drive or the Files app.
                                </li>
                                <li>
                                    <strong>Zoom and tap</strong>
                                    Pinch to zoom until the line is easy to hit, then tap it.
                                </li>
                                <li>
                                    <strong>Type</strong>
                                    Use your usual keyboard, Gboard’s Hindi included, and tap Done.
                                </li>
                                <li>
                                    <strong>Download</strong>
                                    Tap the green button at the top right. On Android the file goes to Downloads; on iPhone, Safari saves it to Files › Downloads.
                                </li>
                            </ol>
                            <p>
                                The toolbar scrolls sideways: after Draw come the shapes, Image and Sign. For a landscape document such as a certificate, turn the phone sideways. For a very long or heavy PDF, use a laptop, because
                                your own device does the processing.
                            </p>
                            <p>
                                The built-in options add things on top of a page without changing its text. On iPhone, Markup (in Files, Mail and Photos) adds text boxes, drawings and signatures. On Android, Google Drive’s PDF
                                viewer lets you draw on a page and fill in form fields.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('compared')}>
                        <div className="ep-prose">
                            <p>You may already have software that opens PDFs. Here is what each common option actually does to your document.</p>
                        </div>
                        <MethodsTable />
                        <div className="ep-prose">
                            <h3>Which one to use</h3>
                            <ul className="ep-list">
                                <li>
                                    <strong>To fix text and keep the look</strong>
                                    Panna, or Acrobat if you already pay for it.
                                </li>
                                <li>
                                    <strong>To rewrite a long report</strong>
                                    Open it in Word, edit it there and save a new PDF. Word warns that the converted file “might not look exactly like the original PDF”, so set aside time to tidy the layout.
                                </li>
                                <li>
                                    <strong>To make a scan editable</strong>
                                    OCR in Google Docs for small files, or Acrobat for anything that has to keep its layout.
                                </li>
                                <li>
                                    <strong>To add a signature or a note</strong>
                                    Whatever is built in: Preview on a Mac, Markup on an iPhone, Edge on Windows, or Panna’s Sign anywhere.
                                </li>
                                <li>
                                    <strong>For anything private</strong>
                                    A tool that keeps the file on your device.
                                </li>
                            </ul>
                            <p>
                                For a brand-by-brand comparison with Smallpdf, iLovePDF, Sejda, PDF24 and Acrobat online, including their free limits and how long they keep uploaded files, see{' '}
                                <a href={`${BLOG_GUIDE}#compare`}>our longer comparison on the TestoZa blog</a>.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('is-it-safe')}>
                        <div className="ep-prose">
                            <p>
                                Think about what people edit: marksheets, Aadhaar and PAN copies, offer letters, bank forms, medical reports. Most online editors start by uploading that file to their servers. The careful ones
                                delete it after an hour or two, but you’re still trusting a company you know little about with your documents.
                            </p>
                            <p>
                                Panna never receives your file. The page loads the editing code, and your browser does the rest: opening, editing and saving. If the PDF has a password, it’s used in your browser and never stored.
                                Unfinished work is saved only in your browser (files over 60 MB aren’t autosaved), and <em>Discard</em> deletes it.
                            </p>
                            <p>
                                You can check this on a computer. Open the editor, press <K>F12</K> for the developer tools, choose the <em>Network</em> tab, then open your PDF. You’ll see the editor’s code and fonts load, and no
                                request that sends your document anywhere. Like nearly every website, we count visits and downloads, recording the tool’s name and the number of pages, never the contents.
                            </p>
                            <h3>Edit only what’s yours to edit</h3>
                            <p>
                                A clean edit is a responsibility. Fixing your own resume, correcting your own invoice or filling in a form is everyday work. Changing a certificate, marksheet, ID or bank document issued by someone
                                else to misrepresent facts is forgery, a criminal offence under the Bharatiya Nyaya Sanhita in India and under the law of almost every other country.
                            </p>
                            <p>
                                Edits also aren’t invisible. Like most PDF software, Panna writes its name in the file’s <em>Producer</em> field and updates the modification date, which anyone can see in the document’s
                                properties.
                            </p>
                        </div>
                    </Section>

                    <Section chapter={ch('problems')}>
                        <div className="ep-prose">
                            <ul className="ep-list ep-faults">
                                <li>
                                    <strong>One letter looks slightly different</strong>
                                    You typed a letter that isn’t in the PDF’s font subset. The amber note under the format bar names it. Use a different word, or set the whole line in one standard font.
                                </li>
                                <li>
                                    <strong>I can’t click the text</strong>
                                    It’s probably a scan, or the words are part of a picture, such as a logo or a stamp. Use White-out and Add text.
                                </li>
                                <li>
                                    <strong>Copied text comes out as gibberish</strong>
                                    The PDF has no character map, or it uses an old Hindi font such as Kruti Dev. Erase the line and type it again.
                                </li>
                                <li>
                                    <strong>“Text now runs past the original paragraph”</strong>
                                    Your new text is longer than the space it had. Drag the side handles to widen the box, shorten the text, or make it half a point smaller.
                                </li>
                                <li>
                                    <strong>“This PDF was locked against editing by its creator”</strong>
                                    The author set a permissions password. Panna still opens the file and shows this note. Only change it if you have the right to.
                                </li>
                                <li>
                                    <strong>The thumbnails still show the old text</strong>
                                    Page thumbnails show the original pages. The pages themselves, and your download, have the changes.
                                </li>
                                <li>
                                    <strong>A big PDF is slow on my phone</strong>
                                    Your device does the work, so a 200-page, 50 MB file is easier on a laptop.
                                </li>
                                <li>
                                    <strong>I closed the tab by mistake</strong>
                                    Open the editor again and choose <em>Continue editing</em>. Your changes were saved in this browser.
                                </li>
                            </ul>
                        </div>
                    </Section>

                    <section id="faq" className="ep-section ep-reveal" aria-labelledby="faq-title">
                        <p className="ep-kicker">
                            <small>{ALL.length}</small>
                            Questions
                        </p>
                        <h2 className="ep-h2" id="faq-title">
                            Frequently asked questions
                        </h2>
                        <div className="ep-faq">
                            {GUIDE_FAQS.map((f, i) => (
                                <details key={f.q} open={i === 0}>
                                    <summary>{f.q}</summary>
                                    <p>{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    <section className="ep-closing ep-reveal" ref={closingRef} aria-labelledby="start-title">
                        <p className="ep-kicker">Your turn</p>
                        <h2 className="ep-h2" id="start-title">
                            Fix your PDF now
                        </h2>
                        <div className="ep-prose">
                            <p>
                                Open the editor, click the line, type, download. No account, no watermark, and the file never leaves your device. If something in this guide didn’t match what you saw, the{' '}
                                <a href="https://testoza.com/support">TestoZa support page</a> reaches the people who build it.
                            </p>
                            <div className="ep-paths">
                                <Link className="ep-path" to={PANNA.routes.editor}>
                                    <span className="ep-path-who">Most PDFs</span>
                                    <span className="ep-path-what">Edit PDF</span>
                                </Link>
                                <Link className="ep-path" to={PANNA.routes.hindi}>
                                    <span className="ep-path-who">Hindi documents</span>
                                    <span className="ep-path-what">Edit Hindi PDF</span>
                                </Link>
                                <Link className="ep-path" to={PANNA.routes.latex}>
                                    <span className="ep-path-who">Maths and AI answers</span>
                                    <span className="ep-path-what">LaTeX to PDF</span>
                                </Link>
                            </div>
                            <p className="ep-small">
                                Teaching from PDFs? <a href="https://testoza.com/pdf-to-quiz">TestoZa turns a PDF of questions into an online test</a> with automatic marking.
                            </p>
                        </div>
                    </section>

                    <footer className="ep-sources">
                        <h2>Sources</h2>
                        <ul>
                            {GUIDE_SOURCES.map((g) => (
                                <li key={g.label}>
                                    {g.label}:{' '}
                                    {g.links.map((l, i) => (
                                        <span key={l.href}>
                                            {i > 0 && ', '}
                                            <a href={l.href} target="_blank" rel="noopener noreferrer">
                                                {l.label}
                                            </a>
                                        </span>
                                    ))}
                                </li>
                            ))}
                        </ul>
                        <p>
                            Written by the {GUIDE_META.author}. Last updated {GUIDE_META.dateLabel}. Panna’s features are described as they work on that date; other products are described from their makers’ help pages.
                        </p>
                    </footer>
                </article>

                <Link to={PANNA.routes.editor} className={`ep-float${floatOn ? ' is-on' : ''}`} aria-hidden={!floatOn} tabIndex={floatOn ? 0 : -1}>
                    Open the free PDF editor
                    <i aria-hidden="true">
                        <ArrowRight />
                    </i>
                </Link>
            </div>
        </div>
    );
}
