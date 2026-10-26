# Why Teachers Build Tests on TestoZa and Don't Send Them — v2

**Re-diagnosis 16 days after the fixes: who conducts now, who still doesn't, and what the ideal looks like**

| | |
|---|---|
| **Date** | 26 October 2026 |
| **Written for** | Founder/CEO, plus product & engineering |
| **Window** | 10–26 Oct 2026 (new behaviour), compared with everything before 10 Oct |
| **Evidence base** | Supabase production DB (read-only SQL across `profiles`, `tests`, `user_tests`, `test_registrations`, `analytics_*`, `exam_sessions`, `question_reports`, `support_*`), per-person clickstreams, the names candidates typed into start forms, code audit of `frontend/` and `backend/`, live link-preview probes of testoza.com (26 Oct) |
| **Method** | Cohort funnels, weekly cohorts, per-educator classification, clickstream reconstruction, research synthesis (themes → segments → opportunities) |
| **Supersedes** | `TestoZa/Why_Teachers_Dont_Circulate_Tests_Oct2026.md` (v1, 10 Oct). Read v1 for history. This file is self-contained. |
| **Exclusions** | Founder accounts (5), demo accounts (3), hidden candidate logins (`@guest.testoza.com`) and auto-seeded example tests are excluded from every creator number |

---

## 0. What changed since v1, in one table

| Measure | v1 (10 Oct, all time) | v2 (26 Oct) |
|---|---:|---:|
| Real test creators | 31 | **88** (58 of them new since 10 Oct) |
| Creators who ever reached 10 outside candidates | **0** | **14** |
| Biggest class any creator ever ran | 4 candidates | **435** (Nigerian institute) / **207** (Indian eye-hospital assessment) |
| New educators (since 10 Oct) who reached 5+ candidates | — | **13 of 38 (34%)** |
| Educators who reached 5+ candidates, cohort before 10 Oct | 2 of 21 (10%) | — |
| Negative final scores | 12.4% of submissions | **0.6%** (since 17 Oct) |
| Blank submissions (0 answered) | 13.1% | **2.6%** |
| WhatsApp preview of an exam link | Homepage advert | **Exam title + "enter your name, then tap Start"** (verified live) |
| Emails sent to any educator, ever | 0 | **0** (code built, SMTP never switched on) |
| Real feedback or support messages from educators | 0 | **1** |

**The v1 diagnosis was right, and the v1 fixes worked.** Before 10 Oct, one educator in ten ran a real class exam. Since 10 Oct, it is roughly one in three, and in the Oct 10–16 and Oct 17–23 cohorts it was 38–39%. TestoZa has now served real classes of 13, 17, 29, 36, 59, 207 and 435 candidates.

So if it still *feels* like "nobody conducts", part of that feeling is real, and part of it is coming from what you are looking at. Section 3 separates the two.

---

## 1. The verdict (v2)

v1 said: *"It isn't trust. It's the last ten seconds."* You fixed the last ten seconds. What is left is a different, deeper problem:

> **Conducting happens when an exam is already due. TestoZa is excellent when the class is waiting right now, and it has nothing for the teacher whose class writes on Monday.**

Of the 8 Indian educators who ran a real exam since 10 Oct, **6 had their first candidate within one hour of making the test.** Their class was already waiting. They were on an online class, they had an Instagram audience, they were standing in a school period. TestoZa caught them, and they came back. **10 of the 17 educators who ever ran a real exam have run at least a second one.**

The educators who don't conduct are mostly not "teachers who chickened out at the share button". When I classify the 25 new educators who didn't reach 5 candidates one by one (§4), they split into:

- **10 educators abroad** having a single look around.
- **4 aspirants who chose "Teacher"** and made mock tests for themselves (NPTEL assignments, a NEET 2027 mock, BPSC TRE).
- **2 home tutors or parents.** Their children *did* write the tests, on the teacher's own logged-in phone. The dashboard told them "you have tried it yourself".
- **1 duplicate account** of an educator who did conduct, 29 candidates.
- **8 genuine Indian classroom teachers** who built a paper for a class and stalled.

Those **8 stalled teachers are the real problem**, and they all did the same thing in a single sitting: make the paper with AI → sign up mid-flow → open their own exam link → glance at the result → leave. 6 of the 8 never came back after day one. One opened their own exam link again at 08:33 the next morning, then did nothing. They were thinking about Monday's class, and **TestoZa has no way to carry a paper from tonight to Monday morning.** There's no "schedule it for class" in the conduct flow (5 of 132 new tests use a schedule), no reminder, no email, and no "save this message to my WhatsApp".

Meanwhile the newest sign-ups are increasingly **students sent by ChatGPT** who convert coaching papers into practice tests for themselves. On 23–26 Oct, 16 students and 9 educators signed up. Students will never conduct, and they're filling your user list.

**This is no longer a share-button problem. It's a "when is the exam?" problem, plus a measurement problem.**

---

## 2. The numbers

### 2.1 New-educator funnel since 10 Oct (role = Teacher or Institution, first test on or after 10 Oct)

| Stage | Count | Share of educators |
|---|---:|---:|
| Made a real test | 38 | 100% |
| Started it as a live exam | 27 | 71% |
| Got ≥1 outside submission | 25 | 66% |
| Got ≥5 outside candidates (a real class) | **13** | **34%** |
| Got ≥10 | 11 | 29% |
| Got ≥25 | 8 | 21% |

For the 13 who reached 5+, the **median time from first test saved to first outside submission is 29 minutes.**

The "≥1" line flatters. Of the 12 educators with 1–4 outside submissions, at least 5 (probably 7) were **the teacher testing their own link as a guest.** The first "candidate" usually arrives 4–16 minutes after the test is made, with names like "R" (1 of 40 answered), "rahul" (0 of 42), "j" (0 of 10), or the teacher's own name. Treat **≥5 candidates** as the real "conducted" line.

