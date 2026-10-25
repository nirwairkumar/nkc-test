"""
/api/email-broadcast — admin → Email Broadcast (frontend-admin/src/pages/email/) and the
public unsubscribe page every broadcast links to.

How a send works:
  1. The admin picks an email and an audience. POST /audience shows who will get it and
     why the rest won't (SQL public.email_report_audience — every guard lives there).
  2. POST /campaigns freezes the email's text and the audience filter.
  3. The admin page calls POST /campaigns/{id}/send-next in a loop. Each call claims up to
     10 people in one SQL statement (email_claim_batch, so two admins can't double-send),
     sends them over one SMTP connection, and reports progress. The guards are checked
     again for every batch, so someone who unsubscribes mid-send is skipped.

Limits (environment, so a new admin can't loosen them):
  EMAIL_COOLDOWN_DAYS=7  · no second broadcast to a person within 7 days
  EMAIL_MONTHLY_CAP=3    · at most 3 broadcasts per person in 30 days
  EMAIL_HOURLY_LIMIT=40  · Zoho allows 50–500 an hour depending on reputation and forbids
                           bulk bursts from business mailboxes — stay well under
  EMAIL_DAILY_LIMIT=200
  EMAIL_REPLY_TO=support@testoza.com · EMAIL_FROM_NAME="Nirwair from TestoZa"
  EMAIL_SENDERS=alias@testoza.com,…  · extra From addresses: aliases of the SMTP mailbox only

runtime_smtp_config and send_smtp_message are also used by services/support_mail.py and
services/submission_email.py: keep their names and signatures.
"""

import html
import logging
import os
import re
import smtplib
import ssl
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, Field
from supabase import Client

from app.core.auth import verify_is_admin
from app.core.database import get_db
from app.services import email_library, email_render

logger = logging.getLogger(__name__)

router = APIRouter()

# SMTP settings: environment first; admin → Email Broadcast → Settings can replace them
# until the next restart (the password is never sent back to the browser).
# testoza.com mail is in Zoho's India data centre (MX mx.zoho.in), so its SMTP host is smtp.zoho.in.
runtime_smtp_config: Dict[str, Any] = {
    "host": os.getenv("SMTP_HOST", "smtp.zoho.in"),
    "port": int(os.getenv("SMTP_PORT", "465")),
    "user": os.getenv("SMTP_USER", "no-reply@testoza.com"),
    "password": os.getenv("SMTP_PASSWORD", ""),
    "from_name": os.getenv("SMTP_FROM_NAME", "TestoZa Team"),
    "use_ssl": True,
}


def _int_env(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, str(default))))
    except ValueError:
        return default


COOLDOWN_DAYS = _int_env("EMAIL_COOLDOWN_DAYS", 7)
MONTHLY_CAP = _int_env("EMAIL_MONTHLY_CAP", 3)
HOURLY_LIMIT = _int_env("EMAIL_HOURLY_LIMIT", 40)
DAILY_LIMIT = _int_env("EMAIL_DAILY_LIMIT", 200)
REPLY_TO = os.getenv("EMAIL_REPLY_TO", "support@testoza.com")
DEFAULT_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Nirwair from TestoZa")


def senders() -> List[str]:
    """
    From addresses that will work. Zoho only sends From the signed-in mailbox or its aliases
    ("Relaying disallowed" otherwise), and nirwair@ / support@ are separate mailboxes, so the
    list is the SMTP mailbox plus any aliases named in EMAIL_SENDERS (comma-separated).
    """
    user = (runtime_smtp_config.get("user") or "").strip().lower()
    extra = [a.strip().lower() for a in os.getenv("EMAIL_SENDERS", "").split(",") if a.strip()]
    out = ([user] if user else []) + [a for a in extra if a != user]
    return out or ["no-reply@testoza.com"]

STAGES = ("new", "drafted", "tried", "quiet", "active")
AUDIENCES = ("educator", "institution", "corporate", "student", "no_role")
NOT_INSTALLED = "email_broadcast_not_installed"


# ── SMTP ──────────────────────────────────────────────────────────────────────

class SmtpConfigRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    from_name: Optional[str] = "TestoZa Team"
    use_ssl: Optional[bool] = True


