/**
 * "Not sure what to upload?" — a looping explainer under the AI import upload
 * card. Three scenes (question paper, class notes, study material) each show
 * the file landing, AI reading it, and the online test it becomes, then name
 * the button the teacher picks on the next screen (Extract / Generate).
 *
 * Plays only while the stage is on screen, can be paused, and shows each
 * scene's finished frame under reduced motion. All motion is CSS keyed off
 * the data flags on .wtu-canvas (whatToUpload.css); this file steps the phase.
 */

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
    BookOpen, Camera, Check, CheckCircle2, ChevronRight, ClipboardList, FileText,
    NotebookPen, Pause, Play, ScanLine, Sparkles, Timer, Upload, type LucideIcon,
} from 'lucide-react';
import './whatToUpload.css';

type Phase = 'idle' | 'upload' | 'read' | 'build' | 'done' | 'leave';

const ORDER: Phase[] = ['idle', 'upload', 'read', 'build', 'done', 'leave'];

/** When each phase starts within a scene, in ms. */
const TIMELINE: [Phase, number][] = [
    ['upload', 60],
    ['read', 1000],
    ['build', 2500],
    ['done', 4700],
    ['leave', 7000],
];
const SCENE_MS = 7400;

interface Scene {
    id: 'paper' | 'notes' | 'chapter';
    tab: string;
    Icon: LucideIcon;
    tilt: string;
    file: { name: string; sub: string; kind: 'pdf' | 'img' };
    reading: string;
    building: string;
    mode: 'extract' | 'generate';
    pick: string;
    caption: string;
    test: { title: string; time: string; marks: string; q: string; choices: string[]; correct: number; source: string };
}

const SCENES: Scene[] = [
    {
        id: 'paper',
        tab: 'Question paper',
        Icon: FileText,
        tilt: '-1.5deg',
        file: { name: 'Physics_MidTerm.pdf', sub: 'PDF · 2 pages', kind: 'pdf' },
        reading: 'Reading the question paper',
        building: 'Copying every question',
        mode: 'extract',
        pick: 'Extract Questions',
        caption: 'A printed or PDF exam paper, or a question bank. Every question, option and diagram is copied into the test exactly as written.',
        test: {
            title: 'Physics Mid-Term',
            time: '60:00',
            marks: '+4 −1',
            q: 'A ball is thrown straight up at 20 m/s. How high does it go? (g = 10 m/s²)',
            choices: ['10 m', '20 m', '30 m', '40 m'],
            correct: 1,
            source: 'From your paper',
        },
    },
    {
        id: 'notes',
        tab: 'Class notes',
        Icon: NotebookPen,
        tilt: '-3deg',
        file: { name: 'IMG_2041.jpg', sub: 'Photo · 2.1 MB', kind: 'img' },
        reading: 'Reading your notes',
        building: 'Writing new questions',
        mode: 'generate',
        pick: 'Generate New Questions',
        caption: 'A phone photo of class notes or a handout. AI reads the page and writes new questions on the same topic.',
        test: {
            title: 'Photosynthesis Quiz',
            time: '20:00',
            marks: '+1',
            q: 'Where in a plant cell does photosynthesis take place?',
            choices: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome'],
            correct: 2,
            source: 'Written by AI',
        },
    },
    {
        id: 'chapter',
        tab: 'Study material',
        Icon: BookOpen,
        tilt: '1.5deg',
        file: { name: 'Maths_Chapter_4.pdf', sub: 'PDF · 14 pages', kind: 'pdf' },
        reading: 'Reading the chapter',
        building: 'Writing new questions',
        mode: 'generate',
        pick: 'Generate New Questions',
        caption: 'A textbook chapter or study PDF. AI writes a fresh test from what the chapter teaches.',
        test: {
            title: 'Linear Equations',
            time: '30:00',
            marks: '+2 −0.5',
            q: 'Solve for x: 2x + 3 = 11',
            choices: ['x = 2', 'x = 3', 'x = 4', 'x = 7'],
            correct: 2,
            source: 'Written by AI',
        },
    },
];

/** Transition delay for one element, read by the CSS as --d. */
const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

function pillFor(phase: Phase, scene: Scene): { Icon: LucideIcon; text: string } {
    switch (phase) {
        case 'read':
            return { Icon: ScanLine, text: scene.reading };
        case 'build':
            return { Icon: scene.mode === 'extract' ? ClipboardList : Sparkles, text: scene.building };
        case 'done':
        case 'leave':
            return { Icon: CheckCircle2, text: 'Online test ready' };
        default:
            return { Icon: Upload, text: 'Uploading your file' };
    }
}

