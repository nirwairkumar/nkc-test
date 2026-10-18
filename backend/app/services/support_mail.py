"""
Help messages: who hears about them, and what the emails say.

A teacher writes from the Help page (app.testoza.com/help); the team answers from admin
(Support tab or Notifications); either side can write again. Each turn tells the other:

  - New message or a teacher's follow-up → an in-app notification for every admin, plus
    an email to every admin address once SMTP is configured.
  - New message → a short receipt to the teacher ("we have it").
  - Team reply → an in-app notification for the teacher (opens the Help page, where the
    conversation lives) and an email.

Emails to teachers come from the SMTP account with Reply-To support@testoza.com, so a
reply by email lands in the support inbox, never in no-reply. The WhatsApp number is
never printed (owner's request): emails link to WhatsApp instead.

Everything here is best-effort on a background thread: a mail or notification problem
never fails the request, and the emails are skipped until SMTP_PASSWORD is set.
"""

import html
import logging
import threading
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

APP_ORIGIN = "https://app.testoza.com"
ADMIN_ORIGIN = "https://admin.testoza.com"
SUPPORT_EMAIL = "support@testoza.com"
WHATSAPP_LINK = "https://wa.me/919263087676"

TOPIC_LABELS: Dict[str, str] = {
    "create": "Making a test",
    "ai": "AI import (PDF or photo)",
    "conduct": "Running an exam",
    "results": "Results and marks",
    "account": "Account or plan",
    "other": "Something else",
}


def admin_link(message_id: str) -> str:
    return f"{ADMIN_ORIGIN}/admin?tab=support&id={message_id}"


def _smtp_ready() -> Optional[Dict[str, Any]]:
    from app.routers.email_broadcast import runtime_smtp_config

    if not runtime_smtp_config.get("user") or not runtime_smtp_config.get("password"):
        return None
    return runtime_smtp_config


def smtp_configured() -> bool:
    return _smtp_ready() is not None


def _send(to: str, subject: str, body: str, reply_to: Optional[str] = None) -> None:
    cfg = _smtp_ready()
    if not cfg or not to:
        return
    from app.routers.email_broadcast import send_smtp_message

    send_smtp_message(cfg, cfg["user"], "TestoZa Support", to, subject, body, reply_to=reply_to)


def _paragraphs(text: str) -> str:
    """User text as escaped HTML, line breaks kept."""
    return html.escape(text or "").replace("\n", "<br>")


def _first_name(name: Optional[str]) -> str:
    return html.escape((name or "").strip().split(" ")[0]) if name else ""


def _shell(inner: str) -> str:
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">
{inner}
  </div>
  <p style="max-width:560px;margin:14px auto 0;font-size:12px;color:#94a3b8;text-align:center;">TestoZa · testoza.com · {SUPPORT_EMAIL}</p>
