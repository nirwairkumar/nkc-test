<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f05-st { height: 800px; overflow: hidden; }
  .f05-st .aix-page { min-height: 800px; }
  /* sticky to the bottom of the window, as in the app */
  .f05-st .aix-actionbar { position: absolute !important; left: 0; right: 0; bottom: 0; z-index: 5; }
</style>
<!--@measure {"edit": ".f05-st .aix-actionbar .aix-btn--tinted", "widgets": ".f05-st .aix-widgets"}-->
<div id="root" data-composition-id="f05-review" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f05-t" class="tz-super">Check it <em>at a glance.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/generate-with-ai-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f05-st"><!--@ssr:preview--></div>
          </div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f05-review';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const edit = M.edit || { x: 1180, y: 812 };
  const wid = M.widgets || { x: 720, y: 330 };
  // arrive on the widgets, then let the list drift up under the action bar
  tl.fromTo(rig, focus(wid, 1.02, { x: 960, y: 540 }), Object.assign({ duration: 2.2, ease: 'sine.inOut' }, REST), 0);
  tl.fromTo(['.f05-st .aix-hero', '.f05-st .aix-rv-grid'], { y: 0 }, { y: -170, duration: 2.6, ease: 'power2.inOut' }, 0.5);
  tl.fromTo('.f05-st .aix-widget', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.08 }, 0.05);
  superIn(0.15, q('#f05-t'));
  cursorAt(0, { x: 900, y: 640 });
  move(1.2, edit, 1.2);
  click(2.55, edit, q('.f05-st .aix-actionbar .aix-btn--tinted'));
  window.__timelines[ID] = tl;
</script>
</template>
