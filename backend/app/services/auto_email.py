"""
The automatic emails: what triggers each one, who never gets it, and the record of every send.

  kind          trigger (where)                                         guard
  welcome       role set to Educator / Institution / Other              once per account
                (routers/users.py onboarding, routers/auth.py register)
  test_created  a test saved for the first time (routers/tests/write.py) at most one a day per educator;
                                                                        not the seeded example, not a copy, not empty
  test_live     settings.conduct_exam.enabled false → true (PUT)        not again for this test within 6 hours
  results       the 1st, 5th, 10th, 25th, 50th, every 100th submission  each milestone once
                (routers/attempts.py)
  test_ended    settings.conduct_exam.enabled true → false (PUT)        not again for this test within 6 hours

`results` and `test_ended` share one email thread per test: the same subject (the first one's,
kept in the log) and References / In-Reply-To pointing at a fixed id <test.{id}@testoza.com>
plus the real ids of earlier emails (SES rewrites Message-ID, mailer.deliver reports it).

Never sent to: @guest.testoza.com (exam candidates) and @testoza.com addresses, or anyone on the
never-email list as bounced or stopped. People who unsubscribed from broadcasts still get these:
they are about their own account and exams (the unsubscribe page says so).

Everything runs on a background thread and never fails the request that triggered it. With the
SQL 20261102120000_email_automatic.sql applied, each email is logged in email_auto_log (admin →
Email → Automatic counts them) and admins can switch each kind off (email_auto_settings).
Without it, emails still go out; guards fall back to this process's memory.
"""

import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.services import auto_email_content as content
from app.services import mailer

logger = logging.getLogger(__name__)

KINDS: Dict[str, Dict[str, str]] = {
    "welcome": {
        "label": "Welcome",
        "when": "Right after an educator or institute signs up",
        "detail": "The two ways to make a first test, and the tutorial videos. Once per account.",
    },
    "test_created": {
        "label": "Test created",
        "when": "When an educator saves a new test",
        "detail": "Check it, go live, share the link. At most one a day per educator.",
    },
    "test_live": {
        "label": "Test is live",
        "when": "When an exam goes live",
        "detail": "The exam link, the join code and a ready-to-send WhatsApp message.",
    },
    "results": {
        "label": "Submissions",
        "when": "At the 1st, 5th, 10th, 25th and 50th submission, then every 100th",
        "detail": "One email thread per test, so the inbox shows one conversation per exam.",
    },
    "test_ended": {
        "label": "Exam ended",
        "when": "When the educator stops a live exam",
        "detail": "How many submitted, top and average score, and the link to all results. Same thread as Submissions.",
    },
}
ORDER: List[str] = list(KINDS)
EDUCATOR_ROLES = ("Teacher", "Institution", "Other")
MILESTONES = (1, 5, 10, 25, 50)
FROM_NAME = "TestoZa"
GUEST_DOMAIN = "@guest.testoza.com"

_LOG_TABLE = "email_auto_log"
_SETTINGS_TABLE = "email_auto_settings"
_SETTINGS_TTL = timedelta(seconds=60)

_state_lock = threading.Lock()
_settings_cache: Dict[str, Any] = {"at": None, "values": {}}
_installed: Dict[str, bool] = {"log": True, "settings": True}
# Guards when email_auto_log isn't there yet (or a lookup failed): this process only.
_memory: Dict[Tuple[str, str], datetime] = {}


def is_milestone(count: int) -> bool:
    return count in MILESTONES or (count >= 100 and count % 100 == 0)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _missing(exc: Exception) -> bool:
    text = str(exc)
    return any(s in text for s in ("PGRST205", "PGRST202", "Could not find the table", "does not exist"))


# ── Switches ──────────────────────────────────────────────────────────────────

def settings(db, fresh: bool = False) -> Dict[str, bool]:
    """kind → on/off. Everything is on until an admin switches it off."""
    with _state_lock:
        at = _settings_cache["at"]
        if not fresh and at and _now() - at < _SETTINGS_TTL:
            return {k: _settings_cache["values"].get(k, True) for k in ORDER}
    values: Dict[str, bool] = {}
    if _installed["settings"] or fresh:
        try:
            rows = db.table(_SETTINGS_TABLE).select("kind, enabled").execute().data or []
            values = {r["kind"]: bool(r.get("enabled", True)) for r in rows}
            _installed["settings"] = True
        except Exception as exc:
            if _missing(exc):
                _installed["settings"] = False
            else:
                logger.warning("auto email settings unreadable: %s", exc)
    with _state_lock:
        _settings_cache.update(at=_now(), values=values)
    return {k: values.get(k, True) for k in ORDER}