### 2.2 Weekly cohorts: the fixes worked

| First test in week | Educators | Went live | ≥5 candidates | ≥10 |
|---|---:|---:|---:|---:|
| Before 10 Oct (all history) | 21 | 12 | **2 (10%)** | 1 |
| 10–16 Oct | 16 | 10 | **6 (38%)** | 6 |
| 17–23 Oct | 18 | 15 | **7 (39%)** | 5 |
| 24–26 Oct (too early) | 4 | 2 | 0 | 0 |

The step change lines up with the v1 fixes: marking defaults to 0, one clean link, a real toast, previews that look like an invitation, and the WhatsApp message on the dashboard.

### 2.3 India specifically

| Since 10 Oct, India | Count |
|---|---:|
| Unique visitors who reached a builder page (`/create-test`, `/generate-with-ai`, `/quiz-creator`, `/pdf-to-quiz`) | 152 |
| …of whom signed in | 88 (58%) |
| …made a real test | 47 (31%) |
| …started a live exam | 33 (22%) |
| …reached 5+ candidates | 14 (9%) |
| New Indian educators (first test since 10 Oct) | 23 |
| …who conducted (5+) | **8 (35%)** |

**Where Indian builder visitors come from (since 10 Oct):** ChatGPT **66**, Google 48, direct 37, social 1. **ChatGPT is now your #1 source of Indian visitors to the builder.** 101 visitors and 50 accounts came via `utm_source=chatgpt.com` in 16 days.

### 2.4 Who signed up since 10 Oct (361 accounts)

| Role chosen | Accounts | Made a test | Took someone else's test | Neither |
|---|---:|---:|---:|---:|
| **No role** (candidates who signed in to write an exam) | 284 | 0 | 213 | 71 |
| Teacher | 42 | 36 | 2 | 6 |
| Student | 28 | 16 | 2 | 10 |
| Other | 5 | 3 | 0 | 2 |
| Institution | 2 | 2 | 0 | 0 |

**79% of "new users" are not users. They are candidates.** 212 of them signed up on a single day (22 Oct), for one eye-hospital extern assessment that asked candidates to sign in with Google. Any "new users who didn't conduct" view that counts these will look catastrophic, and it's meaningless.

### 2.5 The candidate side is no longer the problem

Since 17 Oct (when link candidates started being recorded at start):

| Signal | Value |
|---|---:|
| Starts by outside candidates | 1,185 |
| …submitted | 880 (74%) |
| …never submitted | 295, of which **206 are on one Nigerian institute's open GST papers** |
| Drop-off outside that one institute | 89 of 563 (16%); several re-started and submitted under the same name |
| Indian class exams' completion | Ompriya 98%, nikita 97%, Vedprakash 93%, Aswini 84%, Payal 78% |
| Blank submissions | 26 of 1,007 (2.6%) |
| Negative final scores | 6 (0.6%) |
| Duplicate result groups (same person, test, score) | 20 |
| Submissions with any tab-switch violation recorded | **0** (see §6, Theme 6) |

### 2.6 When real classes write

Indian class exams since 8 Oct (11 educators, 578 submissions): **83% arrive between 4 pm and midnight IST**, 16% in school hours, and 1% overnight. Excluding the one corporate assessment, it's 73% evening and 25% school hours.

**Reading:** for Indian teachers, TestoZa is mostly being used for **tests written at home in the evening, on a phone, after school or coaching**. It's not replacing the in-class paper exam. That matters for the vision in §9.

### 2.7 Once it works, they stay

| Of the 17 educators who ever ran a real exam (≥5 candidates) | |
|---|---:|
| Ran ≥2 different tests with ≥3 candidates each | **10** |
| Had ≥3 candidates on ≥2 separate days | **9** |

The first real class exam is the activation moment. Nothing before it predicts retention. Almost everything after it does.

---

## 3. Why it still *feels* like nobody conducts

Four things are inflating the denominator you look at.

1. **Candidates who sign in look like sign-ups.** 284 of 361 new accounts since 10 Oct have no role, and 213 of them only wrote someone else's exam.
2. **Students now outnumber educators among new sign-ups.**

   | Sign-up days | Educators | Students |
   |---|---:|---:|
   | 12–18 Oct | 26 | 5 |
   | 23–26 Oct | 9 | 16 |

   These students come largely from ChatGPT. They upload a coaching paper ("Gurukripa Minor Test – MEC, Magnetism, EMI", "ForumIAS GS Paper-1", "DSSSB TGT Computer Science PYP", "Rank Booster Series 1.0") and want to *practise it themselves*. 0 of 13 ChatGPT students got a single outside candidate. And 13 of the 20 non-educator creators never even took their own test. Students land on `/my-tests` with the *Conduct exam* tile glowing (`UserTestManager.tsx:155–167`), which is the wrong next step for them.
3. **The example test is still seeded into every new account.** 76 copies since 10 Oct, 9 of them seeded *live*. On the earlier admin "Tests created" tile, examples were 24 of 60. Every seeded example is a "test that was never conducted".
4. **Self-attempts look like "tried it and left", even when students wrote them.** See Theme 2. Surendra Kaswan's account has 6 "self-attempts". The start-form names on them are **MANSI**, **Bharti** and **MANHSI KASWAN**, and they took 22–24 minutes each. Those are candidates writing on the teacher's phone.

**What to look at instead:** new *educators* → first live exam → first class with ≥5 candidates → second exam. That line went from 10% to 34% (§2.1–2.2).

---

## 4. Who the 25 non-conducting new educators really are

