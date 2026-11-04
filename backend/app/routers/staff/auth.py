"""
/api/staff/auth/*: how an employee signs in to team.testoza.com.

  POST /login         login ID + password      → half session (stage "mfa", 10 minutes)
  POST /password      change password          (required first when must_change_password)
  POST /2fa/setup     new authenticator secret (first sign-in only)
  POST /2fa/verify    6-digit code             → NEW full session (old one revoked)
  GET  /me            who am I + the next step
  POST /logout

No sign-up, no Google, no email reset link: the owner creates accounts and resets them
from admin → Team (app/routers/staff/admin.py).
"""

from datetime import timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from supabase import Client

from app.core.database import get_db
from app.core.staff_security import (
    MAX_PASSWORD_CHARS, decrypt_secret, encrypt_secret, hash_password, new_session_token,
    new_totp_secret, otpauth_uri, password_problem, token_hash, totp_match, verify_password,
)
from app.utils.rate_limiter import RateLimiter

from .deps import (
    IDLE_MINUTES, MFA_MINUTES, PERMISSIONS, SESSION_HOURS, StaffContext, account_blocker, audit,
    check_origin, clear_session_cookie, client_ip, first, iso, load_session, now_utc,
    parse_ts, revoke_all_sessions, revoke_session, set_session_cookie, staff_audit, user_agent,
)

router = APIRouter()

LOCK_AFTER = 5            # wrong passwords before the account locks
LOCK_MINUTES = 15
MAX_CODE_TRIES = 5        # wrong 6-digit codes before the half session is thrown away
WRONG = "Login ID or password is wrong."
TOO_MANY = f"Too many attempts. Try again in {LOCK_MINUTES} minutes."

# Spray across many IDs from one network.
login_per_ip = RateLimiter(requests=20, window=LOCK_MINUTES * 60, name="staff_login_ip")
# Failures for IDs that don't exist lock exactly like real ones, so the answers
# can't be used to discover which login IDs are real.
unknown_id_failures = RateLimiter(requests=LOCK_AFTER, window=LOCK_MINUTES * 60, name="staff_login_unknown")


class LoginBody(BaseModel):
    login_id: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_CHARS)


class PasswordBody(BaseModel):
    current_password: str = Field(min_length=1, max_length=MAX_PASSWORD_CHARS)
    new_password: str = Field(min_length=1, max_length=MAX_PASSWORD_CHARS)


class CodeBody(BaseModel):
    code: str = Field(min_length=6, max_length=12)


def next_step(account: Dict[str, Any], stage: str) -> Optional[str]:
    if stage == "full":
        return None
    if account.get("must_change_password"):
        return "change_password"
    if not account.get("totp_enabled_at"):
        return "setup_2fa"
    return "verify_2fa"


def public_account(account: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": account["id"],
        "login_id": account.get("login_id"),
        "full_name": account.get("full_name"),
        "role_label": account.get("role_label"),
        "expires_at": account.get("expires_at"),
        "two_step": bool(account.get("totp_enabled_at")),
    }


def _new_session(db: Client, request: Request, response: Response, staff_id: str, stage: str) -> None:
    token = new_session_token()
    now = now_utc()
    lifetime = timedelta(hours=SESSION_HOURS) if stage == "full" else timedelta(minutes=MFA_MINUTES)
    db.table("staff_sessions").insert({
        "staff_id": staff_id,
        "token_hash": token_hash(token),
        "stage": stage,
        "created_at": iso(now),
        "last_seen_at": iso(now),
        "expires_at": iso(now + lifetime),
        "ip": client_ip(request),
        "user_agent": user_agent(request),
    }).execute()
    set_session_cookie(response, token, int(lifetime.total_seconds()))


def _record_failure(db: Client, account: Dict[str, Any]) -> None:
    """One more wrong password (or too many wrong codes); lock at LOCK_AFTER."""
    fails = int(account.get("failed_attempts") or 0) + 1
    update: Dict[str, Any] = {"failed_attempts": fails, "updated_at": iso(now_utc())}
    if fails >= LOCK_AFTER:
        update.update({"failed_attempts": 0, "locked_until": iso(now_utc() + timedelta(minutes=LOCK_MINUTES))})
    db.table("staff_accounts").update(update).eq("id", account["id"]).execute()


