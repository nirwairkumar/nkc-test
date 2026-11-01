<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f15-st { height: 800px; overflow: hidden; background: #f8fafc; }
  #f15-toast { position: absolute; right: 24px; bottom: 24px; z-index: 30; }
</style>
<!--@measure {"card": ".f15-s0 section", "menu": ".f15-s0 #le-menu", "getcode": ".f15-s1 #le-getcode", "join": ".f15-s2 #le-join"}-->
<div id="root" data-composition-id="f15-joincode" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f15-t1" class="tz-super">No link? <em>Use a join code.</em></div>
    <div id="f15-t2" class="tz-super">Six digits. <em>One board.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/my-tests-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f15-st f15-s0"><!--@ssr:live-2--></div>
            <div class="tz-state f15-st f15-s1"><!--@ssr:live-3--></div>
            <div class="tz-state f15-st f15-s2"><!--@ssr:live-4--></div>
          </div>
          <div id="f15-toast"><!--@ssr:toast-code--></div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f15-joincode';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const S = [q('.f15-s0'), q('.f15-s1'), q('.f15-s2')];
  const card = M.card || { x: 720, y: 388 }, menu = M.menu || { x: 1240, y: 300 };
  const getcode = M.getcode || { x: 1150, y: 470 }, join = M.join || { x: 720, y: 560 };
  only(0, S[0], S);
  tl.fromTo(rig, focus(card, 1.0, { x: 960, y: 560 }), Object.assign(focus({ x: menu.x - 220, y: menu.y + 120 }, 1.2, { x: 960, y: 560 }), { duration: 1.6, ease: 'sine.inOut' }), 0);
  const T1 = q('#f15-t1'), T2 = q('#f15-t2');
  tl.set(T2, { autoAlpha: 0 }, 0);
  superIn(0.15, T1);

  // ••• → Get a join code
  cursorAt(0, { x: card.x, y: card.y + 120 });
  move(0.2, menu, 0.75);
  click(1.0, menu, q('.f15-s0 #le-menu'));
  only(1.1, S[1], S);
  tl.fromTo('.f15-s1 #le-dropdown', { opacity: 0, scale: 0.96, y: -6 }, { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out', transformOrigin: '100% 0%' }, 1.1);
  move(1.35, getcode, 0.6);
  tl.fromTo('.f15-s1 #le-getcode', { backgroundColor: 'rgba(241,245,249,0)' }, { backgroundColor: 'rgba(241,245,249,1)', duration: 0.15 }, 1.75);
  click(2.05, getcode);

  // the code lands on the live card, and the toast says where candidates type it
  only(2.2, S[2], S);
  tl.fromTo('.f15-s2 #le-join', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 2.2);
  tl.fromTo('.f15-s2 #le-code', { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(2.5)', transformOrigin: '0% 50%' }, 2.3);
  tl.fromTo('#f15-toast', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 2.3);
  tl.set(CUR, { autoAlpha: 0 }, 2.6);
  cam(2.4, focus({ x: join.x + 120, y: join.y + 90 }, 1.15, { x: 960, y: 600 }), 1.8);
  superOut(3.1, T1);
  superIn(3.1, T2, 0.1);
  window.__timelines[ID] = tl;
</script>
</template>
