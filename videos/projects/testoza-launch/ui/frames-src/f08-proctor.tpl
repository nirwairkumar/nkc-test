<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f08-st { height: 800px; overflow: hidden; background: #f8fafc; }
  #f08-panel { position: absolute; left: 270px; top: 70px; z-index: 20; }
  #f08-panel #sp-violations { overflow: hidden; }
  #f08-toast { position: absolute; right: 24px; bottom: 24px; z-index: 30; }
</style>
<!--@measure {"card": ".f08-s0 section", "settings": ".f08-s0 #le-settings", "full": "#f08-panel #sp-fullscreen", "tab": "#f08-panel #sp-tabswitch", "viol": "#f08-panel #sp-violations", "save": "#f08-panel #sp-save", "panel": "#f08-panel", "pill": ".f08-s0 #le-anticheat"}-->
<div id="root" data-composition-id="f08-proctor" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f08-t1" class="tz-super">Live <em>in one click.</em></div>
    <div id="f08-t2" class="tz-super">Anti-cheating, <em>built in.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/my-tests-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f08-st f08-s0"><!--@ssr:live-0--></div>
            <div class="tz-state f08-st f08-s1"><!--@ssr:live-1--></div>
          </div>
          <div class="tz-dim" id="f08-dim"></div>
          <div id="f08-panel"><!--@ssr:settings--></div>
          <div id="f08-toast"><!--@ssr:toast-saved--></div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f08-proctor';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const S = [q('.f08-s0'), q('.f08-s1')];
  const P = (k, d) => M[k] || d;
  const card = P('card', { x: 720, y: 330 }), settings = P('settings', { x: 330, y: 470 }), pill = P('pill', { x: 640, y: 470 });
  const full = P('full', { x: 1100, y: 330 }), tab = P('tab', { x: 1100, y: 410 }), viol = P('viol', { h: 150 }), save = P('save', { x: 1100, y: 700 });
  const panel = P('panel', { x: 720, y: 420 });

  only(0, S[0], S);
  // the exam is live: the green dot keeps breathing
  qa('#le-ping').forEach((p) => [0, 1.1, 2.2, 6.0, 7.1].forEach((t) => tl.fromTo(p, { scale: 1, opacity: 0.75 }, { scale: 2.4, opacity: 0, duration: 1.0, ease: 'power1.out', immediateRender: false }, t)));
  tl.fromTo(rig, focus(card, 0.92, { x: 960, y: 520 }), Object.assign(focus(card, 1.0, { x: 960, y: 560 }), { duration: 1.8, ease: 'sine.inOut' }), 0);
  const T1 = q('#f08-t1'), T2 = q('#f08-t2');
  tl.set(T2, { autoAlpha: 0 }, 0);
  superIn(0.15, T1);
  tl.fromTo('.f08-s0 #le-anticheat', { scale: 1 }, { scale: 1.06, duration: 0.3, ease: 'power2.out' }, 1.0);
  tl.to('.f08-s0 #le-anticheat', { scale: 1, duration: 0.4, ease: 'power2.inOut' }, 1.3);

  cursorAt(0, { x: 1000, y: 720 });
  move(0.6, settings, 1.0);
  click(1.75, settings, q('.f08-s0 #le-settings'));

  // Test Environment Settings
  superOut(1.95, T1);
  superIn(1.95, T2);
  tl.fromTo('#f08-dim', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.95);
  tl.fromTo('#f08-panel', { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }, 1.95);
  tl.fromTo('#f08-panel #sp-violations', { height: 0, opacity: 0 }, { height: 0, opacity: 0, duration: 0.01 }, 0);
  cam(2.0, focus(panel, 1.16, { x: 960, y: 600 }), 1.0);

  const on = (t, id) => {
    tl.to('#f08-panel ' + id + ' .tz-switch-on', { opacity: 1, duration: 0.2, ease: 'power1.out' }, t);
    tl.to('#f08-panel ' + id + ' .tz-switch-thumb', { x: 20, duration: 0.25, ease: 'back.out(2)' }, t);
  };
  move(2.35, full, 0.6);
  click(3.0, full);
  on(3.02, '#sp-fullscreen');
  tl.to('#f08-panel #sp-violations', { height: viol.b - viol.t, opacity: 1, duration: 0.45, ease: 'power3.out' }, 3.1);
  move(3.25, tab, 0.45);
  click(3.75, tab);
  on(3.77, '#sp-tabswitch');

  // save, the toast, back to the card with anti-cheating on
  const saveY = save.y + (viol.b - viol.t) * 0;
  move(4.15, { x: save.x, y: saveY }, 0.8);
  click(5.05, { x: save.x, y: saveY }, q('#f08-panel #sp-save'));
  tl.to('#f08-panel', { opacity: 0, scale: 0.97, y: 20, duration: 0.3, ease: 'power2.in' }, 5.3);
  tl.to('#f08-dim', { opacity: 0, duration: 0.3 }, 5.3);
  only(5.55, S[1], S);
  tl.fromTo('#f08-toast', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 5.4);
  cam(5.5, focus(card, 1.02, { x: 960, y: 560 }), 1.4);
  move(5.6, { x: card.x + 200, y: card.y + 40 }, 1.2);
  window.__timelines[ID] = tl;
</script>
</template>
