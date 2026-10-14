/* ── shared film helpers (inlined by tools/build-frames.mjs; needs const ID) ── */
const R = document.querySelector('[data-composition-id="' + ID + '"]');
const q = (s) => R.querySelector(s);
const qa = (s) => Array.from(R.querySelectorAll(s));
const tl = gsap.timeline({ paused: true });

/* Camera. The window sits at (240,126) in rig space; the rig scales about (960,548). */
const REST = { scale: 0.82, x: 0, y: 0 };
const O = { x: 960, y: 548 };
/** Rig transform that puts window point p at screen point T with zoom s. */
function focus(p, s, T) {
  T = T || { x: 960, y: 560 };
  const px = 240 + p.x, py = 126 + p.y;
  return { scale: s, x: T.x - O.x - s * (px - O.x), y: T.y - O.y - s * (py - O.y) };
}
function cam(t, to, d, ease) {
  tl.to(q('.tz-rig'), Object.assign({ duration: d || 1.2, ease: ease || 'power3.inOut' }, to), t);
}

/* Cursor: points are window coordinates (chrome included), as measured. */
const CUR = q('.tz-cursor');
const LAYER = q('.tz-curlayer');
function cursorAt(t, p) { tl.set(CUR, { x: p.x - 4, y: p.y - 3, autoAlpha: 1 }, t); }
function move(t, p, d, ease) {
  tl.to(CUR, { x: p.x - 4, y: p.y - 3, duration: d || 0.75, ease: ease || 'power2.inOut' }, t);
}
function press(t, el, k) {
  if (!el) return;
  tl.to(el, { scale: k || 0.95, duration: 0.09, ease: 'power2.out' }, t);
  tl.to(el, { scale: 1, duration: 0.32, ease: 'back.out(3)' }, t + 0.09);
}
function click(t, p, el) {
  tl.to(CUR, { scale: 0.84, duration: 0.08, ease: 'power2.out', transformOrigin: '4px 3px' }, t);
  tl.to(CUR, { scale: 1, duration: 0.25, ease: 'back.out(3)' }, t + 0.08);
  const r = document.createElement('div');
  r.className = 'tz-ripple';
  (LAYER || R).appendChild(r);
  tl.fromTo(r, { x: p.x, y: p.y, scale: 0.25, opacity: 0.95 }, { scale: 1.6, opacity: 0, duration: 0.6, ease: 'power2.out' }, t);
  press(t, el);
}

/* States stacked in one place; swap is a hard cut, like a page update. */
function only(t, show, all) {
  all.forEach((el) => tl.set(el, { autoAlpha: el === show ? 1 : 0 }, t));
}

/* Keynote supers: words rise out of a blur, one after another. */
function split(el) {
  if (el.dataset.split) return Array.from(el.querySelectorAll('.tz-word'));
  const out = [];
  Array.from(el.childNodes).forEach((n) => {
    if (n.nodeType === 3) {
      n.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) { el.insertBefore(document.createTextNode(w), n); return; }
        const s = document.createElement('span');
        s.className = 'tz-word';
        s.textContent = w;
        el.insertBefore(s, n);
        out.push(s);
      });
      el.removeChild(n);
    } else {
      n.classList.add('tz-word');
      out.push(n);
    }
  });
  el.dataset.split = '1';
  return out;
}
function superIn(t, el, stagger) {
  const w = split(el);
  tl.set(el, { autoAlpha: 1 }, t);
  tl.fromTo(w, { y: 44, opacity: 0, filter: 'blur(14px)' },
    { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.75, ease: 'expo.out', stagger: stagger || 0.075 }, t);
}
function superOut(t, el) { tl.set(el, { autoAlpha: 0 }, t); }

/* Typing: characters appear one by one (spaces included, so wrapping never jumps). */
function typeIn(t, el, d) {
  const text = el.textContent;
  el.textContent = '';
  const chars = Array.from(text).map((c) => {
    const s = document.createElement('span');
    s.textContent = c;
    el.appendChild(s);
    return s;
  });
  tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.001, stagger: d / chars.length, ease: 'none' }, t);
  return chars;
}

/* Counter text driven by a tween (seek-safe: the value is a pure function of time). */
function countUp(t, el, from, to, d, fmt) {
  const o = { v: from };
  const f = fmt || ((v) => String(Math.round(v)));
  el.textContent = f(from);
  tl.fromTo(o, { v: from }, { v: to, duration: d, ease: 'power1.inOut', onUpdate: () => { el.textContent = f(o.v); } }, t);
}
/* ── end helpers ── */
