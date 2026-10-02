# Live exams with a join code (exam sessions)

**Date:** 2 October 2026
**Plan it implements:** [plans/live-exam-join-code-and-educator-needs.md](../plans/live-exam-join-code-and-educator-needs.md), Phases A–D plus the answer-key quick fix
**User guide:** `/user-guide/live-exam-sessions` ([LiveExamSessionsGuide.tsx](../frontend/src/components/docs/LiveExamSessionsGuide.tsx))
**Status:** built and tested locally. **Not deployed. The SQL migration has not been run.**

---

## What it does

A teacher gives one paper (a `tests` row) to a batch as an **exam session**, a "sitting":
- The sitting has its own **6-digit join code**, time window, check-in rule and rank list.
- The same paper can be sat many times. For example, Batch A on Monday and Batch B on Thursday, each with separate results.

Students open **testoza.com/join** (or scan the QR code / tap `testoza.com/j/<code>`). They:
1. type the code;
2. check in with their **name**, **roll number**, or **roll number + 4-digit PIN**;
3. wait in a lobby;
4. sit the paper on the normal exam screen.

They never create an account.

## Rollout

Do the steps in this order.

1. **Run the SQL** in the Supabase SQL editor: [supabase/migrations/20261002120000_exam_sessions.sql](../supabase/migrations/20261002120000_exam_sessions.sql).
   - It is idempotent.
   - It adds `roster_students`, `exam_sessions` and `session_participants`.
   - It adds `user_tests.session_id` and `user_tests.participant_id`, with a unique index: one attempt per participant.
   - The new tables are backend-only: RLS on, no policies, no anon/authenticated grants.
2. **Set `EXAM_PIN_PEPPER`** on the backend: a long random string, kept forever.
   - Without it, the pepper is derived from `SUPABASE_SERVICE_KEY`.
   - That means rotating the service key would invalidate every PIN already handed out.
   - Set it **before** any teacher makes PINs.
3. **Deploy the backend.** New routers:
   - `/api/exam-sessions` (teacher)
   - `/api/join` (student)
   - `/api/batches` (roster and PINs)
   - session submission inside `POST /api/attempts/save`
4. **Deploy the frontend.** If the backend is still old, the dashboard's "Your exams" card stays hidden. `/join` and `/exams` need the new backend.
5. **Check:**
   - `select relname, relrowsecurity from pg_class where relname in ('exam_sessions','session_participants','roster_students');` — all should show `true`.
   - Run a sitting end to end with two phones.

## Where things are

| Piece | File |
|---|---|
| Rules (clock, deadlines, codes, PIN hashing, ranking), no DB | [backend/app/services/exam_sessions.py](../backend/app/services/exam_sessions.py) |
| Data access shared by all routes (token lookup, submit, collect) | [backend/app/services/exam_session_store.py](../backend/app/services/exam_session_store.py) |
| Teacher API | [backend/app/routers/exam_sessions.py](../backend/app/routers/exam_sessions.py) |
| Student API | [backend/app/routers/join.py](../backend/app/routers/join.py) |
| Batches, roster, PINs | [backend/app/routers/batches.py](../backend/app/routers/batches.py) |
| Session submission | `_save_session_attempt` in [backend/app/routers/attempts.py](../backend/app/routers/attempts.py) |
| Section/topic marks for report cards | `breakdown_attempt` in [backend/app/services/scoring.py](../backend/app/services/scoring.py) |
| Tests (13; in-memory Supabase stand-in) | [backend/tests/](../backend/tests/) — run `python -m pytest tests -q` from `backend/` |
| Frontend API + student device token | [frontend/src/lib/examSessionsApi.ts](../frontend/src/lib/examSessionsApi.ts) |
| Student flow `/join`, `/join/:code` | [frontend/src/pages/join/JoinPage.tsx](../frontend/src/pages/join/JoinPage.tsx) |
| Exam screen in session mode `/join/:code/exam` | [frontend/src/pages/TestPage.tsx](../frontend/src/pages/TestPage.tsx) (`examSeat`) |
| Teacher pages | [frontend/src/pages/exams/](../frontend/src/pages/exams/): Exams, exam room, projector, report cards, Batches, batch, PIN slips |
| Shared exam UI | [frontend/src/components/exams/](../frontend/src/components/exams/) (iOS sheet, digit boxes, QR, monitor, results) |

## Rules worth knowing

### Clock
- The lobby opens 30 minutes before `opens_at`.
- **auto** start: the sitting goes live at `opens_at`.
- **manual** start: it goes live when the teacher taps Start.
- New students can join until start + `late_entry_minutes`. Existing participants can always rejoin until `closes_at`.
- Each student's deadline is the earlier of:
  - their own start + paper duration + extra minutes;
  - `closes_at` + extra minutes.
- Every countdown uses the server's time (phones' clocks are wrong).

### Identity
- `identity_key` is `roll:<roll_key>` or `name:<lower name>`. It is unique per sitting.
- Joining again on another device issues a new device token. The old token gets `409 device_replaced`.
- Name mode refuses a second, online person using the same name (`name_taken`).
- A student who has already submitted can only get back in from the same device, or with their PIN.

### PINs
- 4 digits, PBKDF2 with a salt plus the pepper.
- Shown once (PIN slips page). There is no "view PIN", only "New PIN".
- At most 8 PIN tries per student per 10 minutes.

### Submission
- Goes through `POST /api/attempts/save` with an `X-Exam-Token` header.
- The server takes the identity from the token and scores the attempt itself.
- It is idempotent: a retry returns the same attempt, and the unique index blocks doubles.
- Submissions up to 15 minutes after the deadline are accepted and flagged `late_by_seconds`. Later than that returns `time_over`.

### Nothing lost
- A heartbeat runs every 20 s and saves `answers_draft`.
- The teacher's "End exam" files drafts of students who started but never submitted. Results do the same once the sitting has ended (`collected_by_teacher`).
- A dead phone continues on another device from that draft.

### Results release
- Options: `on_end` (default), `immediate` or `manual`.
- Students in a sitting never receive the answer key.
- Their result view shows marks, rank, section marks and topics only after release.

### Attempts stay compatible
Session attempts carry `metadata.conduct_exam = true` and a `startFormData` of `{Name, Roll Number, Batch}`, so:
- the existing Results panel works;
- the existing Excel export works;
- the dashboard counts them.

## Also changed in this work
- **Answer-key quick fix.** On a test with a schedule, a candidate who has submitted no longer gets `correctAnswer` / solutions / the full result until the schedule's end time. See `exam_window_still_open` in `routers/tests/utils.py`, used by `tests/read.py`, `solutions.py` and `results.py`.
- **Onboarding** now offers **Student**: no creator tools, lands on Test History.
- **Navigation:** sidebar entries **Exams** and **Batches**.
- **Dashboard:** "Your exams" card, plus "Give with a join code" in each test's menu.
- The old Conduct link is unchanged and still works.

## Not done / next
- PDF report cards are generated by the browser's print-to-PDF ("Print or save as PDF"). There is no server-side PDF.
- Parent messages open WhatsApp with the text filled in (`wa.me`). Nothing is sent automatically.
- The live monitor polls every 4 s. If very large sittings (500+) become common, switch to Supabase Realtime.
- Codes are 6 digits: 1 in a million, rate-limited to 60 lookups per IP per minute. Joining still needs the check-in step.
