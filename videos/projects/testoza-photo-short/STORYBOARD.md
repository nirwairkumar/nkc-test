---
format: 1080x1920
duration: ~40s (target)
message: "Snap a photo of any page of questions and it becomes a live online test on TestoZa"
arc: Hook montage (on the beat) → Snap → AI reads → Ready → Go live → Student joins → Payoff + address
audience: Indian teachers and coaching institutes
mode: collaborative
music: "upbeat modern beat with a clear grid (light hip-hop / Indian urban), hits for the snap and the reveal"
status: plan v1, waiting for owner approval
---

# TestoZa Short: Photo to online test (plan v1, 2026-10-19)

Sibling of `../testoza-pdf-short` (same look, same stopwatch, same voice), so the two read as a
series. What changes: a **beat-driven hook** (three things a teacher can photograph, one per beat),
a **camera snap** in place of the upload, and a faster clock, because a photo is a smaller job than a
6-page PDF.

Product facts (checked in frontend/src/pages/AITestImporter.tsx, 2026-10-19): the AI importer
takes **PDF or photos (PNG/JPG/WEBP), several at once**, and has an **in-app camera** (getUserMedia
→ camera_capture.jpg); photos are compressed before upload. No claim is made that the code does not
back up. **The read time on screen must be a real measured run** (as the PDF Short's 1:14 was).

Look: reuse the PDF Short's stage, stopwatch, supers and real-UI captures
(`../testoza-launch/ui/ssr/*`, `../testoza-pdf-short/assets/ui/*`); new shots only for the photo
parts. Bottom 20% and right edge kept clear for the Shorts UI. Voice: the PDF Short v2 female voice
(Gemini 2.5 Pro TTS, "Sulafat", Hinglish, Latin "AI"/"Testoza"); on-screen text English.

## Frame 1: Anything you can photograph (hook)

- scene: three pages slam in on three beats: a textbook exercise page, a sheet of class notes, an old printed test (all built from TestoZa sample questions, no third-party pages); each gets a camera-frame corner bracket
- duration: ~6s
- voiceover: "किताब का page... class के notes... या पुराना paper... बस एक photo, और online test तैयार?"
- super: "Book page. Notes. Old paper." / "Just one photo?"

## Frame 2: Snap

- scene: a phone with the TestoZa camera view frames the page; shutter flash on a music hit; the photo flies into the real upload card; stopwatch starts at 0:00
- duration: ~5s
- voiceover: "Testoza खोलिए, camera से photo खींचिए।"
- super: "Snap it."

## Frame 3: The AI reads the photo

- scene: real extraction screen; questions arrive from the photo (the photo sits small at the top); stopwatch runs (fast-forwarded only if the real read is long)
- duration: ~8s
- voiceover: "AI photo से हर सवाल खुद पढ़ लेता है... options और answer key के साथ।"
- super: "AI reads every question." / "Options. Answer key."

## Frame 4: Ready (the reveal, on the biggest hit)

- scene: "Your questions are ready · N questions"; stopwatch freezes on the real time
- duration: ~4s
- voiceover: "[N] सवाल... [real time] में तैयार!"
- super: "[N] questions in [real time]."

## Frame 5: Go live

- scene: reuse PDF Short frame 5 (marks, Live exams card, six-digit code)
- duration: ~6s
- voiceover: "Test live कीजिए, और बच्चों को बस छह अंकों का code भेजिए।"
- super: "Live. One 6-digit code."

## Frame 6: A student joins

- scene: reuse PDF Short frame 6 (phone, code typed, exam starts)
- duration: ~4.5s
- voiceover: "ना app, ना account... phone पर code डाला, और test शुरू।"
- super: "No app. No sign-up."

## Frame 7: Close

- scene: stopwatch stops and grows; logo, testoza.com, Free; final music hit after the last word
- duration: ~6s
- voiceover: "Photo से live test, [honest total]। testoza.com पर, बिल्कुल free।"
- super: "Photo → live test." / "testoza.com · free"

## Open questions for the owner (plan v1)

1. Direction: beat-driven series sibling (recommended) vs. a different idea.
2. A real timed run: one photo import on the demo teacher account (teacher@testoza.com) to measure
   the true read time and capture the real photo screens. Recommended; nothing is published.
3. Handwriting: only shown/said if the owner confirms the AI reads handwritten pages reliably.

---

# Plan v2 (2026-10-19): owner picks + real run

Owner chose: **Teacher's night story** (not the beat-montage hook), **real run on the demo teacher
account** (done), **no handwriting** claim.

**Real run (capture/photo-run.mjs, app.testoza.com, demo teacher):** one phone-style photo
(capture/photo/IMG_2219.jpg, 10 original Class 10 science MCQs, no third-party page) →
Extract → **10 questions, 10/10 answers set, 18.7 s processing time** (app clock 0:18).
Questions arrive live from ~11 s. Real screens in capture/shots/ (2× 1280×900). Side effect:
the run is saved in the demo account's AI history (no test created).

Honesty rules for this cut: the only clock on screen is the AI read (0:00 → 0:18, real numbers);
no claim about the total snap-to-live time, which was not measured.

| # | Frame | ~s | Voice (Gemini "Sulafat", Hinglish) | Super (English) |
|---|---|---|---|---|
| 1 | Night: desk lamp, wall clock 10:47 PM, the exercise page | 6.5 | "रात के ग्यारह बजने वाले हैं... कल सुबह class test है, और paper अभी तक type नहीं हुआ।" | "10:47 PM. Test tomorrow." / "Paper not typed." |
| 2 | Phone camera frames the page; shutter flash on a beat; photo flies into the real upload card | 5 | "कोई बात नहीं... Testoza खोलिए, और page की बस एक photo लीजिए।" | "Just one photo." |
| 3 | Real extraction screen (IMG_2219.jpg · 1 page), questions arrive; small clock runs 0:00 → 0:18 (×2 badge) | 8 | "AI photo से हर सवाल खुद पढ़ लेता है... options और answer key के साथ।" | "AI reads every question." / "Options. Answer key." |
| 4 | Real ready screen: 10 questions · 10/10 answers set · 18.7 s; music drop | 4 | "दस सवाल... सिर्फ़ अठारह सेकंड में तैयार!" | "10 questions in 18 s." |
| 5 | Go live + six-digit code (reuse PDF Short frame 5 captures) | 6.5 | "Test live कीजिए, और बच्चों को बस छह अंकों का code भेज दीजिए।" | "Live. One 6-digit code." |
| 6 | Morning: phone, code typed, exam starts (reuse PDF Short frame 6) | 4.5 | "सुबह बच्चे phone पर code डालते हैं... और test शुरू।" | "Morning: students join." |
| 7 | Close: lamp switches off / logo, testoza.com, Free; final hit after the last word | 6.5 | "रात का tension, एक photo में खत्म। testoza.com पर, बिल्कुल free।" | "One photo → live test." / "testoza.com · free" |

Runtime target ~41 s. Music: night lo-fi groove under frames 1–2 that turns into a beat at the
snap, with its biggest hit on the frame 4 reveal and a final hit after "free" (picked by measured
beats/sections, as in the PDF Short).

## Build notes (2026-10-19, v1)

- Built and rendered: renders/video-v1.mp4 → ../../exports/testoza-photo-short-hindi-v1.mp4 (41.0 s, 18.5 MB, −14.3 LUFS, peak −1.4 dB).
- Real numbers come from **run 3** (capture/run3: 10 questions, 10/10 answers, **17.3 s**). Run 1 (18.7 s) was the plan's measurement; run 2 **failed in production** after 8 questions with "The connection closed before processing finished. Please try again." (reported to owner).
- Voice: Gemini 2.5 Pro TTS "Sulafat" via capture/gemini-tts.mjs (Vertex key from env, never saved). Line 4 now says "सत्रह सेकंड" (run 3).
- Music: HeyGen library "subtle emotional piano + soft 808 beat that builds" (assets/bgm/score-night-beat.mp3, 55 s, 92 BPM) from 4.0 s, so its drop (13.75 s in the track) lands on the shutter at 9.75 and its beat stops (41.25) on "खत्म" at 37.25; piano outro under the address. SFX: click (shutter), whoosh-short, impact-bass-1 on the reveal. Carve 0.8 + volume lane; voice bus chain and master gain/truepeak as the PDF Short.
- Screens: run 3 crops (capture/prep.py, from log.json rects); My Tests + phone screens re-rendered from the launch film's real components with this test's text (capture/reshoot.mjs: title, 10 questions, 15 min, Q1, +1 | -0).
- Gemini mix review (Pro + Flash): all words clear, hits land, clean ending, no fixes.

## English audio track (2026-10-19)

- For YouTube multi-language audio (Studio → Subtitles → Add language → English → Audio): exports/testoza-photo-short-english-audio.wav (41.000 s, −13.9 LUFS; .mp3 copy too) and exports/testoza-photo-short-english-v1.mp4 (Hindi picture + English mix, for Instagram etc.; don't upload it as a second YouTube video).
- Voice: audio_request_en.json → assets/voice-en (same Sulafat voice, light Indian English accent; capture/gemini-tts.mjs now follows `lang`). Lines 1 and 6 were shortened to fit; line 7's 1.1 s mid-gap trimmed to 0.45 s so "...gone with one photo" ends on the beat stop.
- Mix: capture/index-en.html.txt is the English timeline (voice starts 0.3 / 5.85 / 12.6 / 20.7 / 24.6 / 30.35 / 34.3, own carve, plus a −3 dB 3.5 kHz cut on the bed for consonant clarity). To rebuild: copy the project to a temp folder, use that file as index.html, junction node_modules, render --quality draft, take the audio.
- Gemini review: clean, no fixes.
