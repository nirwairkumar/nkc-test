// Stages the live numbers INSIDE the recording browser only (forked from testoza-live-exam): the four
// data requests behind the dashboard live card and the Results panel are answered for this one exam
// with a batch of 32 (phase 'live': 30 writing + 2 submitted; phase 'done': all 32 submitted).
// Nothing is written to the database; every other request passes through untouched.
// Real rows are used as templates (shape, answers), so the real screens render them normally.

// NP-21 is the real candidate from the phone take (39 / 52).
export const CLASS = [
  ['Aarav Gupta', 47], ['Ishita Verma', 44], ['Kabir Singh', 43], ['Diya Patel', 40], ['Vihaan Reddy', 39],
  ['Sneha Nair', 36], ['Rohan Mehta', 35], ['Meera Joshi', 32], ['Arjun Yadav', 31], ['Kavya Menon', 28],
  ['Aditya Kumar', 27], ['Siddharth Rao', 24], ['Priya Sharma', 23], ['Rahul Chauhan', 20], ['Tanvi Desai', 19],
  ['Harsh Agarwal', 16], ['Pooja Mishra', 15], ['Karan Malhotra', 12], ['Riya Kapoor', 11], ['Yash Thakur', 8],
  ['Ananya Verma', 39], ['Nandini Pillai', 7], ['Aman Saxena', 4], ['Shreya Bose', 28], ['Dev Choudhary', 3],
  ['Isha Bhat', 23], ['Manav Jain', 0], ['Tara Krishnan', 35], ['Neel Banerjee', 19], ['Zoya Khan', 31],
  ['Om Prakash', 12], ['Saanvi Rao', 44],
].map(([name, score], i) => ({ name, roll: `NP-${String(i + 1).padStart(2, '0')}`, score, i }));
const SUBMITTED_LIVE = ['NP-21', 'NP-05'];
const QUESTIONS = 13;

const uuid = (i, salt) => `${salt}0000-0000-4000-8000-${String(i).padStart(12, '0')}`;
function stats(score) {
  let c, w;
  if (score >= 0) { w = (4 - (score % 4)) % 4; c = (score + w) / 4; } else { c = 0; w = -score; }
  return { wrongCount: w, correctCount: c, partialCount: 0, negativeScore: w, positiveScore: c * 4, totalQuestions: QUESTIONS, unattemptedCount: QUESTIONS - c - w };
}

/** Installs the routes on a context. Returns { setPhase }. */
export async function stage(context, { testId, liveAt }) {
  let phase = 'live';
  const t0 = new Date(liveAt).getTime();
  const iso = (ms) => new Date(ms).toISOString();
  // Deterministic per-candidate times, all after the exam went live.
  const startOf = (k) => t0 + 40_000 + ((k.i * 37) % 23) * 9_000;
  const submitOf = (k) => {
    const span = Math.max(4 * 60_000, Date.now() - 90_000 - startOf(k));
    return Math.min(Date.now() - 60_000, startOf(k) + span * (0.35 + ((k.i * 53) % 61) / 100));
  };
  const submitted = () => (phase === 'done' ? CLASS : CLASS.filter((k) => SUBMITTED_LIVE.includes(k.roll)));
  const writing = () => (phase === 'done' ? [] : CLASS.filter((k) => !SUBMITTED_LIVE.includes(k.roll)));
  const subTime = (k) => (phase === 'live' ? Date.now() - (k.roll === 'NP-21' ? 70_000 : 160_000) : submitOf(k));
  const isOurs = (u) => u.includes(testId);

  // Dashboard: submitted attempts (Supabase REST).
  await context.route((u) => u.pathname.endsWith('/rest/v1/user_tests') && isOurs(u.search), async (route) => {
    const res = await route.fetch();
    const rows = await res.json();
    const others = rows.filter((r) => r.test_id !== testId);
    const ours = submitted().map((k) => ({
      id: uuid(k.i, 'aaaa'), user_id: uuid(k.i, 'bbbb'), test_id: testId, score: k.score, created_at: iso(subTime(k)),
      violation_count: k.roll === 'NP-21' ? 1 : 0, sf: { Name: k.name, 'Roll No': k.roll }, stats: stats(k.score), conduct: true,
    }));
    await route.fulfill({ response: res, json: [...ours, ...others].sort((a, b) => b.created_at.localeCompare(a.created_at)) });
  });
  // Dashboard: who is writing (Supabase REST).
  await context.route((u) => u.pathname.endsWith('/rest/v1/test_registrations') && isOurs(u.search), async (route) => {
    const res = await route.fetch();
    const json = writing().map((k) => ({
      test_id: testId, user_id: uuid(k.i, 'bbbb'), status: 'in_progress',
      started_at: iso(startOf(k)), last_active_at: iso(Date.now() - 15_000 - ((k.i * 11) % 9) * 9_000),
    }));
    await route.fulfill({ response: res, json });
  });
  // Results panel: started, not submitted (API).
  await context.route((u) => u.pathname.endsWith(`/attempts/test/${testId}/started`), async (route) => {
    const res = await route.fetch();
    const candidates = writing().map((k) => {
      const answered = 2 + ((k.i * 5) % 11);
      return {
        id: uuid(k.i, 'cccc'), status: 'in_progress', started_at: iso(startOf(k)),
        last_active_at: iso(Date.now() - 15_000 - ((k.i * 11) % 9) * 9_000),
        completion: Math.round((answered / QUESTIONS) * 100), answered, left_reason: null,
        startFormData: { Name: k.name, 'Roll No': k.roll },
      };
    });
    await route.fulfill({ response: res, json: { now: new Date().toISOString(), candidates } });
  });
  // Results panel + Excel export: submitted attempts (API), cloned from the real NP-21 attempt.
  await context.route((u) => u.pathname.endsWith(`/attempts/test/${testId}`), async (route) => {
    const res = await route.fetch();
    const rows = await res.json();
    const tpl = rows.find((r) => r.metadata?.startFormData?.['Roll No'] === 'NP-21' && r.score === 39) || rows.find((r) => r.score > 0) || rows[0];
    const json = submitted().map((k) => {
      const s = stats(k.score), end = subTime(k), start = Math.min(startOf(k), end - 60_000);
      const md = { ...(tpl?.metadata || {}), stats: s, startFormData: { Name: k.name, 'Roll No': k.roll },
        startedAt: iso(start), submittedAt: iso(end), conduct_exam: true, is_conducted_attempt: true };
      delete md.client_reported_score; delete md.client_reported_stats;
      return { ...(tpl || {}), id: uuid(k.i, 'aaaa'), test_id: testId, user_id: uuid(k.i, 'bbbb'), score: k.score,
        created_at: iso(end), metadata: md, violation_count: k.roll === 'NP-21' ? 1 : 0, questions_attempted: s.correctCount + s.wrongCount };
    });
    await route.fulfill({ response: res, json });
  });
  return { setPhase: (p) => { phase = p; } };
}
