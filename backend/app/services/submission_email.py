"""
"Your candidates are submitting" — the first transactional email TestoZa sends.

Until October 2026 the platform sent no email, ever. A teacher shared a test, closed
the tab, and never found out that anyone had taken it unless they happened to log
back in — and 84% of them never did. Several churned with unread submissions sitting
in their account, believing nothing had happened.

So the teacher now hears about it, at milestones rather than on every submission:
the 1st (it worked), then the 5th, 10th, 25th and 50th, then every 100th. That is a
handful of emails over a whole batch, needs no stored state and no opt-out table, and
every one of them links straight to the marks.

Sending is best-effort and never touches the candidate's submission: it runs on a
background thread, and it does nothing at all until SMTP_PASSWORD is set.
"""

import html
import logging
import threading
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

APP_ORIGIN = "https://app.testoza.com"
_MILESTONES = (1, 5, 10, 25, 50)


def is_milestone(count: int) -> bool:
    """Submission counts that earn the teacher an email."""
    return count in _MILESTONES or (count >= 100 and count % 100 == 0)


def _smtp_ready() -> Optional[Dict[str, Any]]:
    from app.routers.email_broadcast import runtime_smtp_config

    if not runtime_smtp_config.get("user") or not runtime_smtp_config.get("password"):
        return None
    return runtime_smtp_config


def _count_outside_submissions(db, test_id: str, creator_id: str) -> int:
    """Submissions to this test by anyone other than its author (their own trial runs don't count)."""
    res = (
        db.table("user_tests").select("id", count="exact", head=True)
        .eq("test_id", test_id).neq("user_id", creator_id).execute()
    )
    return int(res.count or 0)


def build_email(test_title: str, test_id: str, count: int, teacher_name: Optional[str]) -> Dict[str, str]:
    """Subject and HTML body. Kept separate so it can be tested without SMTP."""
    title = html.escape(test_title or "your test")
    who = html.escape((teacher_name or "").split(" ")[0]) if teacher_name else ""
    greeting = f"Hi {who}," if who else "Hello,"
    link = f"{APP_ORIGIN}/test-analysis/{test_id}"

    if count == 1:
        subject = f'Your first candidate just submitted "{test_title}"'
        lead = f"Your first candidate has just submitted <strong>{title}</strong>. The link works — their marks are waiting for you."
    else:
        subject = f'{count} candidates have submitted "{test_title}"'
        lead = f"<strong>{count} candidates</strong> have now submitted <strong>{title}</strong>."

    body = f"""<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">
    <p style="margin:0 0 14px;font-size:16px;">{greeting}</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.5;">{lead}</p>
    <a href="{link}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px;">See their marks</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748b;">
      Marks, accuracy and time for each candidate, as soon as they submit.<br>
      We email you at the 1st, 5th, 10th, 25th and 50th submission, then every 100th — never for each one.
    </p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;font-size:12px;color:#94a3b8;text-align:center;">TestoZa · testoza.com</p>
</body></html>"""
    return {"subject": subject, "html": body}


def _notify(db, creator_id: str, test_id: str, test_title: str) -> None:
    try:
        cfg = _smtp_ready()
        if not cfg:
            return
        count = _count_outside_submissions(db, test_id, creator_id)
        if not is_milestone(count):
            return
        prof = db.table("profiles").select("email, full_name").eq("id", creator_id).limit(1).execute()
        row = (prof.data or [{}])[0]
        to = (row.get("email") or "").strip()
        if not to or to.endswith("@guest.testoza.com"):
            return

        from app.routers.email_broadcast import send_smtp_message

        mail = build_email(test_title, test_id, count, row.get("full_name"))
        send_smtp_message(cfg, cfg["user"], cfg.get("from_name") or "TestoZa", to, mail["subject"], mail["html"])
        logger.info("Submission email sent for test %s at %s submissions", test_id, count)
    except Exception as err:  # never let an email problem surface anywhere
        logger.warning("Submission email skipped for test %s: %s", test_id, err)


def notify_creator_in_background(db, creator_id: str, test_id: str, test_title: str) -> None:
    """Fire and forget. The candidate's submission has already been saved."""
    threading.Thread(
        target=_notify, args=(db, creator_id, test_id, test_title), daemon=True, name="submission-email"
    ).start()
