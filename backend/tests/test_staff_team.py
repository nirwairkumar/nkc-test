"""
Team dashboard (team.testoza.com): employee sign-in, permissions and the owner's Team tab.
Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md. Run from backend/:
python -m pytest tests/test_staff_team.py -q
"""

import base64
import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core import staff_security as sec
from app.core.database import get_db
from app.main import app
from app.routers.staff import auth as staff_auth
from app.routers.staff import modules as staff_modules
from app.routers.staff.deps import COOKIE_NAME
from app.services import support_mail
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

ADMIN = "admin-token"
TEACHER = "teacher-token"
TEAM = "https://team.testoza.com"


@pytest.fixture()
def env(monkeypatch):
    monkeypatch.setenv("STAFF_SECRET_KEY", base64.b64encode(os.urandom(32)).decode())
    db = FakeSupabase()
    db.add_user(ADMIN, email="owner@testoza.com")
    teacher = db.add_user(TEACHER, email="asha@coaching.in")
    db.tables["admins"] = [{"email": "owner@testoza.com"}]
    for t in ("staff_accounts", "staff_sessions", "staff_audit_log", "support_messages",
              "support_replies", "notifications", "platform_feedback"):
        db.tables[t] = []

    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    for limiter in (staff_auth.login_per_ip, staff_auth.unknown_id_failures, staff_modules.reply_per_staff):
        limiter.clients.clear()
    monkeypatch.setattr(auth_core, "_admin_cache", {})
    monkeypatch.setattr(support_mail, "_smtp_ready", lambda: None)
    app.dependency_overrides[get_db] = lambda: db

    admin = TestClient(app, base_url="https://testserver", headers={"Authorization": f"Bearer {ADMIN}"})
    yield {"db": db, "admin": admin, "teacher": teacher}
    app.dependency_overrides.clear()


def staff_client() -> TestClient:
    return TestClient(app, base_url="https://testserver", headers={"Origin": TEAM})


def add_member(env, login_id="priya.s", permissions=("inbox.view", "support.view", "support.reply")):
    res = env["admin"].post("/api/staff-admin/accounts", json={
        "login_id": login_id, "full_name": "Priya Sharma", "role_label": "Support agent",
        "permissions": list(permissions),
    })
    assert res.status_code == 200, res.text
    return res.json()


NEW_PASSWORD = "mango-river-42-lamp"


def sign_in_fully(env, login_id="priya.s", permissions=("inbox.view", "support.view", "support.reply")):
    """Create → first login → change password → set up 2-step → verify. Returns (client, account, secret)."""
    created = add_member(env, login_id, permissions)
    c = staff_client()
    r = c.post("/api/staff/auth/login", json={"login_id": login_id, "password": created["temporary_password"]})
    assert r.status_code == 200 and r.json()["next"] == "change_password"
    r = c.post("/api/staff/auth/password", json={"current_password": created["temporary_password"], "new_password": NEW_PASSWORD})
    assert r.status_code == 200 and r.json()["next"] == "setup_2fa", r.text
    secret = c.post("/api/staff/auth/2fa/setup").json()["secret"]
    r = c.post("/api/staff/auth/2fa/verify", json={"code": sec.totp_now(secret)})
    assert r.status_code == 200 and r.json()["next"] is None, r.text
    return c, created["account"], secret


# ── building blocks ─────────────────────────────────────────────────────────────
def test_totp_matches_rfc6238_vectors():
    secret = base64.b32encode(b"12345678901234567890").decode()
    assert sec.totp_now(secret, at=59) == "287082"
    assert sec.totp_now(secret, at=1111111109) == "081804"
    assert sec.totp_now(secret, at=2000000000) == "279037"


def test_totp_refuses_replay_and_far_codes():
    secret = sec.new_totp_secret()
    now = 1_800_000_000
    code = sec.totp_now(secret, at=now)
    step = sec.totp_match(secret, code, at=now)
    assert step is not None
    assert sec.totp_match(secret, code, at=now, last_step=step) is None  # same code twice
    assert sec.totp_match(secret, sec.totp_now(secret, at=now - 90), at=now) is None  # 3 steps old
    assert sec.totp_match(secret, "12345", at=now) is None


def test_password_hash_and_policy():
    stored = sec.hash_password("correct horse battery")
    assert stored.startswith("scrypt$") and "correct" not in stored
    assert sec.verify_password("correct horse battery", stored)
    assert not sec.verify_password("correct horse batterY", stored)
    assert not sec.verify_password("anything", None)
    assert sec.password_problem("short", "priya.s")
    assert sec.password_problem("priya.s-is-great-123", "priya.s")
    assert sec.password_problem("password1234", "priya.s")
    assert sec.password_problem("testoza-rocks-2026", "priya.s")
    assert sec.password_problem(NEW_PASSWORD, "priya.s") is None


