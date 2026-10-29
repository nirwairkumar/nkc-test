"""
Email Broadcast (routers/email_broadcast.py, services/email_render.py, services/email_library.py):
the library is honest and complete, emails render safely, unsubscribe works with one click and
can't be forged, and a send respects bounces and the hourly limit. Run from backend/:
python -m pytest tests/test_email_broadcast.py -q
"""

import json
import re
import smtplib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.routers import email_broadcast
from app.services import email_library, email_render
from tests.fake_supabase import FakeSupabase

ADMIN = "admin-token"
TEACHER = "teacher-token"


# ── The library ──────────────────────────────────────────────────────────────

def test_library_keys_tracks_and_audiences_are_consistent():
    keys = [t["key"] for t in email_library.LIBRARY]
    assert len(keys) == len(set(keys))
    tracks = {}
    for t in email_library.LIBRARY:
        assert set(t["stages"]) <= set(email_broadcast.STAGES), t["key"]
        assert set(t["audiences"]) <= set(email_broadcast.AUDIENCES), t["key"]
        assert t["audiences"], f"{t['key']} would go to everyone"
        if t["track"]:
            tracks.setdefault(t["track"], []).append(t)
    for name, items in tracks.items():
        steps = sorted(t["step"] for t in items)
        assert steps == list(range(1, len(steps) + 1)), f"track {name} skips a step: {steps}"
        # A track's emails speak to one group of people, or step order means nothing.
        assert len({(tuple(t["stages"]), tuple(t["audiences"])) for t in items}) == 1, name


def test_every_library_email_renders_cleanly_and_never_says_free():
    for t in email_library.LIBRARY:
        out = email_render.render(t["subject"], t["preheader"], t["body"], email_render.SAMPLE_PERSON,
                                  campaign_key=t["key"], campaign_tag="abcd1234", unsubscribe="https://x/u")
        assert out["warnings"] == [], (t["key"], out["warnings"])
        assert len(out["subject"]) <= 50, (t["key"], out["subject"])
        for text in (t["subject"], t["preheader"], t["body"]):
            assert not re.search(r"\bfree\b", text, re.I), f"{t['key']} says 'free'"
        for url in re.findall(r'href="([^"]+)"', out["html"]):
            assert url.startswith(("https://app.testoza.com", "https://testoza.com", "https://x/u", "mailto:")), url


# ── Rendering ────────────────────────────────────────────────────────────────

def test_render_fills_details_escapes_them_and_tags_only_our_links():
    body = ("Hi {first_name|there},\n\n**{test_title}** is ready. [Guide](https://testoza.com/guides) or "
            "[Zoho](https://zoho.com).\n\n- one\n- two\n\n[[Open]]({app}/my-tests)")
    person = {**email_render.SAMPLE_PERSON, "full_name": "asha <b>verma</b>", "latest_test_title": "<script>x</script>"}
    out = email_render.render("For {first_name|you}", "Pre", body, person,
                              campaign_key="drafted-edu-1-share", campaign_tag="1234abcd", unsubscribe="https://u")
    assert out["subject"] == "For Asha"
    assert "<script>" not in out["html"] and "&lt;script&gt;" in out["html"]
    assert "utm_campaign=drafted-edu-1-share" in out["html"] and "utm_content=1234abcd" in out["html"]
    assert 'href="https://zoho.com"' in out["html"]  # not ours: untouched
    assert "<ul" in out["html"] and out["html"].count("<li") == 2
    assert "Open: https://app.testoza.com/my-tests?utm_source=email" in out["text"]
    assert "Unsubscribe: https://u" in out["text"]


def test_render_warns_about_unknown_details_and_bad_links():
    out = email_render.render("Hi {firstname}", "", "Hello\n\n[[Go]](javascript:alert(1))", email_render.SAMPLE_PERSON)
    assert any("{firstname}" in w for w in out["warnings"])
    assert any("button" in w for w in out["warnings"])
    assert "javascript:" not in out["html"]


@pytest.mark.parametrize("name, first", [
    ("nirwair kumar", "Nirwair"), ("ASHA VERMA", "Asha"), ("McKenzie Rao", "McKenzie"),
    ("kumar123", ""), ("a", ""), ("", ""), (None, ""), ("राहुल शर्मा", "राहुल"),
])
def test_first_name(name, first):
    assert email_render.first_name_of(name) == first


