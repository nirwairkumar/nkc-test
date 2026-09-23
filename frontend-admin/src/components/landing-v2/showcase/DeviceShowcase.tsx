/**
 * Landing V2 — real test-environment showcase (static).
 *
 * This is the ACTUAL TestoZa exam interface, lifted verbatim from the live
 * landing page's LiveTestShowcase markup and styling (LiveTestShowcase.css is
 * copied alongside). The earlier hero used an invented mock-up, which showed a
 * UI the product does not have — this shows the real thing.
 *
 * Two deliberate differences from the live version:
 *   1. STATIC. No cursor, no option-picking, no typing, no scrubber. The live
 *      version runs a 32-second scripted animation; here the devices simply
 *      present themselves.
 *   2. The desktop and mobile views auto-rotate on a turntable — one swings
 *      back and away as the other swings forward, looping continuously.
 *
 * Reduced-motion: the rotation stops and the desktop view is shown; a manual
 * toggle is still available.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import './LiveTestShowcase.css';
import './DeviceShowcase.css';

/* ── Icons (inlined, matching the live showcase) ─────────────────────────── */
const ClockIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const FlagIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>);
const MaximizeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>);
const EyeOffIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>);
const ChevronLeftIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>);

/* ── Static question content (same papers as the live showcase) ──────────── */
const DESKTOP_Q = {
    num: 15,
    text: 'A body of mass 2 kg moving with velocity of v⃗ = 3î + 4ĵ enters into a constant force field of 6 N. The velocity when it emerges is',
    opts: ['4î + 3ĵ + 5k̂', '3î + 4ĵ + 5k̂', '3î + 4ĵ − 5k̂', '3î + 4ĵ + √5 k̂'],
    pick: 1,
};
const MOBILE_Q = {
    num: 17,
    text: 'The amplitude and phase of a wave formed by the superposition of y₁ = 4 sin(kx − ωt) and y₂ = 2 sin(kx − ωt + 2π/3) are:',
    opts: ['[6, 2π/3]', '[6, π/3]', '[√3, π/6]', '[2√3, π/6]'],
    pick: 0,
};

/** Physics palette: 14 answered, 15 current, rest unvisited — as students see it. */
const PILL_STATE = (i: number) => (i < 14 ? 'ans' : i === 14 ? 'cur' : '');

const ROTATE_MS = 6500;

export default function DeviceShowcase() {
    const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
    const [paused, setPaused] = useState(false);
    const reduced = useRef(false);

    useEffect(() => {
        reduced.current =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced.current) setPaused(true);
    }, []);

    useEffect(() => {
        if (paused) return;
        const id = setInterval(
            () => setView((v) => (v === 'desktop' ? 'mobile' : 'desktop')),
            ROTATE_MS,
        );
        return () => clearInterval(id);
    }, [paused]);

    const select = useCallback((v: 'desktop' | 'mobile') => {
        setView(v);
        setPaused(true);
    }, []);

    return (
        <div className="dsw-root">
            <div
                className={`dsw-stage dsw-view-${view}`}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => { if (!reduced.current) setPaused(false); }}
            >
                {/* ══ DESKTOP ══════════════════════════════════════════ */}
                <div className="dsw-slot dsw-slot-desktop">
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
                                        <div className="lt-test-name">JEE Main 2025 Session 2 April 8 Question Papers</div>
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
                                                <div className="lt-tab active">Physics <span className="lt-tab-i">i</span></div>
                                                <div className="lt-tab" style={{ color: '#64748b', borderColor: 'transparent' }}>Chemistry <span className="lt-tab-i">i</span></div>
                                                <div className="lt-tab" style={{ color: '#64748b', borderColor: 'transparent' }}>Mathematics <span className="lt-tab-i">i</span></div>
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
                                                <p className="lt-q-text">{DESKTOP_Q.text}</p>
                                                <div className="lt-opts-lbl">OPTIONS</div>
                                                <div className="lt-opts-list">
                                                    {['A', 'B', 'C', 'D'].map((l, i) => (
                                                        <div className={`lt-opt${i === DESKTOP_Q.pick ? ' selected' : ''}`} key={l}>
                                                            <div className="lt-opt-badge">{l}</div>
                                                            <span className="lt-opt-lbl">{DESKTOP_Q.opts[i]}</span>
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
                                                <div className="lt-pal-sec">Physics</div>
                                                <div className="lt-pill-grid" style={{ marginBottom: 10 }}>
                                                    {Array.from({ length: 25 }, (_, i) => (
                                                        <div key={`p${i}`} className={`lt-pill${PILL_STATE(i) ? ' ' + PILL_STATE(i) : ''}`}>{i + 1}</div>
                                                    ))}
                                                </div>
                                                <div className="lt-pal-sec">Chemistry</div>
                                                <div className="lt-pill-grid" style={{ marginBottom: 10 }}>
                                                    {Array.from({ length: 25 }, (_, i) => (
                                                        <div key={`c${i}`} className="lt-pill">{i + 26}</div>
                                                    ))}
                                                </div>
                                                <div className="lt-pal-sec">Mathematics</div>
                                                <div className="lt-pill-grid" style={{ marginBottom: 10 }}>
                                                    {Array.from({ length: 25 }, (_, i) => (
                                                        <div key={`m${i}`} className="lt-pill">{i + 51}</div>
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

                {/* ══ MOBILE ═══════════════════════════════════════════ */}
                <div className="dsw-slot dsw-slot-mobile">
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
                                        <div className="lt-pn-title-row">JEE Main 2025 Session 2...</div>
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
                                            <div className="lt-pn-tab active">Physics <span className="lt-tab-i">i</span></div>
                                            <div className="lt-pn-tab" style={{ color: '#64748b' }}>Chemistry <span className="lt-tab-i">i</span></div>
                                            <div className="lt-pn-tab" style={{ color: '#64748b' }}>Mathematics</div>
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
                                                <p className="lt-pn-q-text">{MOBILE_Q.text}</p>
                                                {['A', 'B', 'C', 'D'].map((l, i) => (
                                                    <div className={`lt-pn-opt${i === MOBILE_Q.pick ? ' selected' : ''}`} key={l}>
                                                        <div className="lt-pn-opt-badge">{l}</div>
                                                        <span className="lt-pn-opt-lbl">{MOBILE_Q.opts[i]}</span>
                                                    </div>
                                                ))}
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

            {/* Which view is on the turntable — also lets you drive it manually */}
            <div className="dsw-switch" role="group" aria-label="Choose device view">
                {(['desktop', 'mobile'] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => select(v)}
                        aria-pressed={view === v}
                        className={`dsw-switch-btn${view === v ? ' is-active' : ''}`}
                    >
                        {v === 'desktop' ? 'Desktop' : 'Mobile'}
                    </button>
                ))}
            </div>
        </div>
    );
}
