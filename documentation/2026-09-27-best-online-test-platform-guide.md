# testoza.com/best-online-test-platform — animated, crawlable SEO guide

**Date:** 2026-09-27  
**Component:** Frontend (`frontend/src/guides/`, `frontend/src/pages/guides/`, `App.tsx`, `Layout.tsx`, `Footer.tsx`, `UserGuidePage.tsx`, sitemaps, `llms*.txt`), Cloudflare worker (`infrastructure/cloudflare-worker/worker.js`)  
**Status:** Implemented & verified locally (Vite build, `wrangler deploy --dry-run`, worker harness, Playwright). Goes live when the branch is merged to `main` **and** the worker is deployed (section 6).  
**Related:** [2026-09-26-blog-white-boxes-article.md](2026-09-26-blog-white-boxes-article.md) (same static-content pattern, for the blog)

---

## 1. Summary

A long-form guide at **https://testoza.com/best-online-test-platform** targeting "best online test platform", "online test conducting platform" and related searches, written for three audiences:

- **Teachers:** chapter/PDF/photo → AI test (Extract vs Generate, English/Hindi/bilingual), editing, marking, sharing.
- **Coaching institutes:** live exam links, exam rules, start forms, scheduling, branding, combined papers, results — with an honest split of what is free and what is on the paid plans.
- **Students on their own:** photograph a textbook or old paper, build a private timed mock, use the results (topic strength, AI mentor, rank estimate for supported exams).

It also compares Google Forms, Microsoft Forms, Moodle, game-style quiz apps and paid suites (facts from their own help pages, listed as sources), and ends with a five-step "test it yourself" checklist, 9 FAQs and three "pick your door" calls to action.

- **Length:** 2,925 words (structured-data word count), 12-minute read.
- **Voice:** first person from the TestoZa team, concrete Indian classroom situations, honest limits (AI keys can be wrong, blurry photos, what is paid).

---

## 2. Design (iOS-inspired, matching the landing page)

Landing-page palette (navy `#020617` hero, sky/indigo accents, amber "Guide" pill, Outfit) with iOS patterns:

| Element | Behaviour |
|---|---|
| Hero phone (`PhotoToTestPhone.tsx`) | Dynamic Island phone loops five scenes while visible: camera + flash → "Reading your page" → Extract/Generate + English/हिन्दी/Both segmented control → timed question (island shows the live clock) → 78% score ring. Glass chips appear in step. |
| Headline | Gradient keyword with an underline that draws in |
| Sticky segmented control | Section navigation under the navbar; the white thumb slides to the section being read and scrolls into view on phones |
| Short answer | Card with a rotating Apple-Intelligence-style gradient edge |
| Checklist | Grouped inset list with coloured squircle numbers, rows slide in |
| Tools | App-icon cards |
| Steps | Timeline whose line draws down |
| Coaching rules | Settings rows whose switches flip on one by one |
| Live exam widget | Counting stats, progress bar, iOS notification banners pushing down |
| Results widget | Activity-style rings + topic strength bars |
| Checks | Round checkboxes that tick |
| Comparison | Grouped table; on phones each row becomes a card with coloured labels |
| FAQ | Disclosure list (all answers in the DOM) |
| Floating CTA | Black Dynamic-Island-style pill, shown between the hero buttons and the closing section |

Also: reading-progress bar, reveal-on-scroll (content is always in the DOM; the hidden start state only applies once JS runs), dark mode, and `prefers-reduced-motion` (everything static and visible; the phone shows the result). No horizontal scroll at 390 px.

---

## 3. Architecture

Same pattern as the blog's static articles: one dependency-free module is the single source of truth, rendered by React for people and by the worker for crawlers.

```
frontend/src/guides/
  types.ts                   Guide, GuideSection, GuideBlock ('html' | 'widget'), GuideWidget
  meta.ts                    Slug, path, titles, dates, cover, keywords (small; imported by App, Layout, UserGuidePage)
  bestOnlineTestPlatform.ts  The guide text (HTML strings), FAQs, sources — only in the page's own chunk
  render.ts                  guideJsonLd() (Article + FAQPage + BreadcrumbList), guideCrawlerHtml(), word count
  worker.ts                  Entry for the Cloudflare worker (GUIDES + helpers)
frontend/src/pages/guides/
  BestOnlineTestPlatform.tsx Page: SEO head, hero, segmented nav, sections, FAQ, closing, sources, floating CTA
  PhotoToTestPhone.tsx       Hero phone animation
  GuideWidgets.tsx           'live-exam' and 'results-rings' widgets
  bestOnlineTestPlatform.css Scoped styles (.gd), dark mode, reduced motion
frontend/public/guides/best-online-test-platform/cover.png   1200×630 social image
```

