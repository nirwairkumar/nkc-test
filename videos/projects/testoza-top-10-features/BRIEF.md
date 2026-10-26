---
workflow: general-video
flow: companion
storyboard: no
message: "The ten TestoZa features an educator uses every week, each shown for real with a short how-to: from a question paper to ranked results."
destination: youtube
aspect: 1920x1080
language: en (+ dub tracks hi, ta, te, kn, ml)
audience: Indian educators, coaching institutes and schools
length: ~5 min
angle: top-10 product showcase
---

## Owner's rules (2026-10-24)

- Top 10 features, each step by step with a short how-to. Very smooth, trustworthy, energetic,
  enthusiastic, engaging; every frame matches the voice.
- Voice: male, English, smooth/trustworthy/energetic/enthusiastic, age 22–27 → Gemini TTS **Puck**
  (gemini-2.5-pro-tts on Vertex us-central1; key from env only, never written to a file).
- **No on-screen text** (no captions, no titles): only the real app UI, numbers on the stings, the
  logo and testoza.com. Feature names live in the voice + YouTube chapters. Subtitles are separate
  .srt files for YouTube, never burned in.
- Audio tracks in the same voice: Hindi, Tamil, Telugu, Kannada, Malayalam (YouTube multi-language
  audio, WAV the length of the video). App words stay English inside each language.
- Thumbnail in English only. `youtube/description.md` with titles, descriptions, tags, chapters.
- Never say "free" anywhere (videos live on; charges are coming).

## The ten

1 Generate with AI (PDF → 12 questions + answer key) · 2 Sy Pad formulas · 3 Hindi / 119 languages ·
4 Exam patterns: +4/−1, JEE Advanced partial marks, sections with their own timers · 5 Go live +
anti-cheating room · 6 Share: link, WhatsApp, join code · 7 Candidate details · 8 Exam on any
phone (join code, full screen, tab-switch warning) · 9 Live dashboard + Results panel · 10 Instant
result (75%, solution key), ranks, Excel.

## Real screens

Recorded on app.testoza.com as teacher@testoza.com (capture/record.mjs, 1.5× CDP screencast, sync
barcode). The paper is the original unbranded NEET-style DPP from testoza-dpp-short (no real
institute). The candidate is a guest on an emulated iPhone. Dashboard/Results numbers (30 writing →
32 submitted) are staged inside the recording browser only (capture/stage.mjs); the real candidate
NP-21 Ananya Verma scored 39/52.

Test in the demo account: "DPP 07: Physics - Motion in a Straight Line" (M654), LIVE, join code
846 331. Section timers were switched off after the builder take (a timed Section B only opens when
A runs out, so the phone candidate could not reach it).

## Notes

- Never overwrite renders; new versions get new names. Laptop 7.7 GB → --low-memory-mode; render
  temp on D: (`TMP=TEMP=D:\hf-render-tmp`).