Every new educator since 10 Oct with fewer than 5 outside candidates, classified by test titles, country, start-form names and clickstream. The labels are my interpretation; the evidence column is observed.

| Group | n | Who | Evidence | Will they ever conduct? |
|---|---:|---|---|---|
| **A. Abroad, one-session look** | 10 | Danaya (UA), Ieltstest (TZ), Jane Mutheu (KE), mohamed AIT MADANI (MA), Sakine Behvandi (IR), Xeyyam (AZ), FATIMA ELBOUNIMI (MA), hanya (QA), Modifail (NG), Sara Saqr (SA) | 1 test, 7–49 min, mostly 1 day; a few had 1–2 candidates (family or tutees) | Rarely. Not your market today. |
| **B. Aspirants who picked "Teacher"** | 4 | bhargav (NPTEL IoT practice, 181 Q), Nagireddy Roddam (NPTEL "Assignment Week-03"), Sarathi (NEET 2027 Biology mock, 147 Q), MD FAIYAZ ARIF (BPSC TRE 4.0, UGC-CSIR NET; plus a few school tests) | Exam-prep titles, huge question counts, self-attempts | No. Wrong segment. |
| **C. Home tutor or parent on one device** | 2 | Surendra Kaswan (Class 8 Sanskrit, Class 10 Chemistry/Maths), Poonam (Class 10 Sanskrit) | "Self-attempts" carry other people's names (MANSI, Bharti, Ria); real 20+ minute sittings | **They already did.** The product counts it wrong. |
| **D. Duplicate account** | 1 | sushree mohapatra (gmail) | Same person as the Genpact account that ran 29 candidates | Already did. |
| **E. Indian classroom teacher, stalled** | **8** | Beema Jinas (Physics), Priya Thomas (Nursing ethics), Rajasar Bikan (Hindi-medium Science), santigopal (History), STALIN SHELLY (Accountancy), Swayam patidar (Hindi-medium Geography), Anish Khan (Hindi-medium Geography), Dinesh Chander | 1 test each; 10–45 min; build → own link → result → leave; 6 of 8 never returned | **Yes. This is the problem to solve.** |

**Reframed:** among Indian *classroom* teachers since 10 Oct, it's roughly **8 conducted vs 8 stalled**, with 2 more who conducted one-to-one on the teacher's own device. Half are getting through. The other half all stall in the same way.

---

## 5. The stall, minute by minute

Reconstructed from the clickstreams of the 8 stalled Indian teachers. Real sequences, IST.

**Rajasar Bikan, Sat 17 Oct** — 13:22 `/generate-with-ai` (2 min) → 13:25 `/onboarding` → 13:26 `/my-tests` → `/exams` (19 s) → `/my-tests` (3 min 19 s) → 13:32 own exam link → 13:33 `/live` (41 s) → 13:34 `/results` → `/dashboard` (0 s). **Gone. Never returned.**

**santigopal, Fri 23 Oct** — 21:02 `/generate-with-ai` (4 min) → `/onboarding` → `/create-test` (2.5 min) → 21:12 own exam link → `/live` (60 s) → `/results` → `/join` → `/join/result/721101` → `/join` → own link again → `/live` (19 s). **Next morning, 08:33: opens own `/live` link once, 0 s.** Never sends.

**Swayam patidar, Wed 14 Oct** — 19:39 `/generate-with-ai` (5 min) → `/onboarding` → 19:47 own link → `/live` (2 min) → `/results` → `/edit-test` ×5 in 4 min → `/explore`. **Gone.**

**Priya Thomas, Wed 14 Oct** — 13:08–13:57: **seven bounces** between `/generate-with-ai` and `/create-test`, with 6, 7 and 13-minute stretches in the builder → 14:33 `/onboarding` → 14:34 `/my-tests`. **Gone.** Nearly 90 minutes to make 9 questions.

**STALIN SHELLY, Sat 10 Oct** — builder → `/onboarding` → `/my-tests` → `/rewards` → `/dashboard` (3.5 min) → `/exams/:id` → `/exams` → `/exams/:id` → `/exams` → `/user-guide` → `/user-guide/schema-flat` → `/user-guide/ai-test-generation`. **Looking for how to conduct. Never went live.**

### What they're thinking (interpretation)

| Minute | Observed | Likely thought |
|---|---|---|
| 0–5 | AI reads the paper | *"This is good. It typed my whole paper."* |
| 5 | Sign-up pops up mid-flow | *"Fine, 10 seconds."* (onboarding takes 8–14 s: not the problem) |
| 6–10 | `/my-tests`, the card glows for 6.5 s, Conduct dialog: "Secure Slug · 12c · Regenerate · *private mode blocks all other access*" | *"Slug? Is this going to lock something?"* |
| 10–12 | Opens own exam link, writes for 20–120 s, sees result | *"OK, it works. It looks like a real exam."* |
| 12 | Result screen | *"My class writes on Monday. I'll send it then."* |
| Next day | Nothing arrives: no email, no reminder, no WhatsApp | *(forgets, or opens it once at 08:33 and gets pulled into class)* |

**v1's teacher was embarrassed: "the marks are wrong, the link looks broken." v2's teacher is convinced but has no class in front of them.** The decision is made in principle and lost in time.

---

## 6. Themes (research synthesis)

Each theme separates **what was observed** from **what it means**.

### Theme 1 — Conducting is triggered by an exam occasion, not by the product

**Prevalence:** 6 of 8 Indian conductors had their first candidate within 1 hour of making the test (0.1, 0.1, 0.3, 0.3, 0.3, 1.0 h). The other 2 sent the next day (15 h, 20 h). Of the 17 Indian educators who didn't send within that first hour, only those 2 (12%) ever sent at all.

