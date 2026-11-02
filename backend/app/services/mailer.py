"""
The one way out for every email TestoZa sends by itself: welcome, test created, test live,
submissions, exam ended (services/auto_email.py), help replies (support_mail.py) and
referral news (referral_mail.py). Broadcasts keep their own loop in routers/email_broadcast.py
but use the same connection unless BROADCAST_SMTP_* is set.

  Primary  : SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_FROM
             Amazon SES (Sydney): SMTP_HOST=email-smtp.ap-southeast-2.amazonaws.com SMTP_PORT=587,
             SMTP_USER / SMTP_PASSWORD = the SES SMTP credentials, SMTP_FROM=no-reply@notify.testoza.com
             (notify.testoza.com: automatic emails only; broadcasts use BROADCAST_FROM on news.testoza.com,
             so neither stream can hurt the people-to-people mailboxes on testoza.com)
  Fallback : FALLBACK_SMTP_HOST / _PORT / _USER / _PASSWORD / _FROM (optional)
             Used only when the primary can't send at all (sign-in refused, server unreachable,
             From address not allowed). A bad recipient never goes to the fallback: that is the
             address's problem, not the service's. Brevo: FALLBACK_SMTP_HOST=smtp-relay.brevo.com,
             FALLBACK_SMTP_FROM=no-reply@updates.testoza.com (Brevo only sends from its own
             verified domain, so the fallback keeps its own From address).

Threading: Amazon SES replaces our Message-ID with its own and reports it in the reply to DATA
("250 Ok <id>"). deliver() returns both, so a follow-up email can point at the real message.
"""

import logging
import os
import re
import smtplib
from dataclasses import dataclass
from email.utils import make_msgid
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

REPLY_TO = os.getenv("EMAIL_REPLY_TO", "support@testoza.com")

fallback_smtp_config: Dict[str, Any] = {
    "host": os.getenv("FALLBACK_SMTP_HOST", "").strip(),
    "port": int(os.getenv("FALLBACK_SMTP_PORT", "587") or 587),
    "user": os.getenv("FALLBACK_SMTP_USER", "").strip(),
    "password": os.getenv("FALLBACK_SMTP_PASSWORD", ""),
    "from_name": os.getenv("SMTP_FROM_NAME", "TestoZa Team"),
    "from_email": os.getenv("FALLBACK_SMTP_FROM", "").strip(),
}

_SES_HOST = re.compile(r"^email-smtp(?:-fips)?\.([a-z0-9-]+)\.amazonaws\.com$")
_SES_ID = re.compile(r"\bOk\s+([A-Za-z0-9-]{20,})")


class MailNotConfigured(RuntimeError):
    """Neither the primary nor the fallback connection has a password set."""


@dataclass
class Delivery:
    provider: str            # "primary" | "fallback"
    service: str             # "Amazon SES", "Brevo", …
    message_id: str          # the Message-ID we wrote
    provider_message_id: str  # the Message-ID the service gave the email (SES), else ""

    def ids(self) -> List[str]:
        return [i for i in (self.message_id, self.provider_message_id) if i]


def primary() -> Dict[str, Any]:
    from app.routers.email_broadcast import runtime_smtp_config

    return runtime_smtp_config


def _ready(cfg: Dict[str, Any]) -> bool:
    return bool(cfg.get("host") and cfg.get("user") and cfg.get("password"))


def ready() -> bool:
    """Can anything be sent? (Primary or fallback has a password.)"""
    return _ready(primary()) or _ready(fallback_smtp_config)


def service_name(host: Optional[str]) -> str:
    from app.routers.email_broadcast import service_name as name

    return name(host)


def status() -> Dict[str, Any]:
    """For admin → Email: which services carry the platform's own emails."""
    from app.routers.email_broadcast import sender_address

    p, f = primary(), fallback_smtp_config
    return {
        "service": service_name(p.get("host")) if _ready(p) else None,
        "configured": _ready(p),
        "from_email": sender_address(p) if _ready(p) else None,
        "fallback": {
            "configured": _ready(f),
            "service": service_name(f.get("host")) if _ready(f) else None,
            "from_email": sender_address(f) if _ready(f) else None,
        },
    }


def ses_message_id(host: str, reply: str) -> str:
    """'250 Ok 0108…-000000' from email-smtp.ap-southeast-2 → '<0108…-000000@ap-southeast-2.amazonses.com>'."""
    m_host = _SES_HOST.match((host or "").lower())
    m_id = _SES_ID.search(reply or "")
    if not m_host or not m_id:
        return ""
    region = m_host.group(1)
    domain = "email.amazonses.com" if region == "us-east-1" else f"{region}.amazonses.com"
    return f"<{m_id.group(1)}@{domain}>"


def _crlf(text: str) -> str:
    return re.sub(r"\r\n|\r|\n", "\r\n", text)


def _transmit(cfg: Dict[str, Any], envelope_from: str, to: str, data: str) -> str:
    """One message on a fresh connection. Returns the server's reply to DATA (it carries SES's id)."""
    from app.routers.email_broadcast import open_smtp

    server = open_smtp(cfg)
    try:
        server.ehlo_or_helo_if_needed()
        code, resp = server.mail(envelope_from)
        if code != 250:
            server.rset()
            raise smtplib.SMTPSenderRefused(code, resp, envelope_from)
        code, resp = server.rcpt(to)
        if code not in (250, 251):
            server.rset()
            raise smtplib.SMTPRecipientsRefused({to: (code, resp)})
        code, resp = server.data(_crlf(data).encode("ascii"))
        if code != 250:
            server.rset()
            raise smtplib.SMTPDataError(code, resp)
        return resp.decode("utf-8", "replace") if isinstance(resp, bytes) else str(resp)
    finally:
        try:
            server.quit()
        except Exception:
            pass


def _service_failure(exc: Exception) -> bool:
    """True when the service itself can't send (so the fallback should try); False for a bad address."""
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return False
    if isinstance(exc, smtplib.SMTPDataError):
        # SES refuses an unverified From only after the message; anything else at DATA is about this message.
        return "not verified" in str(exc).lower() or exc.smtp_code in (421, 451, 454)
    return isinstance(exc, (smtplib.SMTPException, OSError, ValueError))


def deliver(
    to: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    *,
    from_name: str = "TestoZa",
    reply_to: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    message_domain: str = "testoza.com",
) -> Delivery:
    """Send one email: primary first, the fallback if the primary can't send at all. Raises on failure."""
    from app.routers.email_broadcast import build_message, sender_address

    attempts = [("primary", primary()), ("fallback", fallback_smtp_config)]
    attempts = [(name, cfg) for name, cfg in attempts if _ready(cfg)]
    if not attempts:
        raise MailNotConfigured("Email isn't connected: SMTP_PASSWORD isn't set on the server.")

    last: Optional[Exception] = None
    for name, cfg in attempts:
        sender = sender_address(cfg)
        msg = build_message(sender, from_name, to, subject, html_body, reply_to or REPLY_TO, text_body, headers)
        own_id = make_msgid(domain=message_domain)
        msg.replace_header("Message-ID", own_id)
        try:
            reply = _transmit(cfg, sender, to, msg.as_string())
        except Exception as exc:
            last = exc
            if name == "primary" and len(attempts) > 1 and _service_failure(exc):
                logger.warning("Primary mail service failed (%s); trying the fallback", str(exc)[:200])
                continue
            raise
        return Delivery(name, service_name(cfg.get("host")), own_id, ses_message_id(cfg.get("host", ""), reply))
    raise last or RuntimeError("Nothing was sent")
