// Markup of the 2D scenes (flat, friendly explainer style). anim.js animates them on the cue times.
// paper: the Sunday-night desk, seen from above → the laptop → title.   promise: paper → online, four flip cards.
// shapes: how a marks spread reads.   patterns: three wrong-answer patterns.   routine: the Monday checklist.   end.

const range = (n) => Array.from({ length: n }, (_, i) => i);
const OPT = ['a', 'b', 'c', 'd'];
// Bubbled answers on the top sheet, and how the teacher marked them.
const SHEET = [[1, 1], [0, 1], [1, 1], [0, 0], [3, 1], [1, 1], [0, 0], [2, 1], [0, 1], [1, 0]];

const pen = `<svg viewBox="0 0 60 420" class="pen"><rect x="14" y="40" width="32" height="300" rx="10" fill="#e11d48"/><rect x="14" y="40" width="32" height="34" rx="8" fill="#be123c"/><rect x="40" y="70" width="8" height="120" rx="4" fill="#9f1239"/><path d="M14 336 L30 404 L46 336 Z" fill="#fde2e4"/><path d="M26 388 L30 404 L34 388 Z" fill="#9f1239"/><rect x="18" y="8" width="24" height="40" rx="9" fill="#9f1239"/></svg>`;
const chai = `<svg viewBox="0 0 220 220" class="glass"><circle cx="110" cy="110" r="96" fill="#f1ece4"/><circle cx="110" cy="110" r="96" fill="none" stroke="#d9d1c4" stroke-width="6"/><circle cx="110" cy="110" r="76" fill="#b9793a"/><circle cx="110" cy="110" r="76" fill="url(#chaiShine)"/><path d="M68 92 a46 46 0 0 1 40 -36" stroke="#e8c79b" stroke-width="8" fill="none" stroke-linecap="round" opacity=".55"/><defs><radialGradient id="chaiShine" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d79a55"/><stop offset="1" stop-color="#8f5a26" stop-opacity=".2"/></radialGradient></defs></svg>`;
const steam = (cls) => `<svg viewBox="0 0 200 220" class="${cls}"><path class="s1" d="M60 210 C30 170 90 150 60 110 C30 70 90 50 64 10"/><path class="s2" d="M104 210 C74 170 134 150 104 110 C74 70 134 50 108 10"/><path class="s3" d="M148 210 C118 170 178 150 148 110 C118 70 178 50 152 10"/></svg>`;

