# testoza.com/ai-test-generator — AI test generator guide

**Date:** 2026-10-01  
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/`, `App.tsx`, `Footer.tsx`, `UserGuidePage.tsx`, sitemaps, `llms*.txt`, cover), backend (`app/routers/sitemap.py`), Supabase (`20261001120000_analytics_guide_ai_test_generator.sql`). The Cloudflare worker needs no code change (guides are served from `GUIDES`) but must be redeployed to include the new guide.  
**Status:** Implemented on `claude/great-hopper-iohp7l`; not deployed.  
**Related:** [2026-09-28-jee-mock-test-platform-guide.md](2026-09-28-jee-mock-test-platform-guide.md), [2026-09-28-cbt-exam-software-guide.md](2026-09-28-cbt-exam-software-guide.md) (same content model)

---

## 1. Summary

A long-form guide at **https://testoza.com/ai-test-generator** (5,139 words including widget fallbacks, 13 FAQs) targeting "AI test generator", "AI test generator from PDF", "AI question paper generator", "create test from PDF with AI", "Hindi / bilingual question paper generator" and related searches.

- **Sections:** what an AI test generator does (vs a chatbot and a question bank) · Extract vs Generate · how it works, step by step, and under the hood · the settings (language, difficulty, custom instructions, High Accuracy / Fast Mode) · what it reads (types, maths, chemistry, diagrams, passages, Hindi; Fill from photo for single handwritten questions) · the two-minute review check · teachers · coaching institutes · students (with the testing-effect research) · time saved · how to judge any AI test generator · honest limits · FAQ · closing paths.
- Content uses the shared guide model (`src/guides/types.ts`), so crawler HTML, JSON-LD (Article, FAQPage, BreadcrumbList), sitemaps, `MARKETING_PATHS` and the layout's no-sidebar rule all pick it up as before.

## 2. Design — what is different from the earlier guides

The owner's feedback on the earlier guides: fonts a bit large, the product animations not quite like the product, not organised enough. This page therefore has **its own shell** (`AiTestGenerator.tsx` + `aiTestGenerator.css`) instead of `GuidePage`; the earlier guides are untouched.

| Area | Earlier guides | This guide |
|---|---|---|
| Type scale | Outfit, H1 up to 54 px / 800, body 17.5 px | System font (SF Pro on Apple devices), H1 32–44 px / 700, H2 26–30 px, body 16 px, H3 19 px / 600 |
| Navigation | Horizontally scrolling segmented control, floating CTA | Apple-style frosted **local nav** (sticky under the site nav): title, an iOS pull-down **Contents** menu naming the section being read, a reading-progress ring and a "Try it free" pill |
| Structure | Dark hero, mixed widths | One 680 px reading column; widgets break out to 1000 px; every section opens with an iOS Settings-style icon tile and a coloured kicker; contents, lists, tables and FAQ are inset grouped lists |
| Product animation | Hand-drawn approximations | The hero phone and the widgets render **the product's own markup and stylesheet** (`components/ai-import/aiImport.css`, `.aix-*`); the settings screen (Tailwind in the product) is reproduced value for value |

### Hero (`AtgHero.tsx`)

An iPhone (status bar, Dynamic Island, Safari address bar showing app.testoza.com, the app's mobile navbar) running `/generate-with-ai` in three scenes, driven by one clock (a pure function of time per scene; pauses off screen and in hidden tabs):

1. **Settings** — AITestImporter step 2: file card (High Accuracy · Add File · Clear All), answer-key row, AI Settings & Constraints. Touches pick English, then Hindi (the *Bilingual* badge appears), then Moderate; the instruction "20 questions. 4 marks each, −1 for a wrong answer." is typed; the screen scrolls to the mode cards and Generate is tapped.
2. **Live** — ProcessingView: purple app icon with sheen, percent, elapsed clock, document map (Step 1–3 of 3), stats, the four stages with spinner/check pops and per-stage times, the note and Stop button; then the live feed with 20 bilingual questions rising in, the question-shaped throbber, and the compact live bar dropping in once the status card scrolls away; ends with "20 questions ready".
3. **Review** — PreviewView: "Generated with AI", the four summary widgets, toolbar, question cards, sticky action bar; Save & continue → "Saving…" → the real toast text "Test saved successfully!".

Timings are compressed 8× and say so ("Processing sped up"). Scene dots with progress and a play/pause button sit under the phone. Reduced motion: no autoplay; a still review screen, dots switch to still frames.

### Widgets (`AtgWidgets.tsx`)

| Widget | Behaviour |
|---|---|
| `material-picker` | iPad-style split view: what you have (old paper, chapter, DPP, one question, YouTube lecture, Word/PowerPoint) → mode or tool, steps and a link |
| `mode-compare` | Segmented Extract / Generate: a printed paper or textbook page, a scan line, then live-feed cards. Extract keeps Q7 with B from the key and flags Q8 (not in the key); Generate writes a trolley MCQ, a numerical and a multiple-correct question |
| `settings-lab` | The product's AI Settings card with working chips (same toggle rules as the product); the sample question changes with language (English / Hindi / bilingual) and difficulty (Easy / Moderate / Tough), with why it is that hard; instruction presets |
| `review-screen` | A working copy of the review screen in a window: widgets, Needs answer / Diagrams filters, search, Raw (shows the LaTeX), passage, a velocity–time diagram, banner, jump sheet, action bar (buttons explain it is a copy) |
| `time-saved` | iOS sliders for questions per week and minutes per question; hours by hand vs with AI, with the assumptions printed |

Sample answers are worked out in `atgData.ts`. Replica screen titles are `div`s, so the page has exactly one H1.

## 3. Content accuracy (checked against the code)

| Claim | Source |
|---|---|
| PDF, PNG, JPG, WEBP; several files; optional answer key; drag and drop; images compressed on the device | `pages/AITestImporter.tsx`; `backend/app/routers/ai.py` (`valid_extensions`) |
| Word/PowerPoint must be saved as PDF first | Backend rejects anything but `.pdf .png .jpg .jpeg .webp` (see §5) |
| Same as material / English / Hindi / both (bilingual: English then Hindi on the next line); Easy / Moderate / Tough, default Tough, generate only; custom instructions followed strictly | `AITestImporter.tsx`; `pdf_vision_pipeline.py` `build_prompt` |
| High Accuracy (stateful, default) vs Fast Mode (parallel) | `AITestImporter.tsx` (`algorithm` state) |
| Extract: exact wording and digits, cross-page questions joined, passages with `groupId`, match-the-following as arrays, answers only from keys or marks, never guessed; solution diagrams skipped; diagrams cropped | `EXTRACT_PROMPT`, `figure_crops.py`, `hybrid_pipeline.py` |
| Generate: usually 15–25 questions, misconception distractors, title, description, revision notes | `GENERATE_PROMPT`; revision notes shown on `TestIntroPage.tsx` |
| Digital PDF text read directly; scanned pages rendered for vision at 150 / 200 / 300 DPI by scan quality | `hybrid_pipeline.py`, `quality_analyzer.py` |
| Four stages, percent, clock, estimate, live feed, tab title, Stop | `ProcessingView.tsx`, `progressModel.ts` |
| Review: widgets, Needs answer / Diagrams filters, search, jump grid, Raw, Generate more, Edit, Save & continue | `PreviewView.tsx` |
| Saved test is private, duration = one minute per question; a missing answer is stored as "A" | `handleDirectSave` in `AITestImporter.tsx` |
| Fill from photo: one question, printed or handwritten, answer only when marked, diagram cropped | `/ai/read-question` in `ai.py` |
| Sign-in required; 30 runs per user per hour; a stream is capped at 600 s | `ai.py`, `app/utils/rate_limiter.py` (`ai_heavy_per_user`) |
| AI generation included on the free plan | `PricingPage.tsx` |
| Students need no account unless the test requires sign-in; results show time per question and an AI chat | `TestIntroPage.tsx` (`login_required`), `ResultsPage.tsx` |

**Research cited:** Roediger & Karpicke (2006), *Psychological Science* (practice testing beats rereading a week later); Dunlosky et al. (2013), *PSPI* (practice testing rated high utility); Haladyna, Downing & Rodriguez (2002), *Applied Measurement in Education* (plausible distractors).

## 4. Also changed

- **User guide → "AI Test Generation"** said the generator was "Private Beta … scheduled to release in the next major system update". It now has five accurate steps and a link to this guide.
- Footer (Solutions → "AI test generator guide"), `generateSitemap.js`, `public/sitemap.xml`, `public/sitemap/static.xml`, backend `sitemap.py`, `llms.txt`, `llms-full.txt`.
- `analytics_landing_type()` gains `ai-test-generator` (new migration; apply in the Supabase SQL editor).

## 5. Product findings worth a follow-up (not changed)

1. **Word and PowerPoint uploads fail.** The picker accepts `.doc .docx .ppt .pptx` and the upload card says "PDF, Word, or Photos", but `/ai/parse-stream` returns 400 for anything but PDF and images. Either convert on the server or stop offering them. The best-online-test-platform and JEE guides (and `llms-full.txt`) also say Word/PowerPoint work; this guide does not.
2. **Missing answers are saved as option A.** `handleDirectSave` maps `correctAnswer: q.correctAnswer || 'A'`, so "Save & continue" with orange questions silently keys them as A. A confirmation, or saving them as unanswered, would be safer. This guide warns readers.

## 6. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint: new and changed files clean.
- `vite build`: guide chunk 27.8 KB brotli JS + 8.6 KB CSS, loaded only on the route.
- Worker: `infrastructure/cloudflare-worker/worker.js` bundles with esbuild; `GUIDES` lists the new guide first; crawler HTML has one H1, 17 H2, all 12 sections, FAQ ×13, balanced tags, no control characters; JSON-LD Article + FAQPage + BreadcrumbList, 5,139 words. Title 59 characters with " | TestoZa", description 157.
- Playwright (Chromium; 1440 × 900, 1280 × 860, iPhone-size 390 × 844, dark, reduced motion): 32/32 checks — one H1, canonical, hero reaches live and review scenes and the toast, mode compare, settings lab (Hindi, bilingual badge, Tough), review replica (8 cards, Needs answer = 2, Diagrams = 1 with the graph, search, Raw shows LaTeX, jump sheet, copy toast), picker, time slider (60 × 3 min → 2 h 24 min saved; 100 → 4 h), contents menu (13 items, jumps with the heading below the sticky navs, label follows), no horizontal overflow on mobile, reduced motion shows still frames and every section; no page errors.
- Cover: `frontend/public/guides/ai-test-generator/cover.png`, 1200 × 630, rendered from the real hero phone.

## 7. Deployment

1. Merge the frontend repo and the root repo branches.
2. Deploy the frontend (Cloudflare Pages builds from `main`) and the backend (for the sitemap).
3. Redeploy the worker so its bundle contains the new guide: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
4. Run `supabase/migrations/20261001120000_analytics_guide_ai_test_generator.sql` in the Supabase SQL editor.
5. Check `https://testoza.com/ai-test-generator` stays on testoza.com and view-source contains "Extract or Generate: two different jobs".
6. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
