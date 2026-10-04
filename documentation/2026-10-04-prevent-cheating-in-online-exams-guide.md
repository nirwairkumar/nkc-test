# testoza.com/prevent-cheating-in-online-exams — a guide that watches the reader's own tab switches

**Date:** 2026-10-04
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/cheating/`, `App.tsx`, `Footer.tsx`, `TestPage.tsx`, sitemaps, `llms*.txt`, cover), backend (`app/routers/sitemap.py`), Supabase (`20261004120000_analytics_guide_prevent_cheating.sql`), Cloudflare worker (redeploy only, to bundle the guide).
**Status:** Implemented; uncommitted and undeployed for review.
**Related:** [2026-10-03-hindi-online-test-maker-guide.md](2026-10-03-hindi-online-test-maker-guide.md) (the shell this page started from), [2026-10-02-how-to-conduct-online-exam-guide.md](2026-10-02-how-to-conduct-online-exam-guide.md) (covers exam rules in one section; this page goes deep)

---

## 1. Summary

A long-form guide at **https://testoza.com/prevent-cheating-in-online-exams** for schools, coaching institutes, colleges and recruiters. Targets "prevent cheating in online exams", "how to prevent cheating in online exams", "how to stop cheating in online exams", "online exam cheating methods", "can online exams detect cheating", "tab switch detection online exam", "online exam proctoring without webcam", "prevent ChatGPT cheating in exams".

- **Angle:** cheating is a design problem more than a surveillance one. How candidates actually cheat, what a browser can and can't notice (proved live on the page), then the layers that work: the paper, identity, exam rules, release, exam-day reading, checking results, with honest limits.
- **Sections (15 + FAQ):** how common · 16 methods (+ explorer) · what a browser sees (+ sandbox) · exam rules (table) · the paper · identity · leaks · AI · exam day · spotting copying (+ copy check) · setups (+ planner) · webcam proctoring · Google Forms · ten mistakes · honest limits · 12 FAQs · closing paths.
- **Length:** 6,856 words in the JSON-LD count (includes the widgets' crawler text), 7,124 in the crawler HTML; read time set to 26 min.
- **Keyword overlap:** `/how-to-conduct-online-exam` lists "how to prevent cheating in online exams" among its keywords. Left untouched (earlier guides aren't edited); this page links to it, and it should ideally link back here.

## 2. Screen size and type

| | How |
|---|---|
| Demo height | `--pc-fit-h` = `clamp(440px, 100svh − 205px, 640px)` (phones 420–600). Measured title row + demo: 512 px at 1366 × 657 (544 px free), 487–524 px on an iPhone 13 (≈551 free). Grid rows `minmax(0, 1fr)`; scrolling columns' children `flex: none`. |
| Sandbox | Wide (≥820 px): phone 376 px + side panel (Exam rules / Browser signals) with the exam room row pinned. Narrow: Exam / Rules / Signals tabs, one pane at a time, phone without bezel. Real full screen makes the demo the whole screen. |
| Explorer, copy check, planner | Wide: list + detail / pairs + grid / controls + result. Narrow: rows open in place / pickers on top / chips with short labels. |
| Full window | Every demo has it (Esc or Done returns, state kept); hidden while the sandbox is in real full screen. |
| Type | Body 16 px; H1 28–40 px; H2 21–26 px; H3 17 px; lists 15 px; tables 14.5 px (cards with labels on phones); captions 13 px; demo titles 16 px. Replicas use Mukta, the product's font, at natural size; only the hero phone is scaled. |

## 3. Design

Own folder and stylesheet (`pages/guides/cheating/`, prefix `pc-`). The shell CSS was generated from `hindiGuide.css` lines 1–2453 (prefix renamed with a word-boundary regex so `right-`/`height-` stay intact); page styles follow.

| Piece | File | Source |
|---|---|---|
| Hero: candidate leaves the exam for the class group, gets "Warning 1/2", the exam room flags it | `CheatingHero.tsx` | `examScreen.tsx` + MonitorPanel row; generic chat (no brand) |
| Exam screen + dialogs + Submitted | `examScreen.tsx` | conduct guide's replica of `TestPage` (phone), `JoinPage` DoneStage |
| "Try to cheat on this page" | `SandboxDemo.tsx` | `TestSettingsPanel` Proctoring & Security markup; `TestPage` handleViolation, copy/context-menu guards |
| 16 methods explorer | `MethodsExplorer.tsx` | `cheatingData.ts` METHODS |
| Copy check | `CopyCheck.tsx` | `cheatingData.ts` BATCH (made-up), `comparePair` |
| Setup planner | `SetupPlanner.tsx` | `cheatingData.ts` setupFor |
| Shared | `replica.tsx` | Hindi + conduct replicas (DemoFrame with `frameRef`/`fullscreen`, Phone, toasts, Avatar, Flag, switch) |

**The sandbox reacts to real signals:** `visibilitychange → hidden` (counted when app-switch detection is on), `fullscreenchange` after a real `requestFullscreen()` on the demo (counted when Force Full Screen is on), `copy`/`cut`/`paste` and `contextmenu` inside the exam screen (blocked or allowed), and `blur` without hiding (logged, not counted, as in the product). Counting happens only while the demo is on screen or in full screen; "Can't switch apps? Simulate it" covers readers who can't switch. Nothing is sent anywhere.

## 4. Content accuracy

**Outside facts (checked 4 October 2026, linked in Sources):** Newton & Essex 2024 (19 studies, 4,672; 44.7% / 29.9% / 54.7%); Chan & Ahn, PNAS 2023 (>2,000 students, 18 courses) and Newton's reply; Cotarlan & Lancaster 2021 (Chegg +196.25%); Klijn, Alaoui & Vorsatz 2024 (2/4/6 versions; later rounds 19.5% faster, no higher scores); Scarfe et al., PLOS ONE 2024 (94% undetected, 83.4% higher, unsupervised take-home exams); OpenAI classifier withdrawn 20 July 2023 (26% caught, 9% false positives); Public Examinations Act 2024 (3–5 years/₹10 lakh; organised 5–10 years/≥₹1 crore; UPSC, SSC, RRBs, IBPS, NTA, central recruitment); MDN Page Visibility (partly visible = visible); Apple Developer Forums Dec 2024 (no Fullscreen API on iPhone; iPad has it); Google Forms locked mode (Workspace for Education + managed Chromebooks); exam timings JEE Main 180/75, NEET 180/180, SSC CGL 60/100.

**Product claims checked against the code:** listed in the header comment of `src/guides/preventCheatingOnlineExams.ts`. Not claimed: webcam/microphone proctoring, screen recording, lockdown browser, question pools or option shuffling, answer-similarity reports, IP checks; "single attempt" on links (only checked for signed-in users, client-side) and "strict timer" (stored, not enforced) are left out.

**Copy check arithmetic:** Rohan and Kabir share six identical wrong answers → (1/3)⁶ = 1 in 729 under the even-spread assumption, stated as such on the page; a batch of 40 has 780 pairs, so the page calls it a reason to talk, not proof.

## 5. Product changes made with this guide (`pages/TestPage.tsx`)

| Change | Why |
|---|---|
| `MAX_WARNINGS = violation_limit ?? null` (was `\|\|`) | Strict (0) was read as "warn only"; 5 papers had Strict chosen, 1 of them live on 4 Oct. Strict now submits at the first violation, as the settings say. |
| Warning counter shows `n/limit` (a bare count for warn only) | It always printed "/3" (or "/1" for an old mode value). |
| Force full screen is skipped where `document.fullscreenEnabled` is false (iPhone Safari) | The "Full Screen Required" dialog could never be closed there: its only button retries full screen. App-switch detection still applies. |

Deploying these changes exam behaviour for papers with Strict selected (they will now auto-submit at the first violation).

## 6. Findings worth a follow-up (not changed)

1. **Exam links don't report warnings to the examiner.** `TestPage` sends violations only in the session heartbeat; link submissions don't save a count (`user_tests.violation_count` stays 0), and the dashboard fetches `violation_count` but shows it nowhere. The guide says warnings reach the examiner in sittings only.
2. **"Single attempt" on exam links** is checked in `TestIntroPage` for signed-in users only; guests can retake under a new name.
3. **`strict_timer`** is a setting with no effect.
4. **Sitting results have no per-candidate answer view** (exam links do, via `StudentDetailedResultModal`), so the copying check can't be done for sittings without the database.
5. **Analytics:** the Hindi guide's migration (20261003130000) was never run; this migration includes both paths.
6. **Exam-security rules are paid** in the plan design, but `unlock_all_premium` is still true, so they are free today.

## 7. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint on new files: 0 errors (fast-refresh warnings, as in the other guides). Backend tests: 28 passed.
- `vite build` couldn't run on this machine (0.4 GB of 7.7 GB RAM free; esbuild out of memory) — run it before deploying.
- Crawler harness (esbuild bundle of `guides/worker.ts`): one H1, 20 H2, 16 H3; tags balanced; no control characters; JSON-LD Article + FAQPage (12) + BreadcrumbList; title 61 characters with " | TestoZa", description 150.
- Playwright (Chromium; 1366 × 657, 1440 × 820 dark, iPhone 13): one H1, no horizontal overflow, every demo centred and within the free height, no page errors. Sandbox: Start → real full screen granted → leaving it counted ("Warning 1/3: Exited Full Screen…" toast), simulated switch counted, a real copy blocked with "Copy/Paste is disabled for this test.", exam room synced "2 warnings", limit reached → submitted, room "Submitted 4:54 · 3 warnings"; same flow on iPhone 13.
- Cover: `frontend/public/guides/prevent-cheating-in-online-exams/cover.png`, 1200 × 630, rendered from the hero's still frame.

## 8. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. Run `npm run build` once on a machine with free memory.
3. Deploy the frontend (Cloudflare Pages builds from `main`), then the backend (live sitemap).
4. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production` (bundles the guide for crawlers).
5. Run `supabase/migrations/20261004120000_analytics_guide_prevent_cheating.sql` in the Supabase SQL editor (covers the Hindi guide's path too).
6. Check `https://testoza.com/prevent-cheating-in-online-exams` stays on testoza.com and view-source contains "16 ways candidates cheat"; press Start in the sandbox and switch tabs.
7. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
