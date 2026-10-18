"""
Help messages (app/routers/support.py + services/support_mail.py): a message reaches the
team, the writer sees our reply, and only admins can answer. Run from backend/:
python -m pytest tests/test_support_help.py -q
"""

import base64
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.services import support_mail
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

TEACHER = "teacher-token"
ADMIN = "admin-token"
PNG_1PX = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32).decode()


class FakeBucket:
    def __init__(self, store):
        self.store = store

    def upload(self, path, raw, file_options=None):
        self.store[path] = raw

    def create_signed_url(self, path, _expires):
        return {"signedURL": f"https://signed/{path}"}


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user(TEACHER, email="asha@coaching.in")
    admin = db.add_user(ADMIN, email="owner@testoza.com")
    db.tables["profiles"][0]["full_name"] = "Asha Verma"
    db.tables["admins"] = [{"email": "owner@testoza.com"}]
    db.tables["support_messages"] = []
    db.tables["notifications"] = []
    uploads = {}
    db.storage = SimpleNamespace(from_=lambda _bucket: FakeBucket(uploads))

    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(auth_core, "_admin_cache", {})
    # Run the "tell the team" step inline so the test can see it.
    monkeypatch.setattr(support_mail, "on_new_message_in_background", support_mail._on_new_message)
    monkeypatch.setattr(support_mail, "_smtp_ready", lambda: None)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    yield {"db": db, "client": client, "teacher": teacher, "admin": admin, "uploads": uploads}
    app.dependency_overrides.clear()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_signed_in_message_uses_account_email_and_tells_admins(env):
    res = env["client"].post(
        "/api/support/message",
        json={"message": "I made a test and can't find it", "topic": "create", "context": {"from": "/create-test"}},
        headers=_auth(TEACHER),
    )
    assert res.status_code == 200, res.text
    assert res.json()["email"] == "asha@coaching.in"

    saved = env["db"].tables["support_messages"][0]
    assert saved["user_id"] == env["teacher"]
    assert saved["name"] == "Asha Verma"
    assert saved["topic"] == "create"
    assert saved["context"] == {"from": "/create-test"}
    assert saved["source"] == "app"
    assert saved["status"] == "pending"

    notes = env["db"].tables["notifications"]
    assert [n["user_id"] for n in notes] == [env["admin"]]
    assert notes[0]["link"].endswith(f"tab=support&id={saved['id']}")


def test_public_message_needs_an_email(env):
    res = env["client"].post("/api/support/message", json={"message": "Hello, how do I start?"})
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()
    assert env["db"].tables["support_messages"] == []


def test_unknown_topic_is_dropped_and_old_form_still_works(env):
    res = env["client"].post(
        "/api/support/message",
        json={"name": "Ravi", "email": "ravi@x.in", "phone": "+91 99999 11111", "message": "Pricing?", "topic": "hack"},
    )
    assert res.status_code == 200
    saved = env["db"].tables["support_messages"][0]
    assert saved["topic"] is None
    assert saved["user_id"] is None
    assert saved["source"] == "public"


def test_screenshot_is_stored_privately(env):
    res = env["client"].post(
        "/api/support/message", json={"message": "See the picture", "screenshot": PNG_1PX}, headers=_auth(TEACHER),
    )
    assert res.status_code == 200, res.text
    path = env["db"].tables["support_messages"][0]["screenshot_path"]
    assert path.endswith(".png") and path in env["uploads"]


def test_screenshot_that_is_not_an_image_is_refused(env):
    fake = "data:image/png;base64," + base64.b64encode(b"<script>alert(1)</script>").decode()
    res = env["client"].post("/api/support/message", json={"message": "x" * 10, "screenshot": fake}, headers=_auth(TEACHER))
    assert res.status_code == 400
    assert env["db"].tables["support_messages"] == []


def test_reply_is_admin_only_and_reaches_the_writer(env):
    env["client"].post("/api/support/message", json={"message": "Results not showing"}, headers=_auth(TEACHER))
    msg_id = env["db"].tables["support_messages"][0]["id"]
    env["db"].tables["notifications"].clear()

    denied = env["client"].post(f"/api/support/admin/messages/{msg_id}/reply", json={"reply": "hi"}, headers=_auth(TEACHER))
    assert denied.status_code == 403

    ok = env["client"].post(
        f"/api/support/admin/messages/{msg_id}/reply",
        json={"reply": "Open My Tests → Results.", "resolve": False},
        headers=_auth(ADMIN),
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == "replied"
    assert ok.json()["emailed"] is False  # no SMTP in tests

    saved = env["db"].tables["support_messages"][0]
    assert saved["reply"] == "Open My Tests → Results."
    assert saved["status"] == "replied"
    assert env["db"].tables["notifications"][0]["user_id"] == env["teacher"]
    assert env["db"].tables["notifications"][0]["link"] == "/help"

    mine = env["client"].get("/api/support/mine", headers=_auth(TEACHER)).json()["messages"]
    assert mine[0]["reply"] == "Open My Tests → Results."


def test_mine_shows_only_own_messages(env):
    env["client"].post("/api/support/message", json={"name": "P", "email": "p@x.in", "message": "public one"})
    env["client"].post("/api/support/message", json={"message": "teacher one"}, headers=_auth(TEACHER))
    mine = env["client"].get("/api/support/mine", headers=_auth(TEACHER)).json()["messages"]
    assert [m["message"] for m in mine] == ["teacher one"]
    assert env["client"].get("/api/support/mine").status_code == 401


def test_resolve_and_reopen(env):
    env["client"].post("/api/support/message", json={"message": "Done already"}, headers=_auth(TEACHER))
    msg_id = env["db"].tables["support_messages"][0]["id"]
    res = env["client"].patch(f"/api/support/admin/messages/{msg_id}", json={"status": "resolved"}, headers=_auth(ADMIN))
    assert res.status_code == 200
    assert env["db"].tables["support_messages"][0]["resolved_by"] == env["admin"]
    env["client"].patch(f"/api/support/admin/messages/{msg_id}", json={"status": "pending"}, headers=_auth(ADMIN))
    assert env["db"].tables["support_messages"][0]["resolved_at"] is None


def test_emails_escape_user_text():
    alert = support_mail.build_team_alert({"id": "m1", "name": "<b>x</b>", "email": "a@b.c", "message": "<img src=x>"})
    assert "<img src=x>" not in alert["html"] and "&lt;img" in alert["html"]
    reply = support_mail.build_reply("Asha Verma", "line one\nline two", "Fixed <now>")
    assert "Hi Asha," in reply["html"] and "line one<br>line two" in reply["html"]
    assert "Fixed &lt;now&gt;" in reply["html"]
