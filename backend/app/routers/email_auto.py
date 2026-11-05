"""
/api/email-broadcast/auto — admin → Email → Automatic (frontend-admin/src/pages/email/AutomaticTab.tsx).

  GET   /auto                 every automatic email: on/off, sent today / 7 / 30 days / ever,
                              failed, skipped, clicks (30 days), last sent; the 14-day total;
                              which service sends them (Amazon SES, Brevo fallback)
  GET   /auto/log             the latest automatic emails, filterable by kind, status and address
  PATCH /auto/{kind}          switch one on or off
  POST  /auto/{kind}/preview  the email with sample details
  POST  /auto/{kind}/test     send that sample to one address (not counted)

The emails themselves: services/auto_email.py (triggers, guards) and auto_email_content.py (text).
Counts come from SQL email_auto_report() (20261102120000_email_automatic.sql); before it is
applied the page says so and every email is on.
"""

import logging
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.core.auth import verify_is_admin
from app.core.database import get_db
from app.services import auto_email, auto_email_content, mailer

logger = logging.getLogger(__name__)

router = APIRouter()

MIGRATION = "supabase/migrations/20261102120000_email_automatic.sql"
EMPTY = {"today": 0, "week": 0, "month": 0, "total": 0, "failed": 0, "skipped": 0, "last_at": None, "clicked": 0}


class Toggle(BaseModel):
    enabled: bool


class TestSend(BaseModel):
    to: EmailStr


def _kind(kind: str) -> str:
    if kind not in auto_email.KINDS:
        raise HTTPException(status_code=404, detail="No such automatic email")
    return kind


def _missing(exc: Exception) -> bool:
    return any(s in str(exc) for s in ("PGRST202", "PGRST205", "Could not find the function", "does not exist"))


# Plain functions behind the admin routes, shared with team.testoza.com (routers/staff/email.py).
def auto_report(db: Client) -> Dict[str, Any]:
    installed = True
    report: Dict[str, Any] = {}
    try:
        report = db.rpc("email_auto_report", {}).execute().data or {}
    except Exception as exc:
        if not _missing(exc):
            logger.error("email_auto_report failed: %s", str(exc)[:300])
            raise HTTPException(status_code=502, detail="The email database query failed")
        installed = False
    stored = report.get("settings") or {}
    counts = report.get("kinds") or {}
    from app.routers.email_broadcast import _sns_topics

    kinds = [{
        "key": k, **auto_email.KINDS[k],
        "enabled": bool(stored.get(k, True)),
        **{**EMPTY, **(counts.get(k) or {})},
    } for k in auto_email.ORDER]
    return {
        "installed": installed,
        "migration": MIGRATION,
        "kinds": kinds,
        "daily": report.get("daily") or [],
        "transport": {**mailer.status(), "bounce_reports": bool(_sns_topics())},
    }


@router.get("/auto")
def overview(request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    return auto_report(db)


def auto_log(db: Client, kind: Optional[str], status: Optional[str], q: Optional[str],
             limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    try:
        query = db.table("email_auto_log").select(
            "id, kind, email, subject, status, error, provider, milestone, test_id, user_id, created_at", count="exact")
        if kind:
            query = query.eq("kind", _kind(kind))
        if status:
            query = query.eq("status", status)
        if q and q.strip():
            query = query.ilike("email", f"%{q.strip().lower()}%")
        lim = max(1, min(int(limit), 100))
        off = max(0, int(offset))
        res = query.order("created_at", desc=True).range(off, off + lim - 1).execute()
    except HTTPException:
        raise
    except Exception as exc:
        if _missing(exc):
            return {"rows": [], "total": 0, "installed": False}
        logger.error("auto email log read failed: %s", str(exc)[:300])
        raise HTTPException(status_code=502, detail="The email database query failed")
    return {"rows": res.data or [], "total": int(res.count or 0), "installed": True}


@router.get("/auto/log")
def log(request: Request, kind: Optional[str] = None, status: Optional[Literal["sent", "failed", "skipped"]] = None,
        q: Optional[str] = Query(None, max_length=120), limit: int = 50, offset: int = 0,
        db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    return auto_log(db, kind, status, q, limit, offset)


@router.patch("/auto/{kind}")
def toggle(kind: str, payload: Toggle, request: Request, db: Client = Depends(get_db)):
    admin_id = verify_is_admin(request, db)
    _kind(kind)
    try:
        auto_email.set_enabled(db, kind, payload.enabled, admin_id)
    except Exception as exc:
        if _missing(exc):
            raise HTTPException(status_code=409, detail=f"Run {MIGRATION} in Supabase first, then try again.")
        raise
    return {"key": kind, "enabled": payload.enabled}


def auto_preview(kind: str) -> Dict[str, Any]:
    mail = auto_email_content.sample(_kind(kind))
    return {"subject": mail["subject"], "preheader": mail["preheader"], "html": mail["html"], "text": mail["text"]}


@router.post("/auto/{kind}/preview")
def preview(kind: str, request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    return auto_preview(kind)


@router.post("/auto/{kind}/test")
def send_test(kind: str, payload: TestSend, request: Request, db: Client = Depends(get_db)):
    """The sample email to one address, through the same service the real ones use. Not logged or counted."""
    verify_is_admin(request, db)
    mail = auto_email_content.sample(_kind(kind))
    try:
        d = mailer.deliver(str(payload.to), f"[Test] {mail['subject']}", mail["html"], mail["text"],
                           from_name=auto_email.FROM_NAME,
                           headers={"Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "OOF, AutoReply"})
    except mailer.MailNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.warning("auto email test failed: %s", exc)
        # 409, not 5xx: the global handler hides 5xx details, and the admin needs the mail server's words.
        raise HTTPException(status_code=409, detail=f"The mail server said: {str(exc)[:200]}")
    return {"sent": True, "to": str(payload.to), "service": d.service, "fallback": d.provider == "fallback"}
