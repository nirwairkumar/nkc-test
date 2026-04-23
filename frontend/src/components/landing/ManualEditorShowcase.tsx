import { useEffect, useRef } from 'react';
import './ManualEditorShowcase.css';

/* ════════════════════════════════════════════════════════════════
   SIMULATION DATA
════════════════════════════════════════════════════════════════ */
interface SimOption { v: string; c?: boolean; vLatex?: string; }
interface SimQuestion {
    type: string; question: string; marks: string; neg: string;
    options: SimOption[];
    questionLatex?: string; questionChem?: string;
    matchLeft?: string[]; matchRight?: string[];
}

const SIM_DATA: SimQuestion[] = [
    {
        type: 'Single Choice',
        question: 'What is the square root of 144?',
        marks: '4', neg: '1',
        options: [{ v: '10' }, { v: '12', c: true }, { v: '14' }, { v: '16' }]
    },
    {
        type: 'Integration (LaTeX)',
        question: 'Evaluate the definite integral:',
        questionLatex: '\\int_0^{\\pi} \\sin(x)\\, dx',
        marks: '4', neg: '0',
        options: [
            { v: '0' },
            { v: '2', c: true },
            { v: 'π', vLatex: '\\pi' },
            { v: '-2' }
        ]
    },
    {
        type: 'Chemistry (mhchem)',
        question: 'Balance and identify the reaction type:',
        questionChem: '\\ce{2H2 + O2 -> 2H2O}',
        marks: '4', neg: '1',
        options: [
            { v: 'Decomposition' },
            { v: 'Combination', c: true },
            { v: 'Displacement' },
            { v: 'Double Displacement' }
        ]
    },
    {
        type: 'Match the Following',
        question: 'Match Column A with Column B:',
        marks: '4', neg: '1',
        matchLeft: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law"],
        matchRight: ['Inertia', 'F = ma', 'Action-Reaction'],
        options: [
            { v: '1-A, 2-B, 3-C', c: true },
            { v: '1-B, 2-C, 3-A' },
            { v: '1-C, 2-A, 3-B' },
            { v: '1-A, 2-C, 3-B' }
        ]
    },
    {
        type: 'Single Choice',
        question: 'Identify the chemical symbol for Gold:',
        marks: '4', neg: '1',
        options: [{ v: 'Ag' }, { v: 'Fe' }, { v: 'Au', c: true }, { v: 'Pb' }]
    }
];

/* ════════════════════════════════════════════════════════════════
   KATEX LOADER
════════════════════════════════════════════════════════════════ */
function loadKaTeX(): Promise<void> {
    if ((window as any).katex) return Promise.resolve();
    return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
        script.onload = () => {
            const chem = document.createElement('script');
            chem.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js';
            chem.onload = () => resolve();
            document.head.appendChild(chem);
        };
        document.head.appendChild(script);
    });
}

function renderLatex(el: Element | null) {
    if (!el || !(window as any).katex) return;
    el.querySelectorAll('.klx').forEach((span: any) => {
        if (span.dataset.done) return;
        span.dataset.done = '1';
        try {
            (window as any).katex.render(span.dataset.src, span, {
                throwOnError: false,
                displayMode: span.dataset.display === '1',
                trust: true
            });
        } catch (_e) { /* ignore */ }
    });
}

