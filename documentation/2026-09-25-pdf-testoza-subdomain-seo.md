# pdf.testoza.com — Panna on its own subdomain, with full SEO and AI-search optimisation

**Date:** 2026-09-25  
**Component:** Frontend (`frontend/src/pdf/site/`, `frontend/pdf-public/`, `vite.pdf.config.ts`, build scripts), Cloudflare worker, sitemaps  
**Status:** Implemented & verified locally (production build, Pages-like server, Lighthouse, Playwright). **Not yet deployed** — needs a new Cloudflare Pages project (section 8).  
**Companion doc:** [2026-09-25-panna-pdf-tools.md](2026-09-25-panna-pdf-tools.md) (how the tools themselves work)

---

## 1. Summary

The PDF tools moved from `testoza.com/pdf/*` to their own subdomain **https://pdf.testoza.com**, built as a separate, lightweight, **pre-rendered** site from the same frontend repo:

- Every page ships as real HTML — title, description, canonical, Open Graph, JSON-LD and the full page text — so Google, Bing and AI crawlers (ChatGPT, Claude, Perplexity) read it without running JavaScript.
- Two new intent pages: **Edit Hindi PDF** and **ChatGPT to PDF**.
- Own `robots.txt`, `sitemap.xml`, `llms.txt`, real 404s, 301s for short/old URLs, IndexNow for Bing.
- Lighthouse (mobile, simulated throttling): Performance 92–99, Accessibility 100, Best Practices 100, SEO 100 on every page; CLS 0.
- Old `testoza.com/pdf*` and `/convert` URLs 301-redirect to the new pages.

---

## 2. URL map

| Page | URL | Notes |
|---|---|---|
| Hub | `https://pdf.testoza.com/` | All tools, facts, comparison, FAQ |
| PDF editor | `https://pdf.testoza.com/edit-pdf` | Main editor |
| Hindi PDF editor | `https://pdf.testoza.com/edit-hindi-pdf` | Same editor, Hindi-focused copy (bilingual) |
| LaTeX to PDF | `https://pdf.testoza.com/latex-to-pdf` | Converter |
| ChatGPT to PDF | `https://pdf.testoza.com/chatgpt-to-pdf` | Same converter, ChatGPT-focused copy |
| 404 | any other path | `404.html`, HTTP 404, `noindex` |

Slugs follow the market's exact-match queries ("edit pdf", "latex to pdf", "chatgpt to pdf") and scale to future tools (`/merge-pdf`, `/compress-pdf`, `/pdf-to-word`).

**301s on pdf.testoza.com** (generated `_redirects`): `/edit`, `/editor`, `/pdf-editor`, `/pdf/editor` → `/edit-pdf`; `/hindi`, `/hindi-pdf-editor` → `/edit-hindi-pdf`; `/latex`, `/convert`, `/pdf/latex-to-pdf` → `/latex-to-pdf`; `/chatgpt` → `/chatgpt-to-pdf`; `/pdf` → `/` (with and without trailing slash).

**301s on testoza.com** (Cloudflare worker `PANNA_MOVED` + `public/_redirects` fallback for app./blog. hosts + an in-app redirect in `App.tsx`):

| Old | New |
|---|---|
| `testoza.com/pdf` | `pdf.testoza.com/` |
| `testoza.com/pdf/editor` | `pdf.testoza.com/edit-pdf` |
| `testoza.com/pdf/latex-to-pdf` | `pdf.testoza.com/latex-to-pdf` |
| `testoza.com/convert` | `pdf.testoza.com/latex-to-pdf` |

---

## 3. Architecture

Same source tree (`frontend/src/pdf/`), second build:

```
npm run build:pdf
  1. vite build --config vite.pdf.config.ts                 → dist-pdf/ (client, pdf.html template)
  2. vite build --config vite.pdf.config.ts --ssr src/pdf/site/entry-server.tsx  → dist-pdf-server/
  3. node scripts/prerender-pdf.mjs                         → dist-pdf/*.html, sitemap.xml, _redirects, llms.txt, _routes.json
```