**Observed:**
- *Live sittings*: nikita pande, 64 candidates in 24 minutes, a Coursera class with SAP IDs. Anshi Bajaj, 36 in 18 minutes. Andrea, 8 in 12 minutes.
- *Audience on standby*: Payal Saini Notes posts "Free Test by Payal Saini" to Instagram, and 59 visitors arrived from instagram.com. Digital Creater and Md. Wahiduzzaman post to Facebook.
- *In the period*: Govt Sr. Secondary School Dhani Panchera's first candidate came 6 minutes after the test was made, at 13:26 on a Saturday.

**Implication:** the product already wins the "class is waiting now" case. The lost case is "class is waiting later". Every extra nudge on `/my-tests` does nothing for a teacher whose exam is in 3 days. The product needs a way to **commit** a paper to a future class moment and **bring the teacher back** at that moment.

### Theme 2 — Teachers check the exam by becoming a candidate, and the product counts it wrong both ways

**Prevalence:** 15 of 38 new educators self-attempted on their own login. At least 5 more (probably 7) rehearsed as a guest on their own link.

**Observed:**
- **Rehearsal counted as candidates.** Guest submissions, usually 4–16 minutes after creating the test, named "R" (1 of 40 answered), "neme" (4 of 63), "rahul" (0 of 42), "j" (0 of 10), "Faiyaz", "Bhavya saini", "Sushree Mohapatra". These appear as results, and the dashboard flips to *"1 candidate so far. Send it to the rest."* (`NextStepCard.tsx:41–43`), which is false.
- **Real candidates hidden as the teacher.** When a student writes on the teacher's logged-in phone, the attempt is saved under the teacher's account. The dashboard drops every attempt whose `user_id` is the creator's (`teacherDashboardApi.ts:314–317`). All Submissions does the same (`AllSubmissionsPage.tsx:91`). Then the teacher is told *"You have tried it yourself, so you know it works"* (`NextStepCard.tsx:46–48`).

  | Account | Names on the "self-attempts" |
  |---|---|
  | Surendra Kaswan | MANSI, Bharti, MANHSI KASWAN |
  | Poonam | Ria |
  | Govt Sr. Sec. School Dhani Panchera | Kailash Chandra Gandas, GS Bana |
  | Jasanpreet Singh | Harmanjot |

**Implication:** in Indian homes and schools, **one phone is shared**. A teacher handing their phone to a student is a normal way to run a test, and so is a parent handing theirs to a child. Right now that usage is invisible, and the copy tells the teacher they are the only one who wrote it. Meanwhile their own checking pollutes the results they would show a parent.

### Theme 3 — The "future exam" gap: built tonight, written Monday, nothing carries it over

**Prevalence:** 6 of the 8 stalled teachers built between Friday night and Sunday. 6 of 8 never returned.

**Observed:**
- `settings.schedule.enabled` on **5 of 132** tests made since 10 Oct. Scheduling exists, but only inside the settings panel, not in the go-live moment.
- **0 emails sent, ever.** `submission_email.py` is built but `SMTP_PASSWORD` was never set (Zoho free tier has no SMTP; SES pending). `email_sends` has 0 rows.
- No "save to my WhatsApp", no calendar link, no browser notification. The coach tips live in React state only and vanish on reload (`live-exam-coach-tips`).
- After going live, the coach's step 1 points at **Settings** (anti-cheating, timer, violation limit) and step 2 at **Copy** (`UserTestManager.tsx:647–648`).

**Implication:** the moment a teacher decides "I'll send this on Monday" is the moment TestoZa should capture: *When does your class write it?* Without that, a convinced teacher becomes a lost one by Monday 9 am. India-native carriers need no SMTP: the teacher's own WhatsApp ("Message yourself") and Google Calendar.

### Theme 4 — Small "this looks wrong" signals are still on the share path

**Observed:**
- **Three-hour exams for six questions.** The PDF pipeline's prompt example carries `"duration": 180` (`pdf_vision_pipeline.py:339, :388`), the parser defaults to it (`:2094`), and the backend does too (`tests/write.py:399`). 14 tests since 10 Oct are 180 minutes with an average of 21 questions, for example "Geometrical Optics – Telescope [6 Q, 180 min]" and "SBT [1 Q, 180 min]". The WhatsApp message then reads `⏱️ 180 min · 6 questions`. **It's the same bug class as v1's +4/−1: the AI copies the example.**
- **Hindi titles make gibberish links.** Devanagari is stripped from slugs: `/live/--10--2-qhsf9st4`, `/live/--12-rhbleem8`. 14 of 132 new tests have a double-hyphen slug. Hindi-medium teachers, the core of "exams on paper" India, send links that look like spam.
- **The go-live dialog speaks developer** (`ConductExamDialog.tsx`):
  - an amber ⚠ banner, "private mode blocks all other access" (`:99–105`);
  - "Secure Slug" with a character counter "12c" (`:110, :127`) and a "Regenerate" button (`:117`);
  - a copy button that copies the link **before** the exam is live (`:141`).
- **AI-written titles frame a class test as practice.** 38 of 124 new tests are titled "…Practice Test" or "अभ्यास…", and 13 "Advanced / Tough / Comprehensive / गहन". In the class group that reads as *"Polynomials and Real Numbers Advanced Test — Surendra Kaswan"*.

**Implication:** none of these alone stops a confident teacher. Together they add doubt in the minute before sending, for exactly the teacher who is unsure.

### Theme 5 — The first real exam is the hook

**Prevalence:** 10 of 17 conductors ran a second class test, and 9 of 17 ran exams on separate days (§2.7).

**Observed:** Payal Saini Notes, 4 tests on 4 days. Govt school Dhani Panchera, 3 tests over 8 days. Aswini, 3 tests over 11 days. Malarvizhi, 3 tests over 7 days. Md. Wahiduzzaman, 12 tests, 10 active days.

