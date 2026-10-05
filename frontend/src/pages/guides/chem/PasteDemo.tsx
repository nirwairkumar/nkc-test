/**
 * chem-paste: one reaction, four ways onto a student's phone. The line is from CBSE's
 * 2026-27 Class 12 Chemistry sample paper ("Complete and balance: Fe²⁺ + Cr₂O₇²⁻ + H⁺ →"):
 * typed flat into a form field, copied out of the paper's PDF (charges on the line, the
 * symbol-font arrow lost), pasted as a screenshot (a real 1× PNG of the typeset line, so
 * zooming really blurs it), and typeset as TestoZa's exam screen draws it. The reader zooms
 * (1× to 3×, like pinching a phone) and turns dark mode on; a checklist says what each way
 * costs the student.
 *
 * Size: from 720 px the phone card sits beside the controls; narrower, the controls go
 * on top in one row and the checklist under the card. The card scrolls sideways when a
 * zoomed formula is wider than the phone, as a phone would.
 */
import { useRef, useState, type ReactNode } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { DICHROMATE } from '@/guides/chemData';
import { DemoFrame, UiSwitch, useWidth } from './replica';
import { Tex } from './tex';

type Way = 'typed' | 'pdf' | 'shot' | 'testoza';
type Mark = 'yes' | 'no' | 'partly';

const bytes = (s: string) => new TextEncoder().encode(s).length;

const WAYS: { id: Way; label: string; short: string; sub: string; bytes: number }[] = [
    { id: 'typed', label: 'Typed into a form', short: 'Typed', sub: 'Carets and arrows', bytes: bytes(DICHROMATE.typed) },
    { id: 'pdf', label: 'Copied from the PDF', short: 'From PDF', sub: 'Pasted as text', bytes: bytes(DICHROMATE.pdf) },
    { id: 'shot', label: 'Pasted as a screenshot', short: 'Picture', sub: 'An image file', bytes: DICHROMATE.screenshotBytes },
    { id: 'testoza', label: 'Typeset in TestoZa', short: 'TestoZa', sub: 'mhchem, drawn as text', bytes: bytes(DICHROMATE.tex) },
];

const CHECKS: { label: string; v: Record<Way, Mark> }[] = [
    { label: 'Clear which numbers are charges', v: { typed: 'partly', pdf: 'no', shot: 'yes', testoza: 'yes' } },
    { label: 'The arrow survives', v: { typed: 'partly', pdf: 'no', shot: 'yes', testoza: 'yes' } },
    { label: 'Sharp when the student zooms in', v: { typed: 'yes', pdf: 'yes', shot: 'no', testoza: 'yes' } },
    { label: 'Fits dark mode', v: { typed: 'yes', pdf: 'yes', shot: 'no', testoza: 'yes' } },
    { label: 'Fix a wrong charge in seconds', v: { typed: 'yes', pdf: 'yes', shot: 'no', testoza: 'yes' } },
];

const ZOOMS = [1, 1.5, 2, 3];

function MarkIcon({ mark }: { mark: Mark }) {
    return (
        <span className="cq-paste-mark" data-mark={mark} aria-label={mark === 'yes' ? 'Yes' : mark === 'no' ? 'No' : 'Partly'}>
            {mark === 'yes' ? <Check aria-hidden="true" /> : mark === 'no' ? <X aria-hidden="true" /> : <Minus aria-hidden="true" />}
        </span>
    );
}

