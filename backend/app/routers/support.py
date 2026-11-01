from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.database import get_db, supabase as admin_db
from app.core.auth import get_optional_user_id, verify_auth_token, verify_is_admin
from app.services import support_mail
from supabase import Client
from pydantic import BaseModel
from typing import Any, Dict, Optional, List, Tuple
from datetime import datetime, timezone
import base64
import logging
import re
import uuid
from app.utils.rate_limiter import check_support_rate_limit, check_support_reply_limit

logger = logging.getLogger(__name__)

router = APIRouter()

class FeedbackCreate(BaseModel):
    test_id: str
    rating: int
    comment: Optional[str] = None
    custom_test_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_email: Optional[str] = None
    improvements: Optional[str] = None
    requirements: Optional[str] = None
    test_experience: Optional[str] = None
    dislikes: Optional[str] = None

@router.post("/feedback", dependencies=[Depends(check_support_rate_limit)])
def submit_feedback(payload: FeedbackCreate, request: Request, db: Client = Depends(get_db)):
    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be 1 to 5 stars")
    try:
        data = payload.dict(exclude_unset=True)
        if data.get("comment"):
            data["comment"] = data["comment"][:2000]
        user_id = get_optional_user_id(request, db)
        if user_id:
            data["user_id"] = user_id
        response = db.table("feedback").insert(data).execute()
        _notify_creator_of_feedback(payload)
        return response.data
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _notify_creator_of_feedback(payload: FeedbackCreate) -> None:
    """Exam feedback belongs to the creator: it lands in My Tests → Reports & feedback."""
    try:
        from app.utils.notifications import send_notification
        test_res = admin_db.table("tests").select("created_by, title").eq("id", payload.test_id).limit(1).execute()
        if not test_res.data:
            return
        test = test_res.data[0]
        who = payload.sender_name or "A candidate"
        send_notification(
            user_id=test.get("created_by"),
            title="New exam feedback",
            message=f"{who} rated \"{test.get('title') or 'your test'}\" {payload.rating}/5.",
            link="/my-tests?tab=reports&view=feedback",
            custom_test_id=payload.test_id,
            sender_name=payload.sender_name,
            sender_email=payload.sender_email,
            db=admin_db,
        )
    except Exception as e:
        logger.error(f"Failed to notify creator of feedback: {e}")

# ── Help messages ─────────────────────────────────────────────────────────────
# app.testoza.com/help (signed in) and testoza.com/support (public) both post here.
# The message is saved, then the team is told (services/support_mail.py). Admins answer
# from admin → Support; the writer sees the reply on the Help page and by email.

SUPPORT_TOPICS = {"create", "ai", "conduct", "results", "account", "other"}
SUPPORT_BUCKET = "support-uploads"
MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024
# Columns that existed before 20261018150000_support_help.sql, for a backend deployed ahead of the SQL.
_BASE_COLUMNS = ("name", "email", "phone", "message", "user_id")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_DATA_URL_RE = re.compile(r"^data:image/(png|jpeg|webp);base64,(.+)$", re.DOTALL)
_MAGIC = {"png": b"\x89PNG", "jpeg": b"\xff\xd8"}


