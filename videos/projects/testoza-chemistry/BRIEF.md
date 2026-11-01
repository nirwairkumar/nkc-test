---
workflow: general-video
flow: companion
storyboard: no
message: "Every chemistry question a teacher needs — formulas, ions, reactions with conditions, match-the-list tables, structures and photo fill — can be typed in TestoZa's test builder in minutes."
destination: youtube
aspect: 1920x1080
language: en
audience: chemistry teachers and coaching institutes preparing JEE / NEET / board tests
length: 6-7m
angle: tutorial
---

## Title (working)

**Chemistry Equations in TestoZa — Type Formulas, Reactions, Tables & Structures (JEE 2026 Questions)**

Owner's name for it: "Chemistry Equations in TestoZa - chemistry question creation".

## Intent

A chemistry-only companion to the builder tutorial (testoza-builder-tutorial). Every chemistry tool of
the builder, taught on real JEE Main / JEE Advanced 2026 questions, one new tool per question:

| Q | Source | Teaches |
| --- | --- | --- |
| 1 | JEE Main 2026 (28 Jan, Shift 2) Q69 — complex ions | Maths & symbols → Sy Pad → Chemistry tab → **Formula**; subscripts and charges |
| 2 | JEE Main 2026 Q54 — A(g) ⇌ B(g) | **⇌** and **(g)** keys; tour of ↑ ↓ Δ °C (aq) (s) (l) Ka Kb pH mol |
| 3 | JEE Main 2026 Q67 — borax bead | **arrow with conditions** (rows editor), **Δ** on the arrow, **Words** on the arrow |
| 4 | JEE Main 2026 Q62 — xenon compounds vs shapes | Tables → **Match List**, blue boxes filled with Formula |
| 5 | JEE Advanced 2026 Paper 1 Q11 — carbonyl count | **Numerical answer** type, **Wrong = 0** (manual marks), **inline pictures via the cloud button** (manual choose + upload), heat arrows, Exact value 4 |
| 6 | JEE Advanced 2026 Paper 1 Q6 — Cl₂ / NCl₃ / ClF₃ | **Multiple correct** type, **Fill from photo** (AI reads reactions, ticks A and C from the photo), partial marks **JEE Advanced** |

Then Save → My Tests. End card.

## Owner's rules for this film (2026-10-21)

- Formula typing slower than the builder tutorial (typing segments never sped up in the edit).
- Formula / arrow / reaction-arrow / table clicks clearly visible: drawn cursor + ripple, orange ring
  and tooltip label on every chemistry key, camera framed on Sy Pad.
- Inline diagrams: show the cloud button click, "Choose a picture", the file being picked.
- Question type and marks shown on one or two questions only.
- Do NOT explain: screen snip, calculator, section split, institution name, title/description/time
  (details filled in a few seconds, then straight to questions).
- Voice: the male voice of testoza-live-exam (Gemini Puck), louder than that video.
- Never say "free" anywhere (TestoZa will add charges).

## Customizations

- Real screens only: app.testoza.com recorded with Playwright as teacher@testoza.com at 1.5x
  (2304x1296 frames, CSS 1536x864). One take per question (a–f); each take rebuilds the earlier
  questions off camera first, so any take can be redone alone. Take f saves one real test,
  "JEE 2026 Chemistry — Practice Test", on the demo account.
- Sync: every mark writes a barcode in the page corner; the take's video is read back so each mark
  has its on-screen time (the page lags the recorder by seconds under load). Clicks pinned to their
  {cue} words; build fails if any click lands after its word.
- Not TestoZa (built as overlays): the Windows "Open" file dialog for picking the structure / photo.
- Audio: voice clips levelled to -16 LUFS each (compressed); music carved under the voice;
  final master -12 LUFS, -1 dBTP (live-exam export was -14.3 and felt quiet).

## Assets

- Papers: recycle/JEE (Main)-2026 Session-1 28 January 2026 Shift -2.pdf, recycle/jee-advanced-2026-paper1.pdf, paper2.pdf (scanned; pages rendered to capture/papers/).
- capture/crops: structure-1.png, structure-2.png (P1 Q11), jee-adv-2026-p1-q6.png (P1 Q6 photo).
- Music: assets/music/tech-upbeat.mp3 (cold open), lofi.mp3 (body) from the sibling projects.

## Notes

- Never overwrite renders; new versions get new names. Laptop 7.7 GB → --low-memory-mode.