def test_unsubscribe_tokens_round_trip_and_cannot_be_forged():
    tok = email_render.unsubscribe_token("Asha@Example.in")
    assert email_render.email_from_token(tok) == "asha@example.in"
    b, sig = tok.rsplit(".", 1)
    forged = email_render.unsubscribe_token("someone@else.com").split(".")[0] + "." + sig
    assert email_render.email_from_token(forged) is None
    assert email_render.email_from_token("garbage") is None


# ── Endpoints ────────────────────────────────────────────────────────────────

@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    admin = db.add_user(ADMIN, email="owner@testoza.com")
    teacher = db.add_user(TEACHER, email="asha@coaching.in")
    db.tables["admins"] = [{"email": "owner@testoza.com"}]
    for t in ("email_suppressions", "email_sends", "email_campaigns", "email_templates"):
        db.tables[t] = []
    monkeypatch.setattr(auth_core, "_admin_cache", {})
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "client": TestClient(app), "admin": admin, "teacher": teacher}
    app.dependency_overrides.clear()


def test_unsubscribe_asks_first_then_one_click_works_and_can_be_undone(env):
    c, db = env["client"], env["db"]
    tok = email_render.unsubscribe_token("asha@coaching.in")

    page = c.get(f"/api/email-broadcast/u/{tok}")
    assert page.status_code == 200 and "Stop TestoZa emails?" in page.text
    assert db.tables["email_suppressions"] == []  # a link scanner opening the page changes nothing

    done = c.post(f"/api/email-broadcast/u/{tok}", data={"List-Unsubscribe": "One-Click"})
    assert "unsubscribed" in done.text
    assert [(s["email"], s["reason"], s["user_id"]) for s in db.tables["email_suppressions"]] == [
        ("asha@coaching.in", "unsubscribed", env["teacher"])]

    c.post(f"/api/email-broadcast/u/{tok}")  # twice is fine
    assert len(db.tables["email_suppressions"]) == 1

    c.post(f"/api/email-broadcast/u/{tok}/resubscribe")
    assert db.tables["email_suppressions"] == []

    bad = c.post("/api/email-broadcast/u/not-a-token")
    assert "take you off the list" in bad.text and db.tables["email_suppressions"] == []


def test_admin_endpoints_need_an_admin(env):
    c = env["client"]
    assert c.get("/api/email-broadcast/overview").status_code == 401
    r = c.get("/api/email-broadcast/overview", headers={"Authorization": f"Bearer {TEACHER}"})
    assert r.status_code == 403


def test_library_is_copied_once_and_edits_survive(env, monkeypatch):
    db, c = env["db"], env["client"]
    monkeypatch.setattr(email_broadcast, "_library_checked", {})
    h = {"Authorization": f"Bearer {ADMIN}"}
    r = c.get("/api/email-broadcast/templates", headers=h)
    assert r.status_code == 200 and len(r.json()["templates"]) == len(email_library.LIBRARY)

    c.patch("/api/email-broadcast/templates/new-edu-1-paper", headers=h, json={"subject": "Edited subject"})
    monkeypatch.setattr(email_broadcast, "_library_checked", {})
    rows = c.get("/api/email-broadcast/templates", headers=h).json()["templates"]
    edited = next(t for t in rows if t["key"] == "new-edu-1-paper")
    assert edited["subject"] == "Edited subject" and edited["edited"] is True
    assert len(rows) == len(email_library.LIBRARY)

    bad = c.patch("/api/email-broadcast/templates/new-edu-1-paper", headers=h, json={"subject": "Hi {firstname}"})
    assert bad.status_code == 400

    c.post("/api/email-broadcast/templates/new-edu-1-paper/restore", headers=h)
    restored = next(t for t in db.tables["email_templates"] if t["key"] == "new-edu-1-paper")
    assert restored["subject"] == email_library.BY_KEY["new-edu-1-paper"]["subject"]

    copy = c.post("/api/email-broadcast/templates/new-edu-2-cbt/duplicate", headers=h).json()
    assert copy["track"] is None and copy["key"] != "new-edu-2-cbt"


class FakeSMTP:
    """Records messages; refuses one address the way a server refuses an unknown mailbox."""

    def __init__(self, refuse=()):
        self.sent, self.refuse = [], set(refuse)

    def sendmail(self, envelope, to, msg):
        if to[0] in self.refuse:
            raise smtplib.SMTPRecipientsRefused({to[0]: (550, b"No such user")})
        self.sent.append((envelope, to[0], msg))

    def quit(self):
        pass


