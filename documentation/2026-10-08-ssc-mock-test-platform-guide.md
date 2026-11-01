# testoza.com/ssc-mock-test-platform — guide + timed sections (SSC 2026 pattern)

**Date:** 2026-10-08
**Component:** Frontend (`utils/sectionTiming.ts`, TestPage, TestBuilder, TestIntroPage, CorporateTestView, ResultsPage label, `src/guides/`, `src/pages/guides/ssc/`, App.tsx, Footer, sitemaps, `llms*.txt`, `public/guides/ssc-mock-test-platform/cover.png`), backend (`routers/sitemap.py` only), Supabase (`20261008150000_analytics_guide_ssc_mock_test_platform.sql`), Cloudflare worker (redeploy only).
**Status:** Implemented; uncommitted and undeployed for review.

---

## 1. Why the product changed first

SSC CGL 2026 Tier 1 (30 Sep – 30 Oct 2026), CHSL 2026 Tier 1 and Selection Post Phase 14 now give each of four sections its own 15 minutes: fixed order, a section closes when its time ends, no going back, unused time lost. TestoZa ran every test on one clock, and `CreateTestPage`'s FAQ already (wrongly) promised "optional sectional time limits". The owner chose to build timed sections before the guide.

## 2. Timed sections

| File | Change |
|---|---|
| `frontend/src/utils/sectionTiming.ts` (new) | `sectionMinutes`, `sectionMinutesTotal`, `openSection(minutes, secondsLeft, floor)`, `sectionRanges`, `formatSectionMinutes` |
| `frontend/src/lib/testsApi.ts` | `TestSection.duration_minutes?` |
| `frontend/src/components/TestBuilder.tsx` | "Time each section" switch under "Split into sections"; minutes field on each section header (wraps to its own line on phones); time limit = sum, read-only; new sections copy the previous section's minutes; validation ≥ 1 min; minutes saved only while the switch is on |
| `frontend/src/pages/TestPage.tsx` | the open section comes from the time left (backwards from the end) and never goes back (`sectionFloor`, saved with the local draft); clock shows the section's time (critical = a fifth of the section, max 5 min); tabs and palette of other sections faded and answer with a toast; Save & Next stops at a section's end, Back at its start; toast when a section closes; start-screen rule "Timed Sections"; total time from the sections; **Randomize Questions now shuffles within each section** (it used to mix sections, breaking per-section marks) |
| `frontend/src/components/test/CorporateTestView.tsx` | same rules via `firstQuestionIndex`, `isSectionOpen`, `criticalSeconds` props |
| `frontend/src/pages/TestIntroPage.tsx` | "Time" column in the section table; subtitle "timed sections…" |
| `frontend/src/pages/ResultsPage.tsx` | Subject-Wise Split box label "Split" → "Skipped" (it showed skipped questions) |

No migration: sections are JSON, the `sections_metadata` trigger keeps every key but `questions`, the answer stripper keeps section keys. Join-code sittings work unchanged (server deadline = start + test duration = the sum). Extra time from the examiner lengthens the open section. Off with the "no time limit" practice timer. Locks are enforced in the browser only (stated on the page).

Older guides updated for this factual change (dates not bumped): CBT guide's "Sections and one clock" item and "No separate section timers" limit, JEE Advanced guide's "No per-section timers" limit, `llms-full.txt` lines for both, and the "NOT in the product" header comments in the CBT, JEE and best-platform guide files.

## 3. The page

- **Angle:** SSC changed the clock in 2026; a mock on one 60-minute clock trains the wrong habit. Written for SSC coaching institutes and faculty.
- **Sections (13 + FAQ):** what changed in 2026 (table) · patterns (+ explorer) · sectional strategy (+ planner) · building the mock (8 steps + mapping table) · try a timed paper (+ exam) · Hindi and English · negative marking (+ guess lab) · previous papers · a test series (table, centre sittings, comparing batches / normalisation) · reading the result · checklist (table) · ten mistakes · honest limits · 12 FAQs.
- **Length:** ~6,300 words in the crawler HTML; read time 24 min. Title "SSC Mock Test Platform with Sectional Timing (2026)" (51), description 150.