**Implication:** run the company on **"first real class exam within 7 days of sign-up"**. Everything that shortens the path to the first exam compounds. Features for established teachers matter far less until that number moves.

### Theme 6 — Exam-day trust is fragile and mostly invisible

**Observed:**
- **The picture question that broke a 207-candidate exam.** In Ompriya's eye-hospital extern assessment (22 Oct), Q47 "Identify the condition" (an eye photo) got **19 "Content Missing / Formatting" reports** in 26 minutes (several are rapid repeats from the same screens). All are still status `open`. Pictures were most likely still base64 inside the test row that day. The 25 Oct move to Storage should fix loading, but the educator was never shown the reports during the exam.
- **Anti-cheating that never reports.** Tab switches are counted on the candidate's screen but only sent on progress pings (`TestPage.tsx:745`), never on submit. The backend writes `violation_count … or 0` (`attempts.py:391, :404`). It's 0 on all 1,007 submissions since 17 Oct. For a teacher moving from paper, *"did anyone cheat at home?"* is the first question, and the answer is always a silent zero.
- **The only real support message in 10 months** came from Malarvizhi R, 15 Oct: *"I created a class 10 pulleys test i could not find how to find."* It was marked `resolved` with no reply recorded in `support_replies`. Malarvizhi went on to run 3 exams.
- `platform_feedback` has 1 row, and it's yours.

**Implication:** reliability is now good enough to *start*. It isn't yet *visible* enough to make an institute owner relax on exam day. v1 found no signal; now there is a little, and it's being dropped.

### Theme 7 — ChatGPT brings a second audience

**Observed:** ChatGPT sent 101 visitors and 50 accounts since 10 Oct, and it's #1 for Indian builder visitors.

| ChatGPT accounts (first session) | Accounts | Made a test | Started live | 5+ candidates | Any outside candidate |
|---|---:|---:|---:|---:|---:|
| Teachers | 18 | 15 | 9 | 4 | 9 |
| Students | 13 | 8 | 4 | 0 | **0** |

`/dashboard` sends students to `/history` (`App.tsx:192`), but saving a test still sends them to `/my-tests` and the Conduct tile.

**Implication:** decide on purpose. Students are not your customer. But they are a **free, AI-driven acquisition stream** and potential carriers into coaching institutes. A student who uploads "Gurukripa Minor Test" has a teacher at Gurukripa. Give them a practice path, keep them out of educator metrics, and watch the copyright exposure of coaching material being uploaded.

---

## 7. Walkthrough as a Hindi-medium school teacher — everything odd

I ran the flow as "a Class 10 Hindi-medium Science teacher in Rajasthan, making Saturday's unit test on Friday night". Worst first. Every item is verified in code or data.

1. **"You have tried it yourself, so you know it works."** No: my student Mansi wrote it on my phone, and her result is hidden from my dashboard. *(Theme 2)*
2. **My test is three hours long.** I uploaded 20 questions. The message says `⏱️ 180 min · 20 questions`. *(Theme 4)*
3. **My link is `app.testoza.com/test/--10--2-qhsf9st4`.** My Hindi title disappeared. *(Theme 4)*
4. **Nothing asks when my class writes it.** It's 11 pm. I want it to open on Saturday at 10 am and remind me at 9:30. That isn't in the go-live flow. Scheduling is hidden in settings, and nothing reminds me. *(Theme 3)*
5. **The go-live dialog warns me in amber about "private mode" and shows a "Secure Slug: 12c".** I don't know what either means.
6. **After going live, the first tip sends me to Settings.** Tab-switch mode, violation limit, flexible timer. I came to send a link.
7. **My own check counts as a candidate.** I opened the link as "R" to see it. Now my results say 1 candidate, and the dashboard says "Send it to the rest".
8. **The AI titled my weekly test "…गहन अभ्यास परीक्षा" (intensive practice exam).** My students' parents will read that.
9. **I turned on anti-cheating, and the results never show who switched tabs.** Always zero.
10. **An example test I never made sits in my list**, sometimes already live.
11. **Four places look like "my tests"**: My Tests, Exams, All Submissions, Test History (`AppSidebar.tsx:190–253`, 10 items; Rewards and Materials are gone since v1).
12. **No email when my students submit.** The feature exists; it's switched off.
13. **After my students submit, they see "Powered by TestoZa"** (`PoweredByTestoZa.tsx`, added 21 Oct). An institute owner reads this as v1 §6.2 again.

**What works well now**, and should be protected:
- the WhatsApp message (bold title — institute, date · minutes · questions, one link, one instruction);
- the preview card;
- marking defaults;
- the candidate side (74–98% completion in Indian classes);
- the NextStepCard's real message preview on `/dashboard`;
- join codes, used by 8 non-founder accounts (two of them students) with 71 participants.

---

## 8. Scorecard: the v1 recommendations