def _campaign(db, cid="11111111-2222-3333-4444-555555555555"):
    db.tables["email_campaigns"].append({
        "id": cid, "template_key": "new-edu-1-paper", "name": "Your paper becomes a test",
        "subject": "Hi {first_name|there}", "preheader": "", "body": "Hello\n\n[[Go]]({app}/my-tests)",
        "filter": {"template": "new-edu-1-paper"}, "from_email": "no-reply@testoza.com",
        "from_name": "Nirwair from TestoZa", "reply_to": "support@testoza.com", "status": "sending",
    })
    return cid


def test_send_next_sends_marks_bounces_and_finishes(env, monkeypatch):
    db, c = env["db"], env["client"]
    cid = _campaign(db)
    claimed = [
        {"send_id": "s1", "user_id": env["teacher"], "email": "asha@coaching.in", "full_name": "Asha Verma"},
        {"send_id": "s2", "user_id": "u2", "email": "gone@nowhere.in", "full_name": "Ravi"},
    ]
    db.tables["email_sends"] = [
        {"id": r["send_id"], "campaign_id": cid, "user_id": r["user_id"], "email": r["email"],
         "template_key": "new-edu-1-paper", "status": "sending",
         "sent_at": datetime.now(timezone.utc).isoformat()} for r in claimed]

    def rpc(fn, params):
        data = {"email_claim_batch": claimed, "email_report_audience": {"ready": 0, "rows": []}}[fn]
        return SimpleNamespace(execute=lambda: SimpleNamespace(data=data))

    db.rpc = rpc
    smtp = FakeSMTP(refuse={"gone@nowhere.in"})
    monkeypatch.setattr(email_broadcast, "open_smtp", lambda cfg: smtp)
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "password", "app-password")

    r = c.post(f"/api/email-broadcast/campaigns/{cid}/send-next", headers={"Authorization": f"Bearer {ADMIN}"}, json={"n": 5})
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["sent"], body["failed"], body["status"]) == (1, 1, "done")

    status = {s["id"]: s["status"] for s in db.tables["email_sends"]}
    assert status == {"s1": "sent", "s2": "failed"}
    assert [(s["email"], s["reason"]) for s in db.tables["email_suppressions"]] == [("gone@nowhere.in", "bounced")]

    msg = smtp.sent[0][2]
    assert "List-Unsubscribe-Post: List-Unsubscribe=One-Click" in msg
    assert "Reply-To: support@testoza.com" in msg
    assert "Hi Asha" in msg
    assert db.tables["email_campaigns"][0]["status"] == "done"


def test_a_send_keeps_the_people_added_and_unticked_by_hand(env, monkeypatch):
    db, c = env["db"], env["client"]
    added, unticked = "0b6f7f6e-2c1d-4f7a-9d55-3c2b1f0e9d22", "6f1c2a7e-3b7d-4a1e-9a55-0c2b1f0e9d11"
    db.tables["email_templates"] = [{"key": "survey-v1-not-sent", "name": "Survey", "archived": False}]
    asked = []

    def rpc(fn, params):
        asked.append(params["p_filter"])
        return SimpleNamespace(execute=lambda: SimpleNamespace(data={"ready": 4, "rows": [{"id": added, "added": True}]}))

    db.rpc = rpc
    r = c.post("/api/email-broadcast/campaigns", headers={"Authorization": f"Bearer {ADMIN}"}, json={
        "subject": "What stopped your test?", "body": "Hi {first_name|there}", "template_key": "survey-v1-not-sent",
        "filter": {"q": "asha", "everyone": True, "add_ids": [added, added], "skip_ids": [unticked]},
        "audience_label": "Educators · Made a test, Tried it · +1 added · 1 unticked",
    })
    assert r.status_code == 200, r.text
    stored = db.tables["email_campaigns"][0]["filter"]
    assert stored == {"template": "survey-v1-not-sent", "add_ids": [added], "skip_ids": [unticked]}
    assert asked[0] == {**stored, "show": "ready"}  # the planned count already leaves the unticked out

    bad = c.post("/api/email-broadcast/audience", headers={"Authorization": f"Bearer {ADMIN}"},
                 json={"filter": {"add_ids": ["not-a-uuid"]}})
    assert bad.status_code == 422