| File | Role |
|---|---|
| `frontend/vite.pdf.config.ts` | PDF-site build: root `pdf.html`, `publicDir: pdf-public`, own Tailwind config, pdf.js asset plugin, dev rewrite |
| `frontend/tailwind.pdf.config.ts` | Scans only `src/pdf/**` + 3 UI components → small CSS |
| `frontend/vite.pdfjs-assets.ts` | pdf.js cmaps/fonts/wasm/iccs served in dev, copied to `dist-pdf/pdfjs` |
| `frontend/pdf.html` | HTML template (`<!--head-->`, `<!--app-->` placeholders), icons, font preload, deferred GA4 |
| `src/pdf/site/routes.ts` | **Single source of truth**: every page's path, output file, title, description, OG image, schema data, redirects |
| `src/pdf/site/content.ts` | All page copy: definitions, facts, steps, FAQs, comparison — shared by pages and JSON-LD |
| `src/pdf/site/seo.ts` | Head tags + JSON-LD graph (build time) and `applyHead()` (client navigation) |
| `src/pdf/site/App.tsx` | Routes, footer, toasts, head sync, intent-based code preloading |
| `src/pdf/site/entry-server.tsx` | `render(url)` for the pre-renderer |
| `src/pdf/site/entry-client.tsx` | Tiny entry: paint first, then load `boot.tsx` |
| `src/pdf/site/boot.tsx` | Loads the current page's code, then hydrates |
| `src/pdf/site/site.css` | Self-hosted Outfit, Tailwind, colour tokens, `.cv-auto` |
| `src/pdf/ui/Sections.tsx` | QuickFacts, HowToSteps, FaqSection, CompareTable, RelatedTools, Screenshot |
| `src/pdf/ui/PannaFooter.tsx` | Footer with all tool links + TestoZa/legal links |
| `src/pdf/pages/NotFoundPage.tsx` | 404 |
| `frontend/pdf-public/` | robots.txt, `_headers`, favicons/manifest, `og/*.png`, `screenshots/*.webp`, fonts, pdf-fonts, IndexNow key |
| `frontend/scripts/prerender-pdf.mjs` | Pre-renders pages, writes sitemap / redirects / llms.txt / `_routes.json` |
| `frontend/scripts/serve-pdf.mjs` | `npm run preview:pdf` — local server that behaves like Cloudflare Pages |
| `frontend/scripts/indexnow-pdf.mjs` | `npm run indexnow:pdf` — ping Bing & co. after a deploy |

**No backend.** Still 100 % client-side; `_routes.json` makes sure the repo's `functions/` (testoza.com share/test previews) never run on this site.

### Hydration and loading strategy
- The first paint never waits for JavaScript: `entry-client.tsx` waits two frames, then imports `boot.tsx`, which loads the current page's chunk and hydrates.
- JS is **not** `modulepreload`ed (measured: preloading competed with the first paint; home page went 87 → 99 without it). Route CSS is linked in the HTML.
- KaTeX + the Markdown pipeline (~460 KB) load **after** hydration on the converter pages (`MathDocument` is lazy and mounted after mount).
- Other pages' code is fetched on intent (hover, focus, touch on a link).
- Rules that keep hydration exact (no mismatch → no re-render): anything read from the browser (draft, settings, screen width) is loaded in effects; phone-only layout uses CSS (`max-lg:`); the `<style>` for the document preview uses `dangerouslySetInnerHTML`; the pre-renderer inserts HTML with **function** replacers (a string replacer turns `$$` into `$`).

---

## 4. Technical SEO checklist (all done)

| Item | Implementation |
|---|---|
| Server-rendered content | Pre-rendered HTML with full text (680–1,290 words per page) |
| Title / description | Unique per page, 51–63 / 151–159 characters, keyword first |
| Canonical | Self-referencing absolute URL in the raw HTML; identical after JS |
| Robots meta | `index, follow, max-image-preview:large, max-snippet:-1`; 404 is `noindex` |
| robots.txt | Allows all; AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot, ChatGPT-User, Claude-User, Perplexity-User) named explicitly; sitemap declared |
| XML sitemap | 5 URLs, `lastmod` from `UPDATED`, `image:image` screenshots |
| Real 404s | `404.html` → HTTP 404 (no SPA soft-404s) |
| Redirects | 301s for aliases and all old testoza.com URLs; `.html` URLs 308 to clean URLs (Pages default) |
| Duplicate host | `https://:project.pages.dev/*` gets `X-Robots-Tag: noindex` |
| Structured data | JSON-LD `@graph`: Organization (TestoZa, address, contact, sameAs), WebSite, WebPage (dateModified, primaryImageOfPage), BreadcrumbList, WebApplication (free Offer, featureList, screenshot, category), FAQPage, ItemList (hub). No fake ratings. |
| Social previews | 1200×630 PNG per page (`og/*.png`, 123–152 KB), og:* and twitter:* tags |
| Headings | Exactly one H1 per page; question-style H2/H3 |
| Internal links | Header + footer + "More free PDF tools" on every page; testoza.com footer links to all 5 pages; llms.txt on both sites |
| Images | Real product screenshots, WebP, `srcset` 640/1280, width/height set, lazy, descriptive alt |
| Mobile | Responsive; phone tabs on the converter; tap targets ≥ 44 px |
| Performance | See section 6 |
| Accessibility | 100 in Lighthouse: AA contrast (white on emerald-700), accessible names, `inert` on off-screen UI |
| Security headers | nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy, HSTS |
| IndexNow | Key file in `pdf-public/`, `npm run indexnow:pdf` |