def test_secret_encryption_is_bound_to_the_account(env):
    blob = sec.encrypt_secret("JBSWY3DPEHPK3PXP", "staff-1")
    assert "JBSWY3DP" not in blob
    assert sec.decrypt_secret(blob, "staff-1") == "JBSWY3DPEHPK3PXP"
    with pytest.raises(Exception):
        sec.decrypt_secret(blob, "staff-2")


# ── owner: Team tab ─────────────────────────────────────────────────────────────
def test_only_admins_manage_staff(env):
    teacher = TestClient(app, base_url="https://testserver", headers={"Authorization": f"Bearer {TEACHER}"})
    assert teacher.get("/api/staff-admin/accounts").status_code == 403
    assert teacher.post("/api/staff-admin/accounts", json={"login_id": "x.y.z", "full_name": "X"}).status_code == 403
    assert TestClient(app).get("/api/staff-admin/accounts").status_code == 401


def test_create_returns_temp_password_once_and_never_secrets(env):
    created = add_member(env, permissions=("support.reply", "made.up"))
    assert len(created["temporary_password"]) == 19
    acc = created["account"]
    assert acc["permissions"] == ["support.view", "support.reply"]  # implied added, unknown dropped
    assert acc["must_change_password"] and not acc["two_step"]
    listed = env["admin"].get("/api/staff-admin/accounts").json()["rows"][0]
    assert "password_hash" not in listed and "totp_secret" not in listed and "temporary_password" not in listed
    assert env["admin"].post("/api/staff-admin/accounts", json={"login_id": "Priya.S", "full_name": "Dup"}).status_code == 409
    assert env["admin"].post("/api/staff-admin/accounts", json={"login_id": "1bad", "full_name": "B"}).status_code == 400
    log = env["db"].tables["staff_audit_log"]
    assert log[-1]["action"] == "staff.create" and log[-1]["actor_label"] == "owner@testoza.com"


# ── employee sign-in ────────────────────────────────────────────────────────────
def test_wrong_origin_is_refused_even_with_a_valid_session(env):
    c, _, _ = sign_in_fully(env)
    cookie = c.cookies.get(COOKIE_NAME)
    other = TestClient(app, base_url="https://testserver", headers={"Origin": "https://app.testoza.com"})
    other.cookies.set(COOKIE_NAME, cookie)
    assert other.get("/api/staff/auth/me").status_code == 403
    no_origin = TestClient(app, base_url="https://testserver")
    no_origin.cookies.set(COOKIE_NAME, cookie)
    assert no_origin.get("/api/staff/inbox").status_code == 403
    assert c.get("/api/staff/inbox").status_code == 200


def test_session_cookie_is_httponly_strict_and_hashed(env):
    created = add_member(env)
    c = staff_client()
    r = c.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": created["temporary_password"]})
    header = r.headers["set-cookie"]
    assert header.startswith(f"{COOKIE_NAME}=")
    for flag in ("HttpOnly", "Secure", "SameSite=strict", "Path=/"):
        assert flag.lower() in header.lower()
    token = c.cookies.get(COOKIE_NAME)
    stored = env["db"].tables["staff_sessions"][0]
    assert stored["token_hash"] == sec.token_hash(token) and token not in str(stored)
    assert "Domain" not in header


def test_half_signed_in_session_cannot_open_modules(env):
    created = add_member(env)
    c = staff_client()
    c.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": created["temporary_password"]})
    assert c.get("/api/staff/inbox").status_code == 401
    me = c.get("/api/staff/auth/me").json()
    assert me["stage"] == "mfa" and me["next"] == "change_password" and me["permissions"] == []
    # 2-step can't be skipped ahead of the password change.
    assert c.post("/api/staff/auth/2fa/setup").status_code == 403


def test_full_sign_in_rotates_the_session(env):
    created = add_member(env)
    c = staff_client()
    c.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": created["temporary_password"]})
    c.post("/api/staff/auth/password", json={"current_password": created["temporary_password"], "new_password": NEW_PASSWORD})
    half = c.cookies.get(COOKIE_NAME)
    secret = c.post("/api/staff/auth/2fa/setup").json()["secret"]
    assert c.post("/api/staff/auth/2fa/verify", json={"code": "000000" if sec.totp_now(secret) != "000000" else "111111"}).status_code == 400
    assert c.post("/api/staff/auth/2fa/verify", json={"code": sec.totp_now(secret)}).status_code == 200
    full = c.cookies.get(COOKIE_NAME)
    assert full and full != half
    stale = staff_client()
    stale.cookies.set(COOKIE_NAME, half)
    assert stale.get("/api/staff/auth/me").status_code == 401
    me = c.get("/api/staff/auth/me").json()
    assert me["stage"] == "full" and me["next"] is None and "support.reply" in me["permissions"]
    acc = env["db"].tables["staff_accounts"][0]
    assert acc["totp_enabled_at"] and acc["totp_secret"].startswith("v1.") and acc["totp_pending"] is None
    actions = [r["action"] for r in env["db"].tables["staff_audit_log"]]
    assert "auth.2fa_enabled" in actions and "auth.login" in actions


