import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Info, ScanText, Sparkles, TriangleAlert } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    PipelineInfo,
    STAGE_ORDER,
    describeProgress,
    estimatePercent,
    estimateRemainingMs,
    formatClock,
    formatDuration,
    formatRemaining,
    progressSegment,
    stageKeyOf,
    stageMs,
} from './progressModel';
import type { ExtractionMeta, ProcessMode, Question, StageKey, StageTimes, StreamProgress, StreamedQuestion } from './types';
import './aiImport.css';

interface ProcessingViewProps {
    mode: ProcessMode | null;
    files: { name: string; size: number; type: 'pdf' | 'image' }[];
    progress: StreamProgress | null;
    info: PipelineInfo;
    questions: StreamedQuestion[];
    stageTimes: StageTimes;
    startedAt: number;
    /** Question count of the final result, once the stream has completed. */
    finalCount: number | null;
    extractionMeta: ExtractionMeta | null;
    onCancel: () => void;
}

const STAGE_COPY: Record<StageKey, { title: (mode: ProcessMode | null) => string; hint: string }> = {
    upload: { title: () => 'Upload', hint: 'Sending your file securely' },
    read: { title: () => 'Read pages', hint: 'Text, scanned pages and diagrams' },
    find: { title: (mode) => (mode === 'generate' ? 'Write questions' : 'Find questions'), hint: 'AI works through every page' },
    finish: { title: () => 'Final touches', hint: 'Diagrams, answers and numbering' },
};

/** Re-renders on a steady beat while active and immediately when the tab becomes visible again. */
function useNow(active: boolean, everyMs = 250) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        if (!active) return;
        const id = window.setInterval(tick, everyMs);
        document.addEventListener('visibilitychange', tick);
        window.addEventListener('focus', tick);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
            window.removeEventListener('focus', tick);
        };
    }, [active, everyMs]);
    return now;
}

const optionText = (v: unknown) => (v && typeof v === 'object' ? String((v as { text?: string }).text ?? '') : String(v ?? ''));

function isCorrect(q: Question, key: string) {
    if (!q.correctAnswer) return false;
    return Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(key) : q.correctAnswer === key;
}

const TYPE_LABEL: Record<string, string> = { single: 'Single', multiple: 'Multiple', numerical: 'Numerical' };

// ── Status card ──────────────────────────────────────────────────────────────

