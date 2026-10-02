"""
Database access for exam sessions, shared by the teacher routes (routers/exam_sessions.py),
the student routes (routers/join.py) and attempt submission (routers/attempts.py).

Every function takes the Supabase client explicitly so tests can pass a fake one.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from app.services import exam_sessions as rules
from app.services.scoring import score_attempt

logger = logging.getLogger(__name__)

SESSION_COLS = (
    "id, test_id, owner_id, class_id, retest_of, name, join_code, opens_at, closes_at, "
    "late_entry_minutes, start_mode, started_at, identity_mode, allow_walk_in, "
    "results_release, results_released_at, ended_at, created_at"
)
PARTICIPANT_COLS = (
    "id, session_id, roster_student_id, identity_key, display_name, roll_no, user_id, status, "
    "device_changes, joined_at, started_at, last_seen_at, answered, progress, violations, "
    "extra_minutes, force_submit_at, submitted_at, attempt_id"
)
# Same columns GET /api/tests/{id} returns, so the exam screen gets the shape it expects.
PAPER_COLS = (
    "id, title, description, created_at, custom_id, duration, revision_notes, is_public, visibility, "
    "created_by, institution_name, institution_logo, institution_color, institution_font, slug, tags, "
    "custom_category, class_id, settings, has_scientific_calculator, enable_section_mode, sections, questions, "
    "section_marking_model, merged_sections, total_max_marks, total_questions"
)
TEST_SUMMARY_COLS = (
    "id, title, duration, total_questions, total_max_marks, settings, institution_name, institution_logo, created_by"
)


class SessionError(HTTPException):
    """HTTPException whose detail carries a machine-readable `code` for the frontend."""

    def __init__(self, status_code: int, code: str, message: str, **extra: Any):
        super().__init__(status_code=status_code, detail={"code": code, "message": message, **extra})


def _first(res: Any) -> Optional[Dict[str, Any]]:
    data = getattr(res, "data", None) or []
    return data[0] if data else None


def is_unique_violation(err: Exception) -> bool:
    code = getattr(err, "code", None)
    return code == "23505" or "23505" in str(err) or "duplicate key" in str(err).lower()


# ── Loading ─────────────────────────────────────────────────────────────────

def load_session(db: Any, session_id: str) -> Dict[str, Any]:
    session = _first(db.table("exam_sessions").select(SESSION_COLS).eq("id", session_id).limit(1).execute())
    if not session:
        raise SessionError(404, "not_found", "This exam session does not exist.")
    return finalize_if_over(db, session)


def finalize_if_over(db: Any, session: Dict[str, Any]) -> Dict[str, Any]:
    """Stamp ended_at once closes_at has passed, which frees the join code for reuse."""
    if session.get("ended_at"):
        return session
    closes_at = rules.parse_ts(session.get("closes_at"))
    if closes_at and rules.now_utc() >= closes_at:
        stamp = rules.iso(closes_at)
        try:
            db.table("exam_sessions").update({"ended_at": stamp}).eq("id", session["id"]).is_("ended_at", "null").execute()
        except Exception as e:  # never block a read on this
            logger.warning(f"exam session {session.get('id')}: could not stamp ended_at: {e}")
        session = {**session, "ended_at": stamp}
    return session


def load_test_summary(db: Any, test_id: str) -> Optional[Dict[str, Any]]:
    return _first(db.table("tests").select(TEST_SUMMARY_COLS).eq("id", test_id).limit(1).execute())


def load_paper(db: Any, test_id: str) -> Dict[str, Any]:
    """The full test INCLUDING the answer key. Strip it before sending to a student."""
    test = _first(db.table("tests").select(PAPER_COLS).eq("id", test_id).limit(1).execute())
    if not test:
        raise SessionError(404, "paper_missing", "The question paper for this exam was deleted.")
    return test


def proctoring_on(test: Dict[str, Any]) -> bool:
    s = (test or {}).get("settings") or {}
    return bool(
        s.get("force_fullscreen")
        or (s.get("tab_switch_mode") and s.get("tab_switch_mode") != "off")
        or s.get("disable_copy_paste")
        or s.get("disable_actions")
        or s.get("block_back_button")
        or s.get("disable_exit_button")
    )


def class_name(db: Any, class_id: Optional[str]) -> Optional[str]:
    if not class_id:
        return None
    row = _first(db.table("classes").select("name").eq("id", class_id).limit(1).execute())
    return row.get("name") if row else None


# ── Student identity ────────────────────────────────────────────────────────

def participant_by_token(db: Any, token: Optional[str]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Resolve the X-Exam-Token header to (participant, session) or raise."""
    if not token or len(token) < 20:
        raise SessionError(401, "no_token", "Please join the exam again with its code.")
    participant = _first(
        db.table("session_participants").select(PARTICIPANT_COLS)
        .eq("device_token_hash", rules.hash_token(token)).limit(1).execute()
    )
    if not participant:
        # Either the token is wrong, or the same student joined on another device since.
        raise SessionError(
            409, "device_replaced",
            "This exam was opened on another device. Continue there, or join again here with the code.",
        )
    if participant.get("status") == "removed":
        raise SessionError(403, "removed", "Your teacher removed you from this exam.")
    session = load_session(db, participant["session_id"])
    return participant, session


