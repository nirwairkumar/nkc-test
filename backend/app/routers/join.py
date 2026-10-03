"""
Student side of exam sessions: testoza.com/join.

    GET  /api/join/code/{code}          what exam this code opens (public, rate-limited)
    POST /api/join/code/{code}/enter    check in (name / roll / roll + PIN) -> device token
    GET  /api/join/me                   lobby state                      (X-Exam-Token)
    POST /api/join/me/start             the question paper, answers stripped
    POST /api/join/me/heartbeat         progress + answer draft; returns time / force-submit
    GET  /api/join/me/result            score and rank, once results are released

    GET  /api/join/result/{code}        "See your result": which details to ask for
    POST /api/join/result/{code}        the result for those details, from any device

Submission goes through POST /api/attempts/save with the X-Exam-Token header.
Students never log in: identity comes from the session's check-in rule, and each device
holds a random token (only its SHA-256 is stored). Joining again from another device
moves the exam there and logs the old device out.

"See your result" works after the sitting has ended, when the join code may already
belong to a newer exam, so it looks at every sitting and exam link that has used the
code (newest first) and answers for the first one where the details match.
"""

import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field
from supabase import Client

from app.core.database import get_db
from app.routers.tests.utils import strip_answer_key
from app.services import exam_sessions as rules
from app.services import exam_session_store as store
from app.services.exam_session_store import SessionError
from app.services.scoring import breakdown_attempt
from app.utils.attempt_control import calculate_test_max_marks
from app.utils.safe_route import SafeRoute
from app.utils.rate_limiter import (
    client_ip, enforce_limit, join_enter_per_ip, join_heartbeat_per_token, join_lookup_per_ip,
    join_pin_per_student, join_result_per_ip,
)

logger = logging.getLogger(__name__)
router = APIRouter(route_class=SafeRoute)

MAX_DRAFT_BYTES = 300_000


class EnterRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    roll_no: Optional[str] = Field(default=None, max_length=40)
    pin: Optional[str] = Field(default=None, max_length=8)


class HeartbeatRequest(BaseModel):
    answers: Optional[Dict[str, Any]] = None
    answered: Optional[int] = None
    progress: Optional[int] = None
    violations: Optional[int] = None


class ResultRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    roll_no: Optional[str] = Field(default=None, max_length=40)
    pin: Optional[str] = Field(default=None, max_length=8)
    # Exam links: the start-form answers, by field label.
    fields: Optional[Dict[str, str]] = None


# ── Helpers ─────────────────────────────────────────────────────────────────

def _open_session_by_code(db: Client, code: str) -> Dict[str, Any]:
    if not re.fullmatch(r"\d{6}", code or ""):
        raise SessionError(404, "bad_code", "Exam codes have 6 digits.")
    session = store._first(
        db.table("exam_sessions").select(store.SESSION_COLS)
        .eq("join_code", code).is_("ended_at", "null").limit(1).execute()
    )
    if not session:
        raise SessionError(404, "no_exam", "No exam with this code is open right now. Check the code with your examiner.")
    session = store.finalize_if_over(db, session)
    if rules.session_phase(session) == "ended":
        raise SessionError(410, "ended", "This exam has ended.")
    return session


