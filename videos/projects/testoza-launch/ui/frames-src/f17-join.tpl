<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f17-ph { left: 470px; top: 98px; }
  .f17-side { position: absolute; left: 1060px; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 92px; letter-spacing: -0.04em; line-height: 1; color: #f8fafc; white-space: nowrap; }
  .f17-side em { font-style: normal; background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .f17-pg { position: absolute; left: 0; right: 0; top: 0; bottom: 74px; overflow: hidden; background: #f2f2f7; }
  .f17-pg > div { height: 100%; }
  #f17-blank { position: absolute; left: 0; right: 0; top: 0; bottom: 74px; background: #f2f2f7; display: flex; flex-direction: column; align-items: center; padding-top: 120px; gap: 14px; font-family: 'Mukta', sans-serif; color: #8e8e93; font-size: 15px; }
  #f17-blank b { color: #1c1c1e; font-size: 22px; font-weight: 700; }
  .f17-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 74px; z-index: 5; background: rgba(242, 242, 247, 0.96); border-top: 1px solid #d1d1d6; display: flex; align-items: flex-start; justify-content: center; padding-top: 10px; }
  .f17-url { width: 340px; height: 40px; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); display: flex; align-items: center; justify-content: center; gap: 6px; font: 500 16px/1 'Mukta', sans-serif; color: #111; }
  .f17-caret { display: inline-block; width: 2px; height: 20px; background: #007aff; margin-left: 1px; }
  .f17-tap { position: absolute; left: 0; top: 0; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; background: rgba(15, 23, 42, 0.22); border: 2px solid rgba(255, 255, 255, 0.9); z-index: 40; opacity: 0; }
</style>
<!--@measure {"cont": ["#f17-j6 button", "#f17-screen"], "start": ["#f17-gw #pg-start", "#f17-screen"], "url": [".f17-url", "#f17-screen"]}-->
<div id="root" data-composition-id="f17-join" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f17-a" class="f17-side" style="top: 330px"><em>testoza.com/join</em></div>
    <div id="f17-b" class="f17-side" style="top: 450px">Enter the code.</div>
    <div id="f17-c" class="f17-side" style="top: 570px">Start.</div>
    <div id="f17-ph" class="tz-phone">
      <div id="f17-screen" class="tz-phone-screen">
        <div class="tz-phone-status"><span>10:05</span><span></span></div>
        <div class="tz-island"></div>
        <div class="tz-phone-body">
          <div id="f17-blank"><b>Favourites</b><span>Type a website to open it</span></div>
          <div class="f17-pg f17-j" id="f17-j0"><!--@ssr:phone-join-0--></div>
          <div class="f17-pg f17-j" id="f17-j1"><!--@ssr:phone-join-1--></div>
          <div class="f17-pg f17-j" id="f17-j2"><!--@ssr:phone-join-2--></div>
          <div class="f17-pg f17-j" id="f17-j3"><!--@ssr:phone-join-3--></div>
          <div class="f17-pg f17-j" id="f17-j4"><!--@ssr:phone-join-4--></div>
          <div class="f17-pg f17-j" id="f17-j5"><!--@ssr:phone-join-5--></div>
          <div class="f17-pg f17-j" id="f17-j6"><!--@ssr:phone-join-6--></div>
          <div class="f17-pg" id="f17-gw"><!--@ssr:phone-gateway--></div>
          <div class="f17-bar"><div class="f17-url"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" stroke-width="2.6"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span id="f17-typed">testoza.com/join</span><i class="f17-caret" id="f17-caret"></i></div></div>
        </div>
        <div class="tz-home"></div>
        <div id="f17-tap" class="f17-tap"></div>
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f17-join';
  /*@helpers*/
  /*@M*/
  const ph = q('#f17-ph');
  const cont = M.cont || { x: 195, y: 560 }, start = M.start || { x: 195, y: 684 }, url = M.url || { x: 195, y: 808 };
  const tap = (t, p) => {
    tl.fromTo('#f17-tap', { x: p.x, y: p.y, scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.12, ease: 'power2.out', immediateRender: false }, t);
    tl.to('#f17-tap', { scale: 1.5, opacity: 0, duration: 0.35, ease: 'power2.out' }, t + 0.14);
  };
  tl.set('#f17-tap', { opacity: 0 }, 0);
  tl.fromTo(ph, { y: 120, scale: 1.12, rotation: -2 }, { y: 0, scale: 0.94, rotation: 0, duration: 1.0, ease: 'expo.out' }, 0);
  tl.set(['#f17-a', '#f17-b', '#f17-c'], { autoAlpha: 0 }, 0);

  // type the address
  const pages = qa('.f17-j');
  pages.forEach((p) => tl.set(p, { autoAlpha: 0 }, 0));
  tl.set('#f17-gw', { autoAlpha: 0 }, 0);
  tap(0.35, url);
  typeIn(0.45, q('#f17-typed'), 1.0);
  superIn(0.5, q('#f17-a'));
  tl.set('#f17-caret', { autoAlpha: 0 }, 1.6);
  tl.set('#f17-blank', { autoAlpha: 0 }, 1.7);
  tl.set(pages[0], { autoAlpha: 1 }, 1.7);
  tl.fromTo(pages[0], { y: 18 }, { y: 0, duration: 0.4, ease: 'power3.out' }, 1.7);

  // the six digits from the board
  superIn(2.0, q('#f17-b'));
  for (let n = 1; n <= 6; n++) { tl.set(pages[n - 1], { autoAlpha: 0 }, 2.0 + n * 0.2); tl.set(pages[n], { autoAlpha: 1 }, 2.0 + n * 0.2); }
  tap(3.55, cont);
  press(3.55, q('#f17-j6 button'), 0.97);

  // the code opens the exam, exactly like the link
  tl.set('#f17-gw', { autoAlpha: 1 }, 3.85);
  tl.fromTo('#f17-gw', { x: 390 }, { x: 0, duration: 0.45, ease: 'power3.out' }, 3.85);
  superIn(4.4, q('#f17-c'));
  tap(5.0, start);
  press(5.0, q('#f17-gw #pg-start'), 0.96);
  tl.to(ph, { scale: 1.0, duration: 1.0, ease: 'power2.inOut' }, 4.6);
  window.__timelines[ID] = tl;
</script>
</template>