Rules for `src/guides/*`: no React, no browser APIs, no `@/` aliases, no npm imports (the worker bundles them).

| Place | Change |
|---|---|
| `App.tsx` | Lazy route `BEST_PLATFORM_META.path` → `BestOnlineTestPlatform` |
| `Layout.tsx` | Guide paths hide the app sidebar (reading page) |
| `Footer.tsx` | "Best online test platform" in Solutions |
| `UserGuidePage.tsx` | Intro page links to the guide |
| `scripts/generateSitemap.js`, `public/sitemap.xml`, `public/sitemap/static.xml` | New URL, priority 0.9, lastmod 2026-09-27 |
| `public/llms.txt`, `public/llms-full.txt` | "Guides" entries with a factual summary |
| Internal links in the text | Handled in-app (`navigate`) and counted as `guide_cta_click` (`guide`, `target`) |

**Worker (`worker.js`):**
- `generateMetaTags`: guide title/description (same as the React page), `og:type` article, cover image, author, article times, `og:image` size/alt.
- `generateRouteContent`: the full guide in `<main>` and one JSON-LD graph in `script#schema-faq` (replacing the homepage FAQ schema).
- `APP_SECTIONS`: guide slugs, so `blog.testoza.com/<slug>` 301s to testoza.com.
- The page skips its own Helmet JSON-LD when the worker's graph is already in the HTML (no duplicate FAQPage).

---

## 4. Content accuracy (checked against the code)

| Claim | Source |
|---|---|
| PDF, Word, PowerPoint, photos, in-page camera; Extract vs Generate; English/Hindi/bilingual; difficulty | `AITestImporter.tsx` |
| AI needs a free sign-in; hourly limits | `backend/app/routers/ai.py`, `rate_limiter.py` |
| Single/multi-correct, numerical, comprehension; per-question marks and negative marks; sections with attempt control | `testsApi.ts`, `TestBuilder.tsx`, `TestPage.tsx` |
| Live exam link, unlisted, results only for the creator; end → private or public | visibility doc (2026-05-09), `TeacherDashboard.tsx` |
| Exam rules, schedule, start form, violation limit need a paid plan; starting a live exam does not | `TestSettingsPanel.tsx` (premium save guard), `TeacherDashboard.tsx` |
| Branding and Excel export are paid | `TestBuilder.tsx`, `TestResultsPanel.tsx` |
| Progress kept on device, connection indicator, screen wake lock | `TestPage.tsx` |
| Topic strength, AI mentor chat, AI rank estimate for JEE/NEET/SSC/RRB/GATE-type tests | `ResultsPage.tsx`, `AIChatBot.tsx` |
| Combined papers with a break screen | `CreateCombinedTestPage.tsx`, `CombinedBreakScreen.tsx` |

**Deliberately not claimed** (not in the code): QR-code sharing, numerical answer ranges/tolerance, independent section timers. The landing page copy mentions some of these — worth reviewing separately.

---

## 5. Verification

- `tsc`: no new errors (4 existing). ESLint: new files clean; `Layout.tsx`'s 3 existing errors unchanged.
- `vite build`: guide chunk 12.5 KB brotli JS + 7.6 KB CSS; text only in that chunk; cover in `dist/guides/…`.
- `wrangler deploy --dry-run --env production`: 146.6 KiB (46.5 KiB gzip).
- Worker harness (real `index.html`): 22/22 guide checks — 200, title, one canonical, og:type article, cover, article times, one JSON-LD graph (Article, FAQPage ×9, BreadcrumbList), only one FAQPage on the page, word count 2,925, H1 + full text + widget fallbacks in `<main>`, homepage copy replaced, blog host 301, use-case pages/blog article/home unchanged. Blog harness 37/37 still passing.
- Playwright: desktop, 390 px phone, dark, reduced motion — no page errors, one H1, no horizontal overflow, no sidebar, all sections reveal, hero scenes cycle, JSON-LD not duplicated when the worker's graph is present.

---

## 6. Deployment

1. Merge the branch to `main` in both repositories (Cloudflare Pages builds testoza.com from the frontend repo).
2. Deploy the worker: `cd infrastructure/cloudflare-worker && npx wrangler deploy --env production` (without it, people see the page but crawlers get the homepage's head and body).
3. Check: `https://testoza.com/best-online-test-platform` loads; view-source shows "Five checks before you trust any platform"; `https://testoza.com/sitemap/static.xml` lists the URL.
4. Google Search Console → URL inspection → Request indexing; Bing Webmaster Tools → submit URL.
5. Share it where teachers and students ask "which platform should I use for online tests".
