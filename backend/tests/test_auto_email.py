"""
Automatic emails (services/auto_email.py, auto_email_content.py, mailer.py, routers/email_auto.py):
who gets which email and when, one thread per test, the guards, the fallback service, and the
admin page's numbers. Run from backend/: python -m pytest tests/test_auto_email.py -q
"""

import html
import re
import smtplib
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.services import auto_email, auto_email_content as content, mailer
from tests.fake_supabase import FakeSupabase

ADMIN = "admin-token"
TEACHER = "teacher-token"


class Outbox:
    """Stands in for mailer.deliver and records every email."""

    def __init__(self):
        self.sent = []
        self.n = 0

    def __call__(self, to, subject, html, text=None, *, from_name="TestoZa", reply_to=None, headers=None, **_):
        self.n += 1
        self.sent.append({"to": to, "subject": subject, "html": html, "text": text, "headers": headers or {}})
        return mailer.Delivery("primary", "Amazon SES", f"<own{self.n}@testoza.com>",
                               f"<ses{self.n}@ap-southeast-2.amazonses.com>")


@pytest.fixture()
def world(monkeypatch):
    db = FakeSupabase()
    db.tables.update({"email_auto_log": [], "email_auto_settings": [], "email_suppressions": [], "user_tests": [],
                      "tests": [], "profiles": [
                          {"id": "u1", "email": "asha@coaching.in", "full_name": "asha verma", "designation": "Teacher"},
                          {"id": "u2", "email": "candidate@guest.testoza.com", "full_name": "Guest", "designation": None},
                      ]})
    box = Outbox()
    monkeypatch.setattr(mailer, "deliver", box)
    monkeypatch.setattr(mailer, "ready", lambda: True)
    monkeypatch.setattr(auto_email, "_background", lambda name, fn, *args: fn(*args))  # run inline
    monkeypatch.setattr(auto_email, "_memory", {})
    monkeypatch.setattr(auto_email, "_settings_cache", {"at": None, "values": {}})
    monkeypatch.setattr(auto_email, "_installed", {"log": True, "settings": True})
    return db, box


def _test(**kw):
    t = {"id": "t1", "created_by": "u1", "title": "Weekly Mock 5", "slug": "weekly-mock-5", "duration": 60,
         "total_questions": 45, "settings": {}}
    t.update(kw)
    return t


def _submit(db, n, test_id="t1"):
    for i in range(n):
        db.tables["user_tests"].append({"id": f"a{len(db.tables['user_tests'])}", "test_id": test_id,
                                        "user_id": f"c{len(db.tables['user_tests'])}", "score": 100 + i,
                                        "questions_attempted": 10})


# ── Welcome ──────────────────────────────────────────────────────────────────

def test_welcome_goes_once_to_educators_only(world):
    db, box = world
    auto_email.on_signup(db, "u1", "Teacher", "asha@coaching.in", "asha verma")
    auto_email.on_signup(db, "u1", "Teacher", "asha@coaching.in", "asha verma")  # register + onboarding
    auto_email.on_signup(db, "u3", "Student", "kid@gmail.com", "Kid")
    assert [m["to"] for m in box.sent] == ["asha@coaching.in"]
    m = box.sent[0]
    assert m["subject"] == "Welcome to TestoZa, Asha"
    for vid in ("lGjJF5zKLhU", "rOQ1OGA2lk4", "RWaYA4YlRYY"):
        assert vid in m["html"] and vid in m["text"]
    assert "/generate-with-ai?utm_source=email&utm_medium=auto&utm_campaign=welcome" in html.unescape(m["html"])
    assert m["headers"]["Auto-Submitted"] == "auto-generated"
    log = db.tables["email_auto_log"]
    assert [(r["kind"], r["status"], r["provider"]) for r in log] == [("welcome", "sent", "Amazon SES")]


def test_welcome_respects_the_switch(world):
    db, box = world
    db.tables["email_auto_settings"] = [{"kind": "welcome", "enabled": False}]
    auto_email.on_signup(db, "u1", "Institution", "asha@coaching.in", "Asha")
    assert box.sent == []


# ── Test created ─────────────────────────────────────────────────────────────