| # | v1 recommendation | Status 26 Oct | Evidence |
|---|---|---|---|
| 1 | Default negative marks to 0 | ✅ Fixed | Negative scores 12.4% → 0.6%; remaining negatives come from the paper's own stated scheme |
| 2 | Remove "If above link doesn't work" | ✅ Fixed | `shareUtils.ts` comment explains why; one link |
| 3 | Real toast on desktop Share | ✅ Fixed | No `window.toast` reads remain |
| 4 | Real crawler meta for `/join` and `/test` | ✅ Fixed and live | Probe 26 Oct: exam title + instruction, institute logo or neutral tile |
| 5 | Settings defaults on every save | 🟡 Partial | Empty settings 61% → 37% (49 of 132) |
| 6 | Post-save send screen | 🟡 Replaced | Built, then removed at your request. Replaced by 6.5 s card glow, 2-step coach, NextStepCard with the real message, scan-to-share QR. Post-save still lands on `/my-tests` |
| 7 | Transactional email | 🔴 Built, off | 0 emails ever; SMTP not configured |
| 8 | Gradebook export | ✅ Fixed | Excel export in results |
| 9 | Sidebar 11 → 5 | 🟡 Partial | 10 items; Rewards and Materials gone; 4 overlapping test lists remain |
| 10 | Stop seeding the example test | 🔴 Open | 76 seeded since 10 Oct, 9 seeded live |
| 11 | Instrument distribution | 🔴 Open | Only `exam_share_qr_open/send` (2 visitors, 25 Oct, likely your own testing). No event for save, go-live, copy, WhatsApp |
| 12 | Revoke anon EXECUTE on SECURITY DEFINER functions | ⚪ Not re-audited in v2 | — |
| 13 | Reprice for institutes | 🔴 Open | Everything unlocked free (`unlock_all_premium`) |
| 14 | Institute attribution, removable "Powered by" | 🟡 Mixed | Invite and preview now credit the institute; a new "Powered by TestoZa" footer was added to candidate result pages (21 Oct) |
| 15 | Earn one reference customer | ⚪ Not visible in data | You now have 10 repeat conductors to call (Appendix B) |

---

## 9. The ideal: TestoZa for the teacher who conducts exams on paper

Your goal: *India's No. 1 efficient, reliable and simple online testing platform for every educator who conducts exams on paper.* Here is what that means, read from your own data.

### 9.1 What the paper teacher actually does today

- Makes a paper (photocopy, typed in Word, or from a guide book).
- Picks **an occasion**: Saturday weekly test, unit test, monthly test, mock before boards.
- Students write it **in class on paper**, or increasingly **at home** for DPPs and weekly tests.
- The teacher checks 40–200 copies by hand, writes marks in a **register by roll number**, and tells parents.

Your data says TestoZa already wins the **home-written test** (73–83% of Indian class submissions arrive 4 pm–midnight). It has not touched the **in-class paper exam**, because that needs devices in the room.

### 9.2 Seven principles

1. **The unit is an exam occasion, not a test.** "Class 10-B · Unit Test 3 · Sat 10:00" is what the teacher thinks in. Save a test → attach it to an occasion.
2. **Every paper ends with one question: *When does your class write it?*** Three answers: **Now** · **Later** (date and time) · **On paper** (print). Each has its own short path.
3. **Checking the paper is not taking the exam.** "Preview as a student" never creates a result. A student writing on the teacher's phone always does.
4. **The message is the product.** Already true. Keep it a notice from the institute.
5. **Bring the teacher back at the moment of the exam, through channels they already use:**
   - their own WhatsApp ("Message yourself");
   - Google Calendar;
   - email once SMTP exists;
   - browser notification.
6. **Results land in the register.** Roll number, name, marks, rank, absent list, Excel, plus one WhatsApp result per parent. Show what happened on exam day: "38 submitted · 2 had network breaks, answers saved · 1 switched apps 4 times."
7. **No question on screen the teacher can't answer in two seconds.** No slug, no character counter, no "violation limit" before the first send.

### 9.3 The ideal flow (storyboard)

```
Friday 22:40  Upload the paper ── AI types it ── 4 min
                     │
                     ▼
        ┌──────────────────────────────────────────┐
        │  When does your class write it?           │
        │  ( ) Now — get the link                   │
        │  (•) Later — Sat 18 Oct, 10:00 ▾ 30 min ▾  │
        │  ( ) On paper — print paper + answer key  │
        │                                            │
        │  Who's it from?  [ Sharma Classes      ]   │
        │  [ Preview as a student — won't count ]    │
        │                          [ Done ]          │
        └──────────────────────────────────────────┘
                     │ Later
                     ▼
        Message ready (with date) ──► [ Send to my WhatsApp ]  (Message yourself)
                                  ──► [ Add to Google Calendar ]  (event has the link)
                                  ──► [ Post in class group now ]

Saturday 09:30  Calendar ping + dashboard: "Unit Test 3 opens in 30 min.
                Forward the message you saved." ──► WhatsApp forward (2 taps)
Saturday 10:00  Opens. "Writing now: 31 · Submitted: 0"
Saturday 10:45  "38 of 41 submitted. 3 absent: Rohit, Neha, Aman."
                [ Excel ] [ Send each parent their result ]
```

### 9.4 The bet worth validating: "On paper" that still ends in TestoZa marks

For teachers who *must* conduct in class on paper (most government schools, younger classes):

- print the AI-made paper with a bubble answer sheet;
- photograph the sheets on the teacher's phone after class;
- marks land in the same results and register.

This is the literal bridge for "educators who conduct exams on paper": TestoZa becomes the tool for *every* exam, not only the ones written on phones. PDF export already exists (`pdf_export` event). OMR capture is new and non-trivial. **Validate with five phone calls before building** (Appendix B, stalled teachers).

---

## 10. What to do, ranked by impact ÷ effort

### This week — small, on the critical path

