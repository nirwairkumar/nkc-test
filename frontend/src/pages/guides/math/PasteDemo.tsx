/**
 * math-paste: one formula, four ways onto a student's phone. Typed flat into a form
 * field, copied out of a PDF, pasted as a screenshot (a real 1× PNG of the typeset
 * formula, so zooming really blurs it), and typeset as TestoZa's exam screen draws it.
 * The reader zooms (1× to 3×, like pinching a phone) and turns dark mode on; a checklist
 * says what each way costs the student.
 *
 * Size: from 720 px the phone card sits beside the controls; narrower, the controls go
 * on top in one row and the checklist under the card. The card scrolls sideways when a
 * zoomed formula is wider than the phone, as a phone would.
 */
import { useRef, useState, type ReactNode } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { QUADRATIC } from '@/guides/mathData';
import { DemoFrame, UiSwitch, useWidth } from './replica';
import { Tex } from './tex';

type Way = 'typed' | 'pdf' | 'shot' | 'testoza';
type Mark = 'yes' | 'no' | 'partly';

const WAYS: { id: Way; label: string; short: string; sub: string; bytes: number }[] = [
    { id: 'typed', label: 'Typed into a form', short: 'Typed', sub: 'Carets and slashes', bytes: new TextEncoder().encode(QUADRATIC.typed).length },
    { id: 'pdf', label: 'Copied from a PDF', short: 'From PDF', sub: 'Pasted as text', bytes: new TextEncoder().encode(QUADRATIC.pdf).length },
    { id: 'shot', label: 'Pasted as a screenshot', short: 'Picture', sub: 'An image file', bytes: 2620 },
    { id: 'testoza', label: 'Typeset in TestoZa', short: 'TestoZa', sub: 'LaTeX, drawn as text', bytes: new TextEncoder().encode(QUADRATIC.tex).length },
];

const CHECKS: { label: string; v: Record<Way, Mark> }[] = [
    { label: 'Clear what is divided by what', v: { typed: 'partly', pdf: 'no', shot: 'yes', testoza: 'yes' } },
    { label: 'Sharp when the student zooms in', v: { typed: 'yes', pdf: 'yes', shot: 'no', testoza: 'yes' } },
    { label: 'Fits dark mode', v: { typed: 'yes', pdf: 'yes', shot: 'no', testoza: 'yes' } },
    { label: 'Fix a typo in seconds', v: { typed: 'yes', pdf: 'yes', shot: 'no', testoza: 'yes' } },
    { label: 'Read out by a screen reader', v: { typed: 'partly', pdf: 'no', shot: 'no', testoza: 'yes' } },
];

const ZOOMS = [1, 1.5, 2, 3];

function MarkIcon({ mark }: { mark: Mark }) {
    return (
        <span className="mt-paste-mark" data-mark={mark} aria-label={mark === 'yes' ? 'Yes' : mark === 'no' ? 'No' : 'Partly'}>
            {mark === 'yes' ? <Check aria-hidden="true" /> : mark === 'no' ? <X aria-hidden="true" /> : <Minus aria-hidden="true" />}
        </span>
    );
}