@router.post("/login")
def login(body: LoginBody, request: Request, response: Response, db: Client = Depends(get_db)):
    check_origin(request)
    ip = client_ip(request)
    login_id = body.login_id.strip().lower()

    if not login_per_ip.check(ip)[0]:
        audit(db, request, actor_type="anonymous", action="auth.login_throttled", detail={"login_id": login_id[:40]})
        raise HTTPException(status_code=429, detail=TOO_MANY)

    account = first(db.table("staff_accounts").select("*").eq("login_id", login_id).limit(1).execute())
    # Always run the password hash, found or not, so timing doesn't reveal real IDs.
    password_ok = verify_password(body.password, account.get("password_hash") if account else None)
    now = now_utc()

    if not account:
        audit(db, request, actor_type="anonymous", action="auth.login_failed",
              detail={"login_id": login_id[:40], "reason": "unknown_id"})
        if not unknown_id_failures.check(login_id)[0]:
            raise HTTPException(status_code=429, detail=TOO_MANY)
        raise HTTPException(status_code=401, detail=WRONG)

    actor = {"actor_type": "staff", "actor_id": account["id"], "actor_label": account["login_id"]}
    locked_until = parse_ts(account.get("locked_until"))
    if locked_until and locked_until > now:
        audit(db, request, action="auth.login_locked", **actor)
        raise HTTPException(status_code=429, detail=TOO_MANY)

    if not password_ok:
        _record_failure(db, account)
        audit(db, request, action="auth.login_failed", detail={"reason": "wrong_password"}, **actor)
        raise HTTPException(status_code=401, detail=WRONG)

    blocked = account_blocker(account, now)
    if blocked:
        # The password was right, so saying why is safe and saves a support call.
        audit(db, request, action="auth.login_blocked", detail={"status": account.get("status")}, **actor)
        raise HTTPException(status_code=403, detail=blocked)

    db.table("staff_accounts").update(
        {"failed_attempts": 0, "locked_until": None, "updated_at": iso(now)}
    ).eq("id", account["id"]).execute()
    _new_session(db, request, response, account["id"], "mfa")
    audit(db, request, action="auth.password_ok", **actor)
    return {"next": next_step(account, "mfa"), "account": public_account(account)}


@router.get("/me")
def me(request: Request, db: Client = Depends(get_db)):
    ctx = load_session(request, db, allow_mfa=True)
    stage = ctx.session.get("stage")
    return {
        "stage": stage,
        "next": next_step(ctx.account, stage),
        "account": public_account(ctx.account),
        "permissions": sorted(ctx.permissions) if stage == "full" else [],
        "catalog": {k: {"label": v["label"], "group": v["group"]} for k, v in PERMISSIONS.items()},
        "idle_minutes": IDLE_MINUTES,
        "session_expires_at": ctx.session.get("expires_at"),
    }


def _code_failure(db: Client, request: Request, ctx: StaffContext, action: str) -> None:
    tries = int(ctx.session.get("mfa_attempts") or 0) + 1
    db.table("staff_sessions").update({"mfa_attempts": tries}).eq("id", ctx.session["id"]).execute()
    staff_audit(db, request, ctx, action, detail={"try": tries})
    if tries >= MAX_CODE_TRIES:
        # The session is dead server-side; the browser's leftover cookie matches nothing.
        revoke_session(db, ctx.session["id"], "too_many_codes")
        _record_failure(db, ctx.account)
        raise HTTPException(status_code=401, detail="Too many wrong tries. Please sign in again.")


