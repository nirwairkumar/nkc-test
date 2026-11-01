/**
 * Hero of testoza.com/ai-test-generator: an iPhone running the real AI test
 * generator. Three scenes, each a faithful copy of the product's screen:
 *
 *   1. Settings  — AITestImporter step 2 (file card, AI Settings & Constraints,
 *                  Extract / Generate cards). English + Hindi, Moderate and an
 *                  instruction are chosen, then Generate is tapped.
 *   2. Live      — ProcessingView: status card (percent, clock, document map,
 *                  stages) and the live question feed; the compact live bar drops
 *                  in once the status card scrolls away.
 *   3. Review    — PreviewView: summary widgets, toolbar, question cards and the
 *                  action bar; Save & continue shows the real success toast.
 *
 * The .aix-* markup and classes are the product's own (aiImport.css), so the
 * phone shows exactly what a teacher sees. One clock drives everything (a pure
 * function of time per scene), it pauses off screen, and reduced motion gets a
 * still frame with manual scene buttons.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
    ArrowLeft,
    Bell,
    Check,
    CheckCircle2,
    ClipboardList,
    Clock,
    CodeXml,
    FileText,
    Grid3x3,
    Info,
    Key,
    Layers,
    ListChecks,
    Loader2,
    Lock,
    Menu,
    MoreHorizontal,
    PenLine,
    Plus,
    Search,
    Sparkles,
    X,
    Zap,
} from 'lucide-react';
import { GENERATED_BILINGUAL, TYPE_LONG, TYPE_SHORT, isCorrectKey, type DemoQuestion } from './atgData';
import '@/components/ai-import/aiImport.css';

const SCENES = [
    { key: 'settings', dur: 7600, title: 'Choose the language, difficulty and mode' },
    { key: 'live', dur: 10200, title: 'Questions arrive while the AI reads' },
    { key: 'review', dur: 7000, title: 'Review, then save in one tap' },
] as const;
type SceneIdx = 0 | 1 | 2;

/** Still frames for reduced motion. */
const REST_T = [5900, 6400, 0];
const TICK = 100;
/** The live scene runs 8× faster than a real run (so 8.3 s on screen reads "1:06"). */
const SPEED = 8;
const INSTRUCTION = '20 questions. 4 marks each, −1 for a wrong answer.';
const FILE_NAME = 'Physics_Ch9_Force_and_Laws.pdf';

