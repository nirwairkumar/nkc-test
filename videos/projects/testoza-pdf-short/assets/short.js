/* Shared helpers for the TestoZa Short frames. Each frame calls SF(ID) once and builds on the
   returned paused timeline. Pure functions of time only (seek-safe). */
window.SF = function (ID) {
  const R = document.querySelector('[data-composition-id="' + ID + '"]');
  const q = (s) => R.querySelector(s);
  const qa = (s) => Array.from(R.querySelectorAll(s));
  const tl = gsap.timeline({ paused: true });

  /* Supers: words rise out of a blur, one after another. */
  function split(el) {
    if (el.dataset.split) return Array.from(el.querySelectorAll('.sf-w'));
    const out = [];
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { el.insertBefore(document.createTextNode(w), n); return; }
          const s = document.createElement('span');
          s.className = 'sf-w';
          s.textContent = w;
          el.insertBefore(s, n);
          out.push(s);
        });
        el.removeChild(n);
      } else if (n.nodeName === 'BR') {
        /* keep line breaks */
      } else {
        n.classList.add('sf-w');
        out.push(n);
      }
    });
    el.dataset.split = '1';
    return out;
  }
  function superIn(t, el, stagger) {
    const w = split(el);
    tl.set(el, { autoAlpha: 1 }, t);
    tl.fromTo(w, { y: 50, opacity: 0, filter: 'blur(14px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out', stagger: stagger || 0.08 }, t);
    return w;
  }
  /* Reveal single words of an already-split super at their own times. */
  function wordIn(t, w) {
    tl.fromTo(w, { y: 50, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out' }, t);
  }
  function superOut(t, el) {
    tl.to(el, { opacity: 0, y: -24, filter: 'blur(10px)', duration: 0.3, ease: 'power2.in' }, t);
    tl.set(el, { autoAlpha: 0 }, t + 0.3);
  }

  /* Stacked states in one place; a swap is a hard cut, like a page update. */
  function only(t, show, all) { all.forEach((el) => tl.set(el, { autoAlpha: el === show ? 1 : 0 }, t)); }

  /* Cursor (in frame coordinates) and a click with a ripple. */
  const CUR = q('.sf-cursor');
  function cursorAt(t, x, y) { tl.set(CUR, { x: x - 6, y: y - 4, autoAlpha: 1 }, t); }
  function move(t, x, y, d) { tl.to(CUR, { x: x - 6, y: y - 4, duration: d || 0.7, ease: 'power2.inOut' }, t); }
  function click(t, x, y, el) {
    tl.to(CUR, { scale: 0.82, duration: 0.08, ease: 'power2.out', transformOrigin: '6px 4px' }, t);
    tl.to(CUR, { scale: 1, duration: 0.25, ease: 'back.out(3)' }, t + 0.08);
    tap(t, x, y);
    if (el) {
      tl.to(el, { scale: 0.96, duration: 0.09, ease: 'power2.out' }, t);
      tl.to(el, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.09);
    }
  }
  function tap(t, x, y) {
    const r = document.createElement('div');
    r.className = 'sf-ripple';
    q('.sf').appendChild(r);
    tl.fromTo(r, { x: x, y: y, scale: 0.3, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, t);
  }

  /* Number text driven by a tween (seek-safe: value is a function of time). */
  function countUp(t, el, from, to, d, fmt) {
    const o = { v: from };
    const f = fmt || ((v) => String(Math.round(v)));
    el.textContent = f(from);
    tl.fromTo(o, { v: from }, { v: to, duration: d, ease: 'power2.out', onUpdate: () => { el.textContent = f(o.v); } }, t);
  }

  return { R, q, qa, tl, superIn, wordIn, superOut, only, cursorAt, move, click, tap, countUp, split };
};