def get_active_smtp(override_config: Optional[SmtpConfigRequest] = None) -> Dict[str, Any]:
    if override_config:
        return {
            "host": override_config.host.strip(),
            "port": override_config.port,
            "user": override_config.user.strip(),
            "password": override_config.password.strip(),
            "from_name": (override_config.from_name or "TestoZa Team").strip(),
            "use_ssl": override_config.use_ssl if override_config.use_ssl is not None else (override_config.port == 465),
        }
    return runtime_smtp_config


def _smtp_ready(cfg: Dict[str, Any]) -> bool:
    return bool(cfg.get("user") and cfg.get("password"))


def build_message(
    sender_email: str, sender_name: str, recipient_email: str, subject: str, html_body: str,
    reply_to: Optional[str] = None, text_body: Optional[str] = None, headers: Optional[Dict[str, str]] = None,
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
    msg["To"] = recipient_email
    msg["Reply-To"] = reply_to or sender_email
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain="testoza.com")
    for k, v in (headers or {}).items():
        msg[k] = v
    text = text_body if text_body is not None else re.sub(r"<[^>]+>", "", html_body)
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def open_smtp(smtp_cfg: Dict[str, Any]) -> smtplib.SMTP:
    """A signed-in connection. Zoho needs the envelope sender to be the signed-in account."""
    if not _smtp_ready(smtp_cfg):
        raise ValueError("SMTP credentials missing. Add the Zoho app password in Email Broadcast → Settings.")
    host, port = smtp_cfg["host"], int(smtp_cfg["port"])
    if port == 465:
        server: smtplib.SMTP = smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=20)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
        server.ehlo()
        if server.has_extn("STARTTLS"):
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
    server.login(smtp_cfg["user"], smtp_cfg["password"])
    return server


def send_smtp_message(
    smtp_cfg: Dict[str, Any], sender_email: str, sender_name: str, recipient_email: str, subject: str,
    html_body: str, reply_to: Optional[str] = None, text_body: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
) -> None:
    msg = build_message(sender_email, sender_name, recipient_email, subject, html_body, reply_to, text_body, headers)
    server = open_smtp(smtp_cfg)
    try:
        server.sendmail(smtp_cfg["user"].strip(), [recipient_email], msg.as_string())
    finally:
        try:
            server.quit()
        except Exception:
            pass


# ── helpers ───────────────────────────────────────────────────────────────────

def _missing(text: str) -> bool:
    return any(s in text for s in ("PGRST202", "PGRST205", "Could not find the function", "Could not find the table",
                                   "does not exist"))


def _rpc(db: Client, fn: str, params: Dict[str, Any]) -> Any:
    try:
        return db.rpc(fn, params).execute().data
    except Exception as exc:
        text = str(exc)
        if _missing(text):
            # 424 so the admin page can show "run the migration" instead of a generic error.
            raise HTTPException(status_code=424, detail=NOT_INSTALLED)
        logger.error("email broadcast %s failed: %s", fn, text[:500])
        raise HTTPException(status_code=502, detail="The email database query failed")


def _table(db: Client, name: str):
    return db.table(name)


def _guard_params() -> Dict[str, int]:
    return {"p_cooldown": COOLDOWN_DAYS, "p_cap": MONTHLY_CAP}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


_library_checked: Dict[str, datetime] = {}


def ensure_library(db: Client, force: bool = False) -> None:
    """Copy built-in emails that aren't in email_templates yet. Edited rows are never touched."""
    last = _library_checked.get("at")
    if not force and last and _now() - last < timedelta(minutes=10):
        return
    try:
        have = {r["key"] for r in (_table(db, "email_templates").select("key").execute().data or [])}
    except Exception as exc:
        if _missing(str(exc)):
            raise HTTPException(status_code=424, detail=NOT_INSTALLED)
        raise
    missing = [email_library.as_row(t) for t in email_library.LIBRARY if t["key"] not in have]
    if missing:
        _table(db, "email_templates").insert(missing).execute()
    _library_checked["at"] = _now()


def _send_window(db: Client) -> Dict[str, Any]:
    """How many broadcasts went in the last hour / 24 hours, and when the hour frees up."""
    now = _now()
    rows = (
        _table(db, "email_sends").select("sent_at").in_("status", ["sending", "sent"])
        .gt("sent_at", _iso(now - timedelta(hours=24))).execute().data or []
    )
    times = sorted(datetime.fromisoformat(str(r["sent_at"]).replace("Z", "+00:00")) for r in rows if r.get("sent_at"))
    hour = [t for t in times if t > now - timedelta(hours=1)]
    return {
        "hour": len(hour),
        "day": len(times),
        "hour_free_at": _iso(hour[0] + timedelta(hours=1)) if len(hour) >= HOURLY_LIMIT and hour else None,
        "day_free_at": _iso(times[0] + timedelta(hours=24)) if len(times) >= DAILY_LIMIT and times else None,
    }