// ── Small helpers ────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (t: number, t0: number, t1: number, v0: number, v1: number) => v0 + (v1 - v0) * clamp((t - t0) / (t1 - t0), 0, 1);
const clock = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const duration = (ms: number) => {
    const s = ms / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`;
};

function usePrefersReducedMotion() {
    const [reduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    return reduced;
}

// ── Phone chrome ─────────────────────────────────────────────────────────────

function StatusBar() {
    return (
        <div className="atg-statusbar">
            <span>9:41</span>
            <span className="atg-island" />
            <span className="atg-status-icons">
                <svg width="18" height="12" viewBox="0 0 18 12">
                    <rect x="0" y="8" width="3" height="4" rx="1" />
                    <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                    <rect x="10" y="3" width="3" height="9" rx="1" />
                    <rect x="15" y="0" width="3" height="12" rx="1" />
                </svg>
                <svg width="16" height="12" viewBox="0 0 16 12">
                    <path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .8 10.4 10.4 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.6c1.3 0 2.6.5 3.5 1.4l1.3-1.3A6.7 6.7 0 0 0 8 4.4c-1.8 0-3.5.7-4.8 1.9l1.3 1.3c.9-.9 2.2-1.4 3.5-1.4Zm0 3.6c.4 0 .9.2 1.2.5L8 11.5 6.8 10.3c.3-.3.8-.5 1.2-.5Z" />
                </svg>
                <svg width="27" height="13" viewBox="0 0 27 13">
                    <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" />
                    <rect x="2" y="2" width="18" height="9" rx="2" />
                    <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fillOpacity="0.45" />
                </svg>
            </span>
        </div>
    );
}

function AppChrome() {
    return (
        <>
            <StatusBar />
            <div className="atg-urlbar">
                <div>
                    <Lock aria-hidden="true" />
                    app.testoza.com
                </div>
            </div>
            <div className="atg-appnav">
                <div className="atg-appnav-l">
                    <span className="atg-appnav-icon">
                        <Menu />
                    </span>
                    <span className="atg-logo">
                        Testo<b>Z</b>a
                    </span>
                </div>
                <div className="atg-appnav-r">
                    <span className="atg-appnav-icon">
                        <Bell />
                    </span>
                    <span className="atg-avatar">AS</span>
                </div>
            </div>
        </>
    );
}

// ── Scene 1: settings (AITestImporter step 2) ───────────────────────────────

type TouchTarget = 'english' | 'hindi' | 'moderate' | 'textarea' | 'generate' | 'save';
const SETTINGS_TOUCHES: [number, TouchTarget][] = [
    [700, 'english'],
    [1300, 'hindi'],
    [1950, 'moderate'],
    [2550, 'textarea'],
    [6000, 'generate'],
];
const REVIEW_TOUCHES: [number, TouchTarget][] = [[4700, 'save']];

type Refs = Partial<Record<TouchTarget, HTMLElement | null>>;

function SettingsScene({ t, refs }: { t: number; refs: RefObject<Refs> }) {
    const english = t >= 700;
    const hindi = t >= 1300;
    const diff = t >= 1950 ? 'Moderate' : 'Tough';
    const focus = t >= 2550;
    const typed = INSTRUCTION.slice(0, Math.round(lerp(t, 2750, 4300, 0, INSTRUCTION.length)));
    const pressed = t >= 6000 && t < 6450;
    const set = (k: TouchTarget) => (el: HTMLElement | null) => {
        if (refs.current) refs.current[k] = el;
    };

    return (
        <div className="atg-s2">
            <div className="atg-s2-card">
                <div className="atg-s2-filehead">
                    <div className="atg-s2-row">
                        <span className="atg-s2-ghost atg-s2-ghost--icon">
                            <ArrowLeft />
                        </span>
                        <span className="atg-s2-title">Selected Document (1)</span>
                    </div>
                    <div className="atg-s2-row atg-s2-row--tools">
                        <span className="atg-s2-ghost">
                            <Sparkles style={{ color: '#6366f1' }} />
                            High Accuracy
                        </span>
                        <span className="atg-s2-sep" />
                        <span className="atg-s2-ghost atg-s2-ghost--indigo">
                            <Plus />
                            Add File
                        </span>
                        <span className="atg-s2-sep" />
                        <span className="atg-s2-ghost atg-s2-ghost--quiet">
                            <X />
                            Clear All
                        </span>
                    </div>
                </div>
                <div className="atg-s2-file">
                    <div className="atg-s2-row" style={{ gap: 12, minWidth: 0 }}>
                        <span className="atg-s2-fileicon">
                            <FileText />
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <p className="atg-s2-name">{FILE_NAME}</p>
                            <p className="atg-s2-meta">2.41 MB</p>
                        </div>
                    </div>
                    <span className="atg-s2-ghost atg-s2-ghost--icon">
                        <X />
                    </span>
                </div>
            </div>

            <div className="atg-s2-key">
                <div className="atg-s2-row" style={{ gap: 12, minWidth: 0 }}>
                    <span className="atg-s2-keyicon">
                        <Key />
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <p className="atg-s2-name">Answer Key (Optional)</p>
                        <p className="atg-s2-meta">Upload key to auto-match correct answers</p>
                    </div>
                </div>
                <span className="atg-s2-outline" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Upload Key
                </span>
            </div>

            <div className="atg-s2-card atg-s2-settings">
                <div className="atg-s2-sethead">
                    <div className="atg-s2-h">
                        <Sparkles />
                        AI Settings &amp; Constraints
                    </div>
                    <span>Customizable</span>
                </div>
                <div className="atg-s2-field">
                    <div className="atg-s2-label">
                        <span>
                            🌐 Language Output
                            {english && hindi && (
                                <span className="atg-s2-badge" key="bi">
                                    Bilingual
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="atg-s2-chips">
                        <span className={`atg-s2-chip${english ? '' : ' is-on'}`}>Same as Material</span>
                        <span ref={set('english')} className={`atg-s2-chip${english ? ' is-on' : ''}`}>
                            English
                        </span>
                        <span ref={set('hindi')} className={`atg-s2-chip${hindi ? ' is-on' : ''}`}>
                            Hindi
                        </span>
                    </div>
                    <p className="atg-s2-help">Select multiple (e.g. English + Hindi) for bilingual questions.</p>
                </div>
                <div className="atg-s2-field">
                    <div className="atg-s2-label">
                        <span>🎯 Target Difficulty</span>
                        <span className="atg-s2-pill">For generating questions only</span>
                    </div>
                    <div className="atg-s2-chips atg-s2-chips--diff">
                        <span className="atg-s2-chip">🟢 Easy</span>
                        <span ref={set('moderate')} className={`atg-s2-chip${diff === 'Moderate' ? ' is-moderate' : ''}`}>
                            🟡 Moderate
                        </span>
                        <span className={`atg-s2-chip${diff === 'Tough' ? ' is-tough' : ''}`}>🔴 Tough</span>
                    </div>
                    <p className="atg-s2-help">Controls question complexity &amp; reasoning depth for AI generated questions.</p>
                </div>
                <div className="atg-s2-field">
                    <div className="atg-s2-label">
                        <span>📝 Custom Instructions (Optional)</span>
                        <small>e.g. Marks, Negative marking, Count</small>
                    </div>
                    <div ref={set('textarea')} className={`atg-s2-textarea${focus ? ' is-focus' : ''}`}>
                        {focus ? (
                            <>
                                {typed}
                                <span className="atg-s2-caret" />
                            </>
                        ) : (
                            'e.g. Each question 2 marks, 0.5 negative. Generate minimum 30 questions with top conceptual focus...'
                        )}
                    </div>
                </div>
            </div>

            <div className="atg-s2-ask">
                <div className="atg-s2-q">How do you want to process this file?</div>
                <p>Choose a mode based on your goal</p>
            </div>

            <div className="atg-s2-mode border-beam-container">
                <div className="border-beam-gradient-blue" />
                <div className="atg-s2-mode-in">
                    <span className="atg-s2-modeicon">
                        <ClipboardList />
                    </span>
                    <div className="atg-s2-mt">Extract Questions</div>
                    <p>Extract exact questions, options, and diagrams from the exam paper as-is</p>
                    <div className="atg-s2-badges">
                        <span>Best for: Exam papers, question banks</span>
                        <span className="is-fast">
                            <Zap />
                            ULTRA-FAST
                        </span>
                    </div>
                    <span className="atg-s2-go" style={{ display: 'grid', placeItems: 'center' }}>
                        Extract Questions →
                    </span>
                </div>
            </div>
            <div className="atg-s2-mode atg-s2-mode--generate border-beam-container">
                <div className="border-beam-gradient-purple" />
                <div className="atg-s2-mode-in">
                    <span className="atg-s2-modeicon">
                        <Sparkles />
                    </span>
                    <div className="atg-s2-mt">Generate New Questions</div>
                    <p>AI creates original questions based on the content and topics in the document</p>
                    <div className="atg-s2-badges">
                        <span>Best for: Textbooks, notes, study material</span>
                        <span className="is-fast">
                            <Zap />
                            ULTRA-FAST
                        </span>
                    </div>
                    <span ref={set('generate')} className={`atg-s2-go${pressed ? ' is-pressed' : ''}`} style={{ display: 'grid', placeItems: 'center' }}>
                        Generate Questions →
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Scene 2: live processing (ProcessingView) ───────────────────────────────

const LIVE = {
    read: 600,
    find: 1500,
    finish: 7300,
    done: 8300,
    steps: [1500, 3500, 5500],
};
/** When each of the 20 questions arrives (three page steps). */
const ARRIVALS = [
    ...Array.from({ length: 7 }, (_, i) => 2000 + i * 200),
    ...Array.from({ length: 7 }, (_, i) => 3700 + i * 220),
    ...Array.from({ length: 6 }, (_, i) => 5700 + i * 230),
];
const STAGES = [
    { key: 'upload', title: 'Upload', hint: 'Sending your file securely', start: 0, end: LIVE.read },
    { key: 'read', title: 'Read pages', hint: 'Text, scanned pages and diagrams', start: LIVE.read, end: LIVE.find },
    { key: 'find', title: 'Write questions', hint: 'AI works through every page', start: LIVE.find, end: LIVE.finish },
    { key: 'finish', title: 'Final touches', hint: 'Diagrams, answers and numbering', start: LIVE.finish, end: LIVE.done },
];

const questionAt = (n: number) => GENERATED_BILINGUAL[(n - 1) % GENERATED_BILINGUAL.length];

function liveState(t: number) {
    const complete = t >= LIVE.done;
    const pct = complete
        ? 100
        : t < LIVE.read
          ? lerp(t, 0, LIVE.read, 1, 8)
          : t < LIVE.find
            ? lerp(t, LIVE.read, LIVE.find, 8, 18)
            : t < LIVE.finish
              ? lerp(t, LIVE.find, LIVE.finish, 18, 92)
              : lerp(t, LIVE.finish, LIVE.done, 92, 99);
    const step = t < LIVE.steps[1] ? 1 : t < LIVE.steps[2] ? 2 : 3;
    const found = ARRIVALS.filter((a) => a <= t).length;
    const activity = complete
        ? 'All done'
        : t < LIVE.read
          ? 'Uploading your file'
          : t < LIVE.find
            ? 'Found 12 pages · 3 scanned'
            : t < LIVE.finish
              ? `Reading pages ${['1–5', '6–10', '11–12'][step - 1]}`
              : 'Adding diagrams, answers and numbering';
    const right = complete
        ? `Finished in ${clock(LIVE.done * SPEED)}`
        : t < LIVE.read
          ? ''
          : t < 2200
            ? 'Estimating time…'
            : t < 4600
              ? 'About 1 minute left'
              : t < LIVE.finish
                ? 'Less than a minute left'
                : 'Almost done';
    const stageIdx = complete ? 4 : STAGES.findIndex((s) => t < s.end);
    return { complete, pct, step, found, activity, right, stageIdx, elapsed: Math.min(t, LIVE.done) * SPEED };
}

const FeedCard = memo(function FeedCard({ q, n }: { q: DemoQuestion; n: number }) {
    return (
        <article className="aix-card aix-fq">
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
        </article>
    );
});

function LiveScene({ t, statusRef }: { t: number; statusRef: RefObject<HTMLElement> }) {
    const s = liveState(t);
    const iconClass = `aix-appicon ${s.complete ? 'aix-appicon--done' : 'aix-appicon--generate aix-appicon--live'}`;
    const barClass = `aix-bar ${s.complete ? 'aix-bar--done' : 'aix-bar--live aix-bar--generate'}`;
    const showMap = t >= LIVE.find;
    const segDone = s.complete ? 3 : s.step - 1;

    return (
        <div className="aix-proc">
            <section ref={statusRef} className="aix-card aix-status">
                <div className="aix-status-head">
                    <div className={iconClass}>{s.complete ? <Check /> : <Sparkles />}</div>
                    <div className="aix-status-title">
                        <div className="atg-r-h1">{s.complete ? 'Your questions are ready' : 'Generating questions'}</div>
                        <p>
                            {!s.complete && (
                                <span className="aix-live">
                                    <i />
                                    Live
                                </span>
                            )}
                            <span className="aix-fileline">{t >= LIVE.read ? `${FILE_NAME} · 12 pages` : FILE_NAME}</span>
                        </p>
                    </div>
                </div>
                <div className="aix-meter">
                    <div className="aix-meter-top">
                        <div className="aix-pct">
                            {Math.floor(s.pct)}
                            <small>%</small>
                        </div>
                        <div className="aix-clock">
                            <b>{clock(s.elapsed)}</b>
                            <span>Elapsed</span>
                        </div>
                    </div>
                    <div className={barClass}>
                        <i style={{ width: `${s.pct}%` }} />
                    </div>
                    <div className="aix-meter-caption">
                        <span>{s.activity}</span>
                        <span>{s.right}</span>
                    </div>
                    {showMap && (
                        <div className="aix-map aix-map--generate">
                            <div className="aix-map-label">
                                <span>Document progress</span>
                                <b>{s.complete ? '3 of 3' : `Step ${s.step} of 3`}</b>
                            </div>
                            <div className="aix-map-track">
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className={s.complete || i < segDone ? 'is-done' : i === segDone ? 'is-active' : ''} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="aix-stats">
                    <div className="aix-stat">
                        <b>{s.found}</b>
                        <span>{s.found === 1 ? 'Question' : 'Questions'}</span>
                    </div>
                    <div className="aix-stat">
                        <b>{t >= LIVE.read ? 12 : '—'}</b>
                        <span>Pages</span>
                    </div>
                    {showMap && (
                        <div className="aix-stat">
                            <b>{s.complete ? 3 : s.step}/3</b>
                            <span>Steps</span>
                        </div>
                    )}
                </div>
                <ol className="aix-stages">
                    {STAGES.map((st, idx) => {
                        const state = idx < s.stageIdx ? 'done' : idx === s.stageIdx ? 'active' : 'pending';
                        const ms = state === 'pending' ? 0 : (Math.min(t, st.end) - st.start) * SPEED;
                        return (
                            <li key={st.key} className={`aix-stage is-${state}`}>
                                <span className="aix-stage-icon">{state === 'done' ? <Check /> : state === 'active' ? <span className="aix-spin" /> : idx + 1}</span>
                                <span className="aix-stage-text">
                                    <b>{st.title}</b>
                                    <span>{state === 'active' ? s.activity : st.hint}</span>
                                </span>
                                <span className="aix-stage-time">{ms > 0 ? duration(ms) : ''}</span>
                            </li>
                        );
                    })}
                </ol>
                {!s.complete && (
                    <>
                        <p className="aix-note">
                            <Info />
                            <span>You can switch to another tab or window. Processing keeps running, and the tab title shows the progress.</span>
                        </p>
                        <span className="aix-btn aix-btn--danger">Stop processing</span>
                    </>
                )}
            </section>

            <section className="aix-feed">
                <div className="aix-feed-head">
                    <div className="atg-r-h2">
                        Questions <span className="aix-count">{s.found}</span>
                    </div>
                    <span className="aix-feed-status">
                        {s.complete ? (
                            <>
                                <Check size={15} style={{ color: 'var(--green)' }} /> Complete
                            </>
                        ) : (
                            <>
                                <i /> Arriving live
                            </>
                        )}
                    </span>
                </div>
                <div className="aix-feed-list">
                    {Array.from({ length: s.found }, (_, i) => (
                        <FeedCard key={i} q={questionAt(i + 1)} n={i + 1} />
                    ))}
                    <div data-feed-end>
                        {s.complete ? (
                            <div className="aix-done">
                                <span className="aix-done-seal">
                                    <Check />
                                </span>
                                <div>
                                    <b>20 questions ready</b>
                                    <span>Opening your review…</span>
                                </div>
                            </div>
                        ) : (
                            <div className="aix-card aix-skel aix-skel--generate">
                                <span className="aix-skel-bar" />
                                <div className="aix-fq-head">
                                    <span className="aix-num">{s.found + 1}</span>
                                    <span className="aix-sk" style={{ width: 64, height: 24, borderRadius: 999 }} />
                                </div>
                                <div className="aix-skel-lines">
                                    <span className="aix-sk" style={{ width: '92%' }} />
                                    <span className="aix-sk" style={{ width: '78%' }} />
                                    <span className="aix-sk" style={{ width: '46%' }} />
                                </div>
                                <div className="aix-skel-caption">
                                    <span className="aix-spin" />
                                    <span>
                                        <b>{s.found === 0 ? 'Waiting for the first question' : `Question ${s.found + 1} is on its way`}</b> · {s.activity}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

function LiveMini({ t }: { t: number }) {
    const s = liveState(t);
    const iconClass = `aix-appicon ${s.complete ? 'aix-appicon--done' : 'aix-appicon--generate aix-appicon--live'}`;
    return (
        <div className="aix-mini">
            <div className={iconClass}>{s.complete ? <Check /> : <Sparkles />}</div>
            <div className="aix-mini-text">
                <b>{s.complete ? 'Your questions are ready' : `${s.found} question${s.found === 1 ? '' : 's'} so far`}</b>
                <span>{s.activity}</span>
            </div>
            <div className="aix-mini-pct">{Math.floor(s.pct)}%</div>
            <div className={`aix-bar ${s.complete ? 'aix-bar--done' : 'aix-bar--live aix-bar--generate'}`}>
                <i style={{ width: `${s.pct}%` }} />
            </div>
        </div>
    );
}

// ── Scene 3: review (PreviewView) ───────────────────────────────────────────

function ReviewCard({ q, n }: { q: DemoQuestion; n: number }) {
    return (
        <article className="aix-card aix-qc">
            <header className="aix-qc-head">
                <span className="aix-num">{n}</span>
                <span className="aix-chip">{TYPE_LONG[q.type]}</span>
                {q.page ? <span className="aix-chip">Page {q.page}</span> : null}
                <div className="aix-qc-tools">
                    <span className="aix-iconbtn">
                        <CodeXml />
                        <span>Raw</span>
                    </span>
                </div>
            </header>
            <div className="aix-qtext">{q.text}</div>
            {q.options && (
                <div className="aix-opts">
                    {q.options.map(([k, v]) => {
                        const correct = isCorrectKey(q, k);
                        return (
                            <div key={k} className={`aix-opt${correct ? ' is-correct' : ''}`}>
                                <span className={`aix-opt-key${q.type === 'multiple' ? ' aix-opt-key--box' : ''}`}>{k}</span>
                                <div className="aix-opt-body">{v}</div>
                                {correct && (
                                    <span className="aix-opt-seal">
                                        <Check />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {q.type === 'numerical' && (
                <div className="aix-answer">
                    Answer <b>{q.answer as string}</b>
                </div>
            )}
        </article>
    );
}

function ReviewScene({ t, refs, toolbarRef }: { t: number; refs: RefObject<Refs>; toolbarRef: RefObject<HTMLDivElement> }) {
    const saving = t >= 4700;
    return (
        <div className="aix-rv">
            <header className="aix-hero">
                <div className="aix-eyebrow">
                    <span className="aix-chip aix-chip--purple">
                        <Sparkles />
                        Generated with AI
                    </span>
                    <span>Review, then save or fine-tune in the editor.</span>
                </div>
                <div className="atg-r-title">Force and Laws of Motion: Practice Test</div>
                <div className="aix-widgets">
                    <div className="aix-card aix-widget">
                        <span className="aix-widget-icon">
                            <ListChecks />
                        </span>
                        <div>
                            <b>20</b>
                            <span>Questions</span>
                        </div>
                    </div>
                    <div className="aix-card aix-widget">
                        <span className="aix-widget-icon aix-widget-icon--green">
                            <CheckCircle2 />
                        </span>
                        <div>
                            <b>20/20</b>
                            <span>Answers set</span>
                        </div>
                    </div>
                    <div className="aix-card aix-widget">
                        <span className="aix-widget-icon aix-widget-icon--indigo">
                            <Layers />
                        </span>
                        <div>
                            <b>3 types</b>
                            <span>14 single choice · 4 numerical · 2 multiple correct</span>
                        </div>
                    </div>
                    <div className="aix-card aix-widget">
                        <span className="aix-widget-icon aix-widget-icon--purple">
                            <Clock />
                        </span>
                        <div>
                            <b>{duration(LIVE.done * SPEED)}</b>
                            <span>Processing time</span>
                        </div>
                    </div>
                </div>
            </header>
            <div className="aix-rv-grid">
                <main style={{ minWidth: 0 }}>
                    <div className="aix-toolbar" ref={toolbarRef}>
                        <div className="aix-seg">
                            <button type="button" tabIndex={-1} aria-pressed="true">
                                All <em>20</em>
                            </button>
                        </div>
                        <span className="aix-search">
                            <Search />
                            <span style={{ fontSize: 15, color: 'var(--muted)' }}>Search questions</span>
                        </span>
                        <span className="aix-btn aix-btn--gray aix-jumpbtn">
                            <Grid3x3 /> Jump
                        </span>
                    </div>
                    <div className="aix-qlist">
                        {[1, 2, 3].map((n) => (
                            <ReviewCard key={n} q={questionAt(n)} n={n} />
                        ))}
                    </div>
                </main>
            </div>
            <div className="aix-actionbar">
                <div className="aix-actionbar-in">
                    <span className="aix-btn aix-btn--gray aix-btn--icon">
                        <MoreHorizontal />
                    </span>
                    <span className="aix-grow" />
                    <span className="aix-btn aix-btn--tinted">
                        <PenLine /> Edit
                    </span>
                    <span
                        ref={(el) => {
                            if (refs.current) refs.current.save = el;
                        }}
                        className="aix-btn aix-btn--filled"
                        style={saving ? { opacity: 0.55 } : undefined}
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <Check />}
                        {saving ? 'Saving…' : 'Save & continue'}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── The phone ────────────────────────────────────────────────────────────────

export default function AtgHero() {
    const reduced = usePrefersReducedMotion();
    const [scene, setScene] = useState<SceneIdx>(reduced ? 2 : 0);
    const [t, setT] = useState(reduced ? REST_T[2] : 0);
    const [playing, setPlaying] = useState(!reduced);
    const [inView, setInView] = useState(true);
    const [miniOn, setMiniOn] = useState(false);
    const [touch, setTouch] = useState<{ id: number; x: number; y: number } | null>(null);

    const boxRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const refs = useRef<Refs>({});

    // Clock: advances only while playing, on screen and in a visible tab.
    const clockRef = useRef({ scene, t });
    clockRef.current = { scene, t };
    useEffect(() => {
        if (!playing || !inView) return;
        const id = window.setInterval(() => {
            if (document.hidden) return;
            const { scene: sc, t: now } = clockRef.current;
            const next = now + TICK;
            if (next < SCENES[sc].dur) {
                setT(next);
            } else {
                setScene(((sc + 1) % SCENES.length) as SceneIdx);
                setT(0);
            }
        }, TICK);
        return () => window.clearInterval(id);
    }, [playing, inView]);

    useEffect(() => {
        const el = boxRef.current;
        if (!el || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Scroll inside the phone, the way a person would.
    const scrollTarget = (() => {
        if (scene === 0) return t >= 4500 ? 'bottom' : 'top';
        if (scene === 1) {
            if (reduced || t < 2100) return 'top';
            return `feed-${liveState(t).found}-${t >= LIVE.done ? 'done' : ''}`;
        }
        if (reduced || t < 900) return 'top';
        return t >= 3600 ? 'more' : 'toolbar';
    })();

    useLayoutEffect(() => {
        const sc = scrollerRef.current;
        if (!sc) return;
        const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
        let top = 0;
        if (scrollTarget === 'bottom' || scrollTarget.startsWith('feed-')) top = sc.scrollHeight - sc.clientHeight;
        else if (scrollTarget === 'toolbar') top = (toolbarRef.current?.offsetTop ?? 0) - 6;
        else if (scrollTarget === 'more') top = (toolbarRef.current?.offsetTop ?? 0) + 330;
        if (scrollTarget === 'top') sc.scrollTo({ top: 0, behavior: 'auto' });
        else sc.scrollTo({ top, behavior });
    }, [scrollTarget, reduced]);

    // A new scene starts at the top.
    useLayoutEffect(() => {
        scrollerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        setMiniOn(false);
    }, [scene]);

    // The compact live bar shows once the status card has scrolled away (as in the product).
    useEffect(() => {
        const sc = scrollerRef.current;
        if (!sc || scene !== 1) return;
        const onScroll = () => {
            const h = statusRef.current?.offsetHeight ?? 9999;
            setMiniOn(sc.scrollTop > h - 40);
        };
        onScroll();
        sc.addEventListener('scroll', onScroll, { passive: true });
        return () => sc.removeEventListener('scroll', onScroll);
    }, [scene]);

    // Touch indicator: find the tapped control and place the dot on it.
    const touches = scene === 0 ? SETTINGS_TOUCHES : scene === 2 ? REVIEW_TOUCHES : [];
    const active = reduced ? undefined : touches.find(([at]) => t >= at && t < at + 650);
    const activeId = active ? scene * 100000 + active[0] : 0;
    useLayoutEffect(() => {
        if (!active) {
            setTouch(null);
            return;
        }
        const el = refs.current[active[1]];
        const screen = screenRef.current;
        if (!el || !screen) return;
        const sr = screen.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        const k = sr.width / 375 || 1;
        setTouch({ id: activeId, x: (er.left + er.width / 2 - sr.left) / k, y: (er.top + er.height / 2 - sr.top) / k });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    const progress = t / SCENES[scene].dur;

    const goTo = useCallback(
        (i: SceneIdx) => {
            setScene(i);
            setT(reduced ? REST_T[i] : 0);
        },
        [reduced],
    );

    const sceneEl =
        scene === 0 ? (
            <SettingsScene t={t} refs={refs} />
        ) : scene === 1 ? (
            <LiveScene t={t} statusRef={statusRef} />
        ) : (
            <ReviewScene t={t} refs={refs} toolbarRef={toolbarRef} />
        );

    return (
        <div className="atg-visual">
            <div className="atg-device-box" ref={boxRef}>
                <div className="atg-device" role="img" aria-label="TestoZa's AI test generator on a phone: choosing English and Hindi, Moderate difficulty and Generate; 20 questions arriving live while the PDF is read; then the review screen with every answer set and Save & continue.">
                    <div ref={screenRef} className={`atg-screen aix atg-app${scene === 0 ? '' : ' is-grouped'}`} aria-hidden="true">
                        <AppChrome />
                        <div className="atg-scroller" ref={scrollerRef}>
                            <div className="atg-scene" key={scene}>
                                {sceneEl}
                            </div>
                        </div>
                        {scene === 1 && miniOn && <LiveMini t={t} />}
                        {scene === 2 && t >= 5400 && (
                            <div className="atg-toast">
                                <CheckCircle2 />
                                Test saved successfully!
                            </div>
                        )}
                        {touch && <span key={touch.id} className="atg-touch" style={{ left: touch.x, top: touch.y }} />}
                        <span className="atg-homebar" />
                    </div>
                </div>
            </div>

            <div className="atg-dotnav">
                <div className="atg-dots" role="group" aria-label="Steps of the demo">
                    {SCENES.map((s, i) => (
                        <button
                            key={s.key}
                            type="button"
                            className={`atg-dot${i === scene ? ' is-active' : ''}`}
                            aria-label={`Step ${i + 1}: ${s.title}`}
                            aria-current={i === scene ? 'step' : undefined}
                            onClick={() => goTo(i as SceneIdx)}
                        >
                            {i === scene && <i style={{ width: reduced ? '100%' : `${Math.round(progress * 100)}%` }} />}
                        </button>
                    ))}
                </div>
                {!reduced && (
                    <button type="button" className="atg-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause the demo' : 'Play the demo'}>
                        {playing ? (
                            <svg viewBox="0 0 14 14" aria-hidden="true">
                                <rect x="2.5" y="1.5" width="3.2" height="11" rx="1" />
                                <rect x="8.3" y="1.5" width="3.2" height="11" rx="1" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 14 14" aria-hidden="true">
                                <path d="M3.5 1.8v10.4c0 .6.7 1 1.2.7l8-5.2c.5-.3.5-1 0-1.4l-8-5.2c-.5-.3-1.2.1-1.2.7Z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
            <p className="atg-visual-caption" aria-live="off">
                <b>
                    {scene + 1}. {SCENES[scene].title}
                </b>
                The real TestoZa screens. Processing sped up.
            </p>
        </div>
    );
}
