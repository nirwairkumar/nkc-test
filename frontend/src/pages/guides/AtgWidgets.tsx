/**
 * Interactive parts of testoza.com/ai-test-generator. Crawlers get each widget's
 * fallbackHtml from src/guides/aiTestGenerator.ts instead.
 *
 *   mode-compare    — the same chapter through Extract and Generate
 *   settings-lab    — the product's AI Settings card; language and difficulty
 *                     change the sample question the way the generator does
 *   review-screen   — a working copy of the review screen (filters, search,
 *                     Raw, passage, diagram, jump sheet), in a window
 *   material-picker — "what do you have?" → which mode or tool to use
 *   time-saved      — hours saved per week, with the assumptions on show
 *
 * Product surfaces reuse the product's own classes (.aix-*, aiImport.css).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BookOpen,
    Camera,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    CodeXml,
    FileText,
    Grid3x3,
    ImageIcon,
    Info,
    Layers,
    ListChecks,
    Lock,
    MoreHorizontal,
    PenLine,
    RotateCcw,
    ScanText,
    Search,
    Sparkles,
    TriangleAlert,
    X,
    Youtube,
} from 'lucide-react';
import type { GuideWidget } from '@/guides/types';
import {
    GENERATED_BILINGUAL,
    INSTRUCTION_PRESETS,
    LAB,
    REVIEW_QUESTIONS,
    TYPE_LONG,
    TYPE_SHORT,
    isCorrectKey,
    type DemoQuestion,
    type Difficulty,
} from './atgData';
import '@/components/ai-import/aiImport.css';

function Head({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
    return (
        <div className="atg-widget-head">
            <div>
                <h3>{title}</h3>
                <p>{text}</p>
            </div>
            {children}
        </div>
    );
}

/** iOS segmented control with a sliding thumb. */
function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    return (
        <div className="atg-seg" role="group" aria-label={label}>
            <span className="atg-seg-thumb" style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }} />
            {options.map((o) => (
                <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** A live-feed card, as the product renders it. */
function FeedCard({ q, n, delay = 0, missing = false }: { q: DemoQuestion; n: number; delay?: number; missing?: boolean }) {
    return (
        <article className="aix-card aix-fq" style={{ animationDelay: `${delay}s, ${delay + 0.15}s` }}>
            <div className="aix-fq-head">
                <span className="aix-num">{n}</span>
                <span className="aix-chip">{TYPE_SHORT[q.type]}</span>
                {q.page ? <span className="aix-chip">Page {q.page}</span> : null}
            </div>
            <div className="aix-fq-text">{q.text}</div>
            {q.options && (
                <div className="aix-fq-opts">
                    {q.options.map(([k, v]) => (
                        <div key={k} className={`aix-fq-opt${isCorrectKey(q, k) ? ' is-correct' : ''}`}>
                            <b>{k}</b>
                            <div>{v}</div>
                        </div>
                    ))}
                </div>
            )}
            {q.type === 'numerical' && q.answer && (
                <div className="aix-answer">
                    Answer <b>{q.answer as string}</b>
                </div>
            )}
            {missing && (
                <p className="aix-missing">
                    <TriangleAlert />
                    <span>No correct answer detected. You can set it in the editor.</span>
                </p>
            )}
        </article>
    );
}

// ── Mode compare ─────────────────────────────────────────────────────────────

const EXTRACT_OUT: DemoQuestion[] = [
    {
        type: 'single',
        text: 'A force of 10 N acts on a body of mass 2 kg. The acceleration produced is',
        options: [
            ['A', '20 m/s²'],
            ['B', '5 m/s²'],
            ['C', '12 m/s²'],
            ['D', '0.2 m/s²'],
        ],
        answer: 'B',
        page: 2,
    },
    {
        type: 'single',
        text: 'A body is moving with uniform velocity. The net force acting on it is',
        options: [
            ['A', 'zero'],
            ['B', 'equal to its weight'],
            ['C', 'in the direction of motion'],
            ['D', 'opposite to the motion'],
        ],
        answer: null,
        page: 2,
    },
];

const english = (q: DemoQuestion): DemoQuestion => ({
    ...q,
    text: q.text.split('\n')[0],
    options: q.options?.map(([k, v]) => [k, v.split('\n')[0]] as [string, string]),
});
const GENERATE_OUT: DemoQuestion[] = [GENERATED_BILINGUAL[0], GENERATED_BILINGUAL[1], GENERATED_BILINGUAL[4]].map(english);

function ModeCompare() {
    const [mode, setMode] = useState<'extract' | 'generate'>('extract');
    const [run, setRun] = useState(0);
    const paperRef = useRef<HTMLDivElement>(null);
    const [h, setH] = useState(360);
    const extract = mode === 'extract';

    useEffect(() => {
        if (paperRef.current) setH(paperRef.current.offsetHeight);
    }, [mode]);

    const choose = (m: 'extract' | 'generate') => {
        if (m === mode) return;
        setMode(m);
        setRun((r) => r + 1);
    };

    return (
        <div className="atg-widget">
            <Head title="The same chapter, two modes" text="Switch modes to see what goes in and what comes out.">
                <Segmented
                    label="Mode"
                    value={mode}
                    onChange={choose}
                    options={[
                        { value: 'extract', label: 'Extract' },
                        { value: 'generate', label: 'Generate' },
                    ]}
                />
            </Head>
            <div className="atg-mc">
                <div>
                    <p className="atg-mc-label">{extract ? 'Your file: a question paper' : 'Your file: a textbook page'}</p>
                    <div className="atg-paper" ref={paperRef}>
                        {extract ? (
                            <>
                                <p className="atg-paper-h">Unit Test 2 · Physics</p>
                                <p className="atg-paper-sub">Class 9 · Force and Laws of Motion · Page 2</p>
                                <p>7. A force of 10 N acts on a body of mass 2 kg. The acceleration produced is</p>
                                <ol>
                                    <li>(a) 20 m/s²</li>
                                    <li>(b) 5 m/s²</li>
                                    <li>(c) 12 m/s²</li>
                                    <li>(d) 0.2 m/s²</li>
                                </ol>
                                <p>8. A body is moving with uniform velocity. The net force acting on it is</p>
                                <ol>
                                    <li>(a) zero</li>
                                    <li>(b) equal to its weight</li>
                                    <li>(c) in the direction of motion</li>
                                    <li>(d) opposite to the motion</li>
                                </ol>
                                <p className="atg-paper-key">
                                    Answers (Q1–7): 1. (c) 2. (a) 3. (d) 4. (b) 5. (a) 6. (c) <mark>7. (b)</mark>
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="atg-paper-h">9.4 Second law of motion</p>
                                <p className="atg-paper-sub">Science · Chapter 9 · Page 4</p>
                                <p>The second law of motion states that the rate of change of momentum of an object is proportional to the applied unbalanced force, in the direction of the force.</p>
                                <p>
                                    For an object of constant mass <i>m</i>, this gives <b>F = ma</b>, with the force in newtons, the mass in kilograms and the acceleration in m/s². One newton is the force that gives a body of mass 1 kg an acceleration of 1 m/s².
                                </p>
                                <p>So a larger force produces a larger acceleration, and the same force accelerates a heavier body less.</p>
                            </>
                        )}
                        <span key={run} className={`atg-scan${extract ? '' : ' is-generate'}`} style={{ ['--h' as string]: `${h}px` }} aria-hidden="true" />
                    </div>
                </div>
                <span className="atg-mc-arrow" aria-hidden="true">
                    <ArrowRight />
                </span>
                <div>
                    <p className="atg-mc-label">{extract ? 'In TestoZa: extracted' : 'In TestoZa: generated'}</p>
                    <div className="aix atg-app atg-mc-out" key={mode}>
                        {(extract ? EXTRACT_OUT : GENERATE_OUT).map((q, i) => (
                            <FeedCard key={i} q={q} n={extract ? 7 + i : i + 1} delay={run ? 0.55 + i * 0.15 : 0} missing={extract && !q.answer} />
                        ))}
                    </div>
                    <p className="atg-mc-caption">
                        <Info aria-hidden="true" />
                        {extract
                            ? 'Wording and numbers kept exactly. The answer to 7 came from the key; 8 isn’t in the key, so it’s flagged instead of guessed.'
                            : 'New questions on the same idea, with wrong options built from common slips. The AI writes this key too, so spot-check it.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Settings lab ─────────────────────────────────────────────────────────────

type Lang = 'default' | 'English' | 'Hindi';

function SettingsLab() {
    const [langs, setLangs] = useState<Lang[]>(['default']);
    const [diff, setDiff] = useState<Difficulty>('Moderate');
    const [preset, setPreset] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [version, setVersion] = useState(0);
    const first = useRef(true);

    // Same rules as the product's language chips.
    const toggle = (lang: Lang) => {
        if (lang === 'default') return setLangs(['default']);
        setLangs((prev) => {
            const rest = prev.filter((l) => l !== 'default');
            if (rest.includes(lang)) {
                const next = rest.filter((l) => l !== lang);
                return next.length ? next : ['default'];
            }
            return [...rest, lang];
        });
    };

    // A short "generating" beat after each change, then the new question rises in.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        setBusy(true);
        const id = window.setTimeout(() => {
            setBusy(false);
            setVersion((v) => v + 1);
        }, 650);
        return () => window.clearTimeout(id);
    }, [langs, diff]);

    const q = LAB[diff];
    const showEn = langs.includes('default') || langs.includes('English');
    const showHi = langs.includes('Hindi');
    // Bilingual text is English with the Hindi beneath it, as the generator writes it.
    const pick = (b: { en: string; hi: string }) => {
        const parts: string[] = [];
        if (showEn) parts.push(b.en);
        if (showHi && (!showEn || b.hi !== b.en)) parts.push(b.hi);
        return parts.join('\n');
    };
    const bilingual = langs.length > 1;
    const diffClass: Record<Difficulty, string> = { Easy: 'is-easy', Moderate: 'is-moderate', Tough: 'is-tough' };
    const presetNote = [
        'Your instruction sets every question to 4 marks and −1 for a wrong answer. You’ll see it on each question in the editor.',
        'The AI will aim for 30 questions with at least 8 numerical ones, instead of its usual 15 to 25.',
        'Questions will come only from section 9.3; the rest of the chapter is ignored.',
    ];

    return (
        <div className="atg-widget">
            <Head title="Try the settings" text="The card on the left is the generator’s own. Change it and watch the question respond." />
            <div className="atg-lab">
                <div className="atg-s2-card atg-s2-settings">
                    <div className="atg-s2-sethead">
                        <div className="atg-s2-h">
                            <Sparkles aria-hidden="true" />
                            AI Settings &amp; Constraints
                        </div>
                        <span>Customizable</span>
                    </div>
                    <div className="atg-s2-field">
                        <div className="atg-s2-label">
                            <span>
                                <span aria-hidden="true">🌐</span> Language Output
                                {bilingual && <span className="atg-s2-badge">Bilingual</span>}
                            </span>
                        </div>
                        <div className="atg-s2-chips" role="group" aria-label="Language output">
                            {(['default', 'English', 'Hindi'] as Lang[]).map((l) => (
                                <button key={l} type="button" aria-pressed={langs.includes(l)} className={`atg-s2-chip${langs.includes(l) ? ' is-on' : ''}`} onClick={() => toggle(l)}>
                                    {l === 'default' ? 'Same as Material' : l}
                                </button>
                            ))}
                        </div>
                        <p className="atg-s2-help">Select multiple (e.g. English + Hindi) for bilingual questions.</p>
                    </div>
                    <div className="atg-s2-field">
                        <div className="atg-s2-label">
                            <span>
                                <span aria-hidden="true">🎯</span> Target Difficulty
                            </span>
                            <span className="atg-s2-pill">For generating questions only</span>
                        </div>
                        <div className="atg-s2-chips atg-s2-chips--diff" role="group" aria-label="Target difficulty">
                            {(['Easy', 'Moderate', 'Tough'] as Difficulty[]).map((d) => (
                                <button key={d} type="button" aria-pressed={diff === d} className={`atg-s2-chip${diff === d ? ` ${diffClass[d]}` : ''}`} onClick={() => setDiff(d)}>
                                    <span aria-hidden="true">{d === 'Easy' ? '🟢' : d === 'Moderate' ? '🟡' : '🔴'}</span> {d}
                                </button>
                            ))}
                        </div>
                        <p className="atg-s2-help">Controls question complexity &amp; reasoning depth for AI generated questions.</p>
                    </div>
                    <div className="atg-s2-field">
                        <div className="atg-s2-label">
                            <span>
                                <span aria-hidden="true">📝</span> Custom Instructions (Optional)
                            </span>
                            <small>e.g. Marks, Negative marking, Count</small>
                        </div>
                        <div className={`atg-s2-textarea${preset !== null ? ' is-focus' : ''}`} aria-live="polite">
                            {preset !== null ? INSTRUCTION_PRESETS[preset] : 'e.g. Each question 2 marks, 0.5 negative. Generate minimum 30 questions with top conceptual focus...'}
                        </div>
                        <div className="atg-lab-presets" role="group" aria-label="Example instructions">
                            {INSTRUCTION_PRESETS.map((p, i) => (
                                <button key={p} type="button" aria-pressed={preset === i} onClick={() => setPreset(preset === i ? null : i)}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="atg-lab-out">
                    <p className="atg-lab-status" aria-live="polite">
                        {busy ? (
                            <>
                                <span className="aix-spin" aria-hidden="true" /> Writing a {diff.toLowerCase()} question…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 aria-hidden="true" /> Question 1 of the test · {diff}
                                {bilingual ? ' · English + Hindi' : showHi ? ' · Hindi' : ' · English'}
                            </>
                        )}
                    </p>
                    <div className="aix atg-app" style={{ opacity: busy ? 0.45 : 1, transition: 'opacity 0.25s' }}>
                        <article key={version} className="aix-card aix-qc" style={{ animation: version ? 'aix-rise 0.55s var(--spring) both' : undefined }}>
                            <header className="aix-qc-head">
                                <span className="aix-num">1</span>
                                <span className="aix-chip">Single choice</span>
                                <span className="aix-chip">Page 4</span>
                            </header>
                            <div className="aix-qtext">{pick(q.q)}</div>
                            <div className="aix-opts">
                                {q.options.map(([k, v]) => {
                                    const correct = k === q.answer;
                                    return (
                                        <div key={k} className={`aix-opt${correct ? ' is-correct' : ''}`}>
                                            <span className="aix-opt-key">{k}</span>
                                            <div className="aix-opt-body">{pick(v)}</div>
                                            {correct && (
                                                <span className="aix-opt-seal">
                                                    <Check />
                                                    <span className="aix-sr">Correct answer</span>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </article>
                    </div>
                    <p className="atg-lab-why">
                        <b>Why it’s {diff.toLowerCase()}:</b> {q.why}
                    </p>
                    {preset !== null && (
                        <p className="atg-lab-why">
                            <b>Your instruction:</b> {presetNote[preset]}
                        </p>
                    )}
                </div>
            </div>
            <p className="atg-widget-note">Sample questions written for this page. In TestoZa, every question in a run follows the same settings.</p>
        </div>
    );
}

// ── Review screen (working replica) ─────────────────────────────────────────

type Filter = 'all' | 'missing' | 'diagram';
const hasAnswer = (q: DemoQuestion) => q.answer !== null && q.answer !== '';

function VtGraph() {
    return (
        <svg className="atg-graph" viewBox="0 0 240 150" role="img" aria-label="Velocity–time graph: a straight line from 0 m/s at 0 s to 20 m/s at 4 s">
            <line x1="40" y1="120" x2="225" y2="120" stroke="#475569" strokeWidth="1.2" />
            <line x1="40" y1="120" x2="40" y2="12" stroke="#475569" strokeWidth="1.2" />
            {[1, 2, 3, 4].map((i) => (
                <line key={i} x1={40 + i * 42} y1="120" x2={40 + i * 42} y2="20" stroke="#e2e8f0" strokeWidth="1" />
            ))}
            {[1, 2].map((i) => (
                <line key={i} x1="40" y1={120 - i * 45} x2="215" y2={120 - i * 45} stroke="#e2e8f0" strokeWidth="1" />
            ))}
            <line x1="40" y1="120" x2="208" y2="30" stroke="#0a84ff" strokeWidth="2.5" strokeLinecap="round" />
            <text x="36" y="134" textAnchor="end">0</text>
            <text x="124" y="134" textAnchor="middle">2</text>
            <text x="208" y="134" textAnchor="middle">4</text>
            <text x="34" y="79" textAnchor="end">10</text>
            <text x="34" y="34" textAnchor="end">20</text>
            <text x="225" y="146" textAnchor="end">t (s)</text>
            <text x="44" y="12">v (m/s)</text>
        </svg>
    );
}

function ReviewCard({ q, n }: { q: DemoQuestion; n: number }) {
    const [raw, setRaw] = useState(false);
    const answered = hasAnswer(q);
    return (
        <article id={`atg-q-${n}`} className="aix-card aix-qc">
            <header className="aix-qc-head">
                <span className={`aix-num${answered ? '' : ' is-warn'}`}>
                    <span className="aix-sr">Question </span>
                    {n}
                </span>
                <span className="aix-chip">{TYPE_LONG[q.type]}</span>
                {q.page ? <span className="aix-chip">Page {q.page}</span> : null}
                {q.diagram ? (
                    <span className="aix-chip">
                        <ImageIcon />
                        Diagram
                    </span>
                ) : null}
                <div className="aix-qc-tools">
                    <button type="button" className="aix-iconbtn" aria-pressed={raw} onClick={() => setRaw((r) => !r)} title={raw ? 'Show formatted question' : 'Show the raw text and LaTeX'}>
                        <CodeXml />
                        <span>Raw</span>
                    </button>
                </div>
            </header>
            {q.passage && (
                <details className="aix-passage">
                    <summary>
                        <BookOpen />
                        Passage
                        <ChevronDown className="aix-chev" />
                    </summary>
                    <div className="aix-passage-body">{raw ? <pre className="aix-raw">{q.passage}</pre> : q.passage}</div>
                </details>
            )}
            {raw ? <pre className="aix-raw">{q.raw ?? q.text}</pre> : <div className="aix-qtext">{q.text}</div>}
            {q.diagram && (
                <figure className="aix-figure">
                    <button type="button" tabIndex={-1} aria-hidden="true">
                        <VtGraph />
                    </button>
                    <figcaption>
                        <ImageIcon />
                        Diagram · page {q.page}
                    </figcaption>
                </figure>
            )}
            {q.options && (
                <div className="aix-opts" role="list">
                    {q.options.map(([k, v]) => {
                        const correct = isCorrectKey(q, k);
                        return (
                            <div key={k} role="listitem" className={`aix-opt${correct ? ' is-correct' : ''}`}>
                                <span className={`aix-opt-key${q.type === 'multiple' ? ' aix-opt-key--box' : ''}`}>{k}</span>
                                <div className="aix-opt-body">{raw ? <code style={{ fontFamily: 'var(--f-mono)', fontSize: 13 }}>{v}</code> : v}</div>
                                {correct && (
                                    <span className="aix-opt-seal">
                                        <Check />
                                        <span className="aix-sr">Correct answer</span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {q.type === 'numerical' && answered && (
                <div className="aix-answer">
                    Answer <b>{q.answer as string}</b>
                </div>
            )}
            {!answered && (
                <p className="aix-missing">
                    <TriangleAlert />
                    <span>No correct answer detected. You can set it in the editor.</span>
                </p>
            )}
        </article>
    );
}

function ReviewScreen() {
    const questions = REVIEW_QUESTIONS;
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [jumpOpen, setJumpOpen] = useState(false);
    const [current, setCurrent] = useState(1);
    const [toast, setToast] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLElement>(null);

    const missing = questions.filter((q) => !hasAnswer(q)).length;
    const diagrams = questions.filter((q) => q.diagram).length;
    const typeEntries = useMemo(() => {
        const counts: Record<string, number> = {};
        questions.forEach((q) => {
            counts[q.type] = (counts[q.type] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [questions]);
    const plural: Record<string, string> = { single: 'single choice', multiple: 'multiple correct', numerical: 'numerical' };

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return questions
            .map((q, i) => ({ q, n: i + 1 }))
            .filter(({ q }) => {
                if (filter === 'missing' && hasAnswer(q)) return false;
                if (filter === 'diagram' && !q.diagram) return false;
                const hay = [q.text, q.passage ?? '', ...(q.options?.map((o) => o[1]) ?? [])].join(' ').toLowerCase();
                return !needle || hay.includes(needle);
            });
    }, [questions, filter, query]);

    const scrollToCard = (n: number) => {
        const body = bodyRef.current;
        const card = body?.querySelector<HTMLElement>(`#atg-q-${n}`);
        if (!body || !card) return;
        body.scrollTo({ top: card.offsetTop - 70, behavior: 'smooth' });
        setCurrent(n);
    };
    const jumpTo = (n: number) => {
        setJumpOpen(false);
        if (!visible.some((v) => v.n === n)) {
            setFilter('all');
            setQuery('');
        }
        window.setTimeout(() => scrollToCard(n), 80);
    };
    const showMissing = () => {
        setFilter('missing');
        setQuery('');
        const body = bodyRef.current;
        if (body && listRef.current) body.scrollTo({ top: listRef.current.offsetTop - 8, behavior: 'smooth' });
    };
    const demoToast = () => {
        setToast(true);
        window.setTimeout(() => setToast(false), 3600);
    };

    return (
        <div className="atg-widget">
            <Head title="The review screen, working" text="An extracted unit test with two missing answers and a diagram. Use the filters, search, Raw and Jump as you would in TestoZa." />
            <div className="atg-window">
                <div className="atg-window-bar" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <span>
                        <Lock />
                        app.testoza.com/generate-with-ai
                    </span>
                </div>
                <div className="atg-window-body aix atg-app" ref={bodyRef} style={{ height: 'min(600px, 78vh)' }}>
                    <div className="aix-rv">
                        <header className="aix-hero">
                            <div className="aix-eyebrow">
                                <span className="aix-chip aix-chip--blue">
                                    <ScanText />
                                    Extracted from your file
                                </span>
                                <span className="aix-chip">200 DPI · medium scan</span>
                                <span>Review, then save or fine-tune in the editor.</span>
                            </div>
                            <div className="atg-r-title">Unit Test 2: Force and Laws of Motion</div>
                            <div className="aix-widgets">
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon" aria-hidden="true">
                                        <ListChecks />
                                    </span>
                                    <div>
                                        <b>{questions.length}</b>
                                        <span>Questions</span>
                                    </div>
                                </div>
                                <button type="button" className="aix-card aix-widget" onClick={showMissing} aria-label={`Show the ${missing} questions that need an answer`}>
                                    <span className="aix-widget-icon aix-widget-icon--orange" aria-hidden="true">
                                        <TriangleAlert />
                                    </span>
                                    <div>
                                        <b>{missing}</b>
                                        <span>Need an answer</span>
                                    </div>
                                    <ChevronRight className="aix-widget-chev" aria-hidden="true" />
                                </button>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--indigo" aria-hidden="true">
                                        <Layers />
                                    </span>
                                    <div>
                                        <b>{typeEntries.length} types</b>
                                        <span>{typeEntries.map(([t, c]) => `${c} ${plural[t]}`).join(' · ')}</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--purple" aria-hidden="true">
                                        <Clock />
                                    </span>
                                    <div>
                                        <b>38.4s</b>
                                        <span>Processing time</span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="aix-rv-grid">
                            <main ref={listRef} style={{ minWidth: 0 }}>
                                <div className="aix-toolbar" role="toolbar" aria-label="Filter questions">
                                    <div className="aix-seg" role="group" aria-label="Show">
                                        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                                            All <em>{questions.length}</em>
                                        </button>
                                        <button type="button" className="is-warn" aria-pressed={filter === 'missing'} onClick={() => setFilter('missing')}>
                                            Needs answer <em>{missing}</em>
                                        </button>
                                        <button type="button" aria-pressed={filter === 'diagram'} onClick={() => setFilter('diagram')}>
                                            Diagrams <em>{diagrams}</em>
                                        </button>
                                    </div>
                                    <label className="aix-search">
                                        <Search aria-hidden="true" />
                                        <span className="aix-sr">Search questions</span>
                                        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" enterKeyHint="search" />
                                        {query && (
                                            <button type="button" className="aix-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                                                <X />
                                            </button>
                                        )}
                                    </label>
                                    <button type="button" className="aix-btn aix-btn--gray aix-jumpbtn" onClick={() => setJumpOpen(true)}>
                                        <Grid3x3 /> Jump
                                    </button>
                                </div>

                                {missing > 0 && filter !== 'missing' && (
                                    <div className="aix-banner" role="note">
                                        <TriangleAlert />
                                        <p>
                                            <b>{missing} questions</b> have no correct answer yet. Set them in the editor before students take the test.
                                        </p>
                                        <button type="button" className="aix-btn aix-btn--plain" style={{ height: 34 }} onClick={showMissing}>
                                            Show
                                        </button>
                                    </div>
                                )}

                                <div className="aix-qlist">
                                    {visible.map(({ q, n }) => (
                                        <ReviewCard key={n} q={q} n={n} />
                                    ))}
                                    {visible.length === 0 && (
                                        <div className="aix-card aix-empty">
                                            <Search />
                                            <b>No matching questions</b>
                                            Try a different word, or show all questions.
                                            <div style={{ marginTop: 14 }}>
                                                <button
                                                    type="button"
                                                    className="aix-btn aix-btn--tinted"
                                                    onClick={() => {
                                                        setQuery('');
                                                        setFilter('all');
                                                    }}
                                                >
                                                    Show all {questions.length}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {visible.length > 0 && (
                                    <p className="aix-endnote">
                                        {visible.length === questions.length ? `That's all ${questions.length} questions.` : `Showing ${visible.length} of ${questions.length} questions.`}
                                    </p>
                                )}
                            </main>
                        </div>

                        <div className="aix-actionbar">
                            <div className="aix-actionbar-in">
                                <button type="button" className="aix-btn aix-btn--gray aix-btn--icon aix-only-narrow" aria-label="More actions" onClick={() => setJumpOpen(true)}>
                                    <MoreHorizontal />
                                </button>
                                <button type="button" className="aix-btn aix-btn--gray aix-only-wide" onClick={demoToast}>
                                    <RotateCcw /> Try again
                                </button>
                                <div className="aix-actionbar-sum" aria-live="polite">
                                    <b>{questions.length} questions</b>
                                    <span className="is-warn">{missing} still need an answer</span>
                                </div>
                                <span className="aix-grow" />
                                <button type="button" className="aix-btn aix-btn--tinted" onClick={demoToast}>
                                    <PenLine /> Edit
                                </button>
                                <button type="button" className="aix-btn aix-btn--filled" onClick={demoToast}>
                                    <Check /> Save &amp; continue
                                </button>
                            </div>
                        </div>
                    </div>

                    {jumpOpen && (
                        <>
                            <div className="atg-sheet-backdrop" onClick={() => setJumpOpen(false)} />
                            <div className="atg-sheet" role="dialog" aria-label="Jump to a question">
                                <div className="atg-sheet-grab" />
                                <h4>Jump to a question</h4>
                                <p>{missing} marked orange need an answer.</p>
                                <div className="aix-jumpgrid">
                                    {questions.map((q, i) => {
                                        const n = i + 1;
                                        const warn = !hasAnswer(q);
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                className={`aix-jump${warn ? ' is-warn' : ''}${current === n ? ' is-current' : ''}`}
                                                onClick={() => jumpTo(n)}
                                                aria-label={`Question ${n}${warn ? ', needs an answer' : ''}`}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="aix-legend" aria-hidden="true">
                                    <span>
                                        <i className="is-current" />
                                        Viewing
                                    </span>
                                    <span>
                                        <i className="is-warn" />
                                        Needs answer
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                    {toast && (
                        <div className="atg-replica-toast" role="status">
                            This copy of the screen can’t save. Try it with your own file.
                            <Link to="/generate-with-ai">Open</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Material picker ──────────────────────────────────────────────────────────

interface Material {
    key: string;
    icon: ReactNode;
    tone: string;
    title: string;
    sub: string;
    mode: { label: string; icon: ReactNode; tone: string };
    heading: string;
    body: string;
    steps: string[];
    cta: { label: string; href: string };
}

const GEN_CTA = { label: 'Open the AI test generator', href: '/generate-with-ai' };
const EXTRACT_MODE = { label: 'Extract', icon: <ScanText />, tone: '#007aff' };
const GENERATE_MODE = { label: 'Generate', icon: <Sparkles />, tone: '#af52de' };

const MATERIALS: Material[] = [
    {
        key: 'paper',
        icon: <FileText />,
        tone: '#007aff',
        title: 'An old question paper',
        sub: 'PDF or scan, with or without a key',
        mode: EXTRACT_MODE,
        heading: 'Extract it, with its answer key',
        body: 'Extract copies the questions, options and diagrams exactly. If the answers are at the end of the paper or on a separate sheet, they are matched to each question.',
        steps: ['Upload the paper as a PDF or photos.', 'Add the answer key under Answer Key (Optional) if it’s a separate file.', 'Choose Extract Questions.', 'In the review, clear anything marked orange.'],
        cta: GEN_CTA,
    },
    {
        key: 'chapter',
        icon: <BookOpen />,
        tone: '#af52de',
        title: 'A textbook chapter or notes',
        sub: 'PDF or photos of the pages',
        mode: GENERATE_MODE,
        heading: 'Generate new questions from it',
        body: 'Generate writes original questions that cover the chapter in proportion, with an answer key, a title and revision notes.',
        steps: ['Upload the chapter, or photograph its pages.', 'Pick the language and the difficulty.', 'Add instructions such as the number of questions or the marks.', 'Choose Generate New Questions.'],
        cta: GEN_CTA,
    },
    {
        key: 'dpp',
        icon: <ListChecks />,
        tone: '#ff9500',
        title: 'A DPP or worksheet',
        sub: 'Answers printed at the end',
        mode: EXTRACT_MODE,
        heading: 'Extract it; the key at the end is read too',
        body: 'A key printed on the last page is matched to its questions. Any question the key doesn’t cover is flagged rather than guessed.',
        steps: ['Upload the whole sheet, key page included.', 'Choose Extract Questions.', 'Check the Needs answer filter before saving.'],
        cta: GEN_CTA,
    },
    {
        key: 'one',
        icon: <Camera />,
        tone: '#34c759',
        title: 'One question on paper',
        sub: 'Printed or handwritten',
        mode: { label: 'Fill from photo', icon: <Camera />, tone: '#34c759' },
        heading: 'Use Fill from photo in the test builder',
        body: 'In the builder, Fill from photo reads one question from a photo, even handwriting on lined paper, and fills its text, type, options and diagram. It takes the answer only if it’s ticked or written on the paper.',
        steps: ['Open a question in the test builder.', 'Tap Fill from photo and take the picture.', 'Check the filled question and set the answer if needed.'],
        cta: { label: 'Open the test builder', href: '/create-test' },
    },
    {
        key: 'video',
        icon: <Youtube />,
        tone: '#ff3b30',
        title: 'A YouTube lecture',
        sub: 'A link to the video',
        mode: { label: 'YouTube to quiz', icon: <Youtube />, tone: '#ff3b30' },
        heading: 'Make a quiz from the video',
        body: 'Paste the lecture’s link and TestoZa writes questions from what the video covers. Useful when the lesson was a video, not a chapter.',
        steps: ['Copy the video’s link.', 'Paste it into YouTube to quiz.', 'Review the questions, then share the test.'],
        cta: { label: 'See YouTube to quiz', href: '/youtube-to-quiz' },
    },
    {
        key: 'office',
        icon: <FileText />,
        tone: '#8e8e93',
        title: 'A Word or PowerPoint file',
        sub: '.docx or .pptx',
        mode: { label: 'Save as PDF first', icon: <FileText />, tone: '#8e8e93' },
        heading: 'Save it as a PDF, then upload it',
        body: 'The generator reads PDFs and images. Exporting to PDF keeps the layout and the diagrams, and takes a few seconds.',
        steps: ['In Word or PowerPoint: File, then Save As or Export, then PDF.', 'Upload the PDF to the AI test generator.', 'Choose Extract for existing questions, Generate for content.'],
        cta: GEN_CTA,
    },
];

function MaterialPicker() {
    const [key, setKey] = useState('paper');
    const m = MATERIALS.find((x) => x.key === key) ?? MATERIALS[0];
    return (
        <div className="atg-widget">
            <Head title="What do you have?" text="Pick what’s on your desk to see which mode or tool fits it." />
            <div className="atg-pick">
                <ul className="atg-pick-list">
                    {MATERIALS.map((x) => (
                        <li key={x.key}>
                            <button type="button" aria-pressed={x.key === key} onClick={() => setKey(x.key)}>
                                <span className="atg-icon" style={{ ['--tone' as string]: x.tone }} aria-hidden="true">
                                    {x.icon}
                                </span>
                                <span>
                                    {x.title}
                                    <small>{x.sub}</small>
                                </span>
                                <ChevronRight aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="atg-pick-detail" key={m.key} aria-live="polite">
                    <span className="atg-pick-mode" style={{ ['--tone' as string]: m.mode.tone }}>
                        {m.mode.icon}
                        {m.mode.label}
                    </span>
                    <h4>{m.heading}</h4>
                    <p>{m.body}</p>
                    <ol>
                        {m.steps.map((s) => (
                            <li key={s}>{s}</li>
                        ))}
                    </ol>
                    <Link to={m.cta.href} className="atg-btn atg-btn--small">
                        {m.cta.label}
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Time saved ───────────────────────────────────────────────────────────────

const fmt = (min: number) => {
    const m = Math.round(min);
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (!h) return `${r} min`;
    return r ? `${h} h ${r} min` : `${h} h`;
};

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
    const p = ((value - min) / (max - min)) * 100;
    const id = `atg-sl-${label.replace(/\W+/g, '-').toLowerCase()}`;
    return (
        <div className="atg-slider">
            <label htmlFor={id}>
                {label}
                <b>
                    {value} {unit}
                </b>
            </label>
            <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ['--p' as string]: `${p}%` }} />
            <div className="atg-slider-scale" aria-hidden="true">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}

function TimeSaved() {
    const [perWeek, setPerWeek] = useState(60);
    const [byHand, setByHand] = useState(3);
    const manual = perWeek * byHand;
    const ai = perWeek * 0.5 + Math.ceil(perWeek / 20) * 2;
    const saved = Math.max(0, manual - ai);
    const month = saved * (52 / 12);
    const top = Math.max(manual, ai, 1);

    return (
        <div className="atg-widget">
            <Head title="Your week, by hand and with AI" text="Move the sliders to match how you work." />
            <div className="atg-time">
                <div className="atg-time-panel">
                    <Slider label="Questions you make each week" value={perWeek} min={10} max={300} step={10} unit="" onChange={setPerWeek} />
                    <Slider label="Minutes to type one question" value={byHand} min={1} max={6} step={0.5} unit="min" onChange={setByHand} />
                    <p className="atg-time-assume">
                        With AI, we count 30 seconds to review each question and 2 minutes of processing for every 20 questions. Your numbers will vary with the paper.
                    </p>
                </div>
                <div className="atg-time-panel" aria-live="polite">
                    <div className="atg-time-bars">
                        <div className="atg-time-bar">
                            <span>
                                By hand <b>{fmt(manual)}</b>
                            </span>
                            <div>
                                <i style={{ width: `${(manual / top) * 100}%` }} />
                            </div>
                        </div>
                        <div className="atg-time-bar atg-time-bar--ai">
                            <span>
                                With the AI test generator <b>{fmt(ai)}</b>
                            </span>
                            <div>
                                <i style={{ width: `${(ai / top) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="atg-time-big">
                        <small>You get back</small>
                        <b>{fmt(saved)}</b>
                        <span>every week, about {fmt(month)} a month</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Router ───────────────────────────────────────────────────────────────────

export default function AtgWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'mode-compare':
            return <ModeCompare />;
        case 'settings-lab':
            return <SettingsLab />;
        case 'review-screen':
            return <ReviewScreen />;
        case 'material-picker':
            return <MaterialPicker />;
        case 'time-saved':
            return <TimeSaved />;
        default:
            return null;
    }
}
