"""
The lock on every team-dashboard route (team.testoza.com → /api/staff/*).

Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md (sections 3–6).

The backend reaches Supabase with the service key, which bypasses RLS, so these checks
are the only access control. `require_staff("support.reply")` runs, in order:

  1. Origin is team.testoza.com (CSRF: other testoza.com subdomains are same-site, so the
     SameSite cookie alone would not stop them)
  2. the HttpOnly session cookie maps to a live staff_sessions row (stored as SHA-256)
  3. the session is not expired, revoked or idle for 30 minutes
  4. the employee is active and their access end date has not passed
  5. the 6-digit code step is done (stage = full)
  6. every permission the route names is ticked

A route with no `require_staff(...)` dependency is a public route. Every route in this
package declares one.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Set

from fastapi import Depends, HTTPException, Request, Response
from supabase import Client

from app.core.config import STAFF_ORIGINS
from app.core.database import get_db
from app.core.staff_security import token_hash
from app.utils.rate_limiter import _get_client_ip

logger = logging.getLogger("staff")

COOKIE_NAME = "__Host-tz_team"
IDLE_MINUTES = 30          # signed out after this long without a request
SESSION_HOURS = 12         # and after this long in total
MFA_MINUTES = 10           # a half-finished sign-in (password ok, no code yet)
TOUCH_SECONDS = 60         # last_seen_at is written at most once a minute

# ── permissions ──────────────────────────────────────────────────────────────────
# The only things an employee can ever be given. Anything not listed here (users list,
# pricing, feature control, email settings, deleting, managing staff, the activity log)
# has no permission and therefore stays admin-only.
PERMISSIONS: Dict[str, Dict[str, str]] = {
    "inbox.view": {
        "group": "Notifications", "label": "Team inbox",
        "description": "New help messages, feedback and ratings as they arrive.",
    },
    "support.view": {
        "group": "Support", "label": "Read help conversations",
        "description": "Name, topic, message, screenshot and the writer's account. Email and phone are masked.",
    },
    "support.reply": {
        "group": "Support", "label": "Reply and resolve",
        "description": "Answer the writer (Help page + email) and mark conversations resolved or open.",
    },
    "support.contact": {
        "group": "Support", "label": "See contact details",
        "description": "The writer's full email address and phone number.",
    },
    "feedback.view": {
        "group": "Feedback", "label": "Read feedback",
        "description": "Platform feedback and after-exam emoji ratings.",
    },
    "analytics.view": {
        "group": "Analytics", "label": "Analytics reports",
        "description": "Visitors, sign-ups, traffic sources and growth. Numbers only, no personal data.",
    },
    "email.view": {
        "group": "Email", "label": "Email history",
        "description": "Past sends with their results. No recipient lists, no composing or sending.",
    },
}

IMPLIES: Dict[str, List[str]] = {
    "support.reply": ["support.view"],
    "support.contact": ["support.view"],
}

PRESETS: List[Dict[str, Any]] = [
    {"label": "Support agent", "permissions": ["inbox.view", "support.view", "support.reply", "feedback.view"]},
    {"label": "Growth assistant", "permissions": ["inbox.view", "analytics.view", "email.view", "feedback.view"]},
    {"label": "Analyst", "permissions": ["analytics.view", "email.view"]},
]


def normalize_permissions(perms: Optional[Iterable[str]]) -> List[str]:
    """Known permissions only, plus what they imply, in catalogue order."""
    chosen: Set[str] = {p for p in (perms or []) if p in PERMISSIONS}
    for p in list(chosen):
        chosen.update(IMPLIES.get(p, []))
    return [p for p in PERMISSIONS if p in chosen]


# ── time helpers ─────────────────────────────────────────────────────────────────
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def parse_ts(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def first(res: Any) -> Optional[Dict[str, Any]]:
    data = getattr(res, "data", None) or []
    return data[0] if isinstance(data, list) and data else None


# ── request facts ────────────────────────────────────────────────────────────────
def client_ip(request: Request) -> str:
    return (_get_client_ip(request) or "")[:64]


def user_agent(request: Request) -> str:
    return (request.headers.get("user-agent") or "")[:300]


def check_origin(request: Request) -> None:
    """Refuse any request that does not come from the team dashboard itself."""
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin not in STAFF_ORIGINS:
        raise HTTPException(status_code=403, detail="This can only be used from team.testoza.com.")


# ── activity log ─────────────────────────────────────────────────────────────────
def audit(db: Client, request: Optional[Request], *, actor_type: str, action: str,
          actor_id: Optional[str] = None, actor_label: Optional[str] = None,
          target_type: Optional[str] = None, target_id: Optional[str] = None,
          detail: Optional[Dict[str, Any]] = None) -> None:
    """Append to staff_audit_log. Never raises: a logging hiccup must not break the action."""
    row = {
        "actor_type": actor_type,
        "actor_id": actor_id,
        "actor_label": (actor_label or "")[:120] or None,
        "action": action[:80],
        "target_type": target_type,
        "target_id": str(target_id)[:120] if target_id is not None else None,
        "detail": detail or {},
        "ip": client_ip(request) if request is not None else None,
        "user_agent": user_agent(request) if request is not None else None,
    }
    try:
        db.table("staff_audit_log").insert(row).execute()
    except Exception as err:  # table missing, network blip
        logger.error("staff audit write failed (%s): %s", action, err)


# ── cookies ──────────────────────────────────────────────────────────────────────
def set_session_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    # __Host- prefix: browser refuses it unless Secure, Path=/ and no Domain, so no
    # other subdomain can set or overwrite it.
    response.set_cookie(
        COOKIE_NAME, token, max_age=max_age_seconds, path="/",
        secure=True, httponly=True, samesite="strict",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/", secure=True, httponly=True, samesite="strict")


# ── sessions ─────────────────────────────────────────────────────────────────────
@dataclass
class StaffContext:
    account: Dict[str, Any]
    session: Dict[str, Any]
    permissions: Set[str] = field(default_factory=set)

    @property
    def id(self) -> str:
        return self.account["id"]

    @property
    def label(self) -> str:
        return self.account.get("login_id") or ""

    def has(self, perm: str) -> bool:
        return perm in self.permissions


def revoke_session(db: Client, session_id: str, reason: str) -> None:
    try:
        db.table("staff_sessions").update(
            {"revoked_at": iso(now_utc()), "revoked_reason": reason}
        ).eq("id", session_id).execute()
    except Exception as err:
        logger.warning("could not revoke staff session: %s", err)


def revoke_all_sessions(db: Client, staff_id: str, reason: str, *, keep: Optional[str] = None) -> None:
    live = (db.table("staff_sessions").select("id").eq("staff_id", staff_id)
            .is_("revoked_at", "null").execute().data or [])
    for row in live:
        if row["id"] != keep:
            revoke_session(db, row["id"], reason)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detail)


def account_blocker(account: Optional[Dict[str, Any]], now: Optional[datetime] = None) -> Optional[str]:
    """Why this account may not be used right now, or None."""
    if not account or account.get("status") != "active":
        return "This account is switched off. Ask your admin."
    ends = parse_ts(account.get("expires_at"))
    if ends and ends <= (now or now_utc()):
        return "Your access has ended. Ask your admin if this is a mistake."
    return None


def load_session(request: Request, db: Client, *, allow_mfa: bool = False) -> StaffContext:
    check_origin(request)
    token = request.cookies.get(COOKIE_NAME) or ""
    if not token or len(token) > 200:
        raise _unauthorized("Please sign in.")

    session = first(db.table("staff_sessions").select("*").eq("token_hash", token_hash(token)).limit(1).execute())
    if not session or session.get("revoked_at"):
        raise _unauthorized("Please sign in.")

    now = now_utc()
    if (parse_ts(session.get("expires_at")) or now) <= now:
        revoke_session(db, session["id"], "expired")
        raise _unauthorized("Your session ended. Please sign in again.")
    last_seen = parse_ts(session.get("last_seen_at")) or now
    if session.get("stage") == "full" and now - last_seen >= timedelta(minutes=IDLE_MINUTES):
        revoke_session(db, session["id"], "idle")
        raise _unauthorized(f"Signed out after {IDLE_MINUTES} minutes without activity. Please sign in again.")

    account = first(db.table("staff_accounts").select("*").eq("id", session["staff_id"]).limit(1).execute())
    blocked = account_blocker(account, now)
    if blocked:
        revoke_session(db, session["id"], "account_blocked")
        raise _unauthorized(blocked)

    if session.get("stage") != "full" and not allow_mfa:
        raise _unauthorized("Finish signing in first.")

    # Badge polls from an open tab carry this header and don't count as activity, so an
    # unattended screen still reaches the idle sign-out.
    background = request.headers.get("x-team-background") == "1"
    if not background and now - last_seen >= timedelta(seconds=TOUCH_SECONDS):
        try:
            db.table("staff_sessions").update({"last_seen_at": iso(now)}).eq("id", session["id"]).execute()
        except Exception as err:
            logger.debug("staff session touch failed: %s", err)

    perms = set(normalize_permissions(account.get("permissions")))
    return StaffContext(account=account, session=session, permissions=perms)


def require_staff(*perms: str):
    """Dependency: a fully signed-in employee holding every permission in `perms`."""
    unknown = [p for p in perms if p not in PERMISSIONS]
    if unknown:  # a typo here would otherwise lock the route for everyone, silently
        raise ValueError(f"unknown staff permission(s): {unknown}")

    def dependency(request: Request, db: Client = Depends(get_db)) -> StaffContext:
        ctx = load_session(request, db)
        missing = [p for p in perms if not ctx.has(p)]
        if missing:
            audit(db, request, actor_type="staff", actor_id=ctx.id, actor_label=ctx.label,
                  action="access.denied", detail={"path": request.url.path, "needs": missing})
            raise HTTPException(status_code=403, detail="You don't have access to this. Ask your admin.")
        return ctx

    return dependency


def staff_audit(db: Client, request: Request, ctx: StaffContext, action: str, **kw: Any) -> None:
    audit(db, request, actor_type="staff", actor_id=ctx.id, actor_label=ctx.label, action=action, **kw)
