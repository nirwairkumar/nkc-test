"""
Teacher side of exam sessions (one sitting of a paper, with a 6-digit join code).

    GET    /api/exam-sessions                      my sittings (?test_id=, ?as_user= for admins)
    POST   /api/exam-sessions                      create a sitting -> join code
    GET    /api/exam-sessions/{id}                 one sitting
    PATCH  /api/exam-sessions/{id}                 edit time / rules
    DELETE /api/exam-sessions/{id}                 delete (attempts stay under the test)
    POST   /api/exam-sessions/{id}/start           manual start ("Start exam" button)
    POST   /api/exam-sessions/{id}/end             end now; files unsent answers by default
    POST   /api/exam-sessions/{id}/release         release results now
    POST   /api/exam-sessions/{id}/collect         file the last saved answers of non-submitters
    POST   /api/exam-sessions/{id}/extra-time      +N minutes for everyone still writing
    GET    /api/exam-sessions/{id}/monitor         who joined / is writing / submitted
    GET    /api/exam-sessions/{id}/results         rank list, section marks, absentees
    POST   /api/exam-sessions/{id}/retest          a new sitting for students who missed this one
    POST   /api/exam-sessions/{id}/participants/{pid}/{action}
           action = extra-time | force-submit | allow-retake | remove

Rules live in app/services/exam_sessions.py; data access in exam_session_store.py.
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from supabase import Client

from app.core.auth import is_admin_user, verify_auth_token
from app.core.database import get_db
from app.services import exam_sessions as rules
from app.services import exam_session_store as store
from app.services.exam_session_store import SessionError
from app.services.scoring import breakdown_attempt
from app.utils.attempt_control import calculate_test_max_marks
from app.utils.rate_limiter import enforce_limit, write_per_user
from app.utils.safe_route import SafeRoute

logger = logging.getLogger(__name__)
router = APIRouter(route_class=SafeRoute)

MAX_WINDOW = timedelta(hours=24)


# ── Payloads ────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    test_id: str
    name: Optional[str] = Field(default=None, max_length=120)
    class_id: Optional[str] = None
    opens_at: str
    closes_at: Optional[str] = None
    late_entry_minutes: int = Field(default=15, ge=0, le=600)
    start_mode: Literal["auto", "manual"] = "auto"
    identity_mode: Literal["name", "roll", "roll_pin"] = "name"
    allow_walk_in: bool = True
    results_release: Literal["on_end", "immediate", "manual"] = "on_end"
    retest_of: Optional[str] = None
    as_user: Optional[str] = None


class SessionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    opens_at: Optional[str] = None
    closes_at: Optional[str] = None
    late_entry_minutes: Optional[int] = Field(default=None, ge=0, le=600)
    start_mode: Optional[Literal["auto", "manual"]] = None
    identity_mode: Optional[Literal["name", "roll", "roll_pin"]] = None
    allow_walk_in: Optional[bool] = None
    results_release: Optional[Literal["on_end", "immediate", "manual"]] = None


class ExtraTime(BaseModel):
    minutes: int = Field(default=10, ge=1, le=120)


class EndRequest(BaseModel):
    collect: bool = True


class RetestRequest(BaseModel):
    opens_at: str
    closes_at: Optional[str] = None
    name: Optional[str] = Field(default=None, max_length=120)


class LinkCodeRequest(BaseModel):
    test_id: str


# ── Access ──────────────────────────────────────────────────────────────────

def _caller(request: Request, db: Client) -> Dict[str, Any]:
    uid = verify_auth_token(request, db)
    return {"id": uid, "admin": is_admin_user(uid, db)}


def _owned_session(request: Request, db: Client, session_id: str) -> Dict[str, Any]:
    caller = _caller(request, db)
    session = store.load_session(db, session_id)
    if session.get("owner_id") != caller["id"] and not caller["admin"]:
        raise SessionError(404, "not_found", "This exam session does not exist.")
    if request.method != "GET":
        enforce_limit(write_per_user, caller["id"], "Too many changes at once. Wait a moment.")
    return session


def _parse_time(value: Optional[str], field: str):
    if not value:
        return None
    try:
        return rules.parse_ts(value)
    except Exception:
        raise SessionError(400, "bad_time", f"{field} is not a valid date and time.")


# ── Shapes ──────────────────────────────────────────────────────────────────

def _session_out(
    session: Dict[str, Any],
    test: Optional[Dict[str, Any]],
    batch: Optional[str],
    counts: Optional[Dict[str, int]] = None,
    roster: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    now = rules.now_utc()
    test = test or {}
    return {
        **{k: session.get(k) for k in (
            "id", "test_id", "class_id", "retest_of", "name", "join_code", "opens_at", "closes_at",
            "late_entry_minutes", "start_mode", "started_at", "identity_mode", "allow_walk_in",
            "results_release", "results_released_at", "ended_at", "created_at",
        )},
        "phase": rules.session_phase(session, now),
        "late_entry_until": rules.iso(rules.late_entry_until(session)),
        "results_released": rules.results_released(session, now),
        "server_time": rules.iso(now),
        "batch": batch,
        "test": {
            "id": test.get("id"),
            "title": test.get("title"),
            "duration": test.get("duration"),
            "questions": test.get("total_questions"),
            "max_marks": test.get("total_max_marks"),
            "institution_name": test.get("institution_name"),
            "institution_logo": test.get("institution_logo"),
            "proctoring": store.proctoring_on(test),
        },
        "counts": counts or {"joined": 0, "writing": 0, "submitted": 0},
        "roster": roster or {"students": 0, "with_pin": 0},
    }


def _full_out(db: Client, session: Dict[str, Any]) -> Dict[str, Any]:
    test = store.load_test_summary(db, session["test_id"])
    counts = store.participant_counts(db, [session["id"]]).get(session["id"])
    roster = store.roster_counts(db, [session["class_id"]]).get(session["class_id"]) if session.get("class_id") else None
    return _session_out(session, test, store.class_name(db, session.get("class_id")), counts, roster)


def _validate_window(opens_at, closes_at, test: Dict[str, Any], late_entry: int):
    if not opens_at:
        raise SessionError(400, "bad_time", "Choose when the exam starts.")
    duration = float(test.get("duration") or 0) or 60.0
    if not closes_at:
        closes_at = opens_at + timedelta(minutes=duration + late_entry + 10)
    if closes_at <= opens_at:
        raise SessionError(400, "bad_window", "The exam must close after it starts.")
    if closes_at - opens_at > MAX_WINDOW:
        raise SessionError(400, "bad_window", "One sitting can stay open for at most 24 hours.")
    if closes_at <= rules.now_utc():
        raise SessionError(400, "bad_window", "That time has already passed.")
    return opens_at, closes_at


def _check_identity_rules(db: Client, identity_mode: str, class_id: Optional[str]):
    if identity_mode == "roll_pin":
        if not class_id:
            raise SessionError(400, "batch_required", "Roll number + PIN needs a batch with a student list.")
        roster = store.roster_counts(db, [class_id]).get(class_id, {})
        if not roster.get("with_pin"):
            raise SessionError(400, "no_pins", "No student in this batch has a PIN yet. Make PINs on the batch page first.")


def _code_in_use(db: Client, code: str) -> bool:
    """A code may belong to one open sitting OR one live exam link at a time."""
    if store._first(db.table("exam_sessions").select("id").eq("join_code", code).is_("ended_at", "null").limit(1).execute()):
        return True
    rows = (db.table("tests").select("id, settings").eq("settings->conduct_exam->>join_code", code).limit(10).execute()).data or []
    return any(((r.get("settings") or {}).get("conduct_exam") or {}).get("enabled") for r in rows)


def _insert_with_code(db: Client, row: Dict[str, Any]) -> Dict[str, Any]:
    # Free codes held by sittings whose window has passed but were never opened again.
    try:
        db.table("exam_sessions").update({"ended_at": rules.iso(rules.now_utc())}) \
            .is_("ended_at", "null").lt("closes_at", rules.iso(rules.now_utc())).execute()
    except Exception as e:
        logger.warning(f"exam sessions: could not sweep stale codes: {e}")
    for _ in range(20):
        code = rules.generate_join_code()
        if _code_in_use(db, code):
            continue
        try:
            created = store._first(db.table("exam_sessions").insert({**row, "join_code": code}).execute())
            if created:
                return created
        except Exception as e:
            if not store.is_unique_violation(e):
                raise
    raise SessionError(503, "no_code", "Could not find a free exam code. Please try again.")


# ── A code for a live exam link ─────────────────────────────────────────────

@router.post("/link-code")
async def link_code(payload: LinkCodeRequest, request: Request, db: Client = Depends(get_db)):
    """
    The simple way: an exam already live through "Conduct exam" gets a 6-digit code.
    testoza.com/join + the code opens the same exam link, with the same settings and the
    same results. The code stops working when the exam is stopped (or conducted again).
    """
    caller = _caller(request, db)
    enforce_limit(write_per_user, caller["id"], "Too many changes at once. Wait a moment.")
    test = store._first(db.table("tests").select("id, created_by, settings, slug").eq("id", payload.test_id).limit(1).execute())
    if not test or (test.get("created_by") != caller["id"] and not caller["admin"]):
        raise SessionError(404, "test_not_found", "This test was not found.")
    settings = test.get("settings") or {}
    conduct = settings.get("conduct_exam") or {}
    if not conduct.get("enabled"):
        raise SessionError(409, "not_live", "Start the exam first (Conduct exam), then get a code for it.")
    if conduct.get("join_code"):
        return {"join_code": conduct["join_code"], "settings": settings}

    code = None
    for _ in range(20):
        candidate = rules.generate_join_code()
        if not _code_in_use(db, candidate):
            code = candidate
            break
    if not code:
        raise SessionError(503, "no_code", "Could not find a free exam code. Please try again.")

    new_settings = {**settings, "conduct_exam": {**conduct, "join_code": code, "join_code_at": rules.iso(rules.now_utc())}}
    db.table("tests").update({"settings": new_settings}).eq("id", test["id"]).execute()
    try:
        from app.routers.tests.cache_config import bust_test_cache
        bust_test_cache(test["id"])
    except Exception:
        pass
    return {"join_code": code, "settings": new_settings}


# ── Sittings ────────────────────────────────────────────────────────────────

@router.get("")
async def list_sessions(
    request: Request,
    test_id: Optional[str] = Query(default=None),
    as_user: Optional[str] = Query(default=None),
    db: Client = Depends(get_db),
):
    caller = _caller(request, db)
    owner = as_user if (as_user and caller["admin"]) else caller["id"]
    query = db.table("exam_sessions").select(store.SESSION_COLS).eq("owner_id", owner)
    if test_id:
        query = query.eq("test_id", test_id)
    sessions = (query.order("opens_at", desc=True).limit(200).execute()).data or []
    sessions = [store.finalize_if_over(db, s) for s in sessions]

    test_ids = list({s["test_id"] for s in sessions})
    class_ids = list({s["class_id"] for s in sessions if s.get("class_id")})
    tests = {t["id"]: t for t in ((db.table("tests").select(store.TEST_SUMMARY_COLS).in_("id", test_ids).execute()).data or [])} if test_ids else {}
    classes = {c["id"]: c["name"] for c in ((db.table("classes").select("id, name").in_("id", class_ids).execute()).data or [])} if class_ids else {}
    counts = store.participant_counts(db, [s["id"] for s in sessions])
    rosters = store.roster_counts(db, class_ids)
    return [
        _session_out(s, tests.get(s["test_id"]), classes.get(s.get("class_id")), counts.get(s["id"]), rosters.get(s.get("class_id")))
        for s in sessions
    ]


@router.post("")
async def create_session(payload: SessionCreate, request: Request, db: Client = Depends(get_db)):
    caller = _caller(request, db)
    enforce_limit(write_per_user, caller["id"], "Too many changes at once. Wait a moment.")
    owner = payload.as_user if (payload.as_user and caller["admin"]) else caller["id"]

    test = store.load_test_summary(db, payload.test_id)
    if not test or (test.get("created_by") != owner and not caller["admin"]):
        raise SessionError(404, "test_not_found", "Choose one of your own tests.")
    if not test.get("total_questions"):
        raise SessionError(400, "no_questions", "This test has no questions yet.")

    if payload.class_id:
        batch = store._first(db.table("classes").select("id, user_id").eq("id", payload.class_id).limit(1).execute())
        if not batch or batch.get("user_id") != owner:
            raise SessionError(404, "batch_not_found", "Choose one of your own batches.")
    _check_identity_rules(db, payload.identity_mode, payload.class_id)

    if payload.retest_of:
        parent = store._first(db.table("exam_sessions").select("id, owner_id, test_id").eq("id", payload.retest_of).limit(1).execute())
        if not parent or parent.get("owner_id") != owner:
            raise SessionError(404, "not_found", "The first sitting was not found.")

    opens_at, closes_at = _validate_window(
        _parse_time(payload.opens_at, "Start time"), _parse_time(payload.closes_at, "Close time"),
        test, payload.late_entry_minutes,
    )
    batch_name = store.class_name(db, payload.class_id)
    default_name = f"{batch_name} · {opens_at.strftime('%d %b')}" if batch_name else f"{test.get('title')} · {opens_at.strftime('%d %b')}"
    row = {
        "test_id": test["id"],
        "owner_id": owner,
        "class_id": payload.class_id,
        "retest_of": payload.retest_of,
        "name": rules.clean_name(payload.name) or default_name[:120],
        "opens_at": rules.iso(opens_at),
        "closes_at": rules.iso(closes_at),
        "late_entry_minutes": payload.late_entry_minutes,
        "start_mode": payload.start_mode,
        "identity_mode": payload.identity_mode,
        "allow_walk_in": payload.allow_walk_in if payload.identity_mode != "roll_pin" else False,
        "results_release": payload.results_release,
    }
    created = _insert_with_code(db, row)
    return _session_out(created, test, batch_name, None, store.roster_counts(db, [payload.class_id]).get(payload.class_id) if payload.class_id else None)


@router.get("/{session_id}")
async def get_session(session_id: str, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    return _full_out(db, session)


@router.patch("/{session_id}")
async def update_session(session_id: str, payload: SessionUpdate, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    if rules.session_phase(session) == "ended":
        raise SessionError(409, "ended", "This sitting has ended and can no longer be changed.")
    patch: Dict[str, Any] = {}
    if payload.name is not None:
        patch["name"] = rules.clean_name(payload.name) or session["name"]
    for field in ("late_entry_minutes", "start_mode", "allow_walk_in", "results_release"):
        value = getattr(payload, field)
        if value is not None:
            patch[field] = value
    if payload.identity_mode is not None and payload.identity_mode != session.get("identity_mode"):
        joined = store.participant_counts(db, [session["id"]]).get(session["id"], {}).get("joined", 0)
        if joined:
            raise SessionError(409, "has_participants", "Students have already joined, so the check-in rule can't change.")
        _check_identity_rules(db, payload.identity_mode, session.get("class_id"))
        patch["identity_mode"] = payload.identity_mode
    if payload.opens_at is not None or payload.closes_at is not None:
        test = store.load_test_summary(db, session["test_id"]) or {}
        opens_at = _parse_time(payload.opens_at, "Start time") if payload.opens_at else rules.parse_ts(session["opens_at"])
        closes_at = _parse_time(payload.closes_at, "Close time") if payload.closes_at else rules.parse_ts(session["closes_at"])
        if payload.opens_at and not payload.closes_at:
            closes_at = opens_at + (rules.parse_ts(session["closes_at"]) - rules.parse_ts(session["opens_at"]))
        opens_at, closes_at = _validate_window(opens_at, closes_at, test, patch.get("late_entry_minutes", session.get("late_entry_minutes") or 0))
        patch["opens_at"] = rules.iso(opens_at)
        patch["closes_at"] = rules.iso(closes_at)
    if patch:
        db.table("exam_sessions").update(patch).eq("id", session_id).execute()
    return _full_out(db, store.load_session(db, session_id))


@router.delete("/{session_id}")
async def delete_session(session_id: str, request: Request, db: Client = Depends(get_db)):
    _owned_session(request, db, session_id)
    db.table("exam_sessions").delete().eq("id", session_id).execute()
    return {"deleted": True}


@router.post("/{session_id}/start")
async def start_session(session_id: str, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    phase = rules.session_phase(session)
    if phase == "ended":
        raise SessionError(409, "ended", "This sitting has already ended.")
    if phase != "live":
        now = rules.now_utc()
        db.table("exam_sessions").update({"started_at": rules.iso(now), "start_mode": "manual"}).eq("id", session_id).execute()
    return _full_out(db, store.load_session(db, session_id))


@router.post("/{session_id}/end")
async def end_session(session_id: str, payload: EndRequest, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    if not session.get("ended_at"):
        session = {**session, "ended_at": rules.iso(rules.now_utc())}
        db.table("exam_sessions").update({"ended_at": session["ended_at"]}).eq("id", session_id).execute()
    collected = store.collect_unsubmitted(db, session) if payload.collect else 0
    return {**_full_out(db, store.load_session(db, session_id)), "collected": collected}


@router.post("/{session_id}/release")
async def release_results(session_id: str, request: Request, db: Client = Depends(get_db)):
    _owned_session(request, db, session_id)
    db.table("exam_sessions").update({"results_released_at": rules.iso(rules.now_utc())}).eq("id", session_id).execute()
    return _full_out(db, store.load_session(db, session_id))


@router.post("/{session_id}/collect")
async def collect(session_id: str, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    return {"collected": store.collect_unsubmitted(db, session)}


@router.post("/{session_id}/extra-time")
async def extra_time_all(session_id: str, payload: ExtraTime, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    rows = (
        db.table("session_participants").select("id, extra_minutes")
        .eq("session_id", session["id"]).in_("status", ["joined", "writing"]).execute()
    ).data or []
    for row in rows:
        db.table("session_participants").update({
            "extra_minutes": min(600, int(row.get("extra_minutes") or 0) + payload.minutes),
        }).eq("id", row["id"]).execute()
    # Push the sitting's own close time back too, or the extra minutes would be cut off.
    closes_at = rules.parse_ts(session["closes_at"]) + timedelta(minutes=payload.minutes)
    db.table("exam_sessions").update({"closes_at": rules.iso(closes_at)}).eq("id", session_id).execute()
    return {"updated": len(rows), "closes_at": rules.iso(closes_at)}


# ── Live monitor ────────────────────────────────────────────────────────────

@router.get("/{session_id}/monitor")
async def monitor(session_id: str, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    out = _full_out(db, session)
    test = store.load_test_summary(db, session["test_id"]) or {}
    now = rules.now_utc()
    participants = (
        db.table("session_participants").select(store.PARTICIPANT_COLS)
        .eq("session_id", session["id"]).order("joined_at").limit(5000).execute()
    ).data or []

    rows = []
    for p in participants:
        deadline = rules.participant_deadline(session, p, test.get("duration")) if p.get("started_at") else None
        rows.append({
            "id": p["id"],
            "name": p.get("display_name"),
            "roll_no": p.get("roll_no"),
            "on_roster": bool(p.get("roster_student_id")),
            "roster_student_id": p.get("roster_student_id"),
            "status": p.get("status"),
            "online": rules.is_online(p, now),
            "joined_at": p.get("joined_at"),
            "started_at": p.get("started_at"),
            "last_seen_at": p.get("last_seen_at"),
            "submitted_at": p.get("submitted_at"),
            "answered": p.get("answered") or 0,
            "progress": p.get("progress") or 0,
            "violations": p.get("violations") or 0,
            "device_changes": p.get("device_changes") or 0,
            "extra_minutes": p.get("extra_minutes") or 0,
            "force_submit_requested": bool(p.get("force_submit_at")),
            "deadline": rules.iso(deadline),
        })

    absent: List[Dict[str, Any]] = []
    if session.get("class_id"):
        roster = (
            db.table("roster_students").select("id, roll_no, full_name, pin_set_at")
            .eq("class_id", session["class_id"]).order("roll_key").limit(5000).execute()
        ).data or []
        seen = {p.get("roster_student_id") for p in participants}
        absent = [
            {"id": s["id"], "name": s["full_name"], "roll_no": s["roll_no"], "has_pin": bool(s.get("pin_set_at"))}
            for s in roster if s["id"] not in seen
        ]
    return {**out, "participants": rows, "not_joined": absent}


@router.post("/{session_id}/participants/{participant_id}/{action}")
async def participant_action(
    session_id: str,
    participant_id: str,
    action: Literal["extra-time", "force-submit", "allow-retake", "remove"],
    request: Request,
    payload: Optional[ExtraTime] = None,
    db: Client = Depends(get_db),
):
    session = _owned_session(request, db, session_id)
    participant = store._first(
        db.table("session_participants").select(store.PARTICIPANT_COLS)
        .eq("id", participant_id).eq("session_id", session["id"]).limit(1).execute()
    )
    if not participant:
        raise SessionError(404, "not_found", "That student is not in this sitting.")

    if action == "extra-time":
        minutes = (payload or ExtraTime()).minutes
        db.table("session_participants").update({
            "extra_minutes": min(600, int(participant.get("extra_minutes") or 0) + minutes),
        }).eq("id", participant_id).execute()
    elif action == "force-submit":
        if participant.get("status") == "submitted":
            raise SessionError(409, "already_submitted", "This student has already submitted.")
        db.table("session_participants").update({"force_submit_at": rules.iso(rules.now_utc())}).eq("id", participant_id).execute()
    elif action == "allow-retake":
        if participant.get("attempt_id"):
            db.table("user_tests").delete().eq("id", participant["attempt_id"]).execute()
        db.table("session_participants").update({
            "status": "joined", "submitted_at": None, "attempt_id": None, "started_at": None,
            "answers_draft": None, "force_submit_at": None, "progress": 0, "answered": 0, "violations": 0,
        }).eq("id", participant_id).execute()
    elif action == "remove":
        db.table("session_participants").update({"status": "removed", "device_token_hash": None}).eq("id", participant_id).execute()
    return {"ok": True}


# ── Results ─────────────────────────────────────────────────────────────────

@router.get("/{session_id}/results")
async def results(session_id: str, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    paper = store.load_paper(db, session["test_id"])
    if rules.session_phase(session) == "ended":
        # Nobody's work is lost: unsent answers of students who were writing are filed now.
        store.collect_unsubmitted(db, session, paper)

    out = _full_out(db, session)
    max_marks = float(calculate_test_max_marks(paper).get("total_max_marks") or paper.get("total_max_marks") or 0)
    participants = {
        p["id"]: p for p in ((
            db.table("session_participants").select(store.PARTICIPANT_COLS)
            .eq("session_id", session["id"]).limit(5000).execute()
        ).data or [])
    }
    roster: Dict[str, Dict[str, Any]] = {}
    if session.get("class_id"):
        roster = {
            s["id"]: s for s in ((
                db.table("roster_students").select("id, roll_no, full_name, parent_phone")
                .eq("class_id", session["class_id"]).order("roll_key").limit(5000).execute()
            ).data or [])
        }

    attempts = (
        db.table("user_tests").select("id, score, answers, metadata, participant_id, violation_count, created_at")
        .eq("session_id", session["id"]).limit(5000).execute()
    ).data or []

    rows = []
    for a in attempts:
        p = participants.get(a.get("participant_id")) or {}
        meta = a.get("metadata") or {}
        stats = meta.get("stats") or {}
        started = rules.parse_ts(meta.get("startedAt") or p.get("started_at"))
        submitted = rules.parse_ts(meta.get("submittedAt") or a.get("created_at"))
        breakdown = breakdown_attempt(paper, a.get("answers") or {})
        score = float(a.get("score") or 0)
        student = roster.get(p.get("roster_student_id")) or {}
        rows.append({
            "attempt_id": a["id"],
            "participant_id": a.get("participant_id"),
            "name": p.get("display_name") or (meta.get("startFormData") or {}).get("Name") or "Student",
            "roll_no": p.get("roll_no"),
            "parent_phone": student.get("parent_phone"),
            "score": score,
            "max_marks": max_marks,
            "percent": round(score / max_marks * 100, 1) if max_marks else None,
            "correct": stats.get("correctCount") or 0,
            "wrong": stats.get("wrongCount") or 0,
            "partial": stats.get("partialCount") or 0,
            "unattempted": stats.get("unattemptedCount") or 0,
            "time_taken_seconds": int((submitted - started).total_seconds()) if (started and submitted and submitted > started) else None,
            "violations": a.get("violation_count") or p.get("violations") or 0,
            "submitted_at": rules.iso(submitted),
            "late_seconds": meta.get("late_by_seconds") or 0,
            "collected": bool(meta.get("collected_by_teacher")),
            "sections": breakdown["sections"],
            "topics": breakdown["topics"],
        })
    ranked = rules.rank_results(rows)

    attempted_ids = {a.get("participant_id") for a in attempts}
    not_submitted = [
        {"id": p["id"], "name": p.get("display_name"), "roll_no": p.get("roll_no"), "status": p.get("status")}
        for p in participants.values() if p["id"] not in attempted_ids and p.get("status") != "removed"
    ]
    joined_roster = {p.get("roster_student_id") for p in participants.values()}
    absent = [
        {"id": s["id"], "name": s["full_name"], "roll_no": s["roll_no"], "parent_phone": s.get("parent_phone")}
        for s in roster.values() if s["id"] not in joined_roster
    ]
    section_names = [s["name"] for s in (ranked[0]["sections"] if ranked else breakdown_attempt(paper, {})["sections"])]
    section_avgs = []
    for idx, name in enumerate(section_names):
        values = [r["sections"][idx]["score"] for r in ranked if idx < len(r["sections"])]
        maxes = [r["sections"][idx]["max"] for r in ranked if idx < len(r["sections"])]
        section_avgs.append({
            "name": name,
            "average": round(sum(values) / len(values), 2) if values else None,
            "max": maxes[0] if maxes else None,
        })
    return {
        **out,
        "max_marks": max_marks,
        "summary": rules.summarise_scores(ranked, max_marks),
        "section_averages": section_avgs,
        "rows": ranked,
        "not_submitted": not_submitted,
        "absent": absent,
    }


@router.post("/{session_id}/retest")
async def create_retest(session_id: str, payload: RetestRequest, request: Request, db: Client = Depends(get_db)):
    session = _owned_session(request, db, session_id)
    create = SessionCreate(
        test_id=session["test_id"],
        name=payload.name or f"{session['name']} · re-test"[:120],
        class_id=session.get("class_id"),
        opens_at=payload.opens_at,
        closes_at=payload.closes_at,
        late_entry_minutes=session.get("late_entry_minutes") or 15,
        start_mode=session.get("start_mode") or "auto",
        identity_mode=session.get("identity_mode") or "name",
        allow_walk_in=bool(session.get("allow_walk_in")),
        results_release=session.get("results_release") or "on_end",
        retest_of=session["id"],
        as_user=session.get("owner_id"),
    )
    return await create_session(create, request, db)
