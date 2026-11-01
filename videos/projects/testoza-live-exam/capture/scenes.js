// Builds the one paused timeline from PLAN (written by build.mjs). Runs after fonts load so the
// board's marker pen can measure the real text widths.
const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];
const centred = (s) => ({ scale: s, x: (1920 - 1536 * s) / 2, y: (1080 - 864 * s) / 2 });

document.fonts.ready.then(() => {
  const tl = gsap.timeline({ paused: true });
  const pop = (el, at, from = { y: 24, opacity: 0 }) => el && tl.fromTo(el, from, { y: 0, x: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out', immediateRender: false }, at);
  const show = (el, at) => el && tl.set(el, { display: 'block' }, at);
  const hide = (el, at) => el && tl.set(el, { display: 'none' }, at);

  for (const p of PLAN) {
    if (p.type === 'cam') {
      const el = q(p.sel);
      tl.set(el, { transformOrigin: '0 0', ...p.keys[0] }, 0);
      p.keys.slice(1).forEach((k, i) => {
        const a = p.keys[i];
        tl.fromTo(el, { scale: a.scale, x: a.x, y: a.y }, { scale: k.scale, x: k.x, y: k.y, duration: 0.9, ease: 'power2.inOut', immediateRender: false }, k.at);
      });
    }
    if (p.type === 'montage') {
      const el = q(p.sel);
      tl.set(el, { transformOrigin: '0 0', ...centred(1.25) }, 0);
      p.cuts.forEach((c) => tl.fromTo(el, centred(1.34), { ...centred(1.25), duration: 0.7, ease: 'expo.out', immediateRender: false }, c));
    }
    if (p.type === 'wa1') {
      const sc = q('#wa1');
      pop(q('.phone', sc), p.start, { y: 80, opacity: 0 });
      pop(q('.side', sc), p.start + 0.25, { x: 40, opacity: 0 });
      const box = q('#wa1box'), draft = q('#wa1draft'), sent = q('#wa1sent');
      hide(sent, 0);
      // The invite drops into the message box…
      hide(q('.ph', box), p.wa); show(draft, p.wa);
      tl.fromTo(draft, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, p.wa);
      // …each part lights up as it is named…
      for (const [key, at] of p.hl) {
        if (at == null) continue;
        const el = q('.hl-' + key, draft);
        tl.fromTo(el, { backgroundColor: 'rgba(250,204,21,0)' }, { backgroundColor: 'rgba(250,204,21,.55)', duration: 0.2, immediateRender: false }, at - 0.05);
        tl.to(el, { backgroundColor: 'rgba(250,204,21,0)', duration: 0.5, immediateRender: false }, at + 1.0);
      }
      // …and Send.
      tl.fromTo('#wa1send', { scale: 1 }, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1, immediateRender: false }, p.send - 0.15);
      hide(draft, p.send); show(q('.ph', box), p.send); show(sent, p.send);
      tl.fromTo(sent, { opacity: 0, y: 60, scale: 0.9, transformOrigin: '100% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)', immediateRender: false }, p.send);
    }
    if (p.type === 'board') {
      const sc = q('#board');
      tl.fromTo(q('.wb', sc), { scale: 1.04, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, p.start);
      const pen = q('#pen');
      const write = (el, at, dur) => {
        const w = el.offsetWidth, top = el.offsetTop, left = el.offsetLeft, h = el.offsetHeight;
        tl.fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur, ease: 'none', immediateRender: false }, at);
        tl.fromTo(pen, { x: left, y: top + h * 0.62, rotation: -32, opacity: 1 }, { x: left + w, y: top + h * 0.55, rotation: -28, duration: dur, ease: 'none', immediateRender: false }, at);
      };
      tl.set(pen, { opacity: 0 }, 0);
      tl.set(['#ink1', '#ink2'], { clipPath: 'inset(0% 100% 0% 0%)' }, 0);
      write(q('#ink1'), p.url - 0.1, 1.5);
      write(q('#ink2'), p.digits - 0.1, 1.4);
      tl.to(pen, { x: '+=120', y: '+=160', opacity: 0, duration: 0.5, ease: 'power2.in', immediateRender: false }, p.digits + 1.5);
    }
    if (p.type === 'wa2') {
      const sc = q('#wa2');
      pop(q('.phone', sc), p.start, { y: 80, opacity: 0 });
      pop(q('.side', sc), p.start + 0.25, { x: 40, opacity: 0 });
      const msg = q('#wa2msg'), notif = q('#wa2notif');
      hide(msg, 0);
      tl.fromTo(notif, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.3)', immediateRender: false }, p.msg - 0.1);
      tl.to(notif, { y: -140, opacity: 0, duration: 0.35, ease: 'power2.in', immediateRender: false }, p.msg + 1.9);
      show(msg, p.msg + 0.15);
      tl.fromTo(msg, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', immediateRender: false }, p.msg + 0.15);
      // Touch on the link.
      const u = q('u', msg), r = document.createElement('span');
      r.className = 'ripple'; u.appendChild(r);
      tl.set(r, { scale: 0.4, opacity: 0 }, 0);
      tl.fromTo(r, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, immediateRender: false }, p.tap - 0.05);
      tl.to(r, { scale: 1.8, opacity: 0, duration: 0.4, immediateRender: false }, p.tap + 0.15);
      tl.fromTo(u, { backgroundColor: 'rgba(14,116,144,0)' }, { backgroundColor: 'rgba(14,116,144,.18)', duration: 0.15, immediateRender: false }, p.tap);
    }
    if (p.type === 'later') {
      const el = q('#later');
      tl.fromTo(qa('.lk, .lt', el), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out', immediateRender: false }, p.at + 0.05);
    }
    if (p.type === 'neet') {
      const sc = q('#neet');
      pop(q('#omr'), p.start + 0.1, { x: -80, opacity: 0, rotation: -4 });
      tl.fromTo('#arr', { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut', immediateRender: false }, p.start + 0.7);
      pop(q('#mon'), p.start + 1.1, { y: 60, opacity: 0 });
      tl.fromTo(qa('#nh > div', sc), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.18, ease: 'power3.out', immediateRender: false }, p.neet - 0.1);
    }
    if (p.type === 'end') {
      const sc = q('#end');
      tl.fromTo(q('.wm', sc), { y: 50, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', immediateRender: false }, p.start + 0.2);
      pop(q('.tag', sc), p.start + 0.7);
      pop(q('.pills', sc), p.endurl - 0.1, { y: 30, opacity: 0 });
      tl.fromTo('#subpill', { scale: 1 }, { scale: 1.08, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, p.thanks + 0.6);
    }
  }
  // Title card
  const tc = q('#title');
  if (tc) {
    const s = +tc.dataset.start;
    tl.fromTo(q('.wm', tc), { y: 40, opacity: 0, filter: 'blur(14px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', immediateRender: false }, s + 0.05);
    tl.fromTo(q('.ttl', tc), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, s + 0.35);
    tl.fromTo(q('.sub', tc), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', immediateRender: false }, s + 0.7);
  }
  qa('.chip').forEach((el) => tl.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out', immediateRender: false }, +el.dataset.start));
  qa('.cap span').forEach((el) => tl.fromTo(el, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out', immediateRender: false }, +el.parentElement.dataset.start));
  window.__timelines['main'] = tl;
});