def set_enabled(db, kind: str, enabled: bool, admin_id: Optional[str]) -> None:
    db.table(_SETTINGS_TABLE).upsert(
        {"kind": kind, "enabled": enabled, "updated_at": _now().isoformat(), "updated_by": admin_id},
        on_conflict="kind",
    ).execute()
    with _state_lock:
        _settings_cache["values"][kind] = enabled
        _settings_cache["at"] = _now()


# ── The log ───────────────────────────────────────────────────────────────────

def _log(db, row: Dict[str, Any]) -> None:
    if not _installed["log"]:
        return
    try:
        db.table(_LOG_TABLE).insert(row).execute()
    except Exception as exc:
        if _missing(exc):
            _installed["log"] = False
            logger.info("email_auto_log isn't there yet (run 20261102120000_email_automatic.sql)")
        else:
            logger.warning("auto email log failed: %s", exc)


def _find(db, kind: Optional[str] = None, *, user_id: Optional[str] = None, test_id: Optional[str] = None,
          thread: Optional[str] = None, since: Optional[datetime] = None, milestone: Optional[int] = None,
          limit: int = 1) -> Optional[List[Dict[str, Any]]]:
    """Sent emails matching the filters, oldest first. None when the log can't be read."""
    if not _installed["log"]:
        return None
    try:
        q = db.table(_LOG_TABLE).select("kind, subject, message_id, provider_message_id, created_at").eq("status", "sent")
        if kind:
            q = q.eq("kind", kind)
        if user_id:
            q = q.eq("user_id", user_id)
        if test_id:
            q = q.eq("test_id", test_id)
        if thread:
            q = q.eq("thread_key", thread)
        if milestone is not None:
            q = q.eq("milestone", milestone)
        if since:
            q = q.gte("created_at", since.isoformat())
        return q.order("created_at").limit(limit).execute().data or []
    except Exception as exc:
        if _missing(exc):
            _installed["log"] = False
        else:
            logger.warning("auto email lookup failed: %s", exc)
        return None


def _claim(db, key: Tuple[str, str], window: Optional[timedelta], **filters: Any) -> bool:
    """
    True when this email should go now, and marks it taken. This process's memory is checked and
    set under a lock (two triggers at once can't both pass); the log covers other instances and restarts.
    """
    since = _now() - window if window else None
    with _state_lock:
        at = _memory.get(key)
        if at and (since is None or at >= since):
            return False
        _memory[key] = _now()
        if len(_memory) > 5000:  # a long-running process shouldn't grow forever
            for k in sorted(_memory, key=_memory.get)[:1000]:
                _memory.pop(k, None)
    return not _find(db, since=since, **filters)


# ── Recipients ────────────────────────────────────────────────────────────────

def skip_reason(db, email: Optional[str]) -> Optional[str]:
    """Why this address never gets an automatic email, or None."""
    e = (email or "").strip().lower()
    if "@" not in e:
        return "No email address"
    if e.endswith(GUEST_DOMAIN) or e.endswith("@testoza.com"):
        return "TestoZa address"
    try:
        rows = db.table("email_suppressions").select("reason").eq("email", e).limit(1).execute().data or []
    except Exception:
        rows = []
    if rows and rows[0].get("reason") == "bounced":
        return "Address bounced before"
    if rows and rows[0].get("reason") == "stopped":
        return "On the never-email list"
    return None


def _profile(db, user_id: str) -> Dict[str, Any]:
    rows = db.table("profiles").select("email, full_name, designation").eq("id", user_id).limit(1).execute().data or []
    return rows[0] if rows else {}


# ── Sending ───────────────────────────────────────────────────────────────────

