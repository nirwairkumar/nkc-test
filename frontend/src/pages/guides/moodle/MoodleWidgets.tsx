/**
 * Interactive parts of /moodle-alternative. Crawlers get each widget's fallbackHtml
 * from src/guides/moodleAlternative.ts instead.
 *
 *   moodle-audit      what you use Moodle for → keep it, move the tests, or switch
 *   moodle-support    Moodle's support calendar (moodledev.io release dates)
 *   moodle-exam-room  ExamRoomDemo.tsx: the teacher's live-exam room, playable
 *   moodle-marking    an exam's marking scheme as Moodle's answer grade vs TestoZa's
 *
 * Moodle facts come from src/guides/moodleData.ts, which the crawler text also reads.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
    type LucideIcon,
    Award,
    BarChart3,
    BookOpen,
    Check,
    ClipboardList,
    MessagesSquare,
    Minus,
    Package,
    PenLine,
    Plus,
    ShoppingCart,
    Smartphone,
    Timer,
    TriangleAlert,
} from 'lucide-react';
import type { GuideWidget } from '@/guides/types';
import { MARKING_PRESETS, MOODLE_NEXT_LTS, MOODLE_RELEASES, longDate, moodleMatch, moodlePercent } from '@/guides/moodleData';
import ExamRoomDemo from './ExamRoomDemo';

// ── iOS switch ──────────────────────────────────────────────────────────────

function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} className="ma-switch" onClick={() => onChange(!checked)}>
            <i />
        </button>
    );
}

// ── moodle-audit ────────────────────────────────────────────────────────────

interface Use {
    id: string;
    label: string;
    short: string;
    icon: LucideIcon;
    tone: string;
    kind: 'teach' | 'test';
}

const USES: Use[] = [
    { id: 'courses', label: 'Courses and lesson pages', short: 'Courses and lessons', icon: BookOpen, tone: 'blue', kind: 'teach' },
    { id: 'assignments', label: 'Assignments, essays and file uploads', short: 'Assignments and essays', icon: PenLine, tone: 'orange', kind: 'teach' },
    { id: 'forums', label: 'Forums and messages', short: 'Forums', icon: MessagesSquare, tone: 'green', kind: 'teach' },
    { id: 'scorm', label: 'SCORM or H5P packages', short: 'SCORM and H5P', icon: Package, tone: 'purple', kind: 'teach' },
    { id: 'completion', label: 'Completion tracking and certificates', short: 'Completion and certificates', icon: Award, tone: 'teal', kind: 'teach' },
    { id: 'gradebook', label: 'A gradebook for the whole term', short: 'Term gradebook', icon: BarChart3, tone: 'indigo', kind: 'teach' },
    { id: 'selling', label: 'Selling courses', short: 'Course sales', icon: ShoppingCart, tone: 'pink', kind: 'teach' },
    { id: 'weekly', label: 'Weekly or chapter tests', short: 'Weekly tests', icon: ClipboardList, tone: 'blue', kind: 'test' },
    { id: 'mocks', label: 'Full mocks in a hall or lab', short: 'Full mocks', icon: Timer, tone: 'red', kind: 'test' },
    { id: 'practice', label: 'Practice tests at home', short: 'Practice at home', icon: Smartphone, tone: 'green', kind: 'test' },
];

type Verdict = 'none' | 'keep' | 'split' | 'switch';

function verdictOf(teach: number, test: number): Verdict {
    if (!teach && !test) return 'none';
    if (!teach) return 'switch';
    if (teach >= 3 || !test) return 'keep';
    return 'split';
}

const VERDICTS: Record<Verdict, { title: string; text: string }> = {
    none: { title: 'Switch on what you use', text: 'The answer appears here as you go.' },
    keep: {
        title: 'Keep Moodle',
        text: 'You’re using Moodle as a learning management system, and an exam tool can’t replace that. Fix what hurts instead: managed hosting such as MoodleCloud, fewer plugins, or a Moodle Partner for upgrades.',
    },
    split: {
        title: 'Keep Moodle for teaching. Move the tests.',
        text: 'Lessons stay where students already find them. Tests move to a tool built for exams, linked from the course page, with marks coming back as a spreadsheet.',
    },
    switch: {
        title: 'You don’t need an LMS',
        text: 'Everything you use is testing. A server, upgrades and an account for every student are overhead for one module, and an exam platform does the same job with less work.',
    },
};

function Audit() {
    const [on, setOn] = useState<Record<string, boolean>>({ courses: true, weekly: true, mocks: true });
    const teach = USES.filter((u) => u.kind === 'teach' && on[u.id]);
    const test = USES.filter((u) => u.kind === 'test' && on[u.id]);
    const verdict = verdictOf(teach.length, test.length);
    const v = VERDICTS[verdict];
    const stays = verdict === 'switch' ? [] : verdict === 'keep' ? [...teach, ...test] : teach;
    const moves = verdict === 'switch' ? test : verdict === 'split' ? test : [];

    const group = (kind: Use['kind'], title: string, footer: string) => (
        <div className="ma-settings-group">
            <p className="ma-group-label">{title}</p>
            <ul className="ma-settings">
                {USES.filter((u) => u.kind === kind).map((u) => {
                    const I = u.icon;
                    return (
                        <li key={u.id}>
                            <span className="ma-tile" data-tone={u.tone} aria-hidden="true">
                                <I strokeWidth={2.2} />
                            </span>
                            <label htmlFor={`ma-use-${u.id}`}>{u.label}</label>
                            <Switch id={`ma-use-${u.id}`} label={u.label} checked={!!on[u.id]} onChange={(val) => setOn((o) => ({ ...o, [u.id]: val }))} />
                        </li>
                    );
                })}
            </ul>
            <p className="ma-settings-foot">{footer}</p>
        </div>
    );

    return (
        <figure className="ma-widget ma-wide-md">
            <div className="ma-panel ma-audit">
                <div className="ma-audit-lists">
                    {group('teach', 'Teaching', 'The parts that make Moodle a learning management system.')}
                    {group('test', 'Tests and exams', 'The part an exam platform replaces.')}
                </div>
                <div className="ma-verdict" data-kind={verdict} aria-live="polite">
                    <p className="ma-verdict-label">The answer</p>
                    <div key={verdict} className="ma-verdict-in">
                        <p className="ma-verdict-title">{v.title}</p>
                        <p className="ma-verdict-text">{v.text}</p>
                    </div>
                    {(stays.length > 0 || moves.length > 0) && (
                        <dl className="ma-verdict-split">
                            <div>
                                <dt>Stays in Moodle</dt>
                                <dd>{stays.length ? stays.map((u) => <span key={u.id}>{u.short}</span>) : <em>Nothing</em>}</dd>
                            </div>
                            <div>
                                <dt>Moves to an exam tool</dt>
                                <dd>{moves.length ? moves.map((u) => <span key={u.id}>{u.short}</span>) : <em>Nothing</em>}</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </div>
            <figcaption>Starts with a common case: a school or institute that teaches one subject’s courses in Moodle and gives weekly tests and mocks.</figcaption>
        </figure>
    );
}

// ── moodle-support ──────────────────────────────────────────────────────────

const AXIS_START = Date.UTC(2024, 9, 1);
const AXIS_END = Date.UTC(2027, 11, 31);
/** Year starts and mid-years; phones show only the years. */
const TICKS: [number, number][] = [
    [2025, 0],
    [2025, 6],
    [2026, 0],
    [2026, 6],
    [2027, 0],
    [2027, 6],
];