def _limits(db: Client) -> Dict[str, Any]:
    w = _send_window(db)
    return {
        "cooldown_days": COOLDOWN_DAYS,
        "monthly_cap": MONTHLY_CAP,
        "hourly_limit": HOURLY_LIMIT,
        "daily_limit": DAILY_LIMIT,
        "sent_last_hour": w["hour"],
        "sent_last_day": w["day"],
        "hour_free_at": w["hour_free_at"],
        "day_free_at": w["day_free_at"],
    }


def _sender_ok(addr: str) -> bool:
    a = (addr or "").strip().lower()
    return a in senders()


def _person(db: Client, user_id: Optional[str]) -> Dict[str, Any]:
    if not user_id:
        return dict(email_render.SAMPLE_PERSON)
    rows = _rpc(db, "email_people", {})
    for r in rows or []:
        if r.get("id") == user_id:
            return r
    raise HTTPException(status_code=404, detail="That person isn't in any audience")


def _suppress(db: Client, email: str, reason: str, user_id: Optional[str] = None, note: Optional[str] = None) -> None:
    e = (email or "").strip().lower()
    if not e:
        return
    existing = _table(db, "email_suppressions").select("email, reason").eq("email", e).limit(1).execute().data
    if existing:
        if reason == "unsubscribed" and existing[0].get("reason") != "unsubscribed":
            _table(db, "email_suppressions").update({"reason": reason}).eq("email", e).execute()
        return
    if not user_id:
        prof = _table(db, "profiles").select("id").eq("email", e).limit(1).execute().data
        user_id = prof[0]["id"] if prof else None
    try:
        _table(db, "email_suppressions").insert(
            {"email": e, "user_id": user_id, "reason": reason, "note": note}
        ).execute()
    except Exception as exc:  # a second click raced the first
        logger.info("suppression for %s already there: %s", e, exc)


def _clean_list(values: Optional[List[str]], allowed: tuple) -> List[str]:
    return [v for v in (values or []) if v in allowed]


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:40] or "email"


# ── models ────────────────────────────────────────────────────────────────────