def test_test_created_once_a_day_and_never_for_examples_copies_or_empty(world):
    db, box = world
    auto_email.on_test_created(db, _test())
    auto_email.on_test_created(db, _test(id="t2", title="Second"))  # same day: skipped
    auto_email.on_test_created(db, _test(id="t3", settings={"is_user_example": True}))
    auto_email.on_test_created(db, _test(id="t4", is_cloned=True))
    auto_email.on_test_created(db, _test(id="t5", total_questions=0, questions=[]))
    assert [m["subject"] for m in box.sent] == ['"Weekly Mock 5" is ready']
    assert "45 questions · 60 min" in box.sent[0]["html"]


def test_test_created_escapes_the_title(world):
    db, box = world
    auto_email.on_test_created(db, _test(title='<img src=x onerror=alert(1)>'))
    assert "<img src=x" not in box.sent[0]["html"] and "&lt;img src=x" in box.sent[0]["html"]


# ── Live / ended ─────────────────────────────────────────────────────────────

def test_going_live_sends_the_link_and_a_whatsapp_message(world):
    db, box = world
    after = _test(settings={"conduct_exam": {"enabled": True, "conduct_slug": "mock-5-ab12", "join_code": "835006"},
                            "start_form": {"enabled": True, "fields": [{"label": "Name"}, {"label": "Roll No"}]}})
    assert auto_email.on_conduct_change(db, {}, after) == "live"
    m = box.sent[0]
    assert m["subject"] == '"Weekly Mock 5" is live'
    assert "https://app.testoza.com/test/mock-5-ab12" in m["html"]
    assert "835 006" in m["html"]
    assert "https://wa.me/?text=" in m["html"]
    assert "enter%20your%20name%20and%20roll%20no" in m["html"]
    # Turning it on again within 6 hours doesn't email again.
    auto_email.on_conduct_change(db, {}, after)
    assert len(box.sent) == 1


def test_no_change_no_email(world):
    db, box = world
    live = {"conduct_exam": {"enabled": True}}
    assert auto_email.on_conduct_change(db, live, _test(settings=live)) is None
    assert auto_email.on_conduct_change(db, {}, _test(settings={})) is None
    assert auto_email.on_conduct_change(db, {}, _test(settings={"is_user_example": True, **live})) is None
    assert box.sent == []


def test_submissions_and_ended_share_one_thread(world):
    db, box = world
    _submit(db, 1)
    auto_email.on_submission(db, "u1", "t1", "Weekly Mock 5")
    _submit(db, 1)
    auto_email.on_submission(db, "u1", "t1", "Weekly Mock 5")  # 2: not a milestone
    _submit(db, 3)
    auto_email.on_submission(db, "u1", "t1", "Weekly Mock 5 (renamed)")  # 5
    auto_email.on_submission(db, "u1", "t1", "Weekly Mock 5")  # 5 again (race): once only
    auto_email.on_conduct_change(db, {"conduct_exam": {"enabled": True}}, _test(settings={"conduct_exam": {"enabled": False}}))

    assert len(box.sent) == 3
    subjects = {m["subject"] for m in box.sent}
    assert subjects == {'Results: "Weekly Mock 5"'}  # the first email's subject, even after a rename
    root = "<test.t1@testoza.com>"
    first, second, third = box.sent
    assert first["headers"]["In-Reply-To"] == root and first["headers"]["References"] == root
    assert second["headers"]["In-Reply-To"] == "<ses1@ap-southeast-2.amazonses.com>"
    assert root in second["headers"]["References"] and "<own1@testoza.com>" in second["headers"]["References"]
    assert third["headers"]["In-Reply-To"] == "<ses2@ap-southeast-2.amazonses.com>"
    assert "5 candidates" in second["html"] and "Top score" in second["html"]
    assert "You ended" in third["html"] and "/analytics/full?testId=t1" in third["html"]
    assert [r["milestone"] for r in db.tables["email_auto_log"]] == [1, 5, None]


def test_ended_with_nobody_says_so(world):
    db, box = world
    auto_email.on_conduct_change(db, {"conduct_exam": {"enabled": True}}, _test(settings={}))
    assert "Nobody submitted" in box.sent[0]["html"]


# ── Recipients ───────────────────────────────────────────────────────────────

def test_guest_bounced_and_stopped_addresses_are_skipped(world):
    db, box = world
    db.tables["email_suppressions"] = [{"email": "gone@x.in", "reason": "bounced"},
                                       {"email": "nope@x.in", "reason": "stopped"},
                                       {"email": "unsub@x.in", "reason": "unsubscribed"}]
    mail = content.sample("results")
    for to in ("c@guest.testoza.com", "team@testoza.com", "gone@x.in", "nope@x.in", "unsub@x.in"):
        auto_email.send(db, "results", to, mail, user_id="u1")
    assert [m["to"] for m in box.sent] == ["unsub@x.in"]  # unsubscribing stops tips, not their own exams
    assert sorted((r["email"], r["status"]) for r in db.tables["email_auto_log"]) == [
        ("gone@x.in", "skipped"), ("nope@x.in", "skipped"), ("unsub@x.in", "sent")]