def test_later_sign_in_needs_password_and_a_fresh_code(env):
    c, _, secret = sign_in_fully(env)
    c.post("/api/staff/auth/logout")
    assert c.get("/api/staff/auth/me").status_code == 401
    c2 = staff_client()
    r = c2.post("/api/staff/auth/login", json={"login_id": "PRIYA.S ", "password": NEW_PASSWORD})
    assert r.status_code == 200 and r.json()["next"] == "verify_2fa"
    # The code used a moment ago at set-up can't be replayed.
    assert c2.post("/api/staff/auth/2fa/verify", json={"code": sec.totp_now(secret)}).status_code == 400
    acc = env["db"].tables["staff_accounts"][0]
    acc["totp_last_step"] -= 1  # pretend that code was from the previous 30 s
    assert c2.post("/api/staff/auth/2fa/verify", json={"code": sec.totp_now(secret)}).status_code == 200


def test_five_wrong_passwords_lock_the_account(env):
    add_member(env)
    c = staff_client()
    for _ in range(5):
        assert c.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": "nope-nope-nope"}).status_code == 401
    created_pw_still_locked = c.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": "nope-nope-nope"})
    assert created_pw_still_locked.status_code == 429
    assert env["db"].tables["staff_accounts"][0]["locked_until"]


def test_unknown_login_ids_answer_like_real_ones(env):
    c = staff_client()
    codes = [c.post("/api/staff/auth/login", json={"login_id": "ghost.id", "password": "whatever-123"}).status_code
             for _ in range(6)]
    assert codes == [401] * 5 + [429]
    assert c.post("/api/staff/auth/login", json={"login_id": "ghost.id", "password": "x"}).json()["detail"] == staff_auth.TOO_MANY


def test_five_wrong_codes_end_the_attempt(env):
    c, _, _ = sign_in_fully(env)
    c.post("/api/staff/auth/logout")
    c2 = staff_client()
    c2.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": NEW_PASSWORD})
    results = [c2.post("/api/staff/auth/2fa/verify", json={"code": "999999"}).status_code for _ in range(5)]
    assert results[:4] == [400] * 4 and results[4] == 401
    assert c2.get("/api/staff/auth/me").status_code == 401


# ── permissions and data ────────────────────────────────────────────────────────
def test_routes_refuse_permissions_not_ticked(env):
    c, acc, _ = sign_in_fully(env, permissions=("inbox.view",))
    assert c.get("/api/staff/inbox").status_code == 200
    for path in ("/api/staff/support/messages", "/api/staff/feedback", "/api/staff/analytics/overview",
                 "/api/staff/email/campaigns"):
        assert c.get(path).status_code == 403, path
    assert c.post("/api/staff/support/messages/x/reply", json={"reply": "hi"}).status_code == 403
    denied = [r for r in env["db"].tables["staff_audit_log"] if r["action"] == "access.denied"]
    assert len(denied) == 5 and denied[0]["actor_id"] == acc["id"]
    # No staff route reaches the owner's management API.
    assert c.get("/api/staff-admin/accounts").status_code == 401


def test_permission_changes_apply_on_the_next_click(env):
    c, acc, _ = sign_in_fully(env, permissions=("inbox.view",))
    assert c.get("/api/staff/feedback").status_code == 403
    env["admin"].patch(f"/api/staff-admin/accounts/{acc['id']}", json={"permissions": ["inbox.view", "feedback.view"]})
    assert c.get("/api/staff/feedback").status_code == 200


def _help_message(env, **extra):
    row = {"id": "m-1", "name": "Asha Verma", "email": "asha@coaching.in", "phone": "+91 98765 43210",
           "message": "My test is not showing", "status": "pending", "user_id": env["teacher"],
           "created_at": "2026-11-05T08:00:00+00:00", "last_activity_at": "2026-11-05T08:00:00+00:00", **extra}
    env["db"].tables["support_messages"].append(row)
    return row


