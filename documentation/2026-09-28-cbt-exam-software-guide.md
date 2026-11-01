# testoza.com/cbt-exam-software — animated, crawlable CBT guide

**Date:** 2026-09-28  
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/`, `App.tsx`, `Footer.tsx`, `UserGuidePage.tsx`, sitemaps, `llms*.txt`). The Cloudflare worker needs **no code change** — it serves every entry of `GUIDES` — but it must be redeployed so its bundle includes the new guide.  
**Status:** Implemented & verified locally (Vite build, `wrangler deploy --dry-run`, worker harness, Playwright).  
**Related:** [2026-09-27-best-online-test-platform-guide.md](2026-09-27-best-online-test-platform-guide.md) (same guide system)

---

## 1. Summary

A long-form guide at **https://testoza.com/cbt-exam-software** for coaching institutes, schools and teachers, targeting "CBT exam software", "computer based test software", "online CBT exam platform" and related searches.

- **Hook:** NEET-UG was pen-and-paper in 2026; in May 2026 NTA told the Supreme Court it will move to CBT from 2027 (sources on the page).
- **Sections:** what a CBT is and which exams use one (JEE Main, CUET UG, GATE, SSC CGL Tier 1, NEET-UG from 2027) · the CBT screen piece by piece and how TestoZa's Standard Mode matches it · screen habits students need · marking schemes (and how TestoZa marks) · running a CBT for a batch · computer lab vs phones · eight questions to ask any vendor · honest limits · 9 FAQs · closing calls to action.
- **Length:** 2,654 words (structured-data word count), 12-minute read. 10 internal links (AI generator, bulk upload, AI prompts, conduct-exam guide, pricing, mock test guide, best-platform guide, online exam software, proctoring, coaching).

## 2. Design

Shared guide design system (navy hero, sky/indigo, Outfit, iOS patterns) plus:

| Element | Behaviour |
|---|---|
| Hero tablet (`CbtTablet.tsx`) | A tilted tablet runs TestoZa's Standard Mode exam screen: answer + Save & Next, Ans & Review, Review, a skipped question, a palette jump to a numerical question typed on the virtual keypad, then "Time's Up!" and a server-scored summary. Palette states and legend counts update live. Drawn at 720 px and scaled to fit. |
| OMR → CBT (`omr-to-cbt`) | A pencil fills OMR bubbles while the CBT palette saves the same answers ("Q2 saved"). |
| Marking lab (`marking-lab`) | iOS segmented control (JEE Main MCQs, NEET-UG, CUET UG, SSC CGL, GATE 2-mark MCQs), iOS steppers for correct/wrong, animated score, formula, earned/lost bar. |
| Exam day (`exam-day`) | iOS slider + swipeable scroll-snap cards: day before → settings → go live → during → time's up → results. Auto-plays once in view until the reader interacts. |
| Content lists | Exam cards with CBT chips, numbered habit cards, limits list with "!" markers. |

Reduced motion shows still states; no horizontal overflow at 390 px; dark mode supported.

## 3. Refactor: one page shell for all guides

`BestOnlineTestPlatform.tsx` was turned into a shared **`GuidePage.tsx`** (SEO head, hero, segmented nav, short answer, sections, FAQ, closing, sources, floating CTA). Each guide passes its hero visual, widgets (`renderWidget`, so each chunk only carries its own animations), secondary CTA and key phrase. `bestOnlineTestPlatform.css` → **`guidePage.css`** (shared); `cbtExamSoftware.css` holds the CBT-only styles.

`src/guides` additions: `GuideWidget` gains `omr-to-cbt | marking-lab | exam-day`; optional `meta.cta` and `body.closingTitle` (defaults keep the first guide's output unchanged); `CBT_META`; `cbtExamSoftware.ts`; `GUIDES` now `[CBT_EXAM_SOFTWARE, BEST_ONLINE_TEST_PLATFORM]`.

## 4. Content accuracy (checked against the code)

| Claim | Source |
|---|---|
| Standard Mode default ("traditional JEE / NEET / government exam format with right-side question palette"); Modern Mode in settings (paid) | `TestSettingsPanel.tsx`, `TestPage.tsx` (`exam_interface_mode`) |
| Palette: Not Visited, Not Answered, Answered, Review, Ans & Review; buttons Back, Clear, Review, Ans & Review, Save & Next | `TestPage.tsx` |
| Virtual numeric keypad 0–9, ".", "−", AC, backspace | `components/test/VirtualNumericPad.tsx` |
| Optional scientific calculator per test | `has_scientific_calculator` (`TestBuilder.tsx`, `TestPage.tsx`) |
| A−/A+ text size 12–32 px | `TestPage.tsx` |
| Violation modes: warn only / limit / strict auto-submit | `TestPage.tsx` `handleViolation` |
| Time up: answering locks, non-dismissible "Time's Up!" asks to submit (no automatic submit) | `TestPage.tsx` |
| Resume prompt for signed-in students; connection indicator | `TestPage.tsx` |
| Server-side scoring; marks precedence question > section > test; fractions ("1/3"); numerical min–max range; proportional partial credit, any wrong option → negative; attempt control hard / soft (best N or first N) | `backend/app/services/scoring.py`, `attempt_control.py` |
| Hold results → "submitted" page; visible once switched on | `show_results_immediate` (`TestPage.tsx`, `TestHistory.tsx`) |
| Combined tests with a timed break (30 min default) | `CreateCombinedTestPage.tsx` |
| JSON bulk upload with sections and solutions; AI prompts page | `TestUploadFormatGuide.tsx`, user guide |

**Not claimed** (not in the code): per-section timers, server-side time validation (`strict_timer` is stored but nothing enforces it), QR codes.

**Exam facts** (September 2026, sources listed on the page): JEE Main 20 MCQ + 5 numerical per subject, all compulsory, +4 / −1 on MCQs (numerical negative marking left unstated — sources disagree); CUET UG CBT only, +5 / −1; GATE MCQ −1/3 or −2/3, none on MSQ/NAT, virtual calculator; SSC CGL Tier 1 100 Q / 200 marks / 60 min, −0.5; NEET-UG 180 Q, +4 / −1, OMR in 2026, CBT from 2027 per NTA.

## 5. Verification

- `tsc`: no new errors (4 existing). ESLint: new/changed files clean.
- `vite build`: CBT chunk 11.5 KB brotli JS + 4.5 KB CSS; shared `GuidePage` 3.3 KB + 7.6 KB CSS; guide text only in its chunk; cover in `dist/guides/cbt-exam-software/`.
- `wrangler deploy --dry-run --env production`: 205.5 KiB (65.9 KiB gzip).
- Worker harness: 19/19 CBT checks (200, title, one canonical, article meta, JSON-LD Article + FAQPage ×9 + BreadcrumbList, one FAQPage, 2,654 words, H1, full text and widget fallbacks, CTA link and closing title, homepage copy replaced, blog host 301) + best-platform guide still served + mock-test guide still served; earlier suites 22/22 and 37/37 still passing.
- Playwright (desktop, 390 px phone, dark, reduced motion): no page errors, one H1, no horizontal overflow, no sidebar, all sections reveal; tablet script plays through keypad, time-up and summary; JSON-LD not duplicated with the worker's graph in the HTML (both guides).

## 6. Deployment

1. Merge to `main` in both repositories (Cloudflare Pages builds the site).
2. Redeploy the worker so its bundle contains the new guide: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
3. Check `https://testoza.com/cbt-exam-software` loads and view-source contains "Eight questions to ask any CBT exam software".
4. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
