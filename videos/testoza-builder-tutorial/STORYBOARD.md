---
format: 1920x1080
duration: 9m
message: "TestoZa पर एक पूरा JEE-स्तर का पेपर — हिंदी, डायग्राम, केमिस्ट्री, गणित, सेक्शन — खुद बनाइए, कुछ ही मिनटों में"
arc: Payoff (cold open) → Logo → Promise + map → Build it, one skill per question, climbing → Twist (sections) → Save + candidate's view → Logo + CTA
audience: Indian teachers and coaching institute owners (Hindi-medium first)
mode: collaborative
---

# Plan — v1 (2026-10-15)

Base layer: one real screen recording of the builder (1920×1080, agent-driven browser, signed in as
teacher@testoza.com), cut into chapters. On top: punch-in zooms on every click that matters, a
soft cursor halo, a chapter chip top-left, key-press chips (Win+Shift+S, Ctrl+V), Hindi captions on
one track, and designed cards for the open, the chapter titles, Part 2 and the close.

Voice: Hindi female, warm and clear, "दीदी who teaches" not "news anchor". Tech words stay English
the way teachers say them (question, options, Sy Pad, section, save). Lines below are the
narration guide; the locked script goes to SCRIPT.md after this plan is approved.

Recording rule: every frame's actions are listed under it (`Do:`). The browser types at a human
pace (40–60 ms/char) so viewers can follow; long LaTeX is typed through Sy Pad keys, not pasted.

## Round log

- 2026-10-15 — Plan v1 approved by owner ("go ahead as per best choice": runtime ≈10:20 kept, sketches first). Sketch pass done: index.html holds 17 posed stills (temporary monolith, one per second — the build replaces it with one sub-composition per frame); board at boards/storyboard.html. Change from review: chapter chip shows its name for 3 s at each chapter start, then shrinks to a number badge in the page's left margin (full chip covered the page heading).
- 2026-10-15 — Owner notes on board v1, all three accepted:
  1. On-screen text English only (captions = English translation of the Hindi voice; chips, cards, end card English). Hindi voice unchanged.
  2. Frame 07 (Q2): the snip box was on the options — wrong. Snip exactly the Steel / M / Brass / 2M figure (page 8 render at 110 dpi: x ≈ 243–322, y ≈ 625–742, English column), and attach it as the question's diagram: below the question text, above the options, as in the paper.
  3. Mock UI rejected: board v2 is rebuilt from REAL captures of app.testoza.com (Playwright, teacher@testoza.com, 1920×1080). Probe done: capture/shots/create-test-empty.png (signed in, menu on rail). Final film = real recording, same UI and behaviour.
