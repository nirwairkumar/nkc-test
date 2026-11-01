/**
 * "Generate" at work on /neet-online-test-software: a replay of TestoZa's AI
 * processing screen (components/ai-import/ProcessingView.tsx) turning three
 * photographed NCERT Biology pages into NEET-style questions.
 *
 * It renders ProcessingView's markup with the product's own stylesheet
 * (aiImport.css) and its own formatters (progressModel), driven by a script
 * instead of the server's progress stream, so it looks and counts exactly like
 * the real screen. The run is sped up (real runs take a minute or more). The
 * questions are accurate to the NCERT chapter "Photosynthesis in Higher Plants".
 * Plays while on screen; reduced motion shows the finished screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Info, Lock, Sparkles } from 'lucide-react';
import { STAGE_ORDER, formatClock, formatDuration } from '@/components/ai-import/progressModel';
import type { StageKey } from '@/components/ai-import/types';
import '@/components/ai-import/aiImport.css';
import { useInert } from './examUtils';

interface FeedQuestion {
    text: string[];
    table?: [string, string][];
    page: number;
    options: [string, string][];
    answer: string;
}

const QUESTIONS: FeedQuestion[] = [
    {
        page: 2,
        text: [
            'Given below are two statements:',
            'Statement I: The primary acceptor of CO₂ in C₄ plants is phosphoenolpyruvate (PEP).',
            'Statement II: The first stable product of CO₂ fixation in C₃ plants is oxaloacetic acid.',
            'Choose the correct answer from the options given below:',
        ],
        options: [
            ['A', 'Both Statement I and Statement II are correct'],
            ['B', 'Both Statement I and Statement II are incorrect'],
            ['C', 'Statement I is correct but Statement II is incorrect'],
            ['D', 'Statement I is incorrect but Statement II is correct'],
        ],
        answer: 'C',
    },
    {
        page: 1,
        text: ['Which of the following is not a product of the light reaction of photosynthesis?'],
        options: [
            ['A', 'ATP'],
            ['B', 'NADPH'],
            ['C', 'O₂'],
            ['D', 'Glucose'],
        ],
        answer: 'D',
    },
    {
        page: 3,
        text: [
            'Given below are two statements: one is labelled as Assertion A and the other is labelled as Reason R.',
            'Assertion A: Photorespiration does not occur in C₄ plants.',
            'Reason R: C₄ plants raise the CO₂ concentration at the site of RuBisCO, so it works mainly as a carboxylase.',
        ],
        options: [
            ['A', 'Both A and R are true and R is the correct explanation of A'],
            ['B', 'Both A and R are true but R is NOT the correct explanation of A'],
            ['C', 'A is true but R is false'],
            ['D', 'A is false but R is true'],
        ],
        answer: 'A',
    },
    {
        page: 2,
        text: ['Match List-I with List-II.'],
        table: [
            ['List-I', 'List-II'],
            ['A. P680', 'I. Photosystem I'],
            ['B. P700', 'II. Photosystem II'],
            ['C. Kranz anatomy', 'III. Leaves of C₄ plants'],
            ['D. Calvin cycle', 'IV. Stroma'],
        ],
        options: [
            ['A', 'A-II, B-I, C-III, D-IV'],
            ['B', 'A-I, B-II, C-III, D-IV'],
            ['C', 'A-II, B-I, C-IV, D-III'],
            ['D', 'A-I, B-II, C-IV, D-III'],
        ],
        answer: 'A',
    },
    {
        page: 2,
        text: ['In C₃ plants, the enzyme RuBisCO is found in the:'],
        options: [
            ['A', 'Thylakoid membrane'],
            ['B', 'Stroma of the chloroplast'],
            ['C', 'Mitochondrial matrix'],
            ['D', 'Cytoplasm of mesophyll cells'],
        ],
        answer: 'B',
    },
    {
        page: 3,
        text: ['How many molecules of ATP and NADPH are needed to fix one molecule of CO₂ in the Calvin cycle?'],
        options: [
            ['A', '2 ATP and 3 NADPH'],
            ['B', '3 ATP and 2 NADPH'],
            ['C', '2 ATP and 2 NADPH'],
            ['D', '3 ATP and 3 NADPH'],
        ],
        answer: 'B',
    },
];

/** When each stage starts and each question arrives (ms from the start). */
const T = { read: 1500, find: 3600, finish: 12600, done: 14000, loop: 19500 };
const ARRIVALS = [5200, 6600, 8000, 9400, 10600, 11800];

const STAGE_COPY: Record<StageKey, { title: string; hint: string }> = {
    upload: { title: 'Upload', hint: 'Sending your file securely' },
    read: { title: 'Read pages', hint: 'Text, scanned pages and diagrams' },
    find: { title: 'Write questions', hint: 'AI works through every page' },
    finish: { title: 'Final touches', hint: 'Diagrams, answers and numbering' },
};
const STAGE_START: Record<StageKey, number> = { upload: 0, read: T.read, find: T.find, finish: T.finish };

