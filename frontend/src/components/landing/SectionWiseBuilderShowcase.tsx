import { useEffect, useRef } from 'react';
import './SectionWiseBuilderShowcase.css';

/* ════════════════════════════════════════════════════════════════
   INLINE SVG STRINGS — no data-URI quoting issues
════════════════════════════════════════════════════════════════ */
const SVG_WEDGE = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='130' viewBox='0 0 220 130'>
 <rect x='0' y='100' width='220' height='30' fill='#e2e8f0'/>
 <polygon points='20,100 180,100 180,40' fill='#cbd5e1' stroke='#94a3b8' stroke-width='1.5'/>
 <rect x='108' y='50' width='42' height='30' rx='3' fill='#4f46e5' stroke='#3730a3' stroke-width='1.5' transform='rotate(-27 129 65)'/>
 <text x='129' y='69' font-size='12' fill='white' font-family='sans-serif' text-anchor='middle' transform='rotate(-27 129 65)'>m</text>
 <text x='148' y='96' font-size='12' fill='#334155' font-family='sans-serif'>M</text>
 <line x1='180' y1='68' x2='212' y2='68' stroke='#475569' stroke-width='1.8' marker-end='url(#ah)'/>
 <defs><marker id='ah' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path d='M0,0 L6,3 L0,6 Z' fill='#475569'/></marker></defs>
 <text x='193' y='63' font-size='10' fill='#475569' font-family='sans-serif'>F</text>
 <text x='28' y='118' font-size='11' fill='#64748b' font-family='sans-serif'>θ=30°</text>
</svg>`;

const SVG_VT_A = `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='75' viewBox='0 0 110 75'>
 <line x1='12' y1='63' x2='100' y2='63' stroke='#94a3b8' stroke-width='1.2'/>
 <line x1='12' y1='63' x2='12' y2='6' stroke='#94a3b8' stroke-width='1.2'/>
 <text x='55' y='73' font-size='9' fill='#94a3b8' text-anchor='middle' font-family='sans-serif'>t</text>
 <text x='4' y='38' font-size='9' fill='#94a3b8' font-family='sans-serif'>v</text>
 <path d='M12 52 Q35 8 58 40 Q80 68 100 12' stroke='#4f46e5' stroke-width='2.2' fill='none'/>
 <text x='35' y='72' font-size='8' fill='#475569' font-family='sans-serif'>(A) Sinusoidal</text>
</svg>`;

const SVG_VT_B = `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='75' viewBox='0 0 110 75'>
 <line x1='12' y1='63' x2='100' y2='63' stroke='#94a3b8' stroke-width='1.2'/>
 <line x1='12' y1='63' x2='12' y2='6' stroke='#94a3b8' stroke-width='1.2'/>
 <text x='55' y='73' font-size='9' fill='#94a3b8' text-anchor='middle' font-family='sans-serif'>t</text>
 <text x='4' y='38' font-size='9' fill='#94a3b8' font-family='sans-serif'>v</text>
 <line x1='12' y1='18' x2='100' y2='18' stroke='#dc2626' stroke-width='2.2'/>
 <text x='25' y='72' font-size='8' fill='#475569' font-family='sans-serif'>(B) Constant</text>
</svg>`;

const SVG_VT_C = `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='75' viewBox='0 0 110 75'>
 <line x1='12' y1='63' x2='100' y2='63' stroke='#94a3b8' stroke-width='1.2'/>
 <line x1='12' y1='63' x2='12' y2='6' stroke='#94a3b8' stroke-width='1.2'/>
 <text x='55' y='73' font-size='9' fill='#94a3b8' text-anchor='middle' font-family='sans-serif'>t</text>
 <text x='4' y='38' font-size='9' fill='#94a3b8' font-family='sans-serif'>v</text>
 <path d='M12 55 Q55 6 100 55' stroke='#4f46e5' stroke-width='2.2' fill='none'/>
 <text x='25' y='72' font-size='8' fill='#475569' font-family='sans-serif'>(C) Parabolic</text>
</svg>`;

const SVG_VT_D = `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='75' viewBox='0 0 110 75'>
 <line x1='12' y1='63' x2='100' y2='63' stroke='#94a3b8' stroke-width='1.2'/>
 <line x1='12' y1='63' x2='12' y2='6' stroke='#94a3b8' stroke-width='1.2'/>
 <text x='55' y='73' font-size='9' fill='#94a3b8' text-anchor='middle' font-family='sans-serif'>t</text>
 <text x='4' y='38' font-size='9' fill='#94a3b8' font-family='sans-serif'>v</text>
 <line x1='12' y1='55' x2='100' y2='18' stroke='#4f46e5' stroke-width='2.2'/>
 <text x='22' y='72' font-size='8' fill='#475569' font-family='sans-serif'>(D) Linear decay</text>