const utc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const pos = (ms: number) => `${(Math.min(Math.max(ms, AXIS_START), AXIS_END) - AXIS_START) / (AXIS_END - AXIS_START) * 100}%`;
const shortDate = (iso: string) => longDate(iso).replace(/ \d{4}$/, '').replace(/(\d+) (\w{3})\w*/, '$1 $2');

function useToday() {
    const [today, setToday] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setToday(Date.now()), 3_600_000);
        return () => window.clearInterval(id);
    }, []);
    return today;
}

function SupportCalendar() {
    const today = useToday();
    const rows = MOODLE_RELEASES.map((r) => {
        const general = utc(r.general);
        const security = utc(r.security);
        const days = Math.ceil((security - today) / 86_400_000);
        const status =
            today > security
                ? { tone: 'gray', text: 'Ended' }
                : today > general
                  ? days <= 31
                      ? { tone: 'red', text: `Ends ${shortDate(r.security)}` }
                      : { tone: 'orange', text: 'Security only' }
                  : { tone: 'green', text: 'Supported' };
        return { r, general, security, status };
    });
    const due = utc(MOODLE_NEXT_LTS.due);
    const todayInRange = today >= AXIS_START && today <= AXIS_END;

    return (
        <figure className="ma-widget">
            <div className="ma-panel">
                <div className="ma-panel-head">
                    <div>
                        <p className="ma-panel-title">Moodle’s support calendar</p>
                        <p className="ma-panel-sub">Bug and security fixes, then security fixes only</p>
                    </div>
                    <div className="ma-legend" aria-hidden="true">
                        <span>
                            <i className="is-full" /> Bug and security fixes
                        </span>
                        <span>
                            <i className="is-sec" /> Security only
                        </span>
                    </div>
                </div>
                <div className="ma-gantt" role="img" aria-label={`Moodle support: ${rows.map(({ r }) => `${r.version}${r.lts ? ' LTS' : ''} gets bug fixes until ${longDate(r.general)} and security fixes until ${longDate(r.security)}`).join('; ')}. Moodle ${MOODLE_NEXT_LTS.version} is due ${longDate(MOODLE_NEXT_LTS.due)}.`}>
                    <div className="ma-gantt-axis" aria-hidden="true">
                        {TICKS.map(([y, m]) => (
                            <span key={`${y}-${m}`} className={m ? 'is-mid' : undefined} style={{ left: pos(Date.UTC(y, m, 1)) }}>
                                {m ? 'Jul' : (
                                    <>
                                        <small>Jan </small>
                                        {y}
                                    </>
                                )}
                            </span>
                        ))}
                    </div>
                    {rows.map(({ r, general, security, status }) => (
                        <div className="ma-gantt-row" key={r.version} aria-hidden="true">
                            <div className="ma-gantt-label">
                                <b>
                                    {r.version}
                                    {r.lts && <small>LTS</small>}
                                </b>
                                <span className="ma-status" data-tone={status.tone}>
                                    {status.text}
                                </span>
                            </div>
                            <div className="ma-gantt-track">
                                <i className="is-full" style={{ left: pos(utc(r.released)), width: `calc(${pos(general)} - ${pos(utc(r.released))})` }} />
                                <i className="is-sec" style={{ left: pos(general), width: `calc(${pos(security)} - ${pos(general)})` }} />
                            </div>
                        </div>
                    ))}
                    <div className="ma-gantt-row" aria-hidden="true">
                        <div className="ma-gantt-label">
                            <b>
                                {MOODLE_NEXT_LTS.version}
                                <small>LTS</small>
                            </b>
                            <span className="ma-status" data-tone="blue">
                                {today < due ? `Due ${shortDate(MOODLE_NEXT_LTS.due)}` : 'Released'}
                            </span>
                        </div>
                        <div className="ma-gantt-track">
                            <i className="is-due" style={{ left: pos(due) }} />
                        </div>
                    </div>
                    {todayInRange && (
                        <div className="ma-gantt-today" style={{ ['--x' as string]: pos(today) } as CSSProperties} aria-hidden="true">
                            <span>Today</span>
                        </div>
                    )}
                </div>
            </div>
            <figcaption>Dates from Moodle’s release page, checked 2 October 2026. A long-term support (LTS) version gets security fixes for three years.</figcaption>
        </figure>
    );
}

