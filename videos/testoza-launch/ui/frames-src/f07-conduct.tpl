<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f07-st { height: 800px; overflow: hidden; background: #f8fafc; }
  #f07-dialog { position: absolute; left: 520px; top: 150px; z-index: 20; }
</style>
<!--@measure {"conduct": ".f07-st #mt-new .grid > button:last-child", "card": ".f07-st #mt-new", "start": "#f07-dialog #cd-start", "dialog": "#f07-dialog"}-->
<div id="root" data-composition-id="f07-conduct" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f07-t" class="tz-super">Ready. <em>Now take it live.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/my-tests-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f07-st"><!--@ssr:mytests--></div>
          </div>
          <div class="tz-dim" id="f07-dim"></div>
          <div id="f07-dialog"><!--@ssr:conduct--></div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f07-conduct';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const conduct = M.conduct || { x: 420, y: 520 }, card = M.card || { x: 300, y: 420 };
  const start = M.start || { x: 880, y: 600 };
  // the new test, glowing the way /my-tests greets it
  tl.fromTo('.f07-st #mt-new article',
    { boxShadow: '0 0 0 1px rgba(2,132,199,0.55), 0 0 0 9px rgba(2,132,199,0.16), 0 18px 40px -18px rgba(2,132,199,0.5)' },
    { boxShadow: '0 0 0 1px rgba(2,132,199,0.40), 0 0 0 5px rgba(2,132,199,0.09), 0 16px 34px -18px rgba(2,132,199,0.32)', duration: 2.2, ease: 'sine.inOut' }, 0);
  const tile = q('.f07-st #mt-new .grid > button:last-child');
  [0.2, 1.0].forEach((t) => {
    tl.to(tile, { boxShadow: '0 0 0 6px rgba(2,132,199,0.25), 0 12px 26px -8px rgba(2,132,199,0.95)', duration: 0.4, ease: 'sine.inOut' }, t);
    tl.to(tile, { boxShadow: '0 8px 18px -10px rgba(2,132,199,0.8)', duration: 0.4, ease: 'sine.inOut' }, t + 0.4);
  });
  tl.fromTo(rig, focus(card, 1.0, { x: 860, y: 590 }), Object.assign(focus(card, 1.08, { x: 860, y: 590 }), { duration: 1.6, ease: 'sine.inOut' }), 0);
  superIn(0.15, q('#f07-t'));
  cursorAt(0, { x: 980, y: 700 });
  move(0.2, conduct, 1.0);
  click(1.3, conduct, tile);

  // Conduct Online Exam
  tl.fromTo('#f07-dim', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 1.5);
  tl.fromTo('#f07-dialog', { opacity: 0, scale: 0.95, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 1.5);
  cam(1.55, focus(M.dialog || { x: 720, y: 420 }, 1.12, { x: 960, y: 600 }), 1.0);
  move(1.9, { x: start.x + 20, y: start.y + 2 }, 0.9);
  click(3.0, { x: start.x + 20, y: start.y + 2 }, q('#f07-dialog #cd-start'));
  window.__timelines[ID] = tl;
</script>
</template>
