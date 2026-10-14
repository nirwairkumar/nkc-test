<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .f04b-st .aix-page { min-height: 800px; }
  .f04b-st .aix-spin { display: inline-block; }
  /* status cards come from the five snapshots; the live feed is drawn once, by the last one */
  .f04b-s0 .aix-feed, .f04b-s1 .aix-feed, .f04b-s2 .aix-feed, .f04b-s3 .aix-feed { visibility: hidden; }
  .f04b-s4 .aix-page { background: transparent; }
  .f04b-s4 .aix-feed-head { position: relative; z-index: 2; background: var(--bg, #f2f2f7); }
</style>
<!--@measure {"cards": {"all": ".f04b-s4 .aix-fq"}, "end4": ".f04b-s4 .aix-feed-list > div", "end5": ".f04b-s5 .aix-done", "feed": ".f04b-s4 .aix-feed"}-->
<div id="root" data-composition-id="f04b-extract" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f04b-t1" class="tz-super">AI reads <em>every question.</em></div>
    <div id="f04b-t2" class="tz-super">Options. Answers. <em>Diagrams.</em></div>
    <div id="f04b-t3" class="tz-super">30 questions in <em>1:14.</em></div>
    <div class="tz-rig">
      <div class="tz-win">
        <!--@chrome:testoza.com/generate-with-ai-->
        <div class="tz-view">
          <div class="tz-page">
            <div class="tz-state f04b-st f04b-s0"><!--@ssr:processing-slow-0--></div>
            <div class="tz-state f04b-st f04b-s1"><!--@ssr:processing-slow-1--></div>
            <div class="tz-state f04b-st f04b-s2"><!--@ssr:processing-slow-2--></div>
            <div class="tz-state f04b-st f04b-s3"><!--@ssr:processing-slow-3--></div>
            <div class="tz-state f04b-st f04b-s4"><!--@ssr:processing-slow-4--></div>
            <div class="tz-state f04b-st f04b-s5"><!--@ssr:processing-done--></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f04b-extract';
  /*@helpers*/
  /*@M*/
  const rig = q('.tz-rig');
  const S = [0, 1, 2, 3, 4, 5].map((i) => q('.f04b-s' + i));
  const statusOf = (s) => s.querySelector('.aix-status');
  const AT = [0, 1.85, 4.05, 6.25, 8.2, 8.7];   // status updates (questions found: 0, 3, 7, 11, 15)
  // cards arrive between status updates, so the count on the left matches the list
  const SEG = [[0, 3, 0.35, 1.65], [3, 7, 2.05, 3.85], [7, 11, 4.25, 6.05], [11, 15, 6.45, 8.05]];
  const T = [];
  SEG.forEach(([a, b, t0, t1]) => { for (let j = a; j < b; j++) T[j] = t0 + ((j - a + 1) * (t1 - t0)) / (b - a); });

  // status card: hard updates, as the stream reports
  tl.set(rig, REST, 0);
  [0, 1, 2, 3].forEach((k) => tl.set(S[k], { autoAlpha: k === 0 ? 1 : 0 }, 0));
  tl.set(S[4], { autoAlpha: 1 }, 0);
  tl.set(statusOf(S[4]), { autoAlpha: 0 }, 0);
  tl.set(S[5], { autoAlpha: 0 }, 0);
  [1, 2, 3].forEach((k) => { tl.set(S[k - 1], { autoAlpha: 0 }, AT[k]); tl.set(S[k], { autoAlpha: 1 }, AT[k]); });
  tl.set(S[3], { autoAlpha: 0 }, AT[4]);
  tl.set(statusOf(S[4]), { autoAlpha: 1 }, AT[4]);
  tl.set(S[4], { autoAlpha: 0 }, AT[5]);
  tl.set(S[5], { autoAlpha: 1 }, AT[5]);
  S.forEach((s, k) => s.querySelectorAll('.aix-spin').forEach((sp) => tl.fromTo(sp, { rotation: 0 }, { rotation: 2400, duration: 8.7, ease: 'none' }, 0)));

  // the live feed: each question lands, the list follows it
  const list = q('.f04b-s4 .aix-feed-list');
  const cards = Array.from(list.querySelectorAll('.aix-fq'));
  const CR = M.cards || [];
  const end4 = M.end4 || { t: 0, b: 250 };
  const gap = CR.length > 1 ? CR[1].t - CR[0].b : 12;
  const thr = end4.b - end4.t;
  const offFor = (j) => (j < 0 || !CR[j] ? 0 : Math.max(0, CR[j].b + gap + thr + 30 - 844));
  tl.set(cards, { display: 'none' }, 0);
  tl.set(list, { y: 0 }, 0);
  cards.forEach((c, j) => {
    if (T[j] === undefined) return;
    tl.set(c, { display: 'block' }, T[j]);
    tl.fromTo(c, { opacity: 0, y: 16, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)', immediateRender: false }, T[j]);
    tl.fromTo(c, { boxShadow: '0 0 0 2px rgba(0,122,255,0.5), 0 1px 2px rgba(0,0,0,0.04), 0 10px 28px -14px rgba(15,23,42,0.2)' }, { boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), 0 10px 28px -14px rgba(15,23,42,0.2)', duration: 1.6, ease: 'power1.out', immediateRender: false }, T[j] + 0.15);
    tl.to(list, { y: -offFor(j), duration: 0.55, ease: 'power2.inOut' }, T[j]);
  });
  // the count in the header and the "Question N is on its way" card follow the list
  const count = q('.f04b-s4 .aix-count');
  const nextB = q('.f04b-s4 .aix-skel-caption b');
  const nextNum = q('.f04b-s4 .aix-skel .aix-num');
  const ticker = { v: 0 };
  const shown = (t) => T.filter((x) => x <= t + 1e-6).length;
  tl.fromTo(ticker, { v: 0 }, {
    v: 1, duration: AT[5], ease: 'none',
    onUpdate: () => {
      const n = shown(tl.time());
      if (count) count.textContent = String(n);
      if (nextB) nextB.textContent = n === 0 ? 'Waiting for the first question' : 'Question ' + (n + 1) + ' is on its way';
      if (nextNum) nextNum.textContent = String(n + 1);
    },
  }, 0);

  // complete: all 30, the seal
  const done = M.end5 || { b: 844 };
  tl.set(q('.f04b-s5 .aix-feed-list'), { y: -Math.max(0, done.b + 30 - 844) }, AT[5]);
  tl.fromTo('.f04b-s5 .aix-done', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.2)' }, AT[5] + 0.05);
  tl.fromTo('.f04b-s5 .aix-appicon', { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }, AT[5]);

  // a slow push into the feed for the whole shot
  const feedC = M.feed ? { x: M.feed.x - 140, y: 440 } : { x: 760, y: 440 };
  cam(0, focus(feedC, 0.98, { x: 960, y: 590 }), 9.8, 'sine.inOut');

  const T1 = q('#f04b-t1'), T2 = q('#f04b-t2'), T3 = q('#f04b-t3');
  tl.set([T2, T3], { autoAlpha: 0 }, 0);
  superIn(0.2, T1);
  superOut(4.1, T1);
  superIn(4.1, T2, 0.12);
  superOut(8.7, T2);
  superIn(8.7, T3);
  window.__timelines[ID] = tl;
</script>
</template>
