# Live Exam Join Code & What Educators Need

**Status:** Proposal. Nothing in this file is built yet. Read it, then decide.
**Date:** 24 September 2026
**Covers:**
- **Part 2**: your idea of a test-ID + password page at `testoza.com/live`
- **Part 3**: what an institute owner actually wants from TestoZa

Part 1 (the dashboard split) is already done. See section 0.

**How to read this:** Section 0 is context. Part 2 is the join-code idea in detail. Part 3 is educator needs. The last two sections tell you what to do next and which decisions are yours.

---

## Short version

1. **Build the short code, but skip the shared password.** A 6-digit code written on the board makes joining easy. A password shared by the whole batch adds almost no security. It will be in the WhatsApp group within a minute.
2. **The real problem is identity, not access.** Today TestoZa cannot reliably tell *which* student took a test. It also cannot stop a guest from attempting twice (details in 2.4).
3. **Give each student their own login inside the exam.** Use roll number + PIN (or date of birth), from a student list the institute uploads. This is how JEE/NEET computer-based tests work, so students already know it. It also makes your mocks feel like the real exam.
4. **Attach the code to an "exam session", not to the test.** The question paper and the sitting are different things. Batch A on Monday and Batch B on Thursday are two sessions of the same paper. Each has its own code, time window and result sheet.
5. **Use `testoza.com/join`, not `/live`.** `/live/:id` is already your exam-taking page.
6. **What institutes will pay for** is a result they can show parents: a rank list per batch, an Excel sheet, and a PDF report card with their logo.

---

## 0. Where things stand

### Part 1: done
- `/dashboard` is now the educator workspace only (Teacher, Institution and admin accounts).
- Every other logged-in user goes to **Test History** (`/history`). That covers Student, Other, Guest and users who never finished onboarding. The page now has the "paste a test link" box at the top.
- Logged-out visitors on `/dashboard` see the sign-in prompt.
- Logged-out visitors who land on `app.testoza.com/` go to `/explore` instead of the sign-in prompt. For example, guest students clicking "Home" after an exam.
- The old browse page (`TestList`) moved to **`/explore`**. The full searchable catalogue is still at `/more-tests`.

**One decision left from Part 1: the "Other" option in onboarding.**
- Onboarding offers only *Teacher / Institution / Other*. There is no "Student" option.
- So students who sign up pick "Other". All 4 current "Other" accounts only take tests; none has created one.
- That is why "Other" now goes to Test History.
- But onboarding also marks "Other" as a creator (`is_creator = true`).
- If you expect real educators (tutors, trainers, content creators) to pick "Other", do one of these:
  - **(a)** add a "Student" option to onboarding (recommended), or
  - **(b)** send "Other" to the dashboard.

### The numbers behind this plan
Taken from the production database on 24 Sep 2026.

| Signal | Number | What it means |
|---|---|---|
| Views of the browse/category pages, last 90 days | **22** | Students don't browse. |
| Views of test intro pages (`/test/*`) / exam pages (`/live/*`), last 90 days | 626 / 301 | Students arrive through a link someone sent them. |
| Tests with "Require Candidate Login" turned on | **0 of 186** | Educators don't want to make students sign up. |
| Tests with "Start Form" (asks for a name) | 35 | Educators *do* want to know who took the test. |
| Creators who ever had *someone else* take their test | **11** (100 attempts) | The "run a real exam" loop is barely used yet. |
| Attempts from your own admin account | 96 of 225 | Almost half of all attempts are you testing. |
| Tests that used Conduct Exam | 9 tests, 12 attempts | |

### What already exists for conducting exams
Before designing anything new, here is what you already have. Several parts can be reused.