/** The PDF's arrow is a private-use character: most phones draw an empty box. */
function PdfLine({ text }: { text: string }) {
    const [before, after] = text.split('□');
    return (
        <>
            {before}
            <i className="cq-paste-tofu" aria-label="a missing character" />
            {after}
        </>
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
    if (way === 'typed') formula = <span className="cq-paste-typed" style={{ fontSize: size }}>{DICHROMATE.typed}</span>;
    else if (way === 'pdf')
        formula = (
            <span className="cq-paste-pdf" style={{ fontSize: size }}>
                <PdfLine text={DICHROMATE.pdf} />
            </span>
        );
    else if (way === 'shot')
        formula = <img className="cq-paste-shot" src={DICHROMATE.screenshot} alt="A screenshot of the reaction" onLoad={(e) => setShotW(e.currentTarget.naturalWidth)} style={shotW ? { width: shotW * zoom } : undefined} />;
    else formula = <Tex className="cq-paste-tex" tex={DICHROMATE.tex} plain={DICHROMATE.plain} display={false} />;

    const tip =
        way === 'typed' ? (
            <span key="a">Is “Fe^2+” iron(II)? Probably. But students now read carets and “-&gt;” under a timer.</span>
        ) : way === 'pdf' ? (
            <span key="b">Is “Fe2+” Fe²⁺ or Fe₂⁺? The 2− has left the ion, and the arrow is a box.</span>
        ) : way === 'shot' ? (
            zoom < 2 ? (
                <span key="c">Looks fine at 1×. Now zoom to 3×, then turn dark mode on.</span>
            ) : (
                <span key="d">Blurred at {zoom}×{dark ? ', and a white box on a dark screen' : '. Try dark mode too'}.</span>
            )
        ) : (
            <span key="e">Real text: sharp at {zoom}×, charges where they belong, and it follows dark mode.</span>
        );

    const current = WAYS.find((w) => w.id === way)!;

    const card = (
        <div className={`cq-paste-card${dark ? ' is-dark' : ''}`} role="group" aria-label="A question on a student’s phone">
            <p className="cq-paste-q">
                <b>Question 17</b>
                <span>2 marks</span>
            </p>
            <p className="cq-paste-ask">Complete and balance the following reaction:</p>
            <div className="cq-paste-formula" key={way}>
                {way === 'testoza' ? <span style={{ fontSize: size }}>{formula}</span> : formula}
            </div>
            <p className="cq-paste-size">
                The phone downloads <b>{current.bytes.toLocaleString('en-IN')} bytes</b> for this line
            </p>
        </div>
    );

    const ways = wide ? (
        <div className="cq-paste-ways" role="radiogroup" aria-label="How the reaction got into the test">
            {WAYS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={way === w.id} onClick={() => setWay(w.id)}>
                    <b>{w.label}</b>
                    <small>{w.sub}</small>
                </button>
            ))}
        </div>
    ) : (
        <div className="cq-seg cq-seg--full" style={{ ['--n' as string]: 4, ['--i' as string]: WAYS.findIndex((w) => w.id === way) }} role="radiogroup" aria-label="How the reaction got into the test">
            {WAYS.map((w) => (
                <button key={w.id} type="button" role="radio" aria-checked={way === w.id} aria-pressed={way === w.id} onClick={() => setWay(w.id)}>
                    {w.short}
                </button>
            ))}
        </div>
    );

    const view = (
        <div className="cq-paste-view">
            <div className="cq-seg" style={{ ['--n' as string]: ZOOMS.length, ['--i' as string]: ZOOMS.indexOf(zoom) }} role="group" aria-label="Zoom">
                {ZOOMS.map((z) => (
                    <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)} className={way === 'shot' && zoom === 1 && z === 3 ? 'cq-nudge-text' : undefined}>
                        {z}×
                    </button>
                ))}
            </div>
            <label className="cq-paste-dark">
                <span>Dark mode</span>
                <UiSwitch checked={dark} onChange={setDark} label="Dark mode" />
            </label>
        </div>
    );

    const checks = (
        <ul className="cq-paste-checks" aria-label={`What “${current.label}” costs the student`}>
            {CHECKS.map((c) => (
                <li key={c.label}>
                    <MarkIcon mark={c.v[way]} />
                    {c.label}
                </li>
            ))}
        </ul>
    );

    return (
        <DemoFrame title="One reaction, four ways" tip={tip} onRestart={restart} wide="md" caption="From CBSE’s Class 12 Chemistry sample paper for 2026-27. “From PDF” is what copying the paper’s text gives; the picture is a real 1× screenshot, so zooming blurs it as a phone would. TestoZa draws the line with KaTeX and mhchem.">
            <div ref={bodyRef} className={`cq-paste${wide ? ' is-wide' : ''}`}>
                {wide ? (
                    <>
                        <div className="cq-paste-stage">
                            {card}
                            {checks}
                        </div>
                        <aside className="cq-paste-side" aria-label="Demo controls">
                            <p className="cq-mini-label">How it got into the test</p>
                            {ways}
                            <p className="cq-mini-label">On the phone</p>
                            {view}
                        </aside>
                    </>
                ) : (
                    <>
                        {ways}
                        {view}
                        <div className="cq-paste-stage">
                            {card}
                            {checks}
                        </div>
                    </>
                )}
            </div>
        </DemoFrame>
    );
}
