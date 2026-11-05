// Creates the one real test this video uses, in the demo educator's account: "SSC CGL Weekly Mock 12"
// (the paper from class.mjs), shaped like an exam that ran on Sunday 25 Oct, 10:00 IST, and ended.
// The candidates' attempts are NOT written anywhere: stage.mjs answers them inside the recording browser.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/make-test.mjs
import { launch, session, login, state, sleep } from './rec-lib.mjs';
import { SECTIONS, TITLE, DURATION, MARKS, NEG, EXAM } from './class.mjs';

const browser = await launch();
const { page } = await session(browser, 'desktop');
let api = null;
page.on('request', (r) => { const m = r.url().match(/^(https:\/\/[^/]+\/api\/)tests\//); if (m && !api) api = m[1]; });
await login(page);
for (let i = 0; i < 20 && !api; i++) await sleep(500);
if (!api) throw new Error('could not see the API address');

const who = await page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => x.includes('auth-token'));
  return { id: k && JSON.parse(localStorage.getItem(k))?.user?.id, token: localStorage.getItem('testoza_token') };
});
if (!who.id || !who.token) throw new Error('not signed in');

const existing = state.read();
if (existing.testId) { console.log('already made:', existing); await browser.close(); process.exit(0); }

const payload = {
  title: TITLE,
  description: 'Weekly mock for the SSC CGL batch: Reasoning, General Awareness, Quantitative Aptitude and English.',
  created_by: who.id,
  duration: DURATION,
  enable_section_mode: true,
  questions: [],
  sections: SECTIONS.map((s, k) => ({
    id: `section-${k + 1}`, name: s.name, colorIndex: k, question_type: 'single',
    marks_per_question: MARKS, negative_marks: NEG,
    questions: s.questions.map(({ section, ...q }) => q),
  })),
  total_questions: SECTIONS.reduce((n, s) => n + s.questions.length, 0),
  total_max_marks: SECTIONS.reduce((n, s) => n + s.questions.length * MARKS, 0),
  visibility: 'private',
  is_public: false,
  settings: {
    start_form: { enabled: true, fields: [{ label: 'Name', required: true }, { label: 'Roll No', required: true }] },
    show_results_immediate: true,
    exam_interface_mode: 'nta',
    tab_switch_mode: 'on',
    violation_limit: 3,
    force_fullscreen: true,
    disable_copy_paste: true,
    shuffle_questions: false,
    allow_flexible_timer: false,
    schedule: { enabled: false },
    conduct_exam: { enabled: false, started_at: EXAM.startedAt, ended_at: EXAM.endedAt },
  },
};

const res = await page.evaluate(async ({ api, token, payload }) => {
  const r = await fetch(api + 'tests/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(payload) });
  return { status: r.status, body: await r.text() };
}, { api, token: who.token, payload });
if (res.status >= 300) throw new Error(`create failed ${res.status}: ${res.body.slice(0, 300)}`);
const t = JSON.parse(res.body);
state.write({ testId: t.id, title: t.title, customId: t.custom_id, slug: t.slug, api, userId: who.id });
console.log('made', t.id, t.custom_id, t.slug, 'via', api);
await browser.close();
