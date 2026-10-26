// Stages the tutorial's live numbers INSIDE the recording browser only: the four data requests
// behind the dashboard live card and the Results panel are answered for this one exam with a
// class of 27 (phase 'live': 25 writing + 2 submitted; phase 'done': all 27 submitted).
// Nothing is written to the database; every other request passes through untouched.
// Real rows are used as templates (shape, answers), so the real screens render them normally.

// Roll JM-07 is the real candidate from the 'candidate' take; JM-14 is the phone take.
export const CLASS = [
  ['Aarav Gupta', 32], ['Ananya Iyer', 28], ['Kabir Singh', 27], ['Diya Patel', 24], ['Vihaan Reddy', 24],
  ['Ishita Verma', 23], ['Rohan Mehta', 8], ['Sneha Nair', 20], ['Arjun Yadav', 20], ['Meera Joshi', 19],
  ['Aditya Kumar', 16], ['Kavya Menon', 16], ['Siddharth Rao', 15], ['Priya Sharma', 24], ['Rahul Chauhan', 12],
  ['Tanvi Desai', 12], ['Harsh Agarwal', 11], ['Pooja Mishra', 11], ['Karan Malhotra', 8], ['Riya Kapoor', 7],
  ['Yash Thakur', 4], ['Nandini Pillai', 15], ['Aman Saxena', 3], ['Shreya Bose', 20], ['Dev Choudhary', 0],
  ['Isha Bhat', 19], ['Manav Jain', -1],
].map(([name, score], i) => ({ name, roll: `JM-${String(i + 1).padStart(2, '0')}`, score, i }));
const SUBMITTED_LIVE = ['JM-07', 'JM-02'];

const uuid = (i, salt) => `${salt}0000-0000-4000-8000-${String(i).padStart(12, '0')}`;
function stats(score) {
  let c, w;
  if (score >= 0) { w = (4 - (score % 4)) % 4; c = (score + w) / 4; } else { c = 0; w = -score; }
  return { wrongCount: w, correctCount: c, partialCount: 0, negativeScore: w, positiveScore: c * 4, totalQuestions: 8, unattemptedCount: 8 - c - w };
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
  const subTime = (k) => (phase === 'live' ? Date.now() - (k.roll === 'JM-07' ? 70_000 : 160_000) : submitOf(k));
  const isOurs = (u) => u.includes(testId);

  // Dashboard: submitted attempts (Supabase REST).
  await context.route((u) => u.pathname.endsWith('/rest/v1/user_tests') && isOurs(u.search), async (route) => {
    const res = await route.fetch();
    const rows = await res.json();
    const others = rows.filter((r) => r.test_id !== testId);
    const ours = submitted().map((k) => ({
      id: uuid(k.i, 'aaaa'), user_id: uuid(k.i, 'bbbb'), test_id: testId, score: k.score, created_at: iso(subTime(k)),
      violation_count: 0, sf: { Name: k.name, 'Roll No': k.roll }, stats: stats(k.score), conduct: true,
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
      const answered = 1 + ((k.i * 5) % 7);
      return {
        id: uuid(k.i, 'cccc'), status: 'in_progress', started_at: iso(startOf(k)),
        last_active_at: iso(Date.now() - 15_000 - ((k.i * 11) % 9) * 9_000),
        completion: Math.round((answered / 8) * 100), answered, left_reason: null,
        startFormData: { Name: k.name, 'Roll No': k.roll },
      };
    });
    await route.fulfill({ response: res, json: { now: new Date().toISOString(), candidates } });
  });
  // Results panel + Excel export: submitted attempts (API), cloned from the real JM-07 attempt.
  await context.route((u) => u.pathname.endsWith(`/attempts/test/${testId}`), async (route) => {
    const res = await route.fetch();
    const rows = await res.json();
    const tpl = rows.find((r) => r.metadata?.startFormData?.['Roll No'] === 'JM-07' && r.score > 0) || rows[0];
    const json = submitted().map((k) => {
      const s = stats(k.score), end = subTime(k), start = Math.min(startOf(k), end - 60_000);
      const md = { ...(tpl?.metadata || {}), stats: s, startFormData: { Name: k.name, 'Roll No': k.roll },
        startedAt: iso(start), submittedAt: iso(end), conduct_exam: true, is_conducted_attempt: true };
      delete md.client_reported_score; delete md.client_reported_stats;
      return { ...(tpl || {}), id: uuid(k.i, 'aaaa'), test_id: testId, user_id: uuid(k.i, 'bbbb'), score: k.score,
        created_at: iso(end), metadata: md, violation_count: 0, questions_attempted: s.correctCount + s.wrongCount };
    });
    await route.fulfill({ response: res, json });
  });
  return { setPhase: (p) => { phase = p; } };
}
