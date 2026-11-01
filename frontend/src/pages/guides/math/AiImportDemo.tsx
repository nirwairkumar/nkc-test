/**
 * math-ai-import: TestoZa's AI import with three maths files, forked from the Hindi
 * guide's import demo. The settings card copies AITestImporter.tsx's "AI Settings &
 * Constraints" (its Target Difficulty row; light classes only, replicas stay light); the
 * result is the review screen (components/ai-import/PreviewView.tsx) with the product's
 * own stylesheet (aiImport.css, .aix-*): the Page and Diagram chips, the cropped figure,
 * and a working Raw button that shows the LaTeX behind each question, as the product's
 * does.
 *
 * A replay: the questions are written for this page (src/guides/mathData.ts IMPORTS),
 * shown after a short processing shimmer.
 *
 * Size: wide screens put the controls (320 px) beside the review window at --mt-fit-h;
 * narrow screens show one pane at a time, switching to the result when a file is picked.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Clock, CodeXml, FileText, Image as ImageIcon, Layers, ListChecks, ScanText, Sparkles, BookOpen } from 'lucide-react';
import { IMPORTS, OPTION_KEYS, type ImportSource, type MathQuestion } from '@/guides/mathData';
import { BrowserWindow, DemoFrame, useReducedMotion, useWidth } from './replica';
import { MathText } from './tex';
import '@/components/ai-import/aiImport.css';

type Difficulty = 'Easy' | 'Moderate' | 'Tough';
const SOURCES = Object.keys(IMPORTS) as ImportSource[];

/** The file, drawn small: a worksheet, a photographed book page, a textbook chapter. */
function Thumb({ source }: { source: ImportSource }) {
    if (source === 'worksheet') {
        return (
            <span className="mt-thumb mt-thumb--page" aria-hidden="true">
                <b>Practice Sheet 3</b>
                <span>1. If α, β are the roots of x² − 7x + 12 = 0, …</span>
                <span className="mt-thumb-fig">
                    <svg viewBox="0 0 40 28">
                        <path d="M6 3 V25 H36 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    2. In △ABC, right-angled at B, …
                </span>
            </span>
        );
    }
    if (source === 'photo') {
        return (
            <span className="mt-thumb mt-thumb--photo" aria-hidden="true">
                <b>Exercise 7.9</b>
                <span>Q4. The value of ∫₀¹ x² dx is</span>
                <span>(a) 1/3 (b) 1/2 (c) 1 (d) 2/3</span>
            </span>
        );
    }
    return (
        <span className="mt-thumb mt-thumb--page" aria-hidden="true">
            <b>5.2 Arithmetic Progressions</b>
            <span>The nth term of an AP is aₙ = a + (n − 1)d.</span>
            <span>The sum of the first n terms is Sₙ = n/2 [2a + (n − 1)d].</span>
        </span>
    );
}

const SOURCE_ICON: Record<ImportSource, typeof FileText> = { worksheet: FileText, photo: ImageIcon, chapter: BookOpen };

