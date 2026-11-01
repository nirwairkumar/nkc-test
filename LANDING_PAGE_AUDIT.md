# TestoZa — Landing Page & Site Audit

**Analysed:** 2026-09-23
**Target:** `https://testoza.com/` (homepage), plus site-wide structure where it affects the homepage
**Status:** Analysis only. Nothing has been changed.

---

## How this was analysed

So you can judge how much to trust each finding:

- **Fetched the live page** and inspected the raw HTML actually served over the wire (21 KB, 1 `<h1>`, 4 `<h2>`, 4 JSON-LD blocks).
- **Inspected the live response headers** from `testoza.com`.
- **Read the source**: `frontend/index.html`, `LandingPage.tsx`, `CreateTestsHero.tsx`, `Navbar.tsx`, `Footer.tsx`, `App.tsx` routes, `robots.txt`, `_headers`, and the Cloudflare SEO worker.
- **Measured the built bundles** and the `public/` image assets from a real `vite build`.

**Not measured:** real Core Web Vitals. I cannot run Lighthouse or a headless browser here, so every performance claim below is *predicted from asset weights and render strategy*, not observed. Where I say "likely", treat it as a hypothesis to confirm with PageSpeed Insights — I've put that first in the action list.

---

## The one-paragraph summary

Your **technical SEO foundation is genuinely good** — thorough `robots.txt`, seven sitemaps, `llms.txt` for AI crawlers, JSON-LD, a static crawlable HTML fallback, proper canonical and Open Graph tags. That part is better than most seed-stage SaaS. The problem is almost entirely **above the fold and in the information architecture**: your hero shows a rotating slogan that contains none of your target keywords, your subheadline is literally an empty `&nbsp;`, there is no product screenshot, no social proof, no pricing in the navigation, and the ~15 keyword landing pages you built are **orphaned** — nothing on the homepage links to them. A visitor lands on a full-screen gradient with a changing tagline and three buttons, and has to scroll before learning what TestoZa is. Google renders your JavaScript, so the keyword-rich static HTML you wrote gets *replaced* by the rotating slogan before Google scores the page. Fixing the hero, adding proof, and linking your own pages together would move the needle more than any amount of further technical SEO.

---

# Part 1 — Critical findings

These are the ones that cost you traffic and signups today.

---

## C1 — Your `<h1>` changes every 4 seconds and contains no keywords

**Where:** `frontend/src/components/landing/CreateTestsHero.tsx:55-68`

The static HTML you serve has a strong, keyword-aligned H1:

> `TestoZa – Free Online Test Maker for Teachers | Create & Conduct Exams with AI`

But once React hydrates, `#seo-fallback` is replaced and the real rendered H1 becomes one of four rotating slogans:

```
"Create High-Level Tests & Conduct Them Online"
"Conduct Mock Exams in a Highly Secure Environment"
"Shift Seamlessly from Paper to Digital Assessments"
"Run Eco-Friendly & Sustainable Mock Tests"
```

**Why this matters:** Google renders JavaScript. What it scores is the *post-hydration* DOM — the rotating slogan — not your static fallback. None of those four strings contain "test maker", "online exam", "quiz generator", "for teachers", or any term you're targeting. One of them ("Eco-Friendly & Sustainable Mock Tests") is targeting a search intent that essentially does not exist.

There is also a **content-mismatch risk**. Serving keyword-rich text to a non-JS fetch and different text to a rendering client is the pattern Google's guidelines describe under cloaking. I do not think you did this deliberately — it reads as an honest attempt at a crawlable fallback — but the safest position is for the static fallback and the rendered page to say *substantially the same thing*. Right now they don't.

**What to do:** Make the H1 a single, static, keyword-aligned sentence that matches your static fallback. If you want the rotating effect, move it to a sub-line or an `<h2>`, or rotate a *fragment* inside a fixed H1 (e.g. "The online test maker for **[teachers / coaching centres / schools]**"). Keep the existing `min-h-[140px]` so there's no layout shift.

---

## C2 — The hero subheadline is empty

**Where:** `CreateTestsHero.tsx:70-72`

```jsx
<p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
    &nbsp;
</p>
```

The space is reserved, but nothing is in it. So the entire above-the-fold content is:

1. `THE EDUCATOR'S CHOICE` (small caps, decorative)
2. A rotating slogan
3. Two buttons

