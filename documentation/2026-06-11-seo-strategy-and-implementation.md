# SEO Strategy & Implementation
**Date:** 2026-06-11  
**Source:** Google Ads keyword report + asset/sitelink association report (12 May – 10 Jun 2026)  
**Status:** Implemented ✅

---

## Overview

This document records the SEO strategy derived from TestoZa's Google Ads campaign data. All target keywords are the same search terms already being bid on in Google Ads — this ensures organic SEO reinforces the paid strategy.

---

## 1. Target Keyword Groups

### Priority 1 — High Intent (ready-to-use searches)
```
create online test
create exam online
make test online / make exam online
online test maker for teachers
free online test maker for teachers
online quiz maker for teachers
free quiz maker for teachers
test creator for teachers
```

### Priority 2 — Platform Comparison (evaluating options)
```
best online exam platform
best online testing platform
best online testing software
online exam software
web based exam software
computer-based test platform
online examination platform
```

### Priority 3 — Long-tail (lower competition, high conversion)
```
how to create a test online
free test maker for teachers
test making software for teachers free
online quiz generator for teachers
free quiz creator for teachers
online test creator for teachers
```

### Priority 4 — Feature-specific
```
ai quiz generator
secure online proctoring software
practice cbt exam
learning management system lms
```

---

## 2. Sitelinks Analysis (from Google Ads Asset Report)

All 6 sitelinks were **Disapproved** due to policy violations (first-person language, vague CTAs).

| Sitelink | URL | Status | Visibility |
|---|---|---|---|
| Create your online test | /create-test | Disapproved → Fix needed | Public |
| Dashboard / Find tests | /dashboard | Disapproved → Fix needed | Public (logged-in users see extra row of own tests) |
| User guide | /user-guide | Disapproved → Fix needed | Public |
| Why this platform / About | /about | Disapproved → Fix needed | Public |
| Join community | (community URL) | Disapproved → Fix needed | Public |
| Login / Sign up | /login | Disapproved → Fix needed | Public |

### Sitelink Fix — Rewrite Descriptions

| Sitelink | Old Description (Disapproved) | New Description (Policy-compliant) |
|---|---|---|
| Create Test | "Create highly advanced mock test" | "Build quizzes from PDFs & videos in minutes" |
| User Guide | "Use this platform on full potential" | "Step-by-step guide to creating tests online" |
| About | "Why this platform matters" | "Trusted by 10,000+ teachers across India" |
| Dashboard | "Find tests / clone test" | "Browse & attempt thousands of free mock tests" |
| Community | "Join our community to suggest" | "Share feedback and connect with educators" |
| Login | "Sign in / Sign up" | "Access your tests and results instantly" |

---

## 3. Changes Implemented

### 3.1 `frontend/index.html`

| Tag | Before | After |
|---|---|---|
| `<title>` | "Create Tests in Minute with AI \| Free Online Test Platform" | "Free Online Test Maker for Teachers \| Create Exam Online with AI" |
| `<meta description>` | Generic | Keyword-dense with: *online test maker, free quiz creator, mock tests, CBT, proctoring* |
| `<meta keywords>` | 8 keywords | 20 keywords from the ad campaign |
| OG title | "AI Test Maker" | Full keyword-rich title |
| OG image | No dimensions | Added width/height/alt |
| `og:locale` | Missing | `en_IN` (India-targeted) |
| `<meta robots>` | Missing | `index, follow, max-snippet:-1, max-image-preview:large` |
| **WebSite Schema** | ❌ Missing | ✅ Added — enables Google Sitelinks in search results |
| Organization Schema | Minimal description | Updated to keyword-rich description |

#### WebSite Schema Added (enables Google Sitelinks)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "TestoZa",
  "url": "https://testoza.com",
  "description": "Free online test maker for teachers...",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://testoza.com/find-tests?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

### 3.2 Per-Page `<SEO>` Component Updates

#### `/` — LandingPage.tsx
- **Title:** `Free Online Test Maker for Teachers – Create Exam Online with AI`
- **Description:** Keyword-dense including: *online test maker, free quiz creator, mock tests, CBT, secure proctoring*
- **Keywords:** 16 exact-match keywords from ad campaign
- **Canonical:** `https://testoza.com/`

#### `/create-test` — CreateTestPage.tsx
- **Title:** `Create Online Test Free – AI Exam Maker for Teachers | TestoZa`
- **Description:** Targets *create your online test, free test maker for teachers, CBT practice tests*
- **Keywords:** 14 keywords including all core action terms
- **Canonical:** `https://testoza.com/create-test`

#### `/user-guide` — UserGuidePage.tsx
- **Title (intro page):** `How to Create a Test Online – TestoZa User Guide for Teachers`
- **Title (sub-pages):** `{section title} – TestoZa Docs`
- **Description:** Targets *how to create a test, test making software for teachers free*
- **Keywords:** 10 how-to intent keywords
- **Canonical:** Dynamic per slug — `https://testoza.com/user-guide/{slug}`

#### `/about` — AboutPage.tsx
- **Title:** `Why TestoZa – Best Free Online Exam Platform for Teachers & Students`
- **Description:** Targets *best online exam platform, online examination platform, secure proctoring software*
- **Keywords:** 10 platform-comparison keywords
- **Canonical:** `https://testoza.com/about`

---

## 4. Remaining SEO Actions (Not Yet Implemented)

### High Priority
- [ ] Add `<SEO>` tags to `/dashboard` page (public, currently no SEO tags)
- [ ] Verify homepage `<h1>` contains primary keyword ("Free Online Test Maker for Teachers")
- [ ] Add visible FAQ section on homepage (schema already exists, HTML not yet added)

### Medium Priority
- [ ] Add `<SEO>` tags to `/login` page
- [ ] Add `<SEO>` tags to `/find-tests` or `/dashboard` with: *browse free mock tests, practice tests online*
- [ ] Add `alt` text to all images with keyword context
- [ ] Add internal links: "Create online test" → `/create-test`, "How to create a test" → `/user-guide`

### Long-term Content SEO
- [ ] Write a `/blog` post: "Top 5 Free Online Test Makers for Teachers in 2026"
- [ ] Add `/category` pages for JEE, NEET, GATE, SSC with keyword-rich descriptions
- [ ] Build a `/pricing` page targeting: *free online test maker, LMS pricing*
- [ ] Fix and resubmit all 6 disapproved Google Ads sitelinks

---

## 5. Notes

- **PostgREST egress** is 97.8% of database traffic — this is normal for a read-heavy test browsing platform.
- The `max-snippet:-1` robots directive allows Google to show the full meta description in search results (instead of truncating to 155 chars).
- `og:locale = en_IN` signals to Google that the primary audience is India.
- The `WebSite` schema with `SearchAction` is what tells Google to show a **search box** under your site result and enables **sitelinks** to appear.