---

## 5. AI search / "Why would ChatGPT recommend us?" (GEO)

How AI assistants find recommendations:

| Assistant | Where its live answers come from |
|---|---|
| ChatGPT (search) | Bing index + OpenAI's `OAI-SearchBot` crawler; cites Wikipedia and Reddit heavily |
| Microsoft Copilot | Bing index |
| Google Gemini / AI Overviews / AI Mode | Google's index (Googlebot) |
| Perplexity | Its own crawler (`PerplexityBot`) + Reddit and forums |
| Claude (search) | `Claude-SearchBot` / web search |

Beyond live search, models also "know" brands from their training data — which comes from how often the web mentions them. That part is earned off-site over months.

### What the site now does for AI engines
- **Readable without JS** (pre-rendered) — many AI crawlers do not execute JavaScript.
- **Quotable definitions** right below each hero: "Panna PDF Editor is a free online PDF editor made by TestoZa. It edits the existing text of a PDF in the document’s own embedded font…" — plus a facts table (price, account, watermark, privacy, languages, devices, maker). Same text in the JSON-LD `description`.
- **Question-shaped content**: visible FAQs (not collapsed), "How to …" steps, comparison and support tables.
- **Entity clarity**: consistent naming "Panna by TestoZa", Organization schema linking pdf.testoza.com to TestoZa (address, contact, LinkedIn).
- **Freshness**: "Last updated" date on every page (`UPDATED` in `content.ts`), mirrored in `dateModified` and sitemap `lastmod`.
- **Crawler access**: explicit allow for AI search bots; IndexNow for Bing (ChatGPT search / Copilot).
- `llms.txt` on pdf.testoza.com and a Panna section in testoza.com's `llms.txt` (harmless; Google says it does not use it).

### What only people can do (the biggest lever)
Brand mentions on YouTube, Reddit, Quora, forums and listicles correlate far more with AI recommendations than backlinks. Recommended, in order:
1. **Index it**: Google Search Console (submit the sitemap; keep "Search generative AI" = include) and **Bing Webmaster Tools** (import from GSC), then `npm run indexnow:pdf`.
2. **YouTube**: 30–60 s demos — "Edit Hindi PDF without breaking matras", "ChatGPT maths to PDF", "Edit PDF in the same font". Link pdf.testoza.com in the description.
3. **Reddit / Quora**: genuinely answer existing questions (r/Indian_Academia, r/Teachers, r/LaTeX, r/ChatGPT; Hindi PDF questions on Quora). Always disclose you built it.
4. **Listings**: AlternativeTo (as an alternative to Smallpdf, iLovePDF, PDFLeader, Sejda), Product Hunt launch, free G2/Capterra listings.
5. **blog.testoza.com**: 2–3 how-to articles linking to the tools; tell existing TestoZa teachers (email/WhatsApp).
6. **Profiles**: add TestoZa's official YouTube/X/Instagram/Facebook URLs to `ORGANIZATION.sameAs` in `src/pdf/site/seo.ts`.
7. **Refresh** page copy every 2–3 months and bump `UPDATED`.
8. **Measure**: GA4 referrals from `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`; ask the assistants the target questions monthly.

No one can guarantee an AI assistant will recommend a product; these steps maximise the odds.

---

## 6. Performance results

Lighthouse 12, mobile, simulated throttling (PageSpeed Insights method), local build with Brotli:

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 95 | 100 | 100 | 100 | 2.5 s | 110 ms | 0 |
| `/edit-pdf` | 99 | 100 | 100 | 100 | 2.0 s | 40 ms | 0 |
| `/edit-hindi-pdf` | 99 | 100 | 100 | 100 | 2.0 s | 50 ms | 0 |
| `/latex-to-pdf` | 92 | 100 | 100 | 100 | 3.2 s | 40 ms | 0 |
| `/chatgpt-to-pdf` | 92 | 100 | 100 | 100 | 3.2 s | 40 ms | 0 |