| # | Do | Where | Why (theme) | Impact | Effort |
|---|---|---|---|---|---|
| 1 | **"Who is writing?" gate.** When the creator opens their own live link: *"Just checking — won't count"* or *"A student on this phone — counts as a candidate"*. Count creator attempts whose start-form name differs from the creator's name as candidate results on the dashboard. | `TestIntroPage` (conduct link + `user.id === created_by`); `teacherDashboardApi.ts:314`; `AllSubmissionsPage.tsx:91`; `NextStepCard.tsx:46–48` copy | Fixes both the rehearsal pollution and the Mansi problem (T2) | High | S–M |
| 2 | **Kill the 180-minute default.** Duration = number of questions × 1 min unless the paper states a time; same rule as `marking.py`. | `pdf_vision_pipeline.py:339, :388, :2094`; `tests/write.py:399` | T4 | Med–High | S |
| 3 | **Rewrite the go-live dialog in teacher words.** Drop "Secure Slug", "12c", "Regenerate" and the amber warning. One line: *"Only people with this link can open it. You can stop it any time."* No copy before live. | `ConductExamDialog.tsx` | T4 | Med | S |
| 4 | **Readable links for Hindi titles.** Transliterate, or fall back to a short readable form (`/e/482913` or the join-code page). | slug generator (`generateConductSlug`) | T4 | Med | S |
| 5 | **Send tab-switch counts on submit.** Store them, show them in results. | `TestPage.tsx` submit payload; `attempts.py:391/404` | T6 | Med | S |
| 6 | **Instrument the six events that run the company.** `test_saved`, `exam_started`, `preview_opened`, `invite_copied`, `whatsapp_clicked`, `first_candidate`. | analytics client | You cannot see the stall without them | High (enabling) | S |
| 7 | **Answer support the same day, and show question reports to the educator during a live exam.** | Admin Support; live card / results sheet | T6 | Med | S |

### This month — close the "Monday" gap

| # | Do | Why | Impact | Effort |
|---|---|---|---|---|
| 8 | **"When does your class write it?" — Now / Later / On paper**, as the go-live choice. Later = schedule in-flow with date in the message. | T1, T3 | **Highest** | M |
| 9 | **Zero-SMTP reminders:** *Send to my WhatsApp* (wa.me share; teacher picks "You"), *Add to Google Calendar* (event body = invite text + link), and an "opens in 30 min — forward now" state on `/dashboard`. | T3 | High | S–M |
| 10 | **Switch on email** as soon as SES or Brevo lands: first submission, "opens in 1 hour", results ready. | T3, v1 #7 | High | S (code exists) |
| 11 | **Fork by role after save.** Students: *Start practising*, *Share with friends*, no Conduct tile; excluded from educator metrics. Teachers: the conduct choice from #8. | T7, §3 | Med | S–M |
| 12 | **Ask "What's your institute or class called?" once** and prefill the message and preview. Conductors set an institute name 5 of 13 times, non-conductors 2 of 25. Correlation, but it's also a commitment device. | T1 | Med | S |
| 13 | **Stop seeding the example test** (or never live, labelled SAMPLE). | §3 | Med | S |
| 14 | **Coach order: Copy first, Settings optional.** Your call; you asked for Settings first. Re-decide once event #6 data exists. | T3 | Med | S |
| 15 | **Admin "educator funnel" tile:** new educators → first live → first class ≥5 → second exam, with students, candidates and examples removed. | §3 | Med | S |

### This quarter — bets

