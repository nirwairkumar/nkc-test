/**
 * Landing V2 — real test-environment showcase (static composition).
 *
 * This is the ACTUAL TestoZa exam interface, lifted verbatim from the live
 * landing page's LiveTestShowcase markup and styling (LiveTestShowcase.css is
 * copied alongside). The earlier hero used an invented mock-up, which showed a
 * UI the product does not have — this shows the real thing.
 *
 * Presentation: both devices are shown TOGETHER in one fixed three-quarter
 * composition — laptop set back and to the right, phone standing in front on
 * the left, both sharing the same viewing angle so they read as a single
 * photograph rather than two separate images. Nothing rotates or cycles.
 *
 * The laptop shows the desktop exam view; the phone shows the mobile exam
 * view. Both are static: no cursor, no option-picking, no typing.
 *
 * The questions are real JEE Main 2026 maths questions (from the papers in the
 * question bank), drawn with KaTeX the way the exam screen draws them. KaTeX is
 * loaded on demand (the same chunk the JEE guide uses) so the landing bundle does
 * not grow; the question text fades in once it is ready.
 */

import { Fragment, useMemo } from 'react';
import { texToHtml, useKatex, type Katex } from '@/pages/guides/jeeKatex';
import './LiveTestShowcase.css';
import './DeviceShowcase.css';

/* ── Icons (inlined, matching the live showcase) ─────────────────────────── */
const ClockIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const FlagIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>);
const MaximizeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>);
const EyeOffIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>);
const ChevronLeftIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>);

/* ── Static question content: real JEE Main maths questions ──────────────── */
const TEST_NAME = 'JEE Main 2026 Session 1 Mock Test';

/** JEE Main 2026, 21 Jan Shift 2, Q11. Area = 16/3 − 1/4 = 61/12, so α + β = 73 (A). */
const DESKTOP_Q = {
    num: 11,
    text: 'If the area of the region $\\{(x,y): 1-2x \\le y \\le 4-x^{2},\\ x \\ge 0,\\ y \\ge 0\\}$ is $\\frac{\\alpha}{\\beta}$, where $\\alpha, \\beta \\in \\mathbb{N}$ and $\\gcd(\\alpha, \\beta)=1$, then the value of $(\\alpha+\\beta)$ is:',
    opts: ['73', '85', '91', '67'],
    pick: 0,
};

/** JEE Main 2026, 23 Jan Shift 2, Q9. b² = 8, h² = 24/5, area = h²/√3 = 8√3/5 (B). */
const MOBILE_Q = {
    num: 9,
    text: 'Let $PQ$ be a chord of the hyperbola $\\frac{x^{2}}{4}-\\frac{y^{2}}{b^{2}}=1$ perpendicular to the $x$-axis such that $OPQ$ is an equilateral triangle, $O$ being the centre of the hyperbola. If the eccentricity of the hyperbola is $\\sqrt{3}$, then the area of the triangle $OPQ$ is:',
    opts: ['$2\\sqrt{3}$', '$\\frac{8\\sqrt{3}}{5}$', '$\\frac{11}{5}$', '$\\frac{9}{5}$'],
    pick: 1,
};

/** Mathematics palette: 10 answered, 11 current, rest unvisited — as candidates see it. */
const PILL_STATE = (i: number) => (i < 10 ? 'ans' : i === 10 ? 'cur' : '');

/**
 * Text with $…$ maths, the way questions are stored. Like the exam screen's
 * LatexRenderer, inline maths is drawn in \displaystyle (full-size fractions).
 * Shown once KaTeX is ready.
 */
function MathText({ k, text }: { k: Katex | null; text: string }) {
    const parts = useMemo(() => text.split(/(\$[^$]+\$)/g).filter(Boolean), [text]);
    return (
        <>
            {parts.map((part, i) => {
                const tex = part.length > 2 && part.startsWith('$') && part.endsWith('$') ? part.slice(1, -1) : null;
                if (tex === null) return <Fragment key={i}>{part}</Fragment>;
                const html = k ? texToHtml(k, `\\displaystyle ${tex}`) : null;
                return html
                    ? <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
                    : <Fragment key={i}>{tex}</Fragment>;
            })}
        </>
    );
}