def ensure_guest_user(db: Any, user_id: str, display_name: str, session_id: str) -> None:
    """Every attempt row needs an auth.users row (fk_user); students get a guest one."""
    try:
        existing = db.auth.admin.get_user_by_id(user_id)
        if existing and getattr(existing, "user", None):
            return
    except Exception:
        pass
    clean = user_id.replace("-", "")[:12]
    db.auth.admin.create_user({
        "id": user_id,
        "email": f"candidate_{clean}@guest.testoza.com",
        "email_confirm": True,
        "user_metadata": {
            "is_guest_candidate": True,
            "exam_session_id": session_id,
            "startFormData": {"Name": display_name},
        },
    })


# ── Submission ──────────────────────────────────────────────────────────────

def submit_attempt(
    db: Any,
    *,
    session: Dict[str, Any],
    participant: Dict[str, Any],
    test: Dict[str, Any],
    answers: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
    late_seconds: int = 0,
    collected: bool = False,
    completion_percentage: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Score and store one participant's attempt. Idempotent: a retried submission (or a
    race with "collect") returns the attempt that already exists instead of failing.
    """
    if participant.get("attempt_id"):
        existing = _first(db.table("user_tests").select("*").eq("id", participant["attempt_id"]).limit(1).execute())
        if existing:
            return existing

    batch = class_name(db, session.get("class_id"))
    scored = score_attempt(test, answers)
    meta = dict(metadata or {})
    if meta.get("stats") is not None:
        meta["client_reported_stats"] = meta["stats"]
    meta.update({
        "startFormData": rules.startform_for(participant, batch),
        "conduct_exam": True,
        "is_conducted_attempt": True,
        "session_id": session["id"],
        "session_name": session.get("name"),
        "scored_by": "server",
        "stats": {
            "positiveScore": scored["positiveScore"],
            "negativeScore": scored["negativeScore"],
            "correctCount": scored["correctCount"],
            "partialCount": scored["partialCount"],
            "wrongCount": scored["wrongCount"],
            "unattemptedCount": scored["unattemptedCount"],
            "totalQuestions": scored["totalQuestions"],
        },
    })
    if late_seconds > 0:
        meta["late_by_seconds"] = late_seconds
    if collected:
        meta["collected_by_teacher"] = True
    if not meta.get("startedAt") and participant.get("started_at"):
        meta["startedAt"] = participant["started_at"]
    if not meta.get("submittedAt"):
        meta["submittedAt"] = rules.iso(rules.now_utc())

    row = {
        "user_id": participant["user_id"],
        "test_id": test["id"],
        "answers": answers,
        "score": scored["score"],
        "metadata": meta,
        "violation_count": int(participant.get("violations") or 0),
        "session_id": session["id"],
        "participant_id": participant["id"],
    }
    try:
        inserted = _first(db.table("user_tests").insert(row).execute())
    except Exception as e:
        if not is_unique_violation(e):
            raise
        inserted = _first(db.table("user_tests").select("*").eq("participant_id", participant["id"]).limit(1).execute())
        if not inserted:
            raise
    if not inserted:
        raise SessionError(500, "save_failed", "Could not save your answers. Please try again.")

    now = rules.iso(rules.now_utc())
    answered = scored["totalQuestions"] - scored["unattemptedCount"]
    db.table("session_participants").update({
        "status": "submitted",
        "submitted_at": now,
        "attempt_id": inserted["id"],
        "answered": max(0, int(answered)),
        "answers_draft": None,
        "progress": 100 if completion_percentage is None else max(0, min(100, int(completion_percentage))),
    }).eq("id", participant["id"]).execute()
    try:
        db.table("test_registrations").update({
            "status": "submitted",
            "completion_percentage": 100 if completion_percentage is None else completion_percentage,
            "last_active_at": now,
        }).eq("user_id", participant["user_id"]).eq("test_id", test["id"]).neq("status", "submitted").execute()
    except Exception:
        pass
    return inserted


def collect_unsubmitted(db: Any, session: Dict[str, Any], test: Optional[Dict[str, Any]] = None) -> int:
    """
    For students who started but never submitted (dead phone, closed tab, time ran out
    offline), file their last saved answers as their attempt. Returns how many.
    """
    rows = (
        db.table("session_participants").select(PARTICIPANT_COLS + ", answers_draft")
        .eq("session_id", session["id"]).in_("status", ["joined", "writing"]).execute()
    ).data or []
    pending = [p for p in rows if p.get("started_at") and p.get("answers_draft") is not None]
    if not pending:
        return 0
    paper = test if (test and test.get("questions") is not None) else load_paper(db, session["test_id"])
    done = 0
    for participant in pending:
        try:
            submit_attempt(
                db, session=session, participant=participant, test=paper,
                answers=participant.get("answers_draft") or {}, collected=True,
                completion_percentage=participant.get("progress"),
            )
            done += 1
        except Exception as e:
            logger.error(f"collect: participant {participant.get('id')} failed: {e}")
    return done


def participant_counts(db: Any, session_ids: List[str]) -> Dict[str, Dict[str, int]]:
    counts: Dict[str, Dict[str, int]] = {sid: {"joined": 0, "writing": 0, "submitted": 0} for sid in session_ids}
    if not session_ids:
        return counts
    rows = (
        db.table("session_participants").select("session_id, status")
        .in_("session_id", session_ids).neq("status", "removed").limit(20000).execute()
    ).data or []
    for r in rows:
        bucket = counts.setdefault(r["session_id"], {"joined": 0, "writing": 0, "submitted": 0})
        bucket["joined"] += 1
        if r.get("status") in ("writing", "submitted"):
            bucket[r["status"]] += 1
    return counts


def roster_counts(db: Any, class_ids: List[str]) -> Dict[str, Dict[str, int]]:
    out: Dict[str, Dict[str, int]] = {cid: {"students": 0, "with_pin": 0} for cid in class_ids}
    if not class_ids:
        return out
    rows = (
        db.table("roster_students").select("class_id, pin_set_at")
        .in_("class_id", class_ids).limit(20000).execute()
    ).data or []
    for r in rows:
        bucket = out.setdefault(r["class_id"], {"students": 0, "with_pin": 0})
        bucket["students"] += 1
        if r.get("pin_set_at"):
            bucket["with_pin"] += 1
    return out