export default function PasteDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 720;
    const [way, setWay] = useState<Way>('typed');
    const [zoom, setZoom] = useState(1);
    const [dark, setDark] = useState(false);
    const [shotW, setShotW] = useState(0);

    const restart = () => {
        setWay('typed');
        setZoom(1);
        setDark(false);
    };

    const size = 18 * zoom;
    let formula: ReactNode;
    if (way === 'typed') formula = <span className="mt-paste-typed" style={{ fontSize: size }}>{QUADRATIC.typed}</span>;
    else if (way === 'pdf') formula = <span className="mt-paste-pdf" style={{ fontSize: size }}>{QUADRATIC.pdf}</span>;
    else if (way === 'shot')
        formula = <img className="mt-paste-shot" src={QUADRATIC.screenshot} alt="A screenshot of the quadratic formula" onLoad={(e) => setShotW(e.currentTarget.naturalWidth)} style={shotW ? { width: shotW * zoom } : undefined} />;
    else formula = <Tex className="mt-paste-tex" tex={QUADRATIC.tex} plain="x = (−b ± √(b² − 4ac)) / 2a" display={false} />;

    const tip =
        way === 'typed' ? (
            <span key="a">Is “/ 2a” over 2a, or over 2 and then times a? The student has to guess.</span>
        ) : way === 'pdf' ? (
            <span key="b">Copied out of a PDF: the square dropped to the line, the root sign and fraction bar are gone.</span>
        ) : way === 'shot' ? (
            zoom < 2 ? (
                <span key="c">Looks fine at 1×. Now zoom to 3×, then turn dark mode on.</span>
            ) : (
                <span key="d">Blurred at {zoom}×{dark ? ', and a white box on a dark screen' : '. Try dark mode too'}.</span>
            )
        ) : (
            <span key="e">Real text: sharp at {zoom}×, and it follows dark mode.</span>
        );

    const current = WAYS.find((w) => w.id === way)!;

    const card = (
        <div className={`mt-paste-card${dark ? ' is-dark' : ''}`} role="group" aria-label="A question on a student’s phone">
            <p className="mt-paste-q">
                <b>Question 3</b>
                <span>Single choice</span>
            </p>
            <p className="mt-paste-ask">The roots of ax² + bx + c = 0 are given by</p>
            <div className="mt-paste-formula" key={way}>
                {way === 'testoza' ? <span style={{ fontSize: size }}>{formula}</span> : formula}
            </div>
            <p className="mt-paste-size">
                The phone downloads <b>{current.bytes.toLocaleString('en-IN')} bytes</b> for this formula
            </p>
        </div>
    );

    const ways = wide ? (
        <div className="mt-paste-ways" role="radiogroup" aria-label="How the formula got into the test">
            {WAYS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={way === w.id} onClick={() => setWay(w.id)}>
                    <b>{w.label}</b>
                    <small>{w.sub}</small>
                </button>
            ))}
        </div>
    ) : (
        <div className="mt-seg mt-seg--full" style={{ ['--n' as string]: 4, ['--i' as string]: WAYS.findIndex((w) => w.id === way) }} role="radiogroup" aria-label="How the formula got into the test">
            {WAYS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={way === w.id} aria-pressed={way === w.id} onClick={() => setWay(w.id)}>
                    {w.short}
                </button>
            ))}
        </div>
    );

    const view = (
        <div className="mt-paste-view">
            <div className="mt-seg" style={{ ['--n' as string]: ZOOMS.length, ['--i' as string]: ZOOMS.indexOf(zoom) }} role="group" aria-label="Zoom">
                {ZOOMS.map((z) => (
                    <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)} className={way === 'shot' && zoom === 1 && z === 3 ? 'mt-nudge-text' : undefined}>
                        {z}×
                    </button>
                ))}
            </div>
            <label className="mt-paste-dark">
                <span>Dark mode</span>
                <UiSwitch checked={dark} onChange={setDark} label="Dark mode" />
            </label>
        </div>
    );

    const checks = (
        <ul className="mt-paste-checks" aria-label={`What “${current.label}” costs the student`}>
            {CHECKS.map((c) => (
                <li key={c.label}>
                    <MarkIcon mark={c.v[way]} />
                    {c.label}
                </li>
            ))}
        </ul>
    );

    return (
        <DemoFrame title="One formula, four ways" tip={tip} onRestart={restart} wide="md" caption="The screenshot is a real 1× image of the typeset formula, so zooming blurs it exactly as it would on a phone. The TestoZa version is drawn with KaTeX, as the exam screen draws it.">
            <div ref={bodyRef} className={`mt-paste${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <div className="mt-paste-stage">
                            {card}
                            {checks}
                        </div>
                        <aside className="mt-paste-side" aria-label="Demo controls">
                            <p className="mt-mini-label">How it got into the test</p>
                            {ways}
                            <p className="mt-mini-label">On the phone</p>
                            {view}
                        </aside>
                    </>
                ) : (
                    <>
                        {ways}
                        {view}
                        <div className="mt-paste-stage">
                            {card}
                            {checks}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
