"""
/api/staff-admin/*: the owner manages employees from admin.testoza.com → Team.

Every route requires an admin (verify_is_admin, the existing admin-panel check) and
every change is written to staff_audit_log with the admin's email.

  GET    /catalog                         permissions + role presets
  GET    /accounts                        everyone (never hashes or 2-step secrets)
  POST   /accounts                        add → returns the temporary password ONCE
  PATCH  /accounts/{id}                   name, contact email, role, permissions, end date, status
  POST   /accounts/{id}/reset-password    new temporary password ONCE, signs them out
  POST   /accounts/{id}/reset-2fa         they scan a new QR at next sign-in, signs them out
  POST   /accounts/{id}/sign-out          end every session now
  GET    /accounts/{id}/sessions          where they are signed in
  GET    /audit                           the activity log (newest first)
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from supabase import Client

from app.core.auth import is_admin_user, verify_auth_claims
from app.core.database import get_db
from app.core.staff_security import hash_password, new_temp_password

from .deps import (
    PERMISSIONS, PRESETS, audit, iso, normalize_permissions, now_utc, parse_ts, revoke_all_sessions,
)

router = APIRouter()

# A short ID (`priya.s`) or an email address; same rule as the DB check in
# 20261105150000_staff_login_email.sql.
LOGIN_ID_RE = re.compile(r"^[a-z][a-z0-9._-]{2,31}$")
LOGIN_EMAIL_RE = re.compile(r"^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$")


def valid_login_id(login_id: str) -> bool:
    return len(login_id) <= 100 and bool(LOGIN_ID_RE.match(login_id) or LOGIN_EMAIL_RE.match(login_id))
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")
STATUSES = ("active", "suspended", "removed")
SAFE_FIELDS = (
    "id", "login_id", "full_name", "contact_email", "role_label", "permissions", "status", "expires_at",
    "must_change_password", "password_changed_at", "totp_enabled_at", "failed_attempts", "locked_until",
    "last_login_at", "last_login_ip", "created_at", "updated_at",
)


def _admin(request: Request, db: Client) -> Tuple[str, str]:
    claims = verify_auth_claims(request, db)
    if not is_admin_user(claims["sub"], db):
        raise HTTPException(status_code=403, detail="Admin authorization required")
    return claims["sub"], claims.get("email") or "admin"


def _log(db: Client, request: Request, admin: Tuple[str, str], action: str, staff: Dict[str, Any],
         detail: Optional[Dict[str, Any]] = None) -> None:
    audit(db, request, actor_type="admin", actor_id=admin[0], actor_label=admin[1], action=action,
          target_type="staff_account", target_id=staff.get("id"),
          detail={"login_id": staff.get("login_id"), **(detail or {})})


def _public(row: Dict[str, Any], live_sessions: int = 0) -> Dict[str, Any]:
    out = {k: row.get(k) for k in SAFE_FIELDS}
    out["permissions"] = normalize_permissions(row.get("permissions"))
    out["two_step"] = bool(row.get("totp_enabled_at"))
    locked = parse_ts(row.get("locked_until"))
    out["locked"] = bool(locked and locked > now_utc())
    ends = parse_ts(row.get("expires_at"))
    out["expired"] = bool(ends and ends <= now_utc())
    out["live_sessions"] = live_sessions
    return out


def _get(db: Client, staff_id: str) -> Dict[str, Any]:
    try:
        uuid.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Employee not found.")
    rows = db.table("staff_accounts").select("*").eq("id", staff_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return rows[0]


def _live_counts(db: Client) -> Dict[str, int]:
    now = now_utc()
    rows = (db.table("staff_sessions").select("staff_id, expires_at, stage").is_("revoked_at", "null")
            .execute().data or [])
    counts: Dict[str, int] = {}
    for r in rows:
        ends = parse_ts(r.get("expires_at"))
        if r.get("stage") == "full" and ends and ends > now:
            counts[r["staff_id"]] = counts.get(r["staff_id"], 0) + 1
    return counts


def _clean_name(value: Optional[str], field: str, max_len: int) -> str:
    text = " ".join((value or "").split())
    if not text:
        raise HTTPException(status_code=400, detail=f"{field} is required.")
    if len(text) > max_len:
        raise HTTPException(status_code=400, detail=f"{field} must be at most {max_len} characters.")
    return text


def _clean_email(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip().lower()
    if not text:
        return None
    if len(text) > 254 or not EMAIL_RE.match(text):
        raise HTTPException(status_code=400, detail="That contact email doesn't look right.")
    return text


def _clean_end(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    ends = parse_ts(value)
    if not ends:
        raise HTTPException(status_code=400, detail="Access end date must be a date.")
    return iso(ends)


@router.get("/catalog")
def catalog(request: Request, db: Client = Depends(get_db)):
    _admin(request, db)
    return {
        "permissions": [{"key": k, **v} for k, v in PERMISSIONS.items()],
        "presets": PRESETS,
        "never": ["Users list or export", "Feature control", "Pricing and promo codes", "Migration & seed",
                  "Deleting tests or messages", "Email settings and sending", "Managing staff",
                  "The activity log"],
    }


@router.get("/accounts")
def list_accounts(request: Request, db: Client = Depends(get_db)):
    _admin(request, db)
    rows = db.table("staff_accounts").select("*").order("created_at", desc=True).execute().data or []
    live = _live_counts(db)
    return {"rows": [_public(r, live.get(r["id"], 0)) for r in rows if r.get("status") != "removed"],
            "removed": [_public(r) for r in rows if r.get("status") == "removed"]}


class CreateBody(BaseModel):
    login_id: str = Field(min_length=3, max_length=100)
    full_name: str = Field(min_length=1, max_length=80)
    contact_email: Optional[str] = Field(default=None, max_length=254)
    role_label: str = Field(default="Custom", max_length=40)
    permissions: List[str] = Field(default_factory=list, max_length=20)
    expires_at: Optional[str] = None


@router.post("/accounts")
def create_account(body: CreateBody, request: Request, db: Client = Depends(get_db)):
    admin = _admin(request, db)
    login_id = body.login_id.strip().lower()
    if not valid_login_id(login_id):
        raise HTTPException(status_code=400, detail="Login ID: an email address, or 3–32 characters starting with a letter (letters, numbers, . _ -).")
    if db.table("staff_accounts").select("id").eq("login_id", login_id).limit(1).execute().data:
        raise HTTPException(status_code=409, detail="That login ID is taken (removed accounts keep theirs). Pick another.")

    temp = new_temp_password()
    now = now_utc()
    row = {
        "login_id": login_id,
        "full_name": _clean_name(body.full_name, "Name", 80),
        "contact_email": _clean_email(body.contact_email),
        "role_label": _clean_name(body.role_label or "Custom", "Role", 40),
        "permissions": normalize_permissions(body.permissions),
        "status": "active",
        "expires_at": _clean_end(body.expires_at),
        "password_hash": hash_password(temp),
        "must_change_password": True,
        "created_by": admin[0],
        "created_at": iso(now),
        "updated_at": iso(now),
    }
    try:
        saved = (db.table("staff_accounts").insert(row).execute().data or [row])[0]
    except Exception as err:
        if "23505" in str(err) or "duplicate" in str(err).lower():
            raise HTTPException(status_code=409, detail="That login ID is taken. Pick another.")
        raise
    _log(db, request, admin, "staff.create", saved,
         {"permissions": row["permissions"], "role": row["role_label"], "expires_at": row["expires_at"]})
    return {"account": _public(saved), "temporary_password": temp}


class UpdateBody(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=80)
    contact_email: Optional[str] = Field(default=None, max_length=254)
    role_label: Optional[str] = Field(default=None, max_length=40)
    permissions: Optional[List[str]] = Field(default=None, max_length=20)
    expires_at: Optional[str] = None
    clear_expires_at: bool = False
    status: Optional[str] = None


@router.patch("/accounts/{staff_id}")
def update_account(staff_id: str, body: UpdateBody, request: Request, db: Client = Depends(get_db)):
    admin = _admin(request, db)
    current = _get(db, staff_id)
    update: Dict[str, Any] = {}
    if body.full_name is not None:
        update["full_name"] = _clean_name(body.full_name, "Name", 80)
    if body.contact_email is not None:
        update["contact_email"] = _clean_email(body.contact_email)
    if body.role_label is not None:
        update["role_label"] = _clean_name(body.role_label, "Role", 40)
    if body.permissions is not None:
        update["permissions"] = normalize_permissions(body.permissions)
    if body.clear_expires_at:
        update["expires_at"] = None
    elif body.expires_at is not None:
        update["expires_at"] = _clean_end(body.expires_at)
    if body.status is not None:
        if body.status not in STATUSES:
            raise HTTPException(status_code=400, detail="Status must be active, suspended or removed.")
        if current.get("status") == "removed" and body.status != "removed":
            raise HTTPException(status_code=400, detail="A removed account stays removed. Add a new one instead.")
        update["status"] = body.status
    if not update:
        return {"account": _public(current)}

    update["updated_at"] = iso(now_utc())
    saved = (db.table("staff_accounts").update(update).eq("id", staff_id).execute().data or [{**current, **update}])[0]
    if update.get("status") in ("suspended", "removed"):
        revoke_all_sessions(db, staff_id, f"account_{update['status']}")

    changes = {k: v for k, v in update.items() if k != "updated_at" and current.get(k) != v}
    action = {"suspended": "staff.suspend", "removed": "staff.remove", "active": "staff.reactivate"}.get(
        update.get("status") if "status" in changes else "", "staff.update")
    _log(db, request, admin, action, saved, {"changes": changes, "before": {k: current.get(k) for k in changes}})
    return {"account": _public(saved)}


@router.post("/accounts/{staff_id}/reset-password")
def reset_password(staff_id: str, request: Request, db: Client = Depends(get_db)):
    admin = _admin(request, db)
    current = _get(db, staff_id)
    if current.get("status") == "removed":
        raise HTTPException(status_code=400, detail="This account was removed.")
    temp = new_temp_password()
    db.table("staff_accounts").update({
        "password_hash": hash_password(temp), "must_change_password": True,
        "failed_attempts": 0, "locked_until": None, "updated_at": iso(now_utc()),
    }).eq("id", staff_id).execute()
    revoke_all_sessions(db, staff_id, "password_reset")
    _log(db, request, admin, "staff.reset_password", current)
    return {"temporary_password": temp}


@router.post("/accounts/{staff_id}/reset-2fa")
def reset_two_step(staff_id: str, request: Request, db: Client = Depends(get_db)):
    admin = _admin(request, db)
    current = _get(db, staff_id)
    db.table("staff_accounts").update({
        "totp_secret": None, "totp_pending": None, "totp_enabled_at": None, "totp_last_step": None,
        "updated_at": iso(now_utc()),
    }).eq("id", staff_id).execute()
    revoke_all_sessions(db, staff_id, "2fa_reset")
    _log(db, request, admin, "staff.reset_2fa", current)
    return {"ok": True}


@router.post("/accounts/{staff_id}/sign-out")
def sign_out_everywhere(staff_id: str, request: Request, db: Client = Depends(get_db)):
    admin = _admin(request, db)
    current = _get(db, staff_id)
    revoke_all_sessions(db, staff_id, "admin_sign_out")
    _log(db, request, admin, "staff.sign_out", current)
    return {"ok": True}


@router.get("/accounts/{staff_id}/sessions")
def sessions(staff_id: str, request: Request, db: Client = Depends(get_db)):
    _admin(request, db)
    _get(db, staff_id)
    rows = (db.table("staff_sessions").select("id, stage, created_at, last_seen_at, expires_at, ip, user_agent, revoked_at, revoked_reason")
            .eq("staff_id", staff_id).order("created_at", desc=True).limit(20).execute().data or [])
    now = now_utc()
    for r in rows:
        ends = parse_ts(r.get("expires_at"))
        r["live"] = bool(not r.get("revoked_at") and ends and ends > now and r.get("stage") == "full")
    return {"rows": rows}


@router.get("/audit")
def audit_log(request: Request, staff_id: Optional[str] = None, before_id: Optional[int] = None,
              limit: int = Query(50, ge=1, le=200), db: Client = Depends(get_db)):
    _admin(request, db)
    q = db.table("staff_audit_log").select("*").order("id", desc=True).limit(limit)
    if staff_id:
        try:
            uuid.UUID(staff_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="staff_id must be an id")
        # The employee's own actions and the admin's actions on them.
        own = q.eq("actor_id", staff_id)
        if before_id:
            own = own.lt("id", before_id)
        about = db.table("staff_audit_log").select("*").eq("target_id", staff_id).order("id", desc=True).limit(limit)
        if before_id:
            about = about.lt("id", before_id)
        merged = {r["id"]: r for r in (own.execute().data or []) + (about.execute().data or [])}
        rows = sorted(merged.values(), key=lambda r: r["id"], reverse=True)[:limit]
    else:
        if before_id:
            q = q.lt("id", before_id)
        rows = q.execute().data or []
    return {"rows": rows, "next_before": rows[-1]["id"] if len(rows) == limit else None,
            "as_of": datetime.now(timezone.utc).isoformat()}