| # | Bet | Why | Validate first by |
|---|---|---|---|
| 16 | **"On paper" mode:** print + photograph answer sheets → marks in TestoZa | §9.4, your stated market | 5 calls to stalled + govt-school teachers |
| 17 | **Position as "tonight's home test, marked by morning"** for coaching and schools, with parent WhatsApp results | §2.6 (73–83% evening) | Homepage/ads copy test; ChatGPT landing pages |
| 18 | **Own the ChatGPT channel deliberately:** make `/`, `/generate-with-ai` and `/ai-test-generator` speak to class exams; give students their own landing | T7 | Watch utm_source=chatgpt.com conversions by role |
| 19 | **Commercial story for institutes** (v1 #13–14): paid white-label removes "Powered by" | v1 §6 | 3 conductor calls: "what would you pay for?" |

---

## 11. The numbers to run on from now

| Metric | Definition | Today |
|---|---|---:|
| **North star: first real class exam within 7 days** | New educators (Teacher/Institution, excluding aspirant titles) with ≥5 outside candidates within 7 days of first test | **34%** (13 of 38, 10–26 Oct) |
| Second exam within 14 days | Of those, a second test with ≥3 candidates | ~59% all-time (10 of 17) |
| Same-session send rate | First outside candidate within 2 h of first test | 6 of 23 Indian new educators |
| Scheduled share | Live exams created with a future start | 5 of 132 tests |
| Rehearsal noise | Guest results within 20 min of creation with ≤10% answered, or named like the creator | ≥7 creators since 10 Oct |
| Exam-day health | Submitted ÷ started, blank %, question reports per exam | 74%, 2.6%, 19 on one exam |

Report these weekly, educators only. Don't report "new users".

---

## 12. What we still don't know

1. **Why the 8 stalled teachers didn't send.** Was it a future exam (my reading), students without phones, school policy, or doubt? Only a call answers this. They're named in Appendix B.
2. **How many students in Indian classes can write at home on a phone** on a given evening. It decides whether "On paper" mode (#16) is the bigger market.
3. **Whether the Settings-first coach helps or hurts.** No events exist to tell (#6).
4. **Whether the 25 Oct image move fixed picture questions on slow phones.** Q47-style questions need one real-phone check on 3G.
5. **Whether ChatGPT students carry TestoZa into their coaching institutes.** nikita pande chose "Student" and ran 64 candidates, so some do.

---

## 13. The one-sentence answer

> **You fixed the last ten seconds, and one in three new educators now runs a real class exam: the teachers whose class is waiting right now get through in under half an hour and come back for a second exam. The ones who don't are mostly not your customers (students, aspirants, people abroad), plus about eight real teachers a fortnight who build the paper tonight for Monday's class and lose it overnight, because TestoZa never asks "when does your class write it?", never reminds them, and tells the ones whose students wrote on their phone that nobody did.**

---

## Appendix A — Evidence index

| Claim | Source |
|---|---|
| 88 real creators; 14 with ≥10 outside candidates; max 435 | `tests` × `user_tests`, team, demo, examples and `@guest` excluded |
| New-educator funnel 38 → 27 → 25 → 13 → 11 → 8; median 0.49 h | Same, `designation in (Teacher, Institution)`, first test ≥ 10 Oct |
| Weekly cohorts 2/21 → 6/16 → 7/18 | Same, grouped by week of first test |
| 361 sign-ups, 284 with no role, 213 only took others' tests | `profiles` since 10 Oct × `tests` × `user_tests` |
| 212 no-role sign-ups on 22 Oct; Ompriya's assessment candidates on gmail + dragarwal.com | `profiles` by IST day; taker email domains on that test |
| Students 16 vs educators 9 on 23–26 Oct | `profiles.designation` by IST day |
| ChatGPT: 101 visitors, 50 accounts; #1 for Indian builder visitors (66) | `analytics_sessions.utm_source = 'chatgpt.com'`; first-session channel per user |
| Indian builder funnel 152 → 88 → 47 → 33 → 14 | `analytics_pageviews` × `analytics_visitors` × `tests` (visitor level; one person on two devices counts twice) |
| 6 of 8 Indian conductors within 1 h | `min(user_tests.created_at) − min(tests.created_at)` per educator |
| 83% / 73% evening submissions | `user_tests.created_at` in IST, Indian class exams since 8 Oct |
| 1,185 starts → 880 submitted; 206 of 295 drops at one institute | `test_registrations` × `user_tests` since 17 Oct |
| Blank 2.6%, negative 0.6%, violations 0 | `user_tests` since 17 Oct |
| 10 of 17 conductors ran ≥2 class tests | per-test outside candidates ≥3 |
| Rehearsal names "R", "neme", "rahul", "j" | `user_tests.metadata.startFormData` on guest results ≤16 min after creation |
| Self-attempts named MANSI, Bharti, Ria, Kailash Chandra Gandas | `startFormData` on attempts where `user_id = created_by` |
| Dashboard drops creator attempts; "tried it yourself" copy | `teacherDashboardApi.ts:314–317`, `NextStepCard.tsx:46–48`, `AllSubmissionsPage.tsx:91` |
| 180-minute default | `pdf_vision_pipeline.py:339, 388, 2094`; `tests/write.py:399`; 14 tests at 180 min averaging 21 Q |
| Hindi slugs `--10--2-…` | 14 of 132 new slugs contain `--` |
| Go-live dialog wording | `ConductExamDialog.tsx:99–141` |
| Coach goes to Settings first | `UserTestManager.tsx:647–648` |
| Schedule on 5 of 132; class on 0 of 132 | `tests.settings.schedule.enabled`, `tests.class_id` since 10 Oct |
| 0 emails | `email_sends` = 0 rows; SMTP not configured |
| Violations only on progress pings | `TestPage.tsx:745`; `attempts.py:391, 404` |
| Q47 reported 19 times | `question_reports` since 10 Oct; picture question on "Externs Online Assessment" |
| Only real support message | `support_messages` (Malarvizhi R, 15 Oct); no row in `support_replies` |
| Example tests seeded 76, 9 live | `tests.settings.is_user_example` since 10 Oct |
| Institute name 5/13 vs 2/25 | `tests.institution_name` per educator |
| Previews fixed | `curl -A "WhatsApp/2.23.20.0 A"` on `/test/…` and `/join/…`, 26 Oct |
| Students go to `/history`; save goes to `/my-tests` | `App.tsx:183–193`; `TestBuilder.tsx:1210`; `AITestImporter.tsx:1480` |

**Limits:**
- Roles are self-chosen. "Takers" include the teacher's own guest checks, which is why ≥5 is used as the "real class" line.
- Some users have no linked analytics sessions.
- The window is 16 days with small numbers per week.
- One Nigerian institute dominates candidate-side totals.
- Security was not re-audited for v2.

## Appendix B — People to call this week

**Repeat conductors (become your references):**

| Who | Signal | Last seen |
|---|---|---|
| **Govt Sr. Secondary School Dhani Panchera** (`gssdhanipanchera@`) | A government school. 6 tests, 17 candidates over 8 days, Hindi-medium, in school hours. **Your "paper exam" customer in its purest form.** | 25 Oct |
| **Payal Saini Notes** (`mahendranehra9950@`) | 4 free tests on 4 days, 59 candidates from Instagram. A creator-educator with an audience. | 25 Oct |
| **Aswini** (`aswinism006@`) | 3 tests over 11 days, 29 candidates, uses Batches. | 25 Oct |
| **Malarvizhi R** (`malarvizhi3010@`) | ICSE Class 9–10 Maths, 3 tests, 13 candidates. Wrote the only real support message. Call and apologise. | 24 Oct |
| **Lone Reyaz** (`lonereyaz2010@`) | Class 11–12 Political Science, 25 candidates via the public link (never went "live"). | 26 Oct |
| **Vedprakash Pradhan** (`vedprakashpradhan29@`) | NEET Chemical Kinetics, 14 candidates, all in school hours. | 24 Oct |
| **Ompriya** (`ompriya.daio@`) | 207-candidate eye-hospital extern assessment. Ask about Q47. | 23 Oct |

**Stalled classroom teachers (ask "why didn't you send it?"):** santigopal, Rajasar Bikan, Anish Khan, Swayam patidar, STALIN SHELLY, Priya Thomas, Beema Jinas, Dinesh Chander.

**Home tutors (ask "who wrote the test on your phone?"):** Surendra Kaswan (`manshikaswan@`), Poonam (`poonmbhatia41@`).
