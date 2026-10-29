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
  EMAIL_HOURLY_LIMIT=40  · a brand-new sending domain should start slow; raise as the
                           bounce and spam rates stay low (Amazon SES allows far more)
  EMAIL_DAILY_LIMIT=200
  EMAIL_REPLY_TO=support@testoza.com · EMAIL_FROM_NAME="TestoZa"
  EMAIL_SENDERS=nirwair@testoza.com,… · extra From addresses for broadcasts; each must be
                                         allowed by the broadcast service (SES: a verified domain)

SMTP (environment):
  SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASSWORD
  SMTP_FROM=no-reply@testoza.com · the From address when the SMTP login isn't one of our
                                    addresses (Brevo: xxx@smtp-brevo.com, SES: an access key).
                                    Unset = From the login, as with Zoho.
  Brevo: SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587 SMTP_USER=<login> SMTP_PASSWORD=<SMTP key>

  BROADCAST_SMTP_HOST / _PORT / _USER / _PASSWORD / _FROM · broadcasts only, so a bad broadcast
      can't hurt help replies and submission emails (those stay on SMTP_*). Unset = SMTP_*.
  Amazon SES: BROADCAST_SMTP_HOST=email-smtp.<region>.amazonaws.com BROADCAST_SMTP_PORT=587
      BROADCAST_SMTP_USER/PASSWORD = SES SMTP credentials (not the AWS access key pair).

Bounces and spam reports (Amazon SES):
  SES → SNS topic → POST /ses-events. Hard bounces land on the never-email list as 'bounced',
  spam reports as 'unsubscribed'. SES_SNS_TOPIC_ARN (comma-separated) names the topics we
  accept: the signature proves a message came from SNS, not that it came from our topic.

runtime_smtp_config and send_smtp_message are also used by services/support_mail.py and
services/submission_email.py: keep their names and signatures.
"""

import base64
import html
import json
import logging
import os
import re
import smtplib
import ssl
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid, parseaddr
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse

import httpx
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, Field
from supabase import Client

from app.core.auth import verify_is_admin
from app.core.database import get_db
from app.services import email_library, email_render

logger = logging.getLogger(__name__)

router = APIRouter()

# SMTP for everything the platform sends (help replies, submission milestones, referrals),
# and for broadcasts too unless BROADCAST_SMTP_* is set.
runtime_smtp_config: Dict[str, Any] = {
    "host": os.getenv("SMTP_HOST", "smtp.zoho.in"),
    "port": int(os.getenv("SMTP_PORT", "465")),
    "user": os.getenv("SMTP_USER", "no-reply@testoza.com"),
    "password": os.getenv("SMTP_PASSWORD", ""),
    "from_name": os.getenv("SMTP_FROM_NAME", "TestoZa Team"),
    "from_email": os.getenv("SMTP_FROM", "").strip(),
    "use_ssl": True,
}

# Broadcasts only: environment first; admin → Email Broadcast → Settings can replace it until
# the next restart (the password is never sent back to the browser).
broadcast_smtp_config: Dict[str, Any] = {
    "host": os.getenv("BROADCAST_SMTP_HOST", "").strip(),
    "port": int(os.getenv("BROADCAST_SMTP_PORT", "587")),
    "user": os.getenv("BROADCAST_SMTP_USER", "").strip(),
    "password": os.getenv("BROADCAST_SMTP_PASSWORD", ""),
    "from_name": os.getenv("SMTP_FROM_NAME", "TestoZa Team"),
    "from_email": os.getenv("BROADCAST_SMTP_FROM", "").strip(),
    "use_ssl": os.getenv("BROADCAST_SMTP_PORT", "587") == "465",
}


def broadcast_smtp() -> Dict[str, Any]:
    """The connection broadcasts go out on: their own when set, else the platform's."""
    return broadcast_smtp_config if _smtp_ready(broadcast_smtp_config) else runtime_smtp_config


def service_name(host: Optional[str]) -> str:
    h = (host or "").lower()
    for needle, name in (("amazonaws", "Amazon SES"), ("brevo", "Brevo"), ("zoho", "Zoho Mail")):
        if needle in h:
            return name
    return h


