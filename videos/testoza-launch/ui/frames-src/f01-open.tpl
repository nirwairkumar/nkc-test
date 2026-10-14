<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f01-bg { position: absolute; inset: 0; background: #000; }
  #f01-glow {
    position: absolute; left: 50%; top: 50%; width: 1400px; height: 700px; margin: -350px 0 0 -700px;
    background: radial-gradient(closest-side, rgba(56, 189, 248, 0.22), rgba(79, 70, 229, 0.10) 55%, transparent);
  }
  .f01-line { top: 470px; font-size: 92px; }
  #f01-rule {
    position: absolute; left: 50%; top: 620px; width: 520px; height: 2px; margin-left: -260px;
    background: linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent);
  }
</style>
<div id="root" data-composition-id="f01-open" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div id="f01-bg" class="clip" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f01-glow"></div>
    <div id="f01-a" class="tz-super f01-line">It starts with a <em>question paper.</em></div>
    <div id="f01-b" class="tz-super f01-line">It ends with <em>results.</em></div>
    <div id="f01-c" class="tz-super f01-line">Here's everything <em>in between.</em></div>
    <div id="f01-rule"></div>
  </div>
</div>
<script>
  const ID = 'f01-open';
  /*@helpers*/
  const A = q('#f01-a'), B = q('#f01-b'), C = q('#f01-c');
  tl.set([A, B, C], { autoAlpha: 0 }, 0);
  tl.fromTo('#f01-glow', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1.08, duration: 4, ease: 'sine.inOut' }, 0);
  superIn(0.25, A, 0.09);
  superOut(1.75, A);
  superIn(1.75, B, 0.09);
  superOut(2.85, B);
  superIn(2.85, C, 0.08);
  tl.fromTo('#f01-rule', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: 'expo.out' }, 3.0);
  // the line holds still under the words until the cut
  tl.fromTo(C, { scale: 1 }, { scale: 1.04, duration: 1.15, ease: 'none' }, 2.85);
  window.__timelines[ID] = tl;
</script>
</template>