class SupportMessage(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    message: str
    topic: Optional[str] = None
    # Small facts from the browser: page they came from, screen size.
    context: Optional[Dict[str, Any]] = None
    # data:image/...;base64,... — the Help page shrinks it to a JPEG first.
    screenshot: Optional[str] = None


def _clean_context(ctx: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in list((ctx or {}).items())[:10]:
        if isinstance(value, (str, int, float, bool)) and len(str(key)) <= 40:
            out[str(key)] = value[:300] if isinstance(value, str) else value
    return out


def _decode_screenshot(data_url: str) -> Tuple[bytes, str]:
    match = _DATA_URL_RE.match(data_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail="The screenshot must be a PNG, JPEG or WebP image.")
    kind = match.group(1)
    try:
        raw = base64.b64decode(match.group(2), validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="The screenshot couldn't be read. Try attaching it again.")
    if len(raw) > MAX_SCREENSHOT_BYTES:
        raise HTTPException(status_code=400, detail="That screenshot is too large. Please attach one under 4 MB.")
    magic_ok = raw[:12][8:12] == b"WEBP" if kind == "webp" else raw.startswith(_MAGIC[kind])
    if not magic_ok:
        raise HTTPException(status_code=400, detail="The screenshot must be a PNG, JPEG or WebP image.")
    return raw, kind


def _missing_column(err: Exception) -> bool:
    text = str(err)
    return "PGRST204" in text or "42703" in text or ("column" in text.lower() and "does not exist" in text.lower())


def _signed_url(db: Client, path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    try:
        signed = db.storage.from_(SUPPORT_BUCKET).create_signed_url(path, 3600)
        if isinstance(signed, dict):
            return signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
    except Exception as err:
        logger.warning("support screenshot %s could not be signed: %s", path, err)
    return None


@router.post("/message", dependencies=[Depends(check_support_rate_limit)])
def send_support_message(payload: SupportMessage, request: Request, db: Client = Depends(get_db)):
    message = (payload.message or "").strip()
    if len(message) < 3:
        raise HTTPException(status_code=400, detail="Please describe the problem in a few words.")
    if len(message) > 5000:
        raise HTTPException(status_code=400, detail="That message is very long. Please keep it under 5,000 characters.")

    user_id = get_optional_user_id(request, db)
    name = (payload.name or "").strip()[:120]
    email = (payload.email or "").strip()[:200]
    if user_id:
        # The account's own email wins: it is where the reply has to land.
        try:
            prof = db.table("profiles").select("full_name, email").eq("id", user_id).limit(1).execute()
            row = (prof.data or [{}])[0]
            name = name or (row.get("full_name") or "").strip()
            email = (row.get("email") or "").strip() or email
        except Exception as err:
            logger.warning("support message: profile lookup failed: %s", err)
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please add your email so we can reply.")
    name = name or email.split("@")[0]

    record: Dict[str, Any] = {
        "name": name,
        "email": email,
        "phone": (payload.phone or "").strip()[:30] or None,
        "message": message,
        "user_id": user_id,
        "topic": payload.topic if payload.topic in SUPPORT_TOPICS else None,
        "context": _clean_context(payload.context),
        "user_agent": (request.headers.get("user-agent") or "")[:300] or None,
        "source": "app" if user_id else "public",
        "status": "pending",
    }

    if payload.screenshot:
        raw, kind = _decode_screenshot(payload.screenshot)
        path = f"{datetime.now(timezone.utc):%Y/%m}/{uuid.uuid4().hex}.{'jpg' if kind == 'jpeg' else kind}"
        try:
            db.storage.from_(SUPPORT_BUCKET).upload(path, raw, file_options={"content-type": f"image/{kind}"})
            record["screenshot_path"] = path
        except Exception as err:
            # The words matter more than the picture: save the message anyway and say so.
            logger.error("support screenshot upload failed: %s", err)
            record["context"]["screenshot"] = "upload failed"

    try:
        try:
            response = db.table("support_messages").insert(record).execute()
        except Exception as err:
            if not _missing_column(err):
                raise
            logger.warning("support_messages is missing the Help columns; run 20261018150000_support_help.sql")
            response = db.table("support_messages").insert({k: record[k] for k in _BASE_COLUMNS}).execute()
    except Exception as e:
        logger.error(f"Error saving support message: {e}")
        raise HTTPException(status_code=500, detail="We couldn't send your message. Please try again, or WhatsApp us.")

    saved = (response.data or [{}])[0]
    support_mail.on_new_message_in_background(db, {**record, **saved})
    return {"success": True, "id": saved.get("id"), "email": email}


# ── Conversation (support_replies, 20261018170000_support_threads.sql) ─────────

def _threads(db: Client, message_ids: List[str]) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    """Each message's back-and-forth, oldest first. None when support_replies isn't there yet."""
    if not message_ids:
        return {}
    try:
        res = (db.table("support_replies").select("id, message_id, author, body, created_at")
               .in_("message_id", message_ids).order("created_at").execute())
    except Exception as err:
        logger.warning("support_replies unavailable (run 20261018170000_support_threads.sql): %s", err)
        return None
    out: Dict[str, List[Dict[str, Any]]] = {}
    for r in res.data or []:
        out.setdefault(r["message_id"], []).append({k: r.get(k) for k in ("id", "author", "body", "created_at")})
    return out


def _attach_threads(db: Client, rows: List[Dict[str, Any]]) -> None:
    threads = _threads(db, [r["id"] for r in rows if r.get("id")])
    for r in rows:
        if threads is not None:
            r["thread"] = threads.get(r["id"], [])
        elif r.get("reply"):
            # Before the threads table: the single reply column is the whole conversation.
            r["thread"] = [{"id": f"{r['id']}-reply", "author": "team", "body": r["reply"],
                            "created_at": r.get("replied_at") or r.get("created_at")}]
        else:
            r["thread"] = []


def _add_reply(db: Client, message_id: str, author: str, author_id: Optional[str], body: str) -> Dict[str, Any]:
    """Append a turn to the conversation. Raises when support_replies is missing."""
    res = db.table("support_replies").insert(
        {"message_id": message_id, "author": author, "author_id": author_id, "body": body}
    ).execute()
    row = (res.data or [{}])[0]
    return {k: row.get(k) for k in ("id", "author", "body", "created_at")}


def _touch(db: Client, message_id: str, update: Dict[str, Any]) -> None:
    """Update a message and move it to the top of the inbox."""
    stamped = {**update, "last_activity_at": datetime.now(timezone.utc).isoformat()}
    try:
        db.table("support_messages").update(stamped).eq("id", message_id).execute()
    except Exception as err:
        if not _missing_column(err):
            raise
        db.table("support_messages").update(update).eq("id", message_id).execute()


def _mark_team_notifications_read(db: Client, message_id: str) -> None:
    """An answered message stops showing as unread in admin → Notifications."""
    try:
        db.table("notifications").update({"read": True, "is_read": True}).like("link", f"%id={message_id}%").execute()
    except Exception as err:
        logger.debug("could not mark support notifications read: %s", err)


@router.get("/mine")
def my_support_messages(request: Request, db: Client = Depends(get_db)):
    """The signed-in user's own conversations, newest first."""
    user_id = verify_auth_token(request, db)
    table = db.table("support_messages")
    try:
        res = (table.select("id, created_at, topic, message, status, reply, replied_at")
               .eq("user_id", user_id).order("created_at", desc=True).limit(20).execute())
    except Exception as err:
        if not _missing_column(err):
            raise HTTPException(status_code=500, detail="Couldn't load your messages.")
        res = (table.select("id, created_at, message, status")
               .eq("user_id", user_id).order("created_at", desc=True).limit(20).execute())
    rows = res.data or []
    _attach_threads(db, rows)
    return {"messages": rows}


class SupportFollowup(BaseModel):
    message: str


@router.post("/messages/{message_id}/reply")
def user_followup(message_id: str, payload: SupportFollowup, request: Request, db: Client = Depends(get_db)):
    """The writer answers back from their Help page; the message goes back to "waiting"."""
    user_id = verify_auth_token(request, db)
    check_support_reply_limit(user_id)
    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Write a reply first.")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Please keep it under 5,000 characters.")

    found = db.table("support_messages").select("*").eq("id", message_id).limit(1).execute()
    msg = (found.data or [None])[0]
    if not msg or msg.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Message not found.")

    try:
        turn = _add_reply(db, message_id, "user", user_id, text)
    except Exception as err:
        logger.error("support follow-up not saved: %s", err)
        raise HTTPException(status_code=503, detail="Couldn't send that. Please send it as a new message.")
    _touch(db, message_id, {"status": "pending", "resolved_at": None, "resolved_by": None})
    support_mail.on_user_followup_in_background(db, msg, text)
    return {"success": True, "reply": turn}


# ── Admin → Support ───────────────────────────────────────────────────────────

SUPPORT_VIEWS = ("open", "replied", "resolved", "all")


def _apply_view(query, view: str):
    if view == "open":
        return query.or_("status.is.null,status.eq.pending")
    if view in ("replied", "resolved"):
        return query.eq("status", view)
    return query


@router.get("/admin/messages")
def admin_support_messages(
    request: Request, view: str = "open", limit: int = 30, offset: int = 0, db: Client = Depends(get_db),
):
    verify_is_admin(request, db)
    view = view if view in SUPPORT_VIEWS else "open"
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    def page(order_col: str):
        return (_apply_view(db.table("support_messages").select("*", count="exact"), view)
                .order(order_col, desc=True).range(offset, offset + limit - 1).execute())

    try:
        res = page("last_activity_at")  # whoever spoke last comes first
    except Exception as err:
        if not _missing_column(err):
            raise
        res = page("created_at")
    rows = res.data or []

    counts: Dict[str, int] = {}
    for v in SUPPORT_VIEWS:
        head = _apply_view(db.table("support_messages").select("id", count="exact", head=True), v).execute()
        counts[v] = int(head.count or 0)

    _enrich(db, rows)
    return {"rows": rows, "total": int(res.count or 0), "counts": counts, "emails_on": support_mail.smtp_configured()}


@router.get("/admin/messages/{message_id}")
def admin_support_message(message_id: str, request: Request, db: Client = Depends(get_db)):
    """One conversation, for a notification that opens it directly."""
    verify_is_admin(request, db)
    found = db.table("support_messages").select("*").eq("id", message_id).limit(1).execute()
    if not found.data:
        raise HTTPException(status_code=404, detail="Message not found.")
    rows = [found.data[0]]
    _enrich(db, rows)
    return {**rows[0], "emails_on": support_mail.smtp_configured()}


def _enrich(db: Client, rows: List[Dict[str, Any]]) -> None:
    """Screenshot link, the writer's account and the conversation, for admin."""
    _attach_threads(db, rows)
    user_ids = list({r["user_id"] for r in rows if r.get("user_id")})
    profiles: Dict[str, Dict[str, Any]] = {}
    tests_by_user: Dict[str, int] = {}
    if user_ids:
        prof = (db.table("profiles").select("id, full_name, avatar_url, designation, created_at")
                .in_("id", user_ids).execute())
        profiles = {p["id"]: p for p in (prof.data or [])}
        # Who is writing: a teacher with 20 tests is a different conversation from one with none.
        for uid in user_ids:
            head = db.table("tests").select("id", count="exact", head=True).eq("created_by", uid).execute()
            tests_by_user[uid] = int(head.count or 0)

    for r in rows:
        r["screenshot_url"] = _signed_url(db, r.get("screenshot_path"))
        uid = r.get("user_id")
        if uid:
            p = profiles.get(uid) or {}
            r["account"] = {
                "full_name": p.get("full_name"),
                "avatar_url": p.get("avatar_url"),
                "designation": p.get("designation"),
                "joined_at": p.get("created_at"),
                "tests": tests_by_user.get(uid, 0),
            }


class SupportReply(BaseModel):
    reply: str
    resolve: bool = False


@router.post("/admin/messages/{message_id}/reply")
def admin_reply_support_message(
    message_id: str, payload: SupportReply, request: Request, db: Client = Depends(get_db),
):
    admin_id = verify_is_admin(request, db)
    text = (payload.reply or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Write a reply first.")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Keep the reply under 5,000 characters.")

    found = db.table("support_messages").select("*").eq("id", message_id).limit(1).execute()
    if not found.data:
        raise HTTPException(status_code=404, detail="Message not found.")
    msg = found.data[0]

    now = datetime.now(timezone.utc).isoformat()
    try:
        turn = _add_reply(db, message_id, "team", admin_id, text)
    except Exception as err:
        # Before 20261018170000_support_threads.sql the reply column below is the record.
        logger.warning("support_replies insert failed: %s", err)
        turn = {"id": f"{message_id}-reply", "author": "team", "body": text, "created_at": now}

    # `reply` keeps the latest answer for anything that still reads the single column.
    update: Dict[str, Any] = {"reply": text, "replied_at": now, "status": "resolved" if payload.resolve else "replied"}
    if payload.resolve:
        update.update({"resolved_at": now, "resolved_by": admin_id})
    try:
        _touch(db, message_id, update)
    except Exception as err:
        if _missing_column(err):
            raise HTTPException(status_code=409, detail="Run supabase/migrations/20261018150000_support_help.sql first.")
        raise HTTPException(status_code=500, detail="Couldn't save the reply.")
    _mark_team_notifications_read(db, message_id)

    notified = False
    if msg.get("user_id"):
        try:
            db.table("notifications").insert({
                "user_id": msg["user_id"],
                "title": "TestoZa replied to your message",
                "message": text[:160],
                "link": "/help",
            }).execute()
            notified = True
        except Exception as err:
            logger.warning("support reply notification failed: %s", err)

    emailed = support_mail.smtp_configured() and bool(msg.get("email"))
    if emailed:
        support_mail.send_reply_in_background(msg["email"], msg.get("name"), msg.get("message") or "", text)

    return {"success": True, "status": update["status"], "notified": notified, "emailed": emailed, "reply": turn}


class SupportStatus(BaseModel):
    status: str


@router.patch("/admin/messages/{message_id}")
def admin_set_support_status(
    message_id: str, payload: SupportStatus, request: Request, db: Client = Depends(get_db),
):
    admin_id = verify_is_admin(request, db)
    if payload.status not in ("pending", "resolved"):
        raise HTTPException(status_code=400, detail="Status must be pending or resolved.")
    resolved = payload.status == "resolved"
    update = {
        "status": payload.status,
        "resolved_at": datetime.now(timezone.utc).isoformat() if resolved else None,
        "resolved_by": admin_id if resolved else None,
    }
    res = db.table("support_messages").update(update).eq("id", message_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Message not found.")
    if resolved:
        _mark_team_notifications_read(db, message_id)
    return {"success": True, "status": payload.status}

# ── Platform feedback (20261024150000_platform_feedback.sql) ──────────────────
# The sidebar's Feedback page and the card that comes up after a creator stops a live exam
# both send here: up to three short notes (Online exam, Generate with AI, Other).
# Admins read them in admin → Support → Feedback.

FEEDBACK_SOURCES = {"sidebar", "exam_ended"}
FEEDBACK_MAX = 2000
_UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")


class PlatformFeedback(BaseModel):
    ai: Optional[str] = None
    conduct: Optional[str] = None
    other: Optional[str] = None
    source: Optional[str] = None
    exam_id: Optional[str] = None
    exam_title: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


def _part(text: Optional[str]) -> Optional[str]:
    text = (text or "").strip()
    return text[:FEEDBACK_MAX] if text else None


@router.post("/platform-feedback", dependencies=[Depends(check_support_rate_limit)])
def send_platform_feedback(payload: PlatformFeedback, request: Request, db: Client = Depends(get_db)):
    parts = {"ai": _part(payload.ai), "conduct": _part(payload.conduct), "other": _part(payload.other)}
    if not any(parts.values()):
        raise HTTPException(status_code=400, detail="Write a few words in any part first.")

    user_id = get_optional_user_id(request, db)
    source = payload.source if payload.source in FEEDBACK_SOURCES else "sidebar"
    after_exam = source == "exam_ended"
    exam_id = payload.exam_id if after_exam and payload.exam_id and _UUID_RE.match(payload.exam_id) else None
    exam_title = (payload.exam_title or "").strip()[:200] if after_exam else ""
    record: Dict[str, Any] = {
        **parts,
        "user_id": user_id,
        "source": source,
        "exam_id": exam_id,
        "exam_title": exam_title or None,
        "context": _clean_context(payload.context),
        "user_agent": (request.headers.get("user-agent") or "")[:300] or None,
    }
    try:
        res = db.table("platform_feedback").insert(record).execute()
    except Exception as err:
        logger.error("platform feedback not saved (run 20261024150000_platform_feedback.sql?): %s", err)
        raise HTTPException(status_code=503, detail="We couldn't send your feedback. Please try again.")

    saved = {**record, **((res.data or [{}])[0])}
    who = "Someone signed out"
    if user_id:
        try:
            prof = db.table("profiles").select("full_name, email").eq("id", user_id).limit(1).execute()
            row = (prof.data or [{}])[0]
            who = (row.get("full_name") or "").strip() or (row.get("email") or "").split("@")[0] or "A creator"
        except Exception as err:
            logger.debug("platform feedback: profile lookup failed: %s", err)
    support_mail.on_platform_feedback_in_background(db, saved, who)
    return {"success": True, "id": saved.get("id")}


FEEDBACK_VIEWS = ("unread", "all")


@router.get("/admin/feedback")
def admin_platform_feedback(
    request: Request, view: str = "all", limit: int = 30, offset: int = 0, db: Client = Depends(get_db),
):
    verify_is_admin(request, db)
    view = view if view in FEEDBACK_VIEWS else "all"
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    def scoped(query, v: str):
        return query.is_("read_at", "null") if v == "unread" else query

    try:
        res = (scoped(db.table("platform_feedback").select("*", count="exact"), view)
               .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
    except Exception as err:
        logger.error("platform_feedback unavailable (run 20261024150000_platform_feedback.sql): %s", err)
        raise HTTPException(status_code=503, detail="Run supabase/migrations/20261024150000_platform_feedback.sql first.")
    rows = res.data or []
    counts = {
        v: int(scoped(db.table("platform_feedback").select("id", count="exact", head=True), v).execute().count or 0)
        for v in FEEDBACK_VIEWS
    }

    user_ids = list({r["user_id"] for r in rows if r.get("user_id")})
    if user_ids:
        prof = (db.table("profiles").select("id, full_name, email, avatar_url, designation")
                .in_("id", user_ids).execute())
        profiles = {p["id"]: p for p in (prof.data or [])}
        for r in rows:
            p = profiles.get(r.get("user_id")) or {}
            if p:
                r["account"] = {k: p.get(k) for k in ("full_name", "email", "avatar_url", "designation")}
    return {"rows": rows, "total": int(res.count or 0), "counts": counts}


class FeedbackRead(BaseModel):
    read: bool = True


@router.patch("/admin/feedback/{feedback_id}")
def admin_mark_platform_feedback(
    feedback_id: str, payload: FeedbackRead, request: Request, db: Client = Depends(get_db),
):
    verify_is_admin(request, db)
    stamp = datetime.now(timezone.utc).isoformat() if payload.read else None
    res = db.table("platform_feedback").update({"read_at": stamp}).eq("id", feedback_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Feedback not found.")
    if payload.read:
        try:
            db.table("notifications").update({"read": True, "is_read": True}).like("link", f"%id={feedback_id}%").execute()
        except Exception as err:
            logger.debug("could not mark feedback notifications read: %s", err)
    return {"success": True, "read_at": stamp}


class ExitFeedbackCreate(BaseModel):
    test_id: str
    experience: str
    user_id: Optional[str] = None

@router.post("/exit-feedback", dependencies=[Depends(check_support_rate_limit)])
def submit_exit_feedback(payload: ExitFeedbackCreate, db: Client = Depends(get_db)):
    try:
        data_to_insert = {
            "test_id": payload.test_id,
            "experience": payload.experience
        }
        
        # Try to get user info if they are logged in
        if payload.user_id:
            data_to_insert["user_id"] = payload.user_id
        else:
            try:
                res = db.auth.get_user()
                if res and res.user:
                    data_to_insert["user_id"] = res.user.id
            except Exception:
                pass
                
        response = db.table("exit_feedback").insert(data_to_insert).execute()
        
        # Add Notification for Admins
        try:
            # 1. Fetch all admin emails
            admin_emails_res = admin_db.table("admins").select("email").execute()
            admin_emails = [a["email"] for a in admin_emails_res.data] if admin_emails_res.data else []
            
            if admin_emails:
                # 2. Find corresponding user IDs in profiles
                admins_res = admin_db.table("profiles").select("id").in_("email", admin_emails).execute()
                admin_ids = [a["id"] for a in admins_res.data] if admins_res.data else []
                
                # 3. Insert notification for each admin
                if admin_ids:
                    notifications = [
                        {
                            "user_id": aid,
                            "title": "New Exit Feedback",
                            "message": f"A user reported an issue/experience during a test: {payload.experience[:50]}...",
                            "link": "/admin/feedback" # Assuming an admin feedback view exists or will exist
                        } for aid in admin_ids
                    ]
                    admin_db.table("notifications").insert(notifications).execute()
        except Exception as ne:
            logger.error(f"Failed to create admin notifications: {ne}")
            
        return response.data[0] if response.data else {"success": True}
    except Exception as e:
        logger.error(f"Error submitting exit feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
