---
workflow: general-video
flow: companion
storyboard: no
message: "After a mock test, educators get a screen of numbers. This tutorial reads both result pages with them, shows that nothing from paper is lost, and turns the numbers into a five-minute Monday routine."
destination: youtube
aspect: 1920x1080
language: en
audience: Indian coaching educators (SSC, banking, railways, JEE/NEET) and school teachers moving from pen-and-paper tests
length: ~7 min
angle: tutorial — "Understanding Results"
---

## Owner's rules (2026-10-27)

- Detailed tutorial on analysing results: the per-test **Results panel** (My Tests → Results) and the
  **Full report** (analysis page), plus All Submissions as the doorway. Creators must understand every
  number on both pages and what to do with it.
- Speak to educators who know pen-and-paper tests: show the benefits, and that everything they did on
  paper (register, rank list, opening a copy, discussion class) is still there, without losing anything.
- 2D animations "like Microsoft does" (flat, clean, friendly explainer motion) at the most relevant
  places: the Sunday-night paper pile, paper → online mapping, how to read the marks spread, the three
  wrong-answer patterns, the Monday routine.
- Voice: adult male 28–30, smooth, realistic, fully human (NOT Gemini TTS; ElevenLabs, owner is
  buying a subscription), trustworthy, engaging, not lecture-like: small human asides and benefits in
  between. Pace like the Top-10 Features video. Every frame matches the voice.
- Research Indian tutors' current mock-test habits first (see RESEARCH.md).
- Never say "free" anywhere (videos live on; charges are coming). The site footer says "free" — never
  scroll to it on camera.

## Real screens

Recorded on app.testoza.com as the demo educator. The test **"SSC CGL Weekly Mock 12" (M679, id
04c1df3b…)** is real in the demo account (capture/make-test.mjs): 4 sections × 5 questions, +2/−0.5,
20 min, conducted Sun 25 Oct 10:00 IST, ended. Its 48 submissions + 4 drop-outs come from
capture/class.mjs and are served inside the recording browser only (capture/stage.mjs), with Mocks
9–11 (numbers only) and an unsent Mock 13 added to the list. Nothing is written to the database.

## Numbers the voice quotes (from class.mjs, verified on the real pages)

52 started · 0 writing · 48 submitted · 4 dropped (Akash 2/20 answered, Sonal 14/20) · average 54%
(21.7/40) · highest Aditi Sharma 37.5/40 = 94% · lowest 8% · 11 below 40% · spread 4/7/15/16/6 ·
Sneha & Rahul tie at 33 (2 wrong, 1 blank), Sneha submitted 4 min earlier → #2 · Jyoti Bisht 18/40:
English 10/10, Quant −2, 8 wrong = −4 marks · Teach these again: Q15 21%, Q13 23% (B 54%), Q9 29%,
Q14 40%, Q19 44% · Q15 22 of 48 left blank · sections Reasoning 75, English 70, GA 57, Quant 44 ·
All Submissions averages Mock 9→12: 46, 48, 50, 54.

## Product bugs found while making it

- `/results/analyze` returned the LAST TOPIC's percentage as the overall "% Score" (topic loop reused
  `percentage`), on the creator's answer sheet and the candidate's own ResultsPage. Fixed in
  backend/app/routers/results.py (uncommitted); stage.mjs corrects the number until it is deployed.
- StudentDetailedResultModal shows two overlapping × close buttons (top right).
