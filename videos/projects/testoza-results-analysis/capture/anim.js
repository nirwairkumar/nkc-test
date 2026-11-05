// 2D scene choreography. Each handler adds tweens to the one paused timeline, on the cue times that
// build.mjs passes in (p.cues: cue → seconds). Every tween is fromTo with immediateRender off, or a set,
// so seeking to any time gives the same frame.
const ANIM_FX = (() => {
  // The first tween an element gets also sets its `from` state at 0, so it waits unseen for its cue.
  const seen = new WeakSet();
  const T = (tl) => (el, from, to, at, d = 0.55, ease = 'power3.out') => {
    if (!el) return;
    if (!seen.has(el)) { seen.add(el); tl.set(el, from, 0); }
    tl.fromTo(el, from, { ...to, duration: d, ease, immediateRender: false }, at);
  };
  const counter = (tl, el, a, b, at, d, fmt = (v) => String(Math.round(v))) => {
    const o = { v: a };
    tl.set(el, { textContent: fmt(a) }, 0);
    tl.fromTo(o, { v: a }, { v: b, duration: d, ease: 'power2.out', immediateRender: false, onUpdate: () => { el.textContent = fmt(o.v); } }, at);
  };
  const frame = (tl, sc, p) => {
    tl.fromTo(sc, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, p.start);
    tl.fromTo(sc, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power1.in', immediateRender: false }, p.end - 0.35);
  };

  function paper(tl, p, $, $$, c) {
    const to = T(tl);
    const dim = $('.pp-dim');
    // Lights off → the lamp clicks on (with a flicker).
    tl.set(dim, { opacity: 0.94 }, 0);
    seen.add(dim);
    tl.fromTo(dim, { opacity: 0.94 }, { opacity: 0.25, duration: 0.08, immediateRender: false }, c('lamp'));
    tl.fromTo(dim, { opacity: 0.25 }, { opacity: 0.7, duration: 0.07, immediateRender: false }, c('lamp') + 0.1);
    tl.fromTo(dim, { opacity: 0.7 }, { opacity: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, c('lamp') + 0.2);
    to($('.pp-cal'), { y: -40, opacity: 0 }, { y: 0, opacity: 1 }, c('lamp') + 0.3);
    to($('.pp-stack'), { y: -90, scale: 1.06, opacity: 0 }, { y: 0, scale: 1, opacity: 1 }, c('stack'), 0.7);
    to($('.pp-pen'), { x: 220, y: -60, rotation: 70, opacity: 0 }, { x: 0, y: 0, rotation: 24, opacity: 1 }, c('pen'), 0.7, 'back.out(1.4)');
    to($('.pp-chai'), { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1 }, c('chai'), 0.55, 'back.out(1.6)');
    // "went cold an hour ago": the steam rises once, then it's gone.
    const st = $('.pp-chai .steam');
    to(st, { y: 30, opacity: 0 }, { y: -10, opacity: 1 }, c('chai') + 0.2, 0.6);
    to(st, { y: -10, opacity: 1 }, { y: -50, opacity: 0 }, c('chai') + 1.3, 1.4, 'power1.in');
    // Tick, cross, tick…
    $$('.pp-stack .mk').forEach((m, i) => to(m, { scale: 2.4, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1 }, c('tick') + 0.05 + i * 0.16, 0.3, 'back.out(3)'));
    to($('.pp-stack .tot b'), { scale: 1 }, { scale: 1.25 }, c('tick') + 1.75, 0.25, 'power2.out');
    to($('.pp-stack .tot b'), { scale: 1.25 }, { scale: 1 }, c('tick') + 2.0, 0.3, 'power2.in');
    // The register fills in, the rank list goes up, the calendar runs to Tuesday.
    to($('.pp-register'), { x: 760, rotation: 8, opacity: 0 }, { x: 0, rotation: -3, opacity: 1 }, c('register'), 0.75);
    $$('.pp-register .pgL .rr').forEach((r, i) => to(r, { x: -16, opacity: 0 }, { x: 0, opacity: 1 }, c('register') + 0.5 + i * 0.11, 0.3));
    to($('.pp-board'), { x: -560, rotation: -10, opacity: 0 }, { x: 0, rotation: -1, opacity: 1 }, c('notice'), 0.75);
    $$('.pp-board .kr').forEach((r, i) => to(r, { opacity: 0 }, { opacity: 1 }, c('notice') + 0.45 + i * 0.08, 0.25));
    to($('.pp-cal'), { scale: 1 }, { scale: 1.12 }, c('tuesday') - 0.15, 0.25);
    to($('.pp-cal .p1'), { rotationX: 0, opacity: 1 }, { rotationX: -110, opacity: 0 }, c('tuesday') + 0.05, 0.4, 'power2.in');
    to($('.pp-cal .p2'), { rotationX: 0, opacity: 1 }, { rotationX: -110, opacity: 0 }, c('tuesday') + 0.55, 0.4, 'power2.in');
    to($('.pp-cal'), { scale: 1.12 }, { scale: 1 }, c('tuesday') + 1.1, 0.35);
    // The question nobody answers.
    to(dim, { opacity: 0 }, { opacity: 0.58 }, c('why'), 0.5, 'power1.out');
    to($('.pp-q'), { scale: 0.5, rotation: -14, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1 }, c('why') + 0.05, 0.7, 'back.out(1.8)');
    to($('.pp-note'), { x: 420, rotation: 14, opacity: 0 }, { x: 0, rotation: 3, opacity: 1 }, c('why') + 0.35, 0.7);
    to($('.pp-count'), { y: 60, opacity: 0 }, { y: 0, opacity: 1 }, c('count'), 0.5);
    counter(tl, $('.pp-count b'), 0, 960, c('count') + 0.2, 2.2);
    // "Nobody has that kind of Sunday": the lamp sighs.
    to(dim, { opacity: 0.58 }, { opacity: 0.78 }, c('laugh'), 0.12);
    to(dim, { opacity: 0.78 }, { opacity: 0.58 }, c('laugh') + 0.18, 0.3);
    to($('.pp-q'), { rotation: 0 }, { rotation: 10 }, c('laugh') + 0.05, 0.25, 'power1.inOut');
    to($('.pp-q'), { rotation: 10 }, { rotation: 0 }, c('laugh') + 0.3, 0.5, 'elastic.out(1,0.4)');
    // Online: the pile flies into a laptop, the room turns to day.
    const away = ['.pp-q', '.pp-note', '.pp-count', '.pp-board', '.pp-register', '.pp-cal', '.pp-pen', '.pp-chai'];
    away.forEach((s, i) => to($(s), { opacity: 1 }, { opacity: 0 }, c('online') - 0.05 + i * 0.02, 0.35, 'power1.in'));
    to($('.pp-stack'), { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }, { x: 140, y: -40, scale: 0.35, rotation: -12, opacity: 0 }, c('online'), 0.75, 'power2.in');
    to(dim, { opacity: 0.58 }, { opacity: 0 }, c('online'), 0.4);
    to($('.pp-day'), { opacity: 0 }, { opacity: 1 }, c('online') + 0.15, 0.6, 'power1.inOut');
    to($('.pp-laptop'), { y: 340, opacity: 0 }, { y: 0, opacity: 1 }, c('online') + 0.35, 0.8, 'expo.out');
    to($('.pp-laptop .ring'), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1 }, c('online') + 0.8, 0.5, 'back.out(2.2)');
    to($('.pp-laptop .done b'), { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, c('online') + 1.0, 0.4);
    to($('.pp-laptop .done span'), { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, c('online') + 1.15, 0.4);
    // …and then a wall of numbers.
    to($('.pp-laptop .done'), { opacity: 1 }, { opacity: 0 }, c('wall') - 0.1, 0.25);
    $$('.pp-laptop .nums span').forEach((s, i) => to(s, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1 }, c('wall') + 0.05 + ((i * 7) % 30) * 0.035, 0.3, 'back.out(2)'));
    // Title.
    to($('.pp-laptop'), { scale: 1, opacity: 1 }, { scale: 1.9, opacity: 0 }, c('title') - 0.05, 0.6, 'power2.in');
    to($('.pp-title'), { opacity: 0 }, { opacity: 1 }, c('title') + 0.2, 0.45);
    to($('.pp-title img'), { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, c('title') + 0.3, 0.7, 'expo.out');
    to($('.pp-title h1'), { y: 50, opacity: 0, filter: 'blur(12px)' }, { y: 0, opacity: 1, filter: 'blur(0px)' }, c('title') + 0.45, 0.8, 'expo.out');
    to($('.pp-title p'), { y: 24, opacity: 0 }, { y: 0, opacity: 1 }, c('title') + 0.9, 0.6);
  }

  function promise(tl, p, $, $$, c) {
    const to = T(tl);
    to($('.pm-head'), { y: -30, opacity: 0 }, { y: 0, opacity: 1 }, c('promise'), 0.6);
    $$('.pm-card').forEach((el, i) => to(el, { y: 90, opacity: 0 }, { y: 0, opacity: 1 }, c('promise') + 0.15 + i * 0.12, 0.7, 'expo.out'));
    ['reg', 'board', 'copy', 'discuss'].forEach((cue, i) => {
      const card = $(`.pm-card.c${i}`);
      to($('.inner', card), { rotationY: 0 }, { rotationY: 180 }, c(cue), 0.8, 'power3.inOut');
      to(card, { scale: 1 }, { scale: 1.07 }, c(cue), 0.4, 'power2.out');
      to(card, { scale: 1.07 }, { scale: 1 }, c(cue) + 0.45, 0.45, 'power2.inOut');
      to($('.back s', card), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }, c(cue) + 0.65, 0.35, 'back.out(3)');
    });
    to($('.pm-head .on'), { scale: 1 }, { scale: 1.12 }, c('reg'), 0.3);
    to($('.pm-head .on'), { scale: 1.12 }, { scale: 1 }, c('reg') + 0.35, 0.4);
    // …and what paper can't show you.
    to($('.pm-row'), { y: 0, opacity: 1, scale: 1 }, { y: 120, opacity: 0, scale: 0.92 }, c('plus') - 0.05, 0.5, 'power2.in');
    to($('.pm-head'), { opacity: 1 }, { opacity: 0 }, c('plus') - 0.05, 0.4);
    to($('.pm-plus'), { opacity: 0 }, { opacity: 1 }, c('plus') + 0.2, 0.4);
    to($('.pm-plus .lens'), { scale: 0.4, rotation: -30 }, { scale: 1, rotation: 0 }, c('plus') + 0.2, 0.8, 'back.out(1.7)');
    to($('.pm-plus p'), { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, c('plus') + 0.5, 0.6);
    to($('.pm-plus .lens'), { scale: 1 }, { scale: 9 }, p.end - 0.75, 0.75, 'power3.in');
    to($('.pm-plus p'), { opacity: 1 }, { opacity: 0 }, p.end - 0.75, 0.3);
  }

  function shapes(tl, p, $, $$, c) {
    const to = T(tl);
    const bars = $$('.sh-plot .bar'), nums = $$('.sh-plot .col em');
    const H = 430;
    let prev = [0, 0, 0, 0, 0];
    const shape = (vals, at) => {
      const max = Math.max(...vals);
      bars.forEach((b, i) => {
        const h0 = Math.max(18, (prev[i] / Math.max(...prev, 1)) * H), h1 = Math.max(18, (vals[i] / max) * H);
        to(b, { height: h0 }, { height: h1 }, at, 0.75, 'power3.inOut');
        tl.set(nums[i], { textContent: String(vals[i]) }, at + 0.35);
      });
      prev = vals;
    };
    to($('.sh-card'), { y: 60, opacity: 0 }, { y: 0, opacity: 1 }, p.start + 0.1, 0.7, 'expo.out');
    bars.forEach((b) => tl.set(b, { height: 18 }, 0));
    nums.forEach((n) => tl.set(n, { textContent: '' }, 0));
    shape([3, 6, 12, 10, 6], c('shape'));
    const chip = (name, a, b) => {
      to($(`.chip.${name}`), { y: 16, opacity: 0 }, { y: 0, opacity: 1 }, a, 0.4);
      if (b) to($(`.chip.${name}`), { y: 0, opacity: 1 }, { y: -16, opacity: 0 }, b - 0.25, 0.25, 'power1.in');
    };
    shape([1, 2, 6, 15, 24], c('easy')); chip('easy', c('easy') + 0.1, c('hard'));
    shape([22, 15, 7, 3, 1], c('hard')); chip('hard', c('hard') + 0.1, c('split'));
    shape([16, 6, 2, 7, 17], c('split')); chip('split', c('split') + 0.1, c('ours'));
    to($('.sh-plot .doubt'), { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, c('doubt'), 0.5, 'back.out(2)');
    to($('.sh-plot .doubt'), { opacity: 1 }, { opacity: 0 }, c('ours') - 0.1, 0.3);
    shape([4, 7, 15, 16, 6], c('ours')); chip('ours', c('ours') + 0.1);
  }

  function patterns(tl, p, $, $$, c) {
    const to = T(tl);
    ['three', 'grey2', 'flat'].forEach((cue, i) => {
      const card = $(`.pt-card.p${i}`), at = c(cue);
      to(card, { y: 80, opacity: 0 }, { y: 0, opacity: 1 }, at, 0.7, 'expo.out');
      $$('.tr i', card).forEach((b, k) => to(b, { scaleX: 0 }, { scaleX: 1 }, at + 0.25 + k * 0.07, 0.55, 'power3.out'));
      tl.set($$('.tr i', card), { transformOrigin: '0 50%' }, 0);
      const hot = $('.tr i.hot, .tr i.grayhot', card);
      if (hot) { to(hot, { filter: 'brightness(1)' }, { filter: 'brightness(1.25)' }, at + 0.9, 0.3); to(hot, { filter: 'brightness(1.25)' }, { filter: 'brightness(1)' }, at + 1.2, 0.4); }
      if (i === 2) $$('.tr i', card).forEach((b, k) => k < 4 && to(b, { y: 0 }, { y: -3 }, at + 1.0 + k * 0.08, 0.15, 'power1.out'));
      to($('.fix', card), { x: -20, opacity: 0 }, { x: 0, opacity: 1 }, at + 0.8, 0.5);
    });
  }

  function routine(tl, p, $, $$, c) {
    const to = T(tl);
    to($('.rt-card'), { x: -80, opacity: 0 }, { x: 0, opacity: 1 }, c('routine'), 0.7, 'expo.out');
    to($('.rt-side'), { x: 80, opacity: 0 }, { x: 0, opacity: 1 }, c('routine') + 0.15, 0.7, 'expo.out');
    const arc = $('.rt-side .arc'), hand = $('.rt-side .mh');
    tl.set(arc, { strokeDasharray: 100, strokeDashoffset: 100 }, 0);
    tl.set(hand, { svgOrigin: '100 100', rotation: 0 }, 0);
    for (let i = 0; i < 5; i++) {
      const st = $(`.st.s${i}`), at = c(`r${i + 1}`);
      to($('.box', st), { backgroundColor: 'rgba(16,185,129,0)', borderColor: '#cbd5e1', scale: 1 }, { backgroundColor: '#10b981', borderColor: '#10b981', scale: 1.15 }, at, 0.3, 'back.out(3)');
      to($('.box', st), { scale: 1.15 }, { scale: 1 }, at + 0.3, 0.25);
      to($('.box svg', st), { opacity: 0 }, { opacity: 1 }, at + 0.1, 0.2);
      to($('b', st), { color: '#cbd5e1' }, { color: '#10b981' }, at, 0.3);
      to($('span', st), { color: '#475569' }, { color: '#0f172a' }, at, 0.3);
      const a0 = i === 0 ? 100 : 100 - i * 20;
      to(arc, { strokeDashoffset: a0 }, { strokeDashoffset: 100 - (i + 1) * 20 }, at, 0.6, 'power2.out');
      to(hand, { rotation: i * 6 }, { rotation: (i + 1) * 6 }, at, 0.6, 'power2.out');
    }
    to($('.rt-side .five'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1 }, c('done'), 0.6, 'back.out(2)');
    to($('.rt-chai .steam'), { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, c('done') + 0.2, 1.0, 'power1.out');
    to($('.rt-chai .steam'), { y: 0 }, { y: -18 }, c('done') + 1.2, Math.max(0.5, p.end - c('done') - 1.6), 'sine.inOut');
  }

  function end(tl, p, $, $$, c) {
    const to = T(tl);
    to($('.en-flip'), { y: 80, opacity: 0 }, { y: 0, opacity: 1 }, c('close'), 0.7, 'expo.out');
    to($('.en-flip .big'), { scale: 1.8, opacity: 0, rotation: -30 }, { scale: 1, opacity: 1, rotation: -8 }, c('close') + 0.5, 0.45, 'back.out(2.4)');
    to($('.en-flip .inner'), { rotationY: 0 }, { rotationY: 180 }, c('reasons'), 0.9, 'power3.inOut');
    $$('.en-flip .why').forEach((w, i) => to(w, { x: -20, opacity: 0 }, { x: 0, opacity: 1 }, c('reasons') + 0.7 + i * 0.15, 0.4));
    $$('.en-flip .mini i').forEach((b, i) => { tl.set(b, { transformOrigin: '50% 100%' }, 0); to(b, { scaleY: 0 }, { scaleY: 1 }, c('reasons') + 0.6 + i * 0.07, 0.5); });
    to($('.en-brand img'), { y: 40, opacity: 0, filter: 'blur(12px)' }, { y: 0, opacity: 1, filter: 'blur(0px)' }, c('try'), 0.8, 'expo.out');
    to($('.en-brand .pills'), { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, c('try') + 0.35, 0.6);
    tl.fromTo($('.en-brand .subs'), { scale: 1 }, { scale: 1.1, duration: 0.32, yoyo: true, repeat: 3, ease: 'sine.inOut', immediateRender: false }, c('sub') + 0.2);
  }

  const FX = { paper, promise, shapes, patterns, routine, end };
  return (tl, p) => {
    const sc = document.querySelector(p.sel);
    const $ = (s, r = sc) => r.querySelector(s), $$ = (s, r = sc) => [...r.querySelectorAll(s)];
    const c = (name, d = 0) => (p.cues[name] ?? p.start) + d;
    frame(tl, sc, p);
    FX[p.name](tl, p, $, $$, c);
  };
})();