def test_a_failed_send_is_logged_and_never_raises(world, monkeypatch):
    db, _ = world

    def boom(*a, **k):
        raise smtplib.SMTPRecipientsRefused({"x@y.in": (550, b"no such user")})

    monkeypatch.setattr(mailer, "deliver", boom)
    assert auto_email.send(db, "welcome", "x@y.in", content.sample("welcome")) is None
    assert db.tables["email_auto_log"][0]["status"] == "failed"


def test_works_without_the_sql(world, monkeypatch):
    """Before 20261102120000_email_automatic.sql: emails still go, guards use memory."""
    db, box = world
    monkeypatch.setattr(auto_email, "_installed", {"log": False, "settings": False})
    auto_email.on_signup(db, "u1", "Teacher", "asha@coaching.in", "Asha")
    auto_email.on_signup(db, "u1", "Teacher", "asha@coaching.in", "Asha")
    assert len(box.sent) == 1 and db.tables["email_auto_log"] == []


# ── Content ──────────────────────────────────────────────────────────────────

def test_samples_render_and_keep_the_house_rules():
    for kind in auto_email.ORDER:
        m = content.sample(kind)
        assert m["subject"] and m["preheader"] and "<html" in m["html"]
        for text in (m["subject"], m["preheader"], m["text"]):
            assert not re.search(r"\bfree\b", text, re.I), kind
            assert not re.search(r"\bstudents?\b", text, re.I), kind  # "candidates"
            assert not re.search(r"\bteachers?\b", text, re.I), kind
        for url in re.findall(r'href="([^"]+)"', m["html"]):
            assert url.startswith(("https://app.testoza.com", "https://testoza.com", "https://www.youtube.com",
                                   "https://wa.me/")), (kind, url)


def test_invite_text_matches_the_app():
    t = {**content.SAMPLE_TEST, "settings": {"conduct_exam": {"enabled": True, "conduct_slug": "s1", "join_code": "123456"},
                                              "start_form": {"enabled": True, "fields": [{"label": "Name"}]}}}
    text = content.invite_text(t)
    assert text.startswith("*Weekly Mock 5 — Physics — Sharma Classes*")
    assert "https://app.testoza.com/test/s1" in text
    assert "Open the link, enter your name, then tap Start." in text
    assert "enter code 123 456" in text


# ── Mailer ───────────────────────────────────────────────────────────────────

def test_ses_message_id_from_the_data_reply():
    assert mailer.ses_message_id("email-smtp.ap-southeast-2.amazonaws.com",
                                 "Ok 0108019a2b3c4d5e-11112222-3333-4444-5555-666677778888-000000") == \
        "<0108019a2b3c4d5e-11112222-3333-4444-5555-666677778888-000000@ap-southeast-2.amazonses.com>"
    assert mailer.ses_message_id("email-smtp.us-east-1.amazonaws.com", "Ok 0100018abcdefabcdefabcdef").endswith(
        "@email.amazonses.com>")
    assert mailer.ses_message_id("smtp-relay.brevo.com", "Ok queued as 123") == ""


def test_fallback_only_when_the_service_itself_fails(monkeypatch):
    from app.routers import email_broadcast

    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "host", "email-smtp.ap-southeast-2.amazonaws.com")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "user", "AKIA")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "password", "pw")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "from_email", "no-reply@testoza.com")
    monkeypatch.setattr(mailer, "fallback_smtp_config", {"host": "smtp-relay.brevo.com", "port": 587, "user": "b@smtp-brevo.com",
                                                         "password": "k", "from_email": "no-reply@updates.testoza.com"})
    calls = []

    def transmit(cfg, sender, to, data):
        calls.append((cfg["host"], sender))
        if cfg["host"].startswith("email-smtp") and to == "a@b.in":
            raise smtplib.SMTPAuthenticationError(535, b"Authentication Credentials Invalid")
        if to == "bad@b.in":
            raise smtplib.SMTPRecipientsRefused({to: (550, b"no")})
        return "Ok queued"

    monkeypatch.setattr(mailer, "_transmit", transmit)
    d = mailer.deliver("a@b.in", "S", "<p>x</p>")
    assert d.provider == "fallback" and d.service == "Brevo"
    assert calls == [("email-smtp.ap-southeast-2.amazonaws.com", "no-reply@testoza.com"),
                     ("smtp-relay.brevo.com", "no-reply@updates.testoza.com")]
    calls.clear()
    with pytest.raises(smtplib.SMTPRecipientsRefused):
        mailer.deliver("bad@b.in", "S", "<p>x</p>")
    assert len(calls) == 1  # a bad address isn't the service's fault