</svg>`;

/* ════════════════════════════════════════════════════════════════
   JEE ADVANCED 2023 – PAPER 1 DATA
   Physics×2  |  Chemistry×2  |  Mathematics×2
   (section-correct ordering)
════════════════════════════════════════════════════════════════ */
interface SimOpt {
    v: string;
    c?: boolean;
    vLatex?: string;
    imgHtml?: string;   // inline SVG markup
}
interface SimQuestion {
    num: string;
    section: 'Physics' | 'Chemistry' | 'Mathematics';
    type: string;
    marks: string;
    neg: string;
    question: string;
    questionLatex?: string;
    questionChem?: string;
    questionImgHtml?: string;   // inline SVG for question body
    tableHtml?: string;
    options: SimOpt[];
}

// ── PHYSICS (indices 0,1) ──────────────────────────────────────
// ── CHEMISTRY (indices 2,3) ───────────────────────────────────
// ── MATHEMATICS (indices 4,5) ─────────────────────────────────
const SIM_DATA: SimQuestion[] = [
    // [0] Physics – Image in question (Block on wedge)
    {
        num: 'Q1', section: 'Physics', type: 'Single Correct',
        marks: '3', neg: '1',
        question: 'A block of mass m rests on a fixed wedge (inclination θ=30°). A horizontal force F is applied on the wedge. For the block to just start sliding, the minimum value of F is:',
        questionImgHtml: SVG_WEDGE,
        options: [
            { v: '(M+m)g tan θ', vLatex: '(M+m)g\\tan\\theta' },
            { v: 'mg(sinθ + μcosθ)', vLatex: 'mg(\\sin\\theta + \\mu\\cos\\theta)', c: true },
            { v: 'Mg tan θ', vLatex: 'Mg\\tan\\theta' },
            { v: 'mg cosθ', vLatex: 'mg\\cos\\theta' },
        ]
    },
    // [1] Physics – Diagrams in options (v-t graphs)
    {
        num: 'Q2', section: 'Physics', type: 'Single Correct',
        marks: '3', neg: '1',
        question: 'A particle undergoes uniform circular motion. Which of the following v-t graphs CANNOT represent the component of velocity along a fixed direction?',
        options: [
            { v: '', imgHtml: SVG_VT_A },
            { v: '', imgHtml: SVG_VT_B, c: true },
            { v: '', imgHtml: SVG_VT_C },
            { v: '', imgHtml: SVG_VT_D },
        ]
    },
    // [2] Chemistry – Reaction (mhchem) in question, Multiple Correct
    {
        num: 'Q3', section: 'Chemistry', type: 'Multiple Correct',
        marks: '4', neg: '2',
        question: 'Consider the reaction sequence below. Identify ALL correct statements:',
        questionChem: '\\ce{C6H4(OH)(COOH) ->[(CH3CO)2O][\\Delta] C6H4(OOCCH3)(COOH) + CH3COOH}',
        options: [
            { v: 'It is an acetylation reaction', c: true },
            { v: 'The carboxyl −OH is protected' },
            { v: 'Phenolic −OH undergoes esterification', c: true },
            { v: 'Acetic anhydride is the nucleophile' },
        ]
    },
    // [3] Chemistry – Table (Match the following)
    {
        num: 'Q4', section: 'Chemistry', type: 'Match the Following',
        marks: '4', neg: '2',
        question: 'Match List I (Ores) with List II (Extraction process):',
        tableHtml: `<table class='swb-table'><thead><tr><th>List I (Ore)</th><th>List II (Process)</th></tr></thead><tbody><tr><td>A. Calamine (ZnCO₃)</td><td>P. Calcination</td></tr><tr><td>B. Malachite (Cu₂(OH)₂CO₃)</td><td>Q. Roasting</td></tr><tr><td>C. Copper Pyrites (CuFeS₂)</td><td>R. Electrolytic reduction</td></tr><tr><td>D. Alumina (Al₂O₃)</td><td>S. Leaching</td></tr></tbody></table>`,
        options: [
            { v: 'A-P, B-P, C-Q, D-R', c: true },
            { v: 'A-Q, B-P, C-R, D-S' },
            { v: 'A-P, B-Q, C-S, D-R' },
            { v: 'A-R, B-S, C-P, D-Q' },
        ]
    },
    // [4] Mathematics – Pure KaTeX (Definite Integral)
    {
        num: 'Q5', section: 'Mathematics', type: 'Single Correct',
        marks: '3', neg: '1',
        question: 'The value of the following definite integral equals:',
        questionLatex: '\\int_0^{\\pi/2} \\frac{x \\sin x \\cos x}{\\sin^4 x + \\cos^4 x}\\, dx',
        options: [
            { v: 'π²/8',  vLatex: '\\dfrac{\\pi^2}{8}', c: true },
            { v: 'π²/16', vLatex: '\\dfrac{\\pi^2}{16}' },
            { v: 'π/4',   vLatex: '\\dfrac{\\pi}{4}' },
            { v: 'π²/4',  vLatex: '\\dfrac{\\pi^2}{4}' },
        ]
    },
    // [5] Mathematics – KaTeX (3D shortest distance between skew lines)
    {
        num: 'Q6', section: 'Mathematics', type: 'Single Correct',
        marks: '3', neg: '1',
        question: 'The shortest distance between the following skew lines is:',
        questionLatex: '\\vec{r}=(\\hat{i}+2\\hat{j}+\\hat{k})+\\lambda(\\hat{i}-\\hat{j}+\\hat{k}),\\quad \\vec{r}=(2\\hat{i}-\\hat{j}-\\hat{k})+\\mu(2\\hat{i}+\\hat{j}+2\\hat{k})',
        options: [
            { v: '0' },
            { v: '√38/3',    vLatex: '\\dfrac{\\sqrt{38}}{3}' },
            { v: '√38/√3',   vLatex: '\\dfrac{\\sqrt{38}}{\\sqrt{3}}', c: true },
            { v: '2√3',      vLatex: '2\\sqrt{3}' },
        ]
    },
];

/* ════════════════════════════════════════════════════════════════
   KATEX CDN LOADER
════════════════════════════════════════════════════════════════ */
function loadKaTeX(): Promise<void> {
    if ((window as any).katex) return Promise.resolve();
    return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
        s.onload = () => {
            const chem = document.createElement('script');
            chem.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js';
            chem.onload = () => resolve();
            document.head.appendChild(chem);
        };
        document.head.appendChild(s);
    });
}

function renderKaTeX(container: Element | null) {
    if (!container || !(window as any).katex) return;
    container.querySelectorAll('.swb-klx').forEach((span: any) => {
        if (span.dataset.done) return;
        span.dataset.done = '1';
        try {
            (window as any).katex.render(span.dataset.src, span, {
                throwOnError: false,
                displayMode: span.dataset.display === '1',
                trust: true,
            });
        } catch (_) { /* ignore */ }
    });
}

/* ════════════════════════════════════════════════════════════════
   CARD HTML BUILDER
   Uses inline SVG (never data-URI) to avoid quoting bugs
════════════════════════════════════════════════════════════════ */
function buildCardHTML(d: SimQuestion): string {
    const idx = d.num;

    // Question text + optional math
    let qBody = `<span id="swb-qtxt-${idx}"></span>`;
    if (d.questionLatex) {
        qBody += `<span class="swb-klx" data-display="1" data-src="${escAttr(d.questionLatex)}" id="swb-qklx-${idx}" style="display:none"></span>`;
    }
    if (d.questionChem) {
        qBody += `<span class="swb-klx" data-src="${escAttr(d.questionChem)}" id="swb-qklx-${idx}" style="display:none"></span>`;
    }
    qBody += `<span class="swb-cursor-blink" id="swb-qcur-${idx}"></span>`;

    // Question image (inline SVG in a wrapper)
    const qImg = d.questionImgHtml
        ? `<div class="swb-img-wrap" id="swb-qimg-${idx}" style="display:none">
               <div class="swb-img-shimmer" id="swb-qshim-${idx}"></div>
               <div class="swb-diagram-cont" id="swb-qimgel-${idx}" style="display:none">${d.questionImgHtml}</div>
           </div>`
        : '';

    // Table
    const tableHtml = d.tableHtml
        ? `<div class="swb-table-wrap" id="swb-qtbl-${idx}" style="display:none">${d.tableHtml}</div>`
        : '';

    // Options — inline SVG for image-options, KaTeX span for math options
    const optsHtml = d.options.map((o, i) => {
        let optContent = '';
        if (o.imgHtml) {
            // Diagram option: shimmer + inline SVG container
            optContent = `<div class="swb-opt-img-wrap" id="swb-oimgwrap-${idx}-${i}">
                <div class="swb-img-shimmer" id="swb-oshim-${idx}-${i}"></div>
                <div class="swb-opt-img-cont" id="swb-oimgel-${idx}-${i}" style="display:none">${o.imgHtml}</div>
            </div>`;
        } else {
            // Text/LaTeX option
            const klxSpan = o.vLatex
                ? `<span class="swb-klx" data-src="${escAttr(o.vLatex)}" id="swb-oklx-${idx}-${i}" style="display:none"></span>`
                : '';
            optContent = `<span id="swb-otxt-${idx}-${i}"></span>${klxSpan}
                <span class="swb-cursor-blink" id="swb-ocur-${idx}-${i}" style="display:none"></span>`;
        }
        return `<div class="swb-opt-item" id="swb-opt-${idx}-${i}">
            <div class="swb-opt-check" id="swb-chk-${idx}-${i}"></div>
            <div class="swb-opt-body">${optContent}</div>
        </div>`;
    }).join('');

    return `<div class="swb-q-card-inner" id="swb-card-${idx}">
    <div class="swb-q-top">
        <span class="swb-q-badge">${idx} · ${d.section} · ${d.type}</span>
        <div class="swb-mark-pill">
            <span class="swb-ms">+</span><span class="swb-mv">${d.marks}</span>
            <div class="swb-md"></div>
            <span class="swb-ms">−</span><span class="swb-mv swb-neg">${d.neg}</span>
        </div>
    </div>
    <div class="swb-field-label">Question</div>
    <div class="swb-q-field" id="swb-qfield-${idx}">${qBody}</div>
    ${qImg}${tableHtml}
    <div class="swb-field-label" style="margin-top:10px">Options</div>
    <div class="swb-opts-grid" id="swb-opts-${idx}" style="opacity:0;transition:opacity 0.35s">${optsHtml}</div>
