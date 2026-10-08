/**
 * ssc-patterns: pick an SSC exam and see its paper as a mock has to copy it: the sections,
 * how the clock works (a clock per section, per session, or one for the paper), marking,
 * time per question, languages, and the TestoZa settings that reproduce it.
 *
 * Size: two columns from 760 px; on phones one column that scrolls inside --sg-fit-h.
 */
import { useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { PATTERNS } from '@/guides/sscData';
import { DemoFrame, useWidth } from './replica';

/** "36 s", "1 min 12 s". */
const perQuestion = (seconds: number) => {
    const s = Math.round(seconds);
    return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}`;
};

export default function PatternExplorer() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [id, setId] = useState(PATTERNS[0].id);
    const p = PATTERNS.find((x) => x.id === id) ?? PATTERNS[0];
    const questions = p.sections.reduce((s, x) => s + x.questions, 0);
    const marks = p.sections.reduce((s, x) => s + x.marks, 0);

    // Blocks on the time bar: one per clock.
    const blocks =
        p.timing === 'sections'
            ? p.sections.map((s) => ({ label: s.name, minutes: s.minutes ?? 0, note: `${s.questions} Q` }))
            : p.timing === 'sessions'
              ? (p.sessions ?? []).map((s) => ({ label: s.name, minutes: s.minutes, note: s.sections.map((i) => p.sections[i].name.split(' ')[0]).join(' + ') }))
              : [{ label: 'One clock for the whole paper', minutes: p.minutes, note: 'Move between sections freely' }];

    const clockLine = p.timing === 'sections' ? 'A clock per section' : p.timing === 'sessions' ? 'A clock per session' : 'One clock';
    const pace = p.timing === 'sections' ? Math.min(...p.sections.map((s) => ((s.minutes ?? 0) * 60) / s.questions)) : (p.minutes * 60) / questions;

    return (
        <DemoFrame id="ssc-patterns" title="SSC papers, and how to set each one up" tip={<span key={p.id}>{p.note}</span>} wide="md">
            <div ref={bodyRef} className={`sg-pt${wide ? ' is-wide' : ''}`}>
                <div className="sg-chips" role="group" aria-label="Exam">
                    {PATTERNS.map((x) => (
                        <button key={x.id} type="button" aria-pressed={x.id === p.id} onClick={() => setId(x.id)}>
                            {x.label}
                        </button>
                    ))}
                </div>
                <div className="sg-pt-grid" key={p.id}>
                    <section className="sg-pt-card" aria-label="The paper">
                        <p className="sg-pt-name">{p.name}</p>
                        <p className="sg-pt-sub">
                            {questions} questions · {marks} marks · {p.minutes} minutes · {clockLine.toLowerCase()}
                        </p>
                        <div className={`sg-pt-bar is-${p.timing}`} aria-hidden="true">
                            {blocks.map((b, i) => (
                                <span key={i} style={{ flexGrow: b.minutes }}>
                                    <b>{b.minutes} min</b>
                                    <small>{b.label}</small>
                                    {p.timing !== 'one' && i < blocks.length - 1 && <Lock className="sg-pt-lock" />}
                                </span>
                            ))}
                        </div>
                        <ul className="sg-pt-list">
                            {p.sections.map((s) => (
                                <li key={s.name}>
                                    <span className="sg-pt-sec">
                                        {s.name}
                                        {s.note && <em>{s.note}</em>}
                                    </span>
                                    <span className="sg-pt-num">{s.questions} Q</span>
                                    <span className="sg-pt-num">{s.marks}</span>
                                    <span className="sg-pt-num">{s.minutes ? `${s.minutes} min` : p.timing === 'sessions' ? 'session' : 'shared'}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className="sg-pt-side" aria-label="Marking and setup">
                        <dl className="sg-pt-facts">
                            <div>
                                <dt>Right</dt>
                                <dd className="is-plus">{p.right}</dd>
                            </div>
                            <div>
                                <dt>Wrong</dt>
                                <dd className="is-minus">{p.wrong}</dd>
                            </div>
                            <div>
                                <dt>{p.timing === 'sections' ? 'Fastest section' : 'Per question'}</dt>
                                <dd>{perQuestion(pace)}</dd>
                            </div>
                        </dl>
                        <p className="sg-pt-lang">{p.languages}</p>
                        <p className="sg-mini-label">In TestoZa</p>
                        <ul className="sg-pt-setup">
                            {p.setup.map((s) => (
                                <li key={s.label}>
                                    <span>{s.label}</span>
                                    <b>{s.value}</b>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </DemoFrame>
    );
}
