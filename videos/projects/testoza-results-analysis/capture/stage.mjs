// Stages the demo class INSIDE the recording browser only (forked from the Top-10 kit). The real
// test (M679, made by make-test.mjs) is real; its 48 submissions and 4 drop-outs come from
// class.mjs and are answered here, so the app's own screens, ranks and report maths run on them.
// Three earlier weekly mocks (9–11, numbers only) and next week's unsent Mock 13 are added to the
// test list; the demo account's other tests are hidden so My Tests / All submissions read as one
// SSC batch. Nothing is written to the database; every other request passes through untouched.
import { buildClass, TITLE, NEG, EXAM } from './class.mjs';

const uuid = (salt, i) => `${salt}-0000-4000-8000-${String(i).padStart(12, '0')}`;
const iso = (ms) => new Date(ms).toISOString();

/** Earlier mocks, shown only as numbers on All submissions: a batch slowly moving up. */
const EARLIER = [
  { n: 11, daysBefore: 7, count: 46, avg: 51 },
  { n: 10, daysBefore: 14, count: 50, avg: 49 },
  { n: 9, daysBefore: 21, count: 44, avg: 47 },
];
const NEXT = { n: 13, id: uuid('0000000d', 13) };

export async function stage(context, { testId, userId }) {
  const { questions, submitted, dropped } = buildClass();
  const t0 = Date.parse(EXAM.startedAt);
  const startOf = (c) => t0 + Math.round(c.startMin * 60_000) + (c.i % 5) * 7_000;
  const endOf = (c) => startOf(c) + c.takenSec * 1000;

  // Seconds per answered question, adding up to the time they took.
  const times = (c) => {
    const ids = questions.map((q) => q.id).filter((id) => c.answers[id] !== undefined);
    const w = ids.map((id, k) => 0.6 + ((id * 13 + c.i * 7 + k) % 9) / 6 + (id === 15 || id === 14 ? 1.2 : 0));
    const sum = w.reduce((a, b) => a + b, 0);
    return Object.fromEntries(ids.map((id, k) => [id, Math.max(8, Math.round((w[k] / sum) * c.takenSec * 0.97))]));
  };
  const stats = (c) => ({ wrongCount: c.wrong, correctCount: c.correct, partialCount: 0, negativeScore: c.wrong * NEG,
    positiveScore: c.correct * 2, totalQuestions: questions.length, unattemptedCount: c.blank });
  const attempt = (c, withAnswers) => {
    const qt = times(c);
    return {
      id: uuid('aaaa0000', c.i), user_id: uuid('bbbb0000', c.i), test_id: testId, score: c.score,
      ...(withAnswers ? { answers: c.answers } : {}),
      created_at: iso(endOf(c)), violation_count: 0, violation_log: [], questions_attempted: c.correct + c.wrong,
      session_id: null, participant_id: null, snapshot_settings: null,
      metadata: { stats: stats(c), scored_by: 'server', startedAt: iso(startOf(c)), submittedAt: iso(endOf(c)), conduct_exam: true,
        is_conducted_attempt: true, question_times: qt, time_spent_per_question: qt, startFormData: { Name: c.name, 'Roll No': c.roll } },
    };
  };
  const byId = new Map(submitted.map((c) => [uuid('aaaa0000', c.i), c]));

  // Earlier mocks: rows in the dashboard's column shape, scores spread round each mock's average.
  const earlierTests = EARLIER.map((m) => ({ ...m, id: uuid('0000000e', m.n), title: `SSC CGL Weekly Mock ${m.n}`, at: t0 - m.daysBefore * 86_400_000 }));
  const earlierRows = earlierTests.flatMap((m) => Array.from({ length: m.count }, (_, k) => {
    const pct = Math.max(6, Math.min(95, m.avg + ((k * 37 + m.n * 11) % 61) - 30 + (k % 3 === 0 ? -6 : 3)));
    const score = Math.round((pct / 100) * 40 * 2) / 2;
    const correct = Math.round(score / 2) + 1, wrong = Math.max(0, Math.round((correct * 2 - score) / NEG)), blank = Math.max(0, 20 - correct - wrong);
    return { id: uuid('eeee' + m.n + '00', k), user_id: uuid('ffff' + m.n + '00', k), test_id: m.id, score,
      created_at: iso(m.at + 12 * 60_000 + k * 9_000), violation_count: 0, sf: { Name: `Candidate ${k + 1}`, 'Roll No': `CGL-${k + 1}` },
      stats: { correctCount: correct, wrongCount: wrong, unattemptedCount: blank, totalQuestions: 20 }, conduct: true };
  }));
  const ourRows = submitted.map((c) => ({ id: uuid('aaaa0000', c.i), user_id: uuid('bbbb0000', c.i), test_id: testId, score: c.score,
    created_at: iso(endOf(c)), violation_count: 0, sf: { Name: c.name, 'Roll No': c.roll }, stats: stats(c), conduct: true }));
  const staged = new Set([testId, NEXT.id, ...earlierTests.map((m) => m.id)]);

  // The test list (My Tests, All submissions): our mock, the earlier three, next week's Mock 13.
  const shape = (real) => [
    real,
    ...earlierTests.map((m) => ({ ...real, id: m.id, title: m.title, custom_id: `M6${60 + m.n}`, slug: `ssc-cgl-weekly-mock-${m.n}`,
      created_at: iso(m.at - 2 * 86_400_000), updated_at: iso(m.at),
      settings: { ...real.settings, conduct_exam: { enabled: false, started_at: iso(m.at), ended_at: iso(m.at + 35 * 60_000) } } })),
    { ...real, id: NEXT.id, title: `SSC CGL Weekly Mock ${NEXT.n}`, custom_id: 'M680', slug: 'ssc-cgl-weekly-mock-13',
      created_at: iso(Date.now() - 3 * 3600_000), updated_at: iso(Date.now() - 3 * 3600_000),
      settings: { ...real.settings, conduct_exam: undefined } },
  ];
  await context.route((u) => /\/api\/tests\/user\/[^/]+(\/conducted)?$/.test(u.pathname), async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    const list = Array.isArray(body) ? body : body.tests;
    const real = (list || []).find((t) => t.id === testId);
    if (!real) return route.fulfill({ response: res, json: body });
    const conducted = route.request().url().includes('/conducted');
    let tests = shape(real);
    if (conducted) tests = tests.filter((t) => t.settings?.conduct_exam);
    const json = Array.isArray(body) ? tests : { ...body, tests, meta: { ...(body.meta || {}), total: tests.length } };
    await route.fulfill({ response: res, json });
  });

  // Dashboard / All submissions: submitted attempts (Supabase REST, the dashboard's column shape).
  await context.route((u) => u.pathname.endsWith('/rest/v1/user_tests') && [...staged].some((id) => u.search.includes(id)), async (route) => {
    const res = await route.fetch();
    const rows = (await res.json().catch(() => [])) || [];
    const others = Array.isArray(rows) ? rows.filter((r) => !staged.has(r.test_id)) : [];
    await route.fulfill({ response: res, json: [...ourRows, ...earlierRows, ...others].sort((a, b) => b.created_at.localeCompare(a.created_at)) });
  });
  // Nobody is writing any more: the exam ended.
  await context.route((u) => u.pathname.endsWith('/rest/v1/test_registrations') && [...staged].some((id) => u.search.includes(id)), async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: [] });
  });
  // Results panel: started but never submitted = the four who dropped.
  await context.route((u) => u.pathname.endsWith(`/attempts/test/${testId}/started`), async (route) => {
    const res = await route.fetch();
    const candidates = dropped.map((c, k) => {
      const start = t0 + Math.round(c.startMin * 60_000);
      return { id: uuid('cccc0000', k), status: c.how === 'abandoned' ? 'abandoned' : 'in_progress', started_at: iso(start),
        last_active_at: iso(start + c.leftAfter * 60_000), completion: Math.round((c.answered / questions.length) * 100),
        answered: c.answered, left_reason: c.how === 'abandoned' ? 'closed' : null, startFormData: { Name: c.name, 'Roll No': c.roll } };
    });
    await route.fulfill({ response: res, json: { now: new Date().toISOString(), candidates } });
  });
  // Results panel / report / Excel: the submissions (with answers unless the page asked to leave them out).
  await context.route((u) => u.pathname.endsWith(`/attempts/test/${testId}`), async (route) => {
    const res = await route.fetch();
    const withAnswers = !route.request().url().includes('exclude_answers=true');
    await route.fulfill({ response: res, json: submitted.map((c) => attempt(c, withAnswers)) });
  });
  // One answer sheet.
  await context.route((u) => /\/api\/attempts\/aaaa0000-/.test(u.pathname), async (route) => {
    const id = route.request().url().match(/attempts\/(aaaa0000-[^/?]+)/)[1];
    const c = byId.get(id);
    if (!c) return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, json: attempt(c, true) });
  });
  // Until the results.py fix (topic loop overwrote `percentage`) is deployed: the overall % as the fix returns it.
  await context.route((u) => u.pathname.endsWith('/api/results/analyze'), async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    if (json && json.totalMaxMarks > 0) json.percentage = Math.round((json.finalScore / json.totalMaxMarks) * 100);
    await route.fulfill({ response: res, json });
  });
  return { submitted, dropped, userId };
}

export { TITLE };