def sender_address(cfg: Optional[Dict[str, Any]] = None) -> str:
    """Our From address (also the envelope sender): SMTP_FROM if set, else the SMTP login."""
    cfg = runtime_smtp_config if cfg is None else cfg
    return (cfg.get("from_email") or cfg.get("user") or "").strip()


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
DEFAULT_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "TestoZa")


def senders() -> List[str]:
    """
    Broadcast From addresses that will work: the broadcast connection's own address plus any
    named in EMAIL_SENDERS (comma-separated). Each must be allowed by that service: Zoho only
    sends From the signed-in mailbox or its aliases, Brevo from verified senders, SES from
    verified domains.
    """
    user = sender_address(broadcast_smtp()).lower()
    extra = [a.strip().lower() for a in os.getenv("EMAIL_SENDERS", "").split(",") if a.strip()]
    out = ([user] if user else []) + [a for a in extra if a != user]
    return out or ["no-reply@testoza.com"]

STAGES = ("new", "drafted", "tried", "quiet", "active")
AUDIENCES = ("educator", "institution", "corporate", "student", "no_role")
NOT_INSTALLED = "email_broadcast_not_installed"
NOT_CONNECTED = "Email isn't connected yet. The owner sets BROADCAST_SMTP_* (or SMTP_*) on the server."


# ── SMTP ──────────────────────────────────────────────────────────────────────

class SmtpConfigRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    from_name: Optional[str] = "TestoZa Team"
    from_email: Optional[str] = None  # left out = keep the current From address
    use_ssl: Optional[bool] = True


def get_active_smtp(override_config: Optional[SmtpConfigRequest] = None) -> Dict[str, Any]:
    if override_config:
        from_email = override_config.from_email
        if from_email is None:
            from_email = broadcast_smtp_config.get("from_email") or runtime_smtp_config.get("from_email") or ""
        return {
            "host": override_config.host.strip(),
            "port": override_config.port,
            "user": override_config.user.strip(),
            "password": override_config.password.strip(),
            "from_name": (override_config.from_name or "TestoZa Team").strip(),
            "from_email": from_email.strip(),
            "use_ssl": override_config.use_ssl if override_config.use_ssl is not None else (override_config.port == 465),
        }
    return broadcast_smtp()