# ── Admin page ───────────────────────────────────────────────────────────────

@pytest.fixture()
def admin_env(monkeypatch, world):
    db, box = world
    db.add_user(ADMIN, email="owner@testoza.com")
    db.add_user(TEACHER, email="asha@coaching.in")
    db.tables["admins"] = [{"email": "owner@testoza.com"}]
    monkeypatch.setattr(auth_core, "_admin_cache", {})
    app.dependency_overrides[get_db] = lambda: db
    yield db, box, TestClient(app)
    app.dependency_overrides.clear()


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def test_admin_page_counts_switches_previews_and_tests(admin_env):
    db, box, c = admin_env
    now = datetime.now(timezone.utc).isoformat()
    db.rpcs["email_auto_report"] = lambda _db, _p: {
        "kinds": {"results": {"today": 2, "week": 5, "month": 9, "total": 30, "failed": 1, "skipped": 0,
                              "last_at": now, "clicked": 4}},
        "settings": {"test_created": False}, "daily": [{"day": "2026-11-02", "n": 2}]}

    assert c.get("/api/email-broadcast/auto", headers=_h(TEACHER)).status_code == 403
    r = c.get("/api/email-broadcast/auto", headers=_h(ADMIN)).json()
    assert r["installed"] is True
    by = {k["key"]: k for k in r["kinds"]}
    assert list(by) == ["welcome", "test_created", "test_live", "results", "test_ended"]
    assert by["results"]["total"] == 30 and by["results"]["clicked"] == 4 and by["welcome"]["total"] == 0
    assert by["test_created"]["enabled"] is False and by["welcome"]["enabled"] is True

    assert c.patch("/api/email-broadcast/auto/welcome", json={"enabled": False}, headers=_h(ADMIN)).json() == \
        {"key": "welcome", "enabled": False}
    assert db.tables["email_auto_settings"][0]["kind"] == "welcome"
    assert auto_email.settings(db)["welcome"] is False
    assert c.patch("/api/email-broadcast/auto/nope", json={"enabled": False}, headers=_h(ADMIN)).status_code == 404

    p = c.post("/api/email-broadcast/auto/test_live/preview", headers=_h(ADMIN)).json()
    assert p["subject"].endswith("is live") and "<html" in p["html"]

    t = c.post("/api/email-broadcast/auto/welcome/test", json={"to": "me@x.in"}, headers=_h(ADMIN)).json()
    assert t["sent"] is True and box.sent[-1]["subject"].startswith("[Test] Welcome")
    assert db.tables["email_auto_log"] == []  # tests aren't counted


def test_admin_page_before_the_sql(admin_env):
    _, _, c = admin_env
    r = c.get("/api/email-broadcast/auto", headers=_h(ADMIN)).json()  # no email_auto_report function
    assert r["installed"] is False and all(k["enabled"] for k in r["kinds"])


def test_log_lists_newest_first_and_filters(admin_env):
    db, _, c = admin_env
    t0 = datetime(2026, 11, 2, tzinfo=timezone.utc)
    db.tables["email_auto_log"] = [
        {"id": str(i), "kind": k, "email": e, "subject": "s", "status": st, "created_at": (t0 + timedelta(minutes=i)).isoformat()}
        for i, (k, e, st) in enumerate([("welcome", "a@x.in", "sent"), ("results", "b@x.in", "failed"), ("results", "a@x.in", "sent")])]
    r = c.get("/api/email-broadcast/auto/log", headers=_h(ADMIN)).json()
    assert [x["id"] for x in r["rows"]] == ["2", "1", "0"] and r["total"] == 3
    r = c.get("/api/email-broadcast/auto/log?kind=results&status=failed", headers=_h(ADMIN)).json()
    assert [x["id"] for x in r["rows"]] == ["1"]
    r = c.get("/api/email-broadcast/auto/log?q=A@X", headers=_h(ADMIN)).json()
    assert [x["id"] for x in r["rows"]] == ["2", "0"]
