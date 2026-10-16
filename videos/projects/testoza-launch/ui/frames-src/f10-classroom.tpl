<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f10-bg { position: absolute; inset: 0; background: #0b1220; }
  #f10-cam { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; }
  #f10-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: block; }
  #f10-vig { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(2, 6, 23, 0.75) 100%); pointer-events: none; }
  #f10-note {
    position: absolute; z-index: 40; left: 50%; top: 110px; width: 560px; margin-left: -280px; z-index: 20;
    display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px;
    border-radius: 26px; background: rgba(245, 245, 247, 0.92);
    box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.4);
    font-family: 'Mukta', sans-serif; color: #0b0f17;
  }
  #f10-note .ic { width: 44px; height: 44px; border-radius: 11px; background: #25d366; display: flex; align-items: center; justify-content: center; flex: none; }
  #f10-note .top { display: flex; justify-content: space-between; font-size: 15px; color: #6b7280; font-weight: 500; }
  #f10-note b { display: block; font-size: 19px; font-weight: 700; margin-top: 2px; }
  #f10-note p { margin: 2px 0 0; font-size: 18px; line-height: 1.3; color: #1f2937; }
  #f10-tag {
    position: absolute; left: 0; top: 0; padding: 6px 14px; border-radius: 999px;
    background: rgba(15, 23, 42, 0.85); color: #e0f2fe; font: 600 18px/1 'Mukta', sans-serif;
    box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.5);
    opacity: 0; visibility: hidden;
  }
