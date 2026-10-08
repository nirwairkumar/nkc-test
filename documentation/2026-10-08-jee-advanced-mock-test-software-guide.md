# testoza.com/jee-advanced-mock-test-software — guide + exact JEE Advanced partial marking

**Date:** 2026-10-08
**Component:** Frontend (`src/guides/`, `src/pages/guides/jadv/`, `utils/multiCorrect.ts`, test builder, TestPage, FullTestAnalysisPage, TestResultsPanel, App.tsx, Footer, sitemaps, `llms*.txt`, `public/guides/jee-advanced-mock-test-software/cover.png`), backend (`services/scoring.py`, `routers/results.py`, `routers/sitemap.py`, new test), Supabase (`20261008120000_analytics_guide_jee_advanced_mock_test_software.sql`), Cloudflare worker (redeploy only).
**Status:** Implemented; uncommitted and undeployed for review.

---

## 1. Why a separate page

`/jee-mock-test-platform` is a JEE Main page with one JEE Advanced section, and it says TestoZa's partial marks differ from JEE Advanced's. Searches for "JEE Advanced mock test software" come from institutes that care about exactly that. So the product was fixed first, then the page was built on the fix.

## 2. Product change: exact JEE Advanced partial marks

Each multiple-correct question now has a **Partial marks** switch in the builder (under the options): **Proportional** (default, unchanged behaviour: marks × picked ÷ correct) or **JEE Advanced** (`partialMarking: 'per_option'`: +1 per correct option picked, capped at the question's marks; full marks only for all; any wrong option → the Wrong mark).

| File | Change |
|---|---|
| `frontend/src/utils/multiCorrect.ts` (new) | `multiPartialScore(question, picked, correct, marks)` |
| `backend/app/services/scoring.py` | `multi_partial_score`, used by `score_question` (authoritative score) |
| `backend/app/routers/results.py` | result analysis uses it |
| `frontend/src/pages/TestPage.tsx` | client score (both places, incl. best-N attempt control) |
| `frontend/src/pages/FullTestAnalysisPage.tsx` | teacher analysis |
| `frontend/src/components/TestResultsPanel.tsx` | spreadsheet export: **was** marking every partly-correct answer "Wrong" with a negative mark (it read orphan `enable_partial_marks` fields) and every "Exact value(s)" numerical wrong; now matches the server |
| `frontend/src/components/test-builder/QuestionCard.tsx` | the switch |
| `frontend/src/components/TestBuilder.tsx` | a new question copies the previous question's switch |
| `frontend/src/lib/testsApi.ts` | `partialMarking?` on `Question` |
| `backend/tests/test_multi_partial_scoring.py` (new) | proportional default, +3/+2/+1/−2 cases, cap |

Questions are stored as JSON, so no migration is needed for the field. Existing tests are unaffected (no question has the field).

## 3. The page

- **Angle:** a JEE Advanced mock must copy the paper (two papers, sections that mark differently, +1-per-option partial marks with −2, two-decimal numericals, matching, paragraphs) and the day (Paper 1 → break → Paper 2, one total).
- **Sections (12 + FAQ):** what to copy (2024 Paper 1 table, Main vs Advanced table) · partial marking (+ lab) · building section by section (8 steps + type map) · numerical answers (+ lab) · matching and paragraphs · two papers as one sitting (+ flow) · candidate screen (+ paper) · reading the result (+ option split) · test-series plan (table) · software checklist (table) · ten mistakes · honest limits · 12 FAQs.
- **Length:** ~6,300 words in the crawler HTML; read time 24 min. Title "JEE Advanced Mock Test Software for Institutes | TestoZa" (56), description 153.

| Demo (`pages/guides/jadv/`) | What it is |
|---|---|
| Hero (`JadvHero`) | iPhone exam screen, Q2 (x³ − 3x, key A B D): ticks A → +1, A B → +2, A B D → +4, add C → −2 |
| `jadv-marking` (`MarkingLab`, new) | builder card (answer-key ticks, Marks/Wrong, the real Partial marks switch) + candidate picks, marks from `multiPartialScore`, JEE rule with the applying line lit; 5 preset cases |
| `jadv-papers` (`PapersFlow`, new) | CombinedIntroPage → CombinedBreakScreen (live countdown, Add 5 Minutes, Skip) → combined result (181/360), phone layouts resolved |
| `jadv-numerical` (`NumericLab`, forked) | π/4 to two decimals: exact 0.79 = 1/6, 0.78,0.79 = 2/6, range 0.78–0.79 = 3/6 (fair), 0.75–0.80 = 5/6 |
| `jadv-exam` (`ExamDemo` + `examScreen`, forked) | 6 questions: single +3/−1, two multi +4/−2 (per option), decimal and integer numericals +4/0, matching +3/−1 with a List-I/II table; multi-correct square keys as TestPage |
| `jadv-options` (`OptionSplit`, forked) | projectile question, batch of 60, 37% → Hard |

Shell and CSS forked from the chemistry guide (prefix `ja-`, unused demo CSS dropped: 3,540 lines vs 4,755). Data: `src/guides/jadvData.ts` (answers worked in comments). Text: `src/guides/jeeAdvancedMockTestSoftware.ts` (outside facts and product claims in its header).

## 4. Facts used (checked 8 October 2026)

jeeadv.ac.in: 2026 organised by IIT Roorkee, Sunday 17 May 2026, pattern "consistent with previous" exams. Careers360: 2024 Paper 1 per subject 4 + 3 + 6 + 4 questions, +3/−1, +4 (+3/+2/+1)/−2, +4/0, +3/−1; 180 per paper. One 2026 analysis reports −1 on Paper 2 integer questions, so the page says numericals "usually" carry no negative mark and to follow the latest paper. Not stated: 2026 candidate numbers or result date (sources disagree).

## 5. Verification

- Backend `pytest tests`: 35 passed (7 new scoring cases).
- `tsc -p tsconfig.app.json`: only the 4 existing errors. ESLint on new files: 0 errors.
- Crawler HTML (esbuild bundle of `guides/worker.ts`): one H1, 17 H2, tags balanced, no stray `<`/`>`; JSON-LD Article + FAQPage (12) + BreadcrumbList.
- Playwright (Chromium, 1366 × 657 and iPhone 13), every demo used: no horizontal overflow, no page errors; demo title + body 400–512 px (laptop, 544 free) and 456–524 px (phone, ~551 free). Marking presets +2/+1/+3/+1/−2, Proportional 2.67; break 29:59 → 34:59 after Add 5 Minutes; combined 181.00 / 360; full paper = 20/22; numerical presets 1/2/3/5 of 6.
- `vite build` not run (run before deploying).

## 6. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. `npm run build` once.
3. Deploy the **backend first** (scoring + live sitemap), then the frontend (Cloudflare Pages from `main`).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
5. Run `supabase/migrations/20261008120000_analytics_guide_jee_advanced_mock_test_software.sql` (live function matched the chemistry migration on 8 Oct).
6. Check `https://testoza.com/jee-advanced-mock-test-software` stays on testoza.com and view-source contains "What a JEE Advanced mock has to copy".
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.

## 7. Flagged, not fixed

- `/jee-mock-test-platform` (earlier guide, not touched) still says TestoZa's partial credit is proportional and differs from JEE Advanced; true by default, but the JEE Advanced switch now exists. Its `partial-marks` widget and FAQ should mention the switch and link here.
- `frontend-admin/src/components/TestResultsPanel.tsx` has the same old export scoring as the frontend copy had.
- Combined-test break screen (product): the "Paper I Submitted Successfully" banner is see-through and sits over the coffee icon on phone-height screens for its first 7 seconds.
- No faculty-side merged rank list across Paper 1 and Paper 2 (stated as a limit on the page).
