-- ════════════════════════════════════════════════════════════════════════════
-- Exam sessions, join codes and batch rosters.
-- Design: plans/live-exam-join-code-and-educator-needs.md (Parts 2–3)
-- Docs:   documentation/2026-10-02-live-exam-sessions.md
--
-- One question paper (tests row) can be sat many times. Each sitting is an
-- exam session with its own 6-digit join code, time window, student check-in
-- rule and result sheet. Students are guests: the backend creates one guest
-- auth user per participant, and their attempt is a normal user_tests row that
-- also carries session_id / participant_id.
--
-- Access model (same as analytics v2 / C3): only the FastAPI backend touches
-- the new tables, with the service-role key (BYPASSRLS). RLS is ON with NO
-- policies and anon/authenticated have no privileges. PIN hashes therefore
-- never reach a browser.
--
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Students in a batch ──────────────────────────────────────────────────
-- A batch is an existing `classes` row; this table gives it a student list.
CREATE TABLE IF NOT EXISTS public.roster_students (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id      uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    owner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    roll_no       text NOT NULL,
    -- lower-case, no spaces: "23 A 017" and "23a017" are the same student
    roll_key      text NOT NULL,
    full_name     text NOT NULL,
    parent_phone  text,
    -- 4-digit PIN, salted + peppered PBKDF2 (never stored or returned in clear)
    pin_hash      text,
    pin_set_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT roster_students_roll_unique UNIQUE (class_id, roll_key),
    CONSTRAINT roster_students_roll_len CHECK (char_length(roll_no) BETWEEN 1 AND 40),
    CONSTRAINT roster_students_name_len CHECK (char_length(full_name) BETWEEN 1 AND 120),
    CONSTRAINT roster_students_phone_len CHECK (parent_phone IS NULL OR char_length(parent_phone) <= 20)
);
CREATE INDEX IF NOT EXISTS roster_students_owner_idx ON public.roster_students (owner_id);


-- ─── 2. Exam sessions (one sitting of a paper) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id             uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    owner_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id            uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    -- a re-test for absentees: students who submitted in the parent sitting cannot join
    retest_of           uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
    name                text NOT NULL,
    join_code           text NOT NULL,
    -- the exam starts at opens_at; nobody can write after closes_at
    opens_at            timestamptz NOT NULL,
    closes_at           timestamptz NOT NULL,
    late_entry_minutes  integer NOT NULL DEFAULT 15,
    -- 'auto': starts at opens_at.  'manual': waits for the teacher's Start button.
    start_mode          text NOT NULL DEFAULT 'auto',
    started_at          timestamptz,
    -- 'name' (L0) | 'roll' (L1) | 'roll_pin' (L2)
    identity_mode       text NOT NULL DEFAULT 'name',
    -- students who are not on the batch list may join (name / roll modes only)
    allow_walk_in       boolean NOT NULL DEFAULT true,
    -- 'on_end' | 'immediate' | 'manual'
    results_release     text NOT NULL DEFAULT 'on_end',
    results_released_at timestamptz,
    ended_at            timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exam_sessions_code_format CHECK (join_code ~ '^[0-9]{6}$'),
    CONSTRAINT exam_sessions_window CHECK (closes_at > opens_at),
    CONSTRAINT exam_sessions_late_entry CHECK (late_entry_minutes BETWEEN 0 AND 600),
    CONSTRAINT exam_sessions_start_mode CHECK (start_mode IN ('auto', 'manual')),
    CONSTRAINT exam_sessions_identity_mode CHECK (identity_mode IN ('name', 'roll', 'roll_pin')),
    CONSTRAINT exam_sessions_results_release CHECK (results_release IN ('on_end', 'immediate', 'manual')),
    CONSTRAINT exam_sessions_name_len CHECK (char_length(name) BETWEEN 1 AND 120)
);
-- A code belongs to one open sitting at a time; it can be reused once that sitting has ended.
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_open_code_uidx
    ON public.exam_sessions (join_code) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS exam_sessions_owner_idx ON public.exam_sessions (owner_id, opens_at DESC);
CREATE INDEX IF NOT EXISTS exam_sessions_test_idx ON public.exam_sessions (test_id);


-- ─── 3. Who joined a sitting ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_participants (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    roster_student_id  uuid REFERENCES public.roster_students(id) ON DELETE SET NULL,
    -- "roll:23a017" or "name:rahul kumar": one participant per student per sitting
    identity_key       text NOT NULL,
    display_name       text NOT NULL,
    roll_no            text,
    -- guest auth user that owns this participant's user_tests row
    user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- 'joined' (in the lobby) | 'writing' | 'submitted' | 'removed'
    status             text NOT NULL DEFAULT 'joined',
    -- sha256 of the device token; a new device replaces the old one
    device_token_hash  text,
    device_changes     integer NOT NULL DEFAULT 0,
    joined_at          timestamptz NOT NULL DEFAULT now(),
    started_at         timestamptz,
    last_seen_at       timestamptz,
    answered           integer NOT NULL DEFAULT 0,
    progress           integer NOT NULL DEFAULT 0,
    violations         integer NOT NULL DEFAULT 0,
    extra_minutes      integer NOT NULL DEFAULT 0,
    force_submit_at    timestamptz,
    -- latest answers from the exam screen, so a dead phone can continue on another device
    answers_draft      jsonb,
    submitted_at       timestamptz,
    attempt_id         uuid,
    CONSTRAINT session_participants_identity_unique UNIQUE (session_id, identity_key),
    CONSTRAINT session_participants_status CHECK (status IN ('joined', 'writing', 'submitted', 'removed')),
    CONSTRAINT session_participants_extra CHECK (extra_minutes BETWEEN 0 AND 600),
    CONSTRAINT session_participants_progress CHECK (progress BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS session_participants_session_idx ON public.session_participants (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS session_participants_token_uidx
    ON public.session_participants (device_token_hash) WHERE device_token_hash IS NOT NULL;


-- ─── 4. Attempts know which sitting they belong to ───────────────────────────
ALTER TABLE public.user_tests
    ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.user_tests
    ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.session_participants(id) ON DELETE SET NULL;
-- One submitted attempt per participant, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS user_tests_one_per_participant
    ON public.user_tests (participant_id) WHERE participant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_tests_session_idx
    ON public.user_tests (session_id) WHERE session_id IS NOT NULL;


-- ─── 5. Keep updated_at honest ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.exam_sessions_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS exam_sessions_touch ON public.exam_sessions;
CREATE TRIGGER exam_sessions_touch BEFORE UPDATE ON public.exam_sessions
    FOR EACH ROW EXECUTE FUNCTION public.exam_sessions_touch_updated_at();

DROP TRIGGER IF EXISTS roster_students_touch ON public.roster_students;
CREATE TRIGGER roster_students_touch BEFORE UPDATE ON public.roster_students
    FOR EACH ROW EXECUTE FUNCTION public.exam_sessions_touch_updated_at();


-- ─── 6. Backend-only access ──────────────────────────────────────────────────
ALTER TABLE public.roster_students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.roster_students      FROM anon, authenticated;
REVOKE ALL ON public.exam_sessions        FROM anon, authenticated;
REVOKE ALL ON public.session_participants FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.exam_sessions_touch_updated_at() FROM PUBLIC, anon, authenticated;

COMMIT;