- Next: board v2 from real captures (script capture/board.mjs: fill details, type Q1, 文A → Hindi, Sy Pad open, sections on, split/merge menu, candidate view) → owner confirms → SCRIPT.md
- 2026-10-15 — Board v2 started: capture/board.mjs signs in (clicks Sign in if the modal doesn't open by itself), fills Frame 04 for real → capture/shots/f04-details.png (title, description, 3h = 180 min, JEE / NEET (+4, −1)). Real control labels for scripting every later frame are in capture/shots/controls.txt — e.g. language switch aria "Choose another typing language" (one per field), "Maths & symbols" (Sy Pad), "Picture", "Add picture to option A–D", "Mark option X as correct", "Question 1 text" textarea, "Split into sections", "Institution branding", "Question type", "Add question", "Save test". Nothing is saved to the account during board captures.
- Next: extend board.mjs for Frames 05–16 (scroll to the question card, type Q1, Hindi via the language menu, Picture upload of the cropped Q2 figure, Sy Pad states, sections/split/merge), snapshot each, rebuild boards/storyboard.html from the real shots with English overlays.
- 2026-10-15 (new session) — Board v2 built from REAL captures. capture/ = lib.mjs (sign-in, card = <article> in page order, editBox clicks preview-or-textarea, Sy Pad insert, clipboard image), steps.mjs (every action in film order: details, q1–q6, sectionsOn, q7, mathsSection, splitMerge), board.mjs runner. Crops of the paper's figure/structures in capture/crops (watermark whitened). Product facts learned the hard way: filled boxes switch to a rendered preview on blur; Sy Pad inserts into the last box clicked (open it first, then click the option); a new question keeps the previous question's language; a Hindi word converts only when a space follows it directly (punctuation after a word blocks it — possible product bug, flagged to owner); Sy Pad refuses to insert while a "?" box is empty; section questions number from 1 per section; new-section questions start at +1/0; headless Chromium needs synthetic HTML5 drag events on ".drag-handle". Story change: the extra section is "Bonus", merged into the split-out "Mathematics" (toast "Bonus merged into Mathematics"). Frame 16 (candidate view) still needs a Save — captured in the recording step.
- 2026-10-15 — Owner approved board v2 ("Go"). SCRIPT.md v1 locked (16 lines, ~1,000 Hindi words, UI words in English, chemistry/maths spelled as spoken). Voice samples (HeyGen Starfish, Hindi female, same passage): samples/gentle-gita.mp3 (a6f2b5cd…), samples/aahana-verma.mp3 (1bd41839…), samples/riya-mehta.mp3 (0b464b2f…). HeyGen free plan = 10 min TTS/month via OAuth; samples used ~54 s; full VO ≈ 9–10 min. Next: owner picks a voice → full VO line by line (word timestamps → captions) → recording with Save + candidate view → build.
- 2026-10-15 — Final v1. Owner picked Aahana Verma, but HeyGen's free allowance ran out after lines 1–5 (assets/vo/, kept); owner chose the free local voice for the whole film: Kokoro hf_alpha (capture/vo-local.mjs spells English UI words in Devanagari for the voice only; venv at videos/.venv-tts, HYPERFRAMES_PYTHON). Recording: capture/record.mjs at 1920×1080 with an injected cursor + click ripple → capture/rec/recording.webm + marks.json (one real test saved on teacher@testoza.com). Edit: capture/build.mjs → index.html (6:05; footage retimed ≤3× per voice line, last-frame holds with slow push, English captions, chapter chips, logo stings with sfx_001, launch-film music at 7%). Lint: 0 errors, 9 structure warnings (cards inline, not sub-compositions — Studio tidiness only). YouTube pack: youtube/subtitles-en.srt, description.txt (chapters), title-and-tags.txt. Render: renders/builder-tutorial-hi-v1.mp4. Earlier sketch index saved as boards/sketch-index-v2.html.
- (old) Next: owner confirms the board → SCRIPT.md (locked Hindi narration) → 2–3 Hindi female voice samples → agent-driven recording → build.

## Frame 1: Cold open — the finished paper (0–18s)

- act: Open
- status: built
- duration: 18s
- scene: Fast, rhythmic cuts across the FINISHED paper on the candidate's exam screen: Hindi under English, the steel/brass figure, the benzene options, the integral, the three-reagent arrow, the match table. Ends on the section tabs Physics | Chemistry | Mathematics.
- voiceover: "हिंदी और इंग्लिश में एक साथ सवाल… पेपर से सीधे डायग्राम… केमिस्ट्री के स्ट्रक्चर… और JEE लेवल का पूरा गणित। ये पूरा पेपर अगले कुछ मिनटों में, आप खुद बनाएँगे।"
- transition_in: cut

Recorded LAST (after Frame 16 saves the paper), cut FIRST. Payoff before process: the viewer sees
exactly what they'll be able to make.

## Frame 2: Logo sting (18–24s)

- act: Open
- status: built
- duration: 6s
- scene: TestoZa wordmark builds (orange Z lands last) with a whoosh + soft impact; tagline "Create Test — पूरा ट्यूटोरियल".
- voiceover: (none — sound design only)
- transition_in: whip

## Frame 3: Promise and the map (24–40s)

- act: Open
- status: built
- duration: 16s
- scene: The Allen Sample Test Paper 04 PDF on the left; a chapter map on the right lights up 1→8 (Details · दो भाषाएँ · डायग्राम · स्ट्रक्चर · Sy Pad गणित · बड़ा रिएक्शन · Match table · Sections).
- voiceover: "नमस्ते! आज हम इस JEE Main सैंपल पेपर से छह चुने हुए सवाल लेकर TestoZa पर एक पूरा टेस्ट बनाएँगे। हर सवाल एक नई चीज़ सिखाएगा। चलिए शुरू करते हैं।"
- transition_in: crossfade

## Frame 4: Open Create Test + test details (40s–1:35)

- act: Part 1 — the paper
- status: built
- duration: 55s
- scene: Sidebar → Create Test (menu on the rail). Type title, short description, time 3h chip, "Only my students", institute name + logo, marking scheme JEE (+4 / −1).
- voiceover: "बाईं तरफ़ मेनू में Create Test पर क्लिक करें। सबसे पहले टेस्ट का नाम — 'JEE Main Mini Mock'। नीचे एक लाइन का description, जो candidates टेस्ट शुरू करने से पहले देखेंगे। समय चुनिए — यहाँ तीन घंटे। 'Only my students' का मतलब है टेस्ट सिर्फ़ उन्हीं को दिखेगा जिन्हें आप लिंक भेजेंगे। अपने institute का नाम और logo यहाँ डालिए — ये पेपर पर हर candidate को दिखेगा। और marking में JEE चुनिए — सही पर चार, गलत पर माइनस एक।"
- transition_in: cut

Do: click Create Test → title "JEE Main Mini Mock — TestoZa Demo" → description "Physics, Chemistry, Maths — 8 चुने हुए सवाल" → 3h chip → Only my students → institute name "TestoZa Demo Academy" + logo upload → marking JEE.

## Frame 5: Q1 in English (1:35–2:10)

- act: Part 1 — the paper
- status: built
- duration: 35s
- chapter: 2 — एक सवाल, दो भाषाएँ
- scene: Type Physics p8 Q17 in English in the question box. Punch-in on the text growing.
- voiceover: "पहला सवाल फ़िज़िक्स का है। पहले इसे इंग्लिश में टाइप करते हैं — एक पत्थर, L लंबाई की डोरी, ऊर्ध्वाधर वृत्त में।"
- transition_in: cut

## Frame 6: Q1 in Hindi + options (2:10–3:00)

- act: Part 1 — the paper
- status: built
- duration: 50s
- scene: Click "English | 文A" → pick हिन्दी from the menu → new line below → type the Hindi version (matches the paper's Hindi column). Options A–D with √ (first look at Sy Pad's √ key). Mark D correct.
- voiceover: "अब वही सवाल हिंदी में। ऊपर English के पास वाले बटन पर क्लिक करें और मेनू से हिंदी चुनें। अब आप जो भी टाइप करेंगे, सीधे हिंदी में बनेगा। इंग्लिश के ठीक नीचे वही सवाल हिंदी में लिख देते हैं। ऑप्शन्स में square root चाहिए — इसके लिए Sy Pad का √ बटन। सही जवाब D पर टिक करें। बस — एक सवाल, दो भाषाएँ।"
- transition_in: cut

Do: 文A → हिन्दी → Enter → type "एक पत्थर को L लम्बाई की एक डोरी से बांध कर…" (paper text) → options √(u²−2gL), √(2gL), √(u²−gL), √(2(u²−gL)) → correct D.

## Frame 7: Q2 — a diagram straight from the paper (3:00–3:50)

- act: Part 1 — the paper
- status: built
- duration: 50s
- chapter: 3 — पेपर से डायग्राम
- scene: Add question. Type p8 Q18 text. Switch to the PDF, key chip "Win + Shift + S", drag a box around the Steel/Brass figure, back to builder, attach it as the question's diagram (outside the text). Options as fractions on Sy Pad. Correct B.
- voiceover: "दूसरे सवाल में एक डायग्राम है। उसे दोबारा बनाने की ज़रूरत नहीं। PDF खोलिए, Windows + Shift + S दबाइए, और डायग्राम के चारों तरफ़ एक बॉक्स खींचिए। वापस आकर डायग्राम वाले बटन पर पेस्ट कर दीजिए — फ़ोटो सवाल के नीचे अलग से लग गई। ऑप्शन्स में भिन्न यानी fractions — Sy Pad का fraction बटन, ऊपर अंश, नीचे हर। सही जवाब B।"
- transition_in: cut

Do: + Add question → text → PDF tab → snip figure → builder → diagram slot Ctrl+V → options 2a²c/b, 3a/(2b²c), (2ac/b²) etc. via Sy Pad fraction → correct B.

## Frame 8: Q3 — a structure inside the sentence (3:50–4:45)

- act: Part 1 — the paper
- status: built
- duration: 55s
- chapter: 4 — केमिस्ट्री स्ट्रक्चर
- scene: Chemistry p20 Q5. The but-2-ene structure (cropped from the paper) pasted at the cursor INSIDE the question text, then Sy Pad's conditions-arrow key: (i) O₃ on top, (ii) Zn/H₂O below → (P). Question type: numerical. Answer 1.
- voiceover: "तीसरा सवाल केमिस्ट्री का। यहाँ स्ट्रक्चर सवाल के अंदर, लाइन के बीच में आएगा। TestoZa में स्ट्रक्चर ड्रॉ करने का टूल नहीं है — तो हम उसे पेपर से काटकर वहीं पेस्ट करते हैं जहाँ कर्सर है। उसके आगे Sy Pad का arrow — ऊपर O3, नीचे Zn और पानी। ये सवाल numerical है, तो जवाब में सीधे नंबर डालेंगे — एक।"
- transition_in: cut

## Frame 9: Q4 — JEE Main maths, fully on Sy Pad (4:45–5:55)

- act: Part 1 — the paper
- status: built
- duration: 70s
- chapter: 5 — Sy Pad से गणित
- scene: Maths p21 Q2. Open Sy Pad (punch-in on the keyboard). Build ∫ x²dx / ((1+x²)(1+√(1+x²))) key by key; preview renders live. Options: log(1+√2), log(1+√2) − π/4, log(1+√2) + π/4, None of these. Correct B.
- voiceover: "अब बारी है गणित की। ये रहा Sy Pad — गणित का अपना कीबोर्ड। Integral का बटन… अंदर fraction… ऊपर x square dx… नीचे दो ब्रैकेट — पहले में 1 + x square, दूसरे में 1 + square root, और root के अंदर फिर 1 + x square। ऊपर देखिए — जैसे-जैसे आप लिखते हैं, सवाल बिल्कुल पेपर जैसा बनता जाता है। ऑप्शन्स में log, root और π by 4 — सब Sy Pad से। सही जवाब B।"
- transition_in: cut

## Frame 10: Q5 — the big reaction (5:55–7:10)

- act: Part 1 — the paper
- status: built
- duration: 75s
- chapter: 6 — बड़ा रिएक्शन
- scene: Chemistry p16 Q17, the climax. Bromobenzene picture inline → Sy Pad conditions arrow with three stacked reagents: (i) Mg, ether then CO₂, H⁺ (ii) NH₃, Δ (iii) Br₂, NaOH → A. Then FOUR structure pictures as options A–D (one per option slot). Correct B (aniline).
- voiceover: "अब इस वीडियो का सबसे बड़ा सवाल — JEE लेवल का multistep रिएक्शन। पहले bromobenzene का स्ट्रक्चर। फिर Sy Pad का arrow, और उसके ऊपर तीनों reagents एक के नीचे एक — Mg ether फिर CO2, फिर NH3 और heat, फिर Br2 और NaOH। और इस बार ऑप्शन्स भी स्ट्रक्चर हैं — हर ऑप्शन में अलग फ़ोटो। एक ही सवाल में पाँच डायग्राम, और फिर भी सब साफ़। सही जवाब B — aniline।"
- transition_in: cut

## Frame 11: Q6 — the match table (7:10–7:50)

- act: Part 1 — the paper
- status: built
- duration: 40s
- chapter: 7 — Match the list
- scene: Chemistry p17 Q18. Sy Pad → Tables → Match List; fill List-I (reactants) and List-II (products). Options A–D. Correct C.
- voiceover: "Match the list वाले सवाल के लिए टेबल बनाने की ज़रूरत नहीं — Sy Pad में Tables, फिर Match List। बाईं तरफ़ reactants, दाईं तरफ़ products। सही जवाब C।"
- transition_in: cut

## Frame 12: Part 2 card + drag to reorder (7:50–8:10)

- act: Part 2 — sections
- status: built
- duration: 20s
- chapter: 8 — Sections
- scene: Designed card "भाग 2 — Sections". Then drag the maths question (Q4) to the end of the list.
- voiceover: "पेपर तैयार है — अब इसे असली JEE की तरह Physics, Chemistry और Maths में बाँटते हैं। पहले गणित वाले सवाल को पकड़कर सबसे नीचे खींच देते हैं।"
- transition_in: whip

## Frame 13: Sections on + add to Section A (8:10–8:35)

- act: Part 2 — sections
- status: built
- duration: 25s
- scene: Switch on sections → all six land in "Section A". Use the "+" between questions to add Chemistry p14 Q8 with \ce{[Co(en)2(NH3)2]^3+} options from Sy Pad's Chemistry keys. Correct C.
- voiceover: "Sections चालू करते ही सारे सवाल Section A में आ गए। यहीं बीच में एक और केमिस्ट्री का सवाल जोड़ते हैं — complex के फ़ॉर्मूले Sy Pad के chemistry बटन से।"
- transition_in: cut

## Frame 14: New section — Mathematics (8:35–8:55)

- act: Part 2 — sections
- status: built
- duration: 20s
- scene: "Add a new section" → name it "Bonus" (it starts with one empty question) → Maths p21 Q1 (R and K integrals), marks +4/−1. Correct C.
- voiceover: "नया section जोड़िए, नाम दीजिए Bonus, और इसमें एक गणित का सवाल।"
- transition_in: cut

## Frame 15: Split, rename, merge (8:55–9:30)

- act: Part 2 — sections
- status: built
- duration: 35s
- scene: In Section A, "+" before the first chemistry question → "Split section here" → rename A → "Physics", the new part → "Chemistry". The integral is still last in Chemistry → split again → name it "Mathematics". "+" between Mathematics and Bonus → "Merge these two sections" (last into second-last) → toast "Bonus merged into Mathematics". Result: Physics (2) | Chemistry (4) | Mathematics (2).
- voiceover: "अब Section A को दो में बाँटते हैं — जहाँ से केमिस्ट्री शुरू होती है, वहाँ '+' पर Split section here। पहले हिस्से का नाम Physics, नए का Chemistry। Integral वाला सवाल अभी भी Chemistry में है — उसे भी split करके नाम दिया Mathematics। और आख़िर में Bonus को Mathematics में Merge कर दिया। Physics, Chemistry, Mathematics — बिल्कुल JEE जैसा।"
- transition_in: cut

## Frame 16: Save → My Tests → the candidate's screen (9:30–10:05)

- act: Close
- status: built
- duration: 35s
- scene: Save test → My Tests, the new card glows → open the test as a candidate: section tabs, the Hindi line, the figure, the integral.
- voiceover: "Save पर क्लिक करें। आपका टेस्ट My Tests में आ गया। और candidates को ये ठीक ऐसा दिखेगा — sections, हिंदी, डायग्राम, गणित, सब कुछ।"
- transition_in: cut

## Frame 17: Logo + call to action (10:05–10:20)

- act: Close
- status: built
- duration: 15s
- scene: The exam screen keeps moving behind; the logo sting lands over it; "testoza.com" + subscribe chip; end-screen space for YouTube cards (right 40%).
- voiceover: "आज ही testoza.com पर अपना पहला टेस्ट बनाइए। वीडियो अच्छा लगा तो subscribe ज़रूर करें।"
- transition_in: crossfade

Runtime estimate: ~10:20 (over the 9m expectation — Q4/Q5 need time to be followable; trim
candidates are Frames 4 and 15 if you want 9:00 sharp).

## YouTube pack (delivered with the render)

- Title (hi): "Online Test कैसे बनाएँ? Hindi + English, Diagram, Chemistry, JEE Maths | TestoZa Create Test पूरा ट्यूटोरियल"
- Chapters = Frames 3,4,5,7,8,9,10,11,12,16 timestamps.
- Description opens with the search phrases teachers type (online test kaise banaye, hindi question paper maker, JEE mock test maker, coaching test software), then chapters, then testoza.com.
- Hindi .srt now; English .srt + English audio track later (same picture).
- Thumbnail: finished paper on a laptop, "पूरा पेपर 10 मिनट में" + benzene + ∫.
