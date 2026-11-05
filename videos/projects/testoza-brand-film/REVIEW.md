# Review — "First Time"

Checked on composition snapshots (.hyperframes/review/*), per-clip frame strips, and
`hyperframes check` (lint 0/0, runtime 0, contrast 0, audio 0; layout warnings were the intended camera
overflow, now marked). Sound is measured (ebur128, RMS at the logo's notes); Gemini listens too, but
presence is never judged by Gemini alone (see v2).

## v1 — found and fixed

| Where | Problem | Fix |
|---|---|---|
| 0–13 s | Veo made Priya open her mouth as if talking (no dialogue in this film) | re-takes directed "lips closed, never speaks"; only closed-lip windows used; 10.25 s is a punch-in between two clean takes |
| 0–8 s, 75–78 s | Veo re-drew the exam screen text ("A bain 13C m keg…", options 30/36/45/45) | exact screen flattened from the still and tracked back on (tools/rectify.py + screen_comp.py), staying behind the cubicle partition as the camera pushes past |
| question grid | "21" twice | cells moved: 21 22 23 24 / 25 |
| 75–78 s | pale rectangle on the wall from a pixel graft between differently lit stills | re-animated from the un-grafted still; screen composited instead |
| 12.5–14.2, 31.4 s | Veo invents school-uniformed students when the camera moves back | only the first ~1.7 s of those takes used; the watching shot framed high |
| laptop, report shot | Veo refused frames showing Verma Sir's face (look-alike filter) | re-staged: hands opening the laptop; over-the-shoulder with the real report on screen |
| 60–64 s | results clip started before the drawer opened | source moved to 14.2 s (drawer settled) |
| 69.6 s | report cropped tight on the left | wider crop |
| 56–60 s | warning text ~13 px on the phone | push-in to 1.6x on the warning |
| end card frame 0 | hidden states set with zero-length tweens would flash the logo | initial states moved to CSS |
| mix | photocopier, clock and pen too loud; music masking the voice in the build | effects -3 to -5 dB and softened; 2 kHz pocket in the score; firmer ducking |

## v2 — the signature tune (owner: "you forgot the sonic logo sound")

- Bug: the score was ducked by a compressor keyed on the voice stem, and the stem ended with the last
  line (82.15 s), so the compressor's output ended too: the whole end card was digital silence in v1
  (-240 dB). Gemini's mix review had praised the ending, so presence is now measured.
- Fix (tools/mix.mjs): key and score padded to the full 89.8 s; the tune lifted +9 dB once the voice is
  done (strongest note -13.6 LUFS short-term, level with the voice); limiter keeps peaks at -2 dBFS;
  the script fails if the tune's notes are missing.

## Hindi version

- Mira on eleven_v3 (take-hi3-s33, word-for-word against SCRIPT-hi.md by speech-to-text), placed line by
  line on the English lines (tools/dub-hi.mjs): at most 6.5% faster, 14 of 21 lines start within 0.2 s of
  the English line, every picture boundary respected.
- The Hindi edit holds two paper-world cuts longer (copying 28.9 s, watching 31.55 s) so
  "रिज़ल्ट आने में, दिन लग जाते हैं" stays on the notice board and "जितनी कमरे पर नज़र" lands on Verma Sir.
- End card tagline "जैसी परीक्षा, वैसी तैयारी।" in Poppins Devanagari (Outfit has no Devanagari).

## Known, left as is

- Product footage comes from the real demo account, so test names vary: AI import "DPP 07: Physics",
  lab screen "JEE Main Mini Mock", phone "DPP 07", results "SSC CGL Weekly Mock 12". All real screens.
- The English narrator says "tes-TOE-zuh"; the Hindi says "टेस्टोज़ा".
- Verma Sir's face varies slightly between shots (generated); Priya holds well.
- The exam-hall monitor header ("Quantitative Aptitude") is Veo's own and slightly soft.
