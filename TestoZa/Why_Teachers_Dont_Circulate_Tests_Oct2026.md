# Why Teachers Build Tests on TestoZa and Never Send Them

**A distribution-failure diagnostic — data, code and a first-person walkthrough**

| | |
|---|---|
| **Date** | 10 October 2026 |
| **Written for** | Founder/CEO, plus product & engineering |
| **Evidence base** | Supabase production DB (all 39 public tables), frontend/backend source, Cloudflare Worker, live HTTP probes of testoza.com |
| **Method** | Cohort + funnel SQL, clickstream reconstruction, code audit, live link-preview tests, role-play walkthrough as (a) a coaching teacher and (b) an institute director |
| **Supersedes** | `plans/TestoZa_Teacher_Retention_Diagnostic_Report.md` (Aug 2026) — three of its five findings are now fixed; this report re-bases on current code |

---

## 1. The verdict

Teachers are not failing to circulate your tests because they distrust you. They are failing because **TestoZa never asks them to, and the one path it does offer looks broken at exactly the moment they're about to press send.**

The product is excellent up to the instant the test is saved, and then it stops having an opinion about what happens next. There is no "send to students" step. The Share button produces a message that contains the sentence *"If above link doesn't work, use this:"*. The join-code link previews in WhatsApp as an advertisement for a free test maker. And because 52% of tests are silently created with JEE-style negative marking, the teacher's own trial run often ends in a **negative score** — so the last thing they see before deciding whether to share is evidence that the marking is wrong.

Then they close the tab and never learn anything else, because **TestoZa sends no email, ever**.

**The number that matters:**

> In ten months, **31 real teachers** have authored a test on TestoZa.
> **19 of them never had a single outside person open it.**
> The best any teacher has ever done is **4 takers.**
> **Not one creator has ever reached 10.**

A coaching batch is 30–200 students. **TestoZa has never once served a real class.** Every "conducted exam" in your database is a rehearsal.

This is not a trust problem. It is a **product-completion problem** that creates a trust problem.

---

## 2. The funnel, in numbers

### 2.1 Creator cohort (founder accounts excluded throughout)

| Stage | Count | Conversion |
|---|---:|---:|
| Signed up | 105 | — |
| Authored a real test (not the auto-seeded example) | 31 | **29.5%** |
| Created on more than one day | 4 | **12.9%** of creators |
| Got ≥1 outside taker | 12 | **38.7%** |
| Got ≥3 outside takers | 4 | **12.9%** |
| Got ≥10 outside takers | **0** | **0%** |

**26 of 31 creators (84%) authored everything they ever authored on a single day and never returned.**

### 2.2 The Indian funnel (your largest market)

India is #1 by a wide margin: **191 visitors** (next: US 86, Philippines 41). Device split **100 mobile / 89 desktop** — but desktop visitors go 2× deeper (31.6 vs 15.0 pageviews each). Mean engaged time per session: **637 seconds — 10.6 minutes.** These are not bouncers. They are evaluating you seriously.

Where they go (unique Indian visitors per surface):

```
/  (landing)          108  ████████████████████████████████
/create-test           53  ████████████████
/generate-with-ai      41  ████████████
/dashboard             33  ██████████
/my-tests              21  ██████
/test-intro/:id        20  ██████
/submissions            4  █
/exams  (join codes)    0
/join                   0
```

Read that bottom half again. **53 Indian visitors started building a test. Four ever looked at submissions. Zero ever opened the exam-sessions feature you built for exactly this purpose.**

`/create-test` got 318 views from 53 visitors — **6 visits each.** `/generate-with-ai` got 383 from 41 — **9.3 each.** That is not fluent usage. That is back-and-forth.

### 2.3 Quality of the submissions that do exist

