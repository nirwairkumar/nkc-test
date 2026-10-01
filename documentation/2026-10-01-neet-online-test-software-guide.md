# testoza.com/neet-online-test-software — NEET guide with a playable exam screen

**Date:** 2026-10-01  
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/neet/`, `App.tsx`, `Footer.tsx`, sitemaps, `llms*.txt`, cover), backend (`app/routers/sitemap.py`), Supabase (`20261001130000_analytics_guides_neet.sql` (after the AI test generator guide's `20261001120000_analytics_guide_ai_test_generator.sql`)`). Cloudflare worker: no code change; it must be redeployed so its bundle includes the new guide.  
**Status:** Implemented; uncommitted and undeployed for review.  
**Related:** [2026-09-28-jee-mock-test-platform-guide.md](2026-09-28-jee-mock-test-platform-guide.md), [2026-09-28-cbt-exam-software-guide.md](2026-09-28-cbt-exam-software-guide.md) (same content model and worker path)

---

## 1. Summary

A long-form guide at **https://testoza.com/neet-online-test-software** for NEET faculty, coaching institutes and aspirants, targeting "NEET online test software", "NEET mock test software", "NEET test series software", "online test platform for NEET coaching", "NEET CBT mock test", "NEET 2027 computer based test" and "NEET negative marking".

