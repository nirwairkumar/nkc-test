---
workflow: general-video
flow: companion
storyboard: no
message: "Put your institute's logo and name on your TestoZa test in under a minute; candidates see your brand on laptop and phone."
destination: youtube-shorts
aspect: 1080x1920
language: en (+ dub tracks hi, ta, te, kn, ml)
audience: Indian educators, coaching institutes and schools
length: ~55 s
angle: how-to Short (Branding Tests)
---

## Intent

A YouTube Short / Reel: "Branding Tests — add your logo and institute branding". Step by step, every
action shown for real: open the builder → Institution branding → logo, institute name, colour, font →
a few questions added in a fast flow → save → conduct (go live) → the live exam on a desktop and on a
phone, carrying the institute's brand. Very smooth, trustworthy, energetic, enthusiastic, engaging,
attractive; the picture matches the voice word for word. It may run fast (Shorts): more content in
less time, never boring.

## Customizations

- Voice: male, English, 22–27, smooth/trustworthy/energetic/enthusiastic → Gemini TTS **Puck**
  (gemini-2.5-pro-tts, Vertex us-central1; key from env only, never written to a file).
- **No on-screen text**: only the real app UI, the logo and testoza.com. Subtitles are separate .srt
  files for YouTube (EN + 5 languages), never burned in.
- Audio tracks in the same voice: Hindi, Tamil, Telugu, Kannada, Malayalam (YouTube multi-language
  audio, WAV the length of the video). App words stay English inside each language.
- Thumbnail in English only. `youtube/description.md` with titles, descriptions, tags.

## Notes

- Never say "free" anywhere (owner rule, charges coming).
- The institute is fictional: "Apex Academy" (the platform's own demo persona) with a logo drawn for
  this video — never a real institute.
- Recorded on app.testoza.com as teacher@testoza.com (demo educator). Kit forked from
  testoza-top-10-features (rec-lib barcode sync, vo/dub/mix pipeline).
- Never overwrite renders; render temp on D: (`TMP=TEMP=D:\hf-render-tmp`), --workers 2.
