import React, { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    BookOpen,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    CodeXml,
    Download,
    FileSearch,
    Grid3x3,
    ImageIcon,
    Layers,
    ListChecks,
    Loader2,
    MoreHorizontal,
    PenLine,
    Plus,
    RotateCcw,
    Scale,
    ScanText,
    Search,
    Sparkles,
    TriangleAlert,
    X,
} from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDuration } from './progressModel';
import type { ExtractionMeta, MarkingSummary, ParseResponse, ProcessMode, Question } from './types';
import './aiImport.css';

interface PreviewViewProps {
    data: ParseResponse;
    mode: ProcessMode | null;
    extractionMeta: ExtractionMeta | null;
    /** Seconds the run took, when known. */
    durationSeconds?: number;
    saving: boolean;
    canGenerateMore: boolean;
    generatingMore: boolean;
    onTryAgain: () => void;
    onEdit: () => void;
    onSave: () => void;
    onGenerateMore: () => void;
    /** Re-run the same file in generate mode (offered when extraction finds nothing). */
    onGenerateInstead: () => void;
    onDownloadJSON: () => void;
}

type Filter = 'all' | 'missing' | 'diagram';

const optionValue = (v: unknown) => (v && typeof v === 'object' ? String((v as { text?: string }).text ?? '') : String(v ?? ''));
const optionImage = (q: Question, key: string, v: unknown) =>
    q.optionImages?.[key] || (v && typeof v === 'object' ? (v as { image?: string | null }).image : null) || null;

function hasAnswer(q: Question) {
    const a = q.correctAnswer;
    if (a === null || a === undefined || a === '') return false;
    if (Array.isArray(a)) return a.length > 0;
    return true;
}

function isCorrect(q: Question, key: string) {
    if (!q.correctAnswer) return false;
    return q.type === 'multiple' && Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(key) : q.correctAnswer === key;
}

function numericAnswer(q: Question) {
    const a = q.correctAnswer;
    if (a && typeof a === 'object' && !Array.isArray(a)) {
        const r = a as { min: number; max: number };
        return r.min === r.max ? String(r.min) : `${r.min} – ${r.max}`;
    }
    return String(a ?? '');
}

const hasDiagram = (q: Question) =>
    !!q.image || (!!q.options && Object.entries(q.options).some(([k, v]) => !!optionImage(q, k, v)));

const TYPE_META: Record<string, { label: string; plural: string }> = {
    single: { label: 'Single choice', plural: 'single choice' },
    multiple: { label: 'Multiple correct', plural: 'multiple correct' },
    numerical: { label: 'Numerical', plural: 'numerical' },
};
const typeOf = (q: Question) => (q.type === 'multiple' || q.type === 'numerical' ? q.type : 'single');

// ── Question card ────────────────────────────────────────────────────────────

