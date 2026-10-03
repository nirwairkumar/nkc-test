# testoza.com/hindi-online-test-maker — making online tests in Hindi, with working demos that fit the screen

**Date:** 2026-10-03
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/hindi/`, `App.tsx`, `Footer.tsx`, sitemaps, `llms*.txt`, cover), backend (`app/routers/sitemap.py`), Supabase (`20261003130000_analytics_guide_hindi_online_test_maker.sql`), Cloudflare worker (`worker.js`: one `connect-src` entry; redeploy so its bundle includes the guide).
**Status:** Implemented; uncommitted and undeployed for review.
**Related:** [2026-10-02-how-to-conduct-online-exam-guide.md](2026-10-02-how-to-conduct-online-exam-guide.md) (the shell this page started from), [2026-10-01-ai-test-generator-guide.md](2026-10-01-ai-test-generator-guide.md) (Language Output, first described there)

---

## 1. Summary

A long-form guide at **https://testoza.com/hindi-online-test-maker** for Hindi-medium schools and coaching institutes (SSC, railway, police, TET, board exams). Targets "Hindi online test maker", "online test maker in Hindi", "create online test in Hindi", "Hindi quiz maker", "Hindi MCQ test maker", "bilingual test maker Hindi English", "type Hindi in online test", "Hindi medium online test", "Kruti Dev to Unicode" and the Devanagari queries "हिंदी में ऑनलाइन टेस्ट कैसे बनाएं" and "ऑनलाइन टेस्ट मेकर".

- **Angle:** what "works in Hindi" has to mean (Unicode, typing without a Hindi keyboard, reading old papers, matras on cheap phones, bilingual papers), then the practical steps, honest about what TestoZa doesn't do.
- **Sections (12 + FAQ):** the basics · typing Hindi in English letters (+ playable question card, two verified spelling tables) · importing a paper (Fill from photo, AI import, the Kruti Dev trap, + Unicode checker) · Hindi, English or both (+ AI Language Output replay) · what students see (+ exam screen on a phone) · maths and numbers · step by step · competitive-exam coaching (NEET, SSC CGL, RRB NTPC, CTET table) · Google Forms · eight mistakes · honest limits · a summary in Hindi (`lang="hi"`) · 12 FAQs · closing paths.
- **Length:** ~4,880 words of article + ~740 in the FAQ (5,621 in the JSON-LD count, ~5,830 in the crawler HTML with widget fallbacks).

## 2. Screen size and type (the brief)

| | How |
|---|---|
| Demo height | `--ht-fit-h` = `clamp(440px, 100svh − 205px, 640px)` (phones `100svh − 240px`, 420–600), as on the conduct guide. Every demo window is that tall and scrolls inside. Measured: 452 px at 1366 × 657 (544 px free under the bars), 615 px at 1440 × 820, 424 px on an iPhone 13. |
| Wide layouts | Typing: card window + 300 px side panel. AI: 320 px controls + review window. Exam: 376 px phone + side panel. Grid rows are `minmax(0, 1fr)` so content can't grow a demo past its height. |
| Phones | Demo title rows keep Restart / Full window beside the title. Typing: shorter window over one row of controls; the window starts scrolled to the card. AI: one pane at a time (File and language / Result), switching to Result on change. Exam: no bezel (the reader's phone is the phone), one row: paper language + text size. Measured on iPhone 13: every demo's bar + body ≤ 551 px (the space under the bars). |
| Full window | Every framed demo has Full window (Esc or Done returns, state kept). |
| Replicas | Natural size, never scaled, except the hero phone (393 × 852, scaled to the stage). |
| Type | Body 16 px; H1 28–40 px; H2 21–26 px; H3 17 px; lists 15 px; tables 14–14.5 px (13.5 on phones); captions 12.5–13 px; demo titles 16 px. Devanagari in the article uses Mukta (added after Inter in the font stack), the app's own typeface, so Hindi in text and replicas match. |

## 3. Design

Own folder and stylesheet (`pages/guides/hindi/`, prefix `ht-`). The shell CSS was generated from `conductGuide.css` (prefix renamed, demo-specific parts dropped); page-specific styles follow it in `hindiGuide.css`.

**Example paper:** "सामान्य विज्ञान टेस्ट 4: प्रकाश" (General Science Test 4: Light), +2 / −0.5, six bilingual questions written with NCERT Class 10 Hindi-medium terms (`src/guides/hindiData.ts`, shared with the crawler text).

| Piece | File | Copied from |
|---|---|---|
| Hero (teacher types a Hindi question on an iPhone, then the student's view) | `HindiHero.tsx` | `questionCard.tsx` + `examScreen.tsx`, scripted; suggestions from the recorded list |
| Question card with Hindi typing | `questionCard.tsx` | `components/test-builder/QuestionCard.tsx` (classes, cn() merges), `components/ui/IMEInput.tsx` (behaviour, suggestion bar), `ui/textarea`, `ui/select` |
| Typing demo | `TypingDemo.tsx` | — (steps, "Type it for me", tricky-word chips, readout) |
| Transliteration | `transliterate.ts` | IMEInput's request (Google Input Tools, `hi-t-i0-und`, 5 suggestions); falls back to the service's own answers for this page's words, recorded 3 Oct 2026 |
| Unicode checker | `UnicodeCheck.tsx` | — (Devanagari vs legacy-font heuristic: share of "k" (ा in Kruti Dev), rare "a", mid-word capitals, English stop-words) |
| AI Language Output | `AiLanguageDemo.tsx` | `AITestImporter.tsx` AI Settings card (light classes), `PreviewView.tsx` review markup with the product's `aiImport.css` |
| Exam screen | `examScreen.tsx`, `ExamDemo.tsx` | `pages/TestPage.tsx` Standard Mode, phone layout, including the text-size control; `buttonVariants` imported |
| Shared pieces | `replica.tsx` | conduct guide's `replica.tsx` (DemoFrame, Phone, toasts, hooks) |

One deliberate difference from the product: in the replica, the space goes in at once and the word is swapped when the service answers (DOM first, then state); see §5.1.

## 4. Content accuracy

**Outside facts (checked 3 October 2026, linked on the page):** Census 2011: 52.83 crore (43.63%) counted under Hindi as mother tongue (the figure groups related mother tongues). NEET-UG: Hindi-medium candidates get a Hindi + English booklet; English version final. SSC CGL Tier 1: Hindi and English except English Comprehension; 100 Q, 60 min, +2/−0.5. RRB NTPC CBT 1: 15 languages; 100 Q, 90 min, −1/3. CTET: Hindi and English; 150 Q, 150 min, no negative marking. Article 343(1): international numerals. Windows Hindi Phonetic IME (Microsoft docs). Mukta by Ek Type (Devanagari + Latin). Kruti Dev / Chanakya / DevLys store Latin characters.

**Transliteration examples:** every Roman → Hindi pair on the page (both tables, the stem, the hero, the chips, the abbreviations) was sent to the same service on 3 October 2026. Found: capitals make no difference; doubling long vowels fixes most wrong first guesses; English abbreviations are converted (SI → सी, km → कम, pH → पह). A ह्रदय/हृदय row was dropped because the two look almost identical in Mukta.

**Product claims (checked against the code):** English | हिंदी switch per card (question, options, passage) and on the description, not on the test name; conversion on space for letter-only words; five suggestions; bar closes on the next letter; new cards take the last language; needs the internet; Fill from photo keeps Hindi, maps (क)–(घ) to A–D, reads "उत्तर: (ग)" or a mark, never solves, drops "प्रश्न 5", switches the card to Hindi; AI import Language Output (Same as Material / English / Hindi / both, order of selection), PDFs and images only, a text-rich PDF page is sent as its text layer; exam screen in Mukta, text size 12–32 px (18 default); numerical answers 0–9 from the keypad; no Hindi interface; prices as on the conduct guide. Not claimed: an exam-screen language switch, Kruti Dev conversion, other AI languages, Hindi option letters, essays.

## 5. Findings worth a follow-up (not changed)

1. **Fast typing can lose a letter in the app.** `IMEInput.handleKeyDown` waits for the transliteration response before inserting the space, then writes `text` captured at keydown. A letter typed during that wait (≈100–300 ms) is overwritten. Fix: insert the space at once and swap the word when the answer arrives, finding it again in the current value (what `questionCard.tsx` does here).
2. **Kruti Dev PDFs reach the AI as Latin letters.** `hybrid_pipeline.extract_text_and_classify_pages` sends a page with ≥ 50 characters of text layer as text, so a PDF typed in Kruti Dev/DevLys is sent as "Hkkjr dh jkt/kkuh". Detect legacy-font text (the heuristic in `UnicodeCheck.tsx` is a start) and send those pages as images. The guide tells teachers to upload photos or convert first.
3. **The importer's file picker offers Word and PowerPoint** (`accept=".pdf,.doc,.docx,.ppt,.pptx,…"`, and "Select a PDF, Word document, or photo") but the backend only handles PDFs and images. Either convert on the server or drop them from `accept` and the copy.
4. **The exam screen's text-size control is nearly invisible on phones** (`opacity-10 hover:opacity-100`; phones have no hover). Hindi readers are the ones who need it most. Show it at full opacity on touch screens.
5. **The test name has no Hindi switch** (plain `<input>` in `TestBuilder.tsx`), unlike the description.
6. **CSP:** the repo worker's `connect-src` didn't allow `https://inputtools.google.com`, so once deployed it would have blocked the typing demo on testoza.com. Added (one line). app.testoza.com isn't behind the worker, so the product's Hindi typing is unaffected.
7. Still open from earlier docs: `unlock_all_premium` is on, so "exam-security rules are paid" describes the plan design, not today's behaviour.