| Signal | Value | Why it matters |
|---|---:|---|
| Total attempts | 259 | |
| **Negative final scores** | **32 (12.4%)** | Teacher concludes grading is broken |
| **Submissions with 0 questions attempted** | **34 (13.1%)** | Opened, instantly abandoned or crashed |
| Score of exactly 0 despite answers given | 15 | |
| **Phantom duplicate rows** | **12** | Same user, same test, same score, 7 of them <10 min apart |
| Registrations stuck `in_progress` forever | **71 of 200 (35.5%)**, avg **4.7%** complete | A third of students who open a test quit in the first minute |

So on the rare occasion a teacher *does* share, a third of their students stall immediately and the teacher's gradebook fills with zeros and duplicates.

---

## 3. Why they don't circulate — the causal chain

Seven links. Each one is independently verified. Each one alone would suppress sharing; together they make it near-impossible.

### Link 1 — The default marking scheme is +4 / −1 on every test, including a Class 5 GK quiz

`frontend/src/components/TestBuilder.tsx:655` and `:749`:

```js
marks: q.marks !== undefined ? String(q.marks) : '4',
negativeMarks: q.negativeMarks !== undefined ? String(q.negativeMarks) : '1',
```

The AI import path does the same — `frontend/src/pages/AITestImporter.tsx:1163`, `:1176`, `:1310`, `:1322`.

Every test TestoZa creates is, by default, a JEE-pattern paper. Confirmed in the data:

> **32 of 61 non-founder tests (52%) carry negative marking, and 30 of those have it on *every single question*.**

Nobody chose this. An English-composition teacher, an HRM lecturer and a CA tutor did not sit down and select −1 per wrong answer. Here is what it did to them when they test-drove their own paper:

| Teacher | Test | Their own score |
|---|---|---:|
| Akomedi Judes | English Composition – Beginner Assessment | **−15.00** |
| Joanni Pearl Daganato | Human Resource Management Assessment | **−18.00** |
| Target CA | Theory of Consumer Behaviour | **−4.00** |
| Target CA | Measures of Central Tendency | **−2.50** |
| TargetCA | Indian Regulatory Framework (10 Q) | **0.25** |

**This is the most damaging thing in the product.** The teacher's final impression before the share decision is a scoreboard reading *minus eighteen*. No one forwards that to forty students. Their conclusion is not "I should change the marking scheme" — they don't know there is one. Their conclusion is **"this platform can't add up."**

It also inflates every total to nonsense: a 30-question GK quiz is out of 120.

### Link 2 — There is no "send to students" step. Anywhere.

After save, `TestBuilder.tsx:1037` fires `toast.success("Test created successfully!")` and `:1039` runs `navigate('/my-tests')`.

That's it. A list. The highest-intent moment in the entire business — *paper is ready, 40 students are waiting* — is answered with a toast and a table.

And the sidebar (`components/AppSidebar.tsx:190–260`) offers **eleven** destinations:

> Dashboard · My Tests · Exams · Batches · Generate with AI · Create Test · All Submissions · Rewards · Materials · Test History · User Guide

Not one is called "Send to students." Five of them — My Tests, Exams, Batches, All Submissions, Test History — are overlapping words for the same mental object. Two (Rewards, Materials) are noise. The IA has no point of view about what a teacher came here to do.

**Evidence they get lost:** Yamuna Mukunuri's real clickstream, 9 Aug 2026, oscillating between two different test-list pages:

```
15:14:44  /my-tests
15:15:33  /solutions-editor/d2baf1ba…
15:15:45  /creator/tests        ← a second, competing "my tests"
15:16:02  /solutions-editor/d2baf1ba…
15:16:27  /creator/tests
15:16:45  /solutions-editor/d2baf1ba…
15:17:03  /dashboard
```

### Link 3 — The Share button tells the teacher's students the link might not work

`frontend/src/utils/shareUtils.ts:15–27`, verbatim:

```
Try this test "<title>" on Testoza 🚀

Practice now:
<primaryUrl>

If above link doesn't work, use this:
<idUrl>

Powered by Testoza
https://testoza.com
```

Three separate self-inflicted wounds in nine lines:

1. **"If above link doesn't work, use this:"** — You are shipping a disclaimer about your own reliability into your customer's customer-facing message. An institute owner reads that once and closes the tab. No professional forwards a link that comes pre-apologised.
2. **The fallback is the link that is guaranteed to fail.** `idUrl` is `/test-intro/<uuid>`, and `TestIntroPage.tsx:509` hard-blocks that route for private *and* conduct-mode tests with *"This test is private or in conduct mode, and cannot be accessed via this link."* The recommended Plan B is a wall.
3. **"Powered by Testoza"** on every share, non-removable. More on this in §6.

Worse, the word *"Practice now"* frames a graded class assessment as optional practice. And the whole message is built for a student bragging to friends, not a teacher instructing a batch — the sibling functions are literally `shareResultWhatsApp` ("Can you beat my score?") and `shareWithFriends`.

### Link 4 — On desktop, Share silently does nothing visible

`shareUtils.ts:28–36`:

```js
if (navigator.share) { await navigator.share({...}); }
else {
    await navigator.clipboard.writeText(primaryUrl);
    if (typeof window !== "undefined" && (window as any).toast) {
        (window as any).toast.success("Link copied!");
    }
}
```

**`window.toast` is never assigned anywhere in the codebase.** Verified: six reads, all inside `shareUtils.ts`; zero writes.

So on any browser without the Web Share API (Firefox, older desktop Chrome — and 89 of your 191 Indian visitors are on desktop), the teacher clicks **Share**, the link lands on the clipboard, and **nothing appears on screen**. No toast, no checkmark, no dialog. They click again. Still nothing. They conclude the button is dead and go looking elsewhere — which is precisely the `/my-tests` ↔ `/creator/tests` ↔ `/dashboard` thrashing we see in the clickstream.

The app already imports `sonner`'s `toast` everywhere else. This is a two-line fix that has been silently costing you your core conversion.

### Link 5 — The join link previews in WhatsApp as an ad for your own product

This is the sharpest finding in the report, and it is live right now.

When a teacher links a test to a join code, `TeacherDashboard.tsx:341` tells them:

> *"Join code 696 975 is ready. Candidates enter it at testoza.com/join."*

