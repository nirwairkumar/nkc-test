# pdf.testoza.com/how-to-edit-a-pdf — long-form SEO guide

Built 2026-10-02/03. Not committed or deployed.

## What it is

A ~4,900-word guide (about 4,000 words of prose plus FAQ) targeting the informational query
"how to edit a PDF" and the long tail around it (same font, free, scanned, Hindi, phone, remove
text, Word/Google Docs alternatives). It lives on **pdf.testoza.com**, not testoza.com, because the
PDF site is topically about PDFs, is pre-rendered (full HTML for crawlers and AI bots), and links
straight to /edit-pdf. It deliberately targets a different intent from the blog's product guide
(blog.testoza.com/stop-painting-white-boxes-on-your-pdfs), which it links to for brand-by-brand
comparisons.

Chapters: quick start · why the font changes · PDF check-up · changing text · removing text ·
scans · Hindi · sign/fill/mark up · phone · methods compared · safety and legality · fixes · FAQ.

Interactive pieces (all in `frontend/src/pdf/guide/`, prefix `ep-`):

| File | What |
|---|---|
| `HowToEditPdf.tsx` | Page shell and all article text (hero, chapter bar, sections, FAQ, sources) |
| `data.ts` | Meta, short answer, HowTo steps, FAQ, sources (feeds page + JSON-LD) |
| `guide.css` | iOS shell; demos sized by `--ep-fit-h` |
| `HeroPhone.tsx` | iPhone replaying a real edit on /edit-pdf (drop zone → tap date → 14→15 → Done → download toast) |
| `EditorDemo.tsx` + `Paper.tsx` + `certificate.ts` + `chrome.tsx` | Playable copy of the editor on a practice certificate: edit text (subset-aware "Not in this PDF's font" warning), erase, white-out, highlight, draw, shapes, add text, sample logo/signature, find & replace, undo/redo, download → "copy test" sheet |
| `XRay.tsx` | One line + its content stream: original vs white-box edit vs real edit, copy test, search |
| `Triage.tsx` | "PDF check-up": pick a symptom → method |
| `HindiShaping.tsx` | Shaped vs unshaped Devanagari + stored code points |
| `MethodsTable.tsx` | Panna, Acrobat, Word, Google Docs, LibreOffice, Preview/Markup, Edge, online editors, with filters |
| `frame.tsx` | Demo frame (tip, Start again, Full window) and Safari window |

Replicas use the editor's own class strings (TopBar, ToolBar, FormatBar, SelectionBar, FindPanel,
PagesPanel, Dropzone); sm/md/lg variants are resolved from the demo window's width (`bp`), not the
screen's. The certificate's fonts are subsets computed from its own text, so typing letters it never
used (e.g. "Rahul Verma" in the italic name) triggers the same warning Panna shows.

## Shared files touched

- `src/pdf/site/routes.ts` — `guide` PageKey, `SiteArticle`, `updated`, PAGES entry, 2 redirects
- `src/pdf/site/seo.ts` — Article + HowTo JSON-LD, `og:type` article, article times
- `src/pdf/site/boot.tsx`, `entry-server.tsx` — page registered
- `scripts/prerender-pdf.mjs` — PAGE_SOURCE, per-page sitemap lastmod, llms.txt Guides entry
- `scripts/indexnow-pdf.mjs` — path added
- `src/pdf/ui/PannaFooter.tsx` — "How to edit a PDF" link
- `src/pdf/pages/PdfEditorPage.tsx` — one contextual link under "How to edit a PDF online"
- `pdf-public/og/how-to-edit-a-pdf.png` — new share image
- `backend/app/routers/analytics/advanced.py` — path counted as PDF-site traffic

## Checked

`npm run build:pdf` clean (no SSR warnings); HTML 173 KB (34 KB gzipped). Playwright at 1366×657,
1440×900 and iPhone 13: no horizontal overflow, no console errors or hydration warnings; hero stage
ends at 580 px of 657; demo window 453 px tall at 1366×657 (640 at 1080p, 428 on iPhone);
H1 40/28 px, H2 26/21 px, body 16–16.5 px. Edit, warning, find & replace, erase and the copy-test
sheet verified by script. JSON-LD: Organization, WebSite, WebPage, Article, HowTo (5 steps),
BreadcrumbList, FAQPage (10).

## Deploy

1. Push the frontend repo; the `nkc-test-2-0-frontend-pdf` Pages project rebuilds pdf.testoza.com.
2. Deploy the backend (analytics path only; nothing breaks without it — the title contains "Panna").
3. `npm run indexnow:pdf` (Bing/ChatGPT search), then request indexing of the URL in Search Console.

## Facts and sources

Adobe fallback font (Minion Pro): helpx.adobe.com/acrobat/using/edit-text-pdfs1.html · Word's PDF
conversion warning: support.microsoft.com "Opening PDFs in Word" · Google Docs OCR (2 MB, tables and
columns lost): support.google.com/drive/answer/176692 · Preview: support.apple.com · Manafort
redaction (8 Jan 2019): Mother Jones · ISO 32000-2:2020. Panna claims were checked in `src/pdf`
(Producer field, 60 MB autosave cap, 100-step undo, warning strings, scanned-page hint).
