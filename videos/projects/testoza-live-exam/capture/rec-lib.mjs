// Recording kit for the live-exam tutorial.
// - Screen capture via CDP screencast (sharp JPEG frames at device scale) → mp4 with exact timing.
// - Every action writes a mark: { id, t (s since take start, at the click/appear moment), pre, box }.
//   build.mjs pins each mark to its {cue} word, so the picture never trails the voice.
// - Visible cursor (desktop) or touch ripple (phone); human-paced glides and typing.
// Credentials via TZ_EMAIL / TZ_PASSWORD env.
import { chromium, devices } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
export const REC = DIR + 'rec/';
export const APP = 'https://app.testoza.com';
export const TITLE = 'JEE Main Mini Mock';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const state = {
  path: REC + 'state.json',
  read() { return existsSync(this.path) ? JSON.parse(readFileSync(this.path, 'utf8')) : {}; },
  write(patch) { writeFileSync(this.path, JSON.stringify({ ...this.read(), ...patch }, null, 2)); },
};

const CURSOR = `
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.id = '__tz_cursor';
  c.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.3-3.4-7.6L4 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: (window.__tzX ?? -40) - 3 + 'px', top: (window.__tzY ?? -40) - 2 + 'px', zIndex: 2147483647, pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' });
  document.documentElement.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX - 3 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
  addEventListener('mousedown', (e) => {
    const r = document.createElement('div');
    Object.assign(r.style, { position: 'fixed', left: e.clientX - 20 + 'px', top: e.clientY - 20 + 'px', width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #38bdf8', background: 'rgba(56,189,248,.18)', zIndex: 2147483646, pointerEvents: 'none', transition: 'transform .5s ease-out, opacity .5s ease-out' });
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 650);
  }, true);
});`;

const TOUCH = `
addEventListener('DOMContentLoaded', () => {
  const show = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, { position: 'fixed', left: x - 22 + 'px', top: y - 22 + 'px', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(15,23,42,.28)', border: '2px solid rgba(255,255,255,.9)', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .45s ease-out, opacity .45s ease-out' });
    document.documentElement.appendChild(r);
    setTimeout(() => { r.style.transform = 'scale(1.6)'; r.style.opacity = '0'; }, 120);
    setTimeout(() => r.remove(), 650);
  };
  addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) show(t.clientX, t.clientY); }, true);
});`;

// Headless full screen jumps to an 800x600 "screen", which wrecks the layout. Emulate it instead:
// the page still gets a real fullscreenElement + fullscreenchange (so the exam's rules run), and a
// phone grows to its full screen height like Chrome hiding its address bar.
const FAKE_FULLSCREEN = `
(() => {
  let fsEl = null;
  const fire = () => document.dispatchEvent(new Event('fullscreenchange'));
  Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get: () => fsEl });
  Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get: () => true });
  Element.prototype.requestFullscreen = function () { fsEl = this; window.__tzFullscreen && window.__tzFullscreen(true); setTimeout(fire, 0); return Promise.resolve(); };
  Document.prototype.exitFullscreen = function () { fsEl = null; window.__tzFullscreen && window.__tzFullscreen(false); setTimeout(fire, 0); return Promise.resolve(); };
})();`;

export async function launch() { return chromium.launch(); }