def _public_info(db: Client, session: Dict[str, Any], test: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    test = test or store.load_test_summary(db, session["test_id"]) or {}
    now = rules.now_utc()
    return {
        "session_id": session["id"],
        "name": session.get("name"),
        "batch": store.class_name(db, session.get("class_id")),
        "test": {
            "title": test.get("title"),
            "duration": test.get("duration"),
            "questions": test.get("total_questions"),
            "max_marks": test.get("total_max_marks"),
            "institution_name": test.get("institution_name"),
            "institution_logo": test.get("institution_logo"),
            "proctoring": store.proctoring_on(test),
        },
        "opens_at": session.get("opens_at"),
        "closes_at": session.get("closes_at"),
        "start_mode": session.get("start_mode"),
        "identity_mode": session.get("identity_mode"),
        "allow_walk_in": bool(session.get("allow_walk_in")),
        "has_roster": bool(session.get("class_id")),
        "results_release": session.get("results_release"),
        "phase": rules.session_phase(session, now),
        "started_at": rules.iso(rules.effective_start(session)) if rules.session_phase(session, now) == "live" else None,
        "late_entry_until": rules.iso(rules.late_entry_until(session)),
        "server_time": rules.iso(now),
    }


def _public_participant(p: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": p["id"],
        "name": p.get("display_name"),
        "roll_no": p.get("roll_no"),
        "status": p.get("status"),
        "started_at": p.get("started_at"),
        "submitted_at": p.get("submitted_at"),
    }


def _issue_token(db: Client, participant: Dict[str, Any], replace_device: bool) -> str:
    token, token_hash = rules.new_device_token()
    patch: Dict[str, Any] = {"device_token_hash": token_hash, "last_seen_at": rules.iso(rules.now_utc())}
    if replace_device:
        patch["device_changes"] = int(participant.get("device_changes") or 0) + 1
    db.table("session_participants").update(patch).eq("id", participant["id"]).execute()
    return token


def _deadline(session: Dict[str, Any], participant: Dict[str, Any], test: Dict[str, Any]):
    return rules.participant_deadline(session, participant, test.get("duration"))


# ── Endpoints ───────────────────────────────────────────────────────────────

def _live_link_by_code(db: Client, code: str) -> Optional[Dict[str, Any]]:
    """A live "Conduct exam" link that the teacher gave a join code (POST /exam-sessions/link-code)."""
    rows = (
        db.table("tests").select("id, title, duration, total_questions, institution_name, institution_logo, slug, settings")
        .eq("settings->conduct_exam->>join_code", code).limit(10).execute()
    ).data or []
    for test in rows:
        settings = test.get("settings") or {}
        conduct = settings.get("conduct_exam") or {}
        schedule = settings.get("schedule") or {}
        ended = schedule.get("enabled") and schedule.get("end_time") and rules.parse_ts(schedule["end_time"]) < rules.now_utc()
        if conduct.get("enabled") and not ended:
            return test
    return None


@router.get("/code/{code}")
async def lookup_code(code: str, request: Request, db: Client = Depends(get_db)):
    enforce_limit(join_lookup_per_ip, client_ip(request), "Too many tries. Wait a minute and try again.")
    try:
        session = _open_session_by_code(db, code)
    except SessionError as err:
        if (err.detail or {}).get("code") != "no_exam":
            raise
        test = _live_link_by_code(db, code)
        if not test:
            raise
        conduct = (test.get("settings") or {}).get("conduct_exam") or {}
        # The code is just a short way to type the exam link: send the browser there.
        return {
            "kind": "link",
            "path": f"/test/{conduct.get('conduct_slug') or test.get('slug')}",
            "test": {
                "title": test.get("title"),
                "duration": test.get("duration"),
                "questions": test.get("total_questions"),
                "institution_name": test.get("institution_name"),
            },
        }
    return {"kind": "session", **_public_info(db, session)}


@router.post("/code/{code}/enter")
async def enter(
    code: str,
    payload: EnterRequest,
    request: Request,
    x_exam_token: Optional[str] = Header(default=None),
    db: Client = Depends(get_db),
):
    enforce_limit(join_enter_per_ip, client_ip(request), "Too many tries. Wait a minute and try again.")
    session = _open_session_by_code(db, code)
    mode = session.get("identity_mode") or "name"
    name = rules.clean_name(payload.name)
    roll = rules.clean_roll(payload.roll_no)
    roster_student: Optional[Dict[str, Any]] = None
    pin_verified = False

    if mode in ("roll", "roll_pin"):
        if not rules.roll_key(roll):
            raise SessionError(400, "roll_required", "Enter your roll number.")
        if session.get("class_id"):
            roster_student = store._first(
                db.table("roster_students").select("id, roll_no, full_name, pin_hash")
                .eq("class_id", session["class_id"]).eq("roll_key", rules.roll_key(roll)).limit(1).execute()
            )
        if mode == "roll_pin":
            if not roster_student:
                raise SessionError(404, "roll_not_found", f"Roll number {roll} is not on this batch's list. Check it with your examiner.")
            enforce_limit(
                join_pin_per_student, f"{session['id']}:{rules.roll_key(roll)}",
                "Too many wrong PINs. Wait 10 minutes or ask your examiner to reset your PIN.",
            )
            if not roster_student.get("pin_hash"):
                raise SessionError(403, "no_pin", "You don't have a PIN yet. Ask your examiner for your PIN slip.")
            if not rules.verify_pin(payload.pin or "", roster_student["pin_hash"]):
                raise SessionError(401, "wrong_pin", "That PIN is not right. Check your PIN slip.")
            pin_verified = True
        elif not roster_student:
            if session.get("class_id") and not session.get("allow_walk_in"):
                raise SessionError(404, "roll_not_found", f"Roll number {roll} is not on this batch's list. Check it with your examiner.")
        roll_display = roster_student["roll_no"] if roster_student else roll
        display = roster_student["full_name"] if roster_student else name
        if not roster_student:
            # A walk-in rejoining (new phone) is found by roll number alone.
            known = store._first(
                db.table("session_participants").select("display_name")
                .eq("session_id", session["id"]).eq("identity_key", rules.identity_key_for(mode, "", roll)).limit(1).execute()
            )
            if known:
                display = known["display_name"]
            elif len(name) < 2:
                raise SessionError(400, "name_required", "Your roll number is not on the list. Enter your full name too.", roll_no=roll)
    else:
        if len(name) < 2:
            raise SessionError(400, "name_required", "Enter your full name.")
        if session.get("class_id"):
            matches = (
                db.table("roster_students").select("id, roll_no, full_name")
                .eq("class_id", session["class_id"]).execute()
            ).data or []
            roster_student = next((m for m in matches if rules.name_key(m.get("full_name")) == rules.name_key(name)), None)
            if not roster_student and not session.get("allow_walk_in"):
                raise SessionError(404, "name_not_found", "Your name is not on this batch's list. Type it exactly as your examiner has it.")
        display = roster_student["full_name"] if roster_student else name
        roll_display = roster_student["roll_no"] if roster_student else None

    identity_key = rules.identity_key_for(mode, display, roll_display or "")

    # A re-test is for students who missed the first sitting.
    if session.get("retest_of"):
        earlier = store._first(
            db.table("session_participants").select("id, submitted_at")
            .eq("session_id", session["retest_of"]).eq("identity_key", identity_key)
            .eq("status", "submitted").limit(1).execute()
        )
        if earlier:
            raise SessionError(409, "already_sat", f"{display} already took this paper in the first sitting.")

    existing = store._first(
        db.table("session_participants").select(store.PARTICIPANT_COLS + ", device_token_hash")
        .eq("session_id", session["id"]).eq("identity_key", identity_key).limit(1).execute()
    )
    same_device = bool(existing and x_exam_token and existing.get("device_token_hash") == rules.hash_token(x_exam_token))

    if existing:
        if existing.get("status") == "removed":
            raise SessionError(403, "removed", "Your examiner removed you from this exam.")
        if existing.get("status") == "submitted":
            if not (same_device or pin_verified):
                raise SessionError(409, "already_submitted", f"{display} has already submitted this exam.")
            token = x_exam_token if same_device else _issue_token(db, existing, replace_device=False)
            return {"token": token, "participant": _public_participant(existing), "session": _public_info(db, session)}
        if mode == "name" and not same_device and rules.is_online(existing):
            raise SessionError(
                409, "name_taken",
                f"Someone called {display} is already in this exam. Add your surname, or ask your examiner.",
            )
        token = x_exam_token if same_device else _issue_token(db, existing, replace_device=bool(existing.get("device_token_hash")))
        return {"token": token, "participant": _public_participant(existing), "session": _public_info(db, session)}

    reason = rules.join_block_reason(session)
    if reason == "not_open":
        raise SessionError(403, "not_open", "This exam is not open yet.", opens_at=session.get("opens_at"))
    if reason == "late":
        until = rules.late_entry_until(session)
        raise SessionError(403, "late", "Entry to this exam has closed. Talk to your examiner.", late_entry_until=rules.iso(until))
    if reason == "ended":
        raise SessionError(410, "ended", "This exam has ended.")

    user_id = str(uuid.uuid4())
    store.ensure_guest_user(db, user_id, display, session["id"])
    token, token_hash = rules.new_device_token()
    row = {
        "session_id": session["id"],
        "roster_student_id": roster_student["id"] if roster_student else None,
        "identity_key": identity_key,
        "display_name": display,
        "roll_no": roll_display or None,
        "user_id": user_id,
        "status": "joined",
        "device_token_hash": token_hash,
        "last_seen_at": rules.iso(rules.now_utc()),
    }
    try:
        participant = store._first(db.table("session_participants").insert(row).execute())
    except Exception as e:
        if not store.is_unique_violation(e):
            raise
        # Two devices joined as the same student at the same moment: the later one wins.
        participant = store._first(
            db.table("session_participants").select(store.PARTICIPANT_COLS)
            .eq("session_id", session["id"]).eq("identity_key", identity_key).limit(1).execute()
        )
        token = _issue_token(db, participant, replace_device=True)
    return {"token": token, "participant": _public_participant(participant), "session": _public_info(db, session)}


@router.get("/me")
async def me(x_exam_token: Optional[str] = Header(default=None), db: Client = Depends(get_db)):
    participant, session = store.participant_by_token(db, x_exam_token)
    # The lobby polls this, so it doubles as "still here" for the teacher's monitor.
    if participant.get("status") != "submitted":
        db.table("session_participants").update({"last_seen_at": rules.iso(rules.now_utc())}).eq("id", participant["id"]).execute()
    test = store.load_test_summary(db, session["test_id"]) or {}
    counts = store.participant_counts(db, [session["id"]]).get(session["id"], {})
    roster_size = None
    if session.get("class_id"):
        roster_size = store.roster_counts(db, [session["class_id"]]).get(session["class_id"], {}).get("students")
    return {
        "participant": _public_participant(participant),
        "session": _public_info(db, session, test),
        "joined": counts.get("joined", 0),
        "expected": roster_size,
        "deadline": rules.iso(_deadline(session, participant, test)) if participant.get("started_at") else None,
        "results_released": rules.results_released(session),
        "results_release_at": rules.results_release_at(session),
    }


@router.post("/me/start")
async def start(x_exam_token: Optional[str] = Header(default=None), db: Client = Depends(get_db)):
    participant, session = store.participant_by_token(db, x_exam_token)
    if participant.get("status") == "submitted":
        raise SessionError(409, "already_submitted", "You have already submitted this exam.")
    phase = rules.session_phase(session)
    if phase != "live":
        raise SessionError(409, "not_started", "The exam has not started yet.", phase=phase)

    now = rules.now_utc()
    paper = store.load_paper(db, session["test_id"])
    if not participant.get("started_at"):
        participant = {**participant, "started_at": rules.iso(now), "status": "writing"}
        db.table("session_participants").update({
            "started_at": participant["started_at"], "status": "writing", "last_seen_at": rules.iso(now),
        }).eq("id", participant["id"]).execute()
        # The existing progress pings update test_registrations; give them a row to update.
        try:
            db.table("test_registrations").insert({
                "test_id": paper["id"], "user_id": participant["user_id"],
                "status": "in_progress", "completion_percentage": 0,
            }).execute()
        except Exception:
            pass

    deadline = _deadline(session, participant, paper)
    if deadline and now >= deadline + rules.SUBMIT_GRACE:
        raise SessionError(403, "time_over", "Your time for this exam is over.")

    draft = store._first(
        db.table("session_participants").select("answers_draft").eq("id", participant["id"]).limit(1).execute()
    ) or {}
    paper["computed_max_marks"] = calculate_test_max_marks(paper)
    return {
        "test": strip_answer_key(paper, False),
        "deadline": rules.iso(deadline),
        "server_time": rules.iso(now),
        "draft_answers": draft.get("answers_draft") or {},
        "participant": _public_participant(participant),
        "session_name": session.get("name"),
    }


@router.post("/me/heartbeat")
async def heartbeat(
    payload: HeartbeatRequest,
    x_exam_token: Optional[str] = Header(default=None),
    db: Client = Depends(get_db),
):
    enforce_limit(join_heartbeat_per_token, rules.hash_token(x_exam_token or "")[:24], "Slow down.")
    participant, session = store.participant_by_token(db, x_exam_token)
    now = rules.now_utc()
    if participant.get("status") == "submitted":
        return {"status": "submitted", "server_time": rules.iso(now)}

    patch: Dict[str, Any] = {"last_seen_at": rules.iso(now)}
    if participant.get("started_at"):
        patch["status"] = "writing"
    if payload.progress is not None:
        patch["progress"] = max(0, min(100, int(payload.progress)))
    if payload.answered is not None:
        patch["answered"] = max(0, int(payload.answered))
    if payload.violations is not None:
        patch["violations"] = max(int(participant.get("violations") or 0), int(payload.violations))
    if payload.answers is not None and participant.get("started_at"):
        import json
        if len(json.dumps(payload.answers)) <= MAX_DRAFT_BYTES:
            patch["answers_draft"] = payload.answers
    db.table("session_participants").update(patch).eq("id", participant["id"]).execute()

    test = store.load_test_summary(db, session["test_id"]) or {}
    deadline = _deadline(session, participant, test)
    return {
        "status": patch.get("status", participant.get("status")),
        "server_time": rules.iso(now),
        "deadline": rules.iso(deadline),
        "extra_minutes": int(participant.get("extra_minutes") or 0),
        "force_submit": bool(participant.get("force_submit_at")),
        "ended": rules.session_phase(session, now) == "ended",
    }


@router.get("/me/result")
async def result(x_exam_token: Optional[str] = Header(default=None), db: Client = Depends(get_db)):
    participant, session = store.participant_by_token(db, x_exam_token)
    if participant.get("status") != "submitted" or not participant.get("attempt_id"):
        raise SessionError(409, "not_submitted", "You have not submitted this exam yet.")
    return _session_result(db, session, participant)


def _rank_rows(attempts: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
    rows = []
    for a in attempts:
        stats = (a.get("metadata") or {}).get("stats") or a.get("stats") or {}
        rows.append({
            key: a.get(key),
            "score": float(a.get("score") or 0),
            "wrong": stats.get("wrongCount") or 0,
            "unattempted": stats.get("unattemptedCount") or 0,
            "time_taken_seconds": None,
        })
    return rules.rank_results(rows)


def _scorecard(paper: Dict[str, Any], attempt: Dict[str, Any], ranked: List[Dict[str, Any]], mine: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Score, rank and breakdown, the same shape for sittings and exam links."""
    max_marks = float(calculate_test_max_marks(paper).get("total_max_marks") or paper.get("total_max_marks") or 0)
    summary = rules.summarise_scores(ranked, max_marks)
    breakdown = breakdown_attempt(paper, attempt.get("answers") or {})
    score = float(attempt.get("score") or 0)
    return {
        "released": True,
        "test_title": paper.get("title"),
        "institution_name": paper.get("institution_name"),
        "score": score,
        "max_marks": max_marks,
        "percent": round(score / max_marks * 100, 1) if max_marks else None,
        "rank": mine["rank"] if mine else None,
        "of": len(ranked),
        "average": summary["average"],
        "highest": summary["highest"],
        "stats": (attempt.get("metadata") or {}).get("stats") or {},
        "sections": breakdown["sections"],
        "topics": breakdown["topics"],
    }


def _session_result(db: Client, session: Dict[str, Any], participant: Dict[str, Any]) -> Dict[str, Any]:
    who = {
        "name": participant.get("display_name"),
        "roll_no": participant.get("roll_no"),
        "exam": session.get("name"),
        "submitted_at": participant.get("submitted_at"),
    }
    if not rules.results_released(session):
        test = store.load_test_summary(db, session["test_id"]) or {}
        return {"released": False, "release_at": rules.results_release_at(session), "test_title": test.get("title"), **who}

    attempts = (
        db.table("user_tests").select("id, score, metadata, participant_id")
        .eq("session_id", session["id"]).limit(5000).execute()
    ).data or []
    ranked = _rank_rows(attempts, "participant_id")
    mine = next((r for r in ranked if r["participant_id"] == participant["id"]), None)
    paper = store.load_paper(db, session["test_id"])
    attempt = store._first(db.table("user_tests").select("answers, score, metadata").eq("id", participant["attempt_id"]).limit(1).execute()) or {}
    return {**_scorecard(paper, attempt, ranked, mine), **who}


# ── "See your result": any device, after the exam ──────────────────────────

LINK_FIELDS_MAX = 8


def _match_key(value: Any) -> str:
    """'Rahul  Kumar' = 'rahul kumar', '23 A-017' = '23a017'. Keeps Hindi and other letters."""
    return re.sub(r"[\W_]+", "", str(value or "").casefold())


def _code_owners(db: Client, code: str) -> List[Tuple[str, Dict[str, Any]]]:
    """Every sitting and exam link that has used this code, newest first."""
    if not re.fullmatch(r"\d{6}", code or ""):
        raise SessionError(404, "bad_code", "Exam codes have 6 digits.")
    owners: List[Tuple[str, str, Dict[str, Any]]] = []
    sessions = (
        db.table("exam_sessions").select(store.SESSION_COLS)
        .eq("join_code", code).order("created_at", desc=True).limit(10).execute()
    ).data or []
    for s in sessions:
        owners.append((str(s.get("created_at") or ""), "session", store.finalize_if_over(db, s)))
    tests = (
        db.table("tests").select("id, title, duration, total_questions, institution_name, institution_logo, settings")
        .eq("settings->conduct_exam->>join_code", code).limit(10).execute()
    ).data or []
    for t in tests:
        conduct = (t.get("settings") or {}).get("conduct_exam") or {}
        owners.append((str(conduct.get("join_code_at") or conduct.get("started_at") or ""), "link", t))
    owners.sort(key=lambda o: rules.parse_ts(o[0]) or rules.parse_ts("1970-01-01T00:00:00+00:00"), reverse=True)
    if not owners:
        raise SessionError(404, "no_exam", "No exam has used this code. Check the code and try again.")
    return [(kind, row) for _, kind, row in owners]


def _link_results_visible(test: Dict[str, Any]) -> bool:
    """
    A live link follows its "Result visibility" switch, so turning it on later releases
    the results. Stopping a link from the dashboard resets its settings, so a stopped link
    uses what was recorded when it stopped (conductExam.ts). An expired schedule stops a
    link without touching its settings; with nothing recorded and the settings reset,
    results stay closed.
    """
    settings = test.get("settings") or {}
    conduct = settings.get("conduct_exam") or {}
    if conduct.get("enabled"):
        return settings.get("show_results_immediate") is not False
    if "results_visible" in conduct:
        return conduct.get("results_visible") is True
    untouched = bool((settings.get("start_form") or {}).get("enabled"))
    return untouched and settings.get("show_results_immediate") is not False


def _link_attempts(db: Client, test: Dict[str, Any], limit: int = 5000) -> List[Dict[str, Any]]:
    """Attempts made through this run of the exam link (not sittings, not earlier runs), newest first."""
    conduct = (test.get("settings") or {}).get("conduct_exam") or {}
    query = (
        db.table("user_tests")
        .select("id, score, created_at, form:metadata->startFormData, stats:metadata->stats")
        .eq("test_id", test["id"]).is_("session_id", "null")
    )
    if conduct.get("started_at"):
        query = query.gte("created_at", conduct["started_at"])
    rows = query.order("created_at", desc=True).limit(limit).execute().data or []
    for row in rows:
        meta = row.get("metadata") or {}
        row.setdefault("form", meta.get("startFormData"))
        row.setdefault("stats", meta.get("stats"))
    return [r for r in rows if isinstance(r.get("form"), dict) and r["form"]]


def _link_fields(db: Client, test: Dict[str, Any], attempts: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """The details the exam's start form asked for (rebuilt from the attempts once the link has stopped)."""
    settings = test.get("settings") or {}
    conduct = settings.get("conduct_exam") or {}
    form = settings.get("start_form") or {}
    fields = []
    if form.get("enabled"):  # live, or stopped without a reset
        fields = [
            {"label": str(f.get("label")).strip(), "required": bool(f.get("required"))}
            for f in form.get("fields") or [] if str(f.get("label") or "").strip()
        ]
    if not fields:
        fields = [{"label": str(f).strip(), "required": True} for f in conduct.get("start_fields") or [] if str(f).strip()]
    if not fields:
        latest = attempts if attempts is not None else _link_attempts(db, test, limit=20)
        if latest:
            fields = [{"label": str(k).strip(), "required": True} for k in latest[0]["form"].keys() if str(k).strip()]
    seen, unique = set(), []
    for f in fields:
        if _match_key(f["label"]) and _match_key(f["label"]) not in seen:
            seen.add(_match_key(f["label"]))
            unique.append(f)
    return unique[:LINK_FIELDS_MAX]


def _link_card(test: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": test.get("title"),
        "duration": test.get("duration"),
        "questions": test.get("total_questions"),
        "institution_name": test.get("institution_name"),
        "institution_logo": test.get("institution_logo"),
    }


def _session_lookup(db: Client, session: Dict[str, Any], payload: ResultRequest) -> Dict[str, Any]:
    mode = session.get("identity_mode") or "name"
    if mode in ("roll", "roll_pin"):
        roll = rules.clean_roll(payload.roll_no)
        key = rules.roll_key(roll)
        if not key:
            raise SessionError(400, "roll_required", "Enter your roll number.")
        if mode == "roll_pin":
            # Same budget as check-in, so the two together can't double the guesses.
            enforce_limit(join_pin_per_student, f"{session['id']}:{key}", "Too many wrong PINs. Wait 10 minutes and try again.")
            student = None
            if session.get("class_id"):
                student = store._first(
                    db.table("roster_students").select("id, pin_hash")
                    .eq("class_id", session["class_id"]).eq("roll_key", key).limit(1).execute()
                )
            if not student or not rules.verify_pin(payload.pin or "", student.get("pin_hash")):
                raise SessionError(401, "wrong_details", "That roll number and PIN don't match. Check your PIN slip.")
        identity = rules.identity_key_for(mode, "", roll)
    else:
        name = rules.clean_name(payload.name)
        if len(name) < 2:
            raise SessionError(400, "name_required", "Enter your full name.")
        identity = rules.identity_key_for("name", name, "")
    participant = store._first(
        db.table("session_participants").select(store.PARTICIPANT_COLS)
        .eq("session_id", session["id"]).eq("identity_key", identity).limit(1).execute()
    )
    if not participant or participant.get("status") != "submitted" or not participant.get("attempt_id"):
        raise SessionError(404, "not_found", "No submitted exam matches these details. Check them and try again.")
    return _session_result(db, session, participant)


def _link_lookup(db: Client, test: Dict[str, Any], payload: ResultRequest) -> Dict[str, Any]:
    if not _link_results_visible(test):
        raise SessionError(403, "results_hidden", "Results for this exam are not open yet. Your examiner will share them.")
    attempts = _link_attempts(db, test)
    fields = _link_fields(db, test, attempts)
    if not fields:
        raise SessionError(409, "no_details", "This exam didn't ask for your details, so its results can't be looked up here.")
    given = {_match_key(k): _match_key(v) for k, v in (payload.fields or {}).items() if len(str(v or "")) <= 200}
    asked = [(_match_key(f["label"]), f) for f in fields]
    if any(f["required"] and not given.get(k) for k, f in asked) or not any(given.get(k) for k, _ in asked):
        raise SessionError(400, "details_required", "Fill in your details exactly as you did at the start of the exam.")

    def matches(attempt: Dict[str, Any]) -> bool:
        # Every field must match, blanks included: one optional field alone must not
        # be enough to open someone else's result.
        theirs = {_match_key(k): _match_key(v) for k, v in attempt["form"].items()}
        return all(theirs.get(k, "") == given.get(k, "") for k, _ in asked)

    mine = next((a for a in attempts if matches(a)), None)  # newest first: a retake wins
    if not mine:
        raise SessionError(404, "not_found", "No submitted exam matches these details. Check them and try again.")
    ranked = _rank_rows(attempts, "id")
    me_ranked = next((r for r in ranked if r["id"] == mine["id"]), None)
    paper = store.load_paper(db, test["id"])
    attempt = store._first(db.table("user_tests").select("answers, score, metadata").eq("id", mine["id"]).limit(1).execute()) or {}
    form = mine["form"]
    name = next((str(v) for k, v in form.items() if _match_key(k) in ("name", "fullname", "candidatename", "studentname")), None)
    return {
        **_scorecard(paper, attempt, ranked, me_ranked),
        "name": name or next(iter(form.values()), None),
        "exam": None,
        "submitted_at": mine.get("created_at"),
    }


@router.get("/result/{code}")
async def result_form(code: str, request: Request, db: Client = Depends(get_db)):
    """Which details to ask for: the sitting's check-in rule, or the exam link's start form."""
    enforce_limit(join_lookup_per_ip, client_ip(request), "Too many tries. Wait a minute and try again.")
    kind, row = _code_owners(db, code)[0]
    if kind == "session":
        return {
            "kind": "session",
            **_public_info(db, row),
            "results_released": rules.results_released(row),
            "results_release_at": rules.results_release_at(row),
        }
    visible = _link_results_visible(row)
    return {
        "kind": "link",
        "test": _link_card(row),
        "results_visible": visible,
        "fields": _link_fields(db, row) if visible else [],
    }


@router.post("/result/{code}")
async def result_lookup(code: str, payload: ResultRequest, request: Request, db: Client = Depends(get_db)):
    enforce_limit(join_result_per_ip, client_ip(request), "Too many tries. Wait a few minutes and try again.")
    first_error: Optional[SessionError] = None
    for kind, row in _code_owners(db, code):
        try:
            if kind == "session":
                return _session_lookup(db, row, payload)
            return _link_lookup(db, row, payload)
        except SessionError as err:
            # An older exam that used the same code may be the one these details belong to.
            first_error = first_error or err
    raise first_error  # type: ignore[misc]
