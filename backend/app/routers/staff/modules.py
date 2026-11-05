"""
What employees can open on team.testoza.com: one route group per permission.

  GET   /api/staff/inbox                               inbox.view
  GET   /api/staff/support/messages                    support.view
  GET   /api/staff/support/messages/{id}               support.view   (logged: who opened what)
  POST  /api/staff/support/messages/{id}/reply         support.reply
  PATCH /api/staff/support/messages/{id}               support.reply
  GET   /api/staff/feedback                            feedback.view
  GET   /api/staff/analytics/overview | /growth        analytics.view
  GET   /api/staff/email/campaigns                     email.view

Data minimisation: help writers' email and phone are masked unless support.contact is
ticked; feedback and the inbox carry names, never contact details; analytics are the
same aggregate reports admin sees (no people list, no sessions); email history has no
recipient lists.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from supabase import Client

from app.core.database import get_db
from app.routers import support as support_core
from app.routers.analytics import insights
from app.utils.rate_limiter import RateLimiter

from .deps import StaffContext, require_staff, staff_audit

router = APIRouter()

# Plenty for a support shift; slows a hijacked session that tries to spam every writer.
reply_per_staff = RateLimiter(requests=60, window=3600, name="staff_support_reply")

SUPPORT_LIST_COLS = ("id, created_at, last_activity_at, name, email, phone, topic, message, status, "
                     "user_id, source, replied_at, resolved_at")
SNIPPET = 160


# ── masking ─────────────────────────────────────────────────────────────────────
def mask_email(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return None
    local, _, domain = email.partition("@")
    return f"{local[:2]}•••@{domain}"


def mask_phone(phone: Optional[str]) -> Optional[str]:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    return f"••••• {digits[-2:]}" if len(digits) >= 6 else None


def _contact(row: Dict[str, Any], ctx: StaffContext) -> None:
    if ctx.has("support.contact"):
        return
    row["email"] = mask_email(row.get("email"))
    row["phone"] = mask_phone(row.get("phone"))
    row["contact_masked"] = True


def _snippet(text: Optional[str]) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= SNIPPET else text[:SNIPPET - 1] + "…"


# ── inbox ───────────────────────────────────────────────────────────────────────
def _count(db: Client, table: str, build) -> int:
    try:
        res = build(db.table(table).select("id", count="exact", head=True)).execute()
        return int(res.count or 0)
    except Exception:
        return 0


def _names(db: Client, user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    ids = list({u for u in user_ids if u})
    if not ids:
        return {}
    rows = db.table("profiles").select("id, full_name, designation").in_("id", ids).execute().data or []
    return {r["id"]: r for r in rows}


@router.get("/inbox")
def inbox(request: Request, ctx: StaffContext = Depends(require_staff("inbox.view")), db: Client = Depends(get_db)):
    """New help messages and feedback, newest first, with waiting counts for the badge."""
    waiting = (_count(db, "support_messages", lambda q: q.is_("status", "null"))
               + _count(db, "support_messages", lambda q: q.eq("status", "pending")))
    unread_feedback = _count(db, "platform_feedback", lambda q: q.is_("read_at", "null"))

    events: List[Dict[str, Any]] = []
    cols = "id, created_at, last_activity_at, name, topic, message, status"
    try:
        msgs = support_core._first_working(
            lambda: db.table("support_messages").select(cols + ", user_deleted_at")
            .order("created_at", desc=True).limit(25).execute(),
            lambda: db.table("support_messages").select(cols).order("created_at", desc=True).limit(25).execute(),
        ).data or []
    except Exception:
        msgs = []
    for m in msgs:
        events.append({
            "kind": "support", "id": m["id"], "at": m.get("last_activity_at") or m.get("created_at"),
            "title": m.get("name") or "Someone", "topic": m.get("topic"), "text": _snippet(m.get("message")),
            "status": m.get("status") or "pending", "deleted": bool(m.get("user_deleted_at")),
        })
    try:
        fb = (db.table("platform_feedback").select("id, created_at, user_id, rating, source, exam_title, ai, conduct, other, read_at")
              .order("created_at", desc=True).limit(25).execute().data or [])
    except Exception:
        fb = []
    names = _names(db, [f.get("user_id") for f in fb])
    for f in fb:
        text = " · ".join(t for t in (f.get("conduct"), f.get("ai"), f.get("other")) if t)
        events.append({
            "kind": "feedback", "id": f["id"], "at": f.get("created_at"),
            "title": (names.get(f.get("user_id")) or {}).get("full_name") or "An educator",
            "rating": f.get("rating"), "source": f.get("source"), "exam_title": f.get("exam_title"),
            "text": _snippet(text), "unread": not f.get("read_at"),
        })
    events.sort(key=lambda e: e.get("at") or "", reverse=True)
    return {
        "counts": {"support_waiting": waiting, "feedback_unread": unread_feedback},
        "events": events[:40],
        "can_open": {"support": ctx.has("support.view"), "feedback": ctx.has("feedback.view")},
    }


# ── support ─────────────────────────────────────────────────────────────────────
VIEWS = ("open", "replied", "resolved", "all")


def _support_page(db: Client, view: str, limit: int, offset: int):
    def run(cols: str, order_col: str):
        q = db.table("support_messages").select(cols, count="exact")
        q = support_core._apply_view(q, view)
        return q.order(order_col, desc=True).range(offset, offset + limit - 1).execute()
    return support_core._first_working(
        lambda: run(SUPPORT_LIST_COLS + ", user_deleted_at", "last_activity_at"),
        lambda: run(SUPPORT_LIST_COLS, "last_activity_at"),  # before 20261105180000_support_user_delete.sql
        lambda: run(SUPPORT_LIST_COLS, "created_at"),
    )


@router.get("/support/messages")
def support_list(request: Request, view: str = "open", limit: int = Query(30, ge=1, le=100),
                 offset: int = Query(0, ge=0), ctx: StaffContext = Depends(require_staff("support.view")),
                 db: Client = Depends(get_db)):
    view = view if view in VIEWS else "open"
    res = _support_page(db, view, limit, offset)
    rows = res.data or []
    for r in rows:
        r["message"] = _snippet(r.get("message"))
        _contact(r, ctx)
    counts = {
        "open": _count(db, "support_messages", lambda q: q.is_("status", "null"))
                + _count(db, "support_messages", lambda q: q.eq("status", "pending")),
        "replied": _count(db, "support_messages", lambda q: q.eq("status", "replied")),
        "resolved": _count(db, "support_messages", lambda q: q.eq("status", "resolved")),
    }
    counts["all"] = counts["open"] + counts["replied"] + counts["resolved"]
    return {"rows": rows, "total": int(res.count or 0), "counts": counts,
            "can_reply": ctx.has("support.reply"), "emails_on": support_core.support_mail.smtp_configured()}


def _support_one(db: Client, message_id: str) -> Dict[str, Any]:
    found = db.table("support_messages").select("*").eq("id", message_id).limit(1).execute()
    if not found.data:
        raise HTTPException(status_code=404, detail="Message not found.")
    rows = [found.data[0]]
    support_core._enrich(db, rows)
    row = rows[0]
    # The writer's other conversations: messages and dates only, no contact details.
    row["history"] = support_core.writer_history(db, row)
    row.pop("screenshot_path", None)
    row.pop("resolved_by", None)
    return row


@router.get("/support/messages/{message_id}")
def support_open(message_id: str, request: Request, ctx: StaffContext = Depends(require_staff("support.view")),
                 db: Client = Depends(get_db)):
    row = _support_one(db, message_id)
    _contact(row, ctx)
    staff_audit(db, request, ctx, "support.open", target_type="support_message", target_id=message_id,
                detail={"contact_visible": ctx.has("support.contact")})
    return {**row, "can_reply": ctx.has("support.reply"), "emails_on": support_core.support_mail.smtp_configured()}


class ReplyBody(BaseModel):
    reply: str
    resolve: bool = False


@router.post("/support/messages/{message_id}/reply")
def support_reply(message_id: str, body: ReplyBody, request: Request,
                  ctx: StaffContext = Depends(require_staff("support.reply")), db: Client = Depends(get_db)):
    allowed, _, reset_in = reply_per_staff.check(ctx.id)
    if not allowed:
        raise HTTPException(status_code=429, detail=f"That's a lot of replies. Try again in {max(1, reset_in // 60)} minutes.",
                            headers={"Retry-After": str(reset_in)})
    result = support_core.team_reply(db, message_id, body.reply, body.resolve, staff_id=ctx.id)
    staff_audit(db, request, ctx, "support.reply", target_type="support_message", target_id=message_id,
                detail={"resolve": body.resolve, "chars": len((body.reply or "").strip()),
                        "emailed": result.get("emailed")})
    return result


class StatusBody(BaseModel):
    status: str


@router.patch("/support/messages/{message_id}")
def support_status(message_id: str, body: StatusBody, request: Request,
                   ctx: StaffContext = Depends(require_staff("support.reply")), db: Client = Depends(get_db)):
    result = support_core.team_set_status(db, message_id, body.status, staff_id=ctx.id)
    staff_audit(db, request, ctx, "support.status", target_type="support_message", target_id=message_id,
                detail={"status": body.status})
    return result


# ── feedback ────────────────────────────────────────────────────────────────────
@router.get("/feedback")
def feedback(request: Request, limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
             ctx: StaffContext = Depends(require_staff("feedback.view")), db: Client = Depends(get_db)):
    res = (db.table("platform_feedback")
           .select("id, created_at, user_id, rating, source, exam_title, ai, conduct, other, read_at", count="exact")
           .order("created_at", desc=True).range(offset, offset + limit - 1).execute())
    rows = res.data or []
    names = _names(db, [r.get("user_id") for r in rows])
    for r in rows:
        who = names.get(r.get("user_id")) or {}
        r["name"] = who.get("full_name")
        r["designation"] = who.get("designation")
        r.pop("user_id", None)
    return {"rows": rows, "total": int(res.count or 0)}


# ── analytics (aggregate reports only) ──────────────────────────────────────────
STAFF_PERIODS = ("today", "yesterday", "7d", "30d", "90d", "12m")


def _period(period: str, default: str) -> str:
    return period if period in STAFF_PERIODS else default


@router.get("/analytics/overview")
def analytics_overview(request: Request, period: str = "7d", site: str = "all",
                       ctx: StaffContext = Depends(require_staff("analytics.view")), db: Client = Depends(get_db)):
    period = _period(period, "7d")
    staff_audit(db, request, ctx, "analytics.view", detail={"report": "overview", "period": period})
    return insights.overview(period=period, site=site if site in insights.SITES else "all", start=None, end=None)


@router.get("/analytics/growth")
def analytics_growth(request: Request, period: str = "30d",
                     ctx: StaffContext = Depends(require_staff("analytics.view")), db: Client = Depends(get_db)):
    period = _period(period, "30d")
    staff_audit(db, request, ctx, "analytics.view", detail={"report": "growth", "period": period})
    return insights.growth(period=period, start=None, end=None)


# ── email history (read-only) ───────────────────────────────────────────────────
@router.get("/email/campaigns")
def email_campaigns(request: Request, limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
                    ctx: StaffContext = Depends(require_staff("email.view")), db: Client = Depends(get_db)):
    try:
        data = db.rpc("email_report_campaigns", {"p_limit": limit, "p_offset": offset}).execute().data or {}
    except Exception as err:
        raise HTTPException(status_code=503, detail="Email history isn't available right now.") from err
    staff_audit(db, request, ctx, "email.view", detail={"offset": offset})
    keep = ("id", "name", "subject", "audience_label", "status", "planned", "from_name", "created_at",
            "finished_at", "sent", "failed", "came_back", "made_test", "unsubscribed", "clicked")
    rows = [{k: r.get(k) for k in keep if k in r} for r in (data.get("rows") or [])]
    return {"rows": rows, "total": data.get("total") or 0,
            "as_of": datetime.now(timezone.utc).isoformat()}