| Feature | Where | Notes |
|---|---|---|
| Conduct Exam (private link) | [ConductExamDialog.tsx](../frontend/src/components/ConductExamDialog.tsx) | Link looks like `/test/<title>-<8 random chars>`. It is stored inside the test's settings (`settings.conduct_exam.slug`), so each test has **one** live link. |
| Scheduled access (start/end time) + waiting room with countdown | [TestSettingsPanel.tsx](../frontend/src/components/TestSettingsPanel.tsx), [TestIntroPage.tsx](../frontend/src/pages/TestIntroPage.tsx) | Works today. |
| Require candidate login | TestSettingsPanel | Used on 0 tests. |
| Single attempt | TestSettingsPanel | **Not really enforced** (see 2.4). |
| Start Form (name + custom fields) | TestSettingsPanel | Free text typed by the student. |
| Proctoring (full screen, tab switch, copy/paste, strike limit) | TestSettingsPanel | Violations are saved on each attempt (`violation_log`, `violation_count`). |
| Hide results until released | `show_results_immediate` | Default is **show immediately**. Hiding only works when Start Form is on. |
| Assign to class | TestSettingsPanel | 6 classes exist. A class is only a name; it has **no student list**. |
| In-progress tracking | `test_registrations` table | Stores started, status, completion %, last active. This is a good base for a live monitor. |
| Results table + Rank Mode + Excel export | [TestResultsPanel.tsx](../frontend/src/components/TestResultsPanel.tsx) | Already good. |
| Full analysis CSV export + print | [FullTestAnalysisPage.tsx](../frontend/src/pages/FullTestAnalysisPage.tsx) | |
| Two-paper exams with a break | Combined sessions | |

**Missing:**
- a short join code
- a student list (roster)
- a login for each student
- a live monitor during the exam
- extra time / force submit
- a PDF report card for parents
- running one paper for several batches with separate results

---

## Part 2: The test-ID + password idea

### 2.1 Your idea
When a test is live, TestoZa generates a test-ID and a simple password. The student opens `testoza.com/live`, types both, and starts the test.

### 2.2 The problem with a shared password
Walk through a real exam morning:

```
 9:58  Teacher writes on the board:   Test ID 4821    Password: mango
 9:59  One student sends a photo of the board to the batch WhatsApp group
10:00  A friend in another batch (or another coaching centre) gets the photo
10:01  Anyone with the photo can enter the exam
```

A password that everybody knows is not a secret.
- It only keeps out **strangers who don't have the link**.
- Your Conduct link already does that. It ends in 8 random characters (about 2.8 trillion possibilities), so nobody finds it by guessing.

Here is what institutes are actually afraid of, and whether a shared password helps:

| What the educator worries about | Does a shared password help? | What actually solves it |
|---|---|---|
| Random outsiders taking the test | Barely, because the link is already secret | A link or code that only works during the exam |
| "Who is this 'Rahul'?" | No | A login for each student from the institute's own list |
| The same student attempting twice | No | One attempt per roll number, **checked on the server** |
| Someone else sits the test for a student | No | A PIN or DOB per student; the live monitor shows who joined |
| A student starts late, after the window | No | Start and end times enforced on the server |
| Early finishers share the answers | No | Don't release answers until the exam has ended for everyone |

### 2.3 What the short code *is* good for: typing
Nobody can copy `testoza.com/test/physics-mock-test-3-k9x2m7qa` from a whiteboard, or type it on a computer-lab keyboard in a hurry. `testoza.com/join` + `482913` takes five seconds. Kahoot works the same way with its game PIN. The code is worth building for this reason alone.

**One caution.** A 6-digit code has only 1 million possibilities, so it is **easier to guess** than your current link. The code must:
- work only while its exam is open, and stop working once it ends;
- be rate-limited, for example at most ~10 wrong tries per minute per device/IP;
- for serious exams, be followed by a second step that says *which student* this is (2.5, Concept 3).

### 2.4 The real problem: TestoZa can't tell students apart
I found these while reading the code. They are the main reason identity matters more than a password.

