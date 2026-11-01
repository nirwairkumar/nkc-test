/**
 * bank-patterns: pick a bank paper and see it as a mock has to copy it — the sections, the
 * clock each one gets, what a question in it is worth, what a wrong answer costs, the
 * languages, whether the stage counts towards the merit list, and the TestoZa settings that
 * reproduce it.
 *
 * Size: two columns from 760 px; on phones one column that scrolls inside --bk-fit-h.
 */
import { useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { PATTERNS, marksLabel, perQuestionMarks, perQuestionNegative } from '@/guides/bankData';
import { DemoFrame, useWidth } from './replica';

/** "36 s", "1 min 12 s". */
const perQuestionTime = (seconds: number) => {
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

    // The lightest and heaviest question in the paper, and its tightest section.
    const per = p.sections.map(perQuestionMarks);
    const low = Math.min(...per);
    const high = Math.max(...per);
    const tightest = p.sections.reduce((b, s) => ((s.minutes * 60) / s.questions < (b.minutes * 60) / b.questions ? s : b), p.sections[0]);
    // "1" or "0.857–1.143"; the long form needs a smaller size to stay on one line.
    const worth = low === high ? marksLabel(low) : `${marksLabel(low)}–${marksLabel(high)}`;

    return (
        <DemoFrame id="bank-patterns" title="Bank papers, and how to set each one up" tip={<span key={p.id}>{p.note}</span>} wide="md">
            <div ref={bodyRef} className={`bk-pt${wide ? ' is-wide' : ''}`}>
                <div className="bk-chips" role="group" aria-label="Exam">
                    {PATTERNS.map((x) => (
                        <button key={x.id} type="button" aria-pressed={x.id === p.id} onClick={() => setId(x.id)}>
                            {x.label}
                        </button>
                    ))}
                </div>
                <div className="bk-pt-grid" key={p.id}>
                    <section className="bk-pt-card" aria-label="The paper">
                        <p className="bk-pt-name">{p.name}</p>
                        <p className="bk-pt-sub">
                            {questions} questions · {marks} marks · {p.minutes} minutes · a clock per section
                        </p>
                        <div className="bk-pt-bar" aria-hidden="true">
                            {p.sections.map((s, i) => (
                                <span key={s.name} style={{ flexGrow: s.minutes }}>
                                    <b>{s.minutes} min</b>
                                    <small>{s.name}</small>
                                    {i < p.sections.length - 1 && <Lock className="bk-pt-lock" />}
                                </span>
                            ))}
                        </div>
                        <ul className="bk-pt-list">
                            {p.sections.map((s) => (
                                <li key={s.name}>
                                    <span className="bk-pt-sec">
                                        {s.name}
                                        {s.note && <em>{s.note}</em>}
                                    </span>
                                    <span className="bk-pt-stats">
                                        <i>{s.questions} Q</i>
                                        <i>{s.marks} marks</i>
                                        <i>{s.minutes} min</i>
                                        <b>
                                            +{marksLabel(perQuestionMarks(s))}
                                            <em> / −{marksLabel(perQuestionNegative(s))}</em>
                                        </b>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {p.extra && <p className="bk-pt-extra">{p.extra}</p>}
                    </section>
                    <section className="bk-pt-side" aria-label="Marking and setup">
                        <dl className="bk-pt-facts">
                            <div>
                                <dt>A question is worth</dt>
                                <dd className={`is-plus${worth.length > 8 ? ' is-long' : ''}`}>{worth}</dd>
                            </div>
                            <div>
                                <dt>A wrong answer</dt>
                                <dd className="is-minus">−¼ of it</dd>
                            </div>
                            <div>
                                <dt>Tightest section</dt>
                                <dd>{perQuestionTime((tightest.minutes * 60) / tightest.questions)}</dd>
                            </div>
                        </dl>
                        <p className="bk-pt-lang">
                            Five options a question. {p.languages}.
                        </p>
                        <p className="bk-pt-counts">{p.counts}</p>
                        <p className="bk-mini-label">In TestoZa</p>
                        <ul className="bk-pt-setup">
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