So they paste `testoza.com/join/696975` into the class WhatsApp group. WhatsApp fetches it to build the preview card. Here is what it actually gets back (probed live with WhatsApp's user agent):

| Link type | `og:title` WhatsApp displays | `og:url` |
|---|---|---|
| `/test/<slug>` | ✅ "JEE (Main)-2026 Session-1 Mathematics \| TestoZa" | `app.testoza.com/test/…` |
| **`/join/<code>`** | ❌ **"TestoZa – Free Online Test Maker for Teachers \| Create Exam Online with AI"** | ❌ **`https://testoza.com/`** |

**Cause:** `infrastructure/cloudflare-worker/worker.js` special-cases crawler HTML only for `/test/` and `/test-intro/` (lines 117, 293, 1132, 1188). `/join/:code` falls through to the generic marketing shell, so it inherits the homepage's title, the homepage's `og:url` and the default `default-og.png`.

Put yourself in the teacher's chair. You are about to post to 40 students and their parents. The preview card renders — and it is **an advertisement for a free test-making tool, headlined at teachers, with the wrong URL attached.** You are not sending a physics test; you are sending your parents a software ad.

You delete the message.

**That is the moment the funnel dies, and it is mechanical, not psychological.** The join-code feature — your best distribution idea — has been used exactly once in its life, by you, with one participant (`exam_sessions`: 1 row, owner `nkchaudhary431@gmail.com`, 3 Oct 2026). Zero Indian visitors have ever reached `/exams` or `/join`.

Secondary issue: the test-link preview, while correct, carries `og:url = app.testoza.com` even though the teacher shared `testoza.com`, and its description exposes **"Creator: <personal name>"** — so an institute shares a paper credited to a private individual, not the institute.

### Link 6 — A third of students who open a test quit in the first minute

**71 of 200 registrations are frozen at `in_progress`, average completion 4.7%**, and 34 submissions recorded zero questions attempted. Combined with 12 duplicate phantom rows, the teacher's first real gradebook is polluted with blanks and repeats.

A teacher who takes the risk once, sees 4 of 12 students actually finish, and has no idea why, does not take the risk twice.

### Link 7 — The teacher is never told it worked

`notifications` shows "New Test Submission" fired 46 times to 10 recipients. All **in-app only**.

The only email capability in the entire backend is `backend/app/routers/email_broadcast.py` — an **admin marketing broadcast** gated by `_verify_is_admin` (and the `admins` table has **0 rows**, so even that is currently unusable).

**There is no transactional email. None.** No "3 students have submitted." No "your exam starts in 1 hour." No results digest.

So the loop is: teacher shares → students submit → **teacher never finds out** unless they independently choose to log back into TestoZa. 84% of them never log back in. Several teachers in your database have unviewed submissions sitting there right now. They churned believing nothing happened.

---

## 4. What the teacher is actually thinking (the sentiment question)

You have **no sentiment data.** Both `feedback` rows and all five `support_messages` are your own test entries (`"Check ✅✔️"`, `"ujh"`, `"slfj"`, `"Checking whether it is working or not??"`). `exit_feedback` is empty. Every support ticket is still status `pending`.

**Not one real teacher has ever written to you.** That is normal and it is the point: *dissatisfied users don't complain, they leave silently.* So sentiment has to be reconstructed from behaviour. Here it is, reconstructed from real clickstreams and real scores:

| Minute | What they do (observed) | What they're thinking |
|---|---|---|
| 0–2 | Land, click "Create Test with AI" | *"Free, AI, no signup wall. Let me try."* |
| 2–12 | Upload PDF, 383 views of `/generate-with-ai` across 41 Indian visitors | *"This is genuinely good. It read my paper."* |
| 12–15 | Bounced to `/login` → `/onboarding` → back | *"Why now? I was in the middle."* |
| 15–45 | Take their own test in the CBT simulator | *"This looks exactly like the real exam. Impressive."* |
| 45 | Score shows **−18** | **"Wait. The marks are wrong. I can't show this to anyone."** |
| 46–50 | Hunt the sidebar: My Tests → Exams → Batches → All Submissions | *"Where do I send this? Which of these is it?"* |
| 50 | Click Share. Nothing visible happens (desktop) | *"Is the button broken?"* |
| 51 | Read the message: *"If above link doesn't work…"* + *"Powered by Testoza"* | **"I'm not sending this to parents."** |
| 52 | Close tab | *"Nice toy. Not ready for my institute."* |
| Later | No email ever arrives | *(never thinks about TestoZa again)* |

**Their mentality is not suspicion. It is caution plus embarrassment-risk.**

An Indian coaching teacher's reputation is their entire business. A test link that fails for even 3 of 40 students generates 37 WhatsApp messages they have to answer personally, on a Sunday evening, in front of paying parents. The downside of a broken test is humiliation; the upside of a working one is modest convenience. **Faced with that asymmetry, a rational teacher runs one rehearsal and stops.**

That is *exactly* what your data shows: 84% create on one day, self-attempt, and vanish. **They are not churning. They are completing a risk assessment — and your product keeps failing it in the final ten seconds.**

### The specific Indian objection you never answer

The #1 question in every Indian teacher's head is: **"Will my students have to create accounts?"**

The answer is **no** — guest attempts work (`TestIntroPage.tsx:1097`, `login_required` is opt-in and is set on **0 of 178 tests**). That's a genuine competitive advantage over Google Classroom and Testportal.

**You never tell them.** It appears nowhere on the dashboard, nowhere in the share flow, nowhere in the share message. The single fact that would unlock the share decision is invisible at the share decision.

---

## 5. Walkthrough as a coaching teacher — everything odd

I ran the product as "a Kota physics teacher with 60 students." Listed worst-first.

1. **My own test scores me −18.** Nothing on screen explains why or how to turn it off. *(§3.1)*
2. **"If above link doesn't work, use this:" is in the share message I'm supposed to forward.** *(§3.3)*
3. **The Share button gives no feedback on desktop.** *(§3.4)*
4. **The WhatsApp preview of my join link advertises a test maker.** *(§3.5)*
5. **I can't find where to send a test.** Eleven sidebar items, none named for the job.
6. **Two different "my tests" pages** — `/my-tests` and `/creator/tests`. Which is real?
7. **"Rewards" tells me to get 20 submissions per test to earn "prestigious platform badges."** No teacher on this platform has ever exceeded **4** takers. The first rung of the ladder is unreachable by a factor of five, and it frames me as a "creator" farming badges rather than a teacher grading a class.
8. **A test I never made appears in my list** — "Example Mock Test - TestoZa", auto-seeded into **29 of 37** creators' accounts. Six users' *only* test is this seeded example. My own workspace lies to me on day one.
9. **My slug is `history-of-physical--df8zwce2`** — truncated, double-hyphenated, random suffix. It reads like a phishing link in a WhatsApp group.
10. **61% of tests (108 of 178) save with no settings at all** (`settings` null or `{}`). Every proctoring and conduct feature you built silently never applies.
11. **The link domain changes under me.** `testoza.com/join` 301s to `app.testoza.com/join`; share URLs are built from `window.location.origin`, so the same test is `testoza.com/test/x` or `app.testoza.com/test/x` depending on where I happened to be standing.
12. **`/all-submissions` has no export.** No CSV, no XLSX, no print. I cannot get marks into the register I actually keep. *(This was flagged in the Aug 2026 report and is still open.)*
13. **I'm thrown back to `/login` from `/generate-with-ai` repeatedly.** Yamuna's clickstream, 15:29:54–15:31:38 — eight bounces between `/`, `/generate-with-ai`, `/login` and `/auth/callback` in 104 seconds.
14. **"Please set your designation to save your test"** (`TestBuilder.tsx:968`) — I wrote 50 questions and I'm being asked for my job title before I'm allowed to keep them.
15. **Five rapid `/dashboard` hits in 20 seconds, then `/support`** (Yamuna, 8 Aug 16:33:04→16:33:24). Rage-clicking, then giving up. She found the support page. She wrote nothing. That silence is your entire sentiment dataset.
16. **Nothing tells me my students don't need accounts.** *(§4)*
17. **No email, ever.** *(§3.7)*

---

## 6. Walkthrough as an institute director — everything odd

Now as "the owner of a 400-student CA coaching institute, evaluating vendors." Different fears entirely: continuity, liability, and whether you'll poach my students.

1. **Your pricing tells me you won't exist next year.** ₹49/week, ₹149/month, ₹799/year *(PricingPage.tsx:27, 43, 60)*. I pay my building's electricity bill more than that. **In Indian B2B, price is the primary credibility signal.** At ₹149/month I cannot believe there is a company behind this, so I cannot put 400 students' internal exams on it. Underpricing has not made me more likely to buy; it has disqualified you. (And the `plans` table has **0 rows** — the plans advertised don't exist in the database.)
2. **"Powered by Testoza / https://testoza.com" on every share, with no way to remove it.** You are asking me to broadcast your brand into my own paying student base, for free, forever. That is the disintermediation fear in literal text. White-label is listed as a premium feature, yet **only 10 of 178 tests carry an institute logo, from 8 creators** — so either nobody can find it or nobody believes it works.
3. **The share description credits a person, not my institute** — "Creator: Nirwair Chaudhary"-style attribution. My parents should see *my* institute's name.
4. **"Creator Badges & Rewards" and "rank up your creator profile."** This is influencer-platform language. It tells me the platform's ambition is to accumulate creators and audiences — which means my students are your acquisition channel. Combined with #2, I read a strategy that ends with you between me and my students.
5. **No social proof whatsoever.** Live homepage probe: zero customer logos, zero testimonials, zero user counts, no case studies, no company registration details, no phone number, no address. I have no basis on which to trust you with exam data.
6. **Vague security claims.** "Focus-tracking," "standardized test integrity controls" — no explanation. Meanwhile the real posture:
   - `exam_sessions`, `session_participants`, `roster_students`, `anon_test_attempts` all have **RLS enabled with zero policies** — the entire live-exam feature works only through a service-key backend, a single point of failure for exam day.
   - `public_profiles` is a **SECURITY DEFINER view** (Supabase advisor: ERROR).
   - **8 SECURITY DEFINER functions are callable by anonymous internet users**, including `notify_admins_generic(p_title, p_message, p_link, …)` — anyone can push arbitrary titles, messages and **links** into your admin notification panel. That is a phishing vector aimed at your own staff.
   - Leaked-password protection **disabled**; email OTP expiry **over an hour**.
   - `pg_net` installed in the `public` schema.
