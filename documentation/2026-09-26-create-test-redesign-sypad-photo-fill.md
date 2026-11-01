# Create Test redesign, Sy Pad rebuild and Fill from photo (2026-09-26)

## Summary
`/create-test` and `/edit-test/:id` were redesigned in the same iOS-style visual language as `/my-tests` and the landing page, with older teachers as the main audience. No existing tool was removed.

## Page (TestBuilder)
- Large title header; grouped cards: **Test details → Instructions (collapsible) → Exam options → Questions**.
- Plain-language fields: "Test name", visibility as "Only my students / Everyone", time presets (15m–3h), one-line explanation under every exam option.
- Institution branding (premium) moved into a collapsible row; JSON guide, AI prompt guide, Sy Pad and Clear everything moved into the header **⋯** menu.
- Normal and section mode share one component: `frontend/src/components/test-builder/QuestionCard.tsx` (previously two ~450-line copies; screen snip now also works in sections).
- Sticky save bar with question/marks/time summary and a **"N need attention"** button that jumps to the first incomplete question (`questionIssue()` in `builderUtils.ts`).
- Pictures over 50 KB upload to Cloudinary instead of being rejected.
- "Clear everything" also resets sections, merged marks and calculator.
- `CreateTestPage.tsx`: capability cards + FAQ folded into one collapsed "Help" disclosure (still in the DOM for SEO; FAQ schema unchanged).

## Fill from photo
- Per-question button opens `PhotoFillSheet.tsx`: take/choose/drag/paste a photo (printed or handwritten).
- Fills question, options, type, language, and the answer **only when marked in the photo** (tick/circle/"Ans:"); diagrams are cropped and uploaded. Banner with Undo; notes when the photo contains more questions.
- Backend: new `POST /api/ai/read-question` in `backend/app/routers/ai.py` (Gemini, `ai_light_per_user` limit, reuses pipeline helpers).
- Frontend client: `frontend/src/lib/photoQuestionApi.ts`; falls back to `/api/ai/parse` if the new route returns 404 (before backend deploy).

## Sy Pad (math keyboard)
- Docks to the bottom like a phone keyboard and pads the page so the target question stays visible; closes with Done/Esc.
- Shows the target ("Goes into Question 2 · Option B"); context hint for Chemistry (`\ce{}`) / Words (`\text{}`) / Maths; "How to" table.
- Preview never shows raw code: `previewTex.ts` balances input and falls back to lenient rendering / last good render.
- Insert/Copy always produce complete LaTeX (`finalizeLatex` in `mathSyntax.ts`); warns about empty boxes; smart backspace; auto-paired braces; real spaces inside `\ce{}`.
- 4 key rows instead of 5, ◀ ▶ now move the cursor, "123" tab on phones, plain-English tooltips on keys.

## Minimap
VS Code style: questions/options rendered as tiny colour-coded text, draggable viewport slider, amber marks on incomplete questions, top/bottom jump buttons.

## Input behaviour (IMEInput)
- Optional `livePreview` shows rendered maths under a box while editing.
- When a box's text changes while it is not focused (photo fill, Sy Pad insert, cloud upload) it switches to its rendered view.

## Not changed
`frontend-admin` keeps its own older TestBuilder copy.
