// Builds the one paused timeline from PLAN (written by build.mjs). Every tween is fromTo with
// immediateRender off, so seeking to any time gives the same frame.
const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];
const centred = (s) => ({ scale: s, x: (1920 - 1536 * s) / 2, y: (1080 - 864 * s) / 2 });

document.fonts.ready.then(() => {
  const tl = gsap.timeline({ paused: true });
  const pop = (el, at, from = { y: 24, opacity: 0 }) => el && tl.fromTo(el, from, { y: 0, x: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out', immediateRender: false }, at);
  const fade = (el, at, a, b, d = 0.2) => el && tl.fromTo(el, { opacity: a }, { opacity: b, duration: d, ease: 'power1.out', immediateRender: false }, at);

  for (const p of PLAN) {
    if (p.type === 'cam') {
      const el = q(p.sel);
      tl.set(el, { transformOrigin: '0 0', ...p.keys[0] }, 0);
      p.keys.slice(1).forEach((k, i) => {
        const a = p.keys[i];
        tl.fromTo(el, { scale: a.scale, x: a.x, y: a.y }, { scale: k.scale, x: k.x, y: k.y, duration: k.dur ?? 0.9, ease: 'power2.inOut', immediateRender: false }, k.at);
      });
    }
    if (p.type === 'montage') {
      const el = q(p.sel);
      tl.set(el, { transformOrigin: '0 0', ...p.cuts[0].from }, 0);
      p.cuts.forEach((c) => tl.fromTo(el, c.from, { ...c.to, duration: c.dur, ease: 'sine.inOut', immediateRender: false }, c.at));
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
    if (p.type === 'ring') {
      const ring = q(p.ring), tip = q(p.tip);
      tl.set([ring, tip].filter(Boolean), { opacity: 0 }, 0);
      tl.fromTo(ring, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)', immediateRender: false }, p.at - 0.1);
      tl.fromTo(ring, { opacity: 1 }, { opacity: 0, duration: 0.35, immediateRender: false }, p.at + p.dur);
      if (tip) {
        tl.fromTo(tip, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', immediateRender: false }, p.at - 0.05);
        tl.fromTo(tip, { opacity: 1 }, { opacity: 0, duration: 0.3, immediateRender: false }, p.at + p.dur);
      }
    }
    if (p.type === 'fdlg') {
      // Open box: in, cursor to the file, select, cursor to Open, click, out.
      const el = q(p.sel), cur = q('.fcur', el), tile = q('.tile.pick', el), win = q('.win', el);
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
    if (p.type === 'qsrc') pop(q(p.sel), p.at, { y: 20, opacity: 0 });
    if (p.type === 'end') {
      const sc = q('#end');
      tl.fromTo(q('.wm', sc), { y: 50, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', immediateRender: false }, p.start + 0.2);
      pop(q('.tag', sc), p.start + 0.7);
      pop(q('.pills', sc), p.endurl - 0.1, { y: 30, opacity: 0 });
      tl.fromTo('#subpill', { scale: 1 }, { scale: 1.08, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, p.thanks + 0.6);
    }
  }
  const tc = q('#title');
  if (tc) {
    const s = +tc.dataset.start;
    tl.fromTo(q('.wm', tc), { y: 40, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', immediateRender: false }, s + 0.05);
    tl.fromTo(q('.ttl', tc), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, s + 0.35);
    tl.fromTo(q('.sub', tc), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', immediateRender: false }, s + 0.7);
    tl.fromTo(q('.src', tc), { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false }, s + 1.0);
  }
  qa('.chip').forEach((el) => tl.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out', immediateRender: false }, +el.dataset.start));
  qa('.cap span').forEach((el) => tl.fromTo(el, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out', immediateRender: false }, +el.parentElement.dataset.start));
  window.__timelines['main'] = tl;
});