7. **My support ticket would sit forever.** All five `support_messages` are status `pending`, the oldest from 6 Feb 2026. I test support responsiveness before I sign anything.
8. **Batches are vestigial.** Only **8 of 178 tests** are attached to a class. The organisational unit I actually think in — *batch* — barely functions.
9. **The marketing copy contradicts itself.** The homepage FAQ promises I can "generate a QR code from your dashboard." The QR component is real (`components/exams/QrCode.tsx`) but lives **only** inside `/exams/:id` — a surface no teacher has ever reached. The homepage promises short-answer questions; the feature list offers MCQ, fill-in-blank, true/false, multi-select. Comparative SEO claims ("Is TestoZa better than Google Forms") carry no evidence.
10. **"Free forever, unlimited students" + ₹149 plans.** If it's unlimited and free, what am I buying? If I'm buying something, why is it priced like a snack? There's no coherent commercial story for me to take to my partner.

---

## 7. What is genuinely good — and why it makes this worse

Be clear-eyed: **the top of this funnel is working, and that is rare and valuable.**

- **49% of Indian visitors who land go on to `/create-test`.** That is an extraordinary intent rate. Your SEO and landing page are doing their job.
- **10.6 minutes average engaged time.** People take this seriously.
- **The AI importer is the hook.** 127 generation records, 41 Indian visitors, 9.3 visits each. Teachers return to it specifically.
- **The CBT simulator earns 45–70-minute self-attempts.** Teachers *enjoy* it. John Imoisili took his own 68-question paper **six times.** Yamuna authored **910 questions** across 15 tests. Kunal Saini built JEE Advanced papers and sat them himself.
- **Guest attempts work.** `candidate_*@guest.testoza.com` submissions appeared through October — Cranium Lily got 3 candidates scoring 24–28/30 on 8 Oct; TargetCA got 4. **The plumbing works when someone finds it.**
- **The August 2026 report's worst findings are fixed.** The 4-step student wizard is gone (`TestIntroPage.tsx:125` — now just `'intro' | 'waiting_room'`). The silent private-link trap is narrowed. `login_required` is off by default on all 178 tests.
- **The Oct 2026 work is the right medicine.** `FirstExamChecklist` ("Three steps from your question paper to your candidates' marks"), `/exams`, join codes, QR, roster + PIN, WhatsApp result sharing to parents — this is precisely correct product thinking.

