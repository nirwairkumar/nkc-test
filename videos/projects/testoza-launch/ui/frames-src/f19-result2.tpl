<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f19-st { height: 800px; overflow: hidden; background: #f8fafc; }
  #f19-sheet { position: absolute; right: 0; top: 0; height: 800px; z-index: 20; }
  .f19-ring { position: absolute; left: 0; top: 0; width: 150px; height: 46px; margin: -23px 0 0 -75px; border-radius: 999px; border: 3px solid rgba(2, 132, 199, 0.7); z-index: 25; opacity: 0; pointer-events: none; }
</style>
<!--@measure {"results": ".f19-s1 #le-results", "badge": ".f19-s1 #le-badge", "card": ".f19-s1 section", "row": "#f19-sheet #rs-row-1", "sheet": "#f19-sheet"}-->
<div id="root" data-composition-id="f19-result2" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f19-t" class="tz-super">Code or link, <em>same results.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/my-tests-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f19-st f19-s0"><!--@ssr:live-4--></div>
            <div class="tz-state f19-st f19-s1"><!--@ssr:live-5--></div>
          </div>
          <div class="tz-dim" id="f19-dim"></div>
          <div id="f19-sheet"><!--@ssr:results-2--></div>
        </div>
        <div id="f19-r1" class="f19-ring"></div>
        <div id="f19-r2" class="f19-ring"></div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f19-result2';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const S = [q('.f19-s0'), q('.f19-s1')];
  const res = M.results || { x: 440, y: 470 }, card = M.card || { x: 720, y: 330 }, row = M.row || { x: 1000, y: 320 }, sheet = M.sheet || { x: 990, y: 444 };
  only(0, S[0], S);
  tl.fromTo(rig, focus(res, 1.25, { x: 900, y: 600 }), Object.assign(focus(res, 1.35, { x: 900, y: 600 }), { duration: 2.2, ease: 'sine.inOut' }), 0);
  superIn(0.2, q('#f19-t'));

  // Ananya's answers land: the Results button lights up
  only(0.8, S[1], S);
  tl.fromTo('.f19-s1 #le-badge', { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3.5)' }, 0.8);
  [['#f19-r1', 0.82], ['#f19-r2', 1.12]].forEach(([r, t]) => {
    tl.fromTo(r, { x: res.x, y: res.y, scale: 0.9, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, t);
  });
  tl.set(['#f19-r1', '#f19-r2'], { opacity: 0 }, 0);

  cursorAt(0, { x: res.x + 420, y: res.y + 260 });
  move(1.3, res, 0.75);
  click(2.15, res, q('.f19-s1 #le-results'));

  // Test Results
  tl.fromTo('#f19-dim', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.3);
  tl.fromTo('#f19-sheet', { x: 920 }, { x: 0, duration: 0.55, ease: 'power3.out' }, 2.3);
  tl.set(CUR, { autoAlpha: 0 }, 2.4);
  cam(2.35, focus(sheet, 1.0, { x: 960, y: 580 }), 0.9);
  tl.fromTo('#f19-sheet #rs-row-1', { backgroundColor: 'rgba(224,242,254,0)' }, { backgroundColor: 'rgba(224,242,254,1)', duration: 0.4 }, 3.0);
  tl.fromTo('#f19-sheet #rs-row-1 td:nth-child(2) span', { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, 3.0);
  cam(3.1, focus({ x: row.x - 120, y: row.y }, 1.3, { x: 960, y: 600 }), 2.1, 'sine.inOut');
  window.__timelines[ID] = tl;
</script>
</template>
