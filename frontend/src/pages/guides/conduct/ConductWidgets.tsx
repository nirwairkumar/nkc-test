/**
 * Interactive parts of /how-to-conduct-online-exam. Crawlers get each widget's
 * fallbackHtml from src/guides/conductOnlineExam.ts instead.
 *
 *   conduct-planner    four answers (stakes, place, devices, size) → a setup
 *   conduct-new-exam   NewExamDemo.tsx: the New exam sheet, playable
 *   conduct-rules      RulesDemo.tsx: exam rules tried from the candidate's phone
 *   conduct-exam-day   ExamDayDemo.tsx: the exam room and a candidate's phone, live
 *   conduct-checklist  the exam controller's checklist (ticks stay in this browser)
 */
import { useEffect, useMemo, useState } from 'react';
import { type LucideIcon, BadgeCheck, BookOpen, Check, ClipboardList, Clock, GraduationCap, KeyRound, Minus, Play, Plus, RotateCcw, Send, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import type { GuideWidget } from '@/guides/types';
import { CHECKLIST } from '@/guides/conductData';
import NewExamDemo from './NewExamDemo';
import RulesDemo from './RulesDemo';
import ExamDayDemo from './ExamDayDemo';

/* ── conduct-planner ───────────────────────────────────────────────────── */

type Stakes = 'practice' | 'class' | 'mock' | 'selection';
type Place = 'room' | 'rooms' | 'home';
type Devices = 'phones' | 'computers' | 'both';

const STAKES: {
    id: Stakes;
    label: string;
    hint: string;
    icon: LucideIcon;
    tone: string;
}[] = [
    {
        id: 'practice',
        label: 'Practice',
        hint: 'Homework, revision, a quick check',
        icon: BookOpen,
        tone: 'orange',
    },
    {
        id: 'class',
        label: 'Class or weekly test',
        hint: 'Marks matter, nothing is decided',
        icon: ClipboardList,
        tone: 'blue',
    },
    {
        id: 'mock',
        label: 'Full mock or term exam',
        hint: 'Ranks go to candidates and parents',
        icon: GraduationCap,
        tone: 'purple',
    },
    {
        id: 'selection',
        label: 'Admission or hiring',
        hint: 'The result decides a seat or a job',
        icon: BadgeCheck,
        tone: 'red',
    },
];

const SIZES = [10, 30, 60, 120, 250, 500];

interface Advice {
    icon: LucideIcon;
    tone: string;
    label: string;
    value: string;
    why: string;
}

function plan(stakes: Stakes, place: Place, devices: Devices, size: number): { title: string; rows: Advice[]; warn: string | null; note: string | null } {
    const where = place === 'room' ? 'in one room' : place === 'rooms' ? 'across several rooms' : 'at home';
    const kind = {
        practice: 'A practice test',
        class: 'A class test',
        mock: 'A full mock',
        selection: 'A selection exam',
    }[stakes];
    const rows: Advice[] = [];

    if (stakes === 'practice') {
        rows.push({
            icon: KeyRound,
            tone: 'blue',
            label: 'Getting in',
            value: 'A test link',
            why: 'Share it in the class group. No code, lobby or batch needed.',
        });
        rows.push({
            icon: Play,
            tone: 'green',
            label: 'Start',
            value: 'Any time',
            why: 'Add a start and end time only if it must close.',
        });
    } else {
        const pin = stakes === 'mock' || stakes === 'selection';
        const late = place === 'room' ? 5 : place === 'rooms' ? 10 : 15;
        rows.push({
            icon: KeyRound,
            tone: 'blue',
            label: 'Getting in',
            value: pin ? 'Join code + roll number + PIN' : 'Join code + roll number',
            why: pin ? 'PIN slips stop anyone sitting the exam for a friend.' : 'Names fill in from your batch list, so the rank list is clean.',
        });
        rows.push({
            icon: Play,
            tone: 'green',
            label: 'Start',
            value: `${place === 'room' ? 'I tap Start' : 'On time'} · ${late} min late entry`,
            why:
                place === 'room'
                    ? 'Start when the room is settled, not when the clock says.'
                    : place === 'home'
                      ? 'One start for everyone; home networks get a little longer to join.'
                      : 'Everyone starts at the same moment, in every room.',
        });
    }

    if (stakes === 'practice')
        rows.push({
            icon: ShieldCheck,
            tone: 'gray',
            label: 'Exam rules',
            value: 'Off',
            why: 'Rules on practice tests only annoy honest learners.',
        });
    else if (stakes === 'class')
        rows.push({
            icon: ShieldCheck,
            tone: 'orange',
            label: 'Exam rules',
            value: 'App-switch detection, warn only',
            why: 'See who leaves the exam without punishing an incoming call.',
        });
    else
        rows.push({
            icon: ShieldCheck,
            tone: 'red',
            label: 'Exam rules',
            value: 'Full screen, app switches, 3 warnings',
            why: devices === 'computers' ? 'Then the paper submits itself. Copy and paste off too.' : 'Then the paper submits itself. Try full screen on an iPhone in the dry run.',
        });

    rows.push(
        stakes === 'practice'
            ? {
                  icon: Send,
                  tone: 'indigo',
                  label: 'Results',
                  value: 'Right after each candidate submits',
                  why: 'Instant feedback is the point of practice.',
              }
            : stakes === 'selection'
              ? {
                    icon: Send,
                    tone: 'indigo',
                    label: 'Results',
                    value: 'When I release them',
                    why: 'Check the key and the warnings before anyone sees a mark.',
                }
              : {
                    icon: Send,
                    tone: 'indigo',
                    label: 'Results',
                    value: 'When the exam ends',
                    why: 'Stops answers leaking to candidates who are still writing.',
                },
    );

    if (stakes !== 'practice') {
        rows.push({
            icon: Users,
            tone: 'purple',
            label: 'On the day',
            value: place === 'room' ? 'You, with the exam room on your phone' : place === 'rooms' ? 'One person per room, one on the exam room' : 'One person on the exam room',
            why:
                size >= 120
                    ? `Before it: a dry run, then a 10-minute practice sitting so all ${size} try the code once.`
                    : place === 'home'
                      ? 'Before it: a dry run with three phones. Give candidates a number to call.'
                      : 'Before it: a dry run with three phones, two days ahead.',
        });
    }

    let warn: string | null = null;
    let note: string | null = null;
    if (stakes === 'selection' && place === 'home') warn = 'Nobody can see a candidate’s room. Browser rules show who left the exam; they can’t see a second phone. Hold a selection exam in a hall or lab.';
    else if (stakes === 'mock' && place === 'home') note = 'Fine for practice mocks. Treat home ranks as a guide, not a verdict.';
    else if (devices === 'both') note = 'Phones and computers behave differently. Rehearse on one of each.';
    return {
        title: `${kind} ${where}, for ${size} candidates`,
        rows,
        warn,
        note,
    };
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
    const i = Math.max(
        0,
        options.findIndex((o) => o.value === value),
    );
    return (
        <div className="co-seg co-seg--full" role="group" aria-label={label} style={{ ['--n' as string]: options.length, ['--i' as string]: i }}>
            {options.map((o) => (
                <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Planner() {
    const [stakes, setStakes] = useState<Stakes>('class');
    const [place, setPlace] = useState<Place>('room');
    const [devices, setDevices] = useState<Devices>('phones');
    const [sizeIndex, setSizeIndex] = useState(1);
    const size = SIZES[sizeIndex];
    const result = useMemo(() => plan(stakes, place, devices, size), [stakes, place, devices, size]);

    return (
        <figure className="co-widget co-wide">
            <div className="co-panel co-planner">
                <div className="co-planner-form">
                    <p className="co-group-h">What’s at stake</p>
                    <ul className="co-settings" role="radiogroup" aria-label="What’s at stake">
                        {STAKES.map((s) => {
                            const Icon = s.icon;
                            return (
                                <li key={s.id}>
                                    <button type="button" role="radio" aria-checked={stakes === s.id} onClick={() => setStakes(s.id)}>
                                        <span className="co-tile" data-tone={s.tone}>
                                            <Icon aria-hidden="true" />
                                        </span>
                                        <span className="co-settings-text">
                                            <b>{s.label}</b>
                                            <small>{s.hint}</small>
                                        </span>
                                        <Check className={`co-settings-check${stakes === s.id ? ' is-on' : ''}`} aria-hidden="true" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="co-group-h">Where candidates sit</p>
                    <Seg<Place>
                        value={place}
                        onChange={setPlace}
                        label="Where candidates sit"
                        options={[
                            { value: 'room', label: 'One room' },
                            { value: 'rooms', label: 'Several rooms' },
                            { value: 'home', label: 'At home' },
                        ]}
                    />

                    <p className="co-group-h">Their devices</p>
                    <Seg<Devices>
                        value={devices}
                        onChange={setDevices}
                        label="Their devices"
                        options={[
                            { value: 'phones', label: 'Phones' },
                            { value: 'computers', label: 'Computers' },
                            { value: 'both', label: 'Both' },
                        ]}
                    />

                    <p className="co-group-h">Candidates</p>
                    <div className="co-steppers">
                        <div className="co-stepper-row">
                            <span className="co-stepper-label">About</span>
                            <span key={size} className="co-stepper-value co-pop">
                                {size}
                            </span>
                            <div className="co-stepper">
                                <button type="button" aria-label="Fewer candidates" disabled={sizeIndex === 0} onClick={() => setSizeIndex((i) => Math.max(0, i - 1))}>
                                    <Minus aria-hidden="true" />
                                </button>
                                <i aria-hidden="true" />
                                <button type="button" aria-label="More candidates" disabled={sizeIndex === SIZES.length - 1} onClick={() => setSizeIndex((i) => Math.min(SIZES.length - 1, i + 1))}>
                                    <Plus aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="co-plan" aria-live="polite">
                    <p className="co-plan-label">Your setup</p>
                    <p key={result.title} className="co-plan-title co-swap">
                        {result.title}
                    </p>
                    <ul className="co-plan-rows">
                        {result.rows.map((r) => {
                            const Icon = r.icon;
                            return (
                                <li key={r.label}>
                                    <span className="co-tile co-tile--sm" data-tone={r.tone}>
                                        <Icon aria-hidden="true" />
                                    </span>
                                    <span className="co-plan-text">
                                        <small>{r.label}</small>
                                        <b key={r.value} className="co-swap">
                                            {r.value}
                                        </b>
                                        <span>{r.why}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    {result.warn && (
                        <p className="co-plan-warn">
                            <TriangleAlert aria-hidden="true" /> {result.warn}
                        </p>
                    )}
                    {result.note && (
                        <p className="co-plan-note">
                            <Clock aria-hidden="true" /> {result.note}
                        </p>
                    )}
                </div>
            </div>
            <figcaption>Suggestions, not rules: every setting can be changed per exam.</figcaption>
        </figure>
    );
}

/* ── conduct-checklist ─────────────────────────────────────────────────── */

const STORE = 'testoza.conduct-checklist.v1';
const TOTAL = CHECKLIST.reduce((n, g) => n + g.items.length, 0);

function readTicks(): Record<string, true> {
    try {
        const raw = window.localStorage.getItem(STORE);
        return raw ? (JSON.parse(raw) as Record<string, true>) : {};
    } catch {
        return {};
    }
}

function Checklist() {
    const [ticks, setTicks] = useState<Record<string, true>>({});
    useEffect(() => setTicks(readTicks()), []);
    useEffect(() => {
        try {
            window.localStorage.setItem(STORE, JSON.stringify(ticks));
        } catch {
            /* private mode: ticks last for this visit */
        }
    }, [ticks]);

    const done = Object.keys(ticks).length;
    const r = 15;
    const c = 2 * Math.PI * r;
    const toggle = (key: string) =>
        setTicks((t) => {
            const next = { ...t };
            if (next[key]) delete next[key];
            else next[key] = true;
            return next;
        });

    return (
        <figure className="co-widget co-wide">
            <div className="co-panel co-check">
                <div className="co-check-head">
                    <svg className="co-check-ring" viewBox="0 0 36 36" aria-hidden="true">
                        <circle className="bg" cx="18" cy="18" r={r} />
                        <circle className="fg" cx="18" cy="18" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - done / TOTAL)} />
                    </svg>
                    <div className="co-check-count">
                        <b>
                            {done} of {TOTAL} done
                        </b>
                        <span>{done === TOTAL ? 'Ready. Good luck on the day.' : 'Tap a circle to tick it.'}</span>
                    </div>
                    {done > 0 && (
                        <button type="button" className="co-restart" onClick={() => setTicks({})}>
                            <RotateCcw aria-hidden="true" /> <span>Clear</span>
                        </button>
                    )}
                </div>
                <div className="co-check-groups">
                    {CHECKLIST.map((g, gi) => (
                        <div key={g.when} className="co-check-group">
                            <p className="co-group-h">{g.when}</p>
                            <ul>
                                {g.items.map((item, ii) => {
                                    const key = `${gi}.${ii}`;
                                    const on = !!ticks[key];
                                    return (
                                        <li key={key}>
                                            <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(key)} className={on ? 'is-on' : undefined}>
                                                <i aria-hidden="true">{on && <Check />}</i>
                                                <span>{item}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </figure>
    );
}

export default function ConductWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'conduct-planner':
            return <Planner />;
        case 'conduct-new-exam':
            return <NewExamDemo />;
        case 'conduct-rules':
            return <RulesDemo />;
        case 'conduct-exam-day':
            return <ExamDayDemo />;
        case 'conduct-checklist':
            return <Checklist />;
        default:
            return null;
    }
}