def send(db, kind: str, to: str, mail: Dict[str, str], *, user_id: Optional[str] = None,
         test_id: Optional[str] = None, thread: Optional[str] = None, milestone: Optional[int] = None,
         headers: Optional[Dict[str, str]] = None) -> Optional[mailer.Delivery]:
    """Send one automatic email and log it. Never raises."""
    base = {"kind": kind, "user_id": user_id, "test_id": test_id, "email": (to or "").strip().lower(),
            "subject": mail.get("subject", "")[:300], "thread_key": thread, "milestone": milestone}
    reason = skip_reason(db, to)
    if reason:
        if reason not in ("TestoZa address", "No email address"):
            _log(db, {**base, "status": "skipped", "error": reason})
        return None
    all_headers = {"Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "OOF, AutoReply"}
    all_headers.update(headers or {})
    try:
        d = mailer.deliver(to, mail["subject"], mail["html"], mail.get("text"), from_name=FROM_NAME, headers=all_headers)
    except mailer.MailNotConfigured:
        return None
    except Exception as exc:
        logger.warning("auto email %s to user %s failed: %s", kind, user_id, exc)
        _log(db, {**base, "status": "failed", "error": str(exc)[:300]})
        return None
    _log(db, {**base, "status": "sent", "provider": d.service if d.provider == "primary" else f"{d.service} (fallback)",
              "message_id": d.message_id, "provider_message_id": d.provider_message_id or None})
    logger.info("auto email %s sent (user %s, test %s) via %s", kind, user_id, test_id, d.service)
    return d


def _background(name: str, fn: Callable[..., None], *args: Any) -> None:
    def run() -> None:
        try:
            fn(*args)
        except Exception as exc:  # an email problem never surfaces anywhere
            logger.warning("auto email %s skipped: %s", name, exc)

    threading.Thread(target=run, daemon=True, name=f"auto-email-{name}").start()


def _on(db, kind: str) -> bool:
    return mailer.ready() and settings(db).get(kind, True)


# ── Welcome ───────────────────────────────────────────────────────────────────

def _welcome(db, user_id: str, email: Optional[str], full_name: Optional[str], designation: Optional[str]) -> None:
    if not _on(db, "welcome"):
        return
    if not _claim(db, ("welcome", user_id), None, kind="welcome", user_id=user_id):
        return
    if not email or full_name is None:
        p = _profile(db, user_id)
        email = email or p.get("email")
        full_name = full_name if full_name is not None else p.get("full_name")
    send(db, "welcome", email or "", content.welcome(full_name, designation), user_id=user_id)


def on_signup(db, user_id: Optional[str], designation: Optional[str], email: Optional[str] = None,
              full_name: Optional[str] = None) -> None:
    """An account became an educator / institute account. Call once the role is saved."""
    if not user_id or designation not in EDUCATOR_ROLES:
        return
    _background("welcome", _welcome, db, str(user_id), email, full_name, designation)


# ── Test created ──────────────────────────────────────────────────────────────

def _real_test(test: Dict[str, Any]) -> bool:
    s = test.get("settings") or {}
    return not (s.get("is_user_example") or s.get("is_example_template") or test.get("is_cloned"))


def _created(db, test: Dict[str, Any]) -> None:
    if not _on(db, "test_created"):
        return
    uid, tid = str(test.get("created_by") or ""), str(test.get("id") or "")
    if not _claim(db, ("test_created", uid), timedelta(hours=24), kind="test_created", user_id=uid):
        return
    p = _profile(db, uid)
    send(db, "test_created", p.get("email") or "", content.test_created(p.get("full_name"), test), user_id=uid, test_id=tid)


def on_test_created(db, test: Optional[Dict[str, Any]]) -> None:
    if not test or not test.get("created_by") or not test.get("id") or not _real_test(test):
        return
    n = int(test.get("total_questions") or len(test.get("questions") or []) or 0)
    if n == 0 and not test.get("sections"):
        return
    _background("test_created", _created, db, test)


# ── Test live / ended ─────────────────────────────────────────────────────────

def conduct_on(settings_: Optional[Dict[str, Any]]) -> bool:
    return bool(((settings_ or {}).get("conduct_exam") or {}).get("enabled"))


def _live(db, test: Dict[str, Any]) -> None:
    if not _on(db, "test_live"):
        return
    uid, tid = str(test.get("created_by") or ""), str(test.get("id") or "")
    if not _claim(db, ("test_live", tid), timedelta(hours=6), kind="test_live", test_id=tid):
        return
    p = _profile(db, uid)
    send(db, "test_live", p.get("email") or "", content.test_live(p.get("full_name"), test), user_id=uid, test_id=tid)


def _thread_headers(db, test_id: str) -> Tuple[Optional[str], Dict[str, str]]:
    """(subject of the thread's first email, In-Reply-To / References for the next one)."""
    root = f"<test.{test_id}@testoza.com>"
    first = _find(db, thread=f"test:{test_id}", limit=1)
    subject = (first[0].get("subject") or None) if first else None
    refs: List[str] = [root]
    last = None
    if first:
        rows = _find(db, thread=f"test:{test_id}", limit=200) or []
        for r in (rows[:1] + rows[-3:]):
            for mid in (r.get("message_id"), r.get("provider_message_id")):
                if mid and mid not in refs:
                    refs.append(mid)
        last = rows[-1] if rows else None
    reply_to = (last.get("provider_message_id") or last.get("message_id")) if last else root
    return subject, {"In-Reply-To": reply_to or root, "References": " ".join(refs)}


def _outside_count(db, test_id: str, creator_id: str) -> int:
    """Submissions by anyone but the author (their own trial runs don't count)."""
    res = (db.table("user_tests").select("id", count="exact", head=True)
           .eq("test_id", test_id).neq("user_id", creator_id).execute())
    return int(res.count or 0)


def score_stats(db, test_id: str, creator_id: str) -> Dict[str, Any]:
    """Top score, and the average over papers with at least one answer (blank papers drag it down)."""
    rows = (db.table("user_tests").select("score, questions_attempted")
            .eq("test_id", test_id).neq("user_id", creator_id).limit(5000).execute().data or [])
    scores = [float(r["score"]) for r in rows if r.get("score") is not None]
    answered = [float(r["score"]) for r in rows if r.get("score") is not None and (r.get("questions_attempted") or 0) > 0]
    stats: Dict[str, Any] = {"top": max(scores) if scores else None,
                             "average": (sum(answered) / len(answered)) if answered else None}
    try:
        t = db.table("tests").select("total_max_marks").eq("id", test_id).limit(1).execute().data or []
        stats["max_marks"] = (t[0].get("total_max_marks") or None) if t else None
    except Exception:
        stats["max_marks"] = None
    return stats


def _ended(db, test: Dict[str, Any]) -> None:
    if not _on(db, "test_ended"):
        return
    uid, tid = str(test.get("created_by") or ""), str(test.get("id") or "")
    if not _claim(db, ("test_ended", tid), timedelta(hours=6), kind="test_ended", test_id=tid):
        return
    p = _profile(db, uid)
    count = _outside_count(db, tid, uid)
    stats = score_stats(db, tid, uid) if count else None
    subject, headers = _thread_headers(db, tid)
    mail = content.test_ended(p.get("full_name"), tid, test.get("title") or "your exam", count, stats, subject)
    send(db, "test_ended", p.get("email") or "", mail, user_id=uid, test_id=tid, thread=f"test:{tid}", headers=headers)


def on_conduct_change(db, before: Optional[Dict[str, Any]], after: Optional[Dict[str, Any]]) -> Optional[str]:
    """Compare a test's settings before and after an update. Returns 'live', 'ended' or None."""
    if not after or not after.get("id") or not _real_test(after):
        return None
    was, now = conduct_on(before), conduct_on(after.get("settings"))
    if not was and now:
        _background("test_live", _live, db, after)
        return "live"
    if was and not now:
        _background("test_ended", _ended, db, after)
        return "ended"
    return None


# ── Submissions ───────────────────────────────────────────────────────────────

def _submission(db, creator_id: str, test_id: str, title: str) -> None:
    if not _on(db, "results"):
        return
    count = _outside_count(db, test_id, creator_id)
    if not is_milestone(count):
        return
    if not _claim(db, ("results", f"{test_id}:{count}"), None, kind="results", test_id=test_id, milestone=count):
        return
    p = _profile(db, creator_id)
    stats = score_stats(db, test_id, creator_id) if count >= 5 else None
    subject, headers = _thread_headers(db, test_id)
    mail = content.results(p.get("full_name"), test_id, title or "your test", count, stats, subject)
    send(db, "results", p.get("email") or "", mail, user_id=creator_id, test_id=test_id,
         thread=f"test:{test_id}", milestone=count, headers=headers)


def on_submission(db, creator_id: Optional[str], test_id: Optional[str], title: Optional[str]) -> None:
    """A candidate's submission was saved. Fire and forget."""
    if not creator_id or not test_id:
        return
    _background("results", _submission, db, str(creator_id), str(test_id), title or "")
