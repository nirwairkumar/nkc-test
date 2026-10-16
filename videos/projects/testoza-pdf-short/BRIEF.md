---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Any PDF question paper becomes a live online test in about two minutes on TestoZa"
destination: youtube-shorts
aspect: 1080x1920
language: hi
audience: Indian teachers and coaching institutes
length: 53s
angle: real-time stopwatch challenge
---

## Intent

A YouTube Short (≤ 60 s) on "PDF to online test". Chosen direction (owner: "go with your
recommendations", 2026-10-15): **a live 60-second challenge on TestoZa's real screens** — one
countdown runs the whole Short ("Can this PDF become a live test before the timer hits zero?");
every step races it: the PDF drops in, the AI reads every question, marks are set, the join code
goes out, a student joins on a phone; it ends at 0:00 with the test live. Real product UI from
the launch film, reframed for a vertical screen — never a mock-up.

Voice: a male voice that sounds like a real person speaking ("add male voice and should be
realistic like a human speaking"). Hindi/Hinglish narration; on-screen text in English.

## Assets

- ../testoza-launch/ui/ssr/*.html + ../testoza-launch/assets/app.css — the real TestoZa screens
  (AI import upload, live extraction, review, builder, My Tests, phone exam) rendered from the
  app's own components; source for every product shot.
- ../testoza-launch/capture/ — testoza.com capture (brand tokens, logo).
- ../testoza-builder-tutorial/assets/recording.mp4 — real screen recording, fallback b-roll.

## Customizations

- One countdown timer visible for the whole Short (the retention device).
- Light music bed, carved/ducked under the voice.
- English supers (short two-tone lines, upper third) carry the meaning for muted viewers; no separate
  caption track, because the voice is Hindi and word captions would duplicate the supers. (2026-10-15)

## Notes

- HeyGen free voice allowance is exhausted (renews next month), so narration uses the offline
  Kokoro voices; Hindi male candidates hm_omega / hm_psi. Owner picks by ear from samples/.
- Kokoro's Hindi phonemiser can't read Latin inside Hindi: spell English product words in
  Devanagari for the voice only (as testoza-builder-tutorial/capture/vo-local.mjs does).
- Keep within YouTube Shorts UI safe areas: nothing important in the bottom ~20% (title,
  buttons) or the right edge (like/comment rail).

- 2026-10-15 integration check: the real AI read is 1:14 for a 30-question, 6-page paper, so the
  whole flow is ~2 minutes, not under 60 s. The countdown became a real-time stopwatch that
  fast-forwards (badge "×5") through the AI wait and stops at ~1:50; the message says "about two
  minutes". No third-party (ALLEN) paper on screen: the hook page is built from TestoZa's own
  sample questions.