class AudienceFilter(BaseModel):
    template: Optional[str] = None
    stages: List[str] = []
    whos: List[str] = []
    q: Optional[str] = Field(None, max_length=120)
    joined_within: Optional[int] = Field(None, ge=1, le=3650)
    quiet_for: Optional[int] = Field(None, ge=1, le=3650)
    show: Literal["all", "ready", "skipped"] = "all"

    def as_json(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {"show": self.show}
        if self.template:
            out["template"] = self.template
        stages, whos = _clean_list(self.stages, STAGES), _clean_list(self.whos, AUDIENCES)
        if stages:
            out["stages"] = stages
        if whos:
            out["whos"] = whos
        if self.q and self.q.strip():
            out["q"] = self.q.strip()
        if self.joined_within:
            out["joined_within"] = self.joined_within
        if self.quiet_for:
            out["quiet_for"] = self.quiet_for
        return out


class AudienceRequest(BaseModel):
    filter: AudienceFilter = AudienceFilter()
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class EmailContent(BaseModel):
    subject: str = Field(..., max_length=300)
    preheader: str = Field("", max_length=300)
    body: str = Field(..., max_length=20000)


class PreviewRequest(EmailContent):
    user_id: Optional[str] = None
    template_key: Optional[str] = None


class TestSendRequest(EmailContent):
    to: EmailStr
    user_id: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = Field(None, max_length=80)


class TemplateFields(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    subject: Optional[str] = Field(None, max_length=300)
    preheader: Optional[str] = Field(None, max_length=300)
    body: Optional[str] = Field(None, max_length=20000)
    why: Optional[str] = Field(None, max_length=1000)
    track: Optional[str] = Field(None, max_length=40)
    step: Optional[int] = Field(None, ge=1, le=20)
    wait_days: Optional[int] = Field(None, ge=0, le=365)
    stages: Optional[List[str]] = None
    audiences: Optional[List[str]] = None
    min_days_joined: Optional[int] = Field(None, ge=0, le=3650)
    min_days_quiet: Optional[int] = Field(None, ge=0, le=3650)
    archived: Optional[bool] = None


class CampaignCreate(EmailContent):
    template_key: Optional[str] = None
    name: Optional[str] = Field(None, max_length=160)
    filter: AudienceFilter = AudienceFilter()
    audience_label: str = Field("", max_length=200)
    from_email: Optional[str] = None
    from_name: Optional[str] = Field(None, max_length=80)


class SendNextRequest(BaseModel):
    n: int = Field(5, ge=1, le=10)


class CampaignPatch(BaseModel):
    status: Literal["sending", "paused"]


class SuppressRequest(BaseModel):
    email: EmailStr
    note: Optional[str] = Field(None, max_length=300)


def _check_content(subject: str, body: str) -> None:
    if not subject.strip():
        raise HTTPException(status_code=400, detail="Write a subject first.")
    if not body.strip():
        raise HTTPException(status_code=400, detail="The email is empty.")
    ok, warnings = email_render.check_template(subject, body)
    if not ok:
        raise HTTPException(status_code=400, detail=next(w for w in warnings if "isn't a detail" in w))


def _template_values(t: TemplateFields, creating: bool) -> Dict[str, Any]:
    v = t.model_dump(exclude_none=True)
    if "stages" in v:
        v["stages"] = _clean_list(v["stages"], STAGES)
    if "audiences" in v:
        v["audiences"] = _clean_list(v["audiences"], AUDIENCES)
    if "track" in v:
        v["track"] = _slug(v["track"]) if v["track"].strip() else None
    if creating:
        for f in ("name", "subject", "body"):
            if not (v.get(f) or "").strip():
                raise HTTPException(status_code=400, detail=f"The email needs a {f}.")
    return v


# ── Admin: overview, library, audiences ───────────────────────────────────────

@router.get("/smtp-status")
def get_smtp_status(request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    return {
        "configured": _smtp_ready(runtime_smtp_config),
        "host": runtime_smtp_config.get("host"),
        "port": runtime_smtp_config.get("port"),
        "user": runtime_smtp_config.get("user"),
        "from_name": runtime_smtp_config.get("from_name"),
        "available_senders": senders(),
    }


@router.post("/smtp-config")
def update_smtp_config(payload: SmtpConfigRequest, request: Request, db: Client = Depends(get_db)):
    """Replace the SMTP sign-in until the next restart (set SMTP_PASSWORD on the server to keep it)."""
    verify_is_admin(request, db)
    runtime_smtp_config.update(get_active_smtp(payload))
    return {"success": True, "smtp_user": runtime_smtp_config["user"]}


@router.get("/overview")
def overview(request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    ensure_library(db)
    data = _rpc(db, "email_report_overview", _guard_params()) or {}
    return {
        **data,
        "limits": _limits(db),
        "smtp": {"configured": _smtp_ready(runtime_smtp_config), "user": runtime_smtp_config.get("user")},
        "defaults": {"from_name": DEFAULT_FROM_NAME, "reply_to": REPLY_TO, "senders": senders(),
                     "from_email": senders()[0]},
        "variables": email_render.VARIABLES,
    }


@router.get("/templates")
def list_templates(request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    ensure_library(db)
    rows = _table(db, "email_templates").select("*").order("sort").execute().data or []
    for r in rows:
        orig = email_library.BY_KEY.get(r["key"])
        r["edited"] = bool(orig) and any(r.get(f) != orig.get(f) for f in ("subject", "preheader", "body"))
    rows.sort(key=lambda r: (r.get("sort") or 0, r.get("track") or "~", r.get("step") or 0, r.get("name") or ""))
    return {"templates": rows, "variables": email_render.VARIABLES}


@router.post("/templates")
def create_template(payload: TemplateFields, request: Request, db: Client = Depends(get_db)):
    admin_id = verify_is_admin(request, db)
    v = _template_values(payload, creating=True)
    _check_content(v["subject"], v["body"])
    row = {
        "step": 1, "wait_days": 0, "stages": [], "audiences": [], "min_days_joined": 0, "min_days_quiet": 0,
        "preheader": "", "why": "", "sort": 1000, **v,
        "key": f"{_slug(v['name'])}-{uuid.uuid4().hex[:4]}",
        "is_builtin": False, "updated_by": admin_id,
    }
    res = _table(db, "email_templates").insert(row).execute()
    return (res.data or [row])[0]


@router.patch("/templates/{key}")
def update_template(key: str, payload: TemplateFields, request: Request, db: Client = Depends(get_db)):
    admin_id = verify_is_admin(request, db)
    cur = _table(db, "email_templates").select("*").eq("key", key).limit(1).execute().data
    if not cur:
        raise HTTPException(status_code=404, detail="Email not found")
    v = _template_values(payload, creating=False)
    _check_content(v.get("subject", cur[0]["subject"]), v.get("body", cur[0]["body"]))
    v.update({"updated_at": _iso(_now()), "updated_by": admin_id})
    res = _table(db, "email_templates").update(v).eq("key", key).execute()
    return (res.data or [{**cur[0], **v}])[0]


@router.post("/templates/{key}/duplicate")
def duplicate_template(key: str, request: Request, db: Client = Depends(get_db)):
    """A copy is a one-off (no track), so it can never become a second step of the same track by accident."""
    admin_id = verify_is_admin(request, db)
    cur = _table(db, "email_templates").select("*").eq("key", key).limit(1).execute().data
    if not cur:
        raise HTTPException(status_code=404, detail="Email not found")
    src = cur[0]
    row = {
        k: src.get(k) for k in ("subject", "preheader", "body", "why", "stages", "audiences",
                                "min_days_joined", "min_days_quiet", "sort")
    }
    row.update({
        "key": f"{_slug(src['name'])[:30]}-copy-{uuid.uuid4().hex[:4]}",
        "name": f"{src['name']} (copy)", "track": None, "step": 1, "wait_days": 0,
        "is_builtin": False, "archived": False, "updated_by": admin_id,
    })
    res = _table(db, "email_templates").insert(row).execute()
    return (res.data or [row])[0]


@router.post("/templates/{key}/restore")
def restore_template(key: str, request: Request, db: Client = Depends(get_db)):
    admin_id = verify_is_admin(request, db)
    orig = email_library.BY_KEY.get(key)
    if not orig:
        raise HTTPException(status_code=400, detail="Only ready-made emails can be restored")
    v = {f: orig.get(f) for f in email_library.FIELDS if f != "key"}
    v.update({"archived": False, "updated_at": _iso(_now()), "updated_by": admin_id})
    res = _table(db, "email_templates").update(v).eq("key", key).execute()
    return (res.data or [{"key": key, **v}])[0]


@router.post("/audience")
def audience(payload: AudienceRequest, request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    return _rpc(db, "email_report_audience", {
        "p_filter": payload.filter.as_json(), "p_limit": payload.limit, "p_offset": payload.offset, **_guard_params(),
    })


@router.post("/preview")
def preview(payload: PreviewRequest, request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    person = _person(db, payload.user_id)
    out = email_render.render(payload.subject, payload.preheader, payload.body, person,
                              campaign_key=payload.template_key or "custom", unsubscribe="#")
    return {**out, "person": {"id": person.get("id"), "email": person.get("email"), "full_name": person.get("full_name")}}


@router.post("/test")
def send_test(payload: TestSendRequest, request: Request, db: Client = Depends(get_db)):
    """Send the email to one address (yours), filled in with a real person's details if given."""
    verify_is_admin(request, db)
    if not _smtp_ready(runtime_smtp_config):
        raise HTTPException(status_code=400, detail="Email isn't connected yet. Open Settings and add the Zoho app password.")
    from_email = payload.from_email or runtime_smtp_config["user"]
    if not _sender_ok(from_email):
        raise HTTPException(status_code=400, detail="Pick a From address from the list")
    person = _person(db, payload.user_id)
    mail = email_render.render(payload.subject, payload.preheader, payload.body, person,
                               unsubscribe=email_render.unsubscribe_url(str(payload.to)))
    try:
        send_smtp_message(runtime_smtp_config, from_email, payload.from_name or DEFAULT_FROM_NAME, str(payload.to),
                          f"[Test] {mail['subject']}", mail["html"], reply_to=REPLY_TO, text_body=mail["text"])
    except Exception as exc:
        logger.warning("test email failed: %s", exc)
        # 409, not 5xx: the global handler hides 5xx details, and the admin needs Zoho's words.
        raise HTTPException(status_code=409, detail=f"The mail server said: {str(exc)[:200]}")
    return {"sent": True, "to": str(payload.to)}


# ── Admin: campaigns ──────────────────────────────────────────────────────────

def _campaign(db: Client, cid: str) -> Dict[str, Any]:
    rows = _table(db, "email_campaigns").select("*").eq("id", cid).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Send not found")
    return rows[0]


def _remaining(db: Client, camp: Dict[str, Any]) -> int:
    f = dict(camp.get("filter") or {})
    f.update({"show": "ready", "campaign": camp["id"]})
    if str(camp["template_key"]).startswith("custom:"):
        f.pop("template", None)
    data = _rpc(db, "email_report_audience", {"p_filter": f, "p_limit": 1, "p_offset": 0, **_guard_params()}) or {}
    return int(data.get("ready") or 0)


@router.post("/campaigns")
def create_campaign(payload: CampaignCreate, request: Request, db: Client = Depends(get_db)):
    admin_id = verify_is_admin(request, db)
    _check_content(payload.subject, payload.body)
    from_email = (payload.from_email or senders()[0]).strip().lower()
    if not _sender_ok(from_email):
        raise HTTPException(status_code=400, detail="Pick a From address from the list")

    cid = str(uuid.uuid4())
    filt = payload.filter
    name = payload.name
    if payload.template_key:
        tpl = _table(db, "email_templates").select("key, name, archived").eq("key", payload.template_key).limit(1).execute().data
        if not tpl or tpl[0].get("archived"):
            raise HTTPException(status_code=400, detail="That email is archived or missing")
        filt.template = payload.template_key
        key = payload.template_key
        name = name or tpl[0]["name"]
    else:
        filt.template = None
        key = f"custom:{cid}"
        name = name or payload.subject

    filter_json = filt.as_json()
    filter_json.pop("show", None)
    filter_json.pop("q", None)  # a search narrows the list on screen, never who gets the email
    count = _rpc(db, "email_report_audience", {
        "p_filter": {**filter_json, "show": "ready"}, "p_limit": 1, "p_offset": 0, **_guard_params(),
    }) or {}
    planned = int(count.get("ready") or 0)
    if planned == 0:
        raise HTTPException(status_code=400, detail="Nobody in this audience can get the email right now.")

    row = {
        "id": cid, "template_key": key, "name": name[:160], "subject": payload.subject, "preheader": payload.preheader,
        "body": payload.body, "filter": filter_json, "audience_label": payload.audience_label,
        "from_email": from_email, "from_name": (payload.from_name or DEFAULT_FROM_NAME).strip(),
        "reply_to": REPLY_TO, "status": "sending", "planned": planned, "created_by": admin_id,
    }
    _table(db, "email_campaigns").insert(row).execute()
    return row


@router.get("/campaigns")
def list_campaigns(request: Request, limit: int = 30, offset: int = 0, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    return _rpc(db, "email_report_campaigns", {"p_limit": max(1, min(limit, 100)), "p_offset": max(0, offset)})


@router.get("/campaigns/{cid}")
def get_campaign(cid: uuid.UUID, request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    data = _rpc(db, "email_report_campaign", {"p_id": str(cid)})
    if not data:
        raise HTTPException(status_code=404, detail="Send not found")
    return data


@router.patch("/campaigns/{cid}")
def set_campaign_status(cid: uuid.UUID, payload: CampaignPatch, request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    camp = _campaign(db, str(cid))
    if camp["status"] == "done":
        raise HTTPException(status_code=400, detail="This send has finished")
    _table(db, "email_campaigns").update({"status": payload.status}).eq("id", str(cid)).execute()
    return {"id": str(cid), "status": payload.status}


def _is_bounce(exc: Exception, recipient: str) -> bool:
    """The receiving server said this address doesn't exist (5xx for the recipient)."""
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        code = (exc.recipients.get(recipient) or (0,))[0]
        return 500 <= int(code) < 600
    return False


def _finish(db: Client, cid: str) -> None:
    _table(db, "email_campaigns").update({"status": "done", "finished_at": _iso(_now())}).eq("id", cid).execute()


@router.post("/campaigns/{cid}/send-next")
def send_next(cid: uuid.UUID, payload: SendNextRequest, request: Request, db: Client = Depends(get_db)):
    """Send the next few emails of a campaign. The admin page calls this until `status` is done."""
    verify_is_admin(request, db)
    cid_s = str(cid)
    camp = _campaign(db, cid_s)
    if camp["status"] != "sending":
        return {"status": camp["status"], "sent": 0, "failed": 0, "remaining": None}
    if not _smtp_ready(runtime_smtp_config):
        raise HTTPException(status_code=400, detail="Email isn't connected yet. Open Settings and add the Zoho app password.")

    w = _send_window(db)
    room = min(payload.n, HOURLY_LIMIT - w["hour"], DAILY_LIMIT - w["day"])
    if room <= 0:
        return {
            "status": "waiting", "sent": 0, "failed": 0, "remaining": _remaining(db, camp),
            "reason": "hourly_limit" if w["hour"] >= HOURLY_LIMIT else "daily_limit",
            "resume_at": w["hour_free_at"] if w["hour"] >= HOURLY_LIMIT else w["day_free_at"],
        }

    rows = _rpc(db, "email_claim_batch", {"p_campaign": cid_s, "p_limit": room, **_guard_params()}) or []
    if not rows:
        _finish(db, cid_s)
        return {"status": "done", "sent": 0, "failed": 0, "remaining": 0}

    utm_key = "custom" if str(camp["template_key"]).startswith("custom:") else camp["template_key"]
    tag = cid_s[:8]
    sent = failed = 0
    errors: List[str] = []
    done: set = set()  # send ids marked sent or failed
    server: Optional[smtplib.SMTP] = None

    def mark(send_id: str, status: str, error: Optional[str] = None) -> None:
        _table(db, "email_sends").update(
            {"status": status, "error": error, "sent_at": _iso(_now())}
        ).eq("id", send_id).execute()
        done.add(send_id)

    try:
        server = open_smtp(runtime_smtp_config)
        for r in rows:
            unsub = email_render.unsubscribe_url(r["email"])
            mail = email_render.render(camp["subject"], camp.get("preheader") or "", camp["body"], r,
                                       campaign_key=utm_key, campaign_tag=tag, unsubscribe=unsub)
            msg = build_message(
                camp["from_email"], camp["from_name"], r["email"], mail["subject"], mail["html"],
                reply_to=camp.get("reply_to") or REPLY_TO, text_body=mail["text"],
                headers={
                    "List-Unsubscribe": f"<{unsub}>, <mailto:{REPLY_TO}?subject=Unsubscribe>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
            )
            try:
                try:
                    server.sendmail(runtime_smtp_config["user"].strip(), [r["email"]], msg.as_string())
                except smtplib.SMTPServerDisconnected:
                    server = open_smtp(runtime_smtp_config)
                    server.sendmail(runtime_smtp_config["user"].strip(), [r["email"]], msg.as_string())
                mark(r["send_id"], "sent")
                sent += 1
            except smtplib.SMTPSenderRefused:
                raise  # a settings problem, not this person's: stop the whole batch
            except Exception as exc:
                failed += 1
                reason = str(exc)[:300]
                errors.append(f"{r['email']}: {reason}")
                mark(r["send_id"], "failed", reason)
                if _is_bounce(exc, r["email"]):
                    _suppress(db, r["email"], "bounced", r.get("user_id"), "Refused by the receiving server")
    except (smtplib.SMTPAuthenticationError, smtplib.SMTPSenderRefused, smtplib.SMTPConnectError, OSError, ValueError) as exc:
        # Nothing more can go out: free everyone not sent yet and pause, so the admin can fix settings.
        for r in rows:
            if r["send_id"] not in done:
                _table(db, "email_sends").delete().eq("id", r["send_id"]).eq("status", "sending").execute()
        _table(db, "email_campaigns").update({"status": "paused"}).eq("id", cid_s).execute()
        logger.warning("broadcast %s stopped: %s", cid_s, exc)
        if isinstance(exc, smtplib.SMTPSenderRefused):
            detail = (f"Zoho refused the From address {camp['from_email']}. Pick {runtime_smtp_config.get('user')} "
                      "as From, or add this address as an alias of that mailbox in Zoho.")
        elif isinstance(exc, smtplib.SMTPAuthenticationError):
            detail = "Zoho rejected the sign-in. Check the app password in Settings."
        else:
            detail = f"Couldn't reach the mail server: {str(exc)[:160]}"
        raise HTTPException(status_code=409, detail=detail)
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass

    remaining = _remaining(db, camp)
    status = "sending"
    if remaining == 0:
        _finish(db, cid_s)
        status = "done"
    return {"status": status, "sent": sent, "failed": failed, "errors": errors[:3], "remaining": remaining}


# ── Admin: addresses we never email ───────────────────────────────────────────

@router.get("/suppressions")
def list_suppressions(request: Request, q: Optional[str] = None, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    rows = _table(db, "email_suppressions").select("*").order("created_at", desc=True).limit(500).execute().data or []
    if q and q.strip():
        s = q.strip().lower()
        rows = [r for r in rows if s in (r.get("email") or "")]
    return {"rows": rows[:200], "total": len(rows)}


@router.post("/suppressions")
def add_suppression(payload: SuppressRequest, request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    _suppress(db, str(payload.email), "stopped", note=payload.note or "Stopped by the team")
    return {"email": str(payload.email).lower(), "reason": "stopped"}


@router.delete("/suppressions/{email}")
def remove_suppression(email: str, request: Request, db: Client = Depends(get_db)):
    """Email this address again. Only when the person asked for it."""
    verify_is_admin(request, db)
    _table(db, "email_suppressions").delete().eq("email", email.strip().lower()).execute()
    return {"email": email.strip().lower(), "removed": True}


# ── Public: unsubscribe ───────────────────────────────────────────────────────

def _page(title: str, message: str, form: str = "") -> HTMLResponse:
    body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>{html.escape(title)} · TestoZa</title>
<style>
  body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;padding:16px;box-sizing:border-box}}
  main{{max-width:420px;width:100%;background:#fff;border-radius:20px;padding:28px;box-shadow:0 8px 30px -12px rgba(15,23,42,.18)}}
  .brand{{font-size:14px;font-weight:700;color:#0284c7;margin:0 0 18px}}
  h1{{font-size:22px;line-height:1.25;margin:0 0 10px;letter-spacing:-.01em}}
  p{{font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px}}
  button{{width:100%;height:48px;border:0;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer}}
  .primary{{background:#0f172a;color:#fff}} .quiet{{background:#f1f5f9;color:#0f172a}}
  a{{color:#0284c7}}
</style></head>
<body><main><p class="brand">TestoZa</p><h1>{html.escape(title)}</h1><p>{message}</p>{form}</main></body></html>"""
    return HTMLResponse(body, headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex"})


def _bad_link() -> HTMLResponse:
    return _page("This link doesn't work",
                 "It may have been copied incompletely. Write to "
                 '<a href="mailto:support@testoza.com?subject=Unsubscribe">support@testoza.com</a> '
                 "and we'll take you off the list.")


@router.get("/u/{token}", response_class=HTMLResponse)
def unsubscribe_page(token: str):
    """Asks first: mail scanners open links on their own, and that must not unsubscribe anyone."""
    email = email_render.email_from_token(token)
    if not email:
        return _bad_link()
    return _page(
        "Stop TestoZa emails?",
        f"We'll stop sending tips and news to <strong>{html.escape(email)}</strong>. "
        "You'll still get messages about your own exams, like a new submission.",
        f'<form method="post" action="{html.escape(token)}"><button class="primary" type="submit">Unsubscribe</button></form>',
    )


@router.post("/u/{token}", response_class=HTMLResponse)
def unsubscribe(token: str, db: Client = Depends(get_db)):
    """The page's button, and one-click unsubscribe from Gmail / Yahoo (RFC 8058)."""
    email = email_render.email_from_token(token)
    if not email:
        return _bad_link()
    try:
        _suppress(db, email, "unsubscribed", note="Unsubscribed from an email")
    except Exception as exc:
        logger.error("unsubscribe failed for %s: %s", email, exc)
        return _page("Something went wrong",
                     'Please try again, or write to <a href="mailto:support@testoza.com?subject=Unsubscribe">'
                     "support@testoza.com</a> and we'll do it for you.")
    return _page(
        "You're unsubscribed",
        f"We won't send tips or news to <strong>{html.escape(email)}</strong> again. Sorry for the bother.",
        f'<form method="post" action="{html.escape(token)}/resubscribe">'
        '<button class="quiet" type="submit">I changed my mind, keep me on</button></form>',
    )


@router.post("/u/{token}/resubscribe", response_class=HTMLResponse)
def resubscribe(token: str, db: Client = Depends(get_db)):
    email = email_render.email_from_token(token)
    if not email:
        return _bad_link()
    _table(db, "email_suppressions").delete().eq("email", email).eq("reason", "unsubscribed").execute()
    return _page("You're back on the list", "Thanks. We write rarely, and only when it's useful.")