function paper() {
  const lines = SHEET.map(([pick, ok], i) => `<div class="al"><b>${i + 1}.</b>${OPT.map((o, k) => `<i class="${k === pick ? 'on' : ''}">${o}</i>`).join('')}<em class="mk ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</em></div>`).join('');
  const reg = range(9).map((i) => `<div class="rr"><span>CGL-${String([1, 30, 7, 36, 13, 42, 19, 48, 25][i]).padStart(2, '0')}</span><em>${[37.5, 33, 33, 32.5, 32.5, 32.5, 30.5, 30.5, 30][i]}</em></div>`).join('');
  const rank = ['Aditi', 'Sneha', 'Rahul', 'Vikas', 'Priyanka', 'Mohd. Arif', 'Neha', 'Saurabh'].map((n, i) => `<div class="kr"><b>${i + 1}</b><span>${n}</span><i></i></div>`).join('');
  const nums = ['37.5', '33', '21.7', '54%', '11', '94%', '8%', '48', '19', '1', '0', '26', '4', '17', '2', '22', '29%', '52', '44%', '16', '33', '30.5', '18', '45%', '75%', '57%', '70%', '3', '14', '9'].map((n) => `<span>${n}</span>`).join('');
  return `
  <div class="pp-desk"><div class="grain"></div></div>
  <div class="pp-day"></div>
  <div class="pp-glow"></div>
  <div class="pp-cal"><div class="rings"><i></i><i></i></div><div class="pg p3"><b>TUE</b><span>27</span></div><div class="pg p2"><b>MON</b><span>26</span></div><div class="pg p1"><b>SUN</b><span>25</span></div></div>
  <div class="pp-stack">
    ${range(7).map((i) => `<div class="layer" style="transform:translate(${(7 - i) * 5}px,${(7 - i) * 6}px) rotate(${[2.5, -1.5, 1.8, -2.2, 1, -0.8, 0.4][i]}deg)"></div>`).join('')}
    <div class="top"><div class="hd"><b>SSC CGL · Weekly Mock 12</b><span>Name: Kavita Joshi&nbsp;&nbsp;Roll: CGL-31</span></div><div class="ans">${lines}</div><div class="tot"><span>Total</span><b>?</b></div></div>
  </div>
  <div class="pp-pen">${pen}</div>
  <div class="pp-chai">${chai}${steam('steam')}</div>
  <div class="pp-register"><div class="pgL"><div class="th"><span>Roll</span><em>Marks</em></div>${reg}</div><div class="pgR"><div class="th"><span>Roll</span><em>Marks</em></div>${range(9).map(() => '<div class="rr"><span></span><em></em></div>').join('')}</div></div>
  <div class="pp-board"><div class="list"><i class="pin"></i><h4>RANK LIST · MOCK 12</h4>${rank}</div></div>
  <div class="pp-dim"></div>
  <div class="pp-q">?</div>
  <div class="pp-note"><p>Which questions did my batch get wrong?</p><p class="why">…and why?</p></div>
  <div class="pp-count"><b>0</b><span>48 copies × 20 questions</span></div>
  <div class="pp-laptop"><div class="lid"><div class="scr"><div class="bar"><i></i><i></i><i></i></div><div class="done"><div class="ring"><svg viewBox="0 0 52 52"><path d="M14 27 l8 8 l16 -18"/></svg></div><b>48 submitted</b><span>Checked the moment they pressed Submit</span></div><div class="nums">${nums}</div></div></div><div class="base"></div></div>
  <div class="pp-title"><img src="assets/img/wordmark.png" alt="TestoZa"/><h1>Understanding Results</h1><p><span>Results panel</span><i></i><span>Full report</span><i></i><span>Your Monday routine</span></p></div>`;
}