/* ── The three sheets ─────────────────────────────────────────────────── */

function GhostQuestion({ n, delay }: { n: number; delay: number }) {
    return (
        <div className="wtu-pq wtu-hl" style={d(delay)}>
            <p className="wtu-ghost">
                <span>{n}.</span>
                <i className="wtu-bar" style={{ width: '86%' }} />
            </p>
            <i className="wtu-bar wtu-bar--indent" style={{ width: '58%' }} />
            <div className="wtu-pq-opts">
                {[62, 48, 70, 54].map((w) => (
                    <i key={w} className="wtu-bar" style={{ width: `${w}%` }} />
                ))}
            </div>
        </div>
    );
}

function PaperDoc() {
    return (
        <div className="wtu-doc">
            <div className="wtu-paper-head">
                <b>MID-TERM EXAM</b>
                <span>Physics · Class 11</span>
            </div>
            <div className="wtu-paper-meta">
                <span>Time: 1 hr</span>
                <span>Max. marks: 40</span>
            </div>
            <div className="wtu-pq wtu-hl" style={d(600)}>
                <p>1. A ball is thrown straight up at 20 m/s. How high does it go? (g = 10 m/s²)</p>
                <div className="wtu-pq-opts">
                    <span>(a) 10 m</span><span>(b) 20 m</span><span>(c) 30 m</span><span>(d) 40 m</span>
                </div>
            </div>
            <div className="wtu-pq wtu-hl" style={d(760)}>
                <p>2. The SI unit of force is</p>
                <div className="wtu-pq-opts">
                    <span>(a) joule</span><span>(b) watt</span><span>(c) newton</span><span>(d) pascal</span>
                </div>
            </div>
            <GhostQuestion n={3} delay={880} />
            <GhostQuestion n={4} delay={1000} />
        </div>
    );
}

function NotesDoc() {
    return (
        <div className="wtu-doc wtu-doc--notes">
            <p className="wtu-n-title wtu-hl wtu-hl--mark" style={d(420)}>Photosynthesis</p>
            <p className="wtu-n-line wtu-n-small wtu-hl wtu-hl--mark" style={d(540)}>6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</p>
            <p className="wtu-n-line wtu-hl wtu-hl--mark" style={d(660)}>• happens in chloroplasts</p>
            <p className="wtu-n-line">• needs sunlight</p>
            <p className="wtu-n-line">• gives out oxygen (O₂)</p>
            <p className="wtu-n-line wtu-n-imp">★ Imp for exam!</p>
            <svg className="wtu-n-leaf" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 32C8 14 20 6 34 6c0 16-8 26-26 26Z" />
                <path d="M8 32 26 14" />
            </svg>
        </div>
    );
}

