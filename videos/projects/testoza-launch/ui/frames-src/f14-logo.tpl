<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f14-st { height: 800px; overflow: hidden; background: #f8fafc; }
  #f14-sheet { position: absolute; right: 0; top: 0; height: 800px; z-index: 20; }
  #f14-shade { position: absolute; inset: 0; z-index: 12; background: radial-gradient(ellipse at 50% 48%, rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.92) 70%); }
  #f14-logo {
    position: absolute; z-index: 31; left: 0; right: 0; top: 330px; text-align: center; white-space: nowrap;
    font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 210px; line-height: 1; letter-spacing: -0.02em;
  }
  #f14-logo .c { display: inline-block; color: #38bdf8; }
  #f14-logo .z {
    display: inline-block; font-size: 1.26em; font-weight: 900; margin: 0 0.02em;
    background: linear-gradient(180deg, #ffe885, #f4b838 55%, #9e6400);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 18px rgba(244, 184, 56, 0.55));
  }
  #f14-tag { position: absolute; z-index: 31; left: 0; right: 0; top: 640px; text-align: center; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 52px; letter-spacing: -0.02em; color: #e2e8f0; }
  #f14-tag em { font-style: normal; background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; background-clip: text; color: transparent; }
  #f14-url {
    position: absolute; z-index: 31; left: 50%; top: 752px; width: 300px; margin-left: -150px; height: 64px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font: 600 30px/1 'Mukta', sans-serif; color: #f8fafc;
    background: rgba(15, 23, 42, 0.7); box-shadow: 0 0 0 1.5px rgba(56, 189, 248, 0.55), 0 20px 50px -20px rgba(56, 189, 248, 0.6);
  }
  #f14-flare { position: absolute; z-index: 13; left: 50%; top: 420px; width: 900px; height: 900px; margin: -450px 0 0 -450px; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(244, 184, 56, 0.35), rgba(56, 189, 248, 0.12) 50%, transparent); }
</style>
<div id="root" data-composition-id="f14-logo" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/my-tests-->
        <div class="tz-view">
          <div class="tz-page"><div class="tz-state f14-st"><!--@ssr:live-2--></div></div>
          <div class="tz-dim" style="opacity:1"></div>
          <div id="f14-sheet"><!--@ssr:results--></div>
        </div>
      </div>
    </div>
    <div id="f14-shade"></div>
    <div id="f14-flare"></div>
    <div id="f14-logo"><span class="c">T</span><span class="c">e</span><span class="c">s</span><span class="c">t</span><span class="c">o</span><span class="z">Z</span><span class="c">a</span></div>
    <div id="f14-tag">Paper to proctored exam. <em>In minutes.</em></div>
    <div id="f14-url"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>testoza.com</div>
  </div>
</div>
<script>
  const ID = 'f14-logo';
  /*@helpers*/
  const rig = q('.tz-rig');
  // the product keeps moving behind the mark
  tl.fromTo(rig, { scale: 1.0, x: 0, y: 0, filter: 'blur(0px)' }, { scale: 0.7, x: 0, y: 70, filter: 'blur(14px)', duration: 5.0, ease: 'power2.out' }, 0);
  tl.fromTo('#f14-shade', { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0);
  tl.fromTo('#f14-flare', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, 0.95);
  tl.to('#f14-flare', { opacity: 0.7, scale: 1.08, duration: 2.6, ease: 'sine.inOut' }, 2.35);

  const letters = qa('#f14-logo .c');
  tl.fromTo(letters, { y: 90, opacity: 0, filter: 'blur(16px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.85, ease: 'expo.out', stagger: 0.06 }, 0.45);
  tl.fromTo('#f14-logo .z', { y: -260, rotation: -18, scale: 1.6, opacity: 0 }, { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.6)' }, 0.9);
  tl.fromTo('#f14-logo', { scale: 1 }, { scale: 1.035, duration: 3.6, ease: 'sine.inOut' }, 1.4);
  superIn(1.75, q('#f14-tag'), 0.09);
  tl.fromTo('#f14-url', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 2.5);
  window.__timelines[ID] = tl;
</script>
</template>