/** kind: 'desktop' (1536×864) or 'phone' (iPhone 14 Pro Max, 430×932). Screencast frames are CSS-pixel sized. */
export async function session(browser, kind = 'desktop') {
  const opts = kind === 'phone'
    ? { ...devices['iPhone 14 Pro Max'], deviceScaleFactor: 1 }
    : { viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] };
  const context = await browser.newContext({ ...opts, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  await context.addInitScript(kind === 'phone' ? TOUCH : CURSOR);
  await context.addInitScript(FAKE_FULLSCREEN);
  if (kind === 'phone') {
    await context.exposeBinding('__tzFullscreen', async ({ page }, on) => {
      await page.setViewportSize(on ? { width: 430, height: 932 } : opts.viewport);
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.__kind = kind;
  page.__pos = { x: 768, y: 600 };
  return { context, page };
}

export async function login(page) {
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  const email = page.locator('input[type="email"]');
  if (!(await email.isVisible().catch(() => false))) await page.getByRole('button', { name: /sign in|log in|login/i }).first().click().catch(() => {});
  await email.waitFor({ timeout: 15000 });
  await email.fill(process.env.TZ_EMAIL);
  await page.locator('input[type="password"]').fill(process.env.TZ_PASSWORD);
  await page.locator('form button[type="submit"]').last().click();
  await sleep(5000);
  // First-run tour is stored per browser, keyed by user id: mark it done.
  await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.includes('auth-token'));
    const id = k && JSON.parse(localStorage.getItem(k))?.user?.id;
    if (id) for (const f of ['creator_dashboard_tour_completed', 'tour_link_copied', 'tour_save_completed']) localStorage.setItem(`${f}_${id}`, 'true');
  });
}

/** CDP screencast of one page → rec/<name>/frames → rec/<name>.mp4, marks → rec/<name>.marks.json */
export class Recorder {
  constructor(page, name) {
    this.page = page; this.name = name; this.marks = []; this.frames = [];
    this.dir = `${REC}${name}/`;
    mkdirSync(this.dir, { recursive: true });
    for (const f of readdirSync(this.dir)) unlinkSync(this.dir + f);
  }
  async start() {
    const kind = this.page.__kind;
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = `f${String(this.frames.length).padStart(6, '0')}.jpg`;
      writeFileSync(this.dir + file, Buffer.from(data, 'base64'));
      this.frames.push({ t: metadata.timestamp, file, w: Math.round(metadata.deviceWidth), h: Math.round(metadata.deviceHeight) });
      this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    const size = kind === 'phone' ? { maxWidth: 430, maxHeight: 932 } : { maxWidth: 1536, maxHeight: 864 };
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1, ...size });
    // Nudge a repaint so the first frame exists at t0.
    await this.page.evaluate(() => document.body && (document.body.style.outline = '0px solid transparent'));
    await sleep(400);
    this.t0 = this.frames[0]?.t ?? Date.now() / 1000;
  }
  now() { return Date.now() / 1000 - this.t0; }
  mark(id, extra = {}) {
    const m = { id, t: +this.now().toFixed(3), ...extra };
    this.marks.push(m);
    console.log(`  mark ${this.name}:${id} @ ${m.t}`);
    return m;
  }
  async stop() {
    await sleep(800);
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    await sleep(300);
    const f = this.frames;
    const list = f.map((x, i) => `file '${x.file}'\nduration ${Math.max(0.001, ((f[i + 1]?.t ?? x.t + 1) - x.t)).toFixed(4)}`).join('\n') + `\nfile '${f.at(-1).file}'\n`;
    writeFileSync(this.dir + 'list.txt', 'ffconcat version 1.0\n' + list);
    const out = `${REC}${this.name}.mp4`;
    // Frames can change size (a phone going full screen grows from 430x739 to 430x932): pad every
    // frame onto one canvas, content anchored to the bottom, and log when the size changes.
    const [W, H] = this.page.__kind === 'phone' ? [430, 932] : [1536, 864];
    const sizes = f.filter((x, i) => i === 0 || x.w !== f[i - 1].w || x.h !== f[i - 1].h).map((x) => ({ t: +(x.t - this.t0).toFixed(3), w: x.w, h: x.h }));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', this.dir + 'list.txt',
      // Phone: a short page sits under a 110 px status + address bar (drawn in the edit), like Chrome.
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:${this.page.__kind === 'phone' ? `'if(lt(ih,${H}),110,0)'` : 'oh-ih'}:color=white,fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', out]);
    writeFileSync(`${REC}${this.name}.marks.json`, JSON.stringify({ name: this.name, kind: this.page.__kind, t0: this.t0, frames: f.length, sizes, marks: this.marks }, null, 2));
    for (const x of readdirSync(this.dir)) unlinkSync(this.dir + x);
    console.log(`✓ ${this.name}.mp4  ${f.length} frames  ${this.marks.length} marks`);
  }
}

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/** Glide the (desktop) cursor to a point over `ms`. */
export async function glide(page, x, y, ms = 650) {
  const from = page.__pos, n = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) {
    const p = ease(i / n);
    await page.mouse.move(from.x + (x - from.x) * p, from.y + (y - from.y) * p);
    await sleep(ms / n);
  }
  page.__pos = { x, y };
}

async function boxOf(locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const b = await locator.boundingBox();
  if (!b) throw new Error('no box for ' + locator);
  return b;
}

/**
 * Glide to an element and click it. The mark's t is the click moment; `pre` is how long the glide
 * took before it (build.mjs starts the clip that much earlier, so the click lands on the cue word).
 * opts: { id, settle=1100, ms=650, dx, dy (fraction of box), hover (no click), dbl }
 */
export async function act(page, rec, id, locator, opts = {}) {
  const { settle = 1100, ms = 650, fx = 0.5, fy = 0.5, hover = false } = opts;
  const b = await boxOf(locator);
  const x = b.x + b.width * fx, y = b.y + b.height * fy;
  if (page.__kind === 'phone') {
    await sleep(150);
    const m = rec.mark(id, { pre: 0.15, box: b, point: { x, y } });
    if (!hover) await locator.tap({ position: { x: b.width * fx, y: b.height * fy } });
    await sleep(settle);
    m.end = +rec.now().toFixed(3);
    return m;
  }
  const t1 = rec.now();
  await glide(page, x, y, ms);
  await sleep(140);
  const m = rec.mark(id, { pre: +(rec.now() - t1).toFixed(3), box: b, point: { x, y }, hover });
  if (!hover) await page.mouse.click(x, y);
  await sleep(settle);
  m.end = +rec.now().toFixed(3);
  return m;
}

/** A mark for something that appears (no cursor action). */
export async function appear(page, rec, id, locator, { settle = 900, timeout = 20000 } = {}) {
  let box;
  if (locator) { await locator.waitFor({ state: 'visible', timeout }); box = await locator.boundingBox(); }
  const m = rec.mark(id, { pre: 0, box });
  await sleep(settle);
  m.end = +rec.now().toFixed(3);
  return m;
}

/** Human-paced typing (keyboard must already be focused). */
export async function type(page, text, delay = 70) { await page.keyboard.type(text, { delay }); }