| Demo (`pages/guides/ssc/`) | What it is |
|---|---|
| Hero (`SscHero`) | iPhone exam screen, CGL Tier 1: Reasoning's clock runs out, Awareness opens, the closed tab won't reopen, −0.5 for a wrong answer; caption = four-section strip |
| `ssc-patterns` (`PatternExplorer`) | CGL T1, CHSL T1, CGL T2, MTS, GD: time bar, sections, marking, time per question, languages, TestoZa settings |
| `ssc-planner` (`SectionPlanner`) | seconds/question and accuracy per section → marks with one clock (best case) vs 15-minute sections; default candidate 150 → 133.75 |
| `ssc-exam` (`TimedExamDemo` + `examScreen` + `resultScreen`) | 12 bilingual questions, 4 sections × 45 s, uses `utils/sectionTiming.ts`; desktop layout in a browser window with a section timeline (≥ 900 px), phone layout below; Skip to last seconds; result = ResultsPage score card + Subject-Wise Split |
| `ssc-guess` (`GuessLab`) | expected marks per guess by marking and options ruled out; binomial bar chart of 10 guesses |

Shell and CSS forked from the JEE Advanced guide (prefix `sg-`), exam replica forked from the NEET guide's desktop/phone ExamScreen (product headings turned into plain elements). Data: `src/guides/sscData.ts`. Text: `src/guides/sscMockTestPlatform.ts` (facts and product claims in its header).

## 4. Facts used (checked 8 October 2026)

Testbook (CGL 2026 dates, 28,52,665 applications, 10,731 vacancies), PW / Practicemock / SSC Drishti (15-minute sectional timer, no carry-over; "wait if finished early" reported, so stated as reported), Career Power (CHSL 2026 changes incl. ₹50 key challenge), Careers360 (MTS pattern; equipercentile normalisation notice of 2 June 2025), Career Power (GD pattern). The official CGLE 2026 notice PDF couldn't be fetched; para 13.8 is cited by secondary sources.

## 5. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors. ESLint on new files: 0 errors.
- `sectionTiming` logic checks (boundaries, late start, extra time with floor, Tier 2 minutes): pass.
- Real TestPage in Chromium with a mocked 4 × 1-minute test: gateway rule, 1:00 section clock, locked tab toast, Save & Next stop at section end, auto move at 1:00 with toast, Back disabled at section start, palette lock, Time's Up at the end; no page errors. Builder: switch, per-section minutes, summed read-only limit, phone layout.
- Guide at 1366 × 657 and iPhone 13: no horizontal overflow, no page errors, one H1; demo title + body 373–508 px (laptop, 531 free) and 514–533 px (phone, 538 free). Every demo clicked through.
- Crawler HTML (esbuild bundle of `guides/worker.ts`): one H1, 18 H2, tags balanced; JSON-LD Article + FAQPage (12) + BreadcrumbList.
- Backend `pytest tests`: 35 passed. `vite build` not run.

## 6. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. `npm run build` once.
3. Deploy the backend (live sitemap), then the frontend (Cloudflare Pages from `main`).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
5. Run `supabase/migrations/20261008150000_analytics_guide_ssc_mock_test_platform.sql` (live function matched 20261008120000 on 8 Oct).
6. Check `https://testoza.com/ssc-mock-test-platform` stays on testoza.com and view-source contains "What changed in SSC exams in 2026".
7. Build one real timed test, sit it on a phone and in a join-code sitting, then Search Console → Request indexing; Bing → submit URL.

Flagged, not fixed: the SSC exam screen's per-question Hindi/English switch has no TestoZa equivalent (stated as a limit); in section mode the passage-view marks chip reads `section.questions[localIdx]` (now consistent because shuffling stays inside sections).