- **Hook:** ~20 lakh candidates; in the 500–600 band about 800 candidates per mark (NTA's own result figures), so one wrong answer that should have been right costs ~4,000 ranks. And the exam's format is in question (2026 leak, proposed move to CBT).
- **Sections (9 + FAQ):** the paper and its formats (+ time planner) · OMR vs CBT, with the 2026 timeline · statement / assertion–reason / match-list / diagram formats on screen (+ playable mini-mock) · building papers from NCERT pages with AI (+ processing-screen replay) · running a test series (+ teacher analysis replica) · the +4/−1 guessing arithmetic (+ score and guessing calculator) · what aspirants get (+ results page replica) · buying checklist · honest limits · 12 FAQs · closing paths.
- **Length:** ~4,500 words of visible text; 5,600 words in the JSON-LD count and 5,800 in the crawler HTML (widget fallbacks add the mini-mock's questions and answers).

## 2. Design: a new shell, not GuidePage

The user's feedback on the earlier guides: type too large, product animations that didn't match the real product, and an iOS look that wasn't organised enough. This page therefore has its own shell and stylesheet and leaves `GuidePage.tsx` / `guidePage.css` and the other guides untouched.

| | Earlier guides | This guide |
|---|---|---|
| Type | Outfit; body 17.5px / 1.78; H2 up to 37.6px; H1 up to 54px | System font (SF on Apple, Inter elsewhere, loaded only where SF is missing); body 16px / 1.65; H2 24–30px; H1 31–44px |
| Hero | Dark navy | Light, apple.com-style; iPhone in Safari |
| Navigation | Horizontal segmented control | Frosted chapter bar: progress ring, "3/11" + current section title, Contents menu; "In this guide" grouped list after the short answer |
| Lists, tables | Coloured gradient badges | iOS grouped inset lists with hairlines; tables become cards on phones |
| Product replicas | Hand-drawn CSS imitations | The product's own Tailwind classes, `buttonVariants`, icons and (for AI import) its own stylesheet and formatters |
| Motion | Sheens, spinning borders | iOS springs only; everything still under reduced motion |

**Why the replicas now match the product:** they copy the class strings from `TestPage.tsx`, `ResultsPage.tsx`, `ResultsLayout.tsx` and `FullTestAnalysisPage.tsx`, resolved per layout. Tailwind's `sm:`/`md:`/`lg:` prefixes follow the browser window, not the replica, so a phone drawn on a desktop page would otherwise pick up desktop variants; `ExamScreen` takes `layout="phone" | "desktop"` and writes each layout's classes explicitly. Device screens always render light (`.ng-screen` resets the theme tokens), like screenshots. The AI processing replay imports `components/ai-import/aiImport.css` and `progressModel`'s `formatClock`/`formatDuration`; a transformed frame keeps its `position: fixed` mini-status inside the window.

| Piece | File | What it shows |
|---|---|---|
| Hero | `NeetHero.tsx` | iPhone (status bar, Dynamic Island, iOS Safari bar) running the exam screen through the last minutes of a 180-question mock: answer a marked Botany question, answer the mitochondrion diagram question, open the palette sheet (scrolls to Zoology), answer the last red question, Submit Test? summary with section breakdown, results page. Numbers agree end to end: 168 answered, 12 unanswered; 153 right, 15 wrong → 597/720. Caption + page dots explain each scene. |
| Time planner | `NeetWidgets.tsx` | 3 h / 3 h 15 min, subject order, iOS sliders; seconds per question, clock times from 2:00 p.m., review buffer or "over by". |
| **Playable mini-mock** | `ExamDemo.tsx` (+ `ExamScreen.tsx`) | The real pre-exam screen, then six NEET-style questions (assertion–reason, numerical, match list, Statement I/II, diagram, "incorrect") in 6 minutes with TestPage's behaviour (answering, Save & Next, Review / Ans & Review / phone flag, palette states, hideable timer, last-question toast, Time's Up, Submit summary), then the results page and an answer review with time per question. Desktop layout (palette on the right) in a browser window at ≥ 860px; phone layout at real size below. |
| AI import | `AiImportDemo.tsx` | ProcessingView replayed: 3 photographed NCERT photosynthesis pages → 6 NEET-style questions arriving live, stages, %, elapsed, done card. Sped up (caption says so). |
| Batch analysis | `NeetWidgets.tsx` | FullTestAnalysisPage's metric tiles and "Item Response & Distractor Misconception Audit" (expandable rows, option breakdown, Full Distractor Audit modal). Example batch. |
| Score lab | `NeetWidgets.tsx` | Score: attempted + accuracy → 4R − W with ring and NTA 2026 context lines. Guessing: unsure count, options ruled out, hit rate (break-even marker at 20%) → expected marks and the binomial chance the guesses lose marks. |
| Student result | `ResultsScreen.tsx` | ResultsPage overview: score card, subject chips, correct/wrong/partial/skipped, Predict your rank, Subject-Wise Split. |

Shared helpers live in `examUtils.ts`; the six questions in `src/guides/neetMiniMock.ts`, which both the demo and the crawler text read.

## 3. Content accuracy

**Exam facts (checked 1 October 2026; sources on the page):**

| Fact | Source |
|---|---|
| Re-exam 21 June 2026: close to 20 lakh appeared, 11.21 lakh qualified; 13 languages; OMR; 90,780 ≥ 500, 10,160 ≥ 600, 1,492 ≥ 650, 19 > 700 | NTA press release, 16 July 2026 |
| 3 May exam cancelled 12 May (guess paper, up to 120 of 180 questions) | Medical Dialogues; Wikipedia |
| Pradhan, 15 May: "From next year, the NEET examination will happen in CBT … mode" | The Quint |
| 5 Aug affidavit: CBT "under active consideration", Nilekani task force, adequate notice | Careers360; Outlook |
| 30 Sept: task force report still awaited; national CBT infrastructure strategy being drafted | Telangana Today |
| Re-exam 2:00–5:15 p.m. (15 minutes added) | Careers360 |
| Biology in the re-exam: 8 statement, 8 match-the-column, 5 assertion–reason, 11 "incorrect", 14 fill-in-the-blanks | ALLEN analysis |
| 180 compulsory questions from 2025; 2021–2024 Section B, 200 questions / 200 minutes | NTA notice, 25 Jan 2025 (Careers360) |

**Product claims (checked against the code):** Standard Mode default and its controls (`TestPage.tsx`, `TestSettingsPanel.tsx`); answers on device + 2-minute sync + resume for signed-in students; tables with a full-screen button (`LatexRenderer.tsx`); option images; AI modes, difficulty, languages, separate answer-key upload, review screen with "still need an answer", Generate more, Edit, Save & continue (`AITestImporter.tsx`, `components/ai-import`); teacher analysis tiles, quadrant (accuracy ≥ 60%, time vs median), per-question accuracy / option split / avg time / discrimination (top vs bottom 27%) (`FullTestAnalysisPage.tsx`); results, time-matrix quadrants, rank predictor for tests tagged NEET (`ResultsPage.tsx`, `BehavioralTimeMatrix.tsx`).

**Not claimed:** OMR printing or scanning (stated as a limit); verified support for every NEET language (stated as a limit); anything about NEET 2027's final format.

## 4. Product findings worth a follow-up (not changed)

1. **Dark mode in the exam screen (from reading the code, not reproduced live):** unselected option cards in `TestPage.tsx` are `bg-white` with no `dark:` variant, while their text is `dark:text-slate-200/300`, and the exam doesn't force light mode, so in dark mode options would show light text on white. Adding `dark:bg-slate-900 dark:border-slate-700` to the unselected state would fix it.
2. **"Split" label:** `ResultsPage.tsx` line ~800 labels the skipped count in each Subject-Wise Split card "Split". The replica says "Skipped", which is clearly what was meant.
3. **CBT guide wording:** `/cbt-exam-software` says NEET-UG "is set to leave OMR sheets for computers in 2027". Since the 5 August affidavit, that's overstated ("under active consideration"). Left untouched as asked; worth a one-line edit.

## 5. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint: new files clean; `App.tsx` keeps its 3 existing `any` errors.
- `vite build`: page chunk 34 KB brotli JS + 8.5 KB CSS; no KaTeX.
- `wrangler deploy --dry-run --env production`: 289 KiB (92 KiB gzip); bundle contains the guide.
- Crawler harness (bundled `guides/worker.ts`): one H1; JSON-LD Article + FAQPage (12) + BreadcrumbList; 5,601 words; no control characters; all sections; internal links valid; other guides still exported.
- Playwright (Chromium; 1440 desktop, iPhone 13, dark, reduced motion): one H1, no horizontal overflow, no page errors. Mini-mock played on both layouts: A right, C wrong + review, skip, A right, jump via palette (sheet on phone), C right, D right → toast on last Save & Next, summary 6/5/1/1, score 15/24. Score lab 597; guessing +5.0 / +13.0 / −10.0; planner over-budget and labels; Contents menu jumps and closes; reduced motion shows all sections and a still hero. Earlier guides (/jee-mock-test-platform, /cbt-exam-software, /best-online-test-platform, /create-mock-test-online) render unchanged.
- Cover: `frontend/public/guides/neet-online-test-software/cover.png`, 1200×630, made from the hero phone.

## 6. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. Deploy the frontend (Cloudflare Pages builds from `main`).
3. Deploy the backend (live sitemap).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
5. Run `supabase/migrations/20261001130000_analytics_guides_neet.sql` (after the AI test generator guide's `20261001120000_analytics_guide_ai_test_generator.sql`)` in the Supabase SQL editor.
6. Check `https://testoza.com/neet-online-test-software` stays on testoza.com and view-source contains "OMR today, a computer screen tomorrow".
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