**Why that makes it worse:** you are spending effort at the top of a funnel that has a hole at the bottom. Yamuna gave you 910 questions. Kunal gave you four JEE Advanced papers. John sat his own exam six times. **These people wanted to be your customers.** They were not unconvinced — they were *unserved at the last step.* Every rupee of SEO and every new guide page pours more high-intent teachers into a funnel that cannot complete the one transaction that matters.

And the October fixes shipped **after 27 of your 31 creators had already churned** — then landed behind a join link that previews as an ad. The medicine is correct and it is not reaching the patient.

---

## 8. What to do, ranked by (impact ÷ effort)

### Fix this week — all small, all on the critical path

| # | Fix | Where | Why |
|---|---|---|---|
| 1 | **Default `negativeMarks` to `0`.** Make negative marking an explicit, named choice ("JEE/NEET pattern (−1)" vs "School pattern (no negative)") at creation. | `TestBuilder.tsx:655,749`; `AITestImporter.tsx:1163,1176,1310,1322` | Removes the −18 moment. Highest-impact one-line change in the codebase. |
| 2 | **Delete the words "If above link doesn't work, use this:"** and stop emitting `/test-intro/<uuid>` as a fallback. Guarantee a slug at creation; share exactly one link. | `shareUtils.ts:15–27` | Stops you apologising for yourself inside your customer's message. |
| 3 | **Replace `window.toast` with the real `toast` from `sonner`.** | `shareUtils.ts:32,79,162` | Share stops being invisible on desktop. |
| 4 | **Give `/join/:code` real crawler meta** — `og:title` = "<Test> — join with code <code>", correct `og:url`, a branded image. | `worker.js` (extend the `/test/` crawler branch) | Turns the WhatsApp preview from an ad into an invitation. |
| 5 | **Add `settings` defaults on every save path** so the 61% of tests with `{}` settings stop silently bypassing every conduct feature. | create/import paths | |