**Why this matters:** a first-time visitor cannot tell what the product does, who it's for, what it costs, or why it's different — without scrolling. That is the single highest-leverage conversion fix on the page. The hero is also `min-h-screen`, so it occupies the *entire* first viewport to deliver roughly twelve words.

You already have excellent subheadline copy sitting in your static fallback:

> "Generate quizzes from PDFs, YouTube videos, images, or text in minutes."

That line is concrete, differentiating, and keyword-aligned. It should be visible to humans.

---

## C3 — Your ~15 SEO landing pages are orphaned

**Where:** `frontend/src/App.tsx` (routes) vs `Navbar.tsx` / `Footer.tsx`

You have built these public marketing routes:

`/online-test-maker` · `/online-quiz-maker` · `/quiz-creator` · `/mcq-test-maker` · `/pdf-to-quiz` · `/ai-question-generator` · `/online-exam-software` · `/exam-software-for-schools` · `/online-test-for-coaching` · `/online-proctoring-software` · `/auto-grading-software` · `/assessment-platform` · `/compare/:slug` · `/create-test/:subject` · `/blog` · `/news` · `/pricing` · `/premium`

**The homepage links to none of them.**

- **Navbar** links: `Create Test`, `Dashboard`, `Support`, `User Guide`, `Login`, `Sign Up`
- **Footer** links: `/about`, `/convert`, `/privacy-policy`, `/terms-and-conditions`, `/user-guide` — five links total

**Why this matters:** sitemaps tell Google a URL *exists*; internal links tell Google it *matters*. Pages reachable only via sitemap get crawled infrequently and accumulate almost no internal PageRank. You have done the expensive part (writing the pages) and skipped the cheap part (linking to them). This is the highest-ROI SEO fix available to you.

**Also:** `Pricing` is not in the navigation. For a freemium SaaS this is unusual and measurably hurts conversion — pricing is one of the most-clicked nav items on comparable products, and its absence reads as "pricing is hidden".

---

## C4 — No social proof anywhere above the fold

The live page has **zero** testimonials, user counts, ratings, institution logos, or trust badges visible before you scroll. You *have* the components — `LiveExamTestimonials.tsx` and `PlatformStatsSection.tsx` exist — but both are lazy-loaded far down the page.

**Why this matters:** you are asking a teacher to trust you with their students' exam data. Every comparable product (Google Workspace, Microsoft Forms, Quizizz, Testmo) puts proof within the first two viewports. Without it, the page reads as pre-launch regardless of how good the product is.

You don't need fake numbers. Real, modest, specific proof outperforms vague grandeur:
- "Used by teachers at *N* coaching institutes"
- "*N* tests conducted this month"
- One or two named quotes with a real person, role and institution
- Your existing `verified-badge` concept, surfaced properly

---

# Part 2 — Technical & crawlability

---

## T1 — Malformed duplicate response headers (live, confirmed)

Response headers from `https://testoza.com/` contain **duplicated and contradictory values**:

```
Content-Type:  text/html; charset=utf-8, text/html; charset=utf-8
Cache-Control: public, max-age=0, must-revalidate, public, max-age=300
x-cache:       MISS
x-cache:       HIT
x-cache-location: EDGE
x-cache-location: EDGE
```

`Cache-Control` is the damaging one: it tells caches both "revalidate every time" **and** "cache for 300 seconds". Different intermediaries resolve that differently, so your edge caching behaviour is effectively undefined.

**Likely cause:** the Cloudflare worker spreads the origin's headers (`...Object.fromEntries(responseToReturn.headers)`) and then sets its own, while Cloudflare Pages `_headers` also sets some. Needs to be one authority per header.

---

## T2 — The security-headers worker has not been deployed

The live response shows:

```
Content-Security-Policy: frame-ancestors 'self'
X-Frame-Options: SAMEORIGIN
referrer-policy: same-origin
```

The full CSP, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS-with-preload added in the security work are **not present**. The worker in `infrastructure/cloudflare-worker/worker.js` hasn't shipped.

This is already tracked in `SECURITY_THREAT_MODEL_AND_PLAN.md` Part 6.2, but it shows up here too because CSP and `Referrer-Policy` affect how analytics and third-party embeds behave — worth deploying before you tune anything else at the edge.