def _smtp_ready(cfg: Dict[str, Any]) -> bool:
    return bool(cfg.get("host") and cfg.get("user") and cfg.get("password"))


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
    """A signed-in connection. Send with sender_address() as the envelope sender (Zoho needs the signed-in account)."""
    if not _smtp_ready(smtp_cfg):
        raise ValueError("SMTP credentials missing. Set SMTP_USER and SMTP_PASSWORD on the server.")
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
        server.sendmail(sender_address(smtp_cfg), [recipient_email], msg.as_string())
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
    # Picked by hand in Compose (20261028150000_email_pick_people.sql): people added by search
    # on top of the audience, and people unticked for this send.
    add_ids: List[uuid.UUID] = Field(default_factory=list, max_length=500)
    skip_ids: List[uuid.UUID] = Field(default_factory=list, max_length=500)
    # The "Add someone" search: also people who only sat a test.
    everyone: bool = False

    def as_json(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {"show": self.show}
        if self.add_ids:
            out["add_ids"] = list(dict.fromkeys(str(i) for i in self.add_ids))
        if self.skip_ids:
            out["skip_ids"] = list(dict.fromkeys(str(i) for i in self.skip_ids))
        if self.everyone:
            out["everyone"] = True
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
    cfg = broadcast_smtp()
    return {
        "configured": _smtp_ready(cfg),
        "host": cfg.get("host"),
        "port": cfg.get("port"),
        "user": cfg.get("user"),
        "from_email": sender_address(cfg),
        "from_name": cfg.get("from_name"),
        "service": service_name(cfg.get("host")),
        "separate": cfg is broadcast_smtp_config,
        "automatic": {"service": service_name(runtime_smtp_config.get("host")),
                      "configured": _smtp_ready(runtime_smtp_config)},
        "bounce_reports": bool(_sns_topics()),
        "available_senders": senders(),
    }


@router.post("/smtp-config")
def update_smtp_config(payload: SmtpConfigRequest, request: Request, db: Client = Depends(get_db)):
    """Replace the broadcast sign-in until the next restart (BROADCAST_SMTP_* on the server keeps it)."""
    verify_is_admin(request, db)
    broadcast_smtp_config.update(get_active_smtp(payload))
    return {"success": True, "smtp_user": broadcast_smtp_config["user"]}


@router.get("/overview")
def overview(request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    ensure_library(db)
    data = _rpc(db, "email_report_overview", _guard_params()) or {}
    return {
        **data,
        "limits": _limits(db),
        "smtp": {"configured": _smtp_ready(broadcast_smtp()), "user": broadcast_smtp().get("user"),
                 "service": service_name(broadcast_smtp().get("host"))},
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
    cfg = broadcast_smtp()
    if not _smtp_ready(cfg):
        raise HTTPException(status_code=400, detail=NOT_CONNECTED)
    from_email = payload.from_email or sender_address(cfg)
    if not _sender_ok(from_email):
        raise HTTPException(status_code=400, detail="Pick a From address from the list")
    person = _person(db, payload.user_id)
    mail = email_render.render(payload.subject, payload.preheader, payload.body, person,
                               unsubscribe=email_render.unsubscribe_url(str(payload.to)))
    try:
        send_smtp_message(cfg, from_email, payload.from_name or DEFAULT_FROM_NAME, str(payload.to),
                          f"[Test] {mail['subject']}", mail["html"], reply_to=REPLY_TO, text_body=mail["text"])
    except Exception as exc:
        logger.warning("test email failed: %s", exc)
        # 409, not 5xx: the global handler hides 5xx details, and the admin needs the mail server's words.
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
    filter_json.pop("everyone", None)  # only for finding someone to add
    count = _rpc(db, "email_report_audience", {
        "p_filter": {**filter_json, "show": "ready"}, "p_limit": 1, "p_offset": 0, **_guard_params(),
    }) or {}
    # Before 20261028150000_email_pick_people.sql the audience ignores add/skip, so an
    # unticked person would still get the email. Its rows carry `added`; the old ones don't.
    if (filter_json.get("add_ids") or filter_json.get("skip_ids")) and (count.get("rows") or []) \
            and "added" not in count["rows"][0]:
        raise HTTPException(status_code=409, detail="Picking people by hand needs the SQL "
                            "supabase/migrations/20261028150000_email_pick_people.sql. Run it, then send again.")
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
    cfg = broadcast_smtp()
    if not _smtp_ready(cfg):
        raise HTTPException(status_code=400, detail=NOT_CONNECTED)

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
        server = open_smtp(cfg)
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
                    server.sendmail(sender_address(cfg), [r["email"]], msg.as_string())
                except smtplib.SMTPServerDisconnected:
                    server = open_smtp(cfg)
                    server.sendmail(sender_address(cfg), [r["email"]], msg.as_string())
                mark(r["send_id"], "sent")
                sent += 1
            except smtplib.SMTPSenderRefused:
                raise  # a settings problem, not this person's: stop the whole batch
            except Exception as exc:
                if isinstance(exc, smtplib.SMTPDataError) and "not verified" in str(exc).lower():
                    # SES refuses an unverified From only after the message: a settings problem too.
                    raise smtplib.SMTPSenderRefused(exc.smtp_code, exc.smtp_error, camp["from_email"])
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
            detail = (f"{service_name(cfg.get('host'))} refused the From address {camp['from_email']}. "
                      f"Pick {sender_address(cfg)} as From, or verify this address with the mail service.")
        elif isinstance(exc, smtplib.SMTPAuthenticationError):
            detail = (f"{service_name(cfg.get('host'))} rejected the sign-in. "
                      "Check BROADCAST_SMTP_USER and BROADCAST_SMTP_PASSWORD (or SMTP_*) on the server.")
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


# ── Public: bounces and spam reports from Amazon SES (through SNS) ────────────

_SNS_HOST = re.compile(r"^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$")
_sns_certs: Dict[str, Any] = {}


def _sns_topics() -> List[str]:
    return [t.strip() for t in os.getenv("SES_SNS_TOPIC_ARN", "").split(",") if t.strip()]


def _sns_url_ok(url: Optional[str]) -> bool:
    u = urlparse(url or "")
    return u.scheme == "https" and bool(_SNS_HOST.match(u.hostname or ""))


def _sns_signature_ok(msg: Dict[str, Any]) -> bool:
    """AWS's documented check: rebuild the signed text and verify it against SNS's certificate."""
    cert_url = msg.get("SigningCertURL") or ""
    if not _sns_url_ok(cert_url) or not cert_url.endswith(".pem"):
        return False
    if msg.get("Type") == "Notification":
        keys = ("Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type")
    else:
        keys = ("Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type")
    text = "".join(f"{k}\n{msg[k]}\n" for k in keys if msg.get(k) is not None)
    try:
        cert = _sns_certs.get(cert_url)
        if cert is None:
            res = httpx.get(cert_url, timeout=10)
            res.raise_for_status()
            cert = x509.load_pem_x509_certificate(res.content)
            _sns_certs[cert_url] = cert
        algo = hashes.SHA256() if str(msg.get("SignatureVersion")) == "2" else hashes.SHA1()
        cert.public_key().verify(base64.b64decode(msg.get("Signature") or ""), text.encode("utf-8"),
                                 padding.PKCS1v15(), algo)
        return True
    except Exception as exc:
        logger.warning("SNS signature check failed: %s", exc)
        return False


def apply_ses_event(db: Client, event: Dict[str, Any]) -> int:
    """Hard bounces → 'bounced', spam reports → 'unsubscribed'. Returns how many addresses it stopped."""
    kind = event.get("notificationType") or event.get("eventType")  # identity feedback | configuration set
    stopped = 0
    if kind == "Bounce":
        b = event.get("bounce") or {}
        if b.get("bounceType") != "Permanent":
            return 0  # mailbox full, server busy: SES already retried, and the next broadcast may arrive
        for r in b.get("bouncedRecipients") or []:
            why = (r.get("diagnosticCode") or b.get("bounceSubType") or "").strip()
            _suppress(db, parseaddr(r.get("emailAddress") or "")[1], "bounced",
                      note=f"Bounced (Amazon SES){': ' + why[:120] if why else ''}")
            stopped += 1
    elif kind == "Complaint":
        c = event.get("complaint") or {}
        if c.get("complaintFeedbackType") == "not-spam":
            return 0
        for r in c.get("complainedRecipients") or []:
            _suppress(db, parseaddr(r.get("emailAddress") or "")[1], "unsubscribed", note="Marked our email as spam")
            stopped += 1
    return stopped


@router.post("/ses-events")
async def ses_events(request: Request, db: Client = Depends(get_db)):
    """SNS posts here (HTTPS subscription, raw delivery off). Only SES_SNS_TOPIC_ARN topics count."""
    try:
        msg = json.loads(await request.body())
    except ValueError:
        raise HTTPException(status_code=400, detail="Not an SNS message")
    if not isinstance(msg, dict) or msg.get("TopicArn") not in _sns_topics():
        raise HTTPException(status_code=403, detail="Unknown topic")
    if not await run_in_threadpool(_sns_signature_ok, msg):
        raise HTTPException(status_code=403, detail="Bad signature")

    if msg.get("Type") == "SubscriptionConfirmation":
        url = msg.get("SubscribeURL")
        if not _sns_url_ok(url):
            raise HTTPException(status_code=403, detail="Bad subscribe link")
        res = await run_in_threadpool(httpx.get, url, timeout=10)
        res.raise_for_status()
        logger.info("SNS subscription confirmed for %s", msg.get("TopicArn"))
        return {"subscribed": True}
    if msg.get("Type") != "Notification":
        return {"ok": True}
    try:
        event = json.loads(msg.get("Message") or "{}")
    except ValueError:
        return {"ok": True, "stopped": 0}
    stopped = await run_in_threadpool(apply_ses_event, db, event)
    return {"ok": True, "stopped": stopped}


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
