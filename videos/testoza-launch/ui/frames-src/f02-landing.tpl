<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f02-shot { position: absolute; left: 0; top: 0; width: 1440px; height: 810px; display: block; }
</style>
<!--@measure {"cta": "#f02-cta"}-->
<div id="root" data-composition-id="f02-landing" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f02-t" class="tz-super">This is <em>TestoZa.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com-->
        <div class="tz-view">
          <div class="tz-page">
            <img id="f02-shot" src="capture/screenshots/scroll-000.png" alt="">
            <!-- the hero's "Generate a test with AI" button, traced over the capture -->
            <div id="f02-cta" style="position:absolute;left:258px;top:412px;width:177px;height:38px;border-radius:9px"></div>
          </div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f02-landing';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  // the window rises into the room
  tl.fromTo(rig, { scale: 0.76, x: 0, y: 190, opacity: 0 }, { scale: 0.82, x: 0, y: 0, opacity: 1, duration: 1.3, ease: 'expo.out' }, 0);
  superIn(0.45, q('#f02-t'));
  // push toward the call to action while the cursor finds it
  const cta = M.cta || { x: 346, y: 475 };
  cam(1.5, focus(cta, 1.25, { x: 860, y: 600 }), 2.6, 'power2.inOut');
  cursorAt(0, { x: 1300, y: 780 });
  tl.set(CUR, { autoAlpha: 0 }, 0);
  tl.set(CUR, { autoAlpha: 1 }, 1.45);
  move(1.45, { x: cta.x + 30, y: cta.y + 6 }, 1.5, 'power3.inOut');
  click(3.2, { x: cta.x + 30, y: cta.y + 6 }, q('#f02-cta'));
  tl.fromTo('#f02-cta', { boxShadow: '0 0 0 0 rgba(56,189,248,0)' }, { boxShadow: '0 0 0 6px rgba(56,189,248,0.45)', duration: 0.3, ease: 'power2.out' }, 3.2);
  window.__timelines[ID] = tl;
</script>
</template>
