<template>
<!--@head-->
<style>
  #root { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden; }
  #f11-ph { left: 470px; top: 98px; }
  .f11-side { position: absolute; left: 1060px; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 96px; letter-spacing: -0.04em; line-height: 1; color: #f8fafc; white-space: nowrap; }
  .f11-side em { font-style: normal; background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; background-clip: text; color: transparent; }
  /* WhatsApp (iOS) */
  .wa { position: absolute; inset: 0; background: #efe7de; font-family: 'Mukta', sans-serif; display: flex; flex-direction: column; }
  .wa-head { height: 60px; flex: none; display: flex; align-items: center; gap: 10px; padding: 0 12px; background: #f6f6f6; border-bottom: 1px solid #d1d1d6; }
  .wa-back { color: #007aff; font-size: 17px; display: flex; align-items: center; gap: 2px; }
  .wa-av { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: #fff; font: 700 14px/38px 'Outfit', sans-serif; text-align: center; flex: none; }
  .wa-name { font-size: 16px; font-weight: 600; color: #0b0f17; line-height: 1.15; }
  .wa-sub { font-size: 12px; color: #6b7280; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 190px; }
  .wa-icons { margin-left: auto; display: flex; gap: 18px; color: #007aff; }
  .wa-chat { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; padding: 10px 10px 8px; overflow: hidden; }
  .wa-day { align-self: center; font-size: 12px; color: #54656f; background: #fff; border-radius: 8px; padding: 3px 10px; box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13); margin-bottom: 4px; }
  .wa-msg { position: relative; max-width: 300px; padding: 6px 8px 7px; border-radius: 9px; font-size: 15px; line-height: 1.35; color: #111b21; box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13); }
  .wa-in { align-self: flex-start; background: #fff; border-top-left-radius: 2px; }
  .wa-out { align-self: flex-end; background: #d9fdd3; border-top-right-radius: 2px; }
  .wa-from { font-size: 13px; font-weight: 600; color: #c4307a; margin-bottom: 1px; }
  .wa-time { float: right; margin: 6px 0 -4px 10px; font-size: 11px; color: #667781; display: inline-flex; align-items: center; gap: 2px; }
  .wa-card { margin: 2px 0 6px; border-radius: 7px; overflow: hidden; background: #f0f2f5; }
  .wa-card img { display: block; width: 284px; height: 149px; object-fit: cover; }
  .wa-card div { padding: 6px 8px 8px; }
  .wa-card b { display: block; font-size: 14px; font-weight: 600; line-height: 1.25; }
  .wa-card small { display: block; font-size: 12px; color: #667781; margin-top: 2px; }
  .wa-link { color: #027eb5; text-decoration: underline; border-radius: 3px; }
  .wa-bar { height: 58px; flex: none; display: flex; align-items: center; gap: 10px; padding: 0 10px 8px; background: #f6f6f6; border-top: 1px solid #d1d1d6; color: #007aff; }
  .wa-field { flex: 1; height: 36px; border-radius: 18px; background: #fff; border: 1px solid #d1d1d6; font-size: 15px; color: #8e8e93; display: flex; align-items: center; padding: 0 12px; }
  /* Safari */
  .sf { position: absolute; inset: 0; background: #f8fafc; overflow: hidden; }
  .sf-page { position: absolute; left: 0; right: 0; top: 0; bottom: 74px; overflow: hidden; }
  .sf-page > div { height: 100%; }
  .sf-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 74px; background: rgba(242, 242, 247, 0.96); border-top: 1px solid #d1d1d6; display: flex; align-items: flex-start; justify-content: center; padding-top: 10px; }
  .sf-url { width: 340px; height: 40px; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); display: flex; align-items: center; justify-content: center; gap: 6px; font: 500 16px/1 'Mukta', sans-serif; color: #111; }
  .f11-tap { position: absolute; left: 0; top: 0; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; background: rgba(15, 23, 42, 0.22); border: 2px solid rgba(255, 255, 255, 0.9); z-index: 40; opacity: 0; }
</style>
<!--@measure {"link": ["#f11-link", "#f11-screen"], "start": ["#f11-sf #pg-start", "#f11-screen"]}-->
<div id="root" data-composition-id="f11-whatsapp" data-width="1920" data-height="1080">
  <div class="tz-film">
    <div class="clip tz-stage" data-start="0" data-duration="__DUR__" data-track-index="0"></div>
    <div id="f11-a" class="f11-side" style="top: 330px">No app.</div>
    <div id="f11-b" class="f11-side" style="top: 450px">No sign-up.</div>
    <div id="f11-c" class="f11-side" style="top: 570px"><em>Just the link.</em></div>
    <div id="f11-ph" class="tz-phone">
      <div id="f11-screen" class="tz-phone-screen">
        <div class="tz-phone-status"><span>10:02</span><span><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#0b0f17" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#0b0f17" /><rect x="10" y="3" width="3" height="9" rx="1" fill="#0b0f17" /><rect x="15" y="0" width="3" height="12" rx="1" fill="#0b0f17" /></svg><svg width="26" height="12" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#0b0f17" stroke-opacity="0.4" fill="none" /><rect x="2" y="2" width="16" height="9" rx="2" fill="#0b0f17" /></svg></span></div>
        <div class="tz-island"></div>
        <div class="tz-phone-body">
          <div class="wa">
            <div class="wa-head">
              <div class="wa-back"><svg width="12" height="20" viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" stroke="#007aff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>12</div>
              <div class="wa-av">JB</div>
              <div><div class="wa-name">JEE 2026 · Batch A</div><div class="wa-sub">Prof. Rajesh Kumar, Ananya, Rohan, +38</div></div>
              <div class="wa-icons">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.8"><rect x="2" y="6" width="14" height="12" rx="3" /><path d="m16 10 6-3v10l-6-3" /></svg>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
              </div>
            </div>
            <div class="wa-chat">
              <div class="wa-day">Today</div>
              <div class="wa-msg wa-in"><div class="wa-from">Prof. Rajesh Kumar</div>Good morning everyone! Physics mock test at 10. Be on time 📚<span class="wa-time">9:41</span></div>
              <div class="wa-msg wa-out">Ready sir 👍<span class="wa-time">9:44 <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="#53bdeb" stroke-width="1.6"><path d="m1 6 3 3 6-7M6 9l1 0 6-7" /></svg></span></div>
              <div id="f11-new" class="wa-msg wa-in">
                <div class="wa-from">Prof. Rajesh Kumar</div>
                <div class="wa-card"><img src="assets/og.png" alt=""><div><b>JEE Main 2026 · Physics Mock Test 01</b><small>testoza.com</small></div></div>
                📝 <b>JEE Main 2026 · Physics Mock Test 01</b><br>31 questions · 60 min<br><br>Open this link to start:<br><span id="f11-link" class="wa-link">https://testoza.com/test/jee-phy-mock-7k2q</span><br><br>No app and no account needed — just type your name.<br><br>Conducted on TestoZa<span class="wa-time">10:02</span>
              </div>
            </div>
            <div class="wa-bar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
              <div class="wa-field">Message</div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.8"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.8"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" /></svg>
            </div>
          </div>
          <div id="f11-sf" class="sf">
            <div class="sf-page"><!--@ssr:phone-gateway--></div>
            <div class="sf-bar"><div class="sf-url"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" stroke-width="2.6"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>testoza.com</div></div>
          </div>
        </div>
        <div class="tz-home"></div>
        <div id="f11-tap" class="f11-tap"></div>
      </div>
    </div>
  </div>
</div>
<script>
  const ID = 'f11-whatsapp';
  /*@helpers*/
  /*@M*/
  const ph = q('#f11-ph');
  const link = M.link || { x: 190, y: 560 }, start = M.start || { x: 195, y: 640 };
  const tap = (t, p) => {
    tl.fromTo('#f11-tap', { x: p.x, y: p.y, scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.12, ease: 'power2.out', immediateRender: false }, t);
    tl.to('#f11-tap', { scale: 1.5, opacity: 0, duration: 0.35, ease: 'power2.out' }, t + 0.14);
  };
  tl.set('#f11-tap', { opacity: 0 }, 0);
  // the phone comes up out of the classroom shot
  tl.fromTo(ph, { y: 120, scale: 1.12, rotation: -2 }, { y: 0, scale: 0.94, rotation: 0, duration: 1.1, ease: 'expo.out' }, 0);
  // the invite pops into the chat
  tl.fromTo('#f11-new', { opacity: 0, y: 40, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)', transformOrigin: '0% 100%' }, 0.35);
  tl.fromTo('.wa-chat > :not(#f11-new)', { y: 40 }, { y: 0, duration: 0.45, ease: 'back.out(1.7)' }, 0.35);
  tl.set(['#f11-a', '#f11-b', '#f11-c'], { autoAlpha: 0 }, 0);
  superIn(0.6, q('#f11-a'));
  superIn(1.3, q('#f11-b'));
  superIn(2.1, q('#f11-c'));

  // tap the link → the browser opens the exam gateway
  tl.fromTo('#f11-link', { backgroundColor: 'rgba(2,126,181,0)' }, { backgroundColor: 'rgba(2,126,181,0.18)', duration: 0.1 }, 1.75);
  tap(1.7, { x: link.x, y: link.y });
  tl.fromTo('#f11-sf', { y: 844 }, { y: 0, duration: 0.5, ease: 'power3.out' }, 2.0);
  tl.fromTo('#f11-sf #pg-start', { scale: 1 }, { scale: 1.03, duration: 0.35, ease: 'sine.inOut' }, 3.0);
  tl.to('#f11-sf #pg-start', { scale: 1, duration: 0.3, ease: 'sine.inOut' }, 3.35);
  tap(3.95, { x: start.x, y: start.y });
  press(3.95, q('#f11-sf #pg-start'), 0.96);
  tl.to(ph, { scale: 1.0, duration: 1.0, ease: 'power2.inOut' }, 3.7);
  window.__timelines[ID] = tl;
</script>
</template>
