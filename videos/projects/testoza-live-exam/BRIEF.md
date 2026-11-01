---
workflow: general-video
flow: companion
storyboard: no
message: "Run a real, cheat-proof online exam on TestoZa in minutes: go live, lock the exam room, send the link or a join code, and watch every result arrive."
destination: youtube
aspect: 1920x1080
language: en
audience: Indian educators, coaching institutes and schools who run class tests and mock exams on paper today
length: 6-7m
angle: tutorial
---

## Title (decided)

**How to Conduct a Cheat-Proof Online Exam (Free) — Setup, Join Code & Live Results | TestoZa**

The owner's working title "Prevent cheating" undersold it: the video is the whole exam day, and
"how to conduct online exam" is what educators search. The anti-cheating part gets its own YouTube
chapter ("Anti-cheating settings") so it can be linked and timestamped.

## Intent

Sequel to the builder tutorial: the paper built there ("JEE Main Mini Mock — TestoZa Demo") is now
conducted for real. Narrator = an energetic helper sitting beside the educator, guiding every
switch with the reason an exam-hall veteran would give.

Flow (owner's order): test card → Conduct exam → Settings → every point of Proctoring & Security,
Access & Control, Results & Timing → candidate inputs (Name + Roll No) → copy link → share to the
class WhatsApp group → get a join code (live) → write testoza.com/join + code on the board →
student's phone: message arrives → open the exam on the phone → back: "or type testoza.com/join"
→ join with the code on a computer → attempt (tab-switch warning) → submit → dashboard: 25 writing,
2 submitted → Results: 27 started / 25 writing / 2 submitted / 0 dropped → later: all 27
submitted, export to Excel → landing page: why TestoZa (paper vs online, phones, NEET-UG CBT
2027) → thank you + end card.

## Customizations

- **Voice:** male, energetic, Indian English, Gemini TTS on Vertex (key from backend/.env at
  runtime, never written to a file). No avatar.
- **Voice ↔ picture sync (owner's hard rule):** the builder tutorial put one mark per step, so
  clicks inside a step ran at recording speed and the voice ran ahead. Here every click has its own
  mark in the recording and its own `{cue}` word in SCRIPT-en.md. The edit pins each action so its
  click lands on that word (picture may lead by ≤0.3 s, never trail). Gaps are filled with holds on
  the settled screen; build.mjs prints every cue whose picture would trail and the build fails
  until the script or timing is fixed.
- **Real screens only:** every TestoZa frame is the real app.testoza.com / testoza.com recorded
  with Playwright as teacher@testoza.com (desktop 1536×864 CSS px) or as a guest on an emulated
  phone. The live numbers (25 writing, 27 started, all submitted) are staged inside the recording
  browser by answering the dashboard/results data requests with sample candidates — the real
  screens render them; nothing fake is written to the database.
- **Not TestoZa (built as scenes):** the WhatsApp group chat (carries the real invite message and
  link card), the classroom board with the real join code, phone frames, chapter cards, end card.
- On-screen text English; "candidates" in product UI, "students" in the classroom story.

## Assets

- ../testoza-launch/assets/fonts/ — Outfit; ../../channel/banner-src/wordmark.png — logo.
- Demo logins: ../../../TestoZa/sample-credentials.md (env only).

## Facts checked (2026-10-20)

- NEET-UG → CBT: Education Minister Dharmendra Pradhan announced NEET-UG moves to computer-based
  testing from 2027; final format pending the Nilekani task force report (Careers360, 30 Sep 2026).
  Script says "announced … set to move", not "will be online".
- Stop exam resets the exam's anti-cheating settings to default, so every take starts clean.

## Notes

- Never overwrite renders; new versions get new names. Laptop 7.7 GB → --low-memory-mode.