/** PreviewView's QuestionCard, for a single-correct question. */
function ReviewCard({ q, n, page }: { q: MathQuestion; n: number; page?: number }) {
    const [raw, setRaw] = useState(false);
    return (
        <article className="aix-card aix-qc mt-rise" aria-label={`Question ${n}`}>
            <header className="aix-qc-head">
                <span className="aix-num">
                    <span className="aix-sr">Question </span>
                    {n}
                </span>
                <span className="aix-chip">Single choice</span>
                {page ? <span className="aix-chip">Page {page}</span> : null}
                {q.image ? (
                    <span className="aix-chip">
                        <ImageIcon />
                        Diagram
                    </span>
                ) : null}
                <div className="aix-qc-tools">
                    <button type="button" className={`aix-iconbtn${raw ? '' : ' mt-raw-hint'}`} aria-pressed={raw} onClick={() => setRaw((r) => !r)} title={raw ? 'Show formatted question' : 'Show the raw text and LaTeX'}>
                        <CodeXml />
                        <span>Raw</span>
                    </button>
                </div>
            </header>
            {raw ? (
                <pre className="aix-raw">{q.text}</pre>
            ) : (
                <div className="aix-qtext aix-tex">
                    <div className="latex-renderer-container font-medium text-slate-800">
                        <MathText text={q.text} plain={q.plain} />
                    </div>
                </div>
            )}
            {q.image ? (
                <figure className="aix-figure">
                    <span className="mt-figure-img">
                        <img src={q.image} alt={`Diagram for question ${n}`} loading="lazy" width={260} height={190} />
                    </span>
                    <figcaption>
                        <ImageIcon />
                        Diagram{page ? ` · page ${page}` : ''}
                    </figcaption>
                </figure>
            ) : null}
            <div className="aix-opts" role="list">
                {OPTION_KEYS.map((key) => {
                    const correct = key === q.answer;
                    return (
                        <div key={key} role="listitem" className={`aix-opt ${correct ? 'is-correct' : ''}`}>
                            <span className="aix-opt-key">{key}</span>
                            <div className="aix-opt-body">
                                {raw ? (
                                    <code style={{ fontFamily: 'var(--f-mono)', fontSize: 13 }}>{q.options?.[key]}</code>
                                ) : (
                                    <span className="aix-tex">
                                        <span className="latex-renderer-container font-medium text-slate-800">
                                            <MathText text={q.options?.[key] ?? ''} plain={q.optionsPlain?.[key]} />
                                        </span>
                                    </span>
                                )}
                            </div>
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
    );
}

export default function AiImportDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 900;
    const reduced = useReducedMotion();
    const [source, setSource] = useState<ImportSource>('worksheet');
    const [difficulty, setDifficulty] = useState<Difficulty>('Moderate');
    const [busy, setBusy] = useState(false);
    const [run, setRun] = useState(0);
    const [pane, setPane] = useState<'settings' | 'result'>('settings');
    const timer = useRef<number>();

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const rerun = () => {
        window.clearTimeout(timer.current);
        setRun((r) => r + 1);
        if (reduced) return;
        setBusy(true);
        timer.current = window.setTimeout(() => setBusy(false), 700);
    };

    const pickSource = (s: ImportSource) => {
        setSource(s);
        rerun();
        if (!wide) setPane('result');
    };

    // A replay has one set of questions, so the difficulty only changes the setting here.
    const pickDifficulty = (d: Difficulty) => setDifficulty(d);

    const restart = () => {
        setSource('worksheet');
        setDifficulty('Moderate');
        setPane('settings');
        setBusy(false);
        setRun((r) => r + 1);
    };

    const src = IMPORTS[source];
    const generated = src.mode === 'generate';

    const tip =
        source === 'worksheet' ? (
            <span key="w">Typed as LaTeX, the triangle cropped and attached. Press Raw on a question to see the code.</span>
        ) : source === 'photo' ? (
            <span key="p">A tilted phone photo: the integral and the matrix still come out typeset.</span>
        ) : (
            <span key="c">Generate writes new questions from the chapter. The difficulty setting applies here, not to Extract.</span>
        );

    const settings = (
        <div className="mt-ai-controls">
            <p className="mt-mini-label">Your file</p>
            <div className="mt-ai-sources" role="radiogroup" aria-label="Your file">
                {SOURCES.map((s) => {
                    const Icon = SOURCE_ICON[s];
                    return (
                        <button key={s} type="button" role="radio" aria-checked={source === s} className="mt-ai-source" onClick={() => pickSource(s)}>
                            <Thumb source={s} />
                            <span className="mt-ai-source-text">
                                <b>
                                    <Icon aria-hidden="true" />
                                    {IMPORTS[s].label}
                                </b>
                                <small>{IMPORTS[s].sub}</small>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-screen mt-ai-card">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Settings &amp; Constraints</p>
                        </div>
                        <span className="text-[10px] text-slate-400">Customizable</span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                            <label className="text-xs font-semibold text-slate-650">🎯 Target Difficulty</label>
                            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/50">For generating questions only</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {(['Easy', 'Moderate', 'Tough'] as const).map((lvl) => (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => pickDifficulty(lvl)}
                                    aria-pressed={difficulty === lvl}
                                    className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                                        difficulty === lvl
                                            ? lvl === 'Easy'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : lvl === 'Moderate'
                                                  ? 'bg-amber-600 text-white shadow-sm'
                                                  : 'bg-rose-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {lvl === 'Easy' ? '🟢 Easy' : lvl === 'Moderate' ? '🟡 Moderate' : '🔴 Tough'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const result = (
        <BrowserWindow url="app.testoza.com/generate-with-ai" phone={width < 560} className="mt-ai-window">
            <div className="mt-scroll">
                <div className="mt-screen aix aix-page mt-aix">
                    <div className="aix-rv">
                        <header className="aix-hero">
                            <div className="aix-eyebrow">
                                {generated ? (
                                    <span className="aix-chip aix-chip--purple">
                                        <Sparkles />
                                        Generated with AI
                                    </span>
                                ) : (
                                    <span className="aix-chip aix-chip--blue">
                                        <ScanText />
                                        Extracted from your file
                                    </span>
                                )}
                                <span>Review, then save or fine-tune in the editor.</span>
                            </div>
                            {/* The product's <h1>, as a plain element inside the guide (.mt-aix-title copies its style). */}
                            <p className="mt-aix-title">{src.title}</p>
                            <div className="aix-widgets">
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon" aria-hidden="true">
                                        <ListChecks />
                                    </span>
                                    <div>
                                        <b>{src.questions.length}</b>
                                        <span>Questions</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--green" aria-hidden="true">
                                        <CheckCircle2 />
                                    </span>
                                    <div>
                                        <b>
                                            {src.questions.length}/{src.questions.length}
                                        </b>
                                        <span>Answers set</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--indigo" aria-hidden="true">
                                        <Layers />
                                    </span>
                                    <div>
                                        <b>Single choice</b>
                                        <span>{src.questions.length} single choice</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--purple" aria-hidden="true">
                                        <Clock />
                                    </span>
                                    <div>
                                        <b>{src.seconds}</b>
                                        <span>Processing time</span>
                                    </div>
                                </div>
                            </div>
                        </header>
                        <div className="aix-qlist">
                            {src.questions.map((q, i) =>
                                busy ? (
                                    <article key={`s${i}`} className="aix-card aix-qc mt-shimmer" aria-hidden="true">
                                        <i style={{ width: '38%' }} />
                                        <i />
                                        <i style={{ width: '82%' }} />
                                        <i style={{ width: '64%' }} />
                                    </article>
                                ) : (
                                    <ReviewCard key={`${source}-${run}-${i}`} q={q} n={i + 1} page={src.page} />
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BrowserWindow>
    );

    return (
        <DemoFrame id="import-demo" title="A maths paper, imported" tip={tip} onRestart={restart} wide="lg" caption="A replay of TestoZa’s AI import with questions written for this page. The settings card and the review screen, Raw button included, are the product’s own.">
            <div ref={bodyRef} className={`mt-ai${wide ? ' is-wide' : ''}`}>
                {!wide && (
                    <div className="mt-seg mt-seg--full" style={{ ['--n' as string]: 2, ['--i' as string]: pane === 'settings' ? 0 : 1 }} role="group" aria-label="Show">
                        <button type="button" aria-pressed={pane === 'settings'} onClick={() => setPane('settings')}>
                            Your file
                        </button>
                        <button type="button" aria-pressed={pane === 'result'} onClick={() => setPane('result')}>
                            Result
                        </button>
                    </div>
                )}
                {(wide || pane === 'settings') && settings}
                {(wide || pane === 'result') && result}
            </div>
        </DemoFrame>
    );
}