/* ════════════════════════════════════════════════════════════════
   CARD HTML BUILDER
════════════════════════════════════════════════════════════════ */
function buildCardHTML(idx: number, d: SimQuestion): string {
    let optsInner = '';
    if (d.matchLeft) {
        const rows = d.matchLeft.map((_, i) =>
            `<tr><td><span class="match-tag">${String.fromCharCode(65 + i)}</span><span id="ml-${idx}-${i}"></span></td>` +
            `<td><span class="match-tag right">${i + 1}</span><span id="mr-${idx}-${i}"></span></td></tr>`
        ).join('');
        optsInner = `<table class="match-table">
      <thead><tr><th>Column A</th><th>Column B</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
        optsInner += `<div class="opts-grid" style="margin-top:8px">` +
            d.options.map((_, i) =>
                `<div class="opt-item" id="opt-${idx}-${i}"><div class="opt-check" id="chk-${idx}-${i}"></div>` +
                `<div class="opt-text-wrap"><span id="otxt-${idx}-${i}"></span>` +
                `<span class="cursor-blink" id="ocur-${idx}-${i}" style="display:none"></span></div></div>`
            ).join('') + `</div>`;
    } else {
        optsInner = `<div class="opts-grid">` +
            d.options.map((o, i) =>
                `<div class="opt-item" id="opt-${idx}-${i}"><div class="opt-check" id="chk-${idx}-${i}"></div>` +
                `<div class="opt-text-wrap"><span id="otxt-${idx}-${i}"></span>` +
                (o.vLatex ? `<span class="klx" data-src="${o.vLatex}" id="oklx-${idx}-${i}" style="display:none"></span>` : '') +
                `<span class="cursor-blink" id="ocur-${idx}-${i}" style="display:none"></span></div></div>`
            ).join('') + `</div>`;
    }

    const qLatex = d.questionLatex
        ? `<span class="klx" data-display="1" data-src="${d.questionLatex}" id="qklx-${idx}" style="display:none"></span>` : '';
    const qChem = d.questionChem
        ? `<span class="klx" data-src="${d.questionChem}" id="qklx-${idx}" style="display:none"></span>` : '';

    return `<div class="q-card" id="card-${idx}">
    <div style="position:relative">
      <div class="q-accent"></div>
      <div class="q-inner">
        <div class="q-top">
          <span class="q-badge">Q${idx + 1} · ${d.type}</span>
          <div class="mark-pill">
            <span class="mark-seg">+</span><span class="mark-val">${d.marks}</span>
            <div class="mark-div"></div>
            <span class="mark-seg">−</span><span class="mark-val mark-neg">${d.neg}</span>
          </div>
        </div>
        <div class="field-label">Question</div>
        <div class="field-input active" id="qfield-${idx}" style="min-height:38px">
          <span id="qtxt-${idx}"></span>${qLatex}${qChem}
          <span class="cursor-blink" id="qcur-${idx}"></span>
        </div>
        <div id="qopts-${idx}" style="opacity:0;transition:opacity 0.35s">${optsInner}</div>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
export default function ManualEditorShowcase() {
    const deviceRef = useRef<HTMLDivElement>(null);
    const simBodyRef = useRef<HTMLDivElement>(null);
    const simScrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const titleTextRef = useRef<HTMLSpanElement>(null);
    const titleCursorRef = useRef<HTMLSpanElement>(null);
    const titleFieldRef = useRef<HTMLDivElement>(null);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const metaBlockRef = useRef<HTMLDivElement>(null);
    const zoomOverlayRef = useRef<HTMLDivElement>(null);
    const zoomSnapshotRef = useRef<HTMLDivElement>(null);
    const zoomWrapRef = useRef<HTMLDivElement>(null);
    const saveTestBtnRef = useRef<HTMLButtonElement>(null);
    const popupOverlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let aborted = false;
        const timers: number[] = [];
        let renderedCards: number[] = [];
        let qIndex = -1;

        function T(fn: () => void, ms: number): number {
            const t = window.setTimeout(() => { if (!aborted) fn(); }, ms);
            timers.push(t);
            return t;
        }
        function clearAll() { timers.forEach(clearTimeout); timers.length = 0; }

        // DOM element getters (safe)
        const el = {
            get simBody() { return simBodyRef.current!; },
            get container() { return containerRef.current!; },
            get titleText() { return titleTextRef.current!; },
            get titleCursor() { return titleCursorRef.current!; },
            get titleField() { return titleFieldRef.current!; },
            get addBtn() { return addBtnRef.current!; },
            get cursor() { return cursorRef.current!; },
            get metaBlock() { return metaBlockRef.current!; },
            get zoomOverlay() { return zoomOverlayRef.current!; },
            get zoomSnapshot() { return zoomSnapshotRef.current!; },
            get zoomWrap() { return zoomWrapRef.current!; },
            get saveTestBtn() { return saveTestBtnRef.current!; },
            get popupOverlay() { return popupOverlayRef.current!; },
            get simScroll() { return simScrollRef.current!; },
            get device() { return deviceRef.current!; },
        };

        /* ── TYPING ENGINE ────────────────────────────────── */
        function typeInto(targetEl: HTMLElement, text: string, speed: number, delay: number, done?: () => void) {
            let i = 0;
            T(() => {
                function step() {
                    if (aborted) return;
                    if (i <= text.length) { targetEl.textContent = text.slice(0, i++); T(step, speed); }
                    else if (done) T(done, 350);
                }
                step();
            }, delay);
        }

        /* ── CURSOR HELPERS ───────────────────────────────── */
        function showCursorAt(x: number, y: number) {
            const c = el.cursor;
            c.style.transition = 'none';
            c.style.transform = `translate(${x}px, ${y}px)`;
            c.style.opacity = '1';
            c.getBoundingClientRect(); // force reflow
            c.style.transition = 'transform 0.52s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s';
        }
        function hideCursor() { el.cursor.style.opacity = '0'; }
        function glideTo(x: number, y: number, done: () => void) {
            el.cursor.style.transform = `translate(${x}px, ${y}px)`;
            T(done, 580);
        }
        function getCenter(e: HTMLElement) {
            const devRect = el.device.getBoundingClientRect();
            const r = e.getBoundingClientRect();
            // Changed +35px to +28px for final fine-tuning of the cursor tip
            return {
                x: r.left - devRect.left + r.width * 0.35,
                y: r.top - devRect.top + r.height / 2 + 5
            };
        }
        function deviceMidX() {
            return el.device.offsetWidth / 2;
        }

        /* ── SMOOTH SCROLL ────────────────────────────────── */
        function scrollToCard(cardEl: HTMLElement) {
            const bh = el.simBody.offsetHeight;
            const target = Math.max(0, cardEl.offsetTop - (bh / 2 - cardEl.offsetHeight / 2) + 28);
            const start = el.simBody.scrollTop, dist = target - start, dur = 580, t0 = performance.now();
            function step(now: number) {
                if (aborted) return;
                const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
                el.simBody.scrollTop = start + dist * e;
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        /* ── DIM CONTROL ──────────────────────────────────── */
        function dimAllExcept(activeIdx: number) {
            renderedCards.forEach(i => {
                const c = document.getElementById('card-' + i);
                if (!c) return;
                c.classList.toggle('active', i === activeIdx);
                c.classList.toggle('dimmed', i !== activeIdx);
            });
            const faded = activeIdx >= 0;
            el.metaBlock.style.opacity = faded ? '0.18' : '1';
            el.metaBlock.style.transform = faded ? 'scale(0.97)' : 'scale(1)';
        }

        /* ── TYPE OPTIONS ─────────────────────────────────── */
        function typeOptions(idx: number, doneCb: () => void) {
            const d = SIM_DATA[idx];
            const optsWrap = document.getElementById('qopts-' + idx);
            if (optsWrap) optsWrap.style.opacity = '1';

            const qfield = document.getElementById('qfield-' + idx);
            const qcur = document.getElementById('qcur-' + idx);
            if (qfield) qfield.classList.remove('active');
            if (qcur) qcur.style.display = 'none';

            interface TypingTask {
                target: HTMLElement | null; text: string; speed: number;
                curEl?: HTMLElement | null; optEl?: HTMLElement | null;
                klxEl?: HTMLElement | null; isOpt?: boolean; isLatex?: boolean;
            }
            const tasks: TypingTask[] = [];

            if (d.matchLeft) {
                d.matchLeft.forEach((txt, i) => {
                    tasks.push({ target: document.getElementById('ml-' + idx + '-' + i), text: txt, speed: 28 });
                });
                d.matchRight!.forEach((txt, i) => {
                    tasks.push({ target: document.getElementById('mr-' + idx + '-' + i), text: txt, speed: 28 });
                });
            }

            d.options.forEach((o, i) => {
                tasks.push({
                    target: document.getElementById('otxt-' + idx + '-' + i),
                    text: o.v, speed: 26,
                    curEl: document.getElementById('ocur-' + idx + '-' + i),
                    optEl: document.getElementById('opt-' + idx + '-' + i),
                    klxEl: document.getElementById('oklx-' + idx + '-' + i),
                    isOpt: true, isLatex: !!o.vLatex
                });
            });

            let taskIdx = 0;
            function runTask() {
                if (aborted) return;
                if (taskIdx >= tasks.length) {
                    T(() => clickCorrectOption(idx, doneCb), 300);
                    return;
                }
                const task = tasks[taskIdx++];
                const { target, text, speed, curEl, optEl, isOpt, isLatex, klxEl } = task;
                if (isOpt && optEl) optEl.classList.add('typing-active');
                if (curEl) curEl.style.display = '';

                let i = 0;
                function step() {
                    if (aborted) return;
                    if (i <= text.length) {
                        if (target) target.textContent = text.slice(0, i++);
                        T(step, speed);
                    } else {
                        if (curEl) curEl.style.display = 'none';
                        if (isOpt && optEl) optEl.classList.remove('typing-active');
                        if (isLatex && klxEl && target) {
                            target.style.display = 'none';
                            klxEl.style.display = '';
                            renderLatex(klxEl.parentElement);
                        }
                        T(runTask, 120);
                    }
                }
                step();
            }
            T(runTask, 150);
        }

        /* ── CLICK CORRECT OPTION ─────────────────────────── */
        function clickCorrectOption(idx: number, doneCb: () => void) {
            const d = SIM_DATA[idx];
            const correctIdx = d.options.findIndex(o => o.c);
            if (correctIdx < 0) { T(doneCb, 600); return; }

            const optEl = document.getElementById('opt-' + idx + '-' + correctIdx);
            const chkEl = document.getElementById('chk-' + idx + '-' + correctIdx);
            if (!optEl) { T(doneCb, 600); return; }

            const pos = getCenter(optEl);
            const startY = pos.y + 55;
            showCursorAt(deviceMidX() - 30, startY);

            T(() => {
                glideTo(pos.x, pos.y, () => {
                    optEl.classList.add('hovering-cursor');
                    if (chkEl) chkEl.classList.add('hovering-cursor');
                    T(() => {
                        optEl.classList.remove('hovering-cursor');
                        optEl.classList.add('correct');
                        if (chkEl) { chkEl.classList.remove('hovering-cursor'); chkEl.classList.add('checked'); }
                        hideCursor();
                        T(doneCb, 800);
                    }, 320);
                });
            }, 200);
        }

        /* ── FULL QUESTION RUN ────────────────────────────── */
        function runQuestion(idx: number, doneCb: () => void) {
            const card = document.getElementById('card-' + idx);
            const qtxt = document.getElementById('qtxt-' + idx);
            const qcur = document.getElementById('qcur-' + idx);
            const d = SIM_DATA[idx];
            if (!card || !qtxt || !qcur) return;

            dimAllExcept(idx);
            T(() => {
                scrollToCard(card);
                T(() => {
                    document.getElementById('qfield-' + idx)?.classList.add('active');
                    typeInto(qtxt, d.question, 30, 0, () => {
                        const klx = document.getElementById('qklx-' + idx);
                        if (klx) { klx.style.display = ''; renderLatex(klx.parentElement); }
                        qcur.style.display = 'none';
                        typeOptions(idx, doneCb);
                    });
                }, 640);
            }, 80);
        }

        /* ── ADD QUESTION CLICK ───────────────────────────── */
        function triggerAdd(cb: () => void) {
            el.addBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            T(() => {
                const pos = getCenter(el.addBtn);
                const dr = el.device.getBoundingClientRect();
                showCursorAt(dr.left + dr.width * 0.65, pos.y + 50);
                T(() => {
                    glideTo(pos.x, pos.y, () => {
                        el.addBtn.classList.add('hovering');
                        T(() => { el.addBtn.classList.remove('hovering'); hideCursor(); T(cb, 100); }, 300);
                    });
                }, 150);
            }, 280);
        }

        function addNextCard(cb: () => void) {
            qIndex++;
            renderedCards.push(qIndex);
            el.container.insertAdjacentHTML('beforeend', buildCardHTML(qIndex, SIM_DATA[qIndex]));
            document.getElementById('card-' + qIndex)?.classList.add('q-entering');
            T(cb, 600);
        }

        function runNextQuestion(cb: () => void) {
            triggerAdd(() => addNextCard(() => runQuestion(qIndex, cb)));
        }

        /* ── ZOOM-OUT FINAL ───────────────────────────────── */
        function showZoomOut(cb: () => void) {
            renderedCards.forEach(i => {
                const c = document.getElementById('card-' + i);
                if (c) { c.classList.remove('dimmed'); c.classList.remove('active'); }
            });
            el.metaBlock.style.opacity = '1';
            el.metaBlock.style.transform = 'scale(1)';
            el.simBody.scrollTop = 0;

            T(() => {
                const clone = el.simScroll.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('.cursor-blink').forEach(e => e.remove());
                clone.querySelectorAll('.active').forEach(e => e.classList.remove('active'));
                clone.querySelectorAll('.add-q-btn').forEach(e => e.remove());

                el.zoomSnapshot.innerHTML = '';
                el.zoomSnapshot.appendChild(clone);
                el.zoomOverlay.classList.add('visible');

                T(() => {
                    const wrapH = el.zoomWrap.offsetHeight;
                    const wrapW = el.zoomWrap.offsetWidth;
                    const innerH = el.zoomSnapshot.scrollHeight;
                    const innerW = el.zoomSnapshot.offsetWidth || wrapW;
                    const scaleH = (wrapH - 8) / innerH;
                    const scaleW = wrapW / innerW;
                    const scale = Math.min(scaleH, scaleW, 1);
                    el.zoomSnapshot.style.transform = `scale(${scale})`;
                    T(cb, 900);
                }, 80);
            }, 400);
        }

        /* ── SAVE TEST BUTTON CURSOR ──────────────────────── */
        function triggerSaveTest(cb: () => void) {
            T(() => {
                const pos = getCenter(el.saveTestBtn);
                const dr = el.device.getBoundingClientRect();
                showCursorAt(dr.left + dr.width * 0.25, pos.y + 50);
                T(() => {
                    glideTo(pos.x, pos.y, () => {
                        el.saveTestBtn.classList.add('pressing');
                        T(() => {
                            el.saveTestBtn.classList.remove('pressing');
                            hideCursor();
                            T(cb, 200);
                        }, 300);
                    });
                }, 150);
            }, 500);
        }

        /* ── RESTART ──────────────────────────────────────── */
        function restart() {
            clearAll();
            el.popupOverlay.classList.remove('visible');
            el.zoomOverlay.classList.remove('visible');
            el.zoomSnapshot.innerHTML = '';
            el.zoomSnapshot.style.transform = 'scale(1)';
            T(startSequence, 500);
        }

        /* ── MAIN SEQUENCE ────────────────────────────────── */
        function startSequence() {
            if (aborted) return;
            qIndex = -1;
            renderedCards = [];
            el.container.innerHTML = '';
            el.titleText.textContent = '';
            el.titleField.classList.add('active');
            el.titleCursor.style.display = '';
            el.metaBlock.style.opacity = '1';
            el.metaBlock.style.transform = 'scale(1)';
            el.simBody.scrollTop = 0;
            hideCursor();
            el.addBtn.classList.remove('hovering');

            typeInto(el.titleText, 'JEE Advanced Mock Exam \u2013 2024', 33, 700, () => {
                el.titleField.classList.remove('active');
                el.titleCursor.style.display = 'none';

                function loop() {
                    if (aborted) return;
                    if (qIndex + 1 >= SIM_DATA.length) {
                        T(() => {
                            showZoomOut(() => {
                                triggerSaveTest(() => {
                                    el.popupOverlay.classList.add('visible');
                                    T(restart, 3400);
                                });
                            });
                        }, 700);
                        return;
                    }
                    runNextQuestion(loop);
                }
                T(loop, 900);
            });
        }

        // Boot
        loadKaTeX().then(() => {
            if (!aborted) T(startSequence, 400);
        });

        return () => {
            aborted = true;
            clearAll();
            if (cursorRef.current) cursorRef.current.style.opacity = '0';
        };
    }, []);

    /* ── JSX ──────────────────────────────────────────────── */
    return (
        <div className="mes-outer">
            <div className="sim-device" ref={deviceRef}>

                {/* HEADER */}
                <div className="sim-header">
                    <div className="sim-header-left">
                        <div className="sim-logo">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                        <div>
                            <div className="sim-title-h">Test Builder</div>
                            <div className="sim-sub">TestoZa Platform</div>
                        </div>
                    </div>
                    <button className="sim-btn-primary">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12l5 5L20 7" />
                        </svg>
                        Publish
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="sim-body" ref={simBodyRef}>
                    <div className="sim-scroll" ref={simScrollRef}>

                        <div className="meta-block" ref={metaBlockRef}>
                            <div className="field-label">Test Title</div>
                            <div className="field-input" ref={titleFieldRef}>
                                <span ref={titleTextRef}></span>
                                <span className="cursor-blink" ref={titleCursorRef}></span>
                            </div>
                            <div className="meta-row">
                                <div>
                                    <div className="field-label">Time (mins)</div>
                                    <div className="field-input"><span>30</span></div>
                                </div>
                                <div>
                                    <div className="field-label">Section-wise Questions</div>
                                    <div className="field-input" style={{ padding: '8px 10px' }}>
                                        <div className="toggle-wrap">
                                            <div className="toggle-track"><div className="toggle-thumb"></div></div>
                                            <span className="toggle-label">Off</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div ref={containerRef}></div>

                        <button className="add-q-btn" ref={addBtnRef}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add New Question
                        </button>
                    </div>
                    <div className="fade-bottom"></div>
                </div>

                {/* ZOOM OVERLAY */}
                <div className="zoom-overlay" ref={zoomOverlayRef}>
                    <div className="zoom-snapshot-wrap" ref={zoomWrapRef}>
                        <div className="zoom-snapshot" ref={zoomSnapshotRef}></div>
                    </div>
                    <button className="save-test-btn" ref={saveTestBtnRef}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save Test
                    </button>
                </div>

                {/* SUCCESS POPUP */}
                <div className="popup-overlay" ref={popupOverlayRef}>
                    <div className="popup-box">
                        <div className="popup-icon">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <div className="popup-title">Test Created Successfully!</div>
                        <div className="popup-sub">Your test has been saved and is ready to be published on TestoZa.</div>
                    </div>
                </div>

                {/* MOUSE CURSOR (now inside sim-device) */}
                <div className="mes-cursor" ref={cursorRef}>
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                        <path d="M4 1L16 13H9L12 22L9 23L6 14L1 19V1H4Z" fill="white" stroke="#1e293b" strokeWidth="1.2" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