@router.post("/password")
def change_password(body: PasswordBody, request: Request, db: Client = Depends(get_db)):
    ctx = load_session(request, db, allow_mfa=True)
    stage = ctx.session.get("stage")
    if stage != "full" and not ctx.account.get("must_change_password"):
        raise HTTPException(status_code=403, detail="Finish signing in first.")

    if not verify_password(body.current_password, ctx.account.get("password_hash")):
        _code_failure(db, request, ctx, "auth.password_change_wrong_current")
        raise HTTPException(status_code=400, detail="Your current password is wrong.")
    if body.new_password == body.current_password:
        raise HTTPException(status_code=400, detail="Pick a new password, different from the current one.")
    problem = password_problem(body.new_password, ctx.account.get("login_id") or "", ctx.account.get("full_name"))
    if problem:
        raise HTTPException(status_code=400, detail=problem)

    now = now_utc()
    db.table("staff_accounts").update({
        "password_hash": hash_password(body.new_password),
        "must_change_password": False,
        "password_changed_at": iso(now),
        "updated_at": iso(now),
    }).eq("id", ctx.id).execute()
    # Anyone else signed in with the old password is signed out.
    revoke_all_sessions(db, ctx.id, "password_changed", keep=ctx.session["id"])
    staff_audit(db, request, ctx, "auth.password_changed")
    ctx.account["must_change_password"] = False
    return {"next": next_step(ctx.account, stage)}


@router.post("/2fa/setup")
def setup_two_step(request: Request, db: Client = Depends(get_db)):
    ctx = load_session(request, db, allow_mfa=True)
    if ctx.session.get("stage") == "full" or ctx.account.get("totp_enabled_at"):
        raise HTTPException(status_code=409, detail="2-step is already set up. Ask your admin to reset it.")
    if ctx.account.get("must_change_password"):
        raise HTTPException(status_code=403, detail="Change your password first.")

    secret = new_totp_secret()
    db.table("staff_accounts").update({
        "totp_pending": encrypt_secret(secret, ctx.id), "updated_at": iso(now_utc()),
    }).eq("id", ctx.id).execute()
    staff_audit(db, request, ctx, "auth.2fa_setup_started")
    return {"secret": secret, "uri": otpauth_uri(secret, ctx.account["login_id"])}


@router.post("/2fa/verify")
def verify_two_step(body: CodeBody, request: Request, response: Response, db: Client = Depends(get_db)):
    ctx = load_session(request, db, allow_mfa=True)
    if ctx.session.get("stage") == "full":
        return {"next": None}
    if ctx.account.get("must_change_password"):
        raise HTTPException(status_code=403, detail="Change your password first.")

    enrolling = not ctx.account.get("totp_enabled_at")
    blob = ctx.account.get("totp_pending") if enrolling else ctx.account.get("totp_secret")
    if not blob:
        raise HTTPException(status_code=400, detail="Set up 2-step first.")
    try:
        secret = decrypt_secret(blob, ctx.id)
    except Exception:
        staff_audit(db, request, ctx, "auth.2fa_secret_unreadable")
        raise HTTPException(status_code=409, detail="Your 2-step setup can't be read. Ask your admin to reset 2-step.")

    step = totp_match(secret, body.code, last_step=ctx.account.get("totp_last_step"))
    if step is None:
        _code_failure(db, request, ctx, "auth.2fa_wrong_code")
        raise HTTPException(status_code=400, detail="That code didn't work. Check your phone's time is automatic and try the newest code.")

    now = now_utc()
    update: Dict[str, Any] = {
        "totp_last_step": step,
        "failed_attempts": 0,
        "last_login_at": iso(now),
        "last_login_ip": client_ip(request),
        "updated_at": iso(now),
    }
    if enrolling:
        update.update({"totp_secret": blob, "totp_pending": None, "totp_enabled_at": iso(now)})
    db.table("staff_accounts").update(update).eq("id", ctx.id).execute()

    # A fresh session id after the last factor: a session id planted before sign-in
    # (session fixation) is worthless.
    revoke_session(db, ctx.session["id"], "upgraded")
    _new_session(db, request, response, ctx.id, "full")
    if enrolling:
        staff_audit(db, request, ctx, "auth.2fa_enabled")
    staff_audit(db, request, ctx, "auth.login")
    return {"next": None}


@router.post("/logout")
def logout(request: Request, response: Response, db: Client = Depends(get_db)):
    check_origin(request)
    try:
        ctx = load_session(request, db, allow_mfa=True)
    except HTTPException:
        clear_session_cookie(response)
        return {"ok": True}
    revoke_session(db, ctx.session["id"], "logout")
    staff_audit(db, request, ctx, "auth.logout")
    clear_session_cookie(response)
    return {"ok": True}
