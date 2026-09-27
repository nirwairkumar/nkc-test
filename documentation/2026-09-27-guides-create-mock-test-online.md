# Guides on testoza.com — first one: /create-mock-test-online

**Date:** 2026-09-27
**Page:** https://testoza.com/create-mock-test-online
**Status:** built and verified locally; not committed, not deployed.

## What it is

A long-form SEO/GEO page (about 3,200 words of article plus a 9-question FAQ) on how students,
teachers and coaching institutes turn a textbook photo, a PDF or an old question paper into a
timed, exam-style mock test. iOS-style design with three interactive pieces:

- an animated iPhone in the hero (photo → reading → "Mock test ready"),
- a working NTA-style exam screen (palette with five states, Save / Mark for review, numeric keypad),
- the result page's four-group time matrix.

All motion stops under `prefers-reduced-motion`; nothing waits on JavaScript to be readable.

## How it is built

Same pattern as the static blog articles (`frontend/src/blog/articles`), but for testoza.com itself:

| Piece | File |
|---|---|
| Every word, meta, FAQ, steps, sources | `frontend/src/guides/createMockTestOnline.ts` |
| Types | `frontend/src/guides/types.ts` |
| JSON-LD (WebPage, Article, HowTo, FAQPage, BreadcrumbList) and crawler HTML | `frontend/src/guides/render.ts` |
| Worker entry | `frontend/src/guides/worker.ts` |
| React page / widgets / CSS | `frontend/src/pages/guides/CreateMockTestOnline.tsx`, `MockTestWidgets.tsx`, `createMockTestOnline.css` |
| Social image (1200×630) | `frontend/public/guides/create-mock-test-online/cover.png` |

`src/guides` must stay free of React, `@/` aliases and browser APIs: the Cloudflare worker imports it.

The worker (`infrastructure/cloudflare-worker/worker.js`, `serveGuideHtml`) answers
`/create-mock-test-online` with index.html plus the guide's title, description, canonical,
Open Graph tags, JSON-LD and the **full article text in `<main>`**, so Google, Bing, ChatGPT,
Claude and Perplexity read everything without running JavaScript. `/create-mock-test-online/`
301s to the canonical URL. React replaces `<main>` when the app loads, and the page skips its
own JSON-LD when the worker's is already in the HTML (no duplicate FAQPage/HowTo).

Other wiring: route in `App.tsx`; `/create-mock-test-online` added to `MARKETING_PATHS`
(`src/utils/subdomain.ts`) so testoza.com serves it instead of handing it to app.testoza.com;
sidebar hidden in `Layout.tsx`; footer link under "Create"; sitemaps (`scripts/generateSitemap.js`,
`public/sitemap*.xml`, `backend/app/routers/sitemap.py`); `public/llms.txt` and `llms-full.txt`;
`APP_SECTIONS` in the worker (blog host 301s it to testoza.com);
`supabase/migrations/20260927120000_analytics_marketing_guides.sql` (analytics counts it as Marketing).

## Deploy order

1. Backend (sitemap entry) — the worker serves `/sitemap*` from the backend first.
2. Frontend (Pages).
3. Worker: `npx wrangler deploy --env production` (after the frontend, like the blog change).
4. Run `20260927120000_analytics_marketing_guides.sql` after the analytics v2 migration.
5. Google Search Console → URL inspection → request indexing for the URL.

## Adding the next guide

1. Copy `createMockTestOnline.ts`, write the text, add it to `GUIDES` in `src/guides/worker.ts`.
2. Add a page component (or reuse this one if the widgets fit) and a route in `App.tsx`.
3. Add the path to `MARKETING_PATHS`, the `Layout.tsx` sidebar list, the sitemaps, `llms.txt`,
   the worker's `APP_SECTIONS`, and the analytics landing-type regex.
4. Render a cover: screenshot the hero at 1200×630.

## Facts checked for the copy

- Roediger & Karpicke (2006), Exp. 2, from the paper: after 1 week STTT 61%, SSST 56%, SSSS 40%;
  after 5 min SSSS 83% vs STTT 71%; SSSS students were more confident.
- JEE Main numerical answers: mouse + on-screen keypad, keyboard disabled, integers.
- Product claims were checked against AITestImporter, TestPage, BehavioralTimeMatrix and PricingPage.

## Found while testing (not changed)

Cloudflare blocks AI **training** crawlers on testoza.com and blog.testoza.com: GPTBot, ClaudeBot,
CCBot and Bytespider get 403. AI **search/answer** crawlers get 200 (OAI-SearchBot, ChatGPT-User,
Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User), as do Googlebot, Bingbot and
Applebot. Pages can be cited in ChatGPT/Claude/Perplexity answers today; to let future models learn
about TestoZa too, allow GPTBot and ClaudeBot in Cloudflare → AI Crawl Control.