What moved the numbers (first run of `/edit-pdf` was Performance 62):
- GA4 (190 KB, 750 ms of main-thread time on a mid-range phone) now loads on the first interaction or after 8 s.
- Hydration starts after the first paint; no JS `modulepreload`.
- KaTeX split out of the converter page chunk (560 KB → 97 KB).
- Self-hosted Outfit (47 KB, preloaded) instead of Google Fonts.
- `content-visibility: auto` on below-the-fold sections; phone-sized screenshots.

Converter pages are slightly lower because their largest element is the (large) editor UI itself.

---

## 7. Verification done

- Raw-HTML check as `OAI-SearchBot`: definition, facts, FAQ questions, H1 and JSON-LD present on every page.
- Playwright on the production build (served like Cloudflare Pages): no hydration errors (checked with development React too), correct head on load and after in-app navigation, JSON-LD parses, one H1, all images load, 404 returns 404 + noindex, redirects return 301.
- Functional: full editor suite (edit, Tab, find & replace, download, encrypted PDF), all six converter samples (0 formula errors), paste recovery, phone download, "Edit as PDF" hand-off, 4-page document.
- testoza.com build succeeds without any PDF code/assets; footer links point to pdf.testoza.com.

---

## 8. Deployment (Cloudflare)

testoza.com's DNS is on Cloudflare and the frontend is a Cloudflare Pages project connected to GitHub; `app.`, `blog.` and `news.testoza.com` are custom domains of that same project. pdf.testoza.com is a **second** Pages project from the **same repo**.

1. **Push** the frontend, worker and backend changes.
2. **Create the project**: Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → repository `nkc-test-2.0-frontend`, production branch `main`.
   - Framework preset: None · Build command: `npm run build:pdf` · Build output directory: `dist-pdf`
   - (Optional) Settings → Builds → Build watch paths: `src/pdf/*`, `src/components/ui/*`, `pdf-public/*`, `pdf.html`, `vite.pdf.config.ts`, `tailwind.pdf.config.ts`, `vite.pdfjs-assets.ts`, `scripts/prerender-pdf.mjs`, `package.json`, `package-lock.json`
3. **Custom domain**: the new project → Custom domains → Set up a custom domain → `pdf.testoza.com` → Activate. Cloudflare creates the DNS record (`CNAME pdf → <project>.pages.dev`, proxied) and the certificate automatically. Do **not** add it to the main project.
4. **Worker**: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production` (testoza.com 301s).
5. **Check**: `https://pdf.testoza.com/edit-pdf` loads; `https://testoza.com/pdf/editor` → 301 → `https://pdf.testoza.com/edit-pdf`; `https://pdf.testoza.com/robots.txt` and `/sitemap.xml` load.
6. **Search engines**: GSC (a Domain property for testoza.com already covers the subdomain; otherwise add URL-prefix `https://pdf.testoza.com/`) → submit `https://pdf.testoza.com/sitemap.xml`; Bing Webmaster Tools → import from GSC; run `npm run indexnow:pdf`.

---

## 9. Maintenance

- **Add a PDF tool**: add a page component, add an entry to `PAGES` (`routes.ts`) and its copy to `content.ts`, map its source file in `PAGE_SOURCE` (`scripts/prerender-pdf.mjs`) and add a loader in `boot.tsx` + `entry-server.tsx`. Sitemap, header, footer, related tools, breadcrumbs and JSON-LD follow automatically. Add an OG image (`pdf-public/og/`) and screenshots (`pdf-public/screenshots/`, plus a `-640.webp` copy).
- **Update copy**: edit `content.ts` and bump `UPDATED` / `UPDATED_LABEL`.
- **Local preview**: `npm run build:pdf && npm run preview:pdf` → http://localhost:8096 (behaves like Pages: redirects, 404s, headers, compression). Dev server: `npm run dev:pdf` (:8095, no pre-rendering).
- **Never** put facts in the copy that are not true of the product; no ratings/review counts in schema unless they are real.

### Trade-off to know
Google treats a subdomain largely as its own site, so pdf.testoza.com starts with less authority than `testoza.com/pdf` would have had. The 301s, the testoza.com footer links, blog links and the off-site plan above are what compensate.
