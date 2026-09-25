# Panna — PDF Tools (PDF Editor + LaTeX to PDF)

**Date:** 2026-09-25  
**Component:** Frontend only (`frontend/src/pdf/`, `frontend/public/pdf-fonts/`), plus SEO touches in the Cloudflare worker and sitemaps  
**Status:** Implemented & Verified (Chromium end-to-end tests, PyMuPDF output checks, production build)  
**Routes:** `/pdf` · `/pdf/editor` · `/pdf/latex-to-pdf` (old `/convert` redirects here)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why We Built It — Problems With PDFLeader](#2-why-we-built-it--problems-with-pdfleader)
3. [Branding, Routes and Entry Points](#3-branding-routes-and-entry-points)
4. [Architecture — No Backend Server](#4-architecture--no-backend-server)
5. [Tool 1: PDF Editor — What Users Can Do](#5-tool-1-pdf-editor--what-users-can-do)
6. [Tool 1: PDF Editor — How It Works](#6-tool-1-pdf-editor--how-it-works)
7. [Tool 2: LaTeX to PDF — What Users Can Do](#7-tool-2-latex-to-pdf--what-users-can-do)
8. [Tool 2: LaTeX to PDF — How It Works](#8-tool-2-latex-to-pdf--how-it-works)
9. [The `/pdf` Landing Page](#9-the-pdf-landing-page)
10. [File Inventory](#10-file-inventory)
11. [Dependencies, Fonts and Build Setup](#11-dependencies-fonts-and-build-setup)
12. [SEO and Infrastructure Changes](#12-seo-and-infrastructure-changes)
13. [Testing and Verification](#13-testing-and-verification)
14. [Known Limitations](#14-known-limitations)
15. [Deployment Checklist](#15-deployment-checklist)
16. [How to Add a New PDF Tool](#16-how-to-add-a-new-pdf-tool)
17. [Gotchas for Developers](#17-gotchas-for-developers)

---

## 1. Executive Summary

**Panna** (पन्ना — Hindi for *page*, and also *emerald*, hence the green identity) is TestoZa's set of PDF tools. It currently has two tools:

| Tool | Route | One-line description |
|---|---|---|
| **PDF Editor** | `/pdf/editor` | Edit existing text in a PDF **in its own embedded font**, erase text for real, add text, images, signatures, highlights, drawings and shapes, find & replace, and rearrange pages. Hindi and English. |
| **LaTeX to PDF** | `/pdf/latex-to-pdf` | Paste maths from ChatGPT, Gemini or Claude, or a full LaTeX document. Broken copies are repaired, the text is laid out on real pages, and the download is a vector PDF with selectable text. |

Key properties of both tools:

- **Everything runs in the user's browser.** Files are never uploaded; there is no backend API involved.
- **Free, no sign-up, no watermark,** one-click download.
- **Works on phones and laptops.**
- **Heavy code is lazy-loaded:** the PDF engine only downloads once a file is opened or a PDF is exported.

About 11,700 lines of TypeScript across 53 files in `frontend/src/pdf/`.

---

## 2. Why We Built It — Problems With PDFLeader

PDFLeader (pdfleader.com/editor) is the reference product we set out to beat. The problems we found, and what Panna does instead:

| PDFLeader problem | Panna's answer |
|---|---|
| Only ~6 fonts. Edited text is retyped in a look-alike, so it visibly differs from the rest of the document. | Re-uses the **PDF's own embedded font**. Only characters that are missing from that font (PDFs usually carry only the letters they use) are drawn in the closest match — and the editor tells the user exactly which characters. |
| A whole table column becomes one edit box, so changing one cell disturbs the others. | Every cell is its own text block (paragraph merging only happens with real wrap evidence). |
| The edit overlay clips text (e.g. "dem." instead of "demo"). | Paragraphs re-flow inside their original width; justified text stays justified; untouched lines stay byte-identical. |
| "Erase" is a white box drawn on top — the original text is still in the file and can be copied or lifted off. | **True erase**: the glyphs are removed from the content stream and orphaned objects are garbage-collected, so the text is gone from the file. |
| Multi-step export dialog, then a paywall at download, then a subscription. | Ctrl+S / one button downloads immediately. Free, no watermark. |
| Files are uploaded to their server. | Nothing leaves the device. |

---

## 3. Branding, Routes and Entry Points

### Brand constants
`frontend/src/pdf/brand.ts` holds the `PANNA` object (name, "by TestoZa", tagline, description, routes). Renaming the product is a one-file change.

### Routes (`frontend/src/App.tsx`)
All three pages are loaded with `safeLazy` (code-split):

| Route | Component |
|---|---|
| `/pdf` | `pdf/pages/PdfToolsLanding.tsx` |
| `/pdf/editor` | `pdf/pages/PdfEditorPage.tsx` |
| `/pdf/latex-to-pdf` | `pdf/pages/LatexToPdfPage.tsx` |
| `/convert` | `<Navigate to="/pdf/latex-to-pdf" replace />` (old converter URL) |

The old `frontend/src/pages/ConvertPage.tsx` was **deleted** — it is fully replaced by `LatexToPdfPage.tsx` (still recoverable from git history).

### Layout integration
- `frontend/src/Layout.tsx` — `isPannaPage` hides TestoZa's navbar and sidebar on `/pdf*` pages (Panna has its own `PannaHeader`); the site footer stays.
- `frontend/src/components/SubdomainGuard.tsx` — `/pdf` added to the allowed paths; matching is now `pathname === p || pathname.startsWith(p + '/')`.
- `frontend/src/components/Footer.tsx` — new **"PDF tools"** column: *Panna PDF tools* (`/pdf`), *Free PDF editor* (`/pdf/editor`), *LaTeX to PDF* (`/pdf/latex-to-pdf`). The old "LaTeX converter" link was removed from the Platform column. Grid: `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7`.
- `frontend/src/components/landing-v2/content.ts` — the unused `FOOTER_LINKS` entry now points at `/pdf/latex-to-pdf`.

### Shared UI (`frontend/src/pdf/ui/`)
- `PannaLogo.tsx` — `PannaMark` icon + wordmark.
- `PannaHeader.tsx` — sticky header with links (PDF Editor, LaTeX to PDF, All tools) and "TestoZa for teachers ↗"; mobile menu.
- `Dropzone.tsx` — drag-and-drop / click-to-pick PDF input.
- `frontend/src/pdf/handoff.ts` — `setPendingFile` / `takePendingFile`: passes a `File` from one page to the editor route in memory (used by the landing page dropzone and by "Edit as PDF").

---

## 4. Architecture — No Backend Server

**The PDF tools do not use any backend API.** The only backend file touched is `backend/app/routers/sitemap.py`, and that is purely for SEO (listing the new URLs). If the backend is down, the PDF tools keep working — all our tests ran with the backend switched off.

```
 Browser
 ┌─────────────────────────────────────────────────────────────────────┐
 │  React pages (pdf/pages)                                            │
 │     │                                                               │
 │     ├── PDF Editor ── session/session.ts (PdfSession)               │
 │     │                   ├── pdf.js (render pages to canvas)         │
 │     │                   └── engine/* (parse, plan, rewrite, save)   │
 │     │                          └── pdf-lib + @pdf-lib/fontkit       │
 │     │                                                               │
 │     └── LaTeX to PDF ── latex/normalize.ts → MathDocument (KaTeX)   │
 │                         latex/domToPdf.ts → pdf-lib + engine/faces  │
 │                                                                     │
 │  Static files only: /pdf-fonts/*.ttf, /pdfjs/{cmaps,standard_fonts, │
 │  wasm,iccs}, KaTeX font assets                                      │
 └─────────────────────────────────────────────────────────────────────┘
```

The only network requests the PDF code makes (verified by searching the code):
- `/pdf-fonts/<file>.ttf` — Noto fonts (static files in `public/`).
- KaTeX `.ttf` files — bundled Vite assets.
- `/pdfjs/...` — pdf.js CMaps / standard fonts / wasm / ICC profiles (static).
- Images that are part of the user's own document.

**Why client-side is the right choice**
- **Zero server cost** — PDF processing is CPU and bandwidth heavy; each user's device does its own work, so cost does not grow with usage.
- **Privacy** — teachers edit mark sheets, certificates and ID forms; we never store or transmit them. This is also our main marketing point against PDFLeader.
- **Speed** — no upload/download round trip.
- **Resilience** — works even if the API is down.

**Trade-offs**
- Depends on the user's device: a very large PDF (e.g. 200 pages / 50 MB) on a low-end Android phone can be slow.
- Autosaved work lives in one browser (IndexedDB), not in the TestoZa account.
- Any future *paid* limit could only be enforced with a backend.

**Future tools that *would* need a backend:** OCR of scanned PDFs, high-fidelity PDF→Word, saving/sharing PDFs in a TestoZa account, AI features (the existing `/pdf-to-quiz` already uses the backend).

### Bundle / loading
| Chunk | Contents | Loaded when |
|---|---|---|
| `PdfEditorPage` (~5 KB br) | upload hero, FAQ | visiting `/pdf/editor` |
| `session` (~164 KB br) | pdf.js + engine | a PDF is opened |
| `pdf.worker` (~322 KB br) | pdf.js worker | a PDF is opened |
| `Workspace` (~23 KB br) | editor UI | a PDF is opened |
| `LatexToPdfPage` (~17 KB br) | converter page, normaliser, paste converter | visiting `/pdf/latex-to-pdf` |
| `domToPdf` (~7 KB br) + `faces` (pdf-lib + fontkit) | vector PDF exporter | user clicks Download / Edit as PDF |
| Noto fonts (243–779 KB each) | one file per font actually needed | on demand |

---

## 5. Tool 1: PDF Editor — What Users Can Do

### Opening a file
- Drag & drop or pick a PDF on `/pdf/editor` (or on `/pdf`, which hands the file over).
- **Password-protected PDFs:** if the PDF needs a password to open, a dialog asks for it (used only in the browser). PDFs that only restrict *editing* (owner password) open directly with a banner reminding the user to only edit documents they have the right to modify. The downloaded file is unencrypted.
- **Resume:** work is autosaved; the upload page shows a "Continue editing" card (file name, number of changes, time) or "Discard".

### Tools (left toolbar)
| Tool | Key | What it does |
|---|---|---|
| **Edit text** | V | Click any text to change it in place — same font, same position. |
| **Add text** | T | Click to place a new text box; choose font, size, colour, bold/italic, alignment. |
| **Erase** | E | Drag over text to remove it for real (the background stays). |
| **White-out** | W | Drag to cover an area with the sampled page colour (for scanned pages / images). |
| **Highlight** | H | Drag across text; highlights snap to the text lines (Multiply blend). |
| **Draw** | D | Freehand ink, smoothed (Ramer–Douglas–Peucker simplification). |
| **Rectangle / Ellipse / Line / Arrow** | — | Shapes with stroke, fill, width and opacity. |
| **Image** | — | Insert a photo or logo; move/resize; optional white-background removal. |
| **Sign** | — | Signature dialog: **Draw**, **Type** (Google script fonts) or **Upload**; recent signatures are remembered in `localStorage` (`panna:signatures`). |

### Editing text in detail
- Clicking a text block opens an inline editor exactly over the original text, rendered in the matching web font.
- **Live feedback while typing:** e.g. "Not in this PDF's font: V → Times" — the user sees which characters will be drawn in a fallback font before committing.
- **Tab** jumps to the next text block (also across pages), **Enter** commits single-line blocks (**Ctrl+Enter** commits paragraphs, where Enter is a new line), **Esc** cancels.
- Format bar: font family (the document's own fonts + Helvetica/Times/Courier + Noto Sans/Serif/Devanagari), size, colour swatches, bold, italic, alignment, and moving the block.
- Paragraphs re-flow from the first changed line; lines before it are untouched.
- Blocks in fonts that cannot be re-encoded (e.g. Type3) are handled as "erase + add text" automatically.
- Scanned pages show a hint that there is no text layer (use White-out + Add text).

### Find & replace (Ctrl+F)
Search across all pages with match highlighting; **Replace** or **Replace all** (e.g. change a name or date everywhere). Replacements keep each block's formatting (bold stays bold).

### Pages panel
Thumbnails with drag-to-reorder (or buttons), **rotate**, **duplicate**, **delete**, and **insert blank page** (sized like its neighbour).

### Other
- **Undo / Redo** (Ctrl+Z / Ctrl+Y), full history.
- **Zoom**: fit-width by default, Ctrl + / Ctrl − / Ctrl 0, Ctrl + mouse wheel.
- **Delete** removes the selected object; **Esc** deselects.
- **Autosave** to IndexedDB 1.2 s after each change; a `beforeunload` warning protects unsaved work.
- **Download** (button or **Ctrl+S**) — one click, no dialogs. The download toast links to TestoZa's "Make a test" (`/pdf-to-quiz`).
- Mobile layout: toolbar and panels adapt to phone widths.

### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| V / T / E / W / H / D | Edit text / Add text / Erase / White-out / Highlight / Draw |
| Ctrl+S | Download |
| Ctrl+F | Find & replace |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl + / Ctrl − / Ctrl 0 | Zoom in / out / fit width |
| Delete | Delete selected object |
| Esc | Cancel edit / deselect |
| Tab (while editing) | Next text block |

---

## 6. Tool 1: PDF Editor — How It Works

### 6.1 Loading (`engine/load.ts`, `engine/decrypt.ts`, `engine/crypto.ts`)
- `loadPdfLib(bytes, password?)` returns `{ doc, encrypted, restricted }`.
- Our own **Standard Security Handler** implementation: revisions R2–R6, RC4, AESV2 (AES-128) and AESV3 (AES-256), user and owner passwords. Object streams are re-parsed after decryption. Streams are decrypted with native WebCrypto AES. `crypto.ts` (MD5, RC4, AES-CBC, SHA-256/384/512) is verified against FIPS/RFC test vectors.
- Wrong/missing password throws `PasswordError`, which drives the password dialog.

### 6.2 Rendering (`session/pdfjs.ts`, `editor/PageView.tsx`)
- pdf.js 6 (legacy build for broad browser support), worker loaded via Vite `?url`, `isEvalSupported: false`; CMaps/standard fonts/wasm/ICC served from `/pdfjs/`.
- `PageView` renders only pages near the viewport (IntersectionObserver), caps canvas size at 16 M pixels, and swaps canvases without flicker.
- **The preview is the real output:** a single-page copy of the PDF goes through exactly the same `applyPageEdits` as the export and is rendered by pdf.js. What the user sees is what they download.

### 6.3 Understanding the page (`engine/lexer.ts`, `interpreter.ts`, `layout.ts`)
1. **Lexer** — tokenises content streams, keeping the byte range of every operator so that only changed operators are ever re-written. Handles inline images.
2. **Interpreter** — runs the PDF graphics/text state machine (CTM, text matrix, Tc/Tw/Tz/TL/Ts, render mode, colours) and records every glyph (`GlyphRec`): position, size, angle, font, colour, visibility, and a stable key `container|opIndex|arrIndex|start`. It recurses into Form XObjects and honours `/ActualText` marked content (Chrome writes Hindi syllables this way).
3. **Layout analysis** — groups glyphs into lines, then into blocks:
   - lines split at gaps > 1 em; a virtual space is inserted at gaps > 0.13 em;
   - lines merge into a paragraph **only with wrap evidence** (the text reaches the column's right margin, the line has ≥ 6 words or is ≥ 12 em wide, no neighbouring table cell, not a centred stack) — this is what keeps table cells separate;
   - alignment (left / centre / right / justified) is detected per block;
   - each `TextBlock` gets an id `b:<first glyph key>`, styles, line gap, space width, and first-line indent.

### 6.4 Fonts (`engine/fonts.ts`, `cmap.ts`, `faces.ts`, `encodings.generated.ts`)
- `FontInfo` decodes every PDF font kind (Type1, TrueType, Type0/CID, standard 14) via ToUnicode CMaps, encodings (Standard/MacRoman/WinAnsi/MacExpert/Symbol/ZapfDingbats) and the Adobe Glyph List.
- A **reverse map** (Unicode → original glyph code) lets us write new text *in the original font*. Font usage is tracked so we know which glyphs the (usually subset) font really contains.
- **Faces** — what we can write with:
  - `OrigFace` — the PDF's own font (refuses complex scripts, which need shaping);
  - `StdFace` — Helvetica / Times / Courier (WinAnsi, AFM kerning, nothing embedded);
  - `CustomFace` — embedded Noto TrueType with full OpenType shaping by fontkit (Devanagari conjuncts, matras, marks).
- **Fallback order for a missing character:** original font → standard font of the same class (serif/sans/mono, same weight/style) → Noto Serif/Sans → Noto Sans. Devanagari always uses Noto Sans Devanagari. Noto fonts are subset-embedded under PostScript names (`NotoSerif-Bold`, …).

### 6.5 Planning an edit (`engine/planner.ts`, `diff.ts`)
- The old and new text are split into "atoms"; a **Myers diff** finds what changed.
- Unchanged atoms are re-emitted from their **original glyph codes** (pixel-identical).
- Changed text is encoded in the original font where possible, otherwise in the fallback face — the plan records `missing` and `substituted` characters for the live warnings.
- **Re-flow**: from the first changed line only; end-of-line hyphens are treated as soft hyphens; justified lines are squeezed by up to 0.2 of a space; line breaks re-synchronise with the original breaks where possible. The plan reports `overflow` if text no longer fits.
- `planAddText` does the same for new text boxes (wrapping, alignment, line height).

### 6.6 Writing the edit (`engine/emit.ts`, `rewrite.ts`, `apply.ts`)
- `emitGlyphs` serialises planned glyphs: consecutive glyphs share one `TJ`; differences between planned positions and natural advances become TJ adjustments; a new `Tm` starts on baseline changes. For Hindi, each syllable is wrapped in `/Span <</ActualText …>> BDC … EMC`, so copy/paste and search return the right logical text.
- `rewriteContent` replaces only the changed show-text operators; **removed glyphs are replaced by equal TJ offsets** so nothing else on the line moves.
- `applyPageEdits`:
  - isolates page resources (new names `PnF` fonts, `PnGS` graphics states, `PnIm` images, `PnX` forms);
  - **clones Form XObjects** used on several pages before editing, so an edit on one page does not change others;
  - draws overlays: white-out/erase covers, highlights (Multiply), smoothed ink, shapes, images;
  - balances `q`/`Q`; an unmodified page just gets `Contents = [pre, …existing, post]`.

### 6.7 True erase and garbage collection (`engine/gc.ts`)
After export, a mark-and-sweep pass deletes every object no longer reachable from the catalog. Old text, replaced font programs and unused images are physically gone from the saved file.

### 6.8 Export (`session/session.ts`)
`PdfSession.export(slots, edits)`:
1. applies all edits page by page (with progress);
2. rebuilds the page tree from the Pages panel (removal, reordering, duplicates as copies, blank pages, rotation);
3. sets Producer `Panna PDF Editor by TestoZa (testoza.com/pdf)`;
4. runs garbage collection;
5. saves with object streams (smaller files).

### 6.9 Editor UI model (`editor/`)
- `store.ts` — reducer with actions `init, upsert, upsertMany, remove, slots, undo, redo, tool, select, zoom, textDefaults, drawDefaults, saved`. Undo/redo stores whole snapshots.
- Two kinds of edits (`engine/edits.ts`):
  - **content edits** (`TextEdit`, `EraseEdit`) are baked into the page canvas via the preview render;
  - **overlay objects** (`AddTextEdit`, `HighlightEdit`, `InkEdit`, `ShapeEdit`, `ImageEdit`) are shown as HTML/SVG layers until export.
- Layers per page: `TextBlocksLayer` (clickable blocks), `ObjectsLayer` (objects, handles, object toolbar), `ToolLayer` (creation gestures), `SearchLayer` (find matches).
- `geometry.ts` — `View` converts PDF ↔ screen coordinates (rotation aware), `CSS_UNITS = 96/72`.
- `persist.ts` — IndexedDB database `panna`, store `sessions`, key `last` (file bytes, edits, slots, images).
- `EditorContext.tsx` — shared state: session, reports (plans per page), canvas registry, background colour sampling, current edit, search.

---

## 7. Tool 2: LaTeX to PDF — What Users Can Do

The old `/convert` page only rendered `$…$` Markdown and relied on the browser's print dialog. It broke on ChatGPT (`\( \)`, `\[ \]`) and Gemini output. The new page:

### Input it understands
- ChatGPT: `\( … \)` inline and `\[ … \]` display maths, `aligned`, tables with maths.
- Gemini: `$…$` and `$$…$$` in the middle of sentences.
- Claude and generic Markdown: `$$` blocks, headings, lists, bold/italic, tables, code blocks, links, task lists, block quotes.
- **Full LaTeX documents**: `\documentclass`, preamble, `\title/\author/\date/\maketitle`, `\section…\paragraph`, `itemize/enumerate/description`, `tabular` (incl. `\multicolumn`), `quote`, `center`, `\textbf/\textit/\emph/\texttt/\underline`, `\url/\href/\footnote`, `\newpage`, numbered environments (`equation`, `align`, …) with equation numbers.
- Macros: `\newcommand`, `\renewcommand`, `\def`, `\DeclareMathOperator` become KaTeX macros.
- Chemistry: `\ce{…}` (mhchem), even without `$`.
- **Hindi**, including Hindi inside formulas (`\text{आधार}`).
- `\newpage`, `\pagebreak`, `\clearpage` force a page break.

### Automatic repairs ("Fixed:" chips under the editor)
- **Lost backslashes** from copying: `[ … ]` display blocks and `( x^2 )` inline maths are restored.
- **Doubled backslashes** (JSON-escaped text, `\\frac`) are halved.
- **Bare LaTeX** lines/commands with no delimiters (`\frac{a}{b} = c`, "where \alpha is…") are wrapped as maths.
- LaTeX in ` ```latex ` code fences is unwrapped.
- Lone `$` (currency, "costs $5 and $10") stays text.
- **Garbled "selection copies"**: if the user *selects* an answer in ChatGPT/Gemini/Claude/Wikipedia and copies it, the plain text is garbage ("x2x^2"). On paste we read the clipboard's HTML flavour and rebuild clean Markdown with the original TeX of every formula.
- Formula errors are counted; "N formulas have errors — show" scrolls to the first red formula.

### Page and output options
- Paper: **A4** or **Letter**; margins **Narrow** (12.7 mm) / **Normal** (20 mm) / **Wide** (25.4 mm); font **Serif** or **Sans** (Noto); text size **11 / 12 / 13 pt**; **page numbers** on/off.
- **Live paper preview** at true page width (scaled to fit the screen) with dashed **"Page N" markers** exactly where the PDF will break, and a page count.
- Over-wide display formulas and tables are automatically shrunk to fit the page (to at most half size).
- Title box (defaults to the first heading) — used as PDF title and file name (`Worksheet-3-Limits-and-Continuity.pdf`; Hindi names kept).

### Download
- **Download PDF** (or Ctrl+S): a real vector PDF, generated in ~0.3–1 s — no print dialog.
  - selectable, searchable text in the same fonts as the preview (KaTeX fonts + Noto);
  - sharp at any zoom;
  - equation numbers, clickable links, **bookmarks** from h1–h3 headings, document language set (`hi-IN` / `en-IN`).
- **Edit as PDF**: generates the PDF and opens it straight in the Panna editor (add a logo, signature or last-minute fix).

### Convenience
- **Samples** menu: ChatGPT answer, Gemini answer, Copied with broken maths, LaTeX document, Hindi worksheet, Chemistry.
- **Paste** button (reads HTML too, when the browser allows), **Clear** with Undo.
- Draft and settings are saved in `localStorage` (`panna:latex:draft`, `panna:latex:settings`).
- Phone layout: **Write / Pages** tabs and a sticky Download bar (download works from either tab).
- Below the tool: feature cards, a TestoZa cross-sell ("Make a test from a PDF"), FAQ.

---

## 8. Tool 2: LaTeX to PDF — How It Works

```
 textarea ──► normalizeMath() ──► Markdown + $…$ maths + macros + notes
     ▲               │
 paste (HTML) ──► markdownFromPaste()
                     ▼
            MathDocument (react-markdown + remark-math + remark-gfm
                          + rehype-katex + mhchem)
                     ▼
            fitWideContent() → measurePages()  → "Page N" markers
                     ▼   (Download)
            renderDomToPdf(): read the browser's layout → pdf-lib
```

### 8.1 Normaliser (`latex/normalize.ts`)
`normalizeMath(input) → { markdown, macros, notes }`, in order:
1. Normalise newlines/NBSP; strip zero-width characters (ZWJ/ZWNJ kept for Devanagari).
2. Halve doubled backslashes when the text is clearly JSON-escaped.
3. Protect code blocks/spans (LaTeX-looking fences are unwrapped instead).
4. Full-document detection (`\documentclass`, `\begin{document}` or ≥ 2 structural commands) → `latexToMarkdown()`.
5. Extract macros; `\newpage` lines → page-break marker `⟨page-break⟩`.
6. `\[…\]` → `$$…$$`, `\(…\)` → `$…$`.
7. Lost-backslash repairs (`[ … ]`, `( … )`) guarded by a `mathy()` heuristic (commands/operators present and at most 2 plain words outside `{}` groups).
8. `wrapBareMathLines` — whole lines of bare maths (tracks `$$` fences and `\begin/\end` depth).
9. Tokenise with **Pandoc's `$` rules**; inside maths `cleanMath` removes `\label`, fixes `\_`, maps `eqnarray` → `array{rcl}`; in text `fixText` wraps bare maths environments and `\ce{}` (held aside so they are not wrapped twice) and then bare commands (`wrapInlineCommands`).
10. In table rows, `|` inside `$…$` becomes `\vert` (so GFM cells don't split).

`latexToMarkdown` protects all maths first (environments, `$$`, `\[\]`, `\(\)`, `$`), then converts text-mode symbols (`---` → —, quotes, `~`), removes layout commands, converts `\maketitle`, sections, inline formatting, lists (innermost first), quotes, `tabular` → GFM tables, `\\` → hard breaks, and restores maths (placeholders can nest).

### 8.2 Paste converter (`latex/pasteHtml.ts`)
`markdownFromPaste(html, plain)` returns Markdown only when the HTML contains maths markup **and** the plain text is not already TeX source (a copy button's Markdown is kept as is). It recovers TeX from:
- KaTeX (`annotation[encoding="application/x-tex"]`) — ChatGPT, Claude, Perplexity, Notion;
- `data-math` / `data-tex` / `data-latex` attributes;
- Wikipedia (`.mwe-math-element`, `alttext`, fallback image `alt`, `{\displaystyle …}` stripped);
- MathJax 2 `<script type="math/tex">`;
- MathML annotations/`alttext`, and a built-in **MathML → TeX converter** (mi/mn/mo/msup/msub/mfrac/msqrt/mroot/mover/munder/mtable/mfenced…) for MathJax 3 and Word.

The rest of the HTML becomes Markdown (headings, paragraphs, bold/italic/strike, code, lists with nesting, block quotes, tables, links, images, sup/sub). Display maths keeps its line layout. The paste is inserted with `execCommand('insertText')` so the textarea's own Undo works.

### 8.3 Rendering (`latex/MathDocument.tsx`)
- `react-markdown` + `remark-math` + `remark-gfm` + `rehype-katex` (`strict: false`, `throwOnError: false`, macros) + mhchem.
- List markers are rendered as real text (`.md-marker`), not CSS `::marker`, so the exporter can see them.
- The page-break marker renders as `<div data-page-break>`.
- `documentCss(scope, { family, sizePt })` — one stylesheet shared by preview and export (Noto body fonts, headings, tables, code, quotes; equation counter reset per document).
- `ensureDocumentFonts()` registers the Noto web fonts and merges **Noto Sans Devanagari into KaTeX's own font families via `unicode-range`**, so Hindi inside `\text{}` uses the exact font the PDF embeds.

### 8.4 Paging (`latex/paging.ts`) — shared by preview and export
- `layoutAtoms(root)` collects vertical extents that must not be cut: text line boxes, KaTeX `.base` boxes, display formulas, table rows, images, SVGs; headings are extended so they stay with the next line; forced breaks come from `[data-page-break]`.
- `paginate()` merges overlapping extents into regions, fills pages up to the content height, breaks before a region that would cross the page edge (unless it starts in the top 25% of the page — then it is split), and starts each page at the next content (no leading gaps).
- Because both the preview markers and the export use `measurePages()`, **the breaks on screen are exactly the breaks in the file**.
- `fitWideContent()` shrinks overflowing display maths and tables.

### 8.5 Vector exporter (`latex/domToPdf.ts`)
Instead of a screenshot or `window.print()`, we read what the browser laid out and redraw it with pdf-lib:
1. **Collect** (single DOM walk, KaTeX's hidden MathML skipped):
   - every **word** with its position (Range client rects), size, colour, font family list, bold/italic; baseline = rect top + font ascent measured with canvas;
   - **backgrounds and borders** (collapsed table borders centred on cell edges; rounded boxes such as code blocks drawn as rounded paths);
   - **underline/strike-through** from `text-decoration`;
   - **KaTeX SVGs** (radicals, stretchy arrows, braces, `\cancel`) with viewBox/preserveAspectRatio mapping and clipping to `overflow:hidden` ancestors;
   - images, checkboxes, links, h1–h3 headings, and KaTeX **equation numbers** (drawn by a CSS counter in `::before`, so they are re-created).
2. **Fonts**: the same file the browser used — KaTeX's own TTFs (20 files, imported with `?url`) and the Noto files. For each word, characters are split where the browser would switch fonts (following the CSS family list; combining marks stay with their base). Shaping uses the PDF editor's `CustomFace` (fontkit: kerning, ligatures, Devanagari), emitted with the editor's `emitGlyphs` (TJ + ActualText). Characters no font has (emoji) are drawn as a 4× PNG. Devanagari with *italic* is slanted like the browser does.
3. **Word spaces**: a real space glyph is written between words on a line so copy/paste and search see word breaks (important for Hindi ActualText).
4. **Draw order**: backgrounds/borders → images → SVGs → text (one compressed content stream per page) → page numbers ("1 / 4") → link annotations → bookmarks (nested outline).
5. Metadata: Title, Producer `Panna LaTeX to PDF by TestoZa (testoza.com/pdf)`, `/Lang`.

---

## 9. The `/pdf` Landing Page

`pdf/pages/PdfToolsLanding.tsx` is the hub for current and future PDF tools:
- hero with a dropzone (a dropped PDF is handed to the editor via `handoff.ts`);
- tools grid (PDF Editor, LaTeX to PDF live) plus "coming soon" chips;
- comparison table vs a "typical online editor";
- privacy card ("processed on your device");
- TestoZa cross-sell and FAQ (FAQPage schema).

---

## 10. File Inventory

All paths relative to `frontend/src/pdf/`.

### Top level
| File | Purpose |
|---|---|
| `brand.ts` | Product name, tagline, description, routes |
| `handoff.ts` | In-memory file hand-off between pages |

### `engine/` — PDF engine (framework-free TypeScript)
| File | Purpose |
|---|---|
| `lexer.ts` | Content-stream tokenizer with byte ranges; `parseContent`, number/hex helpers |
| `cmap.ts` | CMap parser (codespace ranges, ToUnicode, CID mapping) |
| `pdfobj.ts` | pdf-lib object helpers (`resolve`, typed getters, stream bytes) |
| `matrix.ts` | 2-D matrix and rect helpers |
| `encodings.generated.ts` | Standard/MacRoman/WinAnsi/Symbol/Dingbats encodings + packed Adobe Glyph List (generated) |
| `fonts.ts` | `FontInfo` (decode/encode, metrics, bold/italic/class detection), `FontCache` |
| `interpreter.ts` | Graphics/text state machine → `GlyphRec[]`, containers, images |
| `layout.ts` | Lines, blocks, paragraphs, alignment, styles |
| `edits.ts` | Edit types (`TextEdit`, `AddTextEdit`, `EraseEdit`, `HighlightEdit`, `InkEdit`, `ShapeEdit`, `ImageEdit`), page slots |
| `diff.ts` | Myers diff |
| `faces.ts` | `OrigFace`, `StdFace`, `CustomFace`, `FaceRegistry`, Noto font table |
| `planner.ts` | Text edit / add-text planning, re-flow, fallbacks |
| `emit.ts` | Glyphs → PDF operators (TJ, Tm, ActualText) |
| `rewrite.ts` | Minimal content-stream rewriting |
| `apply.ts` | Applies all edits to a page (resources, form cloning, overlays) |
| `gc.ts` | Mark-and-sweep garbage collection |
| `crypto.ts` | MD5, RC4, AES-CBC, SHA-2 |
| `decrypt.ts` | Standard Security Handler (R2–R6) |
| `load.ts` | Load (and decrypt) a PDF |

### `session/`
| File | Purpose |
|---|---|
| `pdfjs.ts` | pdf.js loader and options |
| `session.ts` | `PdfSession`: open, analyse, preview, plan, add image, export; `browserFontLoader` |

### `editor/` — editor UI
| File | Purpose |
|---|---|
| `Workspace.tsx` | Full-screen editor shell, shortcuts, autosave, download, body scroll lock |
| `TopBar.tsx`, `ToolBar.tsx`, `FormatBar.tsx` | Top bar, tool rail, text formatting bar |
| `InlineTextEditor.tsx` | In-place text editing with live planner warnings |
| `PageView.tsx` | Page canvas rendering and layers |
| `layers/TextBlocksLayer.tsx` | Clickable text blocks |
| `layers/ObjectsLayer.tsx` | Overlay objects, selection handles, object bar |
| `layers/ToolLayer.tsx` | Creation gestures for tools |
| `layers/SearchLayer.tsx` | Find highlights |
| `FindPanel.tsx` | Find & replace |
| `PagesPanel.tsx` | Thumbnails, reorder, rotate, duplicate, delete, insert blank |
| `SignatureDialog.tsx` | Draw / type / upload signature |
| `EditorContext.tsx`, `store.ts` | Shared state, reducer, undo/redo |
| `geometry.ts`, `objects.ts`, `images.ts`, `fonts.ts`, `persist.ts` | Coordinates, object helpers, image processing, web fonts, IndexedDB |

### `latex/` — LaTeX to PDF
| File | Purpose |
|---|---|
| `normalize.ts` | AI/LaTeX input → clean Markdown + maths |
| `pasteHtml.ts` | Clipboard HTML → Markdown with TeX recovered |
| `MathDocument.tsx` | Markdown + KaTeX renderer, document CSS, fonts |
| `paging.ts` | Page sizes, margins, pagination, wide-content fitting |
| `domToPdf.ts` | Browser layout → vector PDF |

### `pages/` and `ui/`
| File | Purpose |
|---|---|
| `pages/PdfToolsLanding.tsx` | `/pdf` hub |
| `pages/PdfEditorPage.tsx` | `/pdf/editor` upload/resume page + workspace |
| `pages/LatexToPdfPage.tsx` | `/pdf/latex-to-pdf` |
| `ui/PannaLogo.tsx`, `ui/PannaHeader.tsx`, `ui/Dropzone.tsx` | Shared UI |

### Outside `src/pdf/`
| File | Change |
|---|---|
| `frontend/public/pdf-fonts/` | Noto Sans (R/B/I/BI), Noto Serif (R/B/I/BI), Noto Sans Devanagari (R/B) — hinted builds — and `OFL-NOTICE.txt` |
| `frontend/scripts/gen-pdf-encodings.cjs` | Generates `engine/encodings.generated.ts` from pdf.js's worker |
| `frontend/vite.config.ts` | `pdfjsAssets()` plugin (serves/copies pdf.js assets) |
| `frontend/package.json` | New dependencies (see below) |
| `frontend/src/App.tsx`, `Layout.tsx`, `components/Footer.tsx`, `components/SubdomainGuard.tsx`, `components/landing-v2/content.ts` | Routes, layout, footer, guard |
| `frontend/src/pages/ConvertPage.tsx` | **Deleted** (replaced) |
| `frontend/scripts/generateSitemap.js`, `public/sitemap.xml`, `public/sitemap/static.xml` | New URLs |
| `backend/app/routers/sitemap.py` | New URLs (SEO only) |
| `infrastructure/cloudflare-worker/worker.js` | Meta tags + SSR content for `/pdf*` |

---

## 11. Dependencies, Fonts and Build Setup

### npm packages (frontend)
| Package | Version | Why |
|---|---|---|
| `pdfjs-dist` | ^6.3.289 | Render PDFs (legacy build) |
| `pdf-lib` | ^1.17.1 | Read/write PDF objects, save |
| `@pdf-lib/fontkit` | ^1.1.1 | Font parsing, OpenType shaping, subsetting |
| `regenerator-runtime` | ^0.14.1 | Required by fontkit's Indic shaper (`regeneratorRuntime is not defined` otherwise) |

Already present and reused: `katex`, `react-markdown`, `remark-math`, `remark-gfm`, `rehype-katex`.

### Fonts
- `public/pdf-fonts/*.ttf` — ~6 MB in total, but each file is downloaded only when needed. **Hinted** Noto builds are used on purpose: fontkit's subsetter corrupts the unhinted builds. Licence: SIL Open Font License (see `OFL-NOTICE.txt`).
- KaTeX fonts come from the `katex` package (imported with `?url` in `domToPdf.ts`).

### Vite plugin `pdfjsAssets()` (`vite.config.ts`)
- Dev: serves `/pdfjs/{cmaps,standard_fonts,wasm,iccs}` from `node_modules/pdfjs-dist`.
- Build: copies those folders to `<outDir>/pdfjs` on `closeBundle` (uses the configured `build.outDir`).

### Generated encodings
`node frontend/scripts/gen-pdf-encodings.cjs` regenerates `engine/encodings.generated.ts` (run only when upgrading pdf.js).

---

## 12. SEO and Infrastructure Changes

- **Page SEO** (`SEO` component on each page): titles, descriptions, keywords, `SoftwareApplication` + `FAQPage` JSON-LD.
- **Cloudflare worker** (`infrastructure/cloudflare-worker/worker.js`):
  - meta for `/pdf`, `/pdf/editor`, `/pdf/latex-to-pdf` (and `/convert`, which previously had wrong "PDF to Quiz" meta);
  - canonical of `/convert` → `/pdf/latex-to-pdf`;
  - `pannaContent` SSR block (H1, intro, bullet points, FAQ schema) for crawlers.
- **Sitemaps**: `/convert` replaced by `/pdf` (priority 0.85), `/pdf/editor` (0.9), `/pdf/latex-to-pdf` (0.75) in `generateSitemap.js`, `public/sitemap.xml`, `public/sitemap/static.xml` and `backend/app/routers/sitemap.py`.

---

## 13. Testing and Verification

Tests were run with Playwright (Chromium) against the dev server **and** the production build, with outputs checked by PyMuPDF (MuPDF), with the backend switched off.

### PDF engine
- Fixtures: Hindi form (Chrome-generated), Word letter (Calibri), PyMuPDF-generated PDF, the TraceMonkey TeX paper, and RC4 / AES-128 / AES-256 / user-password encrypted files.
- Same-font edits confirmed (Times subset with only missing "v"/"V" drawn in Times; Calibri; TeX fonts).
- Hindi edits reshaped with Noto Sans Devanagari and extracted in correct logical order.
- ₹ renders; form XObjects shared by pages are cloned before editing.
- Right-aligned dates and centred titles detected; justified paragraphs re-flow with no overflow.
- After GC, the old text is absent from the raw file and there are no dangling references.
- Decryption: RC4 ~145 ms, AES-128 ~46 ms, AES-256 ~224 ms; wrong password → `PasswordError`; output unencrypted.

### Editor UI
Edit text (with the live "not in this font" warning), Tab navigation, add text, erase, white-out, highlight, draw, rectangle, arrow, image insert and move, drawn signature, find & replace (bold kept), undo/redo, insert blank page, rotate, download, password flow, phone layouts — all passing.

### LaTeX to PDF
- All six samples: **0 KaTeX errors**; PDF fonts are the KaTeX + Noto files; text searchable; PDF matches the preview visually.
- 4-page document: preview says 4 pages, PDF has 4 pages; page numbers on every page; `\newpage` honoured; link annotation present; 8 bookmarks; over-wide formula shrunk to fit; no text crosses the margins.
- Hindi: correct conjuncts and matras; extracted text has proper word spaces ("प्रश्न 1: यदि x2 − 5x + 6 = 0, तो x का मान…").
- Paste round-trip: rendered HTML pasted back → all 11 formulas identical to the source.
- Phone: download works from the Write tab (preview laid out off-screen).
- **Edit as PDF**: the generated PDF opens in the editor with 30 editable blocks; the heading was edited in its own Noto Serif Bold and the old text removed.
- Normaliser regression samples (ChatGPT, mangled copy, Gemini, LaTeX document, JSON-escaped, Hindi): 0 errors, 0 raw-LaTeX leaks.

### Build
`vite build` succeeds; TypeScript check clean for all PDF files; heavy code confirmed in lazy chunks.

---

## 14. Known Limitations

**PDF Editor**
- Scanned PDFs have no text layer → use White-out + Add text (no OCR yet).
- Not editable in place: vertical text, Type3 fonts, some CJK fonts with non-Identity CMaps (these fall back to erase + new text where possible).
- No hyphenation when re-flowing paragraphs.
- Superscripts/subscripts become separate small blocks.
- Page thumbnails show the original pages, not the edits.
- Very large PDFs on low-end phones can be slow (all processing is on-device).

**LaTeX to PDF**
- TikZ, pgfplots and other drawing packages are not supported; only simple `\newcommand`-style macros.
- In the PDF, formulas look exact, but copying a formula out of the PDF gives text in visual order (e.g. a fraction's denominator may come first).
- Images from other websites are skipped if that site does not allow cross-origin access.
- MathML-only pages (no TeX in the HTML) are converted best-effort.

---

## 15. Deployment Checklist

1. `cd frontend && npm install` (new packages).
2. `npm run build` and deploy the frontend as usual (confirm `dist/pdfjs/` and `dist/pdf-fonts/` exist).
3. Deploy the Cloudflare worker (`infrastructure/cloudflare-worker/worker.js`) for SEO meta/SSR on `/pdf*`.
4. Deploy the backend (sitemap only).
5. Smoke test on production:
   - `/pdf/editor`: open a PDF, edit a line, download, open the file.
   - `/pdf/latex-to-pdf`: load the "ChatGPT answer" sample, download, check the text is selectable.
   - `/convert` redirects to `/pdf/latex-to-pdf`.
6. Submit the updated sitemap in Google Search Console.

No database changes, no environment variables, no new backend endpoints.

---

## 16. How to Add a New PDF Tool

1. Create `frontend/src/pdf/pages/<Tool>Page.tsx`; use `PannaHeader` and the same visual language (emerald accent, Outfit font, "free · no sign-up · no watermark · nothing uploaded").
2. Add the route to `PANNA.routes` in `brand.ts` and to `App.tsx` (lazy, under `/pdf/...`).
3. Add the tool to the `/pdf` landing grid (`PdfToolsLanding.tsx`) and the `PannaHeader` links if it is a primary tool; add it to the footer "PDF tools" column.
4. Reuse the engine: `PdfSession` for reading/rendering, `engine/*` for writing, `handoff.ts` to open results in the editor.
5. Add SEO: `SEO` component, worker meta + `pannaContent`, sitemaps.
6. If the tool needs server work (OCR, Office conversion, storage), it will be the first Panna tool with a backend — keep file handling private and document it.

---

## 17. Gotchas for Developers

- **Shell escaping on Windows:** writing files that contain backslashes (regex, LaTeX samples) through Bash heredocs, `node -e`, `python -c` or `sed` silently turns `\\` into `\`. Edit such files with an editor, never through the shell.
- **fontkit + Indic shaping** needs `import 'regenerator-runtime/runtime'` (done in `engine/faces.ts`).
- **Use hinted Noto fonts** — the unhinted builds are corrupted by fontkit's subsetter. Always embed custom fonts with `subset: true` (full embedding breaks Devanagari shaping).
- **pdf.js v6 API:** `PDFDocumentProxy.destroy()` no longer exists (use `loadingTask.destroy()`), and `PageViewport` is not exported (we have our own `View` class).
- **Block ids contain `|`** (glyph keys) — never join ids with `|` as a separator (this broke Find & Replace once).
- **KaTeX equation numbers** are CSS counters in `::before`; they are not DOM text and must be re-created by the exporter (done). The counter is reset per document in `documentCss`.
- **Preview and export must share `measurePages()`** — never paginate differently in one of them.
- The LaTeX preview must stay laid out (not `display:none`) for export to work; on phones it is moved off-screen instead of hidden.
