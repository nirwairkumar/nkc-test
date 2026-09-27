/**
 * Visual pieces of the Google Ads landing pages (/quiz-creator, /assessment-platform).
 * Copy comes from src/landing/adsLanding.ts. Motion is decorative: timers only run
 * on screen, and prefers-reduced-motion shows each piece at rest.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { Camera, Check, FileText, GraduationCap, Link2, Mail, MessageCircle, Smartphone, Type, X, Youtube } from 'lucide-react';
import { analytics } from '@/lib/analytics/tracker';
import { ADS_AUDIENCES, ADS_SAMPLE } from '@/landing/adsLanding';

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useInView(ref: RefObject<Element>) {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (!('IntersectionObserver' in window)) {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, [ref]);
    return inView;
}

const SOURCE_ICONS = { pdf: FileText, photo: Camera, youtube: Youtube, text: Type } as const;

/** The app-icon glyph for a material source (pdf, photo, youtube, text). */
export function SourceIcon({ id }: { id: keyof typeof SOURCE_ICONS }) {
    const Icon = SOURCE_ICONS[id];
    return <Icon />;
}

/* ── Hero phone: upload → AI writes → a student answers ───────────────────── */

const SCENE_MS = [3200, 3600, 4600];
const WRITTEN = 15;
const DRAFTS = [
    'What is the SI unit of force?',
    'A body at rest stays at rest unless…',
    'Which law explains rocket propulsion?',
];

