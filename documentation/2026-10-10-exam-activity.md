# Live Activity, rebuilt as an exam-operations report

**Date:** 2026-10-10
**Component:** backend (`app/routers/analytics/exam_ops.py`), admin panel (`frontend-admin/src/pages/activity/`)
**Status:** Implemented, aggregation verified against the live database. **No SQL migration needed.** Deploy the backend first, then the admin app — until the backend is live the page shows a "Deploy the backend" card.

---

## 1. What was wrong with the old page

Admin → Live Activity rendered one card per test with `settings.conduct_exam.enabled = true`. That was the whole page.

| # | Problem | Consequence |
|---|---|---|
| 1 | **No history at all.** Nothing answered "how many exams ran today / yesterday / last week". | The only way to judge usage was to read the cards and guess. |
| 2 | **"Live" was a flag, not an activity.** A link switched on in September still showed a pulsing green dot in October. On 2026-10-10 the live list held **16 links; 13 had received no paper for days.** | The page looked busy whether or not anything was happening. |
| 3 | **3 of those 16 were the seeded example test.** `ensure_user_has_example_test()` (`app/routers/tests/read.py`) clones the template *with its settings*, and the template has conduct mode on — so every new account silently publishes a reachable exam link. | "Live exams" grew with sign-ups, not with usage. |
| 4 | **No candidates, scores or outcomes.** The card showed a lifetime submission count, nothing per sitting. | Impossible to tell a real class from one person poking a link. |
| 5 | **Our own test runs counted as customers'.** `nkchaudhary431@gmail.com` is not in `admins`, so its runs are indistinguishable from a paying educator's. | Every usage number was inflated by internal activity. |
| 6 | Each card repeated ~10 proctoring chips, IST timestamps and a schedule block in 240 lines of JSX inside `ManageTests.tsx` (3,124 lines). | Dense to read, expensive to change. |

---

## 2. The unit of measurement: a *sitting*

**One sitting = one test that received at least one submission on one IST calendar day.** A test run on three days is three sittings. This is the only honest unit the data supports:

- Link-based conduct exams write **nothing** when a candidate opens or abandons a paper. `test_registrations` only gets a row for a signed-in self-practice start (`attempts.py::register_start` returns early when `user_id` is absent), and conduct candidates never appear there — verified: 6 submissions on 2026-10-09, zero matching registration rows.
- Therefore **starts, drop-off and "in the exam right now" cannot be computed for link exams.** The page says so in a footnote rather than inventing a funnel.
- Join-code sittings (`exam_sessions` / `session_participants`) *do* track presence (`last_seen_at`, `progress`, `violations`). Those numbers appear only on those rows, labelled **In exam**.

Other definitions, all stated in the UI as `(i)` tooltips:

| Term | Rule |
|---|---|
| Candidate | A distinct account that submitted. Exam takers without an account get a hidden `candidate_*@guest.testoza.com` login — the same convention analytics v2 uses — so they are counted here and never as a sign-up. |
| Educator | `tests.created_by` of a sitting's test. Attempts on a deleted test have no owner and show as "Deleted test". |
| Team | Accounts whose email is in `public.admins`. The default audience filter, **Customers**, excludes them. |
| Exam with a class | A sitting with **3 or more** candidates. The rest are mostly people trying the product. |
| Blank paper | Submitted with `questions_attempted = 0` (falling back to `stats.totalQuestions - stats.unattemptedCount`). |
| Avg score | Mean of `score ÷ total_max_marks` **over papers with at least one answer**. Tests with no marks configured fall back to one mark per question. |

### Why blanks are excluded from the average

On the live database, 7 days to 2026-10-10: **10 of 23 papers (43%) were blank.** Including them put the average score at 25.3%, which reads as "our exams are too hard". Excluding them gives **44.8% over 13 answered papers**, with the blank share shown as its own tile. Same data, opposite conclusion.

---

## 3. What the page shows

```
Operations ▸ Live activity                               [● n live] [⟳]

Right now        n links open · n papers in the last 15 min · n example tests not counted
  In use         one row per link with a paper in the last hour (or live < 6 h):
                 educator, live-since, papers last hour / today / in exam,
                 rules chip, [Live results] [Exam rules] [Copy link] [Open] [Take offline]
  Quiet          collapsed: "n links left open and quiet" — still reachable by anyone

Exams conducted  [Today|Yesterday|7D|30D|90D|12M]  [Customers|Everyone|Team]
  tiles          Exams conducted · Candidates · Papers in · Educators · Avg score · Blank papers
                 (the first three switch the chart; all carry a change vs the previous period)
  chart          one bar per day / hour / week / month
  When exams run papers by hour of day (IST) and by weekday
  Who conducted  educators ranked by exams, with New / Repeat / Team / You chips — click to filter
  table          every sitting: exam, educator, when + window, candidates, papers, blank, avg score
                 → tap a row for the candidate list (name, roll, score, answered, minutes, blank)
  footnotes      only the warnings that currently apply (see §5)
```