### Fix this month — close the loop

6. **Make the post-save screen a send screen.** Replace `navigate('/my-tests')` with a full-page "Send to your students": the one link, a QR, a join code, a WhatsApp button with teacher-appropriate copy, and in large type: **"Your students don't need an account. They just enter their name."**
7. **Ship transactional email.** Three messages only: *a student submitted*, *your exam starts in 1 hour*, *your results are ready* (with the gradebook attached). Without this, nothing else compounds.
8. **One-click gradebook export** (XLSX/CSV: Roll No, Name, Marks, Accuracy, Time) on `/all-submissions`. Still missing since August.
9. **Collapse the sidebar from 11 items to 5**: Dashboard · Create · Exams · Results · Students. Kill or hide Rewards, Materials, Test History, `/creator/tests`.
10. **Stop seeding "Example Mock Test - TestoZa"** into real accounts, or label it unmistakably as a sample.
11. **Instrument distribution.** You currently track `pdf_export`, `ads_landing_cta`, `guide_cta_click`, `ads_try_question` — and **no event for test created, link copied, share clicked, join code generated, or student started.** You are blind on your core conversion. Add those five events before anything else, or you will not be able to tell whether fixes 1–10 worked.
12. **Fix the `anon`-executable SECURITY DEFINER functions**, starting with `notify_admins_generic`. Revoke `EXECUTE` from `anon`.

### Decide this quarter — the commercial question

13. **Reprice.** ₹149/month does not read as cheap to an institute; it reads as temporary. Institute tier at **₹2,000–5,000/month** with white-label, custom domain, batch management, parent WhatsApp reports and a human to call. Keep individual teachers free forever — that's your acquisition engine. **Charge the institute enough that it believes you'll still be here in March.**
14. **Make "Powered by Testoza" removable on any paid tier**, and attribute shares to the *institute*, not the individual. Until you do, every institute director reads your share text as an attempt to reach their students.
15. **Earn one reference customer.** Pick the three warmest real signals in your database — **Target CA / TargetCA / Devil** (3 accounts, 7 tests, 377 questions, 7 outside takers, all on 1–2 Oct 2026, clearly a CA coaching team working together) and **Sumit Patil** (`chemistryforcetjeeneet@gmail.com`, MHT-CET chemistry, 50 questions, 8 Oct) and **Cranium Lily** (3 real candidates, 8 Oct). Phone them. Run one real exam for one real batch *by hand*, personally, on a video call. **Get one teacher to 30 students once.** You have never done it; until you do, you are guessing about everything downstream.

---

## 9. The one-sentence answer to your question