const QuestionCard = memo(function QuestionCard({ q, n, onZoom }: { q: Question; n: number; onZoom: (src: string, alt: string) => void }) {
    const [raw, setRaw] = useState(false);
    const answered = hasAnswer(q);
    const type = typeOf(q);
    const options = type !== 'numerical' && q.options ? Object.entries(q.options) : [];

    return (
        <article id={`aix-q-${n}`} className="aix-card aix-qc" aria-labelledby={`aix-q-${n}-label`}>
            <header className="aix-qc-head">
                <span id={`aix-q-${n}-label`} className={`aix-num ${answered ? '' : 'is-warn'}`}>
                    <span className="aix-sr">Question </span>{n}
                </span>
                <span className="aix-chip">{TYPE_META[type].label}</span>
                {q.page ? <span className="aix-chip">Page {q.page}</span> : null}
                {q.image ? <span className="aix-chip"><ImageIcon />Diagram</span> : null}
                <div className="aix-qc-tools">
                    <button
                        type="button"
                        className="aix-iconbtn"
                        aria-pressed={raw}
                        onClick={() => setRaw(r => !r)}
                        title={raw ? 'Show formatted question' : 'Show the raw text and LaTeX'}
                    >
                        <CodeXml />
                        <span>Raw</span>
                    </button>
                </div>
            </header>

            {q.passageContent ? (
                <details className="aix-passage">
                    <summary>
                        <BookOpen />
                        Passage
                        <ChevronDown className="aix-chev" />
                    </summary>
                    <div className="aix-passage-body aix-tex">
                        {raw ? <pre className="aix-raw">{q.passageContent}</pre> : <LatexRenderer>{q.passageContent}</LatexRenderer>}
                    </div>
                </details>
            ) : null}

            {raw ? (
                <pre className="aix-raw">{q.question || ''}</pre>
            ) : (
                <div className="aix-qtext aix-tex">
                    {q.question ? <LatexRenderer>{q.question}</LatexRenderer> : <span className="aix-opt-empty">No question text</span>}
                </div>
            )}

            {q.image ? (
                <figure className="aix-figure">
                    <button type="button" onClick={() => onZoom(q.image!, `Diagram for question ${n}`)} aria-label={`Enlarge diagram for question ${n}`}>
                        <img src={q.image} alt={`Diagram for question ${n}`} loading="lazy" />
                    </button>
                    <figcaption><ImageIcon />Diagram{q.diagramPage ? ` · page ${q.diagramPage}` : ''}</figcaption>
                </figure>
            ) : null}

            {options.length > 0 && (
                <div className="aix-opts" role="list">
                    {options.map(([key, value]) => {
                        const correct = isCorrect(q, key);
                        const text = optionValue(value);
                        const img = optionImage(q, key, value);
                        return (
                            <div key={key} role="listitem" className={`aix-opt ${correct ? 'is-correct' : ''}`}>
                                <span className={`aix-opt-key ${type === 'multiple' ? 'aix-opt-key--box' : ''}`}>{key}</span>
                                <div className="aix-opt-body">
                                    {raw ? (
                                        <code style={{ fontFamily: 'var(--f-mono)', fontSize: 13 }}>{text}</code>
                                    ) : text ? (
                                        <span className="aix-tex"><LatexRenderer>{text}</LatexRenderer></span>
                                    ) : (
                                        !img && <span className="aix-opt-empty">Empty option</span>
                                    )}
                                    {img ? <img src={img} alt={`Option ${key}`} loading="lazy" /> : null}
                                </div>
                                {correct && (
                                    <span className="aix-opt-seal"><Check /><span className="aix-sr">Correct answer</span></span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {type === 'numerical' && answered && (
                <div className="aix-answer">
                    Answer <b>{numericAnswer(q)}</b>
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
});

// ── Jump grid (rail on wide screens, sheet on narrow) ─────────────────────────

function JumpGrid({ questions, current, onJump }: { questions: Question[]; current: number; onJump: (n: number) => void }) {
    return (
        <>
            <div className="aix-jumpgrid">
                {questions.map((q, i) => {
                    const n = i + 1;
                    const warn = !hasAnswer(q);
                    return (
                        <button
                            key={n}
                            type="button"
                            className={`aix-jump ${warn ? 'is-warn' : ''} ${current === n ? 'is-current' : ''}`}
                            onClick={() => onJump(n)}
                            aria-label={`Question ${n}${warn ? ', needs an answer' : ''}`}
                            aria-current={current === n ? 'true' : undefined}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>
            <div className="aix-legend" aria-hidden="true">
                <span><i className="is-current" />Viewing</span>
                <span><i className="is-warn" />Needs answer</span>
            </div>
        </>
    );
}

// ── Marking line ─────────────────────────────────────────────────────────────

const fmtMark = (v: number | string) => String(v);

/**
 * What every question is worth, and why — so the teacher sees the marking before they
 * save rather than discovering it as a negative score after they've shared the test.
 */
function MarkingLine({ marking }: { marking: MarkingSummary }) {
    const { marks, negativeMarks, marks_source, negative_source, varies } = marking;

    let scheme: string;
    if (varies || marks === null || negativeMarks === null) {
        scheme = 'Marks differ between sections or questions';
    } else {
        const penalty = Number(negativeMarks) === 0 ? 'no negative marking' : `−${fmtMark(negativeMarks)} for a wrong answer`;
        scheme = `+${fmtMark(marks)} per question, ${penalty}`;
    }

    const sources = new Set([marks_source, negative_source]);
    let why: string;
    if (sources.size === 1 && sources.has('teacher')) why = 'as you set it';
    else if (sources.size === 1 && sources.has('paper')) why = 'read from your paper';
    else if (sources.size === 1 && sources.has('default')) why = "your paper didn't state marks, so we used the default";
    else {
        const part = (s: string) => (s === 'teacher' ? 'set by you' : s === 'paper' ? 'read from your paper' : 'default');
        why = `marks ${part(marks_source)}, penalty ${part(negative_source)}`;
    }

    return (
        <p className="aix-marking" role="note">
            <Scale aria-hidden="true" />
            <span>
                <b>{scheme}</b> — {why}. You can change it in the editor.
            </span>
        </p>
    );
}

// ── Review screen ────────────────────────────────────────────────────────────

export default function PreviewView({
    data,
    mode,
    extractionMeta,
    durationSeconds,
    saving,
    canGenerateMore,
    generatingMore,
    onTryAgain,
    onEdit,
    onSave,
    onGenerateMore,
    onGenerateInstead,
    onDownloadJSON,
}: PreviewViewProps) {
    const questions = useMemo(() => data.questions || [], [data.questions]);
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [current, setCurrent] = useState(1);
    const [pendingJump, setPendingJump] = useState<number | null>(null);
    const [jumpOpen, setJumpOpen] = useState(false);
    const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
    const [descOpen, setDescOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Arriving from the live feed, the window is scrolled to its end.
    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const missing = useMemo(() => questions.filter(q => !hasAnswer(q)).length, [questions]);
    const diagrams = useMemo(() => questions.filter(hasDiagram).length, [questions]);
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        questions.forEach(q => { counts[typeOf(q)] = (counts[typeOf(q)] || 0) + 1; });
        return counts;
    }, [questions]);

    const haystack = useMemo(
        () => questions.map(q => [q.question, q.passageContent, ...(q.options ? Object.values(q.options).map(optionValue) : [])].join(' ').toLowerCase()),
        [questions],
    );

    const visible = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();
        return questions
            .map((q, i) => ({ q, n: i + 1 }))
            .filter(({ q, n }) => {
                if (filter === 'missing' && hasAnswer(q)) return false;
                if (filter === 'diagram' && !hasDiagram(q)) return false;
                return !needle || haystack[n - 1].includes(needle);
            });
    }, [questions, filter, deferredQuery, haystack]);

    // Keep "viewing" in sync with the card nearest the top of the screen.
    useEffect(() => {
        const root = listRef.current;
        if (!root || typeof IntersectionObserver === 'undefined') return;
        const inView = new Map<number, boolean>();
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => inView.set(Number((e.target as HTMLElement).dataset.n), e.isIntersecting));
            const first = [...inView.entries()].filter(([, v]) => v).map(([k]) => k).sort((a, b) => a - b)[0];
            if (first) setCurrent(first);
        }, { rootMargin: '-140px 0px -50% 0px' });
        root.querySelectorAll<HTMLElement>('[data-n]').forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [visible]);

    const scrollToQuestion = (n: number) => {
        document.getElementById(`aix-q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrent(n);
    };

    const jumpTo = (n: number) => {
        setJumpOpen(false);
        if (!visible.some(v => v.n === n)) {
            setFilter('all');
            setQuery('');
            setPendingJump(n);
            return;
        }
        // Let the sheet close before scrolling so focus restoration doesn't fight it.
        window.setTimeout(() => scrollToQuestion(n), jumpOpen ? 220 : 0);
    };

    useEffect(() => {
        if (pendingJump === null) return;
        const id = window.setTimeout(() => {
            scrollToQuestion(pendingJump);
            setPendingJump(null);
        }, 60);
        return () => window.clearTimeout(id);
    }, [pendingJump, visible]);

    const showMissing = () => {
        setFilter('missing');
        setQuery('');
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const onZoom = useMemo(() => (src: string, alt: string) => setZoom({ src, alt }), []);

    if (questions.length === 0) {
        return (
            <div className="aix aix-page">
                <div className="aix-center">
                    <div className="aix-card">
                        <div className="aix-appicon" aria-hidden="true"><FileSearch /></div>
                        <h2>No questions found</h2>
                        <p>We couldn't find any questions in this file. Try a clearer scan, or let AI write new questions from it.</p>
                        <div className="aix-actions">
                            {mode === 'extract' && canGenerateMore && (
                                <button type="button" className="aix-btn aix-btn--filled" onClick={onGenerateInstead}>
                                    <Sparkles /> Generate questions instead
                                </button>
                            )}
                            <button type="button" className="aix-btn aix-btn--gray" onClick={onTryAgain}>
                                <RotateCcw /> Try again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const generated = mode === 'generate';
    const answered = questions.length - missing;
    const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const description = (data.description || '').trim();
    const longDesc = description.length > 180;

    return (
        <div className="aix aix-page">
            <div className="aix-rv">
                <header className="aix-hero">
                    <div className="aix-eyebrow">
                        {generated
                            ? <span className="aix-chip aix-chip--purple"><Sparkles />Generated with AI</span>
                            : <span className="aix-chip aix-chip--blue"><ScanText />Extracted from your file</span>}
                        {extractionMeta?.quality_tier && (
                            <span className={`aix-chip ${extractionMeta.warning ? 'aix-chip--orange' : ''}`}>
                                {extractionMeta.dpi ? `${extractionMeta.dpi} DPI · ` : ''}{extractionMeta.quality_tier} scan
                            </span>
                        )}
                        <span>Review, then save or fine-tune in the editor.</span>
                    </div>
                    <h1>{data.title?.trim() || (generated ? 'Generated questions' : 'Extracted questions')}</h1>
                    {description && (
                        <>
                            <p className={`aix-hero-desc ${longDesc && !descOpen ? 'is-clamped' : ''}`}>{description}</p>
                            {longDesc && (
                                <button type="button" className="aix-more-link" onClick={() => setDescOpen(o => !o)} aria-expanded={descOpen}>
                                    {descOpen ? 'Less' : 'More'}
                                </button>
                            )}
                        </>
                    )}

                    <div className="aix-widgets">
                        <div className="aix-card aix-widget">
                            <span className="aix-widget-icon" aria-hidden="true"><ListChecks /></span>
                            <div><b>{questions.length}</b><span>Questions</span></div>
                        </div>
                        {missing > 0 ? (
                            <button type="button" className="aix-card aix-widget" onClick={showMissing} aria-label={`Show the ${missing} question${missing === 1 ? '' : 's'} that need an answer`}>
                                <span className="aix-widget-icon aix-widget-icon--orange" aria-hidden="true"><TriangleAlert /></span>
                                <div><b>{missing}</b><span>Need an answer</span></div>
                                <ChevronRight className="aix-widget-chev" aria-hidden="true" />
                            </button>
                        ) : (
                            <div className="aix-card aix-widget">
                                <span className="aix-widget-icon aix-widget-icon--green" aria-hidden="true"><CheckCircle2 /></span>
                                <div><b>{answered}/{questions.length}</b><span>Answers set</span></div>
                            </div>
                        )}
                        <div className="aix-card aix-widget">
                            <span className="aix-widget-icon aix-widget-icon--indigo" aria-hidden="true"><Layers /></span>
                            <div>
                                <b>{typeEntries.length === 1 ? TYPE_META[typeEntries[0][0]].label : `${typeEntries.length} types`}</b>
                                <span>{typeEntries.map(([t, c]) => `${c} ${TYPE_META[t].plural}`).join(' · ')}</span>
                            </div>
                        </div>
                        {durationSeconds ? (
                            <div className="aix-card aix-widget">
                                <span className="aix-widget-icon aix-widget-icon--purple" aria-hidden="true"><Clock /></span>
                                <div><b>{formatDuration(durationSeconds * 1000)}</b><span>Processing time</span></div>
                            </div>
                        ) : (
                            <div className="aix-card aix-widget">
                                <span className="aix-widget-icon aix-widget-icon--purple" aria-hidden="true"><ImageIcon /></span>
                                <div><b>{diagrams}</b><span>With diagrams</span></div>
                            </div>
                        )}
                    </div>

                    {data.marking && <MarkingLine marking={data.marking} />}
                </header>

                <div className="aix-rv-grid">
                    <main ref={listRef} style={{ minWidth: 0, scrollMarginTop: 80 }}>
                        <div className="aix-toolbar" role="toolbar" aria-label="Filter questions">
                            <div className="aix-seg" role="group" aria-label="Show">
                                <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                                    All <em>{questions.length}</em>
                                </button>
                                {missing > 0 && (
                                    <button type="button" className="is-warn" aria-pressed={filter === 'missing'} onClick={() => setFilter('missing')}>
                                        Needs answer <em>{missing}</em>
                                    </button>
                                )}
                                {diagrams > 0 && (
                                    <button type="button" aria-pressed={filter === 'diagram'} onClick={() => setFilter('diagram')}>
                                        Diagrams <em>{diagrams}</em>
                                    </button>
                                )}
                            </div>
                            <label className="aix-search">
                                <Search aria-hidden="true" />
                                <span className="aix-sr">Search questions</span>
                                <input
                                    type="search"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search questions"
                                    enterKeyHint="search"
                                />
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
                                <p><b>{missing} question{missing === 1 ? '' : 's'}</b> {missing === 1 ? 'has' : 'have'} no correct answer yet. Set {missing === 1 ? 'it' : 'them'} in the editor before students take the test.</p>
                                <button type="button" className="aix-btn aix-btn--plain" style={{ height: 34 }} onClick={showMissing}>Show</button>
                            </div>
                        )}

                        <div className="aix-qlist">
                            {visible.map(({ q, n }) => (
                                <div key={n} data-n={n}>
                                    <QuestionCard q={q} n={n} onZoom={onZoom} />
                                </div>
                            ))}
                            {visible.length === 0 && (
                                <div className="aix-card aix-empty">
                                    <Search />
                                    <b>No matching questions</b>
                                    Try a different word, or show all questions.
                                    <div style={{ marginTop: 14 }}>
                                        <button type="button" className="aix-btn aix-btn--tinted" onClick={() => { setQuery(''); setFilter('all'); }}>
                                            Show all {questions.length}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {canGenerateMore && filter === 'all' && !query && (
                            <div className="aix-card aix-morecard" style={{ marginTop: 14 }}>
                                <span className="aix-widget-icon aix-widget-icon--purple" aria-hidden="true"><Sparkles /></span>
                                <div>
                                    <b>Need more questions?</b>
                                    <span>AI will read the rest of your document and add new ones.</span>
                                </div>
                                <button type="button" className="aix-btn aix-btn--tinted" onClick={onGenerateMore} disabled={generatingMore}>
                                    {generatingMore ? <Loader2 className="animate-spin" /> : <Plus />}
                                    {generatingMore ? 'Generating…' : 'Generate more'}
                                </button>
                            </div>
                        )}

                        {visible.length > 0 && (
                            <p className="aix-endnote">
                                {visible.length === questions.length
                                    ? `That's all ${questions.length} questions.`
                                    : `Showing ${visible.length} of ${questions.length} questions.`}
                            </p>
                        )}
                    </main>

                    <aside className="aix-card aix-rail" aria-label="Jump to a question">
                        <h2>Jump to</h2>
                        <p>{missing > 0 ? `${missing} marked orange need an answer` : 'Every question has an answer'}</p>
                        <JumpGrid questions={questions} current={current} onJump={jumpTo} />
                    </aside>
                </div>

                <div className="aix-actionbar">
                    <div className="aix-actionbar-in">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button type="button" className="aix-btn aix-btn--gray aix-btn--icon aix-only-narrow" aria-label="More actions">
                                    <MoreHorizontal />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="top" className="rounded-xl">
                                <DropdownMenuItem onClick={() => setJumpOpen(true)} className="gap-2"><Grid3x3 className="w-4 h-4" />Jump to question</DropdownMenuItem>
                                <DropdownMenuItem onClick={onTryAgain} className="gap-2"><RotateCcw className="w-4 h-4" />Try again</DropdownMenuItem>
                                <DropdownMenuItem onClick={onDownloadJSON} className="gap-2"><Download className="w-4 h-4" />Download JSON</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <button type="button" className="aix-btn aix-btn--gray aix-only-wide" onClick={onTryAgain} title="Go back and process the file again">
                            <RotateCcw /> Try again
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button type="button" className="aix-btn aix-btn--gray aix-btn--icon aix-only-wide" aria-label="More actions">
                                    <MoreHorizontal />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="top" className="rounded-xl">
                                <DropdownMenuItem onClick={onDownloadJSON} className="gap-2"><Download className="w-4 h-4" />Download JSON</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="aix-actionbar-sum" aria-live="polite">
                            <b>{questions.length} questions</b>
                            {missing > 0
                                ? <span className="is-warn">{missing} still need an answer</span>
                                : <span className="is-ok">Every answer is set</span>}
                        </div>
                        <span className="aix-grow" />

                        <button type="button" className="aix-btn aix-btn--tinted" onClick={onEdit}>
                            <PenLine /> Edit
                        </button>
                        <button type="button" className="aix-btn aix-btn--filled" onClick={onSave} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin" /> : <Check />}
                            {saving ? 'Saving…' : 'Save & continue'}
                        </button>
                    </div>
                </div>
            </div>

            <Sheet open={jumpOpen} onOpenChange={setJumpOpen}>
                <SheetContent side="bottom" className="aix rounded-t-[24px] max-h-[75vh] overflow-y-auto">
                    <SheetHeader className="text-left">
                        <SheetTitle>Jump to a question</SheetTitle>
                        <SheetDescription>
                            {missing > 0 ? `${missing} marked orange need an answer.` : 'Every question has an answer.'}
                        </SheetDescription>
                    </SheetHeader>
                    <div style={{ marginTop: 16 }}>
                        <JumpGrid questions={questions} current={current} onJump={jumpTo} />
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={!!zoom} onOpenChange={open => !open && setZoom(null)}>
                <DialogContent className="aix max-w-3xl p-3 rounded-[22px]">
                    <DialogTitle className="aix-sr">{zoom?.alt}</DialogTitle>
                    {zoom && (
                        <div className="aix-lightbox">
                            <img src={zoom.src} alt={zoom.alt} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
