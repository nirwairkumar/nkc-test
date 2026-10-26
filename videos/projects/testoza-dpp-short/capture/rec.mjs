// Shared recorder for the real phone runs: iPhone 13 viewport, saved login (TZ_STATE), CDP screencast
// frames with timestamps, a touch dot at every tap, and an event log. Each run script imports start().
import { chromium, devices } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

export async function start(outDir) {
  mkdirSync(outDir + 'frames', { recursive: true });
  const browser = await chromium.launch();
  // Chrome's screencast sends CSS-pixel frames, so a dpr-2 phone comes out 390 px wide. Instead the
  // "device" is 780×1328 and the app's viewport meta is rewritten to width=390 at scale 2: the page
  // lays out exactly as on a 390-wide phone and is drawn at 2×. Screen = viewport, so the exam's
  // fullscreen request can't change the frame size.
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 780, height: 1328 }, screen: { width: 780, height: 1328 }, deviceScaleFactor: 1, storageState: process.env.TZ_STATE });
  await ctx.addInitScript(() => {
    const fix = () => { const m = document.querySelector('meta[name=viewport]'); if (m && !/width=390/.test(m.content)) m.setAttribute('content', 'width=390, initial-scale=2, maximum-scale=2, user-scalable=no'); };
    document.addEventListener('DOMContentLoaded', fix);
    new MutationObserver(fix).observe(document, { childList: true, subtree: true });
    // like Safari on an iPhone: no full-screen API for web pages (TestPage skips full screen then)
    for (const k of ['fullscreenEnabled', 'webkitFullscreenEnabled']) Object.defineProperty(Document.prototype, k, { get: () => false, configurable: true });
    delete Element.prototype.requestFullscreen;
    delete Element.prototype.webkitRequestFullscreen;
  });
  // the creator tour and "How it works" strip are already dismissed (this user has seen them)
  await ctx.addInitScript(() => {
    try {
      const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
      const id = k && JSON.parse(localStorage.getItem(k)).user.id;
      if (id) localStorage.setItem(`creator_dashboard_tour_completed_${id}`, 'true');
      localStorage.setItem('testoza_mytests_guide_dismissed', 'true');
    } catch (e) { /* no login yet */ }
  });
  // touch dot, drawn by the page itself so it is in the footage
  await ctx.addInitScript(() => {
    addEventListener('pointerdown', (e) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;z-index:2147483647;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(15,23,42,.28);border:2px solid rgba(255,255,255,.9);pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.25)`;
      document.documentElement.appendChild(d);
      d.animate([{ transform: 'scale(.6)', opacity: 1 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => d.remove();
    }, true);
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  const t0 = Date.now();
  let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const name = String(n++).padStart(5, '0') + '.jpg';
    writeFileSync(outDir + 'frames/' + name, Buffer.from(data, 'base64'));
    frames.push({ name, ts: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const log = [];
  const now = () => +((Date.now() - t0) / 1000).toFixed(3);
  const mark = (ev, extra) => { const e = { t: now(), wall: Date.now() / 1000, ev, ...extra }; log.push(e); console.log(e.t, ev, extra ? JSON.stringify(extra) : ''); };
  const wait = (ms) => page.waitForTimeout(ms);
  async function rec() { await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688 }); mark('rec'); }
  /* eased scroll by dy px over ms, like a thumb flick */
  async function scrollBy(dy, ms = 900) {
    mark('scroll', { dy });
    await page.evaluate(([dy, ms]) => new Promise((res) => {
      const y0 = scrollY, s = performance.now();
      const f = (t) => { const k = Math.min(1, (t - s) / ms); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; scrollTo(0, y0 + dy * e); k < 1 ? requestAnimationFrame(f) : res(); };
      requestAnimationFrame(f);
    }), [dy, ms]);
  }
  /* bring an element to ~top+offset of the viewport with an eased scroll */
  async function scrollTo(loc, offset = 160, ms = 900) {
    const y = await loc.evaluate((el) => el.getBoundingClientRect().top);
    if (Math.abs(y - offset) > 8) await scrollBy(y - offset, ms);
  }
  async function tap(loc, label) {
    const b = await loc.boundingBox();
    mark('tap', { label, x: b && Math.round(b.x + b.width / 2), y: b && Math.round(b.y + b.height / 2) });
    await loc.tap();
  }
  async function dump(tag) {
    const btns = await page.locator('button:visible, a:visible').evaluateAll((els) => els.map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 80));
    writeFileSync(outDir + `dump-${tag}.txt`, page.url() + '\n\nBUTTONS: ' + btns.join(' | ') + '\n\n' + (await page.locator('body').innerText().catch(() => '')));
    await page.screenshot({ path: outDir + `dump-${tag}.png` });
  }
  async function finish() {
    await cdp.send('Page.stopScreencast').catch(() => {});
    writeFileSync(outDir + 'log.json', JSON.stringify({ t0: t0 / 1000, frames, log }, null, 1));
    await browser.close();
  }
  return { page, ctx, mark, wait, rec, scrollBy, scrollTo, tap, dump, finish, now };
}
