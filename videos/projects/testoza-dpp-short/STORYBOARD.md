---
format: 1080x1920
duration: ~60s (target)
message: "Snap your DPP pages and its answer key, and TestoZa turns them into a timed online test with an instant result"
arc: Every exam has DPPs → open the booklet → snap pages + key → AI reads → preview → save → My Tests → start → attempt → submit → Result Hub → close
audience: Indian students and coaching teachers (JEE, NEET, SSC, Banking)
mode: collaborative
status: plan v1, waiting for owner approval
---

# TestoZa Short: DPP to online test (plan v1, 2026-10-23)

Third in the Shorts series, after `../testoza-pdf-short` and `../testoza-photo-short`: same stage,
supers, stopwatch and Gemini "Sulafat" Hindi voice, English on-screen text. What's new: a **printed
DPP booklet** people know from their own coaching, a **separate answer-key photo**, and the
**whole loop on a phone**, ending on the new Result Hub (commit f20dc16a).

Facts checked in the code (2026-10-23):
- AI importer (frontend/src/pages/AITestImporter.tsx) takes a PDF **or several photos**, and has an
  **Answer key · Optional** card ("Upload key", accepts .pdf/.png/.jpg, one file) for papers whose
  answers are printed separately.
- Result Hub (components/layout/ResultsLayout.tsx, lib/resultView.ts) shows by default: marks row,
  solution key (your answer vs correct answer, time spent), time & cognitive matrix. AI analysis
  and feedback are off by default.
- Every time and count on screen comes from a real timed run. No "free" anywhere (owner rule).

## The DPP

An original, realistic **NEET Physics DPP booklet**: "DPP 07 · Motion in a Straight Line", about
12 single-correct MCQs on two A4 pages, with the **answer key printed on the last page**, in the
classic coaching layout (two columns, header strip, question numbers in boxes, staple). The
questions are written fresh in NEET style. **No real institute's name, logo or pages**: a real
coaching DPP in a public promo is their copyrighted work and their brand (the same rule as
the ALLEN-marked papers in shared/paper-pages).

The booklet pages are rendered as images, then turned into **phone photos** (perspective, page
curl, desk light, slight blur) and those photos go into the real importer.

## Frames

