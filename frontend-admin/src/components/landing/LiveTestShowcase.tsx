import { useEffect, useRef, useState } from 'react';
import './LiveTestShowcase.css';

// SVG Icons
const PlayIcon = () => (<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>);
const PauseIcon = () => (<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>);
const InfoIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>);
const ClockIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
const FlagIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>);
const MaximizeIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>);
const EyeOffIcon = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);
const ChevronLeftIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>);

// ── Question data for 4 sequences
const Q1 = { num: 15, text: 'A body of mass 2\u00a0kg moving with velocity of v\u20d7 = 3\u00ee + 4\u0135 enters into a constant force field of 6\u00a0N. The velocity when it emerges is', opts: ['4\u00ee + 3\u0135 + 5k\u0302', '3\u00ee + 4\u0135 + 5k\u0302', '3\u00ee + 4\u0135 \u2212 5k\u0302', '3\u00ee + 4\u0135 + \u221a5\u00a0k\u0302'], pick: 1 }; // B
const Q2 = { num: 16, text: 'Let A and B be two square matrices of order 3 such that |A| = 3 and |B| = 2. Then value of |adj(A\u207b\u00b9 B)| is:', opts: ['4/9', '8/27', '8/9', '4/27'], pick: 2 }; // C
const Q3 = { num: 17, text: 'The amplitude and phase of a wave formed by the superposition of y\u2081 = 4\u00a0sin(kx \u2212 \u03c9t) and y\u2082 = 2\u00a0sin(kx \u2212 \u03c9t + 2\u03c0/3) are:', opts: ['[6, 2\u03c0/3]', '[6, \u03c0/3]', '[\u221a3, \u03c0/6]', '[2\u221a3, \u03c0/6]'], pick: 0 }; // A
const Q4 = { num: 18, text: 'Consider a sphere of radius R. The escape velocity at its surface is v. The escape velocity at height h = R is', opts: ['v', 'v / \u221a2', 'v / 2', '2v'], pick: 1 }; // B

const PILLS_PHY = Array(25).fill('nv');
for(let i=0; i<14; i++) PILLS_PHY[i] = 'ans'; // pre-fill first 14
const PILLS_CHE = Array(25).fill('nv');
const PILLS_MAT = Array(25).fill('nv');

