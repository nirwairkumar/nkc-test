# Analytics v2 — trustworthy traffic, growth and test metrics in the admin panel

**Date:** 2026-09-26
**Component:** Supabase (new `analytics_*` tables + SQL functions), backend (`app/routers/analytics/`), frontend tracker (`frontend/src/lib/analytics/`), admin panel (`frontend-admin/src/pages/analytics/`)
**Status:** Implemented and verified locally (section 8). **Not yet applied/deployed** — follow section 6 in order. Until the SQL runs, the admin panel shows a "Finish setting up" card and the legacy dashboard.

---

## 1. Why the old numbers were wrong (audit of the live database, 2026-09-26)

| # | Problem | Evidence (live DB) | Effect in the old panel |
|---|---|---|---|
| 1 | **Visitor identity was a weak "fingerprint"** — screen size + timezone + language + CPU cores + RAM. In India nearly everyone shares timezone and language, and Chrome freezes the Android UA to "Android 10; K", so everyone with the same phone model became *one visitor*. | One "visitor" owns **6,040 of 17,435 page views (35%) and 1,016 sessions**; the next one owns 4,520 (26%). | Unique visitors hugely under-counted; the city/device of a merged "visitor" belongs to whoever came first; per-user journeys mixed dozens of people. |
| 2 | **Time on page / stay time was never measured.** | `page_views.time_on_page` filled in **0** rows; `sessions.duration_secs` **0**; `exit_page` **0**. | Every "Stay" value was invented in code (defaults of 10 s, 15 s × pages, 20 s). |
| 3 | **Queries silently capped at 1,000 rows** (Supabase API default). | 1,261 page views in the last 30 days; the daily trend, top pages and referrers only ever saw 1,000. | Charts dropped the most recent days for longer ranges. |
| 4 | **Your own traffic counted as users.** | **1,947** page views on `/admin…` paths, **1,350** page views referred from `localhost` (the dev build wrote to production). | Inflated visits, polluted top pages. |
| 5 | **Duplicate page views.** The tracker re-fired when login state resolved. | **1,493 of 7,569** page views in the last 90 days (20%) are the same page again within 5 s. | Page views and "pages per visit" inflated ~20%. |
| 6 | **"Total visitors" meant *new* visitors** (rows first created in the period), not people who visited. | — | Returning people never counted. |
| 7 | **Days bucketed in UTC**, not IST. | — | 00:00–05:30 IST landed on the previous day. |
| 8 | **`test_registrations.started_at` is stored 5 h 30 m in the future** (`DEFAULT now() AT TIME ZONE 'asia/kolkata'` into a `timestamptz`). | Every row: `started_at` ≈ `last_active_at + 5:30`. | "Tests started today" windows shifted; the "started at" fallback in results was discarded as later than the submission. |
| 9 | **Sessions were per browser tab** (`sessionStorage`), and every page view logged the *landing* referrer. | 3,659 sessions for ~17k views. | Visits inflated; referrer data unreliable. |
| 10 | **Geo lookup sent every visitor's IP to ip-api.com over plain HTTP.** Its free tier forbids commercial use. | `track.py` | Legal/ToS risk and a third-party data transfer, for data Cloudflare already gives us. |
| 11 | **"AI bots & crawlers" counts were not real.** A JavaScript tracker never sees GPTBot/ClaudeBot/Googlebot (they don't run JS); the label was re-guessed from the stored browser name. | — | Misleading bot numbers. |
| 12 | Page titles were read before the new page set its title. | — | Wrong titles in journeys. |

**Conclusion:** the old traffic history (Mar–Sep 2026) cannot be repaired — the people inside a merged fingerprint cannot be separated again. v2 starts clean from its launch date. Business numbers (sign-ups, tests, attempts, submissions) come straight from the product tables, so those *are* correct for all history.

---

## 2. What good startups measure (and what we adopt)

Serious product teams (Amplitude's North-Star playbook, the AARRR "pirate metrics", GA4/Plausible for traffic, PostHog/Mixpanel for product analytics) separate three layers:

1. **Traffic** — who arrives, from where, and do they engage.
2. **Product / growth** — do visitors become users, do users get value, do they come back.
3. **Data quality** — can the numbers be trusted (bots, internal traffic, duplicates, time zone, coverage).

Rules they follow, which v2 copies:

- **Business KPIs come from the source-of-truth tables**, not from browser events (ad-blockers, closed tabs). Browser events are for behaviour (pages, time, sources).
- **Anonymous IDs are random, not fingerprints** (GA's `_ga`, Amplitude device ID, PostHog distinct ID). Random IDs don't collide and are the privacy-friendly option.
- **Engaged time, not "time between clicks"**: only time the page is visible and the person is active (GA4 "engagement time").
- **Engagement rate instead of raw bounce**: a visit is *engaged* if it lasts ≥10 s of active time, views ≥2 pages, or triggers a key event (GA4 definition). Bounce rate = 100% − engagement rate.
- **Every KPI shows the change vs the previous period.**
- **Bots and internal traffic are filtered before reporting, and the filtered volume is shown** so you know filtering works.
- **One reporting time zone** (IST here).

### TestoZa's metric tree

**North Star: tests taken per week** (submissions on tests made with TestoZa, registered + guest). It only grows when educators create tests *and* students take them — the value exchange of the product.

| Stage | Metric | Source |
|---|---|---|
| Acquisition | Unique visitors, visits, page views, pages/visit, engaged time, engagement rate | v2 tracker |
| | Channels: Direct, Organic search, **AI assistants** (ChatGPT, Perplexity, Gemini, Claude…), Social, Referral, Email, Paid, Internal | v2 tracker (referrer + UTM) |
| | Landing type: **Test link**, Blog, PDF tools, Marketing, App | v2 tracker |
| | Countries → states → cities, devices, browsers, OS, new vs returning, hour × weekday heat map, real-time | v2 tracker + Cloudflare geo |
| Activation | Visitor → sign-up rate; sign-up → first test created; first test → first submission received ("aha") | product tables + tracker |
| Engagement | DAU / WAU / MAU (registered), stickiness (DAU/MAU) | tracker sessions + product actions |
| Retention | Weekly sign-up cohorts, % active in week 1…8 | product actions + tracker |
| Referral | Visitors & sign-ups whose first page was a shared **test link** | tracker first-touch |
| Product | Tests created, test starts, submissions, completion rate, guest vs registered takers, AI generations by mode, PDF exports (Panna) | product tables + tracker events |
| Quality | Bot visits filtered, internal visits filtered, geo coverage, last event received | tracker |

---

## 3. Architecture

```
Browser (testoza.com, blog., pdf.)                 Backend (Cloud Run, behind Cloudflare)            Supabase Postgres
─────────────────────────────────                 ─────────────────────────────────────            ─────────────────
tz_vid cookie (random, .testoza.com, 13 months)    POST /api/analytics/collect  (public)            analytics_visitors
tz_sid cookie (30-min rolling session)      ─────▶  • validate + size-limit                   ────▶  analytics_sessions
pageview / engagement / identify / event            • UA → device/browser/OS, bot check              analytics_pageviews
sendBeacon, text/plain (no CORS preflight)          • Cloudflare geo headers (no IP stored)          analytics_events
                                                    • channel from referrer/UTM                      analytics_ingest()  ← one atomic call
                                                    • one RPC: analytics_ingest(payload)
Admin panel (admin.testoza.com)             ◀─────  GET /api/analytics/v2/*  (admin only)     ◀────  analytics_report_*() SQL functions
```

### 3.1 Collection (`frontend/src/lib/analytics/tracker.ts`)

- **Visitor ID** `tz_vid`: `crypto.randomUUID()`, first-party cookie on `.testoza.com` (testoza.com, app., blog. and pdf. are one visitor), ~13 months, localStorage fallback. Never derived from the device.
- **Visit** `tz_sid`: ends after 30 minutes without activity (GA standard); shared by all tabs and subdomains. Verified in a real browser: testoza.com → pdf.testoza.com keeps the same visitor *and* visit.
- **Page view**: once per **path** (query-string changes such as filters are not new pages, and neither are sign-in state changes). Paths only — query strings and hashes (tokens, OAuth codes) are never sent.
- **Engaged time**: counts while the tab is visible and the person was active in the last 10 minutes. The running total is sent with the next page view (same request), on tab hide / page close, and every 60 s while someone is actively reading. Max scroll depth and the page title (read 1.2 s after render) ride along.
- **The testoza.com → app.testoza.com hop**: testoza.com only serves marketing paths; everything else is redirected by `SubdomainGuard`. Both now share `mainDomainRedirect()` (`src/utils/subdomain.ts`): the hop records nothing and hands the visit's real referrer to app.testoza.com in a 2-minute `tz_ref` cookie. Without this every such visit counted twice and arrived as "Direct" (the second page's referrer is testoza.com).
- **identify** when sign-in state is known links the browser to the account (sign-up attribution, journeys). Unknown user ids are dropped server-side.
- **Custom events** `analytics.track(name, props)` — used for Panna PDF downloads (`pdf_export` with the tool and page count), which leave no trace in the database.
- **Not tracked**: localhost / 127.0.0.1 / `*.pages.dev` / admin.*, browsers sending Global Privacy Control, and bot / crawler / headless user agents. Automated browsers with a normal user agent (`navigator.webdriver`) are recorded but flagged as bots.
- **Your own traffic**: any browser where an admin signs in is marked internal for good (also when signed out later). Any device can opt out with `https://testoza.com/?tz_internal=1` (undo with `?tz_internal=0`). Internal visits are stored but excluded from every report; the People tab can show them under "Team".
- **Google Analytics**: `gtag('config')` now has `send_page_view: false` (index.html, pdf.html) — the app sends its own page views, so each landing page was counted twice in GA4. **Also switch off** GA4 → Admin → Data streams → Enhanced measurement → "Page changes based on browser history events", otherwise GA4 still double-counts in-app navigations.

### 3.2 Ingestion (backend `app/routers/analytics/collect.py`, `enrich.py`)

- `POST /api/analytics/collect` (public). Body ≤ 16 KB, ≤ 20 events, strict Pydantic schema; `text/plain` JSON so `sendBeacon` needs no CORS preflight; foreign `Origin`s and hosts outside *.testoza.com are dropped. Always answers 204.
- Enrichment: device / browser / OS (`user-agents`, in-app browsers such as Instagram/Facebook named as such), bot rules (AI crawlers, search/SEO bots, link previews, headless, scripts, `webdriver`), **channel** (Direct, Organic search, **AI assistants**, Social, Referral, Email, Paid incl. Google Ads click ids, Other campaign), referrer as host + path only, location from Cloudflare headers. **The IP address is never stored or sent to a third party.**
- One database call per beacon: `analytics_ingest(jsonb)` — atomic upserts, counters with `x = x + 1`, engagement updates only touch page views of the same visit, a stray ping cannot create an empty visit. (The old path: 6–9 sequential queries per page view plus an ip-api.com lookup.)
- Rate limit raised to 600 beacons/min per IP — a coaching centre's live exam puts a whole classroom behind one IP.
- The legacy `/api/analytics/track` still accepts old cached pages, but its ip-api.com call is gone (location now from Cloudflare).

### 3.3 Reporting (`analytics_report_*` SQL functions, `app/routers/analytics/insights.py`)

- All aggregation in Postgres: no 1,000-row cap; one parallel batch of calls per screen; bots and internal traffic excluded; days, hours, weeks in **IST**.
- **Periods** are calendar-aligned in IST (Today, Yesterday, 7D, 30D, 90D, 12M). Comparisons use the same elapsed time ("today until 3 pm" vs "yesterday until 3 pm").
- **Site filter** uses site groups: TestoZa = testoza.com + app.testoza.com, PDF tools = pdf., Blog = blog./news. Pages are grouped per site, so `/pricing` on testoza.com and app.testoza.com is one row.
- **Business numbers exclude your team** (accounts listed in `admins`) and creators taking their own tests. The North Star counts registered submissions by someone other than the creator plus guest submissions.
- Access: functions `SECURITY INVOKER`, executable only by `service_role`; tables RLS-on with no policies, no grants to anon/authenticated. Endpoints under `/api/analytics/v2/*` require an admin token. A missing migration returns `424 analytics_v2_not_installed`, which the panel turns into a setup screen.

### 3.4 Privacy & legal choices

- Random first-party ID instead of fingerprinting (regulators treat fingerprinting like cookies, but without user control).
- No IP stored; location resolved by Cloudflare at the edge; only country / state / city kept (no coordinates or postal code).
- Paths and referrers without query strings.
- Global Privacy Control honoured; per-device opt-out; signed-in data is unlinked automatically when an account is deleted (`ON DELETE SET NULL`).
- Retention: `analytics_purge(25)` deletes raw analytics older than 25 months. Schedule it monthly with pg_cron (snippet at the end of the migration).
- **Action for you:** add the paragraph in section 7 to the privacy policy. This is engineering guidance, not legal advice.

---

## 4. Admin panel (iOS-style)

Large-title header, live "N online" pill (opens a "Right now" sheet: current pages, sources, countries, page views per minute), refresh. One filter row: period segmented control and site segmented control. Section segmented control: **Overview · Traffic · Growth · Tests · People**. Cards are white with a hairline ring on the grouped background; detail opens in a sheet (bottom sheet with grabber on phones, floating panel on desktop). No horizontal scrolling at 390 px. Filters and the last tab are remembered per browser.

| Tab | What you see |
|---|---|
| **Overview** | 8 tiles with change vs the previous period: visitors (new), visits (pages each), page views, engaged time per visit, engagement rate (bounce), sign-ups (% of new visitors), tests taken (North Star, guests), tests created. Tap a tile to chart it against the previous period. Top pages with active time, sources (channels / websites), countries / states, devices, how visits start (landing type), data-quality card with a link to the legacy dashboard. |
| **Traffic** | Sources (channels, websites, UTM campaign / source / medium), landing types, pages / entry / exit with views, active time and scroll depth, countries / states / cities, devices + browser / OS / screen / language, new vs returning, sites, weekday × hour heat map (IST). |
| **Growth** | North Star: tests taken per week (12 weeks); visitor → sign-up rate, share who created a test (with median time to first test), share whose test was taken; activation funnel; sign-ups by first source, role and first page; daily / weekly / monthly active users + stickiness; weekly retention cohorts. |
| **Tests** | Tests created / starts / taken / completion; per-test funnel (viewers → starts → taken, completion, average score, guest share, Team and Private badges, search, sort); AI generation by mode; PDF-tool downloads by tool; custom events. |
| **People** | Stream of visits (who or where, source, device, landing page, pages, active time, New / returning / Team / Bot), search by name, email, city, page or source, People · Team · Bots · All. Open a visit for its page-by-page journey (time, active time, scroll, PDF downloads). Open a person for their account, first source, devices, tests and all visits. |

Charts follow the dataviz rules: one y-axis, 2 px lines, thin rounded columns, solid hairline grid, validated colour order (blue, orange, aqua), a hover read-out on every chart, and a legend whenever two or more series appear.

---

## 5. Implementation map

| Layer | Files |
|---|---|
| Database | `supabase/migrations/20260926120000_analytics_v2.sql` |
| Backend | `backend/app/routers/analytics/collect.py`, `enrich.py`, `insights.py`, `__init__.py`; `track.py` (Cloudflare geo); `app/utils/rate_limiter.py` (600/min) |
| Site tracker | `frontend/src/lib/analytics/tracker.ts` (new); `src/Layout.tsx`, `src/components/SubdomainGuard.tsx`, `src/utils/subdomain.ts` (shared redirect rule), `src/pdf/site/App.tsx`, `src/pdf/editor/Workspace.tsx` + `src/pdf/pages/LatexToPdfPage.tsx` (`pdf_export`), `index.html` + `pdf.html` (GA fix). Removed: `src/lib/analyticsTracker.ts`, `src/lib/fingerprint.ts`. |
| Admin | `frontend-admin/src/pages/analytics/` (`AnalyticsPanel`, the five tabs, `api`, `charts`, `ui`, `format`, `shared`); `AdminDashboard.tsx` mounts it. The old `AdminAnalyticsPanel.tsx` stays as "Legacy data". |

---

## 6. Rollout (order matters)

1. **Supabase → SQL editor:** paste and run `supabase/migrations/20260926120000_analytics_v2.sql`. It is idempotent. It creates the tables and functions and corrects `test_registrations.started_at` (−5 h 30 m, once) and its default.
2. **Cloudflare → testoza.com → Rules → Transform Rules → Managed Transforms → turn on "Add visitor location headers"** (free). Without it you get countries only; the Data-quality card shows "City known" so you can confirm.
3. **Deploy the backend** (Cloud Run) — before the frontend, so the new beacon endpoint exists.
4. **Deploy testoza.com** (main Pages project) and **pdf.testoza.com** (`nkc-test-2-0-frontend-pdf`, `npm run build:pdf`).
5. **Deploy the admin app.**
6. **Google Analytics:** switch off Enhanced measurement → "Page changes based on browser history events" (see 3.1).
7. **Your devices:** sign in as admin on them, or open `https://testoza.com/?tz_internal=1` once on each.
8. Optional: enable pg_cron and schedule the monthly purge (last lines of the migration).

Verify after step 1 (SQL editor):
```sql
SELECT count(*) FROM pg_policies WHERE tablename LIKE 'analytics\_%';              -- 0
SELECT has_function_privilege('anon', 'public.analytics_ingest(jsonb)', 'execute'); -- false
SELECT pg_get_expr(adbin, adrelid) FROM pg_attrdef
 WHERE adrelid = 'public.test_registrations'::regclass;                             -- includes now()
```

---

## 7. Suggested privacy-policy paragraph

> **Analytics.** We measure how our websites are used so we can improve them. When you visit, we store a random identifier in a first-party cookie (`tz_vid`, up to 13 months) and record the pages you view, how long they are active, the referring website, campaign tags, your approximate location (country, state, city — derived by our CDN; your IP address is not stored), and your device, browser and operating system type. If you are signed in, this activity is linked to your account. We do not sell this data or use it for advertising. Raw analytics data is deleted after 25 months. Browsers that send a Global Privacy Control signal are not tracked.

---

## 8. Verification (2026-09-26)

- **Database** — the migration on an in-memory Postgres 17 (PGlite) with stub product tables, run twice: 73 checks. Covered: the `started_at` correction running exactly once; locked grants; ingest deduplication, engagement deltas, visit ownership, stray pings, unknown users, sticky admin/internal flags, bots, events; every report including site groups, cross-host page merging, team/self exclusions, the funnel, retention (week 0 = 100 %), DAU ≤ WAU ≤ MAU, the test funnel via slug and conduct slug, and purge.
- **Backend** — 97 checks with FastAPI's TestClient: channel rules (Google, google.co.in, Google app, Docs as referral, Gemini/ChatGPT/Perplexity, Facebook variants, WhatsApp, Gmail, sign-in pages, own sites, UTM mediums, ads), device/bot parsing, UTF-8 city names, beacon validation and quiet rejection, admin-only access, 400s for bad input, the 424 setup signal, and IST period maths.
- **Tracker in real Chromium** on the real hostnames (production builds served via request routing): 24 checks. Covered: one page view per path; the referrer / UTM / Google Ads flag on landing; the cookie domain and lifetime; the same visitor and visit across testoza.com and pdf.testoza.com; engaged time riding with the next page view and on tab hide; titles; pre-rendered pdf pages counted once; the internal opt-out sticking; the testoza.com → app.testoza.com hop counted once with the original referrer; nothing sent for GPC or crawler user agents.
- **Admin UI** — rendered against fixtures produced by the real SQL functions over ~3,200 synthetic visits: all five tabs and the sheets at 1440 px and 390 px, no page errors, no horizontal scrolling. Builds: frontend, pdf site (6 pre-rendered pages), admin.
- Pre-existing TypeScript errors in unrelated files (frontend: `TestLikeButton.tsx`, `NotificationsPage.tsx`; admin: 12 in `components/ui/*` etc.) are unchanged.

