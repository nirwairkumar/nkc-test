# testoza.com/moodle-alternative — Moodle alternative guide with a playable exam room

**Date:** 2026-10-02
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/moodle/`, `App.tsx`, `Footer.tsx`, sitemaps, `llms*.txt`, cover), backend (`app/routers/sitemap.py`), Supabase (`20261002130000_analytics_guide_moodle_alternative.sql`). Cloudflare worker: no code change; redeploy so its bundle includes the guide.
**Status:** Implemented; uncommitted and undeployed for review.
**Related:** [2026-10-01-neet-online-test-software-guide.md](2026-10-01-neet-online-test-software-guide.md) (the shell this page refines), [2026-10-02-live-exam-sessions.md](2026-10-02-live-exam-sessions.md) (the join-code feature the page demonstrates)

---

## 1. Summary

A long-form guide at **https://testoza.com/moodle-alternative** for school heads, coaching institute owners, college exam cells and trainers who mostly use Moodle for quizzes. Targets "Moodle alternative", "Moodle alternatives", "Moodle quiz alternative", "free Moodle alternative", "MoodleCloud alternative", "Moodle alternative for schools / coaching institutes / India" and "Moodle negative marking".

- **Angle:** honest and educator-first. It starts by asking what you use Moodle for, says plainly when to keep Moodle, and only then shows where TestoZa is simpler: no server, no plugins, no student accounts.
- **Sections (11 + FAQ):** what you use Moodle for (+ checker) · at a glance (self-hosted Moodle vs MoodleCloud vs TestoZa) · what running Moodle takes (+ support calendar; MoodleCloud prices in rupees) · exam day without student accounts (+ playable exam room) · getting questions in (GIFT vs AI from PDFs/photos; Moodle's AI) · negative marking (+ converter) · phones, lockdown and patchy internet · results · switching or running both · other Moodle alternatives · where Moodle is the better tool · 12 FAQs · closing paths.
- **Length:** ~4,700 words of article text; 5,146 in the JSON-LD count and ~5,360 in the crawler HTML (widget fallbacks add tables).

## 2. Design

Own shell and stylesheet (`pages/guides/moodle/`, class prefix `ma-`), built on the NEET guide's shell, which the owner rated best, and tightened further. Earlier guides were not touched.

| | NEET guide | This guide |
|---|---|---|
| Type | Body 16 px; H1 31–44 px; H2 24–30 px | Body 16 px; H1 30–42 px; H2 22–28 px; H3 18 px; tables 14–14.5 px |
| Hero | iPhone running the exam screen | iPhone in Safari at testoza.com/join: code → check-in → lobby → result |
| Widgets | Exam demo, planner, score lab | iOS Settings-style checker, support calendar, marking converter, playable exam room + projector |
| Wide content | Widgets break out to 1000 px | Comparison table breaks out to 940 px; checker to 880 px; exam room to 1000 px |

**Replicas use the product's own class strings**, resolved per layout (Tailwind's `sm:`/`lg:` follow the reader's window, not the replica):

| Piece | File | Copied from |
|---|---|---|
| Hero phone | `MoodleHero.tsx`, `JoinScreens.tsx` | `pages/join/JoinPage.tsx`, `components/exams/DigitBoxes.tsx`, `TestoZaLogo.tsx` (light colours only). Same stage transition as framer-motion (y 14 → 0 in, −10 out, 0.28 s). |
| Exam room | `ExamRoomDemo.tsx` | `pages/exams/ExamSessionPage.tsx`, `components/exams/MonitorPanel.tsx`, `ResultsPanel.tsx`, `ExamPresentPage.tsx`, `dashboard/dashboardUi.tsx` (`CARD`, `PRIMARY_BTN`, `PILL_BTN`, `MENU_TRIGGER`, `MENU_ITEM`), `exams/ios.tsx` (`Segmented`), shadcn dropdown/alert-dialog classes merged as tailwind-merge would. Imports the real `QrCode` and `examFormat` (`clock`, `minutesText`, labels). |
| Mark pills | `MoodleWidgets.tsx` | `components/test-builder/QuestionCard.tsx` `MarkField` |

The desktop exam room is drawn at 1024 × 660 and scaled into a Mac window; below 760 px it renders the page's mobile layout at natural size. Menus and dialogs open inside the window (a portal into an overlay above the scrolling page). The projector view is drawn at 1280 × 720 with its `lg:` layout and `clamp()` sizes resolved for that width.

**One story across the page:** Sunrise Academy, batch 10-B, "Science Test 14" (Class 10 Science: Term 1 Practice Paper, 30 questions, 45 minutes, code 482 913, roll number + PIN). Riya Sharma (10B-17) joins on the hero phone, submits at 10:41 and ranks 3rd of 30 with 26/30 (Physics 9, Chemistry 9, Biology 8); the class averages 19.4 and the top score is 28, in both the hero and the exam room. Kabir loses signal at 8:00 and rejoins on another device at 14:00; Sneha gets warnings at 11:00 and 23:00; Arjun and Fatima join late; Dev and Ishita are absent.

## 3. Content accuracy

**Moodle facts (checked 2 October 2026; linked on the page):**

| Fact | Source |
|---|---|
| 147,642 registered sites, 237 countries, 533.7 M users, 12.8 B quiz questions; India 4,486 (8th) | stats.moodle.org |
| 5.2 released 20 Apr 2026; 5.0 security ends 5 Oct 2026; 5.1 general 5 Oct 2026, security 19 Apr 2027; 4.5 LTS security 4 Oct 2027; 5.3 LTS scheduled 5 Oct 2026 | moodledev.io/general/releases |
| 5.2 needs PHP 8.3+, 64-bit, sodium, max_input_vars ≥ 5000; PostgreSQL 16 / MySQL 8.4 / MariaDB 10.11 | moodledev.io/general/releases/5.2 |
| Install guide "intended for administrators experienced with installing web server applications"; web root `public/`; cron every minute | Installation quick guide |
| "Your site will not work properly without it." | Cron |
| Guests "cannot participate in any activities; they can only view content" | Guest access |
| Upload users needs username, firstname, lastname, email | Upload users |
| Import: GIFT, Moodle XML, Aiken, …; Word table is a contributed plugin; no PDF | Import questions |
| GIFT weights `~%-25%` | GIFT format |
| Negative grades: single-answer only with Deferred feedback; multiple-answer totals below zero become zero | Multiple Choice question type |
| Allowed grades 100, 90, 83.33333 … 5% | `question/engine/bank.php` (`ensure_fraction_options_initialised`) |
| AI placements: editor (generate text/image), course assistance (summarise/explain); providers incl. Gemini and Bedrock new in 5.2, each needing an account/key; no question generation in core | AI placements, AI providers |
| Safe Exam Browser: Windows, macOS, iOS; must be installed | Safe Exam Browser |
| App offline quiz: no time limit, deferred feedback, sequential navigation, no network restriction | Moodle app offline features |
| MoodleCloud INR: Starter ₹15,340 (50) … Standard ₹2,00,070 (750); no plugins; 28-day trial | moodlecloud.com/standard-plans |
| Android 93.89 %, iOS 6.05 % of India's mobile web traffic, Sept 2026 | Statcounter |

Exam marking schemes used as presets (NEET/JEE Main +4/−1, CUET-UG +5/−1, SSC CGL +2/−0.5, IBPS PO +1/−0.25, UPSC prelims +2/−0.66) are the standard published schemes; they are not separately sourced on the page.

**Product claims (checked against the code):** join codes, check-in modes, lobby, late entry, per-candidate deadlines, 20 s heartbeat, device change, auto-submit at time up, End exam files drafts (`JoinPage.tsx`, `TestPage.tsx` session mode, backend `join.py`, `exam_sessions.py`, `services/exam_sessions.py`); exam room controls and results (`ExamSessionPage.tsx`, `MonitorPanel.tsx`, `ResultsPanel.tsx`, `RetestSheet.tsx`, `ReportCardsPage.tsx`); batches from Excel/WhatsApp/sheet (`AddStudentsSheet.tsx`); marks on question cards and copying to new questions (`QuestionCard.tsx`, `TestBuilder.tsx`); scoring incl. proportional partial marks and numerical ranges (`backend/app/services/scoring.py`); question types single / multiple / numerical / comprehension; AI import accepts PDF, PNG, JPG, WEBP only (`routers/ai.py`); exam rules (`TestSettingsPanel.tsx`); prices from the live `plans` table (₹49 / 7 days, ₹149 / 30 days, ₹799 / 365 days).

**Stated as limits, not claimed:** no LTI, SSO, plugins or self-hosting; no GIFT/Moodle XML import or export; no essays, file uploads or term gradebook.

## 4. Product findings worth a follow-up (not changed)

1. **Everything premium is currently free.** `app_settings.unlock_all_premium` is `true` in production, so paid-plan features (security rules, branding, Excel export, named results) are open to all. The page describes plans as the pricing page does. If the flag is switched off, `GET /api/attempts/test/{id}` returns anonymised names and zero scores to non-premium creators (`routers/attempts.py`), which would contradict "building and running tests is free" on this and the NEET guide for conducted-test results. Join-code sittings are not gated at all.
2. **"Results: when i release them".** `ExamSessionPage.tsx` lower-cases `RELEASE_LABEL[...]`, so the manual option reads "when i release them". The replica uses the "when the exam ends" option, which reads correctly.
3. **Over-claimed question types elsewhere.** The `CreateTestPage.tsx` FAQ says TestoZa supports True/False, Fill-in-the-Blanks and Short Answer questions; `data/seoPages.ts` says fill-in-the-blank and true/false are auto-graded. The builder offers single, multiple, numerical and comprehension only.
4. **`documentation/comparison-testoza-vs-moodle.md`** has claims this guide left out: "double-buffered localStorage + sessionStorage" (the code keeps answers in localStorage and an IndexedDB vault), Cloud Run auto-scaling "for 1 or 10,000 concurrent students", and Moodle details that weren't re-checked. Check it against the code and Moodle's docs before publishing it.
5. **Join codes need the backend deploy** described in `2026-10-02-live-exam-sessions.md` (and `EXAM_PIN_PEPPER` set first). The guide links to `/user-guide/live-exam-sessions` and describes testoza.com/join; deploy that feature before or with this page.

## 5. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint: new files clean.
- `vite build`: page chunk 33 KB brotli JS + 8.8 KB CSS.
- `wrangler deploy --dry-run --env production`: 366.66 KiB (116.29 KiB gzip); bundle contains the guide.
- Crawler harness (esbuild bundle of `guides/worker.ts`): one H1, 16 H2, 18 H3; JSON-LD Article + FAQPage (12) + BreadcrumbList, wordCount 5,146; tags balanced; no control characters; title 60 characters with " | TestoZa", description 146; all internal links resolve.
- Playwright (Chromium; 1440 desktop, iPhone 13, dark, reduced motion): one H1, no horizontal overflow, no page errors. Hero plays code → check-in → lobby → submitted → result. Exam room: lobby fills to 28, Start, Kabir's "No signal" and "Changed device", Sneha's warnings, late joiners, row menu (+10 minutes toast and "+10 min" flag), End exam dialog, results with rank list, section splits, filed answers and Parent buttons, projector view; phone layout uses the page's mobile classes. Contents menu jumps land below the sticky bars. Reduced motion: still lobby frame, every section visible.
- Cover: `frontend/public/guides/moodle-alternative/cover.png`, 1200 × 630, rendered from a live frame of the hero phone.

## 6. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. Deploy the live-exam-sessions backend if it isn't live yet (section 4, item 5).
3. Deploy the frontend (Cloudflare Pages builds from `main`), then the backend (live sitemap).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
5. Run `supabase/migrations/20261002130000_analytics_guide_moodle_alternative.sql` in the Supabase SQL editor (after the NEET migration, which is already live).
6. Check `https://testoza.com/moodle-alternative` stays on testoza.com and view-source contains "Exam day without student accounts".
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
