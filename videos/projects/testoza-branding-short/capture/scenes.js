// Builds the one paused timeline from PLAN (written by build.mjs). Every tween is fromTo with
// immediateRender off (or a set), so seeking to any time gives the same frame.
const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];

document.fonts.ready.then(() => {
  const tl = gsap.timeline({ paused: true });
  const fade = (el, at, a, b, d = 0.2) => el && tl.fromTo(el, { opacity: a }, { opacity: b, duration: d, ease: 'power1.out', immediateRender: false }, at);
  // Footage wrappers are shown only inside their own window.
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
        tl.fromTo(el, { scale: a.scale, x: a.x, y: a.y }, { scale: k.scale, x: k.x, y: k.y, duration: 0.75, ease: 'power2.inOut', immediateRender: false }, k.at);
      });
    }
    if (p.type === 'reveal') {
      // The section's card / laptop / phone rises into place.
      const el = q(p.sel);
      tl.set(el, { scale: p.pk }, 0);
      tl.fromTo(el, { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', immediateRender: false }, p.at);
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
      for (const [a, b] of p.hides) { fade(cur, a, 1, 0, 0.12); fade(cur, b, 0, 1, 0.12); }
    }
    if (p.type === 'fly') {
      // The logo file is carried in from outside the frame and dropped on the upload box.
      const el = q(p.sel);
      tl.set(el, { width: p.size, height: p.size, xPercent: -50, yPercent: -50, x: p.x + 560, y: p.y + 420, rotation: -14, scale: 1.4, opacity: 0 }, 0);
      tl.fromTo(el, { x: p.x + 560, y: p.y + 420, rotation: -14, scale: 1.4, opacity: 0 }, { x: p.x, y: p.y, rotation: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out', immediateRender: false }, p.at - 0.72);
      tl.fromTo(el, { scale: 1 }, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1, immediateRender: false }, p.at - 0.02);
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.22, immediateRender: false }, p.at + 0.2);
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
        const x = Math.max(p.W * (1 - z.z), Math.min(0, z.cx * (1 - z.z) + (p.W / 2 - z.cx) * 0.55));
        const y = Math.max(p.H * (1 - z.z), Math.min(0, z.cy * (1 - z.z) + (p.H / 2 - z.cy) * 0.55));
        tl.fromTo(cam, { scale: 1, x: 0, y: 0 }, { scale: z.z, x, y, duration: 0.55, ease: 'power2.inOut', immediateRender: false }, z.at);
        tl.fromTo(cam, { scale: z.z, x, y }, { scale: 1, x: 0, y: 0, duration: 0.55, ease: 'power2.inOut', immediateRender: false }, z.at + 0.55 + z.hold);
      }
    }
    if (p.type === 'hook') {
      // Laptop drops in, the phone slides up in front of it; a slow push-in on the brand bar.
      const lap = q('#hk-lap'), ph = q('#hk-ph'), cam = q('#hk-cam');
      tl.set(cam, { transformOrigin: '0 0', ...p.cam0 }, 0);
      tl.fromTo(cam, p.cam0, { ...p.cam1, duration: p.end, ease: 'sine.inOut', immediateRender: false }, 0);
      tl.fromTo(lap, { y: -60, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, 0);
      tl.set(ph, { transformOrigin: '0 0', scale: 0.98 }, 0);
      tl.fromTo(ph, { y: 260, opacity: 0, rotation: 6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.4)', immediateRender: false }, 0.22);
      tl.fromTo(ph, { y: 0 }, { y: -40, duration: p.end - 0.9, ease: 'sine.inOut', immediateRender: false }, 0.92);
    }
    if (p.type === 'end') {
      const sc = q('#end');
      tl.fromTo(q('.wm', sc), { y: 50, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', immediateRender: false }, p.at + 0.1);
      tl.fromTo(q('.pill', sc), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', immediateRender: false }, p.endurl - 0.1);
      tl.fromTo(q('.pill', sc), { scale: 1 }, { scale: 1.06, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, p.endurl + 0.6);
    }
  }
  window.__timelines = window.__timelines || {};
  window.__timelines['main'] = tl;
});
