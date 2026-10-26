"""
"Someone joined with your invite": what the referrer hears when their link brings a
new account (app/routers/referrals.py → claim).

  - Always: an in-app notification that opens Settings → Invite educators.
  - Once SMTP is configured (Brevo or Amazon SES both give SMTP credentials): an email
    too. Until then the email is skipped, the same as support replies.

Best-effort on a background thread: nothing here can fail the sign-up.
"""

import html
import logging
import threading
from typing import Any, Dict, Optional

from app.services.support_mail import APP_ORIGIN, SUPPORT_EMAIL, _button, _first_name, _shell, _smtp_ready

logger = logging.getLogger(__name__)

REFERRALS_PATH = "/settings?tab=referrals"
GUEST_DOMAIN = "@guest.testoza.com"


def build_joined_email(referrer_name: Optional[str], joined_name: str, joined_count: int) -> Dict[str, str]:
    first = _first_name(referrer_name)
    greeting = f"Hi {first}," if first else "Hello,"
    who = html.escape(joined_name)
    total = (
        f"That's {joined_count} people who joined with your link so far."
        if joined_count > 1 else "That's the first person to join with your link."
    )
    inner = f"""    <p style="margin:0 0 14px;font-size:16px;">{greeting}</p>
    <p style="margin:0 0 10px;font-size:16px;line-height:1.55;"><strong>{who}</strong> just made a TestoZa account with your invite link.</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#475569;">{total} You can see how they're getting on, from their first test to their first results, on your invite page.</p>
    {_button(f'{APP_ORIGIN}{REFERRALS_PATH}', 'See who joined', '#5b21b6')}"""
    return {"subject": f"{joined_name} joined TestoZa with your invite", "html": _shell(inner)}


def _tell_referrer(db, referrer: Dict[str, Any], joined_name: str, joined_count: int) -> None:
    referrer_id = referrer.get("id")
    try:
        from app.utils.notifications import send_notification

        send_notification(
            user_id=referrer_id,
            title="Someone joined with your invite",
            message=f"{joined_name} made a TestoZa account with your link.",
            link=REFERRALS_PATH,
            db=db,
        )
    except Exception as err:
        logger.warning("Referral: notification to %s failed: %s", referrer_id, err)

    to = (referrer.get("email") or "").strip()
    cfg = _smtp_ready()
    if not cfg or not to or to.lower().endswith(GUEST_DOMAIN):
        return
    try:
        from app.routers.email_broadcast import send_smtp_message

        mail = build_joined_email(referrer.get("full_name"), joined_name, joined_count)
        send_smtp_message(cfg, cfg["user"], "TestoZa", to, mail["subject"], mail["html"], reply_to=SUPPORT_EMAIL)
    except Exception as err:
        logger.warning("Referral: email to %s failed: %s", referrer_id, err)


def on_referral_claimed_in_background(db, referrer: Dict[str, Any], joined_name: str, joined_count: int) -> None:
    """Fire and forget. The referral is already saved."""
    threading.Thread(
        target=_tell_referrer, args=(db, referrer, joined_name, joined_count), daemon=True, name="referral-joined",
    ).start()
