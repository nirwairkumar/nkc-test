# testoza.com/jee-mock-test-platform — JEE guide with a working Sy Pad

**Date:** 2026-09-28  
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/`, `App.tsx`, `Footer.tsx`, `UserGuidePage.tsx`, `utils/subdomain.ts`, sitemaps, `llms*.txt`), backend (`app/routers/sitemap.py`), Cloudflare worker (`worker.js`: header fix only; guides are served from `GUIDES`, so it must be redeployed to include the new guide), Supabase (`20260928120000_analytics_guides_jee.sql`).  
**Status:** Implemented; uncommitted and undeployed for review.  
**Related:** [2026-09-28-cbt-exam-software-guide.md](2026-09-28-cbt-exam-software-guide.md), [2026-09-27-best-online-test-platform-guide.md](2026-09-27-best-online-test-platform-guide.md) (same guide system)

---

## 1. Summary

A long-form guide at **https://testoza.com/jee-mock-test-platform** for JEE faculty, coaching institutes and aspirants, targeting "JEE mock test platform", "JEE Main mock test platform", "create JEE mock test online", "type chemical equations in online test" and related searches.

- **Hook:** the hard part of putting JEE papers online is the notation (integrals, determinants, ions, reaction arrows). Institutes pay the one LaTeX person, upload screenshots, or drop hard questions.
- **Sections:** what a JEE mock has to reproduce (JEE Main and Advanced patterns; notation, screen, marking, analysis) · LaTeX / KaTeX / mhchem in plain words · AI import (Extract, Generate, languages, Fill from photo) · **the Sy Pad** (working demo, where it is, step by step, chemistry mode, words/tables, safety nets, LaTeX users) · building a 75-question JEE Main mock step by step (+ JEE Advanced as a combined test) · marking, including where JEE Advanced partial marks differ · what institutes get · what students get · honest limits · 11 FAQs · closing paths.
- Hero secondary button "Try the Sy Pad on this page" scrolls to `#sy-pad` (GuidePage now renders `#…` secondary CTAs as plain anchors).

## 2. Design

Shared guide design system (navy hero, sky/indigo, Outfit, iOS patterns) plus:

| Element | Behaviour |
|---|---|
| Hero laptop (`JeeHero.tsx`) | A tilted laptop runs the test builder. Loop: Question 61 → Fill from photo → a handwritten integral question is scanned → the card fills with the typeset question and options, option A ticked with the real "Filled from your photo" banner. Then Question 33 → Maths & symbols → the Sy Pad slides up → Chemistry → Formula → `MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O` is typed and drawn live → Insert → it lands in the question. Real key layout from `keys.ts`. Drawn at 820 px and scaled. |
| Notation table (`notation-table`) | Eight JEE items (integral, limit, 3×3 determinant, Coulomb's law, redox, equilibrium, complex ion, heat over the arrow): subject, the Sy Pad keys you press, the rendered result, and an iOS switch that shows/hides "the code written for you". Codes are exactly what the pad produces for those presses. |
| AI before/after (`ai-before-after`) | Segmented: the PDF page → a typical copy-paste (lost subscripts, split fractions) → TestoZa's extracted card (typeset) → the LaTeX/mhchem the AI wrote. Auto-advances in view until touched. |
| **Sy Pad playground** (`sypad-playground`, `SyPadPlayground.tsx`) | A working pad: real keys (`keys.ts`), real editing rules (`mathSyntax.ts`: smart backspace, slots, finalize), real preview (`previewTex.ts`, click-to-place caret), Insert/Copy checks (empty blue boxes, unfinished formula, "Insert anyway"), How-to table, abc keyboard, Words key, 123 pane switch on phones. Insert drops `$…$` into a sample question card that shows both the stored text and the preview. Three "Watch it build" demos replay real key presses (definite integral, redox half-reaction, Coulomb's law) with keys lighting up. Tables insert a starting grid (the builder opens a grid editor first — said in the caption). |
| Partial-marks lab (`partial-marks`) | Toggle the answer key and the student's picks (A–D); shows JEE Advanced's score (+4 all, +1 per correct option otherwise, −2 any wrong) next to TestoZa's (marks × picked ÷ correct), with presets and a same/differs verdict. |
| Batch report (`batch-report`) | Dark dashboard with example data: rank list (score = 4 × correct − wrong, attempts ≤ 75), subject averages, and the three hardest questions with the batch's option split (correct green, most-picked wrong option orange) and what it tells the teacher. |

KaTeX loads lazily (`jeeKatexBundle.ts` via `jeeTex.tsx`) so the guide's text never waits for the ~75 KB `vendor-katex` chunk; formulas show a plain-text fallback until it arrives. Reduced motion: hero shows the pad with the finished formula; auto-advancing widgets hold still. Dark mode supported (the playground gets a dark keyboard).

## 3. Also fixed

- **Guides were bounced off testoza.com.** `utils/subdomain.ts` `MARKETING_PATHS` listed `/create-mock-test-online` but not `/best-online-test-platform` or `/cbt-exam-software`, so `SubdomainGuard` JS-redirected human visitors of those guides to app.testoza.com (crawlers were unaffected). The list now spreads `GUIDE_METAS.map(g => g.path)`, which covers the new guide and any future one.
- **Live sitemap.** `backend/app/routers/sitemap.py` (what testoza.com/sitemap.xml serves) lacked both earlier guides; all three are now listed.
- **Analytics.** `analytics_landing_type()` counted only `/create-mock-test-online` as a Marketing landing; the new migration adds all three guide paths. Apply it in the Supabase SQL editor.
- **Worker: doubled headers.** `worker.js` built responses with `{...Object.fromEntries(origin.headers), 'Content-Type': …}`; the origin's lowercase `content-type` survived next to ours and Headers joined them (`text/html; charset=utf-8, text/html; charset=utf-8`, same for `Cache-Control`). Clients that can't parse that fall back to Latin-1 (PowerShell showed the homepage title as "TestoZa â€“ …"), and local `HTMLRewriter` refuses the response. A `mergeHeaders()` helper now sets overrides on a copy of the headers at all five places.
- **Found live (fixed by the next worker deploy):** on 2026-09-28 Googlebot got the *homepage* for `https://testoza.com/cbt-exam-software`: the deployed worker predates the CBT guide. `/best-online-test-platform` and `/create-mock-test-online` were served correctly.

## 4. Content accuracy (checked against the code)

| Claim | Source |
|---|---|
| Sy Pad entry points: "Maths & symbols" under each question, "Open Sy Pad" in the ⋯ menu, "Sy Pad" under Create Test in the sidebar (builder page only) | `test-builder/QuestionCard.tsx`, `TestBuilder.tsx`, `AppSidebar.tsx` |
| Docks at the bottom, lifts the target box into view, drag the top bar, double-click to dock, Done / Esc | `math-keyboard/MathKeyboard.tsx` |
| "Goes into Question 3 · Option B"; tabs Algebra … Tables; 123 pane on phones; Words key; blue boxes; live preview with click-to-caret; Insert/Copy with `$…$`; empty-box and unfinished-formula notices with "Insert anyway"; smart delete; paired braces; "keep typing…"; How-to rows | `MathKeyboard.tsx`, `keys.ts`, `mathSyntax.ts`, `previewTex.ts` |
| Chemistry keys (Formula `\ce{}`, ⇌, arrow with boxes, gas/precipitate, states, Ka, Kb, pH, mol); green "Chemistry" hint | `keys.ts`, `MathKeyboard.tsx` |
| Tables: Headered, Grid, Match List (P/Q/R/S · 1/2/3/4), Simple List, Matrix, Determinant, Empty Grid | `keys.ts`, `TableEditor.tsx` |
| Question boxes preview `$…$` live | `ui/IMEInput.tsx` (`livePreview`) |
| AI: PDF/Word/PowerPoint/photos; Extract vs Generate; Same as material/English/Hindi/both; Easy/Moderate/Tough; custom instructions; LaTeX + mhchem in prompts | `pages/AITestImporter.tsx`, `backend/ai_preview_importer/pdf_vision_pipeline.py` |
| Fill from photo: printed or handwritten, answer only from a mark or "Ans:" line, never solved, diagram cropped | `backend/app/routers/ai.py` (`PHOTO_QUESTION_PROMPT`), `lib/photoQuestionApi.ts`, `QuestionCard.tsx` banner |
| Numerical: range or exact value(s); Hindi typing with English letters | `QuestionCard.tsx` |
| Marks test > section > question; fractions; multi-correct = marks × picked ÷ correct, any wrong → negative; attempt control first N / best N | `backend/app/services/scoring.py` |
| Teacher analysis: rank list, per-question accuracy, average time, option (distractor) split, discrimination index | `pages/FullTestAnalysisPage.tsx` |
| Student results: correct/wrong/partial/skipped, time per question, AI mentor, rank predictor for tests tagged JEE Main/Advanced, retake | `pages/ResultsPage.tsx` |

**Not claimed:** per-section timers; exact JEE Advanced +1/+2/+3 partial marking (stated as a limit, with the widget); topic-wise batch breakdowns (they only appear when questions carry a `topic`, which the builder and AI don't set).

**Exam facts (September 2026, sources on the page):** JEE Main Paper 1: 75 questions / 300 marks / 3 h, 20 MCQ + 5 numerical per subject, all compulsory since 2025; +4, −1 for wrong MCQs; numerical negative marking left to the bulletin (sources disagree; NTA added it by clarification in 2022). 13,04,653 candidates sat the January 2026 session (Careers360 report of NTA data). JEE Advanced: two compulsory 3-hour papers; multi-correct +4 / +3 / +2 / +1 / 0 / −2; numerical answers to two decimals.

## 5. Product findings worth a follow-up (not changed)

1. **JEE Advanced partial marking.** `scoring.py` gives `marks × picked ÷ correct`; JEE Advanced gives +1 per correct option picked (+4 for all). A per-question "JEE Advanced partial" mode would make TestoZa exact for JEE Advanced and let the guide drop its first limit.
2. **Words in Sy Pad table cells.** `TableEditor.tableToLatex` puts cell text straight into `\begin{array}`, so plain words in a Match List cell ("Kinetic energy") render as run-together italics. Wrapping plain-text cells in `\text{}` (as the arrow type already does) would fix it.
3. **`[?]` placeholders aren't counted as empty.** The Sy Pad's `SLOT` regex doesn't treat `[` as a delimiter, so the reaction arrow's lower box `\xrightarrow[?]{…}` can be inserted with a literal "?" under the arrow and no warning.

## 6. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint: all new/changed frontend files clean (`App.tsx`'s 3 existing `any` errors unchanged).
- `vite build`: guide chunk 22 KB brotli JS + 7.7 KB CSS; KaTeX (`vendor-katex`), mhchem and `previewTex` load only through the dynamic `jeeKatexBundle` import; the page chunk statically pulls just `keys` and `mathSyntax`.
- `wrangler deploy --dry-run --env production`: 245 KiB (78 KiB gzip).
- Guide harness (bundled `guides/worker.ts`): H1, JSON-LD Article + FAQPage ×11 + BreadcrumbList, 4,889 words, no control characters (LaTeX escapes intact), all sections, 12 internal links, other guides still exported.
- `wrangler dev` against the Pages origin, as Googlebot: 17/17 — 200, title, one canonical, og:type article, cover, exactly one FAQPage, Article JSON-LD, H1 and full text in `<main>` (5,072 words), widget fallbacks, homepage copy replaced, CBT / best-platform / mock-test guides still served; single `Content-Type` and `Cache-Control` after the header fix.
- Playwright (Chromium; desktop 1440, iPhone 13, dark, reduced motion): one H1, no horizontal overflow, every section reveals, hero plays both scenes, notation table renders 8 formulas, the three Sy Pad demos build exactly `\int\limits_{0}^{\frac{\pi }{2}}{\sin ^{2}x\,dx}`, `\ce{MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O}` and `F=\frac{1}{4\pi \varepsilon_0 }\frac{q_{1}q_{2}}{r^{2}}`, Insert writes `$…$` into the card, empty boxes block Insert, typing fills the selected box, Match List and How-to work, partial-marks presets give +2 / +2.67, same, −2 / −2; phone shows the 123 pane. Dev-only noise, identical on the CBT guide: two FAQPage blocks (index.html's homepage `#schema-faq`, which the worker replaces) and "[API] Network error" (no local backend).
- Cover: `frontend/public/guides/jee-mock-test-platform/cover.png`, 1200×630, rendered with real KaTeX output.

## 7. Deployment

1. Review, then commit in the frontend and backend repositories (and the root repo, which tracks both).
2. Deploy the frontend (Cloudflare Pages builds from `main`).
3. Deploy the backend (for the sitemap).
4. Redeploy the worker so its bundle contains the new guide: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
5. Run `supabase/migrations/20260928120000_analytics_guides_jee.sql` in the Supabase SQL editor.
6. Check `https://testoza.com/jee-mock-test-platform` loads and stays on testoza.com; view-source contains "The Sy Pad: a maths and chemistry keyboard".
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