function ChapterDoc() {
    return (
        <div className="wtu-doc wtu-doc--chapter">
            <p className="wtu-c-kicker">CHAPTER 4</p>
            <p className="wtu-c-title wtu-hl" style={d(460)}>Linear Equations</p>
            <i className="wtu-bar" style={{ width: '100%' }} />
            <i className="wtu-bar" style={{ width: '94%' }} />
            <i className="wtu-bar" style={{ width: '71%' }} />
            <figure className="wtu-c-fig">
                <svg viewBox="0 0 160 62" fill="none">
                    <path d="M20 41h132M20 28h132M20 15h132" stroke="#e2e8f0" />
                    <path d="M20 8v46h132" stroke="#94a3b8" />
                    <path d="M24 50 148 12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="55" cy="40.5" r="2.4" fill="#6366f1" />
                    <circle cx="117" cy="21.5" r="2.4" fill="#6366f1" />
                    <text x="40" y="22" fontSize="8" fontStyle="italic" fill="#475569">y = 2x + 3</text>
                </svg>
                <figcaption>Fig 4.1</figcaption>
            </figure>
            <p className="wtu-c-ex wtu-hl" style={d(940)}>
                <b>Example 4.1</b> Solve 3x − 5 = 7
            </p>
            <i className="wtu-bar" style={{ width: '88%' }} />
            <i className="wtu-bar" style={{ width: '52%' }} />
            <i className="wtu-bar wtu-bar--para" style={{ width: '97%' }} />
            <i className="wtu-bar" style={{ width: '91%' }} />
            <i className="wtu-bar" style={{ width: '63%' }} />
            <span className="wtu-c-page">52</span>
        </div>
    );
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function WhatToUpload() {
    const sectionRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const [reduced] = useState(
        () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    );
    const [seen, setSeen] = useState(false);
    const [inView, setInView] = useState(false);
    const [paused, setPaused] = useState(false);
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'idle');
    // Bumped when a tab is picked, so picking the current tab replays it.
    const [replay, setReplay] = useState(0);
    // Bumped each time a scene starts; restarts the tab's progress bar with it.
    const [runs, setRuns] = useState(0);

    useEffect(() => {
        const section = sectionRef.current;
        const stage = stageRef.current;
        if (!section || !stage) return;
        if (typeof IntersectionObserver === 'undefined') {
            setSeen(true);
            setInView(true);
            return;
        }
        const reveal = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setSeen(true);
                    reveal.disconnect();
                }
            },
            { threshold: 0.1 },
        );
        // Start once most of the stage is visible, stop when it scrolls away.
        const play = new IntersectionObserver(
            ([e]) => setInView(e.intersectionRatio >= 0.45),
            { threshold: [0, 0.45, 1] },
        );
        reveal.observe(section);
        play.observe(stage);
        return () => {
            reveal.disconnect();
            play.disconnect();
        };
    }, []);

    const playing = inView && !paused && !reduced;

    useEffect(() => {
        if (!playing) return;
        setPhase('idle');
        setRuns((r) => r + 1);
        const timers = TIMELINE.map(([p, at]) => window.setTimeout(() => setPhase(p), at));
        timers.push(
            window.setTimeout(() => {
                setPhase('idle');
                setIndex((i) => (i + 1) % SCENES.length);
            }, SCENE_MS),
        );
        return () => timers.forEach(clearTimeout);
    }, [playing, index, replay]);

    const pick = (i: number) => {
        setPaused(false);
        // Off screen there is nothing to watch, so show the finished frame.
        setPhase(reduced || !inView ? 'done' : 'idle');
        setIndex(i);
        setReplay((n) => n + 1);
    };

    const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (index + step + SCENES.length) % SCENES.length;
        pick(next);
        tabRefs.current[next]?.focus();
    };

    const scene = SCENES[index];
    const t = scene.test;
    const pill = pillFor(phase, scene);
    const at = ORDER.indexOf(phase);
    const reached = (p: Phase) => (phase !== 'leave' && at >= ORDER.indexOf(p)) || undefined;

    return (
        <section
            ref={sectionRef}
            aria-labelledby="wtu-title"
            className="wtu px-4 pt-8 sm:pt-12 pb-16 max-w-2xl mx-auto"
            data-seen={seen || reduced ? 'true' : 'false'}
            data-playing={playing ? 'true' : 'false'}
            style={{ '--wtu-scene-ms': `${SCENE_MS}ms` } as CSSProperties}
        >
            <div className="wtu-rise text-center mb-5 sm:mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1.5">
                    Not sure what to upload?
                </p>
                <h2 id="wtu-title" className="text-balance text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Question papers, class notes or study material
                </h2>
                <p className="mt-1.5 text-balance text-sm text-slate-500 dark:text-slate-400">
                    Upload a PDF or phone photos. Here&apos;s what each one turns into.
                </p>
            </div>

            <div className="wtu-stage wtu-rise wtu-rise--late">
                <div
                    ref={stageRef}
                    className="wtu-canvas"
                    aria-hidden="true"
                    data-phase={phase}
                    data-file={reached('upload')}
                    data-scanned={reached('read')}
                    data-built={reached('build')}
                    data-done={reached('done')}
                >
                    <div className="wtu-pill">
                        <span key={`${scene.id}-${pill.text}`} className="wtu-pill-label">
                            <pill.Icon />
                            {pill.text}
                        </span>
                    </div>

                    <div className="wtu-drop">
                        <Upload />
                        <span>PDF or photo</span>
                    </div>

                    <div className="wtu-sheet" style={{ '--tilt': scene.tilt } as CSSProperties}>
                        {scene.id === 'paper' ? <PaperDoc /> : scene.id === 'notes' ? <NotesDoc /> : <ChapterDoc />}
                        <span className="wtu-beam" />
                    </div>

                    <div className="wtu-file">
                        <span className={`wtu-file-icon wtu-file-icon--${scene.file.kind}`}>
                            {scene.file.kind === 'pdf' ? <FileText /> : <Camera />}
                        </span>
                        <span className="wtu-file-meta">
                            <span className="wtu-file-name">{scene.file.name}</span>
                            <span className="wtu-file-sub">{scene.file.sub}</span>
                        </span>
                        <span className="wtu-file-check"><Check strokeWidth={3} /></span>
                        <span className="wtu-file-bar" />
                    </div>

                    <div className="wtu-flow">
                        <i /><i /><i />
                        <ChevronRight />
                    </div>

                    <div className="wtu-test">
                        <div className="wtu-test-bar">
                            <span className="wtu-test-name">
                                <span className="wtu-test-untitled">Untitled test</span>
                                <span className="wtu-test-title">{t.title}</span>
                            </span>
                            <span className="wtu-timer"><Timer />{t.time}</span>
                        </div>

                        <div className="wtu-test-body">
                            <div className="wtu-skeleton">
                                <span style={{ width: '34%' }} />
                                <span style={{ width: '96%' }} />
                                <span style={{ width: '68%' }} />
                                {[0, 1, 2, 3].map((k) => <span key={k} className="is-opt" />)}
                            </div>
                            <div className="wtu-q-meta wtu-in" style={d(0)}>
                                <span>Question 1</span>
                                <span className="wtu-marks">{t.marks}</span>
                            </div>
                            <p className="wtu-q-text wtu-in" style={d(90)}>{t.q}</p>
                            <ul className="wtu-choices">
                                {t.choices.map((c, i) => (
                                    <li key={c} className="wtu-in" style={d(260 + i * 90)}>
                                        <div className={`wtu-choice${i === t.correct ? ' is-correct' : ''}`}>
                                            <span className="wtu-radio"><Check strokeWidth={3.5} /></span>
                                            {c}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="wtu-actions wtu-in" style={d(700)}>
                                <span className="wtu-act">Mark for review</span>
                                <span className="wtu-act wtu-act--primary">Save &amp; Next</span>
                            </div>
                        </div>

                        <div className="wtu-test-foot">
                            <span className="wtu-palette">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <i key={n} className={n === 1 ? 'is-first' : undefined} style={d(n === 1 ? 0 : (n - 2) * 80)}>
                                        {n}
                                    </i>
                                ))}
                            </span>
                            <span className="wtu-source" data-mode={scene.mode}>
                                {scene.mode === 'extract' ? <ClipboardList /> : <Sparkles />}
                                {t.source}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="wtu-rise wtu-rise--late mt-4">
                <div className="flex items-center gap-2">
                    <div
                        role="tablist"
                        aria-label="What you can upload"
                        className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-slate-200/60 p-1 dark:bg-slate-800/60"
                    >
                        {SCENES.map((s, i) => {
                            const active = i === index;
                            return (
                                <button
                                    key={s.id}
                                    ref={(el) => { tabRefs.current[i] = el; }}
                                    id={`wtu-tab-${s.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-controls="wtu-panel"
                                    tabIndex={active ? 0 : -1}
                                    onClick={() => pick(i)}
                                    onKeyDown={onTabKey}
                                    className={`relative flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] sm:text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                                        active
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <s.Icon
                                        className={`hidden sm:block h-3.5 w-3.5 shrink-0 ${active ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">{s.tab}</span>
                                    {active && !reduced && (
                                        <span className="wtu-tab-track" aria-hidden="true">
                                            <span key={runs} className="wtu-tab-fill" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {!reduced && (
                        <button
                            type="button"
                            onClick={() => setPaused((p) => !p)}
                            aria-label={paused ? 'Play animation' : 'Pause animation'}
                            title={paused ? 'Play' : 'Pause'}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            {paused
                                ? <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" aria-hidden="true" />
                                : <Pause className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />}
                        </button>
                    )}
                </div>

                {/* Every caption sits in one grid cell, so the height never jumps */}
                <div id="wtu-panel" role="tabpanel" aria-labelledby={`wtu-tab-${scene.id}`} className="mt-3 grid">
                    {SCENES.map((s, i) => (
                        <p
                            key={s.id}
                            aria-hidden={i !== index}
                            className={`col-start-1 row-start-1 px-2 text-center text-[13px] leading-relaxed text-slate-600 transition-opacity duration-300 dark:text-slate-400 ${
                                i === index ? 'opacity-100' : 'pointer-events-none select-none opacity-0'
                            }`}
                        >
                            {s.caption}{' '}
                            On the next step, pick{' '}
                            <span className={`font-semibold whitespace-nowrap ${s.mode === 'extract' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                {s.pick}
                            </span>
                            .
                        </p>
                    ))}
                </div>
            </div>
        </section>
    );
}