</style>
<div id="root" data-composition-id="f10-classroom" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div id="f10-bg" class="clip" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f10-cam">
      <svg id="f10-svg" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="f10-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16223a" /><stop offset="1" stop-color="#1c2a45" /></linearGradient>
          <linearGradient id="f10-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141c2e" /><stop offset="1" stop-color="#0c1322" /></linearGradient>
          <linearGradient id="f10-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a" /><stop offset="0.65" stop-color="#7c3aed" /><stop offset="1" stop-color="#f59e0b" /></linearGradient>
          <radialGradient id="f10-halo"><stop offset="0" stop-color="#7dd3fc" stop-opacity="0.9" /><stop offset="1" stop-color="#7dd3fc" stop-opacity="0" /></radialGradient>
          <linearGradient id="f10-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24" stop-opacity="0.16" /><stop offset="1" stop-color="#fbbf24" stop-opacity="0" /></linearGradient>
        </defs>
        <rect x="0" y="0" width="1920" height="620" fill="url(#f10-wall)" />
        <rect x="0" y="600" width="1920" height="480" fill="url(#f10-floor)" />
        <rect x="0" y="596" width="1920" height="8" fill="#0d1526" />
        <!-- window at dusk -->
        <rect x="96" y="150" width="330" height="390" rx="6" fill="url(#f10-sky)" opacity="0.85" />
        <path d="M261 150 V540 M96 345 H426" stroke="#3b2a1a" stroke-width="10" />
        <rect x="96" y="150" width="330" height="390" rx="6" fill="none" stroke="#3b2a1a" stroke-width="14" />
        <polygon points="426,170 900,600 640,600 426,540" fill="url(#f10-beam)" />
        <!-- board -->
        <rect x="590" y="160" width="740" height="290" rx="10" fill="#183a2d" stroke="#5b3d22" stroke-width="16" />
        <text x="960" y="262" text-anchor="middle" font-family="Outfit" font-weight="600" font-size="52" fill="#e5efe9" fill-opacity="0.82">Physics Mock Test</text>
        <text x="960" y="315" text-anchor="middle" font-family="Mukta" font-weight="500" font-size="30" fill="#e5efe9" fill-opacity="0.6">Today · 10:00 AM · 60 min</text>
        <text x="660" y="420" font-family="Mukta" font-weight="500" font-size="26" fill="#e5efe9" fill-opacity="0.38">F = ma</text>
        <path d="M1150 425 Q1210 350 1270 425" stroke="#e5efe9" stroke-opacity="0.32" stroke-width="3" fill="none" />
        <text x="1135" y="378" font-family="Mukta" font-weight="500" font-size="22" fill="#e5efe9" fill-opacity="0.32">v² = u² + 2as</text>
        <rect x="690" y="450" width="540" height="10" rx="3" fill="#4a3220" />
        <!-- clock -->
        <circle cx="1560" cy="240" r="46" fill="#e2e8f0" fill-opacity="0.9" stroke="#334155" stroke-width="6" />
        <path d="M1560 240 V208 M1560 240 L1582 252" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <g id="f10-people" />
      </svg>
      <div id="f10-tag">Rohan</div>
    </div>
    <div id="f10-vig"></div>
    <div id="f10-t" class="tz-super">Every student. <em>Any phone.</em></div>
    <div id="f10-note">
      <div class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" /></svg></div>
      <div style="flex:1;min-width:0">
        <div class="top"><span>WHATSAPP · JEE 2026 BATCH A</span><span>now</span></div>
        <b>Prof. Rajesh Kumar</b>
        <p>📝 JEE Main 2026 · Physics Mock Test 01 — Open this link to start: testoza.com/test/jee-phy-mock-7k2q</p>
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f10-classroom';
  /*@helpers*/
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };
  const people = q('#f10-people');
  const SKIN = ['#8d5524', '#c68642', '#a0663f', '#e0ac69', '#7a4a2a', '#b67a4b'];
  const HAIR = ['#0b0b0f', '#1c1410', '#2b1d14', '#0f0c0a'];
  // [x, y (desk top), scale, skin, hair, style] back row → front row
  const ROWS = [
    [[570, 610, 0.58], [830, 610, 0.58], [1090, 610, 0.58], [1350, 610, 0.58]],
    [[420, 750, 0.78], [760, 750, 0.78], [1160, 750, 0.78], [1500, 750, 0.78]],
    [[250, 948, 1.0], [630, 948, 1.0], [1290, 948, 1.0], [1670, 948, 1.0]],
  ];
  const STYLE = ['short', 'long', 'short', 'bun', 'long', 'short', 'short', 'long', 'bun', 'short', 'short', 'long'];
  const phones = [], screens = [], halos = [], faces = [], dots = [];
  let n = 0, rohan = null;
  ROWS.forEach((row) => row.forEach(([x, y, s]) => {
    const i = n++;
    const g = mk('g', { transform: `translate(${x} ${y}) scale(${s})` }, people);
    const skin = SKIN[i % SKIN.length], hair = HAIR[i % HAIR.length], st = STYLE[i];
    mk('rect', { x: -78, y: -170, width: 156, height: 150, rx: 18, fill: '#22314d' }, g);            // chair back
    if (st === 'long') mk('rect', { x: -46, y: -196, width: 92, height: 120, rx: 40, fill: hair }, g); // hair behind
    mk('rect', { x: -64, y: -120, width: 128, height: 140, rx: 48, fill: i % 3 === 1 ? '#cbd5e1' : '#bfdbfe' }, g); // shirt
    mk('rect', { x: -13, y: -136, width: 26, height: 22, rx: 6, fill: skin }, g);
    const face = mk('circle', { cx: 0, cy: -172, r: 40, fill: skin }, g);
    mk('circle', { cx: -13, cy: -170, r: 4.2, fill: '#141414' }, g);
    mk('circle', { cx: 13, cy: -170, r: 4.2, fill: '#141414' }, g);
    mk('path', { d: 'M-9 -152 Q0 -146 9 -152', stroke: '#3b1f12', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g);
    faces.push(mk('ellipse', { cx: 0, cy: -150, rx: 34, ry: 22, fill: 'url(#f10-halo)', opacity: 0 }, g));
    if (st === 'bun') mk('circle', { cx: 0, cy: -222, r: 18, fill: hair }, g);
    mk('path', { d: st === 'short' ? 'M-41 -176 C-42 -222 42 -222 41 -176 C30 -196 -30 -196 -41 -176 Z' : 'M-43 -170 C-46 -226 46 -226 43 -170 C32 -200 -32 -200 -43 -170 Z', fill: hair }, g);
    mk('rect', { x: -60, y: -40, width: 120, height: 26, rx: 13, fill: '#93c5fd' }, g);               // forearms
    const halo = mk('circle', { cx: 0, cy: -40, r: 70, fill: 'url(#f10-halo)', opacity: 0 }, g);
    mk('rect', { x: -15, y: -64, width: 30, height: 50, rx: 6, fill: '#05070c' }, g);                  // phone
    const scr = mk('rect', { x: -12, y: -61, width: 24, height: 44, rx: 3.5, fill: '#111827' }, g);
    mk('rect', { x: -116, y: -16, width: 232, height: 20, rx: 5, fill: '#6b4a2b' }, g);               // desk top
    mk('rect', { x: -106, y: 4, width: 212, height: 96, rx: 4, fill: '#3f2b1a' }, g);                 // desk front
    const dot = mk('g', { transform: 'translate(22 -82)', opacity: 0 }, g);
    mk('circle', { cx: 0, cy: 0, r: 13, fill: '#25d366' }, dot);
    mk('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-family': 'Outfit', 'font-weight': 800, 'font-size': 15, fill: '#fff' }, dot).textContent = '1';
    phones.push(g); screens.push(scr); halos.push(halo); dots.push(dot);
    if (x === 1290 && y === 948) rohan = { x, y: y - 40, i };
  }));

  // camera: settle, then dolly in to Rohan's phone
  const camEl = q('#f10-cam');
  const to = (s, p, T) => ({ scale: s, x: T.x - s * p.x, y: T.y - s * p.y });
  tl.fromTo(camEl, to(1.08, { x: 960, y: 560 }, { x: 960, y: 560 }), Object.assign(to(1.0, { x: 960, y: 560 }, { x: 960, y: 560 }), { duration: 1.6, ease: 'power2.out' }), 0);
  superIn(0.3, q('#f10-t'));

  // the link lands on every phone, back row first
  const order = phones.map((_, i) => i);
  order.forEach((i, k) => {
    const t = 1.0 + k * 0.085;
    tl.to(screens[i], { fill: '#7dd3fc', duration: 0.2, ease: 'power1.out' }, t);
    tl.fromTo(halos[i], { opacity: 0 }, { opacity: 0.85, duration: 0.35, ease: 'power2.out' }, t);
    tl.fromTo(faces[i], { opacity: 0 }, { opacity: 0.3, duration: 0.5, ease: 'power2.out' }, t + 0.05);
    tl.fromTo(dots[i], { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '50% 50%' }, t + 0.1);
  });

  const R0 = rohan || { x: 1290, y: 908 };
  tl.fromTo('#f10-tag', { autoAlpha: 0, x: R0.x - 42, y: R0.y - 200 }, { autoAlpha: 1, y: R0.y - 222, duration: 0.4, ease: 'power3.out' }, 2.4);
  tl.to(camEl, Object.assign(to(2.3, { x: R0.x, y: R0.y - 90 }, { x: 960, y: 470 }), { duration: 2.3, ease: 'power3.inOut' }), 2.3);
  tl.to('#f10-t', { autoAlpha: 0, duration: 0.3 }, 2.3);
  tl.fromTo('#f10-note', { opacity: 0, y: -60, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)' }, 3.6);
  tl.to('#f10-note', { scale: 1.04, duration: 1.2, ease: 'sine.out' }, 4.15);
  window.__timelines[ID] = tl;
</script>
</template>
