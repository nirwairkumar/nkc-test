/**
 * The same one-digit fix made two ways, played when the demo scrolls into view:
 * a white box is laid over "14" and "15" is typed on top in Helvetica, while
 * Panna rewrites the digit in the certificate's own font. "X-ray the file"
 * shows what each file really contains. Steps are cumulative CSS classes
 * (is-s1 … is-s4); with reduced motion the demo simply shows the final state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, ScanSearch } from 'lucide-react';

const STEP_AT_MS = [450, 1100, 1750, 2900];

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function WhiteBoxDemo() {
    const ref = useRef<HTMLElement>(null);
    const timers = useRef<number[]>([]);
    const [reduced] = useState(prefersReducedMotion);
    const [step, setStep] = useState(reduced ? 4 : 0);
    const [xray, setXray] = useState(false);

    const stop = () => {
        timers.current.forEach((t) => window.clearTimeout(t));
        timers.current = [];
    };

    const play = useCallback(() => {
        stop();
        setXray(false);
        if (reduced) {
            setStep(4);
            return;
        }
        setStep(0);
        STEP_AT_MS.forEach((at, i) => {
            timers.current.push(window.setTimeout(() => setStep(i + 1), at));
        });
    }, [reduced]);

    useEffect(() => {
        const el = ref.current;
        if (reduced || !el) return;
        if (!('IntersectionObserver' in window)) {
            play();
            return stop;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    io.disconnect();
                    play();
                }
            },
            { threshold: 0.3 },
        );
        io.observe(el);
        return () => {
            io.disconnect();
            stop();
        };
    }, [reduced, play]);

    const toggleXray = () => {
        stop();
        setStep(4);
        setXray((x) => !x);
    };

    const className = ['wbx-demo', 'wide', ...[1, 2, 3, 4].filter((s) => step >= s).map((s) => `is-s${s}`), xray ? 'is-xray' : '']
        .filter(Boolean)
        .join(' ');

    return (
        <figure ref={ref} className={className} aria-label="Demo: the same date fixed by a white-box editor and by Panna">
            <div className="wbx-demo-grid">
                <div className="wbx-sheet is-bad">
                    <p className="wbx-sheet-label">
                        <span className="wbx-dot is-bad" aria-hidden="true" />A typical white-box edit
                    </p>
                    <div className="wbx-paper" aria-hidden="true">
                        <span className="wbx-xray-tag">X-ray: the old 14 is still in the file</span>
                        <p className="wbx-ct">Certificate of Participation</p>
                        <div className="wbx-paper-rule" />
                        <p className="wbx-line">
                            This is to certify that Ananya Rao took part in the Inter-School Science Fair, held on{' '}
                            <span className="wbx-fix is-bad">
                                <span className="wbx-old">14</span>
                                <span className="wbx-box" />
                                <span className="wbx-new">
                                    <span style={{ ['--i' as string]: 0 }}>1</span>
                                    <span style={{ ['--i' as string]: 1 }}>5</span>
                                </span>
                            </span>{' '}
                            March 2026.
                        </p>
                    </div>
                    <dl className="wbx-readout">
                        <div>
                            <dt>The new “15”</dt>
                            <dd>Typed in Helvetica, on top of a white box</dd>
                        </div>
                        <div>
                            <dt>Copy all text</dt>
                            <dd>
                                <code className="wbx-typed">
                                    …held on <span className="wbx-leak">14</span> March 2026. 15
                                </code>
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="wbx-sheet is-good">
                    <p className="wbx-sheet-label">
                        <span className="wbx-dot is-good" aria-hidden="true" />
                        The same edit in Panna
                    </p>
                    <div className="wbx-paper" aria-hidden="true">
                        <span className="wbx-xray-tag is-good">X-ray: nothing hidden underneath</span>
                        <p className="wbx-ct">Certificate of Participation</p>
                        <div className="wbx-paper-rule" />
                        <p className="wbx-line">
                            This is to certify that Ananya Rao took part in the Inter-School Science Fair, held on{' '}
                            <span className="wbx-fix is-good">
                                <span className="wbx-old">14</span>
                                <span className="wbx-new">15</span>
                            </span>{' '}
                            March 2026.
                        </p>
                    </div>
                    <dl className="wbx-readout">
                        <div>
                            <dt>The new “15”</dt>
                            <dd>Written in the certificate’s own embedded font</dd>
                        </div>
                        <div>
                            <dt>Copy all text</dt>
                            <dd>
                                <code className="wbx-typed">…held on 15 March 2026.</code>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            <div className="wbx-demo-bar">
                <button type="button" className="wbx-btn" onClick={play}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
                </button>
                <button type="button" className="wbx-btn wbx-btn-xray" aria-pressed={xray} onClick={toggleXray}>
                    <ScanSearch className="h-4 w-4" aria-hidden="true" /> X-ray the file
                </button>
                <span className="wbx-demo-hint" aria-live="polite">
                    {xray ? 'The white box hides the old date. It doesn’t remove it.' : 'See what’s hiding under the white box.'}
                </span>
            </div>
            <figcaption>
                Illustration: one wrong digit, fixed two ways. With a white-box editor, copying the text still gives “…held on 14 March 2026. 15”.
                With Panna it gives “…held on 15 March 2026.”
            </figcaption>
        </figure>
    );
}