def test_picking_by_hand_is_refused_until_the_sql_honours_it(env):
    db, c = env["db"], env["client"]
    db.tables["email_templates"] = [{"key": "survey-v1-not-sent", "name": "Survey", "archived": False}]
    old_rows = {"ready": 3, "rows": [{"id": "x", "email": "a@b.in"}]}  # no `added`: the old function
    db.rpc = lambda fn, params: SimpleNamespace(execute=lambda: SimpleNamespace(data=old_rows))
    r = c.post("/api/email-broadcast/campaigns", headers={"Authorization": f"Bearer {ADMIN}"}, json={
        "subject": "Hi", "body": "Hi {first_name|there}", "template_key": "survey-v1-not-sent",
        "filter": {"skip_ids": ["6f1c2a7e-3b7d-4a1e-9a55-0c2b1f0e9d11"]},
    })
    assert r.status_code == 409 and "20261028150000" in r.json()["detail"]
    assert db.tables["email_campaigns"] == []


def test_send_next_waits_when_the_hour_is_used_up(env, monkeypatch):
    db, c = env["db"], env["client"]
    cid = _campaign(db)
    now = datetime.now(timezone.utc)
    db.tables["email_sends"] = [
        {"id": f"x{i}", "user_id": f"u{i}", "email": f"p{i}@x.in", "template_key": "k", "status": "sent",
         "sent_at": (now - timedelta(minutes=50 - i)).isoformat()} for i in range(email_broadcast.HOURLY_LIMIT)]
    calls = []

    def rpc(fn, params):
        calls.append(fn)
        return SimpleNamespace(execute=lambda: SimpleNamespace(data={"ready": 7, "rows": []}))

    db.rpc = rpc
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "password", "app-password")
    r = c.post(f"/api/email-broadcast/campaigns/{cid}/send-next", headers={"Authorization": f"Bearer {ADMIN}"}, json={})
    body = r.json()
    assert body["status"] == "waiting" and body["reason"] == "hourly_limit" and body["remaining"] == 7
    assert body["resume_at"] and "email_claim_batch" not in calls


def test_a_rejected_sign_in_pauses_and_frees_everyone(env, monkeypatch):
    db, c = env["db"], env["client"]
    cid = _campaign(db)
    claimed = [{"send_id": "s1", "user_id": "u1", "email": "a@b.in", "full_name": "A"}]
    db.tables["email_sends"] = [{"id": "s1", "campaign_id": cid, "user_id": "u1", "email": "a@b.in",
                                 "template_key": "new-edu-1-paper", "status": "sending",
                                 "sent_at": datetime.now(timezone.utc).isoformat()}]
    db.rpc = lambda fn, params: SimpleNamespace(execute=lambda: SimpleNamespace(data=claimed))

    def refuse(cfg):
        raise smtplib.SMTPAuthenticationError(535, b"Authentication failed")

    monkeypatch.setattr(email_broadcast, "open_smtp", refuse)
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "password", "wrong")
    r = c.post(f"/api/email-broadcast/campaigns/{cid}/send-next", headers={"Authorization": f"Bearer {ADMIN}"}, json={})
    assert r.status_code == 409 and "SMTP_PASSWORD" in r.json()["detail"]
    assert db.tables["email_sends"] == []  # free to be sent once settings are fixed
    assert db.tables["email_campaigns"][0]["status"] == "paused"


def test_smtp_from_sends_as_our_address_when_the_login_is_not(monkeypatch):
    """Brevo signs in as xxx@smtp-brevo.com; mail must still come From (and envelope) no-reply@testoza.com."""
    smtp = FakeSMTP()
    monkeypatch.setattr(email_broadcast, "open_smtp", lambda cfg: smtp)
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "user", "b5a1fb001@smtp-brevo.com")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "from_email", "no-reply@testoza.com")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "password", "smtp-key")

    assert email_broadcast.senders()[0] == "no-reply@testoza.com"
    assert "b5a1fb001@smtp-brevo.com" not in email_broadcast.senders()

    from app.services import support_mail
    support_mail._send("asha@coaching.in", "Hi", "<p>Hi</p>")
    envelope, to, msg = smtp.sent[0]
    assert envelope == "no-reply@testoza.com" and to == "asha@coaching.in"
    assert "From: TestoZa Support <no-reply@testoza.com>" in msg

    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "from_email", "")
    assert email_broadcast.sender_address() == "b5a1fb001@smtp-brevo.com"  # unset = the login, as with Zoho


# ── Amazon SES for broadcasts ────────────────────────────────────────────────

SES = {"host": "email-smtp.ap-southeast-2.amazonaws.com", "port": 587, "user": "AKIASESSMTPUSER",
       "password": "ses-smtp-password", "from_email": "no-reply@testoza.com"}


