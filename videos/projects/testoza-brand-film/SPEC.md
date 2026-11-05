# SPEC — "First Time" (TestoZa brand film)

GOAL:    an Indian coaching educator feels that paper-only practice leaves their students unready for a
         computer-based exam, and that moving to TestoZa is simple, secure and gives them their nights back.
OUTPUT:  HyperFrames 0.8.222, 1920 x 1080, 24 fps (Veo footage is 24 fps; cinematic cadence).
TIME:    89.8 s x 24 = 2155 frames. Clock = the voice (take s11, 21 sentences, 78.9 s of speech);
         score 84 BPM, sections cut to the edit: 0 / 13.4 / 33.4 / 39.2 / 60.0 / 75.0 / 83.0 (logo).

LOOK:    live action from Gemini 3 Pro Image stills animated by Veo 3.1, graded in-camera:
         paper world = cool fluorescent (exam hall #cfe0e6-ish whites) and tungsten night (lamp ~2700 K
         against blue #1d2b44 shadows); digital world = warm daylight, white walls, light wood.
         Grain: ffmpeg noise alls=3 temporal on all footage, none on UI. No vignette, no glow.
         Product UI = the real app, cropped to the part the line is about, shown at 1.0–1.43x of its
         recorded size, or composited onto a screen in the footage (OpenCV, tracked, lit by the screen).
         End card: ground #ffffff; wordmark per TestoZaLogo.tsx light mode — "Testo"/"a" Outfit 700
         #056eab, "Z" Outfit 900 at 1.26em, gradient #ffe885 → #f4b838 → #9e6400, 150 px base
         (lockup 29% of frame width); tagline Outfit 500 48 px #1c2430; URL Outfit 600 34 px #056eab.
OBJECTS: Priya (22, SSC aspirant: teal kurta, single braid, nose pin, black-strap watch);
         Verma Sir (46, runs the institute: rimless glasses, pale-blue half-sleeve shirt, red pen in pocket,
         steel watch); the red pen; the CBT exam screen ("Quantitative Aptitude · Time Left 59:58");
         the whiteboard ("Weekly Mock 12 / testoza.com/join / 846 331", the real join code in the
         dashboard recording).
MOTION:  camera: every shot a single linear push 1.02–1.12 toward what the line is about (screen, face,
         code); one pull-back (report, 1.10 → 1.00, power2.out) after pushing into the laptop.
         Cuts: hard, on words. One 0.6 s dissolve (the turn, 32.7 s). 0.55 s fade to white at 82.45 s.
         End card: name opens outward from the Z's gap (1.0 s, power3.out) on the logo's first hit
         (83.59); Z drawn in three strokes on its three rising notes (85.71 / 86.06 / 86.42 = Tes-to-Za);
         lockup settle 1.035 → 1.0; tagline wipe 0.8 s at 87.0; URL fade 0.6 s at 87.75.
SHOTS:   see tools/build.mjs (EDL: shot, cut-in second, source in-point, camera) and SCRIPT-en.md.
SOUND:   VO -16 LUFS stem (70 Hz HPF, -1.5 dB @ 240 Hz, 2.5:1 comp); score ducked by the voice
         (sidechain 6:1, 60/700 ms), -2.5 dB @ 2 kHz pocket; 14 diegetic effects only in their shots
         (lowpassed 6.5 kHz); master -14 LUFS integrated, -1 dBTP.
BANNED:  dark void with floating UI; glow/particles/lens flares; fade-and-slide-up text; three cards;
         docked logo; captions repeating the voice; mock-up UI; invented stats or testimonials;
         the word "free"; open-mouthed "talking" faces in a no-dialogue film (Veo adds them — direct
         "lips closed, never speaks"); school uniforms (the students are adult aspirants);
         Verma Sir's face full-on in Veo prompts (Veo flags a look-alike: code 29310472).
QA:      3 s (exam screen legible), 10 s (Priya's mouth closed), 23.5 s (night, glasses off),
         43 s (AI import crisp), 46.5 s (code legible), 55 s (composite on monitor), 58 s (warning
         readable), 62 s (results drawer, 48 submitted), 66.8 s (ranks), 68.6 s (report on laptop),
         77 s (calm, mouth closed), 83.3 s (pure white), 86.6 s (Z complete), 89.5 s (final card).