export function QuizPhone() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref);
    const [reduced] = useState(prefersReducedMotion);
    const [scene, setScene] = useState(reduced ? 2 : 0);
    const [written, setWritten] = useState(0);

    useEffect(() => {
        if (reduced || !inView) return;
        const t = window.setTimeout(() => setScene((s) => (s + 1) % 3), SCENE_MS[scene]);
        return () => window.clearTimeout(t);
    }, [scene, inView, reduced]);

    useEffect(() => {
        if (scene !== 1) {
            setWritten(scene === 2 ? WRITTEN : 0);
            return;
        }
        let n = 0;
        const id = window.setInterval(() => {
            n += 1;
            setWritten(n);
            if (n >= WRITTEN) window.clearInterval(id);
        }, 190);
        return () => window.clearInterval(id);
    }, [scene]);

    return (
        <div className="qcl-visual" ref={ref} aria-hidden="true">
            <div className="qcl-glow" />
            <div className="qcl-phone">
                <div className="qcl-screen" data-scene={scene}>
                    <span className="qcl-island" />
                    <div className="qcl-status"><span>9:41</span><span className="qcl-bat" /></div>

                    {/* 1 · Upload */}
                    <div className="qcl-scene" data-on={scene === 0}>
                        <p className="qcl-appbar">New quiz</p>
                        <div className="qcl-tiles">
                            {(['pdf', 'photo', 'youtube', 'text'] as const).map((id, i) => {
                                const Icon = SOURCE_ICONS[id];
                                return (
                                    <span key={id} className={`qcl-tile${i === 0 ? ' is-pick' : ''}`} data-src={id}>
                                        <Icon />
                                        {id === 'pdf' ? 'PDF' : id === 'photo' ? 'Photo' : id === 'youtube' ? 'YouTube' : 'Text'}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="qcl-file">
                            <span className="qcl-file-ico"><FileText /></span>
                            <span className="qcl-file-meta">
                                <b>Laws of Motion.pdf</b>
                                <span className="qcl-bar"><i /></span>
                            </span>
                        </div>
                    </div>

                    {/* 2 · AI writes */}
                    <div className="qcl-scene" data-on={scene === 1}>
                        <p className="qcl-appbar">Writing questions</p>
                        <p className="qcl-count"><b>{written}</b> / {WRITTEN}</p>
                        <div className="qcl-drafts">
                            {DRAFTS.map((text, i) => (
                                <div key={i} className="qcl-draft" style={cssVars({ '--i': i })}>
                                    <span className="qcl-draft-n">Q{i + 1}</span>
                                    <p>{text}</p>
                                    <span className="qcl-opts"><i /><i /><i /><i /></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3 · A student answers */}
                    <div className="qcl-scene qcl-scene--student" data-on={scene === 2}>
                        <p className="qcl-appbar">Question 3 of 15</p>
                        <p className="qcl-q">Which law explains rocket propulsion?</p>
                        <div className="qcl-choices">
                            <span>First law</span>
                            <span>Second law</span>
                            <span className="is-right">Third law<Check /></span>
                            <span>Gravitation</span>
                        </div>
                        <div className="qcl-score">
                            <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle className="qcl-score-arc" cx="22" cy="22" r="18" /></svg>
                            <span><b>14/15</b>Score</span>
                        </div>
                    </div>
                    <span className="qcl-home" />
                </div>
            </div>
            <span className="qcl-float qcl-float--1"><i className="is-green" />Auto-graded</span>
            <span className="qcl-float qcl-float--2"><i className="is-blue" />15 questions</span>
            <span className="qcl-float qcl-float--3"><i className="is-orange" />English + <span lang="hi">हिंदी</span></span>
        </div>
    );
}

/* ── Try one question ─────────────────────────────────────────────────────── */

export function TryOne() {
    const [picked, setPicked] = useState<number | null>(null);
    const answered = picked !== null;
    const pick = (i: number) => {
        if (answered) return;
        setPicked(i);
        analytics.track('ads_try_question', { correct: i === ADS_SAMPLE.correct });
    };
    return (
        <div className="qcl-try" data-reveal>
            <div className="qcl-try-head">
                <span className="qcl-pill">{ADS_SAMPLE.subject}</span>
                <span className="qcl-try-marks">+4 / −1</span>
            </div>
            <p className="qcl-try-q">{ADS_SAMPLE.question}</p>
            <div className="qcl-try-opts" role="group" aria-label="Choose an answer">
                {ADS_SAMPLE.options.map((opt, i) => {
                    const state = !answered ? '' : i === ADS_SAMPLE.correct ? 'is-right' : i === picked ? 'is-wrong' : 'is-dim';
                    return (
                        <button key={opt} type="button" className={state} onClick={() => pick(i)} disabled={answered && state === 'is-dim'} aria-pressed={picked === i}>
                            <span className="qcl-try-letter">{'ABCD'[i]}</span>
                            {opt}
                            {state === 'is-right' && <Check className="qcl-try-mark" />}
                            {state === 'is-wrong' && <X className="qcl-try-mark" />}
                        </button>
                    );
                })}
            </div>
            <div className={`qcl-try-result${answered ? ' is-on' : ''}`} aria-live="polite">
                {answered && (
                    <p>
                        <b>{picked === ADS_SAMPLE.correct ? 'Correct. +4' : 'Not quite. −1'}</b> {ADS_SAMPLE.explanation}{' '}
                        <button type="button" className="qcl-linkish" onClick={() => setPicked(null)}>Try again</button>
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Widget visuals for the bento grid ────────────────────────────────────── */

export function ScoreRing({ value = 84 }: { value?: number }) {
    return (
        <div className="qcl-ring" style={cssVars({ '--v': value })} aria-hidden="true">
            <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" />
                <circle className="qcl-ring-arc" cx="60" cy="60" r="50" pathLength={100} />
            </svg>
            <span><b>{value}%</b>Class average</span>
        </div>
    );
}

const LANG = {
    en: { q: 'What is the capital of Rajasthan?', a: ['Jaipur', 'Jodhpur', 'Udaipur'] },
    hi: { q: 'राजस्थान की राजधानी क्या है?', a: ['जयपुर', 'जोधपुर', 'उदयपुर'] },
};

export function LanguageCard() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref);
    const [lang, setLang] = useState<'en' | 'hi'>('en');
    const [touched, setTouched] = useState(false);
    useEffect(() => {
        if (!inView || touched || prefersReducedMotion()) return;
        const id = window.setInterval(() => setLang((l) => (l === 'en' ? 'hi' : 'en')), 2600);
        return () => window.clearInterval(id);
    }, [inView, touched]);
    const t = LANG[lang];
    return (
        <div className="qcl-lang" ref={ref}>
            <div className="qcl-mini-seg" role="group" aria-label="Question language" style={cssVars({ '--i': lang === 'en' ? 0 : 1 })}>
                <span className="qcl-mini-thumb" aria-hidden="true" />
                <button type="button" aria-pressed={lang === 'en'} onClick={() => { setTouched(true); setLang('en'); }}>English</button>
                <button type="button" aria-pressed={lang === 'hi'} onClick={() => { setTouched(true); setLang('hi'); }} lang="hi">हिंदी</button>
            </div>
            <div className="qcl-lang-card" key={lang} lang={lang === 'hi' ? 'hi' : 'en'}>
                <p>{t.q}</p>
                <span className="is-right">{t.a[0]}</span>
                <span>{t.a[1]}</span>
                <span>{t.a[2]}</span>
            </div>
        </div>
    );
}

export function QuestionTypes() {
    return (
        <div className="qcl-types" aria-hidden="true">
            <span style={cssVars({ '--i': 0 })}>Single correct</span>
            <span style={cssVars({ '--i': 1 })}>Multi-correct</span>
            <span style={cssVars({ '--i': 2 })}>Numerical</span>
            <span style={cssVars({ '--i': 3 })}>Passage</span>
            <span className="qcl-formula" style={cssVars({ '--i': 4 })}>x = (−b ± √(b² − 4ac)) / 2a</span>
        </div>
    );
}

export function ShareCard() {
    return (
        <div className="qcl-share" aria-hidden="true">
            <span className="qcl-link"><Link2 />testoza.com/test/laws-of-motion</span>
            <span className="qcl-share-row">
                <span className="is-wa"><MessageCircle /></span>
                <span className="is-mail"><Mail /></span>
                <span className="is-class"><GraduationCap /></span>
            </span>
        </div>
    );
}

export function AnyPhone() {
    return (
        <div className="qcl-anyphone" aria-hidden="true">
            <Smartphone />
            <span className="qcl-badge"><Check /></span>
        </div>
    );
}

/* ── Who it's for: a segmented control ────────────────────────────────────── */

export function Audiences() {
    const [index, setIndex] = useState(0);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const current = ADS_AUDIENCES[index];
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (index + step + ADS_AUDIENCES.length) % ADS_AUDIENCES.length;
        setIndex(next);
        tabs.current[next]?.focus();
    };
    return (
        <div className="qcl-aud" data-reveal>
            <div
                className="qcl-seg"
                role="tablist"
                aria-label="Who it's for"
                onKeyDown={onKeyDown}
                style={cssVars({ '--i': index, '--n': ADS_AUDIENCES.length })}
            >
                <span className="qcl-seg-thumb" aria-hidden="true" />
                {ADS_AUDIENCES.map((a, i) => (
                    <button
                        key={a.id}
                        ref={(el) => (tabs.current[i] = el)}
                        type="button"
                        role="tab"
                        id={`qcl-tab-${a.id}`}
                        aria-selected={i === index}
                        aria-controls="qcl-aud-panel"
                        tabIndex={i === index ? 0 : -1}
                        onClick={() => setIndex(i)}
                    >
                        {a.label}
                    </button>
                ))}
            </div>
            <ul className="qcl-aud-list" id="qcl-aud-panel" role="tabpanel" aria-labelledby={`qcl-tab-${current.id}`} key={current.id}>
                {current.points.map((p, i) => (
                    <li key={p} style={cssVars({ '--i': i })}>
                        <span className="qcl-tick"><Check /></span>
                        {p}
                    </li>
                ))}
            </ul>
        </div>
    );
}