def test_broadcasts_go_through_their_own_connection_and_platform_mail_does_not(env, monkeypatch):
    for k, v in SES.items():
        monkeypatch.setitem(email_broadcast.broadcast_smtp_config, k, v)
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "host", "smtp-relay.brevo.com")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "user", "b5a1fb001@smtp-brevo.com")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "from_email", "no-reply@updates.testoza.com")
    monkeypatch.setitem(email_broadcast.runtime_smtp_config, "password", "brevo-key")
    monkeypatch.setenv("EMAIL_SENDERS", "nirwair@testoza.com")
    used = []
    smtp = FakeSMTP()
    monkeypatch.setattr(email_broadcast, "open_smtp", lambda cfg: used.append(cfg["host"]) or smtp)

    assert email_broadcast.senders() == ["no-reply@testoza.com", "nirwair@testoza.com"]
    status = env["client"].get("/api/email-broadcast/smtp-status", headers={"Authorization": f"Bearer {ADMIN}"}).json()
    assert status["service"] == "Amazon SES" and status["separate"] is True
    assert status["automatic"] == {"service": "Brevo", "configured": True}

    r = env["client"].post("/api/email-broadcast/test", headers={"Authorization": f"Bearer {ADMIN}"},
                           json={"to": "owner@testoza.com", "subject": "Hi", "preheader": "", "body": "Hello",
                                 "from_email": "nirwair@testoza.com"})
    assert r.status_code == 200, r.text
    from app.services import support_mail
    support_mail._send("asha@coaching.in", "Hi", "<p>Hi</p>")

    assert used == ["email-smtp.ap-southeast-2.amazonaws.com", "smtp-relay.brevo.com"]
    assert smtp.sent[0][0] == "no-reply@testoza.com" and "From: TestoZa <nirwair@testoza.com>" in smtp.sent[0][2]
    assert smtp.sent[1][0] == "no-reply@updates.testoza.com"


def test_without_a_broadcast_connection_broadcasts_use_the_platform_one(monkeypatch):
    monkeypatch.setitem(email_broadcast.broadcast_smtp_config, "password", "")
    assert email_broadcast.broadcast_smtp() is email_broadcast.runtime_smtp_config


def test_ses_unverified_from_pauses_the_send_instead_of_failing_everyone(env, monkeypatch):
    db, c = env["db"], env["client"]
    cid = _campaign(db)
    claimed = [{"send_id": "s1", "user_id": "u1", "email": "a@b.in", "full_name": "A"},
               {"send_id": "s2", "user_id": "u2", "email": "c@d.in", "full_name": "C"}]
    db.tables["email_sends"] = [{"id": r["send_id"], "campaign_id": cid, "user_id": r["user_id"], "email": r["email"],
                                 "template_key": "new-edu-1-paper", "status": "sending",
                                 "sent_at": datetime.now(timezone.utc).isoformat()} for r in claimed]
    db.rpc = lambda fn, params: SimpleNamespace(execute=lambda: SimpleNamespace(data=claimed))
    for k, v in SES.items():
        monkeypatch.setitem(email_broadcast.broadcast_smtp_config, k, v)

    class Unverified(FakeSMTP):
        def sendmail(self, envelope, to, msg):
            raise smtplib.SMTPDataError(554, b"Message rejected: Email address is not verified.")

    monkeypatch.setattr(email_broadcast, "open_smtp", lambda cfg: Unverified())
    r = c.post(f"/api/email-broadcast/campaigns/{cid}/send-next", headers={"Authorization": f"Bearer {ADMIN}"}, json={})
    assert r.status_code == 409 and "Amazon SES refused the From address" in r.json()["detail"]
    assert db.tables["email_sends"] == [] and db.tables["email_campaigns"][0]["status"] == "paused"


def test_ses_hard_bounces_and_spam_reports_stop_future_broadcasts(env):
    db = env["db"]
    n = email_broadcast.apply_ses_event(db, {"notificationType": "Bounce", "bounce": {
        "bounceType": "Permanent", "bounceSubType": "General",
        "bouncedRecipients": [{"emailAddress": "Gone@Nowhere.in", "diagnosticCode": "smtp; 550 5.1.1 user unknown"}]}})
    assert n == 1
    assert email_broadcast.apply_ses_event(db, {"eventType": "Bounce", "bounce": {
        "bounceType": "Transient", "bouncedRecipients": [{"emailAddress": "full@box.in"}]}}) == 0
    email_broadcast.apply_ses_event(db, {"notificationType": "Complaint", "complaint": {
        "complainedRecipients": [{"emailAddress": "asha@coaching.in"}]}})

    rows = {s["email"]: s for s in db.tables["email_suppressions"]}
    assert set(rows) == {"gone@nowhere.in", "asha@coaching.in"}
    assert rows["gone@nowhere.in"]["reason"] == "bounced" and "user unknown" in rows["gone@nowhere.in"]["note"]
    assert rows["asha@coaching.in"]["reason"] == "unsubscribed" and rows["asha@coaching.in"]["user_id"] == env["teacher"]


