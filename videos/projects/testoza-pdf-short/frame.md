# frame.md — TestoZa Short: PDF to live test (1080×1920)

Concept: a live stopwatch challenge on TestoZa's real screens. The product is the hero; the
stopwatch is the one constant. Same brand world as the launch film
(videos/projects/testoza-launch) and the builder tutorial, reframed vertical.

## Palette
- Stage: night blue `#020617` → `#050b1d`, cyan glow `rgba(14,116,144,.30)`, indigo glow `rgba(79,70,229,.22)`, faint 64px grid.
- Brand cyan `#38bdf8`, indigo `#818cf8`, gold Z gradient `#ffe885 → #f4b838 → #9e6400`.
- Text on dark `#f8fafc` / muted `#94a3b8`. Product UI keeps its own colours (real screens).
- Fast-forward badge: gold `#f4b838` on `rgba(244,184,56,.14)`; "stopped" state: green `#22c55e`.

## Type
- Outfit 600–900: supers, stopwatch digits (tabular), logo.
- Mukta 400–800: anything Devanagari.

## Layout (1080×1920)
- Stopwatch pill: top centre, y 150–270, always on top, never moves except the close (grows to centre).
- Supers: two-tone English lines (white + cyan→indigo gradient word), Outfit 800 68–84px, y 300–520, centred, max 2 lines.
- Product: real screen inside a floating light window (radius 28px, deep shadow) or an iPhone-style frame, centred in y 560–1500.
- Keep clear: bottom 20% (y > 1536) for the Shorts title/buttons, right 120px for the like/comment rail.

## Motion
- Seek-safe GSAP only, one paused timeline per frame. Supers rise out of blur word by word (expo.out).
- Screens move like a camera: slow push-ins and scrolls (power2/power3 inOut), never bouncy.
- Hard cuts between frames; the stopwatch carries continuity.