Files:

| File | Role |
|---|---|
| `backend/app/routers/analytics/exam_ops.py` | `GET /api/analytics/v2/exam-ops`, `GET …/exam-ops/sitting`. Admin-only via the router dependency in `analytics/__init__.py`. |
| `frontend-admin/src/pages/activity/api.ts` | Typed client. A 404 raises `NotDeployedError` → the "Deploy the backend" card. |
| `…/activity/ExamOpsPanel.tsx` | The page: header, filters, tiles, chart, clock, educators, table, footnotes. |
| `…/activity/LiveNow.tsx` | The "Right now" list, in-use/quiet split, and the take-offline action. |
| `…/activity/SittingSheet.tsx` | One sitting's candidate list. |
| `…/activity/proctoring.ts` | `settings` → short rule labels and a one-word strictness ("Locked down" / "Watched" / "Open"). |

It reuses the analytics v2 design system unchanged (`pages/analytics/ui.tsx`, `charts.tsx`, `format.ts`): `CARD`, `StatTile`, `Segmented`, `BarList`, `IosSheet`, `Columns`, IST formatters. `AdminDashboard.tsx` now routes `tab=activity` to `ExamOpsPanel`; the old `TabsContent value="activity"` in `ManageTests.tsx` is unreachable and can be deleted in a later pass.

---

## 4. Why Python and not SQL

Analytics v2 pushes every report into Postgres functions. This one aggregates in Python instead, deliberately:

- **It ships without a migration.** One backend deploy and the page works.
- **It is small.** 258 attempt rows in total, average `metadata` 439 bytes. A 7-day period fetches ~25 rows.
- Everything is period-bounded and paged past PostgREST's 1,000-row ceiling (`_fetch_all`).

**Move it into a Postgres function when attempts pass roughly 20k per period** — the file says so at the top. The shape of the response is already report-like, so the port is mechanical. Note that `frontend/src/lib/teacherDashboardApi.ts` shows PostgREST JSON-path selects work here (`sf:metadata->startFormData`), which would cut the payload further if needed before a full port.

---

## 5. Findings the rebuild surfaced (live database, 2026-10-10)

These are shown in the page as footnotes, and only when they apply.

1. **The example test is published for every new account.** 3 of 16 live links. The clone inherits the template's `conduct_exam.enabled`. *Fix at the source:* turn conduct mode off on the template (`settings.is_example_template = true`), or strip `conduct_exam` in `ensure_user_has_example_test()` the way `adminCloneTest` already strips it.
2. **Proctoring violations are never saved on a paper.** `user_tests.violation_count` is `0` in all 258 rows. `TestPage.tsx` counts tab switches and fullscreen exits in `warningsRef` and sends them on progress pings (which reach `session_participants.violations`), but the submit payload never carries them, and `attempts.py` writes `item.get("violation_count") or 0`. Any "flagged papers" metric can never fire until the submit path passes the count. Worth fixing before invigilation is sold as a feature.
3. **Only `learnirwair@gmail.com` is in `admins`.** `nkchaudhary431@gmail.com` (designation "Institution") runs trial exams that count as customer activity. One `INSERT` into `admins` makes the **Customers** filter mean what it says, here and across analytics v2.
4. **43% of papers in the last 7 days were blank**, concentrated in two sittings — a 5-question demo passed around a class, submitted blank in seconds with junk names. Real engagement, but not an exam. The **Mostly blank** chip marks these so they stop being read as conducted exams.
5. **The busiest sitting of the week belongs to a deleted test** (10 papers, 8 candidates, 42-minute window, 2026-10-07). The attempts survive the test row, so the page shows "Deleted test" rather than dropping the activity.
6. **Exams cluster at 20:00–22:00 IST** (16 of 23 papers in 7 days) and on Wednesday/Friday. Deploy outside that window; that is also when support needs to be reachable.

---

## 6. Deploy

1. **Backend first.** No migration, no new environment variable. Verify: `GET /api/analytics/v2/exam-ops?period=7d` returns 401 without a token and JSON with an admin token.
2. **Then the admin app** (`frontend-admin`). Before the backend is live the page shows the "Deploy the backend" card, so the order is safe either way but this way nobody sees it.
3. Optional, recommended: `INSERT INTO admins (email) VALUES ('nkchaudhary431@gmail.com');` so internal runs stop counting as customers'.

## 7. Verification done

- `_collect` / `_totals` / `_series` / `_bucket_series` / `_sitting_row` / `_right_now` exercised against fixture rows covering: two sittings of one test, a team-owned run under each audience, a deleted test, a blank paper, a flagged paper, hour/day/week/month bucketing, and the score fallback. All pass.
- The real endpoint was called against the live database for `today`, `7d` and `30d` (both audiences), plus one sitting drill-down. Numbers cross-checked against hand-written SQL over `user_tests`.
- `tsc --noEmit` clean for the new files; `npm run build` passes.
- Not verified in a browser: the admin app needs an admin login this session did not have. Layout and interaction are unviewed.