| # | Frame | ~s | Voice (Hinglish, Sulafat) | Super (English) |
|---|---|---|---|---|
| 1 | Hook: four DPP booklets fan in on the beat, tabs "JEE Main", "NEET", "SSC CGL", "Bank PO"; NEET one is pulled forward | 4 | "JEE हो, NEET हो, SSC या Banking... रोज़ का DPP तो मिलता है।" | "JEE · NEET · SSC · Banking" |
| 2 | Booklet opens on a desk; pages flip; the answer key on the last page is circled | 4 | "पर उसे असली exam की तरह, time लगाकर कौन देता है?" | "Daily DPP. Never timed." |
| 3 | Phone (real importer, phone layout): a chip pair "PDF / Photos"; PDF briefly shown, Photos picked | 4 | "Testoza खोलिए। PDF है तो वो भी चलेगा, पर photo सबसे आसान है।" | "PDF or photos." |
| 4 | Camera snaps page 1, page 2 (shutter on beats); thumbnails land in the upload card; then the key page is snapped into **Answer key → Upload key** | 6 | "DPP के pages की photo लीजिए... और answer key की photo, answer key वाले box में।" | "Snap the pages." / "Snap the key." |
| 5 | Tap **Extract**; real extraction screen, questions arrive one by one, smoothly (app's own rise + glow); stopwatch runs (fast-forward badge only if the real read is long) | 8 | "AI हर सवाल खुद पढ़ता है, और key से हर सवाल का सही answer भी लगा देता है।" | "AI reads every question." / "Answers from your key." |
| 6 | Ready + **Preview**: "N questions · N/N answers set"; scroll through two questions; stopwatch freezes on the real time | 4 | "[N] सवाल, [real time] में तैयार।" | "[N] questions in [real time]." |
| 7 | **Save** → **My Tests**: the new test card glows | 4 | "Save कीजिए, test आपके My Tests में।" | "Saved to My Tests." |
| 8 | Card → **Preview** → **Start exam** | 3.5 | "Preview देखिए, और exam शुरू।" | "Start the exam." |
| 9 | Exam screen on the phone: timer, tap answers on 3 questions, jump with the palette | 7 | "Timer चल रहा है, बिल्कुल असली exam की तरह।" | "Timed. Like the real exam." |
| 10 | **Submit** → confirm | 2.5 | "Submit..." | (none) |
| 11 | **Result Hub**: marks row counts up, solution key (your answer vs correct), time matrix | 7 | "...और result तुरंत: marks, कौन सा गलत हुआ, और किस सवाल पर कितना time गया।" | "Instant result." / "Every answer checked." |
| 12 | Close: logo, testoza.com; small line for teachers | 5 | "आज का DPP, आज ही online test. testoza.com" | "Today's DPP → today's test." / "Teachers: share it with your batch." |

Runtime ~59 s. Bottom 20% and right edge kept clear for the Shorts UI. English dub audio track
for YouTube (voice-only, after the photo Short's dub was removed with a music bed).

## Production

1. Write the DPP (12 Qs + key), render the booklet pages, make the phone photos.
2. **Real run on app.testoza.com in a phone viewport** (Playwright, 390×844 @3x, like
   ../testoza-photo-short/capture/photo-run2.mjs): upload 2 page photos + key photo → Extract →
   Preview → Save → My Tests → Preview → Start exam → answer some, leave one wrong on purpose →
   Submit → Result Hub. Screens + timings logged. This **saves one test and one attempt** on the
   demo account.
3. Voice: Gemini 2.5 Pro TTS "Sulafat" via capture/gemini-tts.mjs; needs the production Vertex key
   in an env var again (never saved).
4. Music: HeyGen catalog (search is free), picked by measured beats so hits land on the snaps,
   the "ready" reveal and the result.
5. Build on the photo Short's stage/stopwatch/short.css, lint + check, preview, then render to
   renders/video-v1.mp4 and exports/testoza-dpp-short-hindi-v1.mp4.

## Open questions for the owner (plan v1)

1. **DPP source:** original NEET-style DPP with no institute brand (recommended), or real PYQs
   (e.g. NEET 2024 questions released by NTA) laid out as a DPP?
2. **Who is speaking to:** students practising their own DPP, with one closing line for teachers
   (recommended; it matches the upload → attempt → result flow), or teachers giving DPPs to a batch?
3. **Real run account:** the demo **student** account (result shows "Aarav Sharma", fits the
   student angle; needs creator access) or the demo **teacher** account?
4. **Voice:** Hindi Sulafat + English dub like the last two (recommended), or English-first?

---

# Plan v2 (2026-10-23): owner picks + build

Owner chose: original unbranded NEET DPP; **students only** (test yourself online instead of on
paper with a clock behind you); demo **student** account; **English** female voice (22–27, smooth,
trustworthy, energetic), **no on-screen text** (only the app's own UI and a logo/URL end card);
**Hindi audio track** in the same voice.

| T (s) | Scene | Voice (Zephyr) |
|---|---|---|
| 0–6.2 | Four DPP booklets slam onto the desk (JEE Main, NEET, SSC CGL, Bank PO), gather into a stack | "JEE, NEET, SSC, Banking... every aspirant has a stack of DPPs." |
| 6.2–11.3 | DPP 07 open on the desk, pencil, alarm clock behind; rack focus to the clock | "But solving them on paper, with a clock behind you? That's not the real exam." |
| 11.3–21 | Phone (Safari, app.testoza.com): Choose File → iOS menu (Choose File = PDF, Take Photo) → camera snaps page 1, page 2 | "So, open Testoza. Got a PDF? That works too. But the quickest way... just snap your DPP pages." |
| 21–24.4 | Upload key → Take Photo → key page snapped → answer-key card pulses | "Then snap the answer key, and drop it right here." |
| 24.4–28.5 | Marks +4, negative −1, Extract | "Set the marking, plus four, minus one... and hit Extract." |
| 28.5–37.9 | AI reads the pages (footage 6×, badge), then the 12 questions stream in (1.45×) | "Now the AI reads every question... and takes each right answer from your key." |
| 37.9–41.5 | Ready, preview stats zoom: 12 · 12/12 answers · 31.9 s | "Twelve questions, ready in thirty-two seconds!" |
| 41.5–46.8 | Preview scroll, Save & continue, My Tests | "Check them, save... and your test is waiting in My Tests." |
| 46.8–51.5 | My Tests → Preview → I'm ready → Start Test Now | "Tap Preview, and start." |
| 51.5–61.2 | Exam: timer zoom (19:59), Q1 pick, palette jump, Q9, Submit | "Now the clock is real. Pick, move on, come back... exactly like exam day." / "Submit..." |
| 61.2–71 | Submit dialog, confetti, 23/48 zoom, Q3 time-trap card (You A, Ans C, 2m 49s) | "and your result is instant. Your score, what you got wrong, and where your time went." |
| 71–76.5 | Phone steps aside, booklet → arrow → phone, TestoZa wordmark, testoza.com | "Today's DPP... today's online test. Testoza dot com." |

Real runs (prod, demo student, phone viewport 390 CSS px recorded at 2×): run A7 (2 page photos +
key photo → 12 questions, 12/12 answers from the key, +4/−1, 31.9 s) and run B5 (an attempt at a
real student's pace: Q1 51 s, Q2 33 s, Q3 wrong after 2m 49s, Q4 2m 8s, Q5, Q6, Q9 → 23/48, 6 correct,
1 wrong, 5 skipped). B5 attempts a second import of the same DPP that the AI gave the identical
title (A7's own saved copy was deleted by mistake); only the "#M63x" chip differs.

Build: `node capture/build.mjs` (EN) or `node capture/build.mjs --lang hi`, then
`node ~/.claude/skills/hyperframes-audio/scripts/carve.mjs --comp index.html`, then lint/render.
Tables: capture/cuts-b.json (run B cuts; run A cuts are in build.mjs), holds.json, zooms.json,
vo-en.json / vo-hi.json, sfx.json. Templates: capture/phone.tpl.html, capture/index.tpl.html.
Music: assets/bgm/bed-129.mp3 (HeyGen, 129 BPM, energy drops every 14.9 s) at T1.8, so the drops
land on Take Photo (16.7), the extraction (31.6), My Tests (46.4) and Submit (61.3).