</body></html>"""


def _quote(text: str) -> str:
    return (
        '<div style="margin:0 0 20px;padding:12px 14px;border-left:3px solid #cbd5e1;background:#f8fafc;'
        f'border-radius:8px;font-size:14px;line-height:1.55;color:#334155;">{_paragraphs(text)}</div>'
    )


def _button(href: str, label: str, color: str = "#0284c7") -> str:
    return (
        f'<a href="{href}" style="display:inline-block;background:{color};color:#ffffff;text-decoration:none;'
        f'font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px;">{label}</a>'
    )


_FOOTNOTE = (
    '<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#64748b;">'
    "Reply to this email, write back from your Help page, or "
    f'<a href="{WHATSAPP_LINK}" style="color:#0284c7;">chat with us on WhatsApp</a>.</p>'
)


# ── Email bodies (pure, so they can be tested without SMTP) ─────────────────────

def build_team_alert(msg: Dict[str, Any], followup: Optional[str] = None) -> Dict[str, str]:
    """To admins: a new message, or (followup=text) the teacher wrote again."""
    topic = TOPIC_LABELS.get(msg.get("topic") or "", "")
    who = msg.get("name") or msg.get("email") or "Someone"
    if followup is not None:
        subject = f"Help: {who} replied"
        lead = "Wrote again"
        body = _quote(followup)
    else:
        subject = f"Help: {topic + ' · ' if topic else ''}{who}"
        lead = "New help message"
        body = _quote(msg.get("message") or "")
    ctx = msg.get("context") or {}
    rows = [
        ("From", f"{html.escape(who)} &lt;{html.escape(msg.get('email') or '')}&gt;"),
        ("Phone", html.escape(msg.get("phone") or "")),
        ("Topic", html.escape(topic)),
        ("Came from", html.escape(str(ctx.get("from") or ""))),
        ("Signed in", "Yes" if msg.get("user_id") else "No"),
        ("Screenshot", "Attached (open in admin)" if msg.get("screenshot_path") else ""),
    ]
    table = "".join(
        f'<tr><td style="padding:3px 12px 3px 0;color:#64748b;font-size:13px;white-space:nowrap;">{k}</td>'
        f'<td style="padding:3px 0;font-size:13px;">{v}</td></tr>'
        for k, v in rows if v
    )
    inner = f"""    <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#0284c7;">{lead}</p>
    {body}
    <table style="border-collapse:collapse;margin:0 0 22px;">{table}</table>
    {_button(admin_link(msg.get('id') or ''), 'Reply in admin', '#0f172a')}"""
    return {"subject": subject, "html": _shell(inner)}


def build_receipt(name: Optional[str], message: str) -> Dict[str, str]:
    first = _first_name(name)
    greeting = f"Hi {first}," if first else "Hello,"
    inner = f"""    <p style="margin:0 0 14px;font-size:16px;">{greeting}</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">We have your message. A person from the TestoZa team will reply, usually within a few hours (9 am – 9 pm IST).</p>
    {_quote(message)}
    <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">
      Our reply comes to this email and shows on your <a href="{APP_ORIGIN}/help" style="color:#0284c7;">Help page</a>.
      In a hurry? <a href="{WHATSAPP_LINK}" style="color:#0284c7;">Chat with us on WhatsApp</a>.
    </p>"""
    return {"subject": "We got your message · TestoZa", "html": _shell(inner)}


def build_reply(name: Optional[str], original: str, reply: str) -> Dict[str, str]:
    first = _first_name(name)
    greeting = f"Hi {first}," if first else "Hello,"
    inner = f"""    <p style="margin:0 0 14px;font-size:16px;">{greeting}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">{_paragraphs(reply)}</p>
    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">You wrote:</p>
    {_quote(original)}
    {_button(f'{APP_ORIGIN}/help', 'Open the conversation')}
    {_FOOTNOTE}"""
    return {"subject": "Re: your message to TestoZa", "html": _shell(inner)}


# ── Delivery ────────────────────────────────────────────────────────────────────

def _admin_targets(db) -> Dict[str, List[str]]:
    """Admin emails (from `admins`) and the profile ids behind them."""
    res = db.table("admins").select("email").execute()
    emails = [a["email"] for a in (res.data or []) if a.get("email")]
    ids: List[str] = []
    if emails:
        prof = db.table("profiles").select("id").in_("email", emails).execute()
        ids = [p["id"] for p in (prof.data or []) if p.get("id")]
    return {"emails": emails, "ids": ids}


def _tell_team(db, msg: Dict[str, Any], followup: Optional[str] = None) -> None:
    try:
        targets = _admin_targets(db)
    except Exception as err:
        logger.warning("Help message %s: could not load admins: %s", msg.get("id"), err)
        return

    who = msg.get("name") or msg.get("email") or "Someone"
    text = followup if followup is not None else (msg.get("message") or "")
    if targets["ids"]:
        try:
            db.table("notifications").insert([
                {
                    "user_id": aid,
                    "title": f"{who} replied" if followup is not None else "New support message",
                    "message": f"{who}: {text[:140]}",
                    "link": admin_link(msg.get("id") or ""),
                    "sender_name": who,
                    "sender_email": msg.get("email"),
                } for aid in targets["ids"]
            ]).execute()
        except Exception as err:
            logger.warning("Help message %s: admin notification failed: %s", msg.get("id"), err)

    try:
        alert = build_team_alert(msg, followup)
        for to in targets["emails"]:
            _send(to, alert["subject"], alert["html"], reply_to=msg.get("email"))
        if followup is None:
            receipt = build_receipt(msg.get("name"), msg.get("message") or "")
            _send(msg.get("email") or "", receipt["subject"], receipt["html"], reply_to=SUPPORT_EMAIL)
    except Exception as err:
        logger.warning("Help message %s: email failed: %s", msg.get("id"), err)


def on_new_message_in_background(db, msg: Dict[str, Any]) -> None:
    """Fire and forget. The message is already saved."""
    threading.Thread(target=_tell_team, args=(db, msg), daemon=True, name="help-message").start()


def on_user_followup_in_background(db, msg: Dict[str, Any], text: str) -> None:
    threading.Thread(target=_tell_team, args=(db, msg, text), daemon=True, name="help-followup").start()


def _send_reply(to: str, name: Optional[str], original: str, reply: str) -> None:
    try:
        mail = build_reply(name, original, reply)
        _send(to, mail["subject"], mail["html"], reply_to=SUPPORT_EMAIL)
    except Exception as err:
        logger.warning("Help reply email to %s failed: %s", to, err)


def send_reply_in_background(to: str, name: Optional[str], original: str, reply: str) -> None:
    threading.Thread(target=_send_reply, args=(to, name, original, reply), daemon=True, name="help-reply").start()
