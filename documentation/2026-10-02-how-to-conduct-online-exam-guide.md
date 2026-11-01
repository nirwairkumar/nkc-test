# testoza.com/how-to-conduct-online-exam — step-by-step guide with demos that fit the screen

**Date:** 2026-10-02
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/conduct/`, `App.tsx`, `Footer.tsx`, sitemaps, `llms*.txt`, cover), backend (`app/routers/sitemap.py`), Supabase (`20261002140000_analytics_guide_how_to_conduct_online_exam.sql`). Cloudflare worker: no code change; redeploy so its bundle includes the guide.
**Status:** Implemented; uncommitted and undeployed for review.
**Related:** [2026-10-02-moodle-alternative-guide.md](2026-10-02-moodle-alternative-guide.md) (the shell this page started from), [2026-10-02-live-exam-sessions.md](2026-10-02-live-exam-sessions.md) (the join-code feature it demonstrates)

---

## 1. Summary

A long-form guide at **https://testoza.com/how-to-conduct-online-exam** for school teachers, coaching institutes, college exam cells and recruiters. Targets "how to conduct online exam", "how to conduct an online exam", "conduct online exam", "how to conduct online test", "how to conduct online exam for students", "online exam process step by step", "how to prevent cheating in online exams", "online exam checklist" and "conduct online exam on mobile".

- **Angle:** the whole process as an exam controller runs it, in seven steps, honest about what a browser can't do, with TestoZa as the worked example.
- **Sections (11 + FAQ):** 1 plan (+ planner) · 2 the paper (timing table from NEET, JEE Main, CUET, SSC) · 3 getting in (link vs join code; check-in; + playable New exam sheet) · 4 exam rules (+ rules tried from a candidate's phone) · 5 rehearse (+ WhatsApp instructions message) · 6 run the day (+ live exam from both sides) · 7 results, re-tests and records · checklist (+ tickable checklist) · eight mistakes · Google Forms · honest limits · 12 FAQs · closing paths.
- **Length:** ~3,870 words of article text + ~840 in the FAQ (4,788 in total); 5,553 in the JSON-LD count and ~5,725 in the crawler HTML (widget fallbacks add text).

## 2. Screen size and type (the brief)

The owner's feedback was that earlier guides' demos were larger than a normal screen and some type was too big. Measured on the existing pages at 1366 × 657 (a 1366 × 768 laptop in Chrome): the NEET and Moodle guides' wide demos start at the text column instead of being centred (x 343 → 1343) and are 770–1,080 px tall; the JEE guide has a 1,153 px widget. Cause in those stylesheets: `.xx-wide` sets `margin-left`, and `.xx-widget { margin: … }` later in the file resets it. **Not changed** (earlier guides are off limits); see §5.

This page:

| | How |
|---|---|
| Demo height | `--co-fit-h` = `clamp(440px, 100svh − 205px, 640px)` (phones: `100svh − 240px`, 420–600). The window of every demo is that tall and scrolls inside; nothing is scaled down. Measured: 542 px tall at 1366 × 657 (544 px are free under the site bar and chapter bar), 705 px at 1440 × 820. |
| Full window | Every demo has **Full window** (Esc or Done returns, state kept): the demo takes the whole screen on small laptops and phones. |
| Centring | Breakouts use two-class selectors (`.co .co-wide`), so the figure's own margin can't push them off-centre. |
| Hero | The phone never makes the first screen scroll: the stage is as tall as the window allows and the phone bleeds off its bottom edge into a fade; the caption floats on it as a glass capsule. |
| Replicas | Natural size, never scaled: the candidate's phone is a 360-pt screen (a common Android width) in a 376 px frame; the teacher's room is the product's own layout (desktop classes from 640 px). Only the hero phone (393 × 852) is scaled. |
| Type | Body 16 px; H1 28–40 px; H2 21–26 px; H3 17 px; lists 15 px; tables 14 px; captions 12.5–13 px; demo and panel titles 16 px. |
| Small screens | Exam day shows one side at a time (Exam room / Aditi's phone, with a badge when the phone changes); the rules list scrolls in a 300 px window so the phone and its buttons stay together; tables become cards. |

## 3. Design

Own folder and stylesheet (`pages/guides/conduct/`, prefix `co-`), started as a copy of the Moodle guide's shell (which the owner rated best), with the type tightened and the demo frames above.

**One story across the page:** Sunrise Academy, batch 12-A (24 candidates), "Unit Test 3" on the paper "Physics: Current Electricity" (20 questions, 30 minutes, +4/−1, 80 marks), code 731 506, roll number + PIN, 5 minutes' late entry, results when the exam ends; closing 10:45 am (start + 30 + 5 + 10). 20 join on time, Kunal and Sana join late, Ishaan and Tara are absent. Meera switches apps at 4:00 and 13:00; Rohan loses signal at 6:00 and rejoins on another phone at 10:00. Aditi Rao (12A-02) scores 67/80 and ranks 3rd of 22. Data: `src/guides/conductData.ts` (shared with the crawler text) and `pages/guides/conduct/examSim.ts` (one reducer drives the room, the phone and the hero).

| Piece | File | Copied from |
|---|---|---|
| Hero (teacher on an iPhone) | `ConductHero.tsx` | `sheet.tsx` + `room.tsx`, scripted with "pressed" states |
| New exam sheet and Exams page | `sheet.tsx`, `NewExamDemo.tsx` | `components/exams/NewExamSheet.tsx`, `ios.tsx`, `pages/exams/ExamsPage.tsx` |
| Exam room | `room.tsx` | `pages/exams/ExamSessionPage.tsx`, `components/exams/MonitorPanel.tsx`, `ResultsPanel.tsx`, `dashboard/dashboardUi.tsx`; `QrCode` and `examFormat` imported |
| Projector | `ExamDayDemo.tsx` | `pages/exams/ExamPresentPage.tsx` at 1280 px |
| Candidate join, lobby, submitted, result | `joinScreens.tsx` | `pages/join/JoinPage.tsx` (via the Moodle guide's replica; "By section" only when there are sections, as in JoinPage) |
| Candidate exam screen and dialogs | `examScreen.tsx` | `pages/TestPage.tsx` Standard Mode (phone), violation / Full Screen Required / Submitting / Exam paused dialogs; `buttonVariants` imported |
| Exam rules | `RulesDemo.tsx` | `components/TestSettingsPanel.tsx` (Proctoring & Security), `components/ui/switch.tsx` |
| Planner, checklist, router | `ConductWidgets.tsx` | — (guide tools; checklist ticks in `localStorage`, wrapped in try/catch) |
| Shared pieces | `replica.tsx` | class constants, iOS rows, toasts (sonner), the phone frame, `DemoFrame` (title, live tip, Restart, Full window) |

## 4. Content accuracy

**Outside facts (checked 2 October 2026, linked on the page):** NEET-UG 180 questions / 180 min, +4/−1; JEE Main paper 75 / 3 h, +4/−1; CUET-UG 50 compulsory / 60 min, +5/−1; SSC CGL Tier 1 100 / 60 min, +2/−0.5. Google Forms has no built-in timer or negative marking (add-ons only); locked mode is for managed Chromebooks (Google's announcement). Android 93.89 % of India's mobile web traffic, Sept 2026 (Statcounter). iPhone full-screen support is uncertain across iOS versions (caniuse: "partial"), so the page only says Safari on iPhone is stricter and tells teachers to rehearse it.

**Product claims (checked against the code):** two ways in (`ConductExamDialog`, `lib/conductExam.ts`; `NewExamSheet`); New exam options and closing time; lobby 30 min before; check-in modes and hints (`examFormat.ts`); PINs shown once, slips 3 across A4 (`PinSlipsPage.tsx`); heartbeat 20 s with answers, violations and extra time; "Your teacher gave you N more minutes."; "Your teacher asked everyone to submit…" / "…ended the exam…"; "Your teacher removed you from this exam."; device change; `SUBMIT_GRACE` 15 min; server clock; More time +5/10/15/30, per candidate +5/+10; End exam files drafts; results release options; answer key never sent to sitting candidates; rank list, Excel, report cards, WhatsApp to parents (wa.me); re-test; exam rules and their wording (`TestSettingsPanel.tsx`, `TestPage.tsx`); shuffle question order (order only); question types; AI import formats; prices. Not claimed: camera/screen proctoring, essays, LTI, self-hosting.

## 5. Findings worth a follow-up (not changed)

1. **Earlier guides' demos are off-centre and taller than a laptop screen** (§2): `neetGuide.css` and `moodleGuide.css` define `.xx-wide` before `.xx-widget { margin: … }`, so the breakout loses its left margin. Fix: `.ng .ng-wide` / `.ma .ma-wide` (two classes) and a height cap like `--co-fit-h`. Needs the owner's go-ahead (earlier pages are off limits).
2. **Force Full Screen can lock a candidate out.** In `TestPage.tsx` (`checkFullScreenState`), if the browser can't enter full screen (likely Safari on many iPhones), the "Full Screen Required" dialog opens and its only button calls `requestFullscreen`, which fails silently; the dialog can't be closed. Detect `document.fullscreenEnabled` (and `webkitFullscreenEnabled`) and skip the rule where it's unavailable.
3. **"Strict (Instant Submit)" never submits.** `MAX_WARNINGS = test?.settings?.violation_limit || null` turns the strict value 0 into null (warn only). Use `?? null`. The rules demo leaves Strict out for this reason.
4. **The warning counter always says "/3"** (or "/1" when `tab_switch_mode === 'strict'`), whatever limit the teacher set (`TestPage.tsx`, the header pill). The demo shows the chosen limit, and no limit for warn-only.
5. **Lower-cased labels:** `NewExamSheet` (summary) and `ExamSessionPage` (chip) lower-case whole labels: "Check in: roll number + pin", "Results: when i release them". The replicas lower-case the first letter only.
6. Earlier findings still open (Moodle guide doc §4): `unlock_all_premium` is on, so "exam-security rules are paid" is the plan design, not today's behaviour; join codes need the live-exam-sessions backend deployed.

## 6. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint on new files: 0 errors (fast-refresh warnings only, as in the other guides).
- `vite build`: page chunk 43 KB brotli JS + 9.7 KB CSS.
- Crawler harness (esbuild bundle of `guides/worker.ts`): one H1, 16 H2, 22 H3; JSON-LD Article + FAQPage (12) + BreadcrumbList, wordCount 5,553; tags balanced; no control characters; title 59 characters with " | TestoZa", description 158; internal links resolve.
- Playwright (Chromium; 1366 × 657, 1440 × 820, iPhone 13; dark; reduced motion): one H1, no horizontal overflow, no page errors. Hero fits the first screen at 1366 × 657. Every figure centred. Demos 542 px at 1366 × 657, 705 px at 1440 × 820. Played: New exam (paper, More options, batch 12-A, roll number + PIN, Create → code), rules (app switch → "Warning 1/3", leave full screen → dialog and log, warnings reach the room row), exam day (lobby fills, Start, Aditi's phone moves to the exam, +5 min toast on both sides, Rohan's "No signal" and "Changed device", Meera's warnings, End exam → rank list with Aditi 3rd of 22 at 67/80, her phone shows the result), Full window and Esc. Reduced motion: every section visible.
- Supabase (read-only): the live `analytics_landing_type` matches the Moodle migration; the new migration only adds this path.
- Cover: `frontend/public/guides/how-to-conduct-online-exam/cover.png`, 1200 × 630, from a live frame of the hero phone.

## 7. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. Deploy the live-exam-sessions backend if it isn't live yet (the page describes testoza.com/join).
3. Deploy the frontend (Cloudflare Pages builds from `main`), then the backend (live sitemap).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`.
5. Run `supabase/migrations/20261002140000_analytics_guide_how_to_conduct_online_exam.sql` in the Supabase SQL editor.
6. Check `https://testoza.com/how-to-conduct-online-exam` stays on testoza.com and view-source contains "Step 1: Decide what kind of exam it is".
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
