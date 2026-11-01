# testoza.com/chemistry-question-paper-maker — a chemistry question paper maker guide built from reused demos

**Date:** 2026-10-05
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/chem/`, `components/math-keyboard/mathSyntax.ts`, `App.tsx`, `Footer.tsx`, sitemaps, `llms*.txt`, `public/guides/chemistry-question-paper-maker/`), backend (`app/routers/sitemap.py`), Supabase (`20261005120000_analytics_guide_chemistry_question_paper_maker.sql`), Cloudflare worker (redeploy only, to bundle the guide).
**Status:** Implemented; uncommitted and undeployed for review.
**Related:** [2026-10-04-math-test-maker-guide.md](2026-10-04-math-test-maker-guide.md) (the page this one forks)

---

## 1. Summary

A long-form guide at **https://testoza.com/chemistry-question-paper-maker** for chemistry teachers in schools (Classes 9–12), coaching institutes (NEET, JEE, CUET) and tutors. Targets "chemistry question paper maker", "chemistry test maker", "chemistry quiz maker", "chemistry exam creator", "online chemistry test", "chemical equation editor for online test", "how to type chemical formulas in an online test", "Google Forms chemical formulas", "mhchem", "NEET chemistry test", "JEE chemistry mock test", "CBSE chemistry question paper".

- **Angle:** in chemistry the small characters carry the meaning (2H vs H₂, CO vs Co, Fe²⁺ vs Fe³⁺, → vs ⇌, a catalyst on the arrow) and online forms flatten them. Proof from a real paper: copying CBSE's own 2026-27 Class 12 Chemistry sample paper gives "Fe2+ + Cr2O7 2-" and loses the arrow.
- **Sections (13 + FAQ):** why chemistry breaks in forms (+ one reaction, four ways) · four ways in (table) · from a PDF or photo (+ AI import) · the Sy Pad's Chemistry keys (+ working pad) · mhchem cheat sheet (+ demo, five habits) · structures and diagrams as pictures · question types incl. assertion–reason and match-the-column (+ pH range/exact lab) · marking for CBSE, NEET, JEE Main, CUET (table) · on a student's phone (+ exam with structure options) · after the test (+ option split) · compared with Forms (table) · ten mistakes · honest limits · 12 FAQs · closing paths.
- **Length:** ~6,700 words in the crawler HTML (6,584 by `guideWordCount`); read time 24 min.

## 2. Reuse, as the owner asked

Every demo is a fork of the maths guide's (`pages/guides/math/`), copied into `pages/guides/chem/` with this page's prefix (`cq-`) and stylesheet, then given chemistry content. The maths page is untouched.

Fork script rule (worth keeping): the maths prefix `mt-` collides with Tailwind's margin-top utilities, so the rename skips `mt-` followed by a digit, `auto`, `px` or `[` (the replicas use `mt-0.5`, `mt-2`, `mt-6`). The root class `className="mt"` / `.mt` is renamed separately.

| Demo here | Forked from (maths guide) | What changed |
|---|---|---|
| Hero (ChemHero) | MathHero | the product's own "Tables & chemistry" sample photo (`/sample-questions-showcase/chemistry-table-question.png`, a handwritten K<sub>sp</sub> question) is read and appears typeset; the table becomes four options; answer C (Q = 10⁻⁸ > 1.7 × 10⁻¹⁰). Photo card narrower and lower so the typeset question stays visible. |
| `chem-paste` | PasteDemo | CBSE 2026-27 SQP Q17(B)(II) "Fe²⁺ + Cr₂O₇²⁻ + H⁺ →": typed / copied from the PDF (verified copy output; the symbol-font arrow U+F0E0 shown as an empty box) / a real 1× screenshot (2,890 bytes) / mhchem (29 bytes) |
| `chem-ai-import` | AiImportDemo | worksheet (IUPAC name with the product's skeletal-structure sample cropped + Cr configuration), phone photo (K<sub>c</sub> expression, PCC), chapter (mole concept, molarity) |
| `chem-sypad` | SyPadDemo | opens on the Chemistry tab; replays: redox half-reaction, KClO₃ with MnO₂ and Δ on the arrow then the ↑ key, K<sub>c</sub> = [NH₃]²/([N₂][H₂]³); active tab scrolled into view; wider Chemistry key column so "Formula" fits |
| `chem-notation` | NotationDemo | 18 mhchem lines in three groups (formulas and ions; equations; units, nuclei and organic) |
| `chem-numerical` | NumericLab | pH of 0.002 M HCl (2.699… → 2.70): exact 2.70 = 2/6, + 2.699 = 3/6, range 2.69–2.70 = 4/6 (fair), 2.6–2.8 = 5/6 (passes 2.71) |
| `chem-exam` | ExamDemo + examScreen | six chemistry questions; Q3's options are four skeletal structures (C₅H₁₀ isomers, SVGs in `public/guides/chemistry-question-paper-maker/`) drawn with TestPage's option-image classes; Q4 numerical (10 mol O₂) |
| `chem-options` | OptionSplit | pH of 10⁻⁸ M HCl: 19/40 choose 8; badge "Hard" (FullTestAnalysisPage labels < 40% accuracy Hard) |

Data: `src/guides/chemData.ts` (every answer worked in a comment). Text and crawler fallbacks: `src/guides/chemistryQuestionPaperMaker.ts` (outside facts and product claims listed in its header).

## 3. Product fix shipped with this guide: the Sy Pad's ↑ (gas) key

The Chemistry tab's ↑ key writes `\ce{^}`, and typing `H2 ^` in a formula is mhchem's gas arrow. On **Insert/Copy**, `finalizeLatex` → `balanceLatex` gave every caret followed by `}` an empty group, so `\ce{^}` was saved as `\ce{^{}}`, which mhchem draws as **nothing**: the preview showed ↑, the saved question didn't.

| File | Change |
|---|---|
| `frontend/src/components/math-keyboard/mathSyntax.ts` | `balanceLatex` leaves a lone caret alone inside `\ce{}` (at the start or after a space) |

Checked with 12 cases (↑ kept and drawn for `\ce{^}`, `\ce{H2 ^}`, `\ce{H2}\ce{^}`; unchanged: `x^` → `x`, `\frac{x^}{2}` → `\frac{x^{}}{2}`, `\ce{Fe^}` → `\ce{Fe^{}}`, `\ce{SO4^2-}`, `\text{a ^}`), and in the page's pad (the inserted question shows 3O₂↑). Affects the builder, the JEE and maths guides' pads the same way (all import this module).

## 4. Screen size and type

| | How |
|---|---|
| Demo height | Title row + demo, measured: 1366 × 657 (543 px free under the bars): 400–512 px. iPhone 13 (550 free): 487–524 px. All centred; no horizontal page overflow; one H1. |
| Hero | photo card 214 px wide, 90 px from the bottom: sits between the typeset question and the scene caption at 1366 × 657 and on iPhone 13. |
| Type | inherited from the maths shell: body 16 px; H1 28–40; H2 21–26; lists 15; tables 14; captions 13. Replicas at natural size; only the hero phone is scaled. |

## 5. Content accuracy

**Outside facts (checked 5 October 2026, linked in Sources):** CBSE Class XII Chemistry SQP 2026-27 (official PDF): 70 marks, 3 h, 33 questions, Section A 16 MCQs (Q13–16 assertion–reason), "Use of log tables and calculators is not allowed"; copying Q17(B)(II) and Q25(II) out of it ("6 × 10–3 g"). CUET (UG) 2026 Information Bulletin (NTA): 50 compulsory questions, 60 minutes, +5/−1. NEET UG (45 chemistry of 180, +4/−1, 3 h) and JEE Main (20 + 5) as in the NEET and JEE guides. Google Forms: no sub/superscript editor (teacher blog); Microsoft Forms: can't type them (Microsoft Q&A, 2019); Math mode is for maths. PubChem Sketcher is free (NLM).

**Not claimed:** a structure editor, formula or name answers, step marking, 3D models, a printed paper from the test.

## 6. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint on new files + mathSyntax.ts: 0 errors (fast-refresh warnings, as in the other guides).
- Crawler harness (esbuild bundle of `guides/worker.ts`): one H1, 18 H2, 15 H3; tags balanced; no raw `<` in text; JSON-LD Article + FAQPage (12) + BreadcrumbList; title 55 characters with " | TestoZa", description 153.
- Playwright (Chromium; 1366 × 657 and iPhone 13), every demo used: paste (PDF box, 3× blur + dark, typeset sharp), import (structure figure loads, Raw shows mhchem), Sy Pad (three replays produce the expected code with live previews; Insert keeps ↑), numerical presets 2/3/4/5 of 6, exam answered fully = 24/24 with all four structure images loaded and the keypad typing 10, option split. No page errors (console errors were only the local backend being off).
- `vite build` not run here (run it before deploying).

## 7. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. Run `npm run build` once.
3. Deploy the backend (live sitemap), then the frontend (Cloudflare Pages builds from `main`).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production` (bundles the guide for crawlers).
5. Run `supabase/migrations/20261005120000_analytics_guide_chemistry_question_paper_maker.sql` in the Supabase SQL editor (the live function already has every earlier guide path; this adds one).
6. Check `https://testoza.com/chemistry-question-paper-maker` stays on testoza.com and view-source contains "Why chemistry papers break in online forms".
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.

## 8. Flagged, not fixed

- The maths guide's option-split row shows a "Medium" badge at 35% accuracy; the product labels anything under 40% "Hard".