// ── moodle-marking ──────────────────────────────────────────────────────────

/** QuestionCard's MarkField (src/components/test-builder/QuestionCard.tsx), read-only. */
function MarkField({ label, value, tone }: { label: string; value: string; tone: 'plus' | 'minus' }) {
    return (
        <span className="flex h-9 items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1 text-[12.5px] font-medium text-slate-600">
            {label}
            <span className="flex h-7 items-center rounded-full bg-white px-1.5 shadow-sm ring-1 ring-slate-900/[0.06]">
                <span className={`text-[13px] font-bold ${tone === 'plus' ? 'text-emerald-600' : 'text-red-600'}`}>{tone === 'plus' ? '+' : '−'}</span>
                <span key={value} className={`ma-mark w-8 text-center text-[14px] font-bold tabular-nums ${tone === 'plus' ? 'text-slate-900' : 'text-red-600'}`}>
                    {value}
                </span>
            </span>
        </span>
    );
}

function Stepper({ label, value, display, onChange, step, min, max }: { label: string; value: number; display: string; onChange: (v: number) => void; step: number; min: number; max: number }) {
    const round = (n: number) => Math.round(n * 100) / 100;
    return (
        <div className="ma-stepper-row">
            <span className="ma-stepper-label">{label}</span>
            <output className="ma-stepper-value" aria-live="polite">
                {display}
            </output>
            <div className="ma-stepper" role="group" aria-label={label}>
                <button type="button" aria-label={`Less: ${label}`} disabled={value <= min} onClick={() => onChange(round(Math.max(min, value - step)))}>
                    <Minus aria-hidden="true" />
                </button>
                <i aria-hidden="true" />
                <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(round(Math.min(max, value + step)))}>
                    <Plus aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

function MarkingConverter() {
    const [preset, setPreset] = useState<string | null>('neet');
    const [right, setRight] = useState(4);
    const [wrong, setWrong] = useState(1);
    const m = useMemo(() => moodleMatch(right, wrong), [right, wrong]);

    const choose = (id: string) => {
        const p = MARKING_PRESETS.find((x) => x.id === id);
        if (!p) return;
        setPreset(id);
        setRight(p.right);
        setWrong(p.wrong);
    };

    const tooBig = wrong > right;
    const grade = wrong === 0 ? 'None' : `−${moodlePercent(m.fraction)}`;
    // Example sitting: 100 questions, 70 right, 20 wrong, 10 skipped.
    const moodleScore = 70 * right - 20 * m.penalty;
    const testozaScore = 70 * right - 20 * wrong;
    const differs = Math.abs(moodleScore - testozaScore) > 0.004;

    return (
        <figure className="ma-widget">
            <div className="ma-panel ma-marking">
                <div className="ma-chips" role="group" aria-label="Exam">
                    {MARKING_PRESETS.map((p) => (
                        <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => choose(p.id)}>
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="ma-steppers">
                    <Stepper
                        label="Right answer"
                        value={right}
                        display={`+${num(right)}`}
                        step={0.5}
                        min={0.5}
                        max={10}
                        onChange={(v) => {
                            setPreset(null);
                            setRight(v);
                            if (wrong > v) setWrong(v);
                        }}
                    />
                    <Stepper
                        label="Wrong answer"
                        value={wrong}
                        display={wrong ? `−${num(wrong)}` : '0'}
                        step={0.25}
                        min={0}
                        max={right}
                        onChange={(v) => {
                            setPreset(null);
                            setWrong(v);
                        }}
                    />
                </div>

                <div className="ma-compare2">
                    <div className="ma-side">
                        <p className="ma-side-title">In Moodle</p>
                        <dl className="ma-kv">
                            <div>
                                <dt>Question mark</dt>
                                <dd>{num(right)}</dd>
                            </div>
                            <div>
                                <dt>Grade of each wrong option</dt>
                                <dd key={grade} className="ma-pop">
                                    {grade}
                                </dd>
                            </div>
                            <div>
                                <dt>Question behaviour</dt>
                                <dd>{wrong ? 'Deferred feedback' : 'Any'}</dd>
                            </div>
                        </dl>
                        {wrong === 0 ? (
                            <p className="ma-verdict-line" data-ok="true">
                                <Check aria-hidden="true" /> No negative marking needed.
                            </p>
                        ) : m.exact ? (
                            <p className="ma-verdict-line" data-ok="true">
                                <Check aria-hidden="true" /> {moodlePercent(m.fraction)} is in Moodle’s list of grades.
                            </p>
                        ) : (
                            <p className="ma-verdict-line" data-ok="false">
                                <TriangleAlert aria-hidden="true" />
                                {tooBig
                                    ? 'Moodle can take off at most the question’s own mark (−100%).'
                                    : `${moodlePercent(m.wanted)} isn’t in Moodle’s list. The closest, −${moodlePercent(m.fraction)}, takes off ${num(m.penalty)} instead of ${num(wrong)}.`}
                            </p>
                        )}
                    </div>
                    <div className="ma-side">
                        <p className="ma-side-title">In TestoZa</p>
                        <div className="ma-screen ma-markfields">
                            <MarkField label="Marks" tone="plus" value={num(right)} />
                            <MarkField label="Wrong" tone="minus" value={num(wrong)} />
                        </div>
                        <p className="ma-side-note">Two numbers on the question card. New questions copy them, so a whole paper is set once.</p>
                        <p className="ma-verdict-line" data-ok="true">
                            <Check aria-hidden="true" /> Exactly your exam’s scheme.
                        </p>
                    </div>
                </div>

                <div className="ma-example">
                    <p>
                        <b>Example:</b> 100 questions, 70 right, 20 wrong, 10 skipped.
                    </p>
                    <dl>
                        <div>
                            <dt>Moodle</dt>
                            <dd data-off={differs || undefined}>{num(moodleScore)}</dd>
                        </div>
                        <div>
                            <dt>TestoZa</dt>
                            <dd>{num(testozaScore)}</dd>
                        </div>
                    </dl>
                </div>
            </div>
            <figcaption>
                Moodle’s answer grades come from a fixed list in its source code (100%, 90%, 83.33333%, 80%, 75% … 5%). For single-answer questions, negative grades only count with the Deferred feedback behaviour.
            </figcaption>
        </figure>
    );
}

export default function MoodleWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'moodle-audit':
            return <Audit />;
        case 'moodle-support':
            return <SupportCalendar />;
        case 'moodle-exam-room':
            return <ExamRoomDemo />;
        case 'moodle-marking':
            return <MarkingConverter />;
        default:
            return null;
    }
}
