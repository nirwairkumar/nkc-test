# blog.testoza.com — "Stop painting white boxes on your PDFs" (static, animated Panna guide)

**Date:** 2026-09-26  
**Component:** Frontend (`frontend/src/blog/articles/`, `frontend/src/pages/blog/`, `App.tsx`, `NewsFeed.tsx`, `UserGuidePage.tsx`, footers, `llms*.txt`), Cloudflare worker (`infrastructure/cloudflare-worker/worker.js`)  
**Status:** Implemented & verified locally (Vite build, PDF-site build, `wrangler deploy --dry-run`, worker harness, Playwright). **Not yet deployed** — needs the frontend deploy **and** a worker deploy (section 7).  
**Related docs:** [2026-09-25-panna-pdf-tools.md](2026-09-25-panna-pdf-tools.md), [2026-09-25-pdf-testoza-subdomain-seo.md](2026-09-25-pdf-testoza-subdomain-seo.md)

---

## 1. Summary

The long-form Panna guide could not be published through the blog CMS (tables, code samples, animation, figures), so it ships as a **static article** that lives in the frontend code and is served on the blog like any other post:

- **URL:** https://blog.testoza.com/stop-painting-white-boxes-on-your-pdfs (also reachable in the app at `/news/<slug>`, `/blog/<slug>`, `/posts/<slug>`).
- ~6,900 words, 12 sections, 12 FAQs, comparison tables, four real product screenshots, 23 links into pdf.testoza.com tools plus testoza.com and PDF-to-quiz.
- **Animated "white box" theme:** a tape patch wipes across "white boxes" in the H1 and the letters type in; an interactive demo shows a certificate being "fixed" the white-box way vs. the Panna way, with an **X-ray** button that reveals the old text still hiding under the box; highlighter marks, a reading-progress bar, a table-of-contents rail and a floating "Try Panna free" button. All motion is switched off for `prefers-reduced-motion`.
- **Crawlable without JavaScript:** the worker serves the article's full text, head tags and JSON-LD (BlogPosting + FAQPage + BreadcrumbList) in the raw HTML, lists it on the blog home page and in the blog sitemap, and names AI search crawlers in the blog's `robots.txt`.
- **Discoverable from the product:** blog feed card (featured while it is the newest post), new user-guide page **/user-guide/pdf-tools**, testoza.com footer, Panna footer, and all three `llms.txt` files.

---

## 2. Architecture — static articles

One dependency-free TypeScript module is the single source of truth for the text. The React page renders it for people; the worker imports the same module and renders it for crawlers, so the two can never drift apart.

```
frontend/src/blog/articles/
  types.ts                   StaticArticle, blocks ('html' | 'widget'), sections, FAQs, sources
  meta.ts                    Slug, titles, dates, cover, keywords (small; imported by App, feed, user guide)
  stopPaintingWhiteBoxes.ts  The article body (HTML strings) — ~57 KB, only in the page's own chunk
  render.ts                  articleJsonLd(), articleCrawlerHtml(), formatArticleDate(), word count
  worker.ts                  Entry point for the Cloudflare worker (STATIC_ARTICLES + helpers)
frontend/src/pages/blog/
  StopPaintingWhiteBoxes.tsx The page: SEO head, header animation, TOC rail, sections, FAQ, CTAs, share
  WhiteBoxDemo.tsx           The interactive white-box / X-ray demo
  stopPaintingWhiteBoxes.css Scoped styles (.wbx), dark mode, animations, reduced motion
frontend/public/blog-assets/stop-painting-white-boxes/
  cover.png                  1200×630 social image (170 KB)
  *.webp, *-640.webp         Screenshots of edit-pdf, edit-hindi-pdf, latex-to-pdf, chatgpt-to-pdf
```

Rules for `src/blog/articles/*` (the worker bundles it with esbuild): no React, no browser APIs, no `@/` path aliases, no npm imports.

### How it is wired

| Place | Change |
|---|---|
| `App.tsx` | `BlogPostRoute` renders a static article when the slug matches `STATIC_ARTICLE_PAGES`, otherwise the normal `NewsPostView`. Used by `/blog/:slug`, `/news/:slug`, `/posts/:slug` and the blog subdomain's `/:slug`. The page is lazy-loaded (own chunk). |
| `NewsFeed.tsx` | Static articles are merged into the API feed (same category/search filters, pinned first, then newest). Cards show "Guide" instead of view/like counts. |
| `UserGuidePage.tsx` | New section **Free PDF Tools → Panna PDF Tools** (`/user-guide/pdf-tools`): what Panna does, link to the guide, four tool cards, "edit a PDF in three steps", tips (PDF to quiz, scanned PDFs). The intro page links to it. |
| `components/Footer.tsx` | "Panna guide" link in the PDF tools column. |
| `pdf/ui/PannaFooter.tsx` | "Complete guide" link on every pdf.testoza.com page. |
| `public/llms.txt`, `public/llms-full.txt`, `scripts/prerender-pdf.mjs` | The guide and the user-guide page listed for LLMs (testoza.com and pdf.testoza.com). |
| `worker.js` | See section 3. |

Analytics: `blog_cta_click` (clicks from the article to pdf.testoza.com / testoza.com; props `article`, `target` = host + path) and `blog_share` (props `article`, `network`, `where`).

---

## 3. Worker changes (blog.testoza.com)

