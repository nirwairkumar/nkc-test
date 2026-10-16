---
format: 1920x1080
duration: 72.6
mode: autonomous
music: "HeyGen 1768bf0b, epic cinematic trailer build"
message: "From a question paper to a proctored exam with results, in minutes, on TestoZa"
---

# TestoZa launch film: storyboard (v1, 2026-10-14)

Keynote grammar: night-blue stage from the testoza.com hero, one floating browser window that
stays in the same place for the whole film (so every cut reads as the page updating), short
two-tone supers over a top scrim, cursor clicks with ripples, slow camera pushes. The product UI
is TestoZa's own: real components server-rendered with sample data (`ui/render.mjs`) or
line-for-line ports of their JSX (`ui/scenes/scenes.tsx`), styled by the app's own Tailwind build.

| # | Frame | Time | What happens | Super |
|---|-------|------|--------------|-------|
| 1 | f01-open | 0.0–4.0 | Black. Three lines, hard cuts. | It starts with a question paper. / It ends with results. / Here's everything in between. |
| 2 | f02-landing | 4.0–8.4 | testoza.com hero (captured) rises in; push to "Generate a test with AI"; click. | This is TestoZa. |
| 3 | f03-upload | 8.4–14.0 | /generate-with-ai step 1 → Choose File, the PDF drops in → step 2 file chip → scroll to modes → Extract Questions. | Drop in any paper. |
| 4 | f04-extract | 14.0–21.0 | Step 3 live extraction: status card updates 14→41→55→68→79%, 26 questions arrive one by one, list follows, then "30 questions ready". | AI reads every question. / Options. Answers. Diagrams. / 30 questions in 1:14. |
| 5 | f05-review | 21.0–24.4 | Step 4 review: widgets, list drifts; click Edit. | Check it at a glance. |
| 6 | f06-builder | 24.4–30.8 | Builder: Add question → Question 31 slides in, types itself, options, mark C correct, Save test. | Add your own in seconds. / Save. Done. |
| 7 | f07-conduct | 30.8–35.2 | My Tests, "Just created" card glows → Conduct exam → Conduct Online Exam dialog → Start Conducting. | Ready. Now take it live. |
| 8 | f08-proctor | 35.2–43.6 | Live exams card ("Anti-cheating is off") → Settings → Force Full Screen ON, Tab/App Switch ON, 3 warnings then Submit → Save Settings → toast; amber pill gone. | Live in one click. / Anti-cheating, built in. |
| 9 | f09-share | 43.6–46.8 | Copy link → "Exam link copied!"; push into the link. | Share one link. |
| 10 | f10-classroom | 46.8–52.2 | Dusk classroom; every phone lights up with the WhatsApp message; dolly to Rohan; WhatsApp banner. | Every student. Any phone. |
| 11 | f11-whatsapp | 52.2–57.0 | Rohan's phone: the invite (the app's real share text) lands in "JEE 2026 · Batch A"; tap link → exam gateway → Start Examination Now. | No app. / No sign-up. / Just the link. |
| 12 | f12-exam | 57.0–62.4 | Rohan answers (timer running); Ananya, on another phone, taps Submit Test → Submitting… → Test Submitted Successfully! | Exam mode on any phone. / One tap. Submitted. |
| 13 | f13-result | 62.4–67.6 | Back on My Tests: Results button gets its "1" badge with a pulse; click → Test Results sheet: Ananya Sharma 104/124. | Results, the moment they submit. |
| 14 | f14-logo | 67.6–72.6 | The product recedes and blurs; TestoZa mark lands (gold Z), tagline, testoza.com. | Paper to proctored exam. In minutes. |

## Build

- `node ui/render.mjs` → `ui/ssr/*.html` (real components + scene ports, sample data in `ui/data.mjs`)
- `node tools/build-css.mjs` → `assets/app.css` (the app's Tailwind config + index.css, AI-import CSS, KaTeX, local fonts; clock-driven CSS removed)
- `node tools/build-frames.mjs` → `compositions/frames/*.html` + `index.html` from `ui/frames-src/*.tpl`
- Click targets: `node tools/serve.mjs`, open `/tools/measure.html` at 1920×1080, run `measureAll()` and POST to `/__measure` → `ui/measure.json`, then rebuild frames.

## Music

HeyGen catalog track 1768bf0b ("epic cinematic trailer, dramatic orchestral build, heavy percussion,
crescendo", 75 s). Hits every 16 s; placed at 4.25 s so they land on the window rising (4.75), the
review screen (20.5), live exams (36.5), the WhatsApp phone (52.25) and the logo Z (68.5). Trimmed to
68.35 s with a 2.2 s fade-out and loudness-normalised (`assets/bgm/track.mp3`); cold open is silent.
Alternatives in `assets/bgm/candidates/`. Final: `renders/video-music.mp4`.