1. **Guests get a random ID from the browser tab.** [TestIntroPage.tsx:403-410](../frontend/src/pages/TestIntroPage.tsx#L403-L410) creates it with `crypto.randomUUID()` and stores it in `sessionStorage`.
   - A new tab, an incognito window or another phone counts as a new person.
2. **"Single Attempt" is only checked for logged-in students, and only in the browser.**
   - [TestIntroPage.tsx:199-208](../frontend/src/pages/TestIntroPage.tsx#L199-L208) returns early for guests (`if (!user) return;`).
   - I found no check on the server.
   - No test uses "Require login", so **single attempt doesn't apply to most of your test-takers today.**
3. **The Start Form name is free text.** "Rahul", "rahul k", "RK" or a fake name all end up as different people in the results.
4. **The answer key can leak during the exam.**
   - The backend gives the answer key and solutions to any logged-in candidate who has already submitted. See `get_test_solutions` in [solutions.py](../backend/app/routers/solutions.py) and the "C4" rule in [tests/read.py](../backend/app/routers/tests/read.py).
   - It does **not** check whether the exam's end time has passed.
   - So a student who submits at 10:15 could share answers with students who are still writing until 11:00.
   - Results are also shown right after submission by default (`show_results_immediate: true`).

### 2.5 The recommended design
It is built from four ideas.

#### Concept 1: an Exam Session separates the paper from the sitting
**Today:** Conduct Exam saves one link inside the test itself. Regenerating it replaces the old link. So one paper has one live link and one pile of results.

**How institutes actually work:**

```
Paper: "Physics Mock 3"   (questions, marks, sections — written once)
 ├── Session 1: Batch A (Morning)    Mon 10:00–11:00   code 482913   38 students
 ├── Session 2: Batch B (Evening)    Mon 17:00–18:00   code 175260   42 students
 └── Session 3: Re-test (absentees)  Thu 10:00–11:00   code 903418    6 students
```

Each **session** has its own code, time window, student list, results and rank list. The **paper** stays one.

What a session would hold:

| Field | Example | Why it's needed |
|---|---|---|
| test | Physics Mock 3 | Which paper |
| name | Batch A (Morning) | Shown on results and report cards |
| join code | 482913 | Typed at `/join` |
| start / end time | 10:00 / 11:00 | Enforced on the server, not the phone |
| late entry until | 10:15 | No new entries after this |
| start mode | automatic at start time, or teacher presses **Start** | See Concept 4 |
| identity level | name / roll number / roll number + PIN | How strict the entry is (Concept 3) |
| student list | Batch A roster | Who is allowed in |
| results release | when the session ends, or manually | Stops the answer leak from 2.4 |
| status | draft → open → live → ended | |

> If you put the code and password on the **test** instead of a session, you will rebuild it within a few months. The first institute that asks "can I give the same paper to my second batch?" will force it.

#### Concept 2: the join code
- **6 digits.** Easy on a phone keypad, with no confusion between O/0 or I/1.
- **Unique among sessions that are currently open.** The same number can be reused after a session ends.
- **Show it big on the teacher's screen** so it can be projected. Add a **QR code** and a direct link (`testoza.com/j/482913`) for WhatsApp.
- **Works only while the session is open.** After that, the code is dead.
- **Rate-limited** against guessing.

#### Concept 3: student identity, with three levels the teacher picks per session

| Level | Student types | Good for | Weakness |
|---|---|---|---|
| **L0: Name** | code + name | Quick class quiz | Fake names, duplicates |
| **L1: Roll number** | code + roll number (name fills in from the list) | Weekly tests | A friend can type your roll number |
| **L2: Roll number + PIN** (or DOB) | code + roll number + 4-digit PIN | Monthly mocks, anything that goes to parents | Teacher has to hand out PINs (printed slip or WhatsApp) |

**L2 is how JEE/NEET computer-based tests work** (application number + password/DOB). Students already know it, and your mock feels like the real exam. That is a real selling point for coaching institutes.

**How the student list (roster) works:**
- The institute uploads an Excel/CSV file with these columns: Roll No, Name, Batch, and optionally Parent phone and DOB.
- TestoZa generates a PIN for each student and makes printable slips.
- The same list is reused for every session.
- Your existing **classes** feature could grow into this. Today a class is just a name; it would also hold its students.

**What this gives you:**
- No student account, email or OTP.
- One roll number = one attempt, enforced on the server.
- Results come out with correct roll numbers, with no "rahul123" and no duplicates.

#### Concept 4: waiting room and the teacher's Start button
This does what "reveal the password at start time" was trying to do, but better:
1. Students join early and see: *"Waiting for your teacher to start… 32 of 40 joined."*
2. The teacher sees names appear live and can spot who is missing.
3. The teacher presses **Start**, and everyone's timer starts together.

You already have a waiting room for scheduled exams. This adds a manual Start and a live list of who has joined.

#### Why `/join` and not `/live`
- `/live/:id` is already the page where the exam happens (the route is in `App.tsx`). Reusing the word would confuse the code and your users.
- `/join` also reads as an instruction: "go to testoza.com/join".
- Tell students to use `testoza.com/join` because it is shorter than `app.testoza.com/join`. Today [SubdomainGuard.tsx](../frontend/src/components/SubdomainGuard.tsx) forwards unknown paths from `testoza.com` to `app.testoza.com`. That is fine: the student types the short address and ends up on the right page.

### 2.6 How it would look

**Teacher:**
1. Open a test → **Conduct** → **New session**.
2. Pick the batch (student list), date and time, identity level, and when results are released.
3. See the big code, the QR code and a **Copy WhatsApp message** button.
4. During the exam, watch the live monitor (Part 3, need 4).
5. After the exam, see results for **this session only**: rank list → Excel → PDF report cards.

**Student (L2):**

```
testoza.com/join
┌──────────────────────────────────┐
│  Enter exam code                 │
│  [ 4 8 2 9 1 3 ]      [ Next → ] │
└──────────────────────────────────┘
                ↓
┌──────────────────────────────────┐
│  [logo]  ABC Coaching            │
│  Physics Mock 3 · Batch A        │
│                                  │
│  Roll number   [ 23A017     ]    │
│  PIN           [ ••••       ]    │
│  ✓ Rahul Kumar                   │
│                  [ Enter exam → ]│
└──────────────────────────────────┘
                ↓
   Waiting room → exam (your existing exam page) → submit
                ↓
   "Submitted. Results will be released at 11:00."
```

### 2.7 Edge cases to settle before building
- **Phone dies mid-exam.** The student enters code + roll number + PIN on another device and **continues the same attempt**, not a new one. Only one device is active at a time; the older one is logged out, and the monitor shows it.
- **Two people use the same roll number.** The second is blocked (or the first is kicked out), and the teacher sees an alert.
- **Forgotten PIN.** The teacher resets it from the monitor.
- **Late student.** Allowed until "late entry until". Decide whether they get the remaining session time or the full duration; make it a setting.
- **Power cut for one student.** A **+10 min** button for that student.
- **Absentees.** One click: "Create a re-test session for students who didn't attend."
- **Code guessing.** Rate limit, and codes die when the session ends.
- **Network drop.** Your existing local autosave keeps working. The attempt is tied to the roll number, not a random browser ID.
- **Wrong phone clock.** Many students' phone clocks are off by minutes, so server time is always the one that counts.

### 2.8 Data model sketch
Only a sketch in plain words, to show the shape. Not final SQL.

- **`exam_sessions`**: the fields from the table in Concept 1.
- **`rosters` + `roster_students`**: roll number, name, batch, PIN (stored **hashed**), DOB, parent phone. Or extend `classes` to hold students.
- **`session_participants`**: who joined which session. Links to the roster student, or just a typed name at L0. Also stores the device, the join time, a status (joined / writing / submitted / blocked) and extra minutes.
- **`user_tests`** (existing attempts table): add `session_id` and `participant_id`, so results can be filtered by session.
- **Server rules:**
  - a join code works only while its session is open;
  - one submitted attempt per participant;
  - answers and solutions stay hidden until the release condition is met.

**About PINs:** store them hashed, like passwords. Teachers will lose the slips, so give them **"reset PIN"** rather than "view PIN".

### 2.9 Build it in phases
Each phase is useful on its own. Stop after any phase if the feedback says so.

| Phase | What | Why this order |
|---|---|---|
| **A: Sessions + code** | `exam_sessions`, "New session" in the Conduct flow, `/join` page (code + name or typed roll number), one attempt per session per roll number on the server, results filtered by session, results released after the session ends | Smallest step that fixes the typing problem, the "same paper, two batches" problem and the answer leak |
| **B: Student list + PIN** | Upload Excel, PIN slips, roll number + PIN login, parent phone saved | Real identity (the L2 level) |
| **C: Live monitor + lobby** | Joined / writing / submitted list, manual Start, +time, force submit, reset PIN | Control during the exam |
| **D: Results for parents** | Rank list per session/batch, PDF report card with logo, WhatsApp share | What institutes pay for (Part 3, need 5) |

### 2.10 Decisions for you

| # | Question | My recommendation |
|---|---|---|
| 1 | Page name: `/join`? | Yes. `/live` is taken. |
| 2 | Code format | 6 digits |
| 3 | Default identity level | L0/L1 in Phase A; L2 once student lists exist (Phase B) |
| 4 | Allow joining without a student list (walk-in)? | Yes, at L0/L1 |
| 5 | When results and answers are released for sessions | When the session ends, by default |
| 6 | What happens to today's Conduct link? | Keep it working. Sessions become the new way; move old ones over later. |
| 7 | "Other" in onboarding (from Part 1) | Add a "Student" option |

---

## Part 3: What an institute owner actually wants

Imagine the owner of a coaching institute with 300 students in 6 batches, sitting next to you. They don't care about features. They care about *Sunday's mock test going smoothly and parents being happy on Monday.* Here is what they would ask for, most important first.

### Need 1: students in within 30 seconds, on a cheap phone, with no signup
> "My students have cheap phones and patchy mobile data. Many use a parent's phone. If they need an email or OTP, half of them will be stuck and I will lose 15 minutes of class."

- **Today:** ✅ Guests can take tests without an account; "Require login" is used on 0 tests. ❌ Long links can't be typed in a classroom.
- **Build:**
  - `/join` + code + QR code (Part 2).
  - Test the whole flow on a cheap Android phone on slow mobile data, and measure how long the exam page takes to load.

### Need 2: know exactly which student took the test, matched to their batch list
> "I don't want 'Rahul', 'rahul k' and 'RK'. I want roll number 23A017, Batch A."

- **Today:** ⚠️ The Start Form collects a typed name. Guests are a random browser ID. Single attempt isn't enforced for guests.
- **Build:** a student list (roster) + roll number, then roll number + PIN (Part 2, Concept 3).

### Need 3: no leaks
> "The paper must not be seen before 10:00. And nobody should get the answers while others are still writing."

- **Today:**
  - ✅ Scheduled start/end time, a private Conduct link, and proctoring.
  - ⚠️ The answer key goes to any logged-in candidate who has submitted, even while others are still writing.
  - ⚠️ Results show immediately by default (2.4, point 4).
- **Build:** "release results and answers when the session ends", enforced **on the server** for both the answer key and solutions.
  - This one is small and can be done even before sessions: for tests with a schedule or in conduct mode, don't release answers until the end time.

### Need 4: a live view during the exam
> "Who has joined? Who is still writing? Who is switching tabs? This girl's power went off, can I give her 10 more minutes?"

- **Today:** ❌ No live exam monitor. The dashboard's "Live Activity" widget shows the 5 most recent submissions, not a live exam.
- **Build:**
  - A monitor page per session showing joined / writing / submitted / violations, plus +time, force submit and reset PIN.
  - You already track in-progress attempts in `test_registrations` (started, status, completion %, last active) and violations on each attempt. That is most of the data you need.

### Need 5: results they can show parents
> "After the test I send the rank list to the batch group and call parents of weak students. At the end of the month I give a report card. This is what brings me admissions."

- **Today:**
  - ✅ Results table with **Rank Mode** and **Excel export** (TestResultsPanel).
  - ✅ CSV export and print of the full analysis.
  - ❌ No rank list per batch or session, because results are per test.
  - ❌ No per-student PDF report card with the institute logo.
  - ❌ No "send to parent".
- **Build:**
  - A rank list per session.
  - A **PDF report card** with the logo, score, rank in the batch, section-wise marks, and strong/weak topics. Your behavioural analysis (speed vs accuracy, time traps) is a real differentiator here; no Google Form gives that.
  - A **WhatsApp share** to parents.
- **Why it matters most:** this is what they show parents, and what helps them sell admissions. It is the feature they are most likely to pay for.

### Need 6: reuse one paper for several batches
> "I made one good paper. I want to give it to Batch A today and Batch B tomorrow, and see separate results."

- **Today:** ❌ One Conduct link per test; all results are mixed together.
- **Build:** exam sessions (Part 2, Concept 1).

### What they don't care about
The community feed, followers, news, creator profiles and other people's public tests. These can exist on the platform, but **keep them off the educator's main screen.** On the dashboard they are just noise between the owner and "conduct Sunday's test".

### Summary

| # | Need | Today | Where it's solved |
|---|---|---|---|
| 1 | Join in 30 seconds, no signup | ⚠️ works, but long links | Phase A (`/join` + code) |
| 2 | Know exactly who | ❌ typed names, random guest IDs | Phase B (roster + PIN) |
| 3 | No leaks | ⚠️ answer key released too early | Quick fix now + Phase A |
| 4 | Live view during the exam | ❌ | Phase C |
| 5 | Results for parents | ⚠️ Excel exists, no PDF/batch rank | Phase D |
| 6 | One paper, many batches | ❌ | Phase A (sessions) |

---

## The uncomfortable part

Only **11 creators** have ever had someone else take their test. At this stage, the dashboard layout isn't what holds you back. What matters is whether an educator's **first real exam with 40 students goes smoothly from start to finish.**

Before building Phases B–D:
- Sit with 2–3 of those 11 educators while they run one real exam.
- Note every moment they hesitate, ask a question, or a student gets stuck.
- Fix those first.

To find them, run this in the Supabase SQL editor:

```sql
select p.full_name, p.email, p.designation, count(*) as attempts_by_others
from user_tests ut
join tests t    on t.id = ut.test_id
join profiles p on p.id = t.created_by
where ut.user_id <> t.created_by
group by p.full_name, p.email, p.designation
order by attempts_by_others desc;
```

---

## Suggested order

1. ~~Make `/dashboard` educator-only; send students to their results.~~ **Done.**
2. Watch 2–3 of the 11 active educators run one real exam.
3. **Quick fix:** don't release answers or solutions for scheduled or conduct-mode tests until the end time has passed (Need 3).
4. **Phase A:** exam sessions + `/join` with a short code + name or roll number.
5. **Phase B:** student list upload + roll number + PIN login.
6. **Phase C:** waiting room with a Start button + live monitor.
7. **Phase D:** rank list per batch, PDF report card, share with parents.

---

## Appendix: where the relevant code is

| What | File |
|---|---|
| Routes (`/live/:id` exam page, `/dashboard`, `/explore`, `/history`) | [frontend/src/App.tsx](../frontend/src/App.tsx) |
| Current Conduct link dialog | [ConductExamDialog.tsx](../frontend/src/components/ConductExamDialog.tsx) |
| Saving the Conduct link into test settings (`handleConfirmConduct`) | [TeacherDashboard.tsx:152](../frontend/src/components/dashboard/TeacherDashboard.tsx#L152) |
| Conduct slug generator (`generateConductSlug`) | [testsApi.ts:103](../frontend/src/lib/testsApi.ts#L103) |
| Waiting room, login gate, guest ID, single-attempt check | [TestIntroPage.tsx](../frontend/src/pages/TestIntroPage.tsx) (guest ID ~L403, single attempt ~L199) |
| Exam settings (schedule, login, attempt limit, start form, results release) | [TestSettingsPanel.tsx](../frontend/src/components/TestSettingsPanel.tsx) |
| Results table, Rank Mode, Excel export | [TestResultsPanel.tsx](../frontend/src/components/TestResultsPanel.tsx) (`downloadExcel` ~L260) |
| Dashboard "Live Activity" data | [teacherDashboardApi.ts:251](../frontend/src/lib/teacherDashboardApi.ts#L251) |
| Answer-key release rule | [backend/app/routers/solutions.py](../backend/app/routers/solutions.py) (`get_test_solutions`), [backend/app/routers/tests/read.py](../backend/app/routers/tests/read.py) ("C4" comments) |
| Which paths stay on testoza.com | [SubdomainGuard.tsx](../frontend/src/components/SubdomainGuard.tsx) |