## 6. Verification

- `tsc -p tsconfig.app.json`: only the 4 existing errors (TestLikeButton, NotificationsPage). ESLint on new files: 0 errors (fast-refresh warnings only, as in the other guides).
- `vite build`: page chunk 32 KB brotli JS + 10 KB CSS (includes `aiImport.css`).
- Crawler harness (esbuild bundle of `guides/worker.ts`): one H1, 17 H2, 20 H3; JSON-LD Article + FAQPage (12) + BreadcrumbList, wordCount 5,621; tags balanced; no control characters; title 59 characters with " | TestoZa", description 148; internal links resolve.
- Playwright (Chromium; 1366 × 657, 1440 × 820, iPhone 13; dark; reduced motion): one H1 on the page, no horizontal overflow, no page errors. Hero fits the first screen at 1366 × 657. Every figure centred. Typed with the keyboard against the live service at 40 ms a key: "nimnalikhit mein se kaun sa kathan satya hai " → "निम्नलिखित में से कौन सा कथन सत्य है", suggestion bar with five words, "kam" → काम then कम picked from the bar; "Type it for me"; service blocked → "prashn" from the built-in list, an unknown word stays in English letters. Unicode checker: Unicode, both Kruti Dev samples, English and romanised Hindi classified correctly. AI demo: Hindi, bilingual (order respected), the Hindi paper. Exam: answer, text size, bilingual, Save & Next, marks (2 right, 1 wrong → 3.5/12), Full window and Esc.
- Supabase (read-only): the live `analytics_landing_type` matches the conduct-guide migration; the new migration only adds this path.
- Cover: `frontend/public/guides/hindi-online-test-maker/cover.png`, 1200 × 630, from a live frame of the hero phone.

## 7. Deployment

1. Review, then commit in the frontend and backend repositories and the root repo.
2. Deploy the frontend (Cloudflare Pages builds from `main`), then the backend (live sitemap).
3. Redeploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production` (bundles the guide and adds the `connect-src` entry).
4. Run `supabase/migrations/20261003130000_analytics_guide_hindi_online_test_maker.sql` in the Supabase SQL editor.
5. Check `https://testoza.com/hindi-online-test-maker` stays on testoza.com, view-source contains "Type Hindi in English letters", and the typing demo converts a word (DevTools → no CSP error for inputtools.google.com).
6. Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