function LiveStatus({ mode, files, progress, info, questions, stageTimes, startedAt, finalCount, extractionMeta, onCancel }: ProcessingViewProps) {
    const complete = finalCount !== null || progress?.stage === 'complete';
    const now = useNow(!complete);
    const cardRef = useRef<HTMLElement>(null);
    const shownRef = useRef(0);
    const [cardVisible, setCardVisible] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const endAt = complete ? (stageTimes.finish?.end ?? progress?.at ?? now) : now;
    const uploadBytes = files.reduce((sum, f) => sum + f.size, 0);

    // Milestones from the backend, eased between; never moves backwards.
    let pct = progress ? estimatePercent(progressSegment(progress, info, uploadBytes), now) : 1;
    pct = complete ? 100 : Math.min(99, Math.max(shownRef.current, pct));
    shownRef.current = pct;
    const pctLabel = Math.floor(pct);

    const found = complete && finalCount !== null ? finalCount : questions.length;
    const activity = complete ? 'All done' : describeProgress(progress, info, questions.length);
    const remaining = complete ? null : formatRemaining(progress ? estimateRemainingMs(progress, info, now) : null);
    const rightCaption = complete
        ? `Finished in ${formatClock(endAt - startedAt)}`
        : remaining ?? (progress?.stage === 'finalizing' ? 'Almost done' : (info.totalSteps || info.totalBatches) ? 'Estimating time…' : '');

    const current = progress ? stageKeyOf(progress.stage) : 'upload';
    const currentIdx = current === 'done' || complete ? STAGE_ORDER.length : current ? STAGE_ORDER.indexOf(current) : 0;

    const segments = info.totalSteps ?? info.totalBatches ?? 0;
    const segDone = info.totalSteps ? Math.max(0, (info.step ?? 1) - 1) : info.batchesDone;
    const showMap = segments > 1 && segments <= 40;

    const isGenerate = mode === 'generate';
    const verb = isGenerate ? 'Generating' : 'Extracting';
    const title = complete ? 'Your questions are ready' : `${verb} questions`;
    const fileLine = [
        files.length === 1 ? files[0].name : `${files.length} files`,
        info.totalPages ? `${info.totalPages} page${info.totalPages === 1 ? '' : 's'}` : null,
    ].filter(Boolean).join(' · ');

    // The tab title carries progress, so it stays visible from another tab.
    const tabTitle = complete ? `✓ ${found} questions ready` : `${pctLabel}% · ${verb} questions`;
    useEffect(() => {
        document.title = `${tabTitle} – TestoZa`;
    }, [tabTitle]);

    useEffect(() => {
        const el = cardRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([entry]) => setCardVisible(entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const iconClass = `aix-appicon ${complete ? 'aix-appicon--done' : `${isGenerate ? 'aix-appicon--generate' : ''} aix-appicon--live`}`;
    const Icon = complete ? Check : isGenerate ? Sparkles : ScanText;
    const barClass = `aix-bar ${complete ? 'aix-bar--done' : `aix-bar--live ${isGenerate ? 'aix-bar--generate' : ''}`}`;

    return (
        <>
            <section ref={cardRef} className="aix-card aix-status" aria-labelledby="aix-status-title">
                <div className="aix-status-head">
                    <div className={iconClass} aria-hidden="true"><Icon /></div>
                    <div className="aix-status-title">
                        <h1 id="aix-status-title">{title}</h1>
                        <p title={files.map(f => f.name).join(', ')}>
                            {!complete && <span className="aix-live"><i />Live</span>}
                            <span className="aix-fileline">{fileLine}</span>
                        </p>
                    </div>
                </div>

                <div className="aix-meter">
                    <div className="aix-meter-top">
                        <div className="aix-pct" aria-hidden="true">{pctLabel}<small>%</small></div>
                        <div className="aix-clock">
                            <b>{formatClock(endAt - startedAt)}</b>
                            <span>Elapsed</span>
                        </div>
                    </div>
                    <div
                        className={barClass}
                        role="progressbar"
                        aria-label={title}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pctLabel}
                        aria-valuetext={`${pctLabel}% · ${activity}`}
                    >
                        <i style={{ width: `${pct}%` }} />
                    </div>
                    <div className="aix-meter-caption" aria-live="polite">
                        <span>{activity}</span>
                        <span>{rightCaption}</span>
                    </div>

                    {showMap && (
                        <div className={`aix-map ${isGenerate ? 'aix-map--generate' : ''}`}>
                            <div className="aix-map-label">
                                <span>{info.totalSteps ? 'Document progress' : 'Page batches'}</span>
                                <b>
                                    {complete
                                        ? `${segments} of ${segments}`
                                        : info.totalSteps
                                            ? `Step ${Math.min(info.step ?? 1, segments)} of ${segments}`
                                            : `${segDone} of ${segments} done`}
                                </b>
                            </div>
                            <div className="aix-map-track" aria-hidden="true">
                                {Array.from({ length: segments }, (_, i) => (
                                    <span
                                        key={i}
                                        className={complete || i < segDone ? 'is-done' : (info.totalSteps && i === segDone) ? 'is-active' : ''}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="aix-stats">
                    <div className="aix-stat">
                        <b>{found}</b>
                        <span>{found === 1 ? 'Question' : 'Questions'}</span>
                    </div>
                    <div className="aix-stat">
                        <b>{info.totalPages ?? '—'}</b>
                        <span>Pages</span>
                    </div>
                    {info.totalSteps ? (
                        <div className="aix-stat">
                            <b>{complete ? info.totalSteps : Math.min(info.step ?? 1, info.totalSteps)}/{info.totalSteps}</b>
                            <span>Steps</span>
                        </div>
                    ) : info.totalBatches ? (
                        <div className="aix-stat">
                            <b>{complete ? info.totalBatches : info.batchesDone}/{info.totalBatches}</b>
                            <span>Batches</span>
                        </div>
                    ) : null}
                </div>

                <ol className="aix-stages">
                    {STAGE_ORDER.map((key, idx) => {
                        const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending';
                        const ms = stageMs(stageTimes, key, endAt);
                        return (
                            <li key={key} className={`aix-stage is-${state}`}>
                                <span className="aix-stage-icon" aria-hidden="true">
                                    {state === 'done' ? <Check /> : state === 'active' ? <span className="aix-spin" /> : idx + 1}
                                </span>
                                <span className="aix-stage-text">
                                    <b>{STAGE_COPY[key].title(mode)}</b>
                                    <span>{state === 'active' ? activity : STAGE_COPY[key].hint}</span>
                                </span>
                                <span className="aix-stage-time">
                                    {ms > 0 ? formatDuration(ms) : ''}
                                    <span className="aix-sr">{state === 'done' ? ', done' : state === 'active' ? ', in progress' : ', waiting'}</span>
                                </span>
                            </li>
                        );
                    })}
                </ol>

                {extractionMeta?.quality_tier && (
                    <div className="aix-meta">
                        <span className="aix-chip">Scan quality · {extractionMeta.quality_tier}</span>
                        {extractionMeta.dpi ? <span className="aix-chip">{extractionMeta.dpi} DPI</span> : null}
                    </div>
                )}
                {extractionMeta?.warning && (
                    <p className="aix-note aix-note--warn">
                        <TriangleAlert />
                        <span>The scan resolution is low, so a few questions may need a quick check.</span>
                    </p>
                )}

                {!complete && (
                    <>
                        <p className="aix-note">
                            <Info />
                            <span>You can switch to another tab or window. Processing keeps running, and the tab title shows the progress.</span>
                        </p>
                        <button type="button" className="aix-btn aix-btn--danger" onClick={() => setConfirmOpen(true)}>
                            Stop processing
                        </button>
                    </>
                )}
            </section>

            {!cardVisible && (
                <div className="aix-mini" role="status">
                    <div className={iconClass} aria-hidden="true"><Icon /></div>
                    <div className="aix-mini-text">
                        <b>{complete ? title : `${found} question${found === 1 ? '' : 's'} so far`}</b>
                        <span>{activity}</span>
                    </div>
                    <div className="aix-mini-pct">{pctLabel}%</div>
                    <div className={barClass} aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                </div>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="rounded-[22px] max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Stop processing?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {questions.length > 0
                                ? `The ${questions.length} question${questions.length === 1 ? '' : 's'} found so far won't be kept. You can start again with the same file.`
                                : "Nothing has been saved yet. You can start again with the same file."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Keep going</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={onCancel}>
                            Stop
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// ── Live feed ────────────────────────────────────────────────────────────────

const FeedCard = memo(function FeedCard({ q, n }: { q: Question; n: number }) {
    const options = q.type !== 'numerical' && q.options ? Object.entries(q.options) : [];
    return (
        <article className="aix-card aix-fq" aria-label={`Question ${n}`}>
            <div className="aix-fq-head">
                <span className="aix-num" aria-hidden="true">{n}</span>
                <span className="aix-chip">{TYPE_LABEL[q.type] ?? 'Single'}</span>
                {q.page ? <span className="aix-chip">Page {q.page}</span> : null}
            </div>
            <div className="aix-fq-text aix-tex">
                <LatexRenderer>{q.question || ''}</LatexRenderer>
            </div>
            {options.length > 0 && (
                <div className="aix-fq-opts">
                    {options.map(([key, value]) => (
                        <div key={key} className={`aix-fq-opt ${isCorrect(q, key) ? 'is-correct' : ''}`}>
                            <b>{key}</b>
                            <div className="aix-tex"><LatexRenderer>{optionText(value)}</LatexRenderer></div>
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
});

function Throbber({ n, activity, generate, ghost = false }: { n: number; activity?: string; generate: boolean; ghost?: boolean }) {
    return (
        <div
            className={`aix-card aix-skel ${generate ? 'aix-skel--generate' : ''} ${ghost ? 'aix-skel--ghost' : ''}`}
            style={ghost ? { opacity: n % 2 ? 0.55 : 0.3 } : undefined}
            aria-hidden={ghost || undefined}
            role={ghost ? undefined : 'status'}
        >
            <span className="aix-skel-bar" />
            <div className="aix-fq-head">
                <span className="aix-num">{ghost ? '' : n}</span>
                <span className="aix-sk" style={{ width: 64, height: 24, borderRadius: 999 }} />
            </div>
            <div className="aix-skel-lines">
                <span className="aix-sk" style={{ width: '92%' }} />
                <span className="aix-sk" style={{ width: '78%' }} />
                <span className="aix-sk" style={{ width: '46%' }} />
            </div>
            <div className="aix-skel-opts">
                <span className="aix-sk" />
                <span className="aix-sk" />
                <span className="aix-sk" />
                <span className="aix-sk" />
            </div>
            {!ghost && (
                <div className="aix-skel-caption">
                    <span className="aix-spin" />
                    <span>
                        <b>{n === 1 ? 'Waiting for the first question' : `Question ${n} is on its way`}</b>
                        {activity ? ` · ${activity}` : ''}
                    </span>
                </div>
            )}
        </div>
    );
}

interface LiveFeedProps {
    questions: StreamedQuestion[];
    complete: boolean;
    finalCount: number | null;
    activity: string;
    generate: boolean;
}

const LiveFeed = memo(function LiveFeed({ questions, complete, finalCount, activity, generate }: LiveFeedProps) {
    const endRef = useRef<HTMLDivElement>(null);
    const followRef = useRef(true);
    const autoScrollUntil = useRef(0);
    const seen = useRef(questions.length);
    const [unseen, setUnseen] = useState(0);

    // Follow the newest question only while the reader is at the end of the list.
    useEffect(() => {
        const check = () => {
            if (Date.now() < autoScrollUntil.current || !endRef.current) return;
            const following = endRef.current.getBoundingClientRect().bottom <= window.innerHeight + 140;
            followRef.current = following;
            if (following) setUnseen(0);
        };
        check();
        window.addEventListener('scroll', check, { passive: true });
        return () => window.removeEventListener('scroll', check);
    }, []);

    useLayoutEffect(() => {
        const added = questions.length - seen.current;
        seen.current = questions.length;
        if (added <= 0) return;
        if (followRef.current) {
            autoScrollUntil.current = Date.now() + 800;
            endRef.current?.scrollIntoView({ block: 'end', behavior: document.hidden ? 'auto' : 'smooth' });
        } else {
            setUnseen(n => n + added);
        }
    }, [questions.length]);

    useLayoutEffect(() => {
        if (complete && followRef.current) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, [complete]);

    const jumpToEnd = () => {
        followRef.current = true;
        autoScrollUntil.current = Date.now() + 800;
        setUnseen(0);
        endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    };

    const next = questions.length + 1;

    return (
        <section className="aix-feed" aria-labelledby="aix-feed-title">
            <div className="aix-feed-head">
                <h2 id="aix-feed-title">
                    Questions <span className="aix-count" aria-label={`${questions.length} so far`}>{questions.length}</span>
                </h2>
                <span className="aix-feed-status">
                    {complete ? <><Check size={15} style={{ color: 'var(--green)' }} /> Complete</> : <><i /> Arriving live</>}
                </span>
            </div>

            <div className="aix-feed-list">
                {questions.map((sq, idx) => <FeedCard key={sq.key} q={sq.question} n={idx + 1} />)}

                <div ref={endRef} style={{ scrollMarginBottom: 24 }}>
                    {complete ? (
                        <div className="aix-done" role="status">
                            <span className="aix-done-seal"><Check /></span>
                            <div>
                                <b>{finalCount ?? questions.length} questions ready</b>
                                <span>Opening your review…</span>
                            </div>
                        </div>
                    ) : (
                        <Throbber n={next} activity={activity} generate={generate} />
                    )}
                </div>

                {!complete && questions.length === 0 && (
                    <>
                        <Throbber n={1} generate={generate} ghost />
                        <Throbber n={2} generate={generate} ghost />
                    </>
                )}
            </div>

            {unseen > 0 && !complete && (
                <button type="button" className="aix-newpill" onClick={jumpToEnd}>
                    <ArrowDown /> {unseen} new question{unseen === 1 ? '' : 's'}
                </button>
            )}
        </section>
    );
});

export default function ProcessingView(props: ProcessingViewProps) {
    // Start at the top: the settings step is usually scrolled down to its buttons.
    // A layout effect, so it lands before the feed decides whether to auto-follow.
    useLayoutEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const complete = props.finalCount !== null || props.progress?.stage === 'complete';
    const activity = describeProgress(props.progress, props.info, props.questions.length);
    return (
        <div className="aix aix-page">
            <div className="aix-proc">
                <LiveStatus {...props} />
                <LiveFeed
                    questions={props.questions}
                    complete={complete}
                    finalCount={props.finalCount}
                    activity={activity}
                    generate={props.mode === 'generate'}
                />
            </div>
        </div>
    );
}
