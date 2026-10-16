<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f06-st { height: 800px; overflow: hidden; background: #f8fafc; }
  /* the save bar is sticky in the app: pin it to the bottom of the window */
  .f06-st #b-savebar { position: absolute; left: 50%; bottom: 12px; width: 896px; margin-left: -448px; padding: 0 32px; z-index: 5; }
</style>
<!--@measure {"add0": ".f06-s0 #b-add", "add1": ".f06-s1 #b-add", "new1": ".f06-s1 #b-new", "text": ".f06-s2 #b-new .latex-renderer-container", "optC": ".f06-s2 #b-new li:nth-child(3) > button", "save": ".f06-s3 #b-save"}-->
<div id="root" data-composition-id="f06-builder" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f06-t1" class="tz-super">Add your own <em>in seconds.</em></div>
    <div id="f06-t2" class="tz-super">Save. <em>Done.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/create-test-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f06-st f06-s0"><!--@ssr:builder-0--></div>
            <div class="tz-state f06-st f06-s1"><!--@ssr:builder-1--></div>
            <div class="tz-state f06-st f06-s2"><!--@ssr:builder-2--></div>
            <div class="tz-state f06-st f06-s3"><!--@ssr:builder-3--></div>
          </div>
        </div>
        <!--@cursor-->
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f06-builder';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const S = [0, 1, 2, 3].map((i) => q('.f06-s' + i));
  const P = (k, d) => M[k] || d;
  const add0 = P('add0', { x: 720, y: 760, b: 790 }), add1 = P('add1', { x: 720, y: 1090, b: 1120 });
  const new1 = P('new1', { x: 720, y: 900, t: 760, b: 1060 }), optC = P('optC', { x: 400, y: 1000 }), save = P('save', { x: 1080, y: 790 });
  // scroll: the add button sits above the save bar, then the new question is brought into view
  const OFF0 = Math.max(0, add0.b + 100 - 844), OFF1 = Math.max(0, new1.b + 150 - 844);
  const secs = (s) => s.querySelector('section');

  only(0, S[0], S);
  tl.set(secs(S[0]), { y: -OFF0 }, 0);
  tl.fromTo(rig, focus({ x: add0.x, y: add0.y - OFF0 - 120 }, 0.9, { x: 960, y: 560 }),
    Object.assign(focus({ x: add0.x, y: add0.y - OFF0 - 120 }, 0.94, { x: 960, y: 560 }), { duration: 1.3, ease: 'sine.inOut' }), 0);
  superIn(0.15, q('#f06-t1'));
  cursorAt(0, { x: 980, y: 260 });
  move(0.15, { x: add0.x - 40, y: add0.y - OFF0 }, 0.85);
  click(1.05, { x: add0.x - 40, y: add0.y - OFF0 }, S[0].querySelector('#b-add'));

  // a blank Question 31 slides in and the page follows it
  only(1.3, S[1], S);
  tl.set(secs(S[1]), { y: -OFF0 }, 1.3);
  tl.to(secs(S[1]), { y: -OFF1, duration: 0.7, ease: 'power3.out' }, 1.32);
  tl.fromTo('.f06-s1 #b-new', { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out' }, 1.3);
  cam(1.35, focus({ x: new1.x, y: (new1.t + new1.b) / 2 - OFF1 }, 1.08, { x: 960, y: 590 }), 1.0);
  move(1.5, { x: new1.x - 200, y: new1.t - OFF1 + 120 }, 0.6);

  // typing: the question, word by word (formulas land whole), then the options
  only(2.1, S[2], S);
  tl.set(secs(S[2]), { y: -OFF1 }, 2.1);
  const qText = q('.f06-s2 #b-new .latex-renderer-container > span');
  if (qText) {
    const words = split(qText);
    tl.fromTo(words, { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 1.1 / words.length, ease: 'none' }, 2.1);
  }
  const opts = qa('.f06-s2 #b-new li .latex-renderer-container');
  tl.fromTo(opts, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power2.out', stagger: 0.16 }, 3.25);

  // mark C as correct
  move(3.3, { x: optC.x, y: optC.y - OFF1 }, 0.6);
  click(4.0, { x: optC.x, y: optC.y - OFF1 }, q('.f06-s2 #b-new li:nth-child(3) > button'));
  only(4.08, S[3], S);
  tl.set(secs(S[3]), { y: -OFF1 }, 4.08);

  // save
  cam(4.2, focus({ x: save.x - 300, y: save.y - 120 }, 0.98, { x: 960, y: 600 }), 1.0);
  move(4.35, save, 0.9);
  click(5.45, save, q('.f06-s3 #b-save'));
  superOut(4.4, q('#f06-t1'));
  tl.set('#f06-t2', { autoAlpha: 0 }, 0);
  superIn(4.4, q('#f06-t2'), 0.14);
  window.__timelines[ID] = tl;
</script>
</template>