/* The figure for DESKTOP_Q: the region between y = 4 − x² and y = 1 − 2x (or the
   x-axis) for x ≥ 0, framed the way the exam screen frames a question image. */
const FIG = { ox: 34, oy: 70, ux: 46, uy: 14.5 };
const fx = (x: number) => FIG.ox + FIG.ux * x;
const fy = (y: number) => FIG.oy - FIG.uy * y;
const curve = (f: (x: number) => number, from: number, to: number, steps = 24) =>
    Array.from({ length: steps + 1 }, (_, i) => {
        const x = from + ((to - from) * i) / steps;
        return `${fx(x).toFixed(1)},${fy(f(x)).toFixed(1)}`;
    });
const PARABOLA = (x: number) => 4 - x * x;
const REGION = `M${curve(PARABOLA, 0, 2).join(' L')} L${fx(0.5)},${fy(0)} L${fx(0)},${fy(1)} Z`;
const MATH_FONT = { fontFamily: "KaTeX_Math, 'Times New Roman', serif", fontStyle: 'italic' as const };
const NUM_FONT = { fontFamily: "KaTeX_Main, 'Times New Roman', serif" };

function RegionFigure() {
    return (
        <div className="dsw-figure-row">
            <div className="dsw-figure">
                <svg viewBox="0 0 168 81" width="168" height="81" role="img" aria-label="Shaded region between the parabola y = 4 − x² and the line y = 1 − 2x for x ≥ 0">
                    <defs>
                        <marker id="dsw-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M0,0 L6,3 L0,6 z" fill="#334155" />
                        </marker>
                    </defs>
                    <path d={REGION} fill="rgba(14,165,233,0.2)" />
                    <line x1={6} y1={fy(0)} x2={162} y2={fy(0)} stroke="#334155" strokeWidth="0.8" markerEnd="url(#dsw-arrow)" />
                    <line x1={fx(0)} y1={79} x2={fx(0)} y2={3} stroke="#334155" strokeWidth="0.8" markerEnd="url(#dsw-arrow)" />
                    <polyline points={curve(PARABOLA, -0.05, 2.17).join(' ')} fill="none" stroke="#0369a1" strokeWidth="1.2" />
                    <line x1={fx(-0.25)} y1={fy(1.5)} x2={fx(0.72)} y2={fy(-0.44)} stroke="#7c3aed" strokeWidth="1.1" />
                    <text x={fx(1.42)} y={fy(2.55)} fontSize="7" fill="#0369a1" style={MATH_FONT}>y = 4 − x²</text>
                    <text x={fx(0.8)} y={fy(0) + 8} fontSize="7" fill="#7c3aed" style={MATH_FONT}>y = 1 − 2x</text>
                    <text x={fx(0) - 7} y={fy(0) + 7} fontSize="6.5" fill="#334155" style={MATH_FONT}>O</text>
                    <text x={fx(2) - 2} y={fy(0) + 7} fontSize="6.5" fill="#334155" style={NUM_FONT}>2</text>
                    <text x={fx(0) - 6.5} y={fy(4) + 5} fontSize="6.5" fill="#334155" style={NUM_FONT}>4</text>
                    <text x={157} y={fy(0) - 3} fontSize="7" fill="#334155" style={MATH_FONT}>x</text>
                    <text x={fx(0) + 3} y={8} fontSize="7" fill="#334155" style={MATH_FONT}>y</text>
                </svg>
            </div>
        </div>
    );
}