---

## T3 — The crawlable fallback is hidden behind a full-screen overlay

**Where:** `frontend/index.html`, `#seo-fallback`

The static SEO content is `position: absolute; z-index: 1`, sitting under a `position: fixed; inset: 0; z-index: 9999` loader. It's in the DOM for non-JS crawlers, and invisible to humans.

The engineering intent is sound and the `position:absolute` choice correctly avoids CLS. But combined with C1 (different H1 after hydration), the overall pattern is "crawlers see one page, users see another". The fix is not to remove the fallback — it's to **make the rendered page say the same things**, so the fallback becomes a genuine no-JS mirror rather than a separate SEO surface.

---

## T4 — What's good (don't break these)

Genuinely well done, and worth stating so it doesn't get "refactored away":

- `robots.txt` — thorough, correctly disallows `/live/`, `/results`, `/admin*`, `/api/`, and explicitly allows GPTBot / OAI-SearchBot / PerplexityBot / Claude-Web with `llms.txt`. Forward-looking.
- Seven segmented sitemaps (index, static, tests, categories, posts, creators).
- Canonical, Open Graph with explicit `og:image:width/height`, Twitter cards, `og:locale`.
- 4 JSON-LD blocks including FAQPage — this is what wins FAQ rich results.
- `_headers` caching for hashed assets is correct (`immutable`, 1 year).
- Preconnect/dns-prefetch for fonts and API; fonts loaded non-blocking via `media="print" onload`.
- The FAQ copy is *excellent* — specific, genuinely useful, and answers real search queries. It's the strongest content on the site.

---

# Part 3 — Performance

All predicted from asset weights — confirm with a real measurement first.

## P1 — 4.7 MB of JavaScript in the build

Largest chunks:

| Chunk | Size |
|---|---|
| `vendor-files` | 476 KB |
| `vendor-tiptap` | 428 KB |
| `vendor-charts` | 396 KB |
| `index` | 396 KB |
| `vendor-katex` | 256 KB |
| `vendor-data` | 224 KB |
| `vendor-react` | 184 KB |
| `index` (2nd) | 168 KB |
| `vendor-motion` | 120 KB |