export default function LiveTestShowcase() {
    const [isPlaying, setIsPlaying] = useState(true);
    
    // UI Refs
    const sliderInputRef = useRef<HTMLInputElement>(null);
    const laptopWrapperRef = useRef<HTMLDivElement>(null);
    const phoneWrapperRef = useRef<HTMLDivElement>(null);
    const lapLabelRef = useRef<HTMLDivElement>(null);
    const phonLabelRef = useRef<HTMLDivElement>(null);

    // Laptop specific refs
    const laptopRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const lapSaveBtnRef = useRef<HTMLButtonElement>(null);
    const lapNumRef = useRef<HTMLSpanElement>(null);
    const lapTextRef = useRef<HTMLParagraphElement>(null);
    const lapOptNodeRefs = useRef<(HTMLDivElement|null)[]>([]);
    const lapOptTextRefs = useRef<(HTMLSpanElement|null)[]>([]);
    const lapPillRefs = useRef<(HTMLDivElement|null)[]>([]);

    // Phone specific refs
    const phoneRef = useRef<HTMLDivElement>(null);
    const phSaveBtnRef = useRef<HTMLDivElement>(null);
    const phNumRef = useRef<HTMLSpanElement>(null);
    const phTextRef = useRef<HTMLParagraphElement>(null);
    const phOptNodeRefs = useRef<(HTMLDivElement|null)[]>([]);
    const phOptTextRefs = useRef<(HTMLSpanElement|null)[]>([]);

    const isPlayingRef = useRef(true);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    useEffect(() => {
        let lastTime = performance.now();
        let time = 0; // 0 to 32000
        let animId: number;

        function getPos(container: HTMLElement, target: HTMLElement | null) {
            if (!target || !container) return {x: 0, y: 0};
            const r = target.getBoundingClientRect(); const f = container.getBoundingClientRect();
            return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
        }

        function processFrame(t: number) {
            const isLap = t < 16000;

            // Labels & Visibility
            if (lapLabelRef.current) lapLabelRef.current.classList.toggle('active', isLap);
            if (phonLabelRef.current) phonLabelRef.current.classList.toggle('active', !isLap);
            if (laptopWrapperRef.current) laptopWrapperRef.current.classList.toggle('show', isLap);
            if (phoneWrapperRef.current) phoneWrapperRef.current.classList.toggle('show', !isLap);

            // ── LAPTOP (0 - 16000) ──
            if (isLap) {
                const lq = t < 8000 ? Q1 : Q2;
                const lt = t % 8000;
                
                // Update text content cleanly
                if (lapNumRef.current && lapNumRef.current.textContent !== `QUESTION ${lq.num}`) {
                    lapNumRef.current.textContent = `QUESTION ${lq.num}`;
                    if (lapTextRef.current) lapTextRef.current.textContent = lq.text;
                    lapOptTextRefs.current.forEach((r, i) => { if (r) r.textContent = lq.opts[i]; });
                }

                // Options
                lapOptNodeRefs.current.forEach((node, i) => {
                    if (node) node.classList.toggle('selected', i === lq.pick && lt >= 4000 && lt < 7500);
                });

                // Pills
                if (lapPillRefs.current[14]) {
                    lapPillRefs.current[14]!.className = `lt-pill ${t >= 4000 ? 'ans' : 'cur'}`;
                }
                if (lapPillRefs.current[15]) {
                    if (t < 8000) lapPillRefs.current[15]!.className = 'lt-pill'; // empty
                    else lapPillRefs.current[15]!.className = `lt-pill ${t >= 12000 ? 'ans' : 'cur'}`;
                }

                // Save Btn
                if (lapSaveBtnRef.current) {
                    lapSaveBtnRef.current.classList.toggle('pressing', lt >= 7500 && lt < 7800);
                }

                // Cursor Mouse
                const c = cursorRef.current;
                if (c && laptopRef.current) {
                    c.classList.toggle('scrubbing', !isPlayingRef.current);
                    if (lt < 800 || lt > 7800) {
                        c.style.opacity = '0';
                        c.style.transform = `translate(250px, 350px)`;
                    } else {
                        c.style.opacity = '1';
                        if (lt < 4500) {
                            const p = getPos(laptopRef.current, lapOptNodeRefs.current[lq.pick]);
                            c.style.transform = `translate(${p.x}px, ${p.y}px)`;
                        } else {
                            const p = getPos(laptopRef.current, lapSaveBtnRef.current);
                            c.style.transform = `translate(${p.x}px, ${p.y}px)`;
                        }
                    }
                }
            } 
            
            // ── PHONE (16000 - 32000) ──
            else {
                const pq = t < 24000 ? Q3 : Q4;
                const pt = t % 8000;
                
                // Update text
                if (phNumRef.current && phNumRef.current.textContent !== `QUESTION ${pq.num}`) {
                    phNumRef.current.textContent = `QUESTION ${pq.num}`;
                    if (phTextRef.current) phTextRef.current.textContent = pq.text;
                    phOptTextRefs.current.forEach((r, i) => { if (r) r.textContent = pq.opts[i]; });
                }

                // Options
                phOptNodeRefs.current.forEach((node, i) => {
                    if (node) node.classList.toggle('selected', i === pq.pick && pt >= 4000 && pt < 7500);
                });

                // Save Btn
                if (phSaveBtnRef.current) {
                    phSaveBtnRef.current.classList.toggle('pressing', pt >= 7500 && pt < 7800);
                }

                // Touch Finger logic removed per user request
            }
        }

        function updateSlider(val: number) {
            if (sliderInputRef.current) {
                sliderInputRef.current.value = String(val);
                const pct = (val / 32000) * 100;
                sliderInputRef.current.style.background = `linear-gradient(to right, #2563eb ${pct}%, #e2e8f0 ${pct}%)`;
            }
        }

        function step(now: number) {
            if (isPlayingRef.current) {
                const delta = Math.min(now - lastTime, 100);
                time = (time + delta) % 32000;
                updateSlider(time);
                processFrame(time);
            }
            lastTime = now;
            animId = requestAnimationFrame(step);
        }

        animId = requestAnimationFrame(step);

        const slider = sliderInputRef.current;
        if (slider) {
            slider.oninput = (e: any) => {
                const val = Number(e.target.value);
                time = val;
                updateSlider(val);
                processFrame(val);
            };
        }
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <div className="lt-wrapper">
            <div className="lt-outer">
                <div className="lt-device-stage">
                    
                    {/* ══ LAPTOP ════════════════════════════════════ */}
                    <div className="lt-laptop" ref={laptopWrapperRef}>
                        <div className="lt-laptop-body">
                            <div className="lt-cam-row"><div className="lt-cam"></div></div>
                            <div className="lt-laptop-screen" ref={laptopRef}>
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
                                            <div className="lt-online-dot"></div>
                                            <div className="lt-exit-lbl">Exit</div>
                                            <div className="lt-submit-pill">Submit Test</div>
                                        </div>
                                    </div>
                                    <div className="lt-content">
                                        <div className="lt-q-area">
                                            <div className="lt-tabs">
                                                <div className="lt-tab active">Physics <span className="lt-tab-i">i</span></div>
                                                <div className="lt-tab" style={{color:'#64748b',borderColor:'transparent'}}>Chemistry <span className="lt-tab-i">i</span></div>
                                                <div className="lt-tab" style={{color:'#64748b',borderColor:'transparent'}}>Mathematics <span className="lt-tab-i">i</span></div>
                                            </div>
                                            <div className="lt-q-body">
                                                <div className="lt-q-hdr">
                                                    <div className="lt-q-hdr-left">
                                                        <span className="lt-q-num" ref={lapNumRef}>QUESTION 15</span>
                                                        <span className="lt-q-badge">Single Choice</span>
                                                    </div>
                                                    <div className="lt-q-hdr-right">
                                                        <div className="lt-q-marks"><span className="lt-plus">+4</span><span className="lt-sep">|</span><span className="lt-minus">-1</span></div>
                                                        <div className="lt-flag-icon"><FlagIcon /></div>
                                                    </div>
                                                </div>
                                                <hr className="lt-q-hr" />
                                                <p className="lt-q-text" ref={lapTextRef}>{Q1.text}</p>
                                                <div className="lt-opts-lbl">OPTIONS</div>
                                                <div className="lt-opts-list">
                                                    {['A','B','C','D'].map((l, i) => (
                                                        <div className="lt-opt" key={l} ref={(el)=>lapOptNodeRefs.current[i]=el}>
                                                            <div className="lt-opt-badge">{l}</div>
                                                            <span className="lt-opt-lbl" ref={(el)=>lapOptTextRefs.current[i]=el}>{Q1.opts[i]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="lt-q-footer">
                                                <div className="lt-foot-left">
                                                    <div className="lt-back-btn">‹ Back</div>
                                                </div>
                                                <div className="lt-foot-right">
                                                    <div className="lt-clear-btn">Clear</div>
                                                    <div className="lt-review-btn"><FlagIcon /> Review</div>
                                                    <div className="lt-ans-review-btn">Ans &amp; Review</div>
                                                    <button className="lt-save-btn" ref={lapSaveBtnRef}>Save &amp; Next ›</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="lt-palette">
                                            <div className="lt-pal-title">Question Palette</div>
                                            <div className="lt-pal-legend">
                                                <div className="lt-legend-row"><div className="lt-ldot nv">1</div>Not Visited</div>
                                                <div className="lt-legend-row"><div className="lt-ldot na" style={{clipPath:'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0)'}}>2</div>Not Ans</div>
                                                <div className="lt-legend-row"><div className="lt-ldot ans">3</div>Answered</div>
                                                <div className="lt-legend-row"><div className="lt-ldot rev">4</div>Review</div>
                                                <div className="lt-legend-row"><div className="lt-ldot revans">5</div>Ans &amp; Review</div>
                                            </div>
                                            <hr className="lt-pal-hr" />
                                            <div className="lt-pal-scroll">
                                                <div className="lt-pal-sec">Physics</div>
                                                <div className="lt-pill-grid" style={{marginBottom: 10}}>
                                                    {PILLS_PHY.map((s, i) => (
                                                        <div key={`p${i}`} className={`lt-pill${s&&s!=='nv'?' '+s:''}`} ref={(el)=>lapPillRefs.current[i]=el}>{i+1}</div>
                                                    ))}
                                                </div>
                                                <div className="lt-pal-sec">Chemistry</div>
                                                <div className="lt-pill-grid" style={{marginBottom: 10}}>
                                                    {PILLS_CHE.map((s, i) => (
                                                        <div key={`c${i}`} className={`lt-pill${s&&s!=='nv'?' '+s:''}`}>{i+26}</div>
                                                    ))}
                                                </div>
                                                <div className="lt-pal-sec">Mathematics</div>
                                                <div className="lt-pill-grid" style={{marginBottom: 10}}>
                                                    {PILLS_MAT.map((s, i) => (
                                                        <div key={`m${i}`} className={`lt-pill${s&&s!=='nv'?' '+s:''}`}>{i+51}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lt-cursor" ref={cursorRef}>
                                    <svg width="22" height="26" viewBox="0 0 20 24" fill="none"><path d="M4 1L16 13H9L12 22L9 23L6 14L1 19V1H4Z" fill="white" stroke="#1e293b" strokeWidth="1.2"/></svg>
                                </div>
                            </div>
                        </div>
                        <div className="lt-laptop-base"></div>
                    </div>

                    {/* ══ PHONE ═════════════════════════════════════ */}
                    <div className="lt-phone" ref={phoneWrapperRef}>
                        <div className="lt-phone-body">
                            <div className="lt-phone-screen" ref={phoneRef}>
                                <div className="lt-phone-island"></div>
                                <div className="lt-pn-scaled">
                                    <div className="lt-phone-test">
                                        <div className="lt-pn-inst">
                                            <div className="lt-pn-logo">📚</div>
                                            <div className="lt-pn-inst-name"><span style={{color: '#0284c7'}}>Your Institution Name here, ...</span></div>
                                        </div>
                                        <div className="lt-pn-title-row">JEE Main 2025 Session 2...</div>
                                        <div className="lt-pn-sub">
                                            <div className="lt-pn-timer"><ClockIcon /> 2:58:43 &nbsp;<EyeOffIcon/></div>
                                            <div className="lt-pn-badges">
                                                <div className="lt-pn-viol">⚠ 0/3</div>
                                                <div className="lt-online-dot"></div>
                                                <span style={{color: '#64748b', fontWeight: 600}}>Exit</span>
                                                <div className="lt-pn-submit">Submit Test</div>
                                            </div>
                                        </div>
                                        <div className="lt-pn-tabs">
                                            <div className="lt-pn-tab active">Physics <span className="lt-tab-i">i</span></div>
                                            <div className="lt-pn-tab" style={{color:'#64748b'}}>Chemistry <span className="lt-tab-i">i</span></div>
                                            <div className="lt-pn-tab" style={{color:'#64748b'}}>Mathematics</div>
                                        </div>
                                        <div className="lt-pn-body">
                                            <div className="lt-pn-card">
                                                <div className="lt-pn-q-hdr">
                                                    <div className="lt-pn-q-hdr-left">
                                                        <span className="lt-pn-q-num" ref={phNumRef}>QUESTION 17</span>
                                                        <span className="lt-pn-q-badge" style={{color:'#475569', background:'#f8fafc'}}>Single Choice</span>
                                                    </div>
                                                    <div className="lt-pn-q-hdr-right">
                                                        <div className="lt-pn-marks"><span className="lt-plus">+4</span><span style={{color:'#cbd5e1'}}>|</span><span className="lt-minus">-1</span></div>
                                                        <div className="lt-flag-icon"><FlagIcon /></div>
                                                    </div>
                                                </div>
                                                <hr className="lt-pn-hr" />
                                                <p className="lt-pn-q-text" ref={phTextRef}>{Q3.text}</p>
                                                
                                                {['A','B','C','D'].map((l, i) => (
                                                    <div className="lt-pn-opt" key={l} ref={(el)=>phOptNodeRefs.current[i]=el}>
                                                        <div className="lt-pn-opt-badge">{l}</div>
                                                        <span className="lt-pn-opt-lbl" ref={(el)=>phOptTextRefs.current[i]=el}>{Q3.opts[i]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="lt-pn-footer">
                                            <div className="lt-pn-btn"><ChevronLeftIcon/> Back</div>
                                            <div className="lt-pn-btn" style={{opacity: 0.5}}>Clear</div>
                                            <div className="lt-pn-btn"><FlagIcon /></div>
                                            <div className="lt-pn-save" ref={phSaveBtnRef}>Save &amp; Next ›</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lt-phone-indicator"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ══ PLAYBACK SCRUBBER ════════════════════════════ */}
            <div className="lt-progress-area">
                <div className="lt-progress-labels">
                    <div className="lt-plabel" ref={lapLabelRef}>Desktop Environment</div>
                    <div className="lt-plabel" ref={phonLabelRef}>Mobile Environment</div>
                </div>
                <div className="lt-controls-row">
                    <button className="lt-play-btn" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <div className="lt-slider-container">
                        <input 
                            ref={sliderInputRef}
                            type="range" min="0" max="32000" step="32" defaultValue="0" 
                            className="lt-slider" 
                            onMouseDown={() => setIsPlaying(false)}
                            onTouchStart={() => setIsPlaying(false)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