export default function DeviceShowcase() {
    const k = useKatex();
    const tex = `dsw-tex${k ? ' is-ready' : ''}`;
    return (
        <div className="dsw-root">
            <div className="dsw-stage">
                <div className="dsw-composition">
                    {/* ══ LAPTOP — set back and right ════════════════════ */}
                    <div className="dsw-mount dsw-mount-laptop">
                        <div className="dsw-fit dsw-fit-laptop">
                            <div className="lt-laptop dsw-device">
                                <div className="lt-laptop-body">
                                    <div className="lt-cam-row"><div className="lt-cam" /></div>
                                    <div className="lt-laptop-screen">
                                        <div className="lt-test">
                                            <div className="lt-inst-bar">
                                                <div className="lt-inst-logo">📚</div>
                                                <div className="lt-inst-name">Your Institution Name here, Location</div>
                                            </div>
                                            <div className="lt-toolbar">
                                                <div className="lt-test-name">{TEST_NAME}</div>
                                                <div className="lt-tr-right">
                                                    <div className="lt-fs-icon"><MaximizeIcon /></div>
                                                    <div className="lt-timer-badge"><ClockIcon /> 2:58:43</div>
                                                    <div className="lt-viol-badge">⚠ 0/3</div>
                                                    <div className="lt-online-dot" />
                                                    <div className="lt-exit-lbl">Exit</div>
                                                    <div className="lt-submit-pill">Submit Test</div>
                                                </div>
                                            </div>
                                            <div className="lt-content">
                                                <div className="lt-q-area">
                                                    <div className="lt-tabs">
                                                        <div className="lt-tab active">Mathematics <span className="lt-tab-i">i</span></div>
                                                        <div className="lt-tab" style={{ color: '#64748b', borderColor: 'transparent' }}>Physics <span className="lt-tab-i">i</span></div>
                                                        <div className="lt-tab" style={{ color: '#64748b', borderColor: 'transparent' }}>Chemistry <span className="lt-tab-i">i</span></div>
                                                    </div>
                                                    <div className="lt-q-body">
                                                        <div className="lt-q-hdr">
                                                            <div className="lt-q-hdr-left">
                                                                <span className="lt-q-num">QUESTION {DESKTOP_Q.num}</span>
                                                                <span className="lt-q-badge">Single Choice</span>
                                                            </div>
                                                            <div className="lt-q-hdr-right">
                                                                <div className="lt-q-marks"><span className="lt-plus">+4</span><span className="lt-sep">|</span><span className="lt-minus">-1</span></div>
                                                                <div className="lt-flag-icon"><FlagIcon /></div>
                                                            </div>
                                                        </div>
                                                        <hr className="lt-q-hr" />
                                                        <p className={`lt-q-text ${tex}`}><MathText k={k} text={DESKTOP_Q.text} /></p>
                                                        <RegionFigure />
                                                        <div className="lt-opts-lbl">OPTIONS</div>
                                                        <div className={`lt-opts-list ${tex}`}>
                                                            {['A', 'B', 'C', 'D'].map((l, i) => (
                                                                <div className={`lt-opt${i === DESKTOP_Q.pick ? ' selected' : ''}`} key={l}>
                                                                    <div className="lt-opt-badge">{l}</div>
                                                                    <span className="lt-opt-lbl"><MathText k={k} text={DESKTOP_Q.opts[i]} /></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="lt-q-footer">
                                                        <div className="lt-foot-left"><div className="lt-back-btn">‹ Back</div></div>
                                                        <div className="lt-foot-right">
                                                            <div className="lt-clear-btn">Clear</div>
                                                            <div className="lt-review-btn"><FlagIcon /> Review</div>
                                                            <div className="lt-ans-review-btn">Ans &amp; Review</div>
                                                            <button className="lt-save-btn" type="button" tabIndex={-1}>Save &amp; Next ›</button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="lt-palette">
                                                    <div className="lt-pal-title">Question Palette</div>
                                                    <div className="lt-pal-legend">
                                                        <div className="lt-legend-row"><div className="lt-ldot nv">1</div>Not Visited</div>
                                                        <div className="lt-legend-row"><div className="lt-ldot na">2</div>Not Ans</div>
                                                        <div className="lt-legend-row"><div className="lt-ldot ans">3</div>Answered</div>
                                                        <div className="lt-legend-row"><div className="lt-ldot rev">4</div>Review</div>
                                                        <div className="lt-legend-row"><div className="lt-ldot revans">5</div>Ans &amp; Review</div>
                                                    </div>
                                                    <hr className="lt-pal-hr" />
                                                    <div className="lt-pal-scroll">
                                                        <div className="lt-pal-sec">Mathematics</div>
                                                        <div className="lt-pill-grid" style={{ marginBottom: 10 }}>
                                                            {Array.from({ length: 25 }, (_, i) => (
                                                                <div key={`m${i}`} className={`lt-pill${PILL_STATE(i) ? ' ' + PILL_STATE(i) : ''}`}>{i + 1}</div>
                                                            ))}
                                                        </div>
                                                        <div className="lt-pal-sec">Physics</div>
                                                        <div className="lt-pill-grid" style={{ marginBottom: 10 }}>
                                                            {Array.from({ length: 25 }, (_, i) => (
                                                                <div key={`p${i}`} className="lt-pill">{i + 26}</div>
                                                            ))}
                                                        </div>
                                                        <div className="lt-pal-sec">Chemistry</div>
                                                        <div className="lt-pill-grid" style={{ marginBottom: 10 }}>
                                                            {Array.from({ length: 25 }, (_, i) => (
                                                                <div key={`c${i}`} className="lt-pill">{i + 51}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lt-laptop-base" />
                            </div>
                        </div>
                    </div>

                    {/* ══ PHONE — standing in front, left ════════════════ */}
                    <div className="dsw-mount dsw-mount-phone">
                        <div className="dsw-fit dsw-fit-phone">
                            <div className="lt-phone dsw-device">
                                <div className="lt-phone-body">
                                    <div className="lt-phone-screen">
                                        <div className="lt-phone-island" />
                                        <div className="lt-pn-scaled">
                                            <div className="lt-phone-test">
                                                <div className="lt-pn-inst">
                                                    <div className="lt-pn-logo">📚</div>
                                                    <div className="lt-pn-inst-name"><span style={{ color: '#0284c7' }}>Your Institution Name here, ...</span></div>
                                                </div>
                                                <div className="lt-pn-title-row">JEE Main 2026 Session 1...</div>
                                                <div className="lt-pn-sub">
                                                    <div className="lt-pn-timer"><ClockIcon /> 2:58:43 &nbsp;<EyeOffIcon /></div>
                                                    <div className="lt-pn-badges">
                                                        <div className="lt-pn-viol">⚠ 0/3</div>
                                                        <div className="lt-online-dot" />
                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Exit</span>
                                                        <div className="lt-pn-submit">Submit Test</div>
                                                    </div>
                                                </div>
                                                <div className="lt-pn-tabs">
                                                    <div className="lt-pn-tab active">Mathematics <span className="lt-tab-i">i</span></div>
                                                    <div className="lt-pn-tab" style={{ color: '#64748b' }}>Physics <span className="lt-tab-i">i</span></div>
                                                    <div className="lt-pn-tab" style={{ color: '#64748b' }}>Chemistry</div>
                                                </div>
                                                <div className="lt-pn-body">
                                                    <div className="lt-pn-card">
                                                        <div className="lt-pn-q-hdr">
                                                            <div className="lt-pn-q-hdr-left">
                                                                <span className="lt-pn-q-num">QUESTION {MOBILE_Q.num}</span>
                                                                <span className="lt-pn-q-badge" style={{ color: '#475569', background: '#f8fafc' }}>Single Choice</span>
                                                            </div>
                                                            <div className="lt-pn-q-hdr-right">
                                                                <div className="lt-pn-marks"><span className="lt-plus">+4</span><span style={{ color: '#cbd5e1' }}>|</span><span className="lt-minus">-1</span></div>
                                                                <div className="lt-flag-icon"><FlagIcon /></div>
                                                            </div>
                                                        </div>
                                                        <hr className="lt-pn-hr" />
                                                        <p className={`lt-pn-q-text ${tex}`}><MathText k={k} text={MOBILE_Q.text} /></p>
                                                        <div className={tex}>
                                                            {['A', 'B', 'C', 'D'].map((l, i) => (
                                                                <div className={`lt-pn-opt${i === MOBILE_Q.pick ? ' selected' : ''}`} key={l}>
                                                                    <div className="lt-pn-opt-badge">{l}</div>
                                                                    <span className="lt-pn-opt-lbl"><MathText k={k} text={MOBILE_Q.opts[i]} /></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="lt-pn-footer">
                                                    <div className="lt-pn-btn"><ChevronLeftIcon /> Back</div>
                                                    <div className="lt-pn-btn" style={{ opacity: 0.5 }}>Clear</div>
                                                    <div className="lt-pn-btn"><FlagIcon /></div>
                                                    <div className="lt-pn-save">Save &amp; Next ›</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="lt-phone-indicator" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
