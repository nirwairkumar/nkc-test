---
workflow: general-video
flow: companion
storyboard: yes
message: "TestoZa पर एक पूरा JEE-स्तर का पेपर — हिंदी, डायग्राम, केमिस्ट्री, गणित, सेक्शन — खुद बनाइए, कुछ ही मिनटों में"
destination: youtube
aspect: 1920x1080
language: hi
audience: Indian teachers and coaching institute owners (Hindi-medium first) who make their own test papers
length: 9m
angle: tutorial
---

## Intent

A detailed how-to tutorial for TestoZa's Create Test page (the test builder), done on a real
desktop screen. Every small and big feature, directed "like the best Hollywood director and
writer of Marvel movies" (owner's words): payoff first, one continuous paper built from start
to finish, each question teaching one new skill, climbing to the hardest one.

Single video, ~8–9 min, YouTube chapters. Female voice. Hindi narration now; an English
narration track on the same picture later (YouTube multi-language audio). On-screen labels stay
in English (the app UI is English) so one picture serves both languages.

The paper: "JEE Main Mini Mock — TestoZa Demo", built from the owner's Allen Sample Test
Paper 04 (questions chosen by the owner, order chosen by us):

| Q | Source (page, question) | Skill taught | Answer |
|---|---|---|---|
| 1 | Physics p8 Q17 — stone on a string | English, then 文A → Hindi, same question typed below; √ options (Sy Pad taste) | D |
| 2 | Physics p8 Q18 — steel/brass wires | Screenshot figure from the PDF, attach outside the question; fraction options on Sy Pad | B |
| 3 | Chemistry p20 Q5 — ozonolysis of but-2-ene | Structure picture inline + Sy Pad conditions arrow; numerical answer | 1 |
| 4 | Maths p21 Q2 — the integral | Full JEE Main question on Sy Pad; log, √, π/4 options | B |
| 5 | Chemistry p16 Q17 — bromobenzene → A | Structure inline, three-reagent arrow, four structure pictures as options | B |
| 6 | Chemistry p17 Q18 — match the list | Sy Pad Match List table | C |
| 7 | Chemistry p14 Q8 — cobalt complex (Part 2) | `\ce{}` on Sy Pad, added in section mode | C |
| 8 | Maths p21 Q1 — R and K integrals (Part 2) | Added to the new Mathematics section | C |

Part 2 (sections), same paper: sections on → all in "Section A" → add Q7 → add section
"Mathematics" with Q8, move Q4 there → split Section A where chemistry begins, name the new
part "Chemistry", rename A to "Physics" → add a "Bonus" section, then merge it into
Mathematics → final Physics | Chemistry | Mathematics → save → My Tests card → candidate's
exam screen → logo.

## Assets

- ../../recycle/question paper/allen set 4.pdf — source paper; figures and structures are cropped from it (p8, p14, p16, p17, p20, p21).
- ../../recycle/question paper/allen set 4 solution.pdf — answer key.
- ../testoza-launch/assets/ — TestoZa fonts (Outfit, Mukta), logo treatment and brand colours from the launch film.
- ../../TestoZa/sample-credentials.md — demo logins; we record as teacher@testoza.com (owner allowed it on 2026-10-15).

## Customizations

- Real screen recording: the agent drives the real builder (local frontend, live backend) in a
  browser signed in as teacher@testoza.com, recorded at 1920×1080. Saving creates one real test
  on that demo account (accepted).
- Logo sting with matching sound at the open and the close.
- Cold open shows the finished paper first ("8 मिनट में आप यह बनाएँगे").
- ALL on-screen text is ENGLISH (owner, 2026-10-15: "only voice should be Hindi, whatever you
  write on screen should be in English"): burned-in captions are the English translation of the
  Hindi voice, chapter chips, cards, key chips, end card all English. The only Hindi on screen is
  product content the tutorial types (Q1's Hindi version) because that is the feature shown.
  `.srt` files: English (burned-in text) + Hindi (matches the voice) for YouTube.
- NO mock UI anywhere (owner, 2026-10-15): every product frame — board stills included — comes
  from the real app.testoza.com captured with Playwright as teacher@testoza.com
  (capture/probe.mjs works; creds via TZ_EMAIL/TZ_PASSWORD env, never in files).
- YouTube pack: Hindi title/description/tags, chapters, thumbnail, pinned comment with testoza.com.
- Female Hindi voice: 2–3 samples offered before the full voiceover is recorded.
- Zoom/punch-ins on the recorded screen at every click that matters; cursor stays visible.

## Notes

- The builder has no structure-drawing editor: structures go in as pictures (cropped from the
  paper), pasted at the cursor — the video says so honestly.
- Say "candidates" for test takers.
- English later: same edit, English script timed to the same scenes, uploaded as an extra
  audio track in YouTube Studio → Languages; fallback is a separate English render if the
  channel lacks multi-language audio.
- Never overwrite earlier renders; make new versions.
- Machine is a 7.7 GB laptop: render with --low-memory-mode.