const ico = {
  book: `<svg viewBox="0 0 120 90"><path d="M8 10 h46 q6 0 6 6 v68 q0 -6 -6 -6 h-46z" fill="#fef3c7" stroke="#b45309" stroke-width="3"/><path d="M112 10 h-46 q-6 0 -6 6 v68 q0 -6 6 -6 h46z" fill="#fffbeb" stroke="#b45309" stroke-width="3"/>${range(5).map((i) => `<path d="M16 ${26 + i * 11} h34 M70 ${26 + i * 11} h34" stroke="#d6a35c" stroke-width="2.5"/>`).join('')}</svg>`,
  sheet: `<svg viewBox="0 0 120 90"><rect x="6" y="6" width="108" height="78" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="3"/><rect x="6" y="6" width="108" height="16" rx="8" fill="#10b981"/>${range(4).map((i) => `<path d="M6 ${36 + i * 12} h108" stroke="#a7f3d0" stroke-width="2"/>`).join('')}<path d="M40 22 v62 M76 22 v62" stroke="#a7f3d0" stroke-width="2"/></svg>`,
  board: `<svg viewBox="0 0 120 90"><rect x="4" y="4" width="112" height="82" rx="6" fill="#d6a46b" stroke="#92623a" stroke-width="4"/><rect x="34" y="14" width="52" height="64" rx="3" fill="#fff"/>${range(5).map((i) => `<path d="M42 ${28 + i * 10} h36" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>`).join('')}<circle cx="60" cy="14" r="5" fill="#ef4444"/></svg>`,
  chat: `<svg viewBox="0 0 120 90"><path d="M14 8 h92 q8 0 8 8 v48 q0 8 -8 8 h-60 l-18 14 v-14 h-14 q-8 0 -8 -8 v-48 q0 -8 8 -8z" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>${range(4).map((i) => `<path d="M24 ${22 + i * 11} h${[64, 52, 58, 40][i]}" stroke="#22c55e" stroke-width="4" stroke-linecap="round"/>`).join('')}</svg>`,
  copy: `<svg viewBox="0 0 120 90"><rect x="22" y="4" width="76" height="82" rx="5" fill="#fff" stroke="#94a3b8" stroke-width="3"/>${range(5).map((i) => `<path d="M32 ${20 + i * 13} h40" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/><path d="${i % 3 === 1 ? `M78 ${15 + i * 13} l8 8 M86 ${15 + i * 13} l-8 8` : `M77 ${20 + i * 13} l4 4 l7 -9`}" stroke="#e11d48" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}</svg>`,
  report: `<svg viewBox="0 0 120 90"><rect x="8" y="4" width="104" height="82" rx="10" fill="#eef2ff" stroke="#6366f1" stroke-width="3"/>${range(5).map((i) => `<rect x="${22 + i * 17}" y="${[58, 50, 30, 26, 46][i]}" width="12" height="${[18, 26, 46, 50, 30][i]}" rx="3" fill="${['#fb7185', '#fb7185', '#fbbf24', '#10b981', '#10b981'][i]}"/>`).join('')}</svg>`,
  chalk: `<svg viewBox="0 0 120 90"><rect x="4" y="4" width="112" height="76" rx="6" fill="#1f3b2d" stroke="#8b5e34" stroke-width="5"/>${range(6).map((i) => `<path d="M16 ${18 + i * 10} h${[80, 70, 86, 60, 76, 66][i]}" stroke="#d1fae5" stroke-width="2.5" opacity=".75" stroke-linecap="round"/>`).join('')}</svg>`,
  chalk5: `<svg viewBox="0 0 120 90"><rect x="4" y="4" width="112" height="76" rx="6" fill="#1f3b2d" stroke="#8b5e34" stroke-width="5"/>${range(3).map((i) => `<rect x="14" y="${16 + i * 19}" width="22" height="13" rx="3" fill="#fb7185"/><path d="M44 ${23 + i * 19} h${[54, 44, 50][i]}" stroke="#d1fae5" stroke-width="3" stroke-linecap="round"/>`).join('')}</svg>`,
};

function promise() {
  const cards = [
    ['Marks register', ico.book, 'Excel download', ico.sheet],
    ['Notice-board rank list', ico.board, 'Rank list on WhatsApp', ico.chat],
    ['Opening one student’s copy', ico.copy, 'Every answer sheet', ico.report],
    ['Discussion class: all 20', ico.chalk, 'Only what they got wrong', ico.chalk5],
  ];
  return `<div class="soft"></div>
  <div class="pm-head"><span>On paper</span><i></i><span class="on">On TestoZa</span></div>
  <div class="pm-row">${cards.map(([a, ia, b, ib], i) => `<div class="pm-card c${i}"><div class="inner"><div class="face front"><div class="ic">${ia}</div><p>${a}</p></div><div class="face back"><div class="ic">${ib}</div><p>${b}</p><s>✓</s></div></div></div>`).join('')}</div>
  <div class="pm-plus"><div class="lens"><svg viewBox="0 0 120 120"><circle cx="50" cy="50" r="34" fill="#e0f2fe" stroke="#0284c7" stroke-width="9"/><path d="M76 76 L106 106" stroke="#0284c7" stroke-width="13" stroke-linecap="round"/><path d="M34 52 l10 10 l20 -22" stroke="#10b981" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>…and what paper could never show you</p></div>`;
}

const BINS = ['0–19%', '20–39%', '40–59%', '60–79%', '80–100%'];
function shapes() {
  return `<div class="soft"></div>
  <div class="sh-card"><div class="sh-top"><span class="sh-eyebrow">How the marks spread</span><div class="chips"><b class="chip easy">Too easy</b><b class="chip hard">Too hard</b><b class="chip split">Batch split in two</b><b class="chip ours">Your batch · Mock 12</b></div></div>
    <div class="sh-plot">${BINS.map((b, i) => `<div class="col"><em>0</em><i class="bar b${i}"></i><span>${b}</span></div>`).join('')}<div class="doubt"><div class="brace"></div><b>Separate doubt class</b></div></div></div>`;
}

const optBars = (rows) => rows.map(([k, v, tone]) => `<div class="ob"><b class="${tone}">${k}</b><div class="tr"><i class="${tone}" style="width:${v}%"></i></div><em>${v}%</em></div>`).join('');
function patterns() {
  const cards = [
    ['Trap', 'One wrong option stands tall', [['A ✓', 23, 'ok'], ['B', 54, 'hot'], ['C', 8, ''], ['D', 6, ''], ['Blank', 8, 'gray']], 'Reteach the concept'],
    ['Left blank', 'A lot of grey', [['A', 10, ''], ['B', 15, ''], ['C ✓', 21, 'ok'], ['D', 8, ''], ['Blank', 46, 'grayhot']], 'Time ran out, or the chapter isn’t done'],
    ['Guessing', 'Everything flat', [['A ✓', 29, 'ok'], ['B', 23, ''], ['C', 21, ''], ['D', 17, ''], ['Blank', 10, 'gray']], 'Put it on the revision list'],
  ];
  return `<div class="soft"></div><div class="pt-row">${cards.map(([h, s, rows, f], i) => `<div class="pt-card p${i}"><h3>${h}</h3><p class="sub">${s}</p><div class="bars">${optBars(rows)}</div><p class="fix"><i>→</i>${f}</p></div>`).join('')}</div>`;
}

function routine() {
  const steps = ['Look at the average and the spread', 'Send the rank list', 'Open Teach these again', 'Call the students below 40%', 'Download the Excel for your register'];
  return `<div class="soft"></div>
  <div class="rt-card"><h3>Your Monday routine</h3>${steps.map((s, i) => `<div class="st s${i}"><i class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5 l4.5 4.5 L19 7.5"/></svg></i><b>${i + 1}</b><span>${s}</span></div>`).join('')}</div>
  <div class="rt-side"><div class="clock"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="#fff" stroke="#e2e8f0" stroke-width="8"/><path class="arc" d="M100 12 A88 88 0 0 1 176.2 56" fill="none" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>${range(12).map((i) => `<rect x="98" y="20" width="4" height="${i % 3 ? 8 : 14}" rx="2" fill="#94a3b8" transform="rotate(${i * 30} 100 100)"/>`).join('')}<rect class="mh" x="96.5" y="34" width="7" height="70" rx="3.5" fill="#0f172a"/><rect x="96" y="58" width="8" height="46" rx="4" fill="#334155" transform="rotate(300 100 100)"/><circle cx="100" cy="100" r="8" fill="#0f172a"/></svg></div>
    <div class="five"><b>5</b><span>minutes</span></div>
    <div class="rt-chai">${chai}${steam('steam hot')}</div></div>`;
}

function end() {
  return `<div class="soft"></div>
  <div class="en-flip"><div class="inner"><div class="face front"><div class="hd"><b>Weekly Mock 12</b><span>Roll: CGL-30</span></div>${range(6).map(() => '<div class="ln"></div>').join('')}<div class="big">33<span>/40</span></div></div>
    <div class="face back"><div class="hd"><b>The reasons behind it</b></div><div class="mini">${[18, 30, 64, 70, 26].map((h, i) => `<i style="height:${h}%;background:${['#fb7185', '#fb7185', '#fbbf24', '#10b981', '#10b981'][i]}"></i>`).join('')}</div>${[['Q13', 'Most picked B'], ['Q15', '22 left blank'], ['Quant', '44%']].map(([a, b]) => `<div class="why"><b>${a}</b><span>${b}</span></div>`).join('')}</div></div></div>
  <div class="en-brand"><img src="assets/img/wordmark.png" alt="TestoZa"/><div class="pills"><div class="pill url">testoza.com</div><div class="pill subs"><s></s>Subscribe</div></div></div>`;
}

export const ANIM = { paper, promise, shapes, patterns, routine, end };
export const animHTML = (name, attrs) => `<div class="clip card anim an-${name}" id="an-${name}" ${attrs}>${ANIM[name]()}</div>`;