/** Progress at time t, eased between milestones the way the real meter is. */
function percentAt(t: number) {
    const seg = (from: number, to: number, t0: number, t1: number) => from + (to - from) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    if (t >= T.done) return 100;
    if (t >= T.finish) return seg(90, 99, T.finish, T.done);
    if (t >= T.find) return seg(40, 90, T.find, T.finish);
    if (t >= T.read) return seg(10, 38, T.read, T.find);
    return seg(1, 9, 0, T.read);
}

function FeedCard({ q, n }: { q: FeedQuestion; n: number }) {
    return (
        <article className="aix-card aix-fq" aria-label={`Question ${n}`}>
            <div className="aix-fq-head">
                <span className="aix-num" aria-hidden="true">
                    {n}
                </span>
                <span className="aix-chip">Single</span>
                <span className="aix-chip">Page {q.page}</span>
            </div>
            <div className="aix-fq-text aix-tex">
                <div className="latex-renderer-container font-medium text-slate-800">
                    <span>
                        {q.text.map((line, i) => (
                            <span key={i}>
                                {i > 0 && <br />}
                                {line}
                            </span>
                        ))}
                        {q.table && (
                            <table className="ng-qtable">
                                <tbody>
                                    {q.table.map(([a, b]) => (
                                        <tr key={a}>
                                            <td>{a}</td>
                                            <td>{b}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </span>
                </div>
            </div>
            <div className="aix-fq-opts">
                {q.options.map(([key, value]) => (
                    <div key={key} className={`aix-fq-opt ${key === q.answer ? 'is-correct' : ''}`}>
                        <b>{key}</b>
                        <div className="aix-tex">{value}</div>
                    </div>
                ))}
            </div>
        </article>
    );
}

function Throbber({ n, activity, ghost = false }: { n: number; activity?: string; ghost?: boolean }) {
    return (
        <div className={`aix-card aix-skel aix-skel--generate ${ghost ? 'aix-skel--ghost' : ''}`} style={ghost ? { opacity: n % 2 ? 0.55 : 0.3 } : undefined}>
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

export default function AiImportDemo() {
    const rootRef = useRef<HTMLElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const [t, setT] = useState(0);
    const [running, setRunning] = useState(false);
    const [cardVisible, setCardVisible] = useState(true);
    useInert(frameRef, true);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
            setT(T.done + 1000);
            return;
        }
        const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!running) return;
        let last = performance.now();
        const id = window.setInterval(() => {
            const now = performance.now();
            const dt = now - last;
            last = now;
            setT((prev) => (prev + dt >= T.loop ? 0 : prev + dt));
        }, 250);
        return () => window.clearInterval(id);
    }, [running]);

    // On narrow screens the status card scrolls away and the floating summary takes over, as in the app.
    useEffect(() => {
        const card = cardRef.current;
        const root = scrollRef.current;
        if (!card || !root || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting), { root, rootMargin: '-60px 0px 0px 0px' });
        io.observe(card);
        return () => io.disconnect();
    }, []);

    const found = ARRIVALS.filter((a) => t >= a).length;
    const complete = t >= T.done;

    // Follow the newest question, and start from the top on every loop.
    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        if (found === 0 && !complete) root.scrollTo({ top: 0 });
        else endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [found, complete]);

    const stage: StageKey = t >= T.finish ? 'finish' : t >= T.find ? 'find' : t >= T.read ? 'read' : 'upload';
    const currentIdx = complete ? STAGE_ORDER.length : STAGE_ORDER.indexOf(stage);
    const pct = Math.floor(percentAt(t));
    const activity = complete
        ? 'All done'
        : stage === 'upload'
          ? 'Uploading your file'
          : stage === 'read'
            ? 'Found 3 pages · 3 scanned'
            : stage === 'finish'
              ? 'Adding diagrams, answers and numbering'
              : found > 0
                ? `${found} question${found === 1 ? '' : 's'} so far`
                : 'AI is reading the pages';
    const elapsed = Math.min(t, T.done);
    const rightCaption = complete ? `Finished in ${formatClock(elapsed)}` : stage === 'finish' ? 'Almost done' : '';
    const title = complete ? 'Your questions are ready' : 'Generating questions';
    const iconClass = `aix-appicon ${complete ? 'aix-appicon--done' : 'aix-appicon--generate aix-appicon--live'}`;
    const Icon = complete ? Check : Sparkles;
    const barClass = `aix-bar ${complete ? 'aix-bar--done' : 'aix-bar--live aix-bar--generate'}`;
    const stageMs = (key: StageKey, idx: number) => {
        if (idx > currentIdx) return 0;
        const end = idx < currentIdx ? (STAGE_START[STAGE_ORDER[idx + 1]] ?? T.done) : elapsed;
        return Math.max(0, end - STAGE_START[key]);
    };

    return (
        <figure className="ng-widget ng-wide" ref={rootRef}>
            <div
                className="ng-window"
                role="img"
                aria-label="Replay of TestoZa's AI processing screen: three photographed NCERT pages on photosynthesis become six NEET-style questions, each shown with its type, its page and the correct answer highlighted."
            >
                <div className="ng-window-bar" aria-hidden="true">
                    <div className="ng-window-lights">
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="ng-window-url">
                        <Lock /> testoza.com/generate-with-ai
                    </div>
                </div>
                <div className="ng-aix-frame" ref={frameRef} aria-hidden="true">
                    <div className="aix aix-page ng-aix" ref={scrollRef}>
                        <div className="aix-proc">
                            <section ref={cardRef} className="aix-card aix-status">
                                <div className="aix-status-head">
                                    <div className={iconClass}>
                                        <Icon />
                                    </div>
                                    <div className="aix-status-title">
                                        <h3 className="ng-aix-h">{title}</h3>
                                        <p>
                                            {!complete && (
                                                <span className="aix-live">
                                                    <i />
                                                    Live
                                                </span>
                                            )}
                                            <span className="aix-fileline">3 files · 3 pages</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="aix-meter">
                                    <div className="aix-meter-top">
                                        <div className="aix-pct">
                                            {pct}
                                            <small>%</small>
                                        </div>
                                        <div className="aix-clock">
                                            <b>{formatClock(elapsed)}</b>
                                            <span>Elapsed</span>
                                        </div>
                                    </div>
                                    <div className={barClass}>
                                        <i style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="aix-meter-caption">
                                        <span>{activity}</span>
                                        <span>{rightCaption}</span>
                                    </div>
                                </div>
                                <div className="aix-stats">
                                    <div className="aix-stat">
                                        <b>{found}</b>
                                        <span>{found === 1 ? 'Question' : 'Questions'}</span>
                                    </div>
                                    <div className="aix-stat">
                                        <b>3</b>
                                        <span>Pages</span>
                                    </div>
                                </div>
                                <ol className="aix-stages">
                                    {STAGE_ORDER.map((key, idx) => {
                                        const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending';
                                        const ms = stageMs(key, idx);
                                        return (
                                            <li key={key} className={`aix-stage is-${state}`}>
                                                <span className="aix-stage-icon">{state === 'done' ? <Check /> : state === 'active' ? <span className="aix-spin" /> : idx + 1}</span>
                                                <span className="aix-stage-text">
                                                    <b>{STAGE_COPY[key].title}</b>
                                                    <span>{state === 'active' ? activity : STAGE_COPY[key].hint}</span>
                                                </span>
                                                <span className="aix-stage-time">{ms > 0 ? formatDuration(ms) : ''}</span>
                                            </li>
                                        );
                                    })}
                                </ol>
                                {!complete && (
                                    <>
                                        <p className="aix-note">
                                            <Info />
                                            <span>You can switch to another tab or window. Processing keeps running, and the tab title shows the progress.</span>
                                        </p>
                                        <span className="aix-btn aix-btn--danger">Stop processing</span>
                                    </>
                                )}
                            </section>

                            {!cardVisible && (
                                <div className="aix-mini">
                                    <div className={iconClass}>
                                        <Icon />
                                    </div>
                                    <div className="aix-mini-text">
                                        <b>{complete ? title : `${found} question${found === 1 ? '' : 's'} so far`}</b>
                                        <span>{activity}</span>
                                    </div>
                                    <div className="aix-mini-pct">{pct}%</div>
                                    <div className={barClass}>
                                        <i style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )}

                            <section className="aix-feed">
                                <div className="aix-feed-head">
                                    <h3 className="ng-aix-h2">
                                        Questions <span className="aix-count">{found}</span>
                                    </h3>
                                    <span className="aix-feed-status">
                                        {complete ? (
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
                                    {QUESTIONS.slice(0, found).map((q, i) => (
                                        <FeedCard key={i} q={q} n={i + 1} />
                                    ))}
                                    <div ref={endRef} style={{ scrollMarginBottom: 24 }}>
                                        {complete ? (
                                            <div className="aix-done">
                                                <span className="aix-done-seal">
                                                    <Check />
                                                </span>
                                                <div>
                                                    <b>{found} questions ready</b>
                                                    <span>Opening your review…</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <Throbber n={found + 1} activity={stage === 'find' ? activity : undefined} />
                                        )}
                                    </div>
                                    {!complete && found === 0 && (
                                        <>
                                            <Throbber n={1} ghost />
                                            <Throbber n={2} ghost />
                                        </>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
            <figcaption>The real processing screen, sped up: a run like this usually takes a minute or two.</figcaption>
        </figure>
    );
}