Code-splitting is in place and the landing sections are properly `lazy()` + `Suspense` + `LazySection` with reserved heights (good — that's why CLS should be low). **Worth verifying:** that a first-time visitor to `/` does not download `tiptap` (rich-text editor), `katex` (math rendering), or `charts`. None of those are needed to render a marketing page. If any are in the initial graph, that's ~1 MB of avoidable download.

## P2 — 3.9 MB of images in `public/`, most of them unused

| File | Size | Referenced in code? |
|---|---|---|
| `education_bg.png` | 628 KB | **No** |
| `facebook-cover-design.png` | 540 KB | **No** |
| `education_anime_bg.png` | 496 KB | **No** |
| `anime_flask.png` | 476 KB | **No** |
| `verified-badge.png` | 432 KB | Yes (1 reference) |
| `math_formula.png` | 372 KB | **No** |

Two problems:

1. **Dead weight.** Five of the six largest files have zero references in `frontend/src` or `index.html`. They still deploy, and anything in `public/` is publicly fetchable.
2. **You already made WebP versions and aren't using them.** `education_bg.webp` is 76 KB vs the 628 KB PNG — **8× smaller**. Same for `anime_flask` (48 KB vs 476 KB) and `education_anime_bg` (44 KB vs 496 KB). The conversion work is done; the switch never happened.

`verified-badge.png` at 432 KB for a badge is worth regenerating regardless — a badge should be single-digit KB as SVG.

## P3 — LCP element is animated text

Your largest contentful paint candidate in the hero is the rotating slogan, which mutates every 4 s. Combined with a full-viewport gradient and no image, LCP will be whatever text paints first. This is not necessarily *slow*, but it is *unstable* and gives you nothing to optimise. A real hero image or product screenshot with `fetchpriority="high"` would give you a predictable, measurable LCP element — and would also fix C4.

---

# Part 4 — Layout & orientation (the "modern SaaS" arrangement)

Your current homepage order:

```
1.  Hero (full screen, rotating slogan, 2 buttons, no subhead)
2.  SEO text block
3.  ManualCreateSection          (800px)
4.  SettingsShowcaseSection      (750px)
5.  SectionWiseBuilderShowcase   (600px)
6.  UploadMaterialsSection       (750px)
7.  FileToTestSection            (1100px)
8.  CategoryFolderCards / FeaturedTests
9.  YouTubeGeneratorSection
10. PlatformStatsSection
11. CommunityJoinSection
12. LiveExamTestimonials
13. FAQ
14. Final CTA
```

That is **roughly 6,000+ px of feature showcases before a single piece of social proof**. The structure is feature-first; modern SaaS landing pages are outcome-first, with proof early and features as supporting evidence.

### Recommended order

This is the pattern Google Workspace, Microsoft 365, Notion, Linear and Stripe all converge on — not because it's fashionable, but because it matches how an evaluating buyer actually reads:

| # | Section | Job it does |
|---|---|---|
| 1 | **Hero** — static keyword H1, real subheadline, 1 primary + 1 secondary CTA, product screenshot or 20s loop | Answer "what is this and is it for me" in 5 seconds |
| 2 | **Proof band** — logos, or "N teachers · N tests conducted · N students assessed" | Establish it's real, immediately |
| 3 | **Three-up value props** — AI generation · Exam integrity · Auto-grading & analytics | Outcomes, not features |
| 4 | **How it works — 3 steps** (Upload → AI generates → Share link) | Remove perceived effort |
| 5 | **Deep feature sections** (your existing showcases, trimmed to 3–4) | Evidence for the claims above |
| 6 | **Comparison** — vs Google Forms / Quizizz | You already win this argument in your FAQ; make it a table |
| 7 | **Testimonials** | Proof, second dose |
| 8 | **Pricing preview** — "Free for teachers", link to `/pricing` | Handle the unspoken objection |
| 9 | **FAQ** (keep as-is — it's your best content) | Long-tail SEO + objection handling |
| 10 | **Final CTA + rich footer** | Convert, and distribute link equity |

### Specific arrangement notes

- **Cut the hero from `min-h-screen`** to roughly 75–85vh so the next section peeks above the fold. A visible content edge measurably increases scroll-through.
- **Trim the showcase sections from six to three or four.** Six consecutive 600–1100 px feature sections is a lot of scrolling before proof. Move the rest to `/features` or the relevant keyword pages.
- **Alternate image/text sides** in the feature sections for visual rhythm.
- **Move the SEO text block** — a wall of prose immediately under the hero is a bounce risk. Fold that copy into the value-prop and how-it-works sections so it's read by humans *and* indexed.

---

# Part 5 — Content & messaging

## M1 — Say what it is, in the first line

"The Educator's Choice" is a positioning statement, not an explanation. Compare how the products you named handle this:

- Google Forms: *"Get insights quickly, with Google Forms"*
- Microsoft Forms: *"Create surveys, quizzes and polls"*

Both name the noun in the first breath. A workable hero for you:

> **H1:** Free online test maker for teachers
> **Sub:** Create and conduct exams with AI — generate quizzes from PDFs, YouTube videos, or text in minutes. Auto-graded, proctored, and free for unlimited students.

That single change addresses C1, C2, and half of your keyword targeting at once.

## M2 — Lead with the differentiator

Your genuinely unusual capabilities, ranked by how hard they are to copy:

1. **PDF / YouTube → test in minutes** (AI ingestion) — this is your wedge
2. **Real exam integrity** — fullscreen enforcement, tab-switch detection, randomisation, negative marking
3. **Free with no student limit** — this is a *big* deal against Quizizz's paywalls and deserves to be stated loudly
4. **White-label branding** — matters to coaching institutes specifically

Right now #3 is buried in a bullet list and #1 is invisible above the fold.

## M3 — Turn your FAQ into pages

Your FAQ answers are the best-written content you have. Several are standalone search intents that deserve their own indexed page with the FAQ answer as the intro:

- "How do I add negative marking to an online test?" → a real query with commercial intent
- "How do I stop students from cheating in an online test?" → high-intent, low-competition
- "Is TestoZa better than Google Forms for conducting tests?" → you have `/compare/:slug` already built for exactly this

Keep them in the homepage FAQ *and* expand them into pages. The FAQPage JSON-LD stays, and you gain indexable long-tail surface.

## M4 — One primary CTA, not three

The hero currently offers "Create Test with AI", "Create Test Manually", and "Pricing & Plans" with roughly equal weight. Make **one** visually dominant (AI generation — your differentiator), demote the second to a text/outline button, and move pricing to the nav where people look for it.

---

# Part 6 — Prioritised action list

Ordered by *impact ÷ effort*. Nothing here has been implemented.

### Do first — high impact, low effort

| # | Action | Fixes | Effort |
|---|---|---|---|
| 1 | **Measure first.** Run PageSpeed Insights on `/` (mobile + desktop) and record LCP/INP/CLS. Check Search Console → Pages for coverage and → Performance for which queries you already rank on. | baseline | 30 min |
| 2 | Write a real hero: static keyword H1 + the subheadline you already wrote | C1, C2, M1 | 1–2 h |
| 3 | Add Pricing + Features to the navbar | C3 | 30 min |
| 4 | Expand the footer into a proper link hub — all keyword pages, comparisons, blog, pricing | **C3** | 1–2 h |
| 5 | Switch the referenced images to their existing `.webp` twins; delete the 5 unreferenced PNGs (~2.5 MB) | P2 | 1 h |
| 6 | Deploy the Cloudflare worker (security headers) | T2 | 15 min |

### Do next — high impact, medium effort

| # | Action | Fixes | Effort |
|---|---|---|---|
| 7 | Add a proof band under the hero (real numbers only) | C4 | half day |
| 8 | Add a product screenshot / short loop to the hero with `fetchpriority="high"` | C4, P3 | half day |
| 9 | Fix the duplicate `Cache-Control` / `Content-Type` headers | T1 | 1–2 h |
| 10 | Reorder the page per Part 4; trim six showcases to three or four | layout | 1 day |
| 11 | Verify tiptap/katex/charts aren't in the homepage's initial JS graph | P1 | 2–3 h |

### Do after — compounding

| # | Action | Fixes | Effort |
|---|---|---|---|
| 12 | Build the comparison table section (vs Google Forms / Quizizz) | M3 | 1 day |
| 13 | Expand 3–4 FAQ answers into standalone pages, interlinked | M3 | 2–3 days |
| 14 | Align the static fallback with the rendered page so they mirror each other | C1, T3 | half day |
| 15 | Add `BreadcrumbList` + `SoftwareApplication` JSON-LD with `aggregateRating` once you have real reviews | rich results | half day |
| 16 | Regenerate `verified-badge` as SVG | P2 | 30 min |

---

# Part 7 — What to measure

Set a baseline **before** changing anything, or you won't know what worked:

- **PageSpeed Insights** on `/` — record mobile LCP, INP, CLS today.
- **Search Console → Performance** — impressions, clicks, average position, and which of your keyword pages currently get *any* impressions. This tells you whether C3 (orphaned pages) is costing you what I think it is.
- **Search Console → Pages** — how many of your ~15 landing pages are actually indexed vs "Discovered – currently not indexed". That second status is the fingerprint of an orphan page.
- **Analytics** — homepage bounce rate and scroll depth. If most visitors never reach the testimonials at ~6,000 px, that confirms Part 4.

Then re-measure two weeks after the "do first" batch.

---

# Part 8 — Honest caveats

- **I did not measure real performance.** Everything in Part 3 is inferred from asset sizes and render strategy. It is possible your LCP is already fine. Measure before acting on P1–P3.
- **I did not measure your rankings or traffic.** I have no visibility into Search Console, so C3's impact is reasoned from how internal linking works, not from your data.
- **The cloaking risk in C1 is a risk, not a penalty.** I have no evidence of a manual action. I'm flagging it because the pattern is one Google's guidelines single out, and the fix is cheap.
- **Design taste is subjective.** Part 4 and Part 5 reflect a widely-used convention, not a law. The technical findings (C1, C3, T1, P2) are objective; the layout advice is a strong recommendation you should feel free to argue with.
- **Your FAQ content and technical SEO setup are genuinely above average.** The gap is the hero and the internal linking — not a rebuild.

---

## Where this leaves you

Nothing here requires rewriting the site. The three changes that matter most are: **put a real sentence in the hero**, **link to your own pages**, and **show proof before the sixth feature section**. Those are roughly a day of work between them and they address every critical finding except the header duplication.

Tell me which parts you want implemented and I'll start there.
