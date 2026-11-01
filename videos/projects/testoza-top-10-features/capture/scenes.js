// Builds the one paused timeline from PLAN (written by build.mjs). Every tween is fromTo with
// immediateRender off (or a set), so seeking to any time gives the same frame.
const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];

document.fonts.ready.then(() => {
  const tl = gsap.timeline({ paused: true });
  const pop = (el, at, from = { y: 24, opacity: 0 }) => el && tl.fromTo(el, from, { y: 0, x: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out', immediateRender: false }, at);
  const fade = (el, at, a, b, d = 0.2) => el && tl.fromTo(el, { opacity: a }, { opacity: b, duration: d, ease: 'power1.out', immediateRender: false }, at);
  // Footage wrappers are shown only inside their own window. (Two sets at time 0 collide — the
  // hide wins — so one that opens at 0 is simply never hidden first.)
  qa('[data-on]').forEach((el) => {
    const on = +el.dataset.on;
    if (on > 0) { tl.set(el, { autoAlpha: 0 }, 0); tl.set(el, { autoAlpha: 1 }, on); }
    tl.set(el, { autoAlpha: 0 }, +el.dataset.off);
  });

  for (const p of PLAN) {
    if (p.type === 'cam') {
      const el = q(p.sel);
      tl.set(el, { transformOrigin: '0 0', ...p.keys[0] }, 0);
      p.keys.slice(1).forEach((k, i) => {
        const a = p.keys[i];
        tl.fromTo(el, { scale: a.scale, x: a.x, y: a.y }, { scale: k.scale, x: k.x, y: k.y, duration: 0.9, ease: 'power2.inOut', immediateRender: false }, k.at);
      });
    }
    if (p.type === 'reveal') {
      // The section's window opens into the frame.
      const el = q(p.sel);
      tl.fromTo(el, { scale: 0.9, opacity: 0, borderRadius: 34 }, { scale: 1, opacity: 1, borderRadius: 0, duration: 0.55, ease: 'power3.out', immediateRender: false }, p.at);
    }
    if (p.type === 'shot') {
      const el = q(p.sel);
      tl.set(el, { transformOrigin: p.from.x === 0 && p.from.y !== undefined && p.sel.startsWith('#mt') && q(p.sel).classList.contains('pcam') ? '50% 50%' : '0 0' }, 0);
      tl.fromTo(el, p.from, { ...p.to, duration: p.dur, ease: 'sine.inOut', immediateRender: false }, p.at);
    }
    if (p.type === 'cursor') {
      // Glides between recorded points; a ripple on every click.
      const cur = q(p.cur), rip = q(p.rip);
      tl.set(cur, { x: p.moves[0].x, y: p.moves[0].y, opacity: 1 }, 0);
      tl.set(rip, { opacity: 0 }, 0);
      let prev = p.moves[0];
      for (const m of p.moves.slice(1)) {
        if (m.x !== prev.x || m.y !== prev.y) tl.fromTo(cur, { x: prev.x, y: prev.y }, { x: m.x, y: m.y, duration: m.d, ease: 'power2.inOut', immediateRender: false }, m.at - m.d);
        if (m.click) tl.fromTo(rip, { x: m.x, y: m.y, scale: 0.5, opacity: 0.95 }, { x: m.x, y: m.y, scale: 1.9, opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, m.at);
        prev = m;
      }
      for (const [a, b] of p.hides) { fade(cur, a, 1, 0, 0.15); fade(cur, b, 0, 1, 0.15); }
    }
    if (p.type === 'phone') {
      const scene = q(p.sel), cam = q(p.sel + '-cam'), pv = q(p.sel + '-pv'), chrome = q(p.sel + '-chrome'), tbar = q(p.sel + '-tbar');
      // Browser bars while the page is not full screen; the page lifts above the bottom toolbar.
      tl.set([chrome, tbar], { opacity: 0 }, 0);
      tl.set(pv, { y: 0 }, 0);
      for (const [a, b] of p.wins) {
        tl.set([chrome, tbar], { opacity: 1 }, a);
        tl.set(pv, { y: -62 }, a);
        if (b < p.end - 0.01) { tl.set([chrome, tbar], { opacity: 0 }, b); tl.set(pv, { y: 0 }, b); }
      }
      tl.set(q('.u1', scene), { display: 'inline' }, 0);
      tl.set(q('.u2', scene), { display: 'none' }, 0);
      tl.set(q('.u1', scene), { display: 'none' }, p.urlAt);
      tl.set(q('.u2', scene), { display: 'inline' }, p.urlAt);
      // Punch-ins on the moments that matter, then back out.
      tl.set(cam, { transformOrigin: '0 0', scale: 1, x: 0, y: 0 }, 0);
      for (const z of p.zooms) {
        const x = Math.max(1920 * (1 - z.z), Math.min(0, z.cx * (1 - z.z) + (960 - z.cx) * 0.55));
        const y = Math.max(1080 * (1 - z.z), Math.min(0, z.cy * (1 - z.z) + (540 - z.cy) * 0.55));
        tl.fromTo(cam, { scale: 1, x: 0, y: 0 }, { scale: z.z, x, y, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, z.at);
        tl.fromTo(cam, { scale: z.z, x, y }, { scale: 1, x: 0, y: 0, duration: 0.6, ease: 'power2.inOut', immediateRender: false }, z.at + 0.6 + z.hold);
      }
    }
    if (p.type === 'fdlg') {
      // Open box: in, cursor to the file, select, cursor to Open, click, out.
      const el = q(p.sel), cur = q('.fcur', el), tile = q('.tile.pick', el), win = q('.fwin', el);
      tl.set(el, { opacity: 0 }, 0);
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.18, immediateRender: false }, p.start);
      tl.fromTo(win, { scale: 0.96, y: 18 }, { scale: 1, y: 0, duration: 0.3, ease: 'power3.out', immediateRender: false }, p.start);
      tl.set(tile, { className: 'tile pick' }, 0);
      tl.fromTo(cur, { x: p.c0.x, y: p.c0.y }, { x: p.c1.x, y: p.c1.y, duration: p.g1, ease: 'power2.inOut', immediateRender: false }, p.start + 0.15);
      tl.set(tile, { className: 'tile pick sel' }, p.pickAt);
      tl.set(q('.fname em', el), { opacity: 0 }, 0);
      tl.set(q('.fname em', el), { opacity: 1 }, p.pickAt);
      tl.fromTo(cur, { x: p.c1.x, y: p.c1.y }, { x: p.c2.x, y: p.c2.y, duration: p.g2, ease: 'power2.inOut', immediateRender: false }, p.pickAt + 0.12);
      tl.fromTo(q('.btn.open', el), { scale: 1 }, { scale: 0.94, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, p.openAt);
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.18, immediateRender: false }, p.end - 0.18);
    }
    if (p.type === 'speed') pop(q(p.sel), p.at, { x: 30, opacity: 0 });
    if (p.type === 'title') {
      const el = q(p.sel);
      tl.fromTo(q('.wm', el), { y: 40, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', immediateRender: false }, p.at + 0.05);
      tl.fromTo(q('.ten span', el), { scale: 0.55, opacity: 0, filter: 'blur(24px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', immediateRender: false }, p.at + 0.25);
      qa('.dots i', el).forEach((d, i) => tl.fromTo(d, { scale: 0.3, opacity: 0, backgroundColor: 'rgba(148,163,184,.25)' }, { scale: 1, opacity: 1, backgroundColor: '#38bdf8', duration: 0.3, ease: 'back.out(2)', immediateRender: false }, p.at + 0.8 + i * 0.09));
    }
    if (p.type === 'sting') {
      const el = q(p.sel), num = q('.num span', el), on = q('.dots i.on', el);
      tl.fromTo(num, { y: 140, scale: 0.7, opacity: 0, filter: 'blur(22px)' }, { y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out', immediateRender: false }, p.at + 0.02);
      tl.fromTo(q('.dots', el), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', immediateRender: false }, p.at + 0.15);
      tl.fromTo(on, { scale: 0.4 }, { scale: 1.25, duration: 0.35, ease: 'back.out(3)', immediateRender: false }, p.at + 0.4);
      tl.fromTo(num, { scale: 1 }, { scale: 1.04, duration: p.end - p.at - 0.9, ease: 'sine.inOut', immediateRender: false }, p.at + 0.62);
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.28, ease: 'power1.in', immediateRender: false }, p.end - 0.28);
    }
    if (p.type === 'end') {
      const sc = q('#end');
      tl.fromTo(q('.wm', sc), { y: 50, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', immediateRender: false }, p.at + 0.2);
      pop(q('.pills', sc), p.endurl - 0.1, { y: 30, opacity: 0 });
      tl.fromTo('#subpill', { scale: 1 }, { scale: 1.12, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, p.thanks + 0.3);
    }
  }
  window.__timelines = window.__timelines || {};
  window.__timelines['main'] = tl;
});