> **They browse for ten minutes because the product is good, they build a real paper because the AI is good, they take it themselves because the exam simulator is good — and then they see a negative score, a share button that does nothing, a message that apologises for its own link, and a WhatsApp preview advertising a free test maker to the parents of their paying students. So they don't press send. It isn't trust. It's the last ten seconds.**

---

## Appendix A — Evidence index

| Claim | Source |
|---|---|
| 105 signups → 31 creators → 0 with ≥10 takers | Cohort SQL over `profiles`, `tests`, `user_tests`, founder accounts excluded |
| 84% single-day creators | `active_days = 1` for 26 of 31 |
| India #1: 191 visitors, 100 mobile / 89 desktop | `visitors` grouped by `country`, `device_type` |
| 10.6 min avg engaged, India | `analytics_sessions`, bots and internal excluded (45 sessions since 26 Sep) |
| Indian surface funnel 108→53→…→4→0 | `page_views` joined to Indian `visitors` (2 Mar – 9 Oct 2026) |
| 52% of non-founder tests have negative marking; 30 on every question | `jsonb_array_elements(tests.questions)` scan |
| 12.4% negative scores, 13.1% zero-question, 12 duplicate rows | `user_tests` aggregates (n=259) |
| 71/200 stuck `in_progress` @ 4.7% | `test_registrations` by `status` |
| 108/178 tests with empty `settings`; 8 with `class_id`; 10 with logo | `tests` where title ≠ example |
| 42 tests `visibility='public'` but `is_public` false/null | `tests` grouped by both flags |
| Join vs test WhatsApp preview | Live `curl -A "WhatsApp/2.23.20.0 A"` against both URLs, 10 Oct 2026 |
| `testoza.com/join` → `app.testoza.com/join` 301 | Live HTTP probe |
| `window.toast` never assigned | 6 reads in `shareUtils.ts`, 0 writes repo-wide |
| No transactional email | Only `backend/app/routers/email_broadcast.py`, admin-gated; `admins` table = 0 rows |
| exam_sessions used once, by founder | `exam_sessions` (1 row), `session_participants` (1 row) |
| Zero real support tickets or feedback | `support_messages` (5, all founder/test), `feedback` (2, junk), `exit_feedback` (0) |
| No share/create/copy events tracked | `analytics_events` distinct `name` (4 values, none distribution-related) |
| RLS-without-policy on 12 tables; anon-executable SECURITY DEFINER ×8 | Supabase security advisors, 10 Oct 2026 |
| Rewards threshold 20 submissions | `pages/RewardsPage.tsx:111` |
| Pricing ₹49 / ₹149 / ₹799; `plans` empty | `pages/PricingPage.tsx:27,43,60`; `plans` = 0 rows |

## Appendix B — The five warmest real accounts in your database

Call these people. They are the closest you have ever been to a customer.

| Who | Signal | Last seen |
|---|---|---|
| **Target CA / TargetCA / Devil** (`meetkhosa07@`, `targetca01@`, `devilpreet47@`) | A CA coaching team, 3 accounts working in concert, 7 tests, 377 questions, **7 outside takers** — the most real distribution on the platform | 1–2 Oct 2026 |
| **Cranium Lily** (`lilycranium@`) | 30-question GK test, **3 real candidates scored 24–28/30** — a clean, successful conduct | 8 Oct 2026 |
| **Yamuna Mukunuri** (`yamunamukunuri@`) | **910 questions, 15 tests**, Telangana DSC prep; browsed as an aspirant for 5 months before signing up. Your most invested author. Hit the auth loop and the rage-click → support path | 19 Sep 2026 |
| **Sumit Patil** (`chemistryforcetjeeneet@`) | MHT-CET chemistry, 50-question Solid State paper, 1 outside candidate | 8–10 Oct 2026 |
| **Kunal Saini** (`aadityasaini2580@`) | 4 JEE Advanced papers, 228 questions, sat his own 52-question paper. One student opened a paper and **quit after 2 of 45 questions** | 25 Sep 2026 |
