<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f18-l { left: 395px; top: 120px; }
  #f18-r { left: 1095px; top: 120px; }
  .f18-st { position: absolute; inset: 0; }
  .f18-st > div { height: 100%; }
  .f18-chip { position: absolute; top: 996px; height: 40px; padding: 0 18px; border-radius: 999px; display: flex; align-items: center; gap: 8px;
    background: rgba(15, 23, 42, 0.8); box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.3); color: #e2e8f0; font: 600 20px/1 'Mukta', sans-serif; }
  .f18-chip i { width: 9px; height: 9px; border-radius: 50%; background: #34d399; display: block; }
  .f18-r0 #px-submitting { opacity: 0; visibility: hidden; }
  .f18-tap { position: absolute; left: 0; top: 0; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; background: rgba(15, 23, 42, 0.22); border: 2px solid rgba(255, 255, 255, 0.9); z-index: 120; opacity: 0; }
</style>
<!--@measure {"optA": ["#f18-l .f18-l1 #px-opt-A", "#f18-l .tz-phone-screen"], "submit": ["#f18-r .f18-r0 #px-submit", "#f18-r .tz-phone-screen"]}-->
<div id="root" data-composition-id="f18-exam2" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f18-t1" class="tz-super">Same exam. <em>Same proctoring.</em></div>
    <div id="f18-t2" class="tz-super">One tap. <em>Submitted.</em></div>
    <div id="f18-l" class="tz-phone">
      <div class="tz-phone-screen">
        <div class="tz-phone-status"><span>10:03</span><span></span></div>
        <div class="tz-island"></div>
        <div class="tz-phone-body">
          <div class="f18-st f18-l0"><!--@ssr:phone-exam-0--></div>
          <div class="f18-st f18-l1"><!--@ssr:phone-exam-1--></div>
        </div>
        <div class="tz-home"></div>
        <div id="f18-tapl" class="f18-tap"></div>
      </div>
    </div>
    <div id="f18-r" class="tz-phone">
      <div class="tz-phone-screen">
        <div class="tz-phone-status"><span>10:41</span><span></span></div>
        <div class="tz-island"></div>
        <div class="tz-phone-body">
          <div class="f18-st f18-r0"><!--@ssr:phone-exam-sub--></div>
          <div class="f18-st f18-r1"><!--@ssr:phone-done--></div>
        </div>
        <div class="tz-home"></div>
        <div id="f18-tapr" class="f18-tap"></div>
      </div>
    </div>
    <div id="f18-cl" class="f18-chip" style="left: 500px"><i></i>Arjun · question 2</div>
    <div id="f18-cr" class="f18-chip" style="left: 1180px"><i></i>Arjun · 40 min later</div>
  </div>
</div>
<script>
  const ID = 'f18-exam2';
  /*@helpers*/
  /*@M*/
  const optA = M.optA || { x: 195, y: 470 }, sub = M.submit || { x: 330, y: 92 };
  const tap = (sel, t, p) => {
    tl.fromTo(sel, { x: p.x, y: p.y, scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.12, ease: 'power2.out', immediateRender: false }, t);
    tl.to(sel, { scale: 1.5, opacity: 0, duration: 0.35, ease: 'power2.out' }, t + 0.14);
  };
  tl.set(['#f18-tapl', '#f18-tapr'], { opacity: 0 }, 0);
  const L = [q('.f18-l0'), q('.f18-l1')], Rr = [q('.f18-r0'), q('.f18-r1')];
  only(0, L[0], L);
  only(0, Rr[0], Rr);

  // Rohan: the timer runs, he picks A
  const mmss = (v) => { const s = Math.max(0, Math.round(v)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  qa('#f18-l .font-mono').forEach((el, i) => countUp(0, el, 3581 - i * 3, 3576 - i * 3, 5.4, mmss));
  tl.fromTo('#f18-l', { x: 260, scale: 0.92 }, { x: 0, scale: 0.92, duration: 1.0, ease: 'expo.out' }, 0);
  tl.set('#f18-cl', { autoAlpha: 0 }, 0);
  tl.fromTo('#f18-cl', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.5);
  superIn(0.15, q('#f18-t1'));
  tap('#f18-tapl', 1.05, optA);
  only(1.12, L[1], L);
  press(1.12, q('.f18-l1 #px-opt-A'), 0.98);

  // Ananya, at the last question: Submit Test
  tl.fromTo('#f18-r', { x: 420, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 0.92, duration: 0.9, ease: 'expo.out' }, 1.4);
  tl.set('#f18-cr', { autoAlpha: 0 }, 0);
  tl.fromTo('#f18-cr', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 1.9);
  tap('#f18-tapr', 2.6, sub);
  press(2.6, q('.f18-r0 #px-submit'), 0.94);
  tl.fromTo('.f18-r0 #px-submitting', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 2.8);
  tl.fromTo('.f18-r0 #px-submitting svg', { rotation: 0 }, { rotation: 540, duration: 1.1, ease: 'none', transformOrigin: '50% 50%' }, 2.8);
  only(3.9, Rr[1], Rr);
  tl.fromTo('.f18-r1 .rounded-full.p-6', { scale: 0.4 }, { scale: 1, duration: 0.6, ease: 'back.out(2.4)' }, 3.9);
  tl.fromTo('.f18-r1 h1', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 4.05);
  superOut(3.9, q('#f18-t1'));
  tl.set('#f18-t2', { autoAlpha: 0 }, 0);
  superIn(3.9, q('#f18-t2'), 0.12);
  window.__timelines[ID] = tl;
</script>
</template>