def test_support_masks_contact_details_and_logs_opens(env):
    _help_message(env)
    c, acc, _ = sign_in_fully(env)
    row = c.get("/api/staff/support/messages").json()["rows"][0]
    assert row["email"] == "as•••@coaching.in" and row["phone"] == "••••• 10" and row["contact_masked"]
    one = c.get("/api/staff/support/messages/m-1").json()
    assert "asha@coaching.in" not in str(one) and one["can_reply"]
    opened = [r for r in env["db"].tables["staff_audit_log"] if r["action"] == "support.open"]
    assert opened and opened[0]["target_id"] == "m-1" and opened[0]["actor_id"] == acc["id"]


def test_contact_permission_shows_full_details(env):
    _help_message(env)
    c, _, _ = sign_in_fully(env, permissions=("support.contact",))
    one = c.get("/api/staff/support/messages/m-1").json()
    assert one["email"] == "asha@coaching.in" and one["can_reply"] is False


def test_staff_reply_is_recorded_against_the_employee(env):
    _help_message(env)
    c, acc, _ = sign_in_fully(env)
    r = c.post("/api/staff/support/messages/m-1/reply", json={"reply": "Open My Tests → Drafts.", "resolve": True})
    assert r.status_code == 200 and r.json()["status"] == "resolved"
    turn = env["db"].tables["support_replies"][0]
    assert turn["author"] == "team" and turn["staff_id"] == acc["id"] and turn["author_id"] is None
    msg = env["db"].tables["support_messages"][0]
    assert msg["resolved_by_staff"] == acc["id"] and msg.get("resolved_by") is None
    assert env["db"].tables["notifications"][0]["user_id"] == env["teacher"]
    r = c.patch("/api/staff/support/messages/m-1", json={"status": "pending"})
    assert r.status_code == 200 and env["db"].tables["support_messages"][0]["resolved_by_staff"] is None
    actions = [x["action"] for x in env["db"].tables["staff_audit_log"]]
    assert "support.reply" in actions and "support.status" in actions


def test_admin_reply_path_is_unchanged(env):
    _help_message(env)
    r = env["admin"].post("/api/support/admin/messages/m-1/reply", json={"reply": "On it", "resolve": True})
    assert r.status_code == 200
    msg = env["db"].tables["support_messages"][0]
    admin_id = env["db"].tokens[ADMIN]
    assert msg["resolved_by"] == admin_id and env["db"].tables["support_replies"][0]["author_id"] == admin_id


# ── switching people off ────────────────────────────────────────────────────────
def test_suspend_signs_out_immediately(env):
    c, acc, _ = sign_in_fully(env)
    r = env["admin"].patch(f"/api/staff-admin/accounts/{acc['id']}", json={"status": "suspended"})
    assert r.status_code == 200
    assert c.get("/api/staff/inbox").status_code == 401
    assert staff_client().post("/api/staff/auth/login", json={"login_id": "priya.s", "password": NEW_PASSWORD}).status_code == 403
    assert env["db"].tables["staff_audit_log"][-1]["action"] in ("staff.suspend", "auth.login_blocked")


def test_access_end_date_switches_the_account_off(env):
    c, acc, _ = sign_in_fully(env)
    env["db"].tables["staff_accounts"][0]["expires_at"] = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    r = c.get("/api/staff/inbox")
    assert r.status_code == 401 and "ended" in r.json()["detail"]


def test_idle_sessions_end_after_30_minutes(env):
    c, _, _ = sign_in_fully(env)
    live = [s for s in env["db"].tables["staff_sessions"] if s["stage"] == "full"][0]
    live["last_seen_at"] = (datetime.now(timezone.utc) - timedelta(minutes=31)).isoformat()
    r = c.get("/api/staff/inbox")
    assert r.status_code == 401 and "30 minutes" in r.json()["detail"]


def test_reset_password_and_two_step(env):
    c, acc, _ = sign_in_fully(env)
    temp = env["admin"].post(f"/api/staff-admin/accounts/{acc['id']}/reset-password").json()["temporary_password"]
    assert c.get("/api/staff/inbox").status_code == 401
    c2 = staff_client()
    assert c2.post("/api/staff/auth/login", json={"login_id": "priya.s", "password": temp}).json()["next"] == "change_password"
    env["admin"].post(f"/api/staff-admin/accounts/{acc['id']}/reset-2fa")
    row = env["db"].tables["staff_accounts"][0]
    assert row["totp_secret"] is None and row["totp_enabled_at"] is None
    audit = env["admin"].get(f"/api/staff-admin/audit?staff_id={acc['id']}").json()["rows"]
    assert {"staff.reset_password", "staff.reset_2fa", "auth.login"} <= {r["action"] for r in audit}