def _signed_sns(key, fields):
    import base64

    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding

    msg = {"SignatureVersion": "2", "SigningCertURL": "https://sns.ap-southeast-2.amazonaws.com/SimpleNotificationService-x.pem",
           "MessageId": "m-1", "Timestamp": "2026-10-29T10:00:00.000Z", **fields}
    keys = (("Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type") if msg["Type"] == "Notification"
            else ("Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"))
    text = "".join(f"{k}\n{msg[k]}\n" for k in keys if k in msg)
    msg["Signature"] = base64.b64encode(key.sign(text.encode(), padding.PKCS1v15(), hashes.SHA256())).decode()
    return msg


@pytest.fixture()
def sns(monkeypatch):
    """A throwaway certificate standing in for SNS's, served wherever httpx asks for a .pem."""
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "sns.amazonaws.com")])
    now = datetime.now(timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(1).not_valid_before(now).not_valid_after(now + timedelta(days=1)).sign(key, hashes.SHA256()))
    pem = cert.public_bytes(serialization.Encoding.PEM)
    fetched = []

    def fake_get(url, timeout=None):
        fetched.append(url)
        return SimpleNamespace(content=pem if url.endswith(".pem") else b"ok", raise_for_status=lambda: None)

    monkeypatch.setattr(email_broadcast.httpx, "get", fake_get)
    monkeypatch.setattr(email_broadcast, "_sns_certs", {})
    topic = "arn:aws:sns:ap-southeast-2:123456789012:testoza-ses-events"
    monkeypatch.setenv("SES_SNS_TOPIC_ARN", topic)
    return SimpleNamespace(key=key, topic=topic, fetched=fetched)


def test_ses_events_endpoint_confirms_the_subscription_and_applies_signed_bounces(env, sns):
    c, db = env["client"], env["db"]
    url = "/api/email-broadcast/ses-events"
    confirm = _signed_sns(sns.key, {"Type": "SubscriptionConfirmation", "TopicArn": sns.topic, "Token": "t",
                                    "Message": "You have chosen to subscribe",
                                    "SubscribeURL": "https://sns.ap-southeast-2.amazonaws.com/?Action=ConfirmSubscription&Token=t"})
    assert c.post(url, content=json.dumps(confirm)).json() == {"subscribed": True}
    assert any("ConfirmSubscription" in u for u in sns.fetched)

    event = {"notificationType": "Bounce", "bounce": {"bounceType": "Permanent",
             "bouncedRecipients": [{"emailAddress": "gone@nowhere.in"}]}}
    note = _signed_sns(sns.key, {"Type": "Notification", "TopicArn": sns.topic, "Message": json.dumps(event)})
    assert c.post(url, content=json.dumps(note)).json() == {"ok": True, "stopped": 1}
    assert [s["email"] for s in db.tables["email_suppressions"]] == ["gone@nowhere.in"]


def test_ses_events_endpoint_refuses_other_topics_and_forged_messages(env, sns):
    c, db = env["client"], env["db"]
    url = "/api/email-broadcast/ses-events"
    event = json.dumps({"notificationType": "Complaint", "complaint": {"complainedRecipients": [{"emailAddress": "x@y.in"}]}})

    other = _signed_sns(sns.key, {"Type": "Notification", "TopicArn": "arn:aws:sns:us-east-1:999:not-ours", "Message": event})
    assert c.post(url, content=json.dumps(other)).status_code == 403

    forged = _signed_sns(sns.key, {"Type": "Notification", "TopicArn": sns.topic, "Message": event})
    forged["Message"] = event.replace("x@y.in", "victim@y.in")
    assert c.post(url, content=json.dumps(forged)).status_code == 403

    off_aws = _signed_sns(sns.key, {"Type": "Notification", "TopicArn": sns.topic, "Message": event,
                                    "SigningCertURL": "https://evil.example.com/cert.pem"})
    assert c.post(url, content=json.dumps(off_aws)).status_code == 403
    assert c.post(url, content="not json").status_code == 400
    assert db.tables["email_suppressions"] == []