</div>`;
}

/** Safe attribute escaping for KaTeX src strings inside double-quoted attributes */
function escAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
export default function SectionWiseBuilderShowcase({ onComplete }: { onComplete?: () => void }) {
    const deviceRef   = useRef<HTMLDivElement>(null);
    const bodyRef     = useRef<HTMLDivElement>(null);
    const cursorRef   = useRef<HTMLDivElement>(null);
    const secToggleRef  = useRef<HTMLDivElement>(null);
    const addGeneralQRef  = useRef<HTMLDivElement>(null);
    const addNewSecBtnRef = useRef<HTMLDivElement>(null);
    const titleTextRef    = useRef<HTMLSpanElement>(null);

    // Section cards & controls
    const s1CardRef = useRef<HTMLDivElement>(null);
    const s1NameRef = useRef<HTMLDivElement>(null);
    const s1NameTxtRef = useRef<HTMLSpanElement>(null);
    const s1NameCurRef = useRef<HTMLSpanElement>(null);
    const s1AddQRef = useRef<HTMLDivElement>(null);
    const s1QCont   = useRef<HTMLDivElement>(null);

    const s2CardRef = useRef<HTMLDivElement>(null);
    const s2NameRef = useRef<HTMLDivElement>(null);
    const s2NameTxtRef = useRef<HTMLSpanElement>(null);
    const s2NameCurRef = useRef<HTMLSpanElement>(null);
    const s2AddQRef = useRef<HTMLDivElement>(null);
    const s2QCont   = useRef<HTMLDivElement>(null);

    const s3CardRef = useRef<HTMLDivElement>(null);
    const s3NameRef = useRef<HTMLDivElement>(null);
    const s3NameTxtRef = useRef<HTMLSpanElement>(null);
    const s3NameCurRef = useRef<HTMLSpanElement>(null);
    const s3AddQRef = useRef<HTMLDivElement>(null);
    const s3QCont   = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let aborted = false;
        const timers: number[] = [];
        // Track last known cursor position to avoid jarring teleports
        let curX = 0, curY = 0;

        function T(fn: () => void, ms: number) {
            if (aborted) return;
            const t = window.setTimeout(() => { if (!aborted) fn(); }, ms);
            timers.push(t);
        }

        /* ── CURSOR ──────────────────────────────────────────────── */
        function moveCursorTo(x: number, y: number, instant = false) {
            const c = cursorRef.current;
            if (!c) return;
            if (instant) {
                c.style.transition = 'none';
                c.style.transform = `translate(${x}px,${y}px)`;
                c.style.opacity = '1';
                c.getBoundingClientRect(); // force reflow
                c.style.transition = 'transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s';
            } else {
                c.style.transform = `translate(${x}px,${y}px)`;
                c.style.opacity = '1';
            }
            curX = x; curY = y;
        }

        function hideCursor() {
            if (cursorRef.current) cursorRef.current.style.opacity = '0';
        }

        function getElCenter(el: Element): { x: number; y: number } {
            const devR = deviceRef.current!.getBoundingClientRect();
            const r    = el.getBoundingClientRect();
            return {
                x: r.left - devR.left + r.width * 0.35,
                y: r.top  - devR.top  + r.height * 0.45,
            };
        }

        /** Glide cursor smoothly to element, then call done after arrival */
        function glideTo(el: Element | null, done: () => void) {
            if (!el) { T(done, 100); return; }
            const { x, y } = getElCenter(el);

            // Only teleport if cursor is completely hidden (first appearance in current loop).
            // Snap to same Y, 70px left — glide is purely horizontal, no vertical jump.
            if (cursorRef.current?.style.opacity === '0') {
                moveCursorTo(x - 70, y, true);
            }
            T(() => { moveCursorTo(x, y); }, 60);
            T(done, 680); // 0.55s CSS transition + small buffer
        }

        function clickEl(el: Element | null, done: () => void) {
            if (!el) { T(done, 100); return; }
            glideTo(el, () => {
                const c = cursorRef.current!;
                c.classList.add('clicking');
                T(() => {
                    c.classList.remove('clicking');
                    T(done, 180);
                }, 150);
            });
        }

        /* ── SMOOTH SCROLL ─────────────────────────────────────── */
        function scrollTo(el: Element | null, done: () => void) {
            if (!bodyRef.current || !el) { T(done, 100); return; }
            const container = bodyRef.current;
            const r  = el.getBoundingClientRect();
            const cR = container.getBoundingClientRect();
            const targetTop = container.scrollTop + (r.top - cR.top) - 100;
            const start = container.scrollTop;
            const dist  = targetTop - start;
            if (Math.abs(dist) < 5) { T(done, 80); return; }
            const dur = Math.min(Math.abs(dist) * 1.1, 600);
            const t0  = performance.now();
            function step(now: number) {
                if (aborted) return;
                const p = Math.min((now - t0) / dur, 1);
                const e = 1 - Math.pow(1 - p, 3);
                container.scrollTop = start + dist * e;
                if (p < 1) requestAnimationFrame(step);
                else T(done, 80);
            }
            requestAnimationFrame(step);
        }

        /* ── TYPING ────────────────────────────────────────────── */
        function typeInto(
            el: HTMLSpanElement | null,
            curEl: HTMLSpanElement | null,
            text: string,
            speed: number,
            done: () => void
        ) {
            if (!el) { T(done, 200); return; }
            if (curEl) curEl.style.display = 'inline-block';
            let i = 0;
            function step() {
                if (aborted) return;
                if (i <= text.length) { el.textContent = text.slice(0, i++); T(step, speed); }
                else { if (curEl) curEl.style.display = 'none'; T(done, 280); }
            }
            step();
        }

        /* ── SHIMMER → REVEAL ──────────────────────────────────── */
        function shimmerReveal(shimId: string, contId: string, done: () => void) {
            const shim = document.getElementById(shimId);
            const cont = document.getElementById(contId);
            if (!shim || !cont) { T(done, 100); return; }
            shim.classList.add('active');
            T(() => {
                shim.classList.remove('active');
                shim.style.display = 'none';
                cont.style.display = 'block';
                T(done, 350);
            }, 900);
        }

        /* ── FILL OPTIONS ──────────────────────────────────────── */
        function fillOptions(d: SimQuestion, doneCb: () => void) {
            const idx = d.num;
            const optsWrap = document.getElementById('swb-opts-' + idx);
            if (optsWrap) optsWrap.style.opacity = '1';

            // Deactivate question field
            document.getElementById('swb-qfield-' + idx)?.classList.remove('active');
            const qcur = document.getElementById('swb-qcur-' + idx);
            if (qcur) qcur.style.display = 'none';

            let i = 0;
            function runOpt() {
                if (aborted || i >= d.options.length) {
                    // Click ALL correct options sequentially
                    T(() => clickAllCorrect(d, 0, doneCb), 400);
                    return;
                }
                const o = d.options[i];
                const optEl = document.getElementById(`swb-opt-${idx}-${i}`);
                if (optEl) optEl.classList.add('typing-active');

                if (o.imgHtml) {
                    // Diagram option – shimmer then reveal
                    const wrapEl = document.getElementById(`swb-oimgwrap-${idx}-${i}`);
                    if (wrapEl) wrapEl.style.display = 'block';
                    shimmerReveal(`swb-oshim-${idx}-${i}`, `swb-oimgel-${idx}-${i}`, () => {
                        if (optEl) optEl.classList.remove('typing-active');
                        i++;
                        T(runOpt, 150);
                    });
                } else {
                    const curEl = document.getElementById(`swb-ocur-${idx}-${i}`) as HTMLSpanElement | null;
                    const txtEl = document.getElementById(`swb-otxt-${idx}-${i}`) as HTMLSpanElement | null;
                    const klxEl = document.getElementById(`swb-oklx-${idx}-${i}`);
                    if (curEl) curEl.style.display = 'inline-block';
                    typeInto(txtEl, curEl, o.v, 26, () => {
                        if (o.vLatex && klxEl) {
                            if (txtEl) txtEl.style.display = 'none';
                            klxEl.style.display = 'inline';
                            renderKaTeX(klxEl.parentElement);
                        }
                        if (optEl) optEl.classList.remove('typing-active');
                        i++;
                        T(runOpt, 110);
                    });
                }
            }
            T(runOpt, 180);
        }

        /* ── CLICK ALL CORRECT OPTIONS (sequential) ─────────────── */
        function clickAllCorrect(d: SimQuestion, startAt: number, doneCb: () => void) {
            const idx = d.num;
            // Find next correct from startAt
            let ci = -1;
            for (let k = startAt; k < d.options.length; k++) {
                if (d.options[k].c) { ci = k; break; }
            }
            if (ci < 0) { hideCursor(); T(doneCb, 600); return; }

            const optEl = document.getElementById(`swb-opt-${idx}-${ci}`);
            const chkEl = document.getElementById(`swb-chk-${idx}-${ci}`);
            if (!optEl) { T(doneCb, 400); return; }

            clickEl(optEl, () => {
                optEl.classList.add('correct');
                if (chkEl) chkEl.classList.add('checked');
                // Continue looking for next correct option
                T(() => clickAllCorrect(d, ci + 1, doneCb), 350);
            });
        }

        /* ── FULL QUESTION SEQUENCE ────────────────────────────── */
        function runQuestion(
            d: SimQuestion,
            container: HTMLDivElement | null,
            addQBtn: HTMLDivElement | null,
            doneCb: () => void
        ) {
            if (!container || !addQBtn) { T(doneCb, 200); return; }

            scrollTo(addQBtn, () => {
                clickEl(addQBtn, () => {
                    container.insertAdjacentHTML('beforeend', buildCardHTML(d));
                    const card = document.getElementById('swb-card-' + d.num);
                    if (card) card.classList.add('swb-q-entering');

                    T(() => {
                        if (aborted) return;
                        const idx = d.num;
                        const qtEl = document.getElementById('swb-qtxt-' + idx) as HTMLSpanElement | null;
                        const qcEl = document.getElementById('swb-qcur-' + idx) as HTMLSpanElement | null;

                        scrollTo(card, () => {
                            document.getElementById('swb-qfield-' + idx)?.classList.add('active');
                            typeInto(qtEl, qcEl, d.question, 27, () => {
                                // Show KaTeX / chem formula in question
                                const qklx = document.getElementById('swb-qklx-' + idx);
                                if (qklx) { qklx.style.display = 'inline'; renderKaTeX(qklx.parentElement); }

                                // Reveal question image
                                if (d.questionImgHtml) {
                                    const wrapEl = document.getElementById('swb-qimg-' + idx);
                                    if (wrapEl) wrapEl.style.display = 'flex';
                                    shimmerReveal(`swb-qshim-${idx}`, `swb-qimgel-${idx}`, () => afterImage(idx, d, doneCb));
                                } else {
                                    afterImage(idx, d, doneCb);
                                }
                            });
                        });
                    }, 450);
                });
            });
        }

        function afterImage(idx: string, d: SimQuestion, doneCb: () => void) {
            if (d.tableHtml) {
                const tbl = document.getElementById('swb-qtbl-' + idx);
                if (tbl) { tbl.style.display = 'block'; tbl.classList.add('swb-table-reveal'); }
                T(() => fillOptions(d, doneCb), 550);
            } else {
                fillOptions(d, doneCb);
            }
        }

        /* ── TYPE SECTION NAME ─────────────────────────────────── */
        function typeSection(
            nameRef: HTMLDivElement | null,
            txtRef: HTMLSpanElement | null,
            curRef: HTMLSpanElement | null,
            name: string,
            done: () => void
        ) {
            if (!nameRef) { T(done, 200); return; }
            if (txtRef) txtRef.textContent = '';
            clickEl(nameRef, () => typeInto(txtRef, curRef, name, 55, done));
        }

        /* ── RESET ─────────────────────────────────────────────── */
        function resetAll() {
            secToggleRef.current?.classList.remove('on');
            if (addGeneralQRef.current)  addGeneralQRef.current.style.display  = 'flex';
            if (addNewSecBtnRef.current) addNewSecBtnRef.current.style.display = 'none';
            [s1CardRef, s2CardRef, s3CardRef].forEach(r => r.current?.classList.remove('visible', 'section-enter'));
            [s1QCont, s2QCont, s3QCont].forEach(r => { if (r.current) r.current.innerHTML = ''; });
            [s1NameTxtRef, s2NameTxtRef, s3NameTxtRef].forEach(r => { if (r.current) r.current.textContent = 'Section'; });
            if (bodyRef.current) bodyRef.current.scrollTop = 0;
            hideCursor();
            curX = 0; curY = 0;
        }

        /* ── MAIN SEQUENCE ─────────────────────────────────────── */
        function startSequence() {
            if (aborted) return;
            resetAll();

            T(() => {
                if (titleTextRef.current) titleTextRef.current.textContent = '';
                typeInto(titleTextRef.current, null, 'JEE Advanced 2023 — Paper 1', 32, () => {
                    scrollTo(secToggleRef.current, () => {
                        clickEl(secToggleRef.current, () => {
                            secToggleRef.current?.classList.add('on');
                            if (addGeneralQRef.current)  addGeneralQRef.current.style.display  = 'none';
                            if (addNewSecBtnRef.current) addNewSecBtnRef.current.style.display = 'flex';
                            T(runPhysics, 500);
                        });
                    });
                });
            }, 600);
        }

        function runPhysics() {
            s1CardRef.current?.classList.add('visible', 'section-enter');
            scrollTo(s1CardRef.current, () => {
                typeSection(s1NameRef.current, s1NameTxtRef.current, s1NameCurRef.current, 'Physics', () => {
                    runQuestion(SIM_DATA[0], s1QCont.current, s1AddQRef.current, () => {
                        T(() => runQuestion(SIM_DATA[1], s1QCont.current, s1AddQRef.current, () => {
                            T(runChemistry, 700);
                        }), 450);
                    });
                });
            });
        }

        function runChemistry() {
            scrollTo(addNewSecBtnRef.current, () => {
                clickEl(addNewSecBtnRef.current, () => {
                    s2CardRef.current?.classList.add('visible', 'section-enter');
                    scrollTo(s2CardRef.current, () => {
                        typeSection(s2NameRef.current, s2NameTxtRef.current, s2NameCurRef.current, 'Chemistry', () => {
                            runQuestion(SIM_DATA[2], s2QCont.current, s2AddQRef.current, () => {
                                T(() => runQuestion(SIM_DATA[3], s2QCont.current, s2AddQRef.current, () => {
                                    T(runMathematics, 700);
                                }), 450);
                            });
                        });
                    });
                });
            });
        }

        function runMathematics() {
            scrollTo(addNewSecBtnRef.current, () => {
                clickEl(addNewSecBtnRef.current, () => {
                    s3CardRef.current?.classList.add('visible', 'section-enter');
                    scrollTo(s3CardRef.current, () => {
                        typeSection(s3NameRef.current, s3NameTxtRef.current, s3NameCurRef.current, 'Mathematics', () => {
                            runQuestion(SIM_DATA[4], s3QCont.current, s3AddQRef.current, () => {
                                T(() => runQuestion(SIM_DATA[5], s3QCont.current, s3AddQRef.current, () => {
                                    T(() => {
                                        if (!aborted) {
                                            if (onComplete) {
                                                onComplete();
                                            } else {
                                                startSequence();
                                            }
                                        }
                                    }, 5000);
                                }), 450);
                            });
                        });
                    });
                });
            });
        }

        // Boot with IntersectionObserver
        let started = false;
        let observer: IntersectionObserver | null = null;
        loadKaTeX().then(() => {
            if (aborted) return;
            observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !started) {
                    started = true;
                    T(startSequence, 400);
                }
            }, { threshold: 0.15 });
            if (deviceRef.current) observer.observe(deviceRef.current);
        });

        return () => {
            aborted = true;
            timers.forEach(clearTimeout);
            if (observer) observer.disconnect();
        };
    }, []);

    /* ── SECTION CARD JSX ───────────────────────────────────── */
    const renderSection = (
        sRef: React.RefObject<HTMLDivElement>,
        nameRef: React.RefObject<HTMLDivElement>,
        txtRef: React.RefObject<HTMLSpanElement>,
        curRef: React.RefObject<HTMLSpanElement>,
        addQRef: React.RefObject<HTMLDivElement>,
        qCont: React.RefObject<HTMLDivElement>,
    ) => (
        <div className="swb-section-card" ref={sRef}>
            <div className="swb-sec-header">
                <div className="swb-sec-drag">⠿</div>
                <div className="swb-sec-name-wrap" ref={nameRef}>
                    <div className="swb-sec-label">Section Name</div>
                    <div className="swb-sec-name-input">
                        <span ref={txtRef}>Section</span>
                        <span ref={curRef} style={{ display: 'none' }} className="swb-text-cursor"></span>
                    </div>
                </div>
                <div className="swb-sec-actions">
                    <span className="swb-sec-action-icon">⌃</span>
                    <span className="swb-sec-action-icon">⋮</span>
                    <span className="swb-sec-action-icon swb-trash">🗑</span>
                </div>
            </div>
            <div className="swb-sec-body">
                <div ref={qCont}></div>
                <div className="swb-add-q-btn" ref={addQRef}>
                    <span className="swb-plus">+</span> Add Question to Section
                </div>
            </div>
        </div>
    );

    /* ── JSX ────────────────────────────────────────────────── */
    return (
        <div className="swb-outer">
            <div className="swb-device" ref={deviceRef}>
                {/* Cursor */}
                <div className="swb-cursor" ref={cursorRef}>
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                        <path d="M4 1L16 13H9L12 22L9 23L6 14L1 19V1H4Z" fill="white" stroke="#1e293b" strokeWidth="1.2" />
                    </svg>
                </div>

                {/* Header */}
                <div className="swb-header">
                    <div className="swb-header-left">
                        <div className="swb-logo">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                        <div>
                            <div className="swb-header-title">Test Builder</div>
                            <div className="swb-header-sub">TestoZa Platform</div>
                        </div>
                    </div>
                    <button className="swb-publish-btn">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
                        Publish
                    </button>
                </div>

                {/* Body */}
                <div className="swb-body" ref={bodyRef}>
                    {/* Meta */}
                    <div className="swb-meta-block">
                        <div className="swb-field-label">Test Title</div>
                        <div className="swb-field-input swb-field-active">
                            <span ref={titleTextRef}></span>
                            <span className="swb-cursor-blink"></span>
                        </div>
                        <div className="swb-meta-row">
                            <div>
                                <div className="swb-field-label">Duration (mins)</div>
                                <div className="swb-field-input"><span>180</span></div>
                            </div>
                            <div>
                                <div className="swb-field-label">Section-wise Questions</div>
                                <div className="swb-toggle-wrap">
                                    <div className="swb-toggle" ref={secToggleRef}>
                                        <div className="swb-toggle-thumb"></div>
                                    </div>
                                    <span className="swb-toggle-label">Off</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="swb-add-general-btn" ref={addGeneralQRef}>
                        <span className="swb-plus">+</span> Add New Question
                    </div>

                    {renderSection(s1CardRef, s1NameRef, s1NameTxtRef, s1NameCurRef, s1AddQRef, s1QCont)}
                    {renderSection(s2CardRef, s2NameRef, s2NameTxtRef, s2NameCurRef, s2AddQRef, s2QCont)}
                    {renderSection(s3CardRef, s3NameRef, s3NameTxtRef, s3NameCurRef, s3AddQRef, s3QCont)}

                    <div className="swb-add-sec-btn" ref={addNewSecBtnRef} style={{ display: 'none' }}>
                        <span className="swb-plus">+</span> Add New Section
                    </div>

                    <div className="swb-fade-bottom"></div>
                </div>
            </div>
        </div>
    );
}