| Request | Before | After |
|---|---|---|
| `/<static-slug>` | 404 (slug not in the posts API) | 200, full article head + body + JSON-LD, no API call |
| `/` (blog home) | API posts | API posts + static articles (pinned first, then newest) |
| `/sitemap.xml` | API posts | + static articles; `image:image` for absolute cover URLs |
| `/robots.txt` | `User-agent: *` | + explicit allow for OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User |
| testoza.com `/user-guide/pdf-tools` | generic user-guide meta | own title/description (same as the React page) |

**Important:** until the worker is deployed, people will see the article (the React app renders it), but crawlers that read the raw HTML will get the worker's **404 noindex** page for this slug.

---

## 4. SEO / AI-search checklist

| Item | Implementation |
|---|---|
| Raw-HTML content | Full article (H1, dek, byline, TOC, all sections, FAQ, sources) injected into `<main>` by the worker |
| Title / description | `Edit PDF Text in the Same Font for Free: The Complete Panna Guide` (keyword first) / 153-character description |
| Canonical | `https://blog.testoza.com/stop-painting-white-boxes-on-your-pdfs` — exactly one, in raw HTML and after hydration |
| Robots | `index, follow, max-image-preview:large, max-snippet:-1` |
| Structured data | One JSON-LD `@graph`: BlogPosting (headline, dates, author/publisher TestoZa, image, wordCount, keywords, `about` Panna, `isPartOf` Blog), FAQPage (12 Q&As, identical to the visible FAQ), BreadcrumbList. The page adds the graph through Helmet only when the worker's copy is not already in the HTML, so rendered pages never carry two FAQPage blocks. |
| Social | og:type article, 1200×630 cover with width/height/alt, article published/modified times, twitter card |
| Headings | One H1; H2 per section; question-style FAQ |
| Internal links | 23 links to pdf.testoza.com tools, links to testoza.com and /pdf-to-quiz; links back from the blog feed, user guide, both footers |
| Images | Real screenshots, WebP, `srcset` 640/1280, width/height, lazy, descriptive alt |
| Discoverability for LLMs | Listed in testoza.com `llms.txt` / `llms-full.txt` and pdf.testoza.com `llms.txt`; quotable definitions, comparison tables and FAQs in plain HTML |
| Honesty | Competitor facts only from their own public pages (sources listed at the end of the article); no fake ratings or reviews |

---

## 5. Verification done

- `tsc --noEmit`: no new errors (the 4 existing ones in `TestLikeButton` / `NotificationsPage` remain). ESLint on changed files: clean except 3 existing `any`s in `safeLazy` (`App.tsx`), unchanged.
- `vite build` and `npm run build:pdf` succeed; the article text is only in the page's own lazy chunk (~20 KB brotli JS + ~5 KB CSS); the main bundle only gains the small `meta.ts`.
- `wrangler deploy --dry-run --env production`: bundles fine (119.9 KiB, 38.3 KiB gzip).
- Worker harness (real `index.html`, mocked posts API, 36 checks, all pass): article 200 with the right title, one canonical, one JSON-LD graph (BlogPosting, FAQPage, BreadcrumbList, 12 FAQs), full text and LaTeX intact, no leftover testoza.com homepage copy; blog home lists it; sitemap has URL, lastmod and image; robots names the AI bots; API posts unchanged; unknown slugs still 404; old `testoza.com/blog/<slug>` and `/news/<slug>` still 301 to the blog.
- JSON-LD after hydration (Playwright): exactly one article graph both on a plain app load (added by Helmet) and with the worker's graph in the HTML (Helmet adds none).
- Playwright (desktop, phone 390 px, dark mode, reduced motion): animations and demo steps, X-ray, TOC rail, floating CTA, tables, no horizontal scroll on phones; blog feed shows the article as the featured card; `/user-guide/pdf-tools` renders with working links.

---

## 6. Adding another static article

1. Add `src/blog/articles/<name>.ts` exporting a `StaticArticle` (copy the shape of `stopPaintingWhiteBoxes.ts`) and its meta in `meta.ts` (add it to `STATIC_ARTICLE_METAS`).
2. Add it to `STATIC_ARTICLES` in `worker.ts`.
3. Add a page component in `src/pages/blog/` (or reuse `StopPaintingWhiteBoxes.tsx` as a template) and register the slug in `STATIC_ARTICLE_PAGES` in `App.tsx`.
4. Put images in `public/blog-assets/<slug>/`; make sure the slug does not clash with a CMS post.
5. Deploy the frontend **and** the worker.

---

## 7. Deployment

1. **Merge** this branch to `main` in both repositories (the frontend repo builds testoza.com / blog.testoza.com and pdf.testoza.com; Cloudflare Pages deploys both on push).
2. **Deploy the worker:** `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production`. Without this, crawlers get a 404 for the article (people still see it).
3. **Check:**
   - `curl -s https://blog.testoza.com/stop-painting-white-boxes-on-your-pdfs | grep -c "Myers diff"` → at least 1 (article text in raw HTML).
   - `https://blog.testoza.com/sitemap.xml` lists the article; `https://blog.testoza.com/robots.txt` shows the AI crawler block.
   - Share the URL in WhatsApp/LinkedIn to see the cover preview.
4. **Search engines:** Google Search Console → URL inspection → request indexing for the article and `/user-guide/pdf-tools`; submit `https://blog.testoza.com/sitemap.xml` if not already. Bing Webmaster Tools → submit the URL (ChatGPT search and Copilot use Bing).
5. **Spread it** (the biggest lever for AI recommendations): share the article where teachers and students ask about editing PDFs — see section 5 of the pdf.testoza.com SEO doc.
