/**
 * bank-cutoff: the thing that surprises candidates coming to banking from other exams. In
 * IBPS papers a candidate has to reach a qualifying mark in every section as well as the
 * overall cut-off, so a comfortable total with one weak section is still a rejection; SBI's
 * prelims is reported to have no sectional cut-off, so the same answer sheet can pass one
 * exam and fail the other.
 *
 * Move a candidate's marks and each section's qualifying mark and the verdict changes. The
 * starting figures come from guides/bankData (CUTOFF_SECTIONS, CUTOFF_OVERALL): 7 + 25 + 28
 * out of 100, nine marks clear of the overall cut-off and rejected on English.
 *
 * Size: steppers and the verdict side by side from 760 px; one column that scrolls inside
 * --bk-fit-h on phones. No clock, nothing animated.
 */
import { useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { CUTOFF_OVERALL, CUTOFF_SECTIONS } from '@/guides/bankData';
import { DemoFrame, useWidth } from './replica';

interface Row {
    score: number;
    cutoff: number;
}

const START: Row[] = CUTOFF_SECTIONS.map((s) => ({ score: s.score, cutoff: s.cutoff }));
const MAX = CUTOFF_SECTIONS.reduce((a, s) => a + s.questions, 0);

export default function CutoffLab() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [rows, setRows] = useState(START);
    const [overall, setOverall] = useState(CUTOFF_OVERALL);
    const [sectionalOn, setSectionalOn] = useState(true);

    const set = (i: number, key: keyof Row, delta: number) =>
        setRows((rs) => rs.map((r, k) => (k !== i ? r : { ...r, [key]: Math.min(CUTOFF_SECTIONS[k].questions, Math.max(0, r[key] + delta)) })));

    const total = rows.reduce((a, r) => a + r.score, 0);
    const failed = CUTOFF_SECTIONS.filter((_, i) => sectionalOn && rows[i].score < rows[i].cutoff).map((s) => s.short);
    const clearsOverall = total >= overall;
    const qualifies = clearsOverall && failed.length === 0;

    const tip = qualifies ? (
        <span key="ok">
            Through: {total} out of {MAX}, and every section above its qualifying mark.
        </span>
    ) : !clearsOverall ? (
        <span key="tot">
            Rejected on the total: {total} against an overall cut-off of {overall}.
        </span>
    ) : (
        <span key="sec">
            {total} marks, {total - overall} clear of the overall cut-off — and rejected on {failed.join(' and ')}.
        </span>
    );

    const stepper = (i: number, key: keyof Row, label: string) => (
        <div className="bk-stepper" role="group" aria-label={`${CUTOFF_SECTIONS[i].name}: ${label}`}>
            <button type="button" onClick={() => set(i, key, -1)} aria-label={`Less ${label}`}>
                <Minus />
            </button>
            <i aria-hidden="true" />
            <button type="button" onClick={() => set(i, key, 1)} aria-label={`More ${label}`}>
                <Plus />
            </button>
        </div>
    );

    return (
        <DemoFrame
            id="cutoff-lab"
            title="Sectional cut-offs: the total is not the verdict"
            tip={tip}
            onRestart={() => {
                setRows(START);
                setOverall(CUTOFF_OVERALL);
                setSectionalOn(true);
            }}
            wide="md"
        >
            <div ref={bodyRef} className={`bk-cut${wide ? ' is-wide' : ''}`}>
                <div className="bk-cut-main">
                    <div className="bk-seg bk-seg--full" style={{ ['--n' as string]: 2, ['--i' as string]: sectionalOn ? 0 : 1 }} role="group" aria-label="Which rules apply">
                        <button type="button" aria-pressed={sectionalOn} onClick={() => setSectionalOn(true)}>
                            IBPS: sections + total
                        </button>
                        <button type="button" aria-pressed={!sectionalOn} onClick={() => setSectionalOn(false)}>
                            SBI prelims: total only
                        </button>
                    </div>
                    <ul className="bk-cut-list">
                        {CUTOFF_SECTIONS.map((s, i) => {
                            const r = rows[i];
                            const bad = sectionalOn && r.score < r.cutoff;
                            return (
                                <li key={s.name} data-bad={bad || undefined}>
                                    <p className="bk-cut-name">
                                        <b>{s.name}</b>
                                        <small>
                                            {r.score} of {s.questions} marks
                                            {sectionalOn ? ` · needs ${r.cutoff}` : ''}
                                        </small>
                                    </p>
                                    <div className="bk-cut-track" aria-hidden="true">
                                        <i className="bk-cut-fill" style={{ width: `${(r.score / s.questions) * 100}%` }} />
                                        {sectionalOn && <i className="bk-cut-mark" style={{ left: `${(r.cutoff / s.questions) * 100}%` }} />}
                                    </div>
                                    <div className="bk-cut-ctl">
                                        <span className="bk-cut-label">Marks</span>
                                        {stepper(i, 'score', 'marks')}
                                    </div>
                                    {sectionalOn && (
                                        <div className="bk-cut-ctl">
                                            <span className="bk-cut-label">Cut-off</span>
                                            {stepper(i, 'cutoff', 'qualifying mark')}
                                        </div>
                                    )}
                                    <span className="bk-cut-flag" aria-hidden="true">
                                        {sectionalOn ? bad ? <X /> : <Check /> : null}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <aside className="bk-cut-side" aria-label="The verdict">
                    <p className="bk-cut-total">
                        <b>
                            {total}
                            <small>/{MAX}</small>
                        </b>
                        <span>total marks</span>
                    </p>
                    <div className="bk-cut-overall">
                        <span className="bk-cut-label">Overall cut-off</span>
                        <b>{overall}</b>
                        <div className="bk-stepper" role="group" aria-label="Overall cut-off">
                            <button type="button" onClick={() => setOverall((v) => Math.max(0, v - 1))} aria-label="Lower the overall cut-off">
                                <Minus />
                            </button>
                            <i aria-hidden="true" />
                            <button type="button" onClick={() => setOverall((v) => Math.min(MAX, v + 1))} aria-label="Raise the overall cut-off">
                                <Plus />
                            </button>
                        </div>
                    </div>
                    <p className="bk-cut-verdict" data-tone={qualifies ? 'go' : 'stop'} aria-live="polite">
                        <b>{qualifies ? 'Qualifies' : 'Rejected'}.</b>{' '}
                        {qualifies
                            ? sectionalOn
                                ? 'Every section is above its qualifying mark and the total clears the overall cut-off.'
                                : 'Only the total matters here, and it clears.'
                            : !clearsOverall
                              ? `The total is ${overall - total} mark${overall - total === 1 ? '' : 's'} short of the overall cut-off.`
                              : `${failed.join(' and ')} ${failed.length > 1 ? 'are' : 'is'} below the qualifying mark, so the ${total - overall}-mark cushion on the total counts for nothing.`}
                    </p>
                    <p className="bk-cut-note">
                        Cut-offs are published after the exam and move every year, state and category. Set the ones you will hold your own batch to, and read each candidate’s weakest
                        section first.
                    </p>
                </aside>
            </div>
        </DemoFrame>
    );
}
