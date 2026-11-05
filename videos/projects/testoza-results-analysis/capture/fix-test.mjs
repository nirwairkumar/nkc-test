// One-off after make-test.mjs: the builder also sets custom_id (next M number), slug and creator name.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/fix-test.mjs
import { launch, session, login, state } from './rec-lib.mjs';
const s = state.read();
const browser = await launch();
const { page } = await session(browser, 'desktop');
await login(page);
const out = await page.evaluate(async ({ api, id }) => {
  const token = localStorage.getItem('testoza_token');
  const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const next = await (await fetch(api + 'tests/next-id?prefix=M', { headers: h })).json();
  const k = Object.keys(localStorage).find((x) => x.includes('auth-token'));
  const meta = JSON.parse(localStorage.getItem(k))?.user?.user_metadata || {};
  const body = { custom_id: next.next_id, slug: 'ssc-cgl-weekly-mock-12-' + Math.random().toString(36).slice(2, 6), creator_name: meta.full_name || 'TestoZa Demo' };
  const r = await fetch(api + 'tests/' + id, { method: 'PUT', headers: h, body: JSON.stringify(body) });
  return { status: r.status, body, text: (await r.text()).slice(0, 200) };
}, { api: s.api, id: s.testId });
console.log(out);
if (out.status < 300) state.write({ customId: out.body.custom_id, slug: out.body.slug });
await browser.close();
