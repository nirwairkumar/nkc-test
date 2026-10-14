<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f09-st { height: 800px; overflow: hidden; background: #f8fafc; }
  #f09-toast { position: absolute; right: 24px; bottom: 24px; z-index: 30; }
</style>
<!--@measure {"copy": ".f09-st #le-copy", "link": ".f09-st #le-copy", "card": ".f09-st section"}-->
<div id="root" data-composition-id="f09-share" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f09-t" class="tz-super">Share <em>one link.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/my-tests-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f09-st"><!--@ssr:live-1--></div>
          </div>
          <div id="f09-toast"><!--@ssr:toast-copied--></div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f09-share';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const copy = M.copy || { x: 1100, y: 420 }, card = M.card || { x: 720, y: 330 };
  tl.fromTo(rig, focus(card, 1.02, { x: 960, y: 560 }), Object.assign(focus({ x: copy.x - 260, y: copy.y }, 1.35, { x: 960, y: 600 }), { duration: 2.4, ease: 'power2.inOut' }), 0);
  superIn(0.15, q('#f09-t'));
  cursorAt(0, { x: card.x + 200, y: card.y + 40 });
  move(0.1, copy, 0.75);
  click(0.95, copy, q('.f09-st #le-copy'));
  tl.fromTo('#f09-toast', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 1.1);
  // the link itself glows: this is what travels
  tl.fromTo('.f09-st #le-copy', { boxShadow: '0 0 0 0 rgba(56,189,248,0)', backgroundColor: '#ffffff' }, { boxShadow: '0 0 0 8px rgba(56,189,248,0.35)', backgroundColor: '#e0f2fe', duration: 0.6, ease: 'power2.out' }, 0.95);
  window.__timelines[ID] = tl;
</script>
</template>
