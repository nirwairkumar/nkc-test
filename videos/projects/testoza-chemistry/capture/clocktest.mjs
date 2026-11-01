// Do screencast frame timestamps keep pace with the wall clock? (diagnostic)
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--force-device-scale-factor=1.5'] });
const ctx = await b.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
await p.setContent('<div id="x" style="font:40px sans-serif">0</div>');
const cdp = await ctx.newCDPSession(p);
const rows = [];
cdp.on('Page.screencastFrame', ({ metadata, sessionId }) => { rows.push([Date.now() / 1000, metadata.timestamp]); cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 86, everyNthFrame: 1, maxWidth: 2304, maxHeight: 1296 });
const t0 = Date.now();
while (Date.now() - t0 < 15000) { await p.evaluate(() => { const x = document.getElementById('x'); x.textContent = String(+x.textContent + 1); }); await new Promise((r) => setTimeout(r, 100)); }
await cdp.send('Page.stopScreencast');
const [w0, s0] = rows[0], [w1, s1] = rows.at(-1);
console.log(`frames ${rows.length}; wall span ${(w1 - w0).toFixed(2)}s; frame-timestamp span ${(s1 - s0).toFixed(2)}s; offset at start ${(w0 - s0).toFixed(3)} end ${(w1 - s1).toFixed(3)}`);
await b.close();
