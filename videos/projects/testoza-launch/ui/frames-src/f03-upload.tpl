<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f03-file {
    position: absolute; left: 0; top: 0; z-index: 40; width: 300px;
    display: flex; align-items: center; gap: 12px; padding: 10px 14px 10px 10px;
    border-radius: 16px; background: #fff;
    box-shadow: 0 24px 60px -18px rgba(15, 23, 42, 0.55), 0 0 0 1px rgba(15, 23, 42, 0.06);
    font-family: 'Mukta', sans-serif;
  }
  #f03-file i { width: 44px; height: 54px; border-radius: 8px; background: #f43f5e; position: relative; flex: none; }
  #f03-file i::after { content: 'PDF'; position: absolute; left: 0; right: 0; bottom: 7px; text-align: center; font: 800 11px/1 'Outfit', sans-serif; color: #fff; letter-spacing: 0.04em; }
  #f03-file b { display: block; font-weight: 600; font-size: 14px; color: #0f172a; line-height: 1.2; }
  #f03-file span { display: block; font-size: 12px; color: #64748b; }
</style>
<!--@measure {"choose": ".f03-a #s1-choose", "card": ".f03-a #s1-upload", "file": ".f03-b #s2-file", "extract": ".f03-b #s2-extract-btn", "extractCard": ".f03-b #s2-extract"}-->
<div id="root" data-composition-id="f03-upload" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f03-t" class="tz-super">Drop in <em>any paper.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/generate-with-ai-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f03-a"><!--@ssr:upload-1--></div>
            <div class="tz-state f03-b"><div id="f03-scroll"><!--@ssr:upload-2--></div></div>
          </div>
        </div>
        <div id="f03-file"><i></i><div><b>JEE_Main_Physics_Mock_01.pdf</b><span>PDF · 6 pages · 2.4 MB</span></div></div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f03-upload';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig'), A = q('.f03-a'), B = q('.f03-b');
  const P = (k, d) => M[k] || d;
  const choose = P('choose', { x: 720, y: 360 }), card = P('card', { x: 720, y: 300 });
  const file = P('file', { x: 560, y: 120 }), ext = P('extract', { x: 560, y: 1030 }), extCard = P('extractCard', { x: 560, y: 900 });
  const SCROLL = Math.max(0, ext.y + 60 - 800);

  tl.set(rig, REST, 0);
  only(0, A, [A, B]);
  superIn(0.15, q('#f03-t'));
  cursorAt(0, { x: 470, y: 480 });
  move(0.25, choose, 0.9);
  click(1.2, choose, q('.f03-a #s1-choose'));

  // the paper arrives from outside the window and drops into the upload card
  tl.fromTo('#f03-file', { x: -340, y: 120, rotation: -9, scale: 1.08, opacity: 1 },
    { x: card.x - 150, y: card.y - 40, rotation: 0, scale: 1, duration: 0.8, ease: 'expo.out' }, 1.35);
  tl.to('#f03-file', { scale: 0.55, opacity: 0, duration: 0.3, ease: 'power2.in' }, 2.2);
  cam(1.3, focus({ x: 720, y: 330 }, 0.9, { x: 960, y: 560 }), 1.1);

  // page updates: the selected file, then the two modes
  only(2.45, B, [A, B]);
  tl.fromTo('.f03-b #s2-file', { boxShadow: '0 0 0 0 rgba(0,122,255,0)' }, { boxShadow: '0 0 0 4px rgba(0,122,255,0.28)', duration: 0.4, ease: 'power2.out' }, 2.5);
  tl.fromTo('#f03-scroll', { y: 0 }, { y: -SCROLL, duration: 1.0, ease: 'power3.inOut' }, 3.0);
  cam(3.0, focus({ x: extCard.x, y: extCard.y - SCROLL }, 1.12, { x: 960, y: 590 }), 1.3);
  move(2.6, { x: file.x + 120, y: file.y + 40 }, 0.5);
  move(3.35, { x: ext.x + 40, y: ext.y - SCROLL + 4 }, 0.9);
  click(4.35, { x: ext.x + 40, y: ext.y - SCROLL + 4 }, q('.f03-b #s2-extract-btn'));
  tl.fromTo('.f03-b #s2-extract', { boxShadow: '0 0 0 0 rgba(37,99,235,0)' },
    { boxShadow: '0 0 0 5px rgba(37,99,235,0.35), 0 24px 50px -20px rgba(37,99,235,0.6)', duration: 0.45, ease: 'power2.out' }, 4.35);
  window.__timelines[ID] = tl;
</script>
</template>
