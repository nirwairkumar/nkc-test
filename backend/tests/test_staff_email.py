"""
Email on team.testoza.com (routers/staff/email.py): employees get admin → Email minus Settings,
and a stolen team session can't turn it into a spam or phishing tool. Run from backend/:
python -m pytest tests/test_staff_email.py -q
"""

from datetime import datetime, timezone

import pytest

from app.routers import email_broadcast as eb
from app.routers.staff import email as staff_email
from app.routers.staff.deps import normalize_permissions
from tests.test_staff_team import env, sign_in_fully  # noqa: F401  (env is a fixture)

ASHA = {
    "id": "0b6f7f6e-2c1d-4f7a-9d55-3c2b1f0e9d22", "email": "asha@coaching.in", "full_name": "Asha Verma",
    "designation": "Teacher", "who": "educator", "stage": "drafted", "status": "ready", "added": False,
    "tests_created": 2, "results": 0, "latest_test_title": "Physics Test",
}
VIEW = ("email.view",)
SEND = ("email.send",)


@pytest.fixture()
def mail(env, monkeypatch):  # noqa: F811
    db = env["db"]
    for t in ("email_suppressions", "email_sends", "email_campaigns", "email_templates"):
        db.tables[t] = []
    db.rpcs.update({
        "email_report_overview": lambda d, p: {"people": 1, "ready_people": 1, "templates": [], "matrix": [],
                                               "sent": {"week": 0}, "sending": []},
        "email_report_audience": lambda d, p: {"total": 1, "ready": 1, "shown": 1, "skipped": {},
                                               "rows": [dict(ASHA)]},
        "email_people": lambda d, p: [dict(ASHA)],
        "email_report_campaigns": lambda d, p: {"total": len(d.tables["email_campaigns"]), "rows": [
            {"id": c["id"], "name": c["name"], "subject": c["subject"], "status": c["status"], "sent": 0}
            for c in d.tables["email_campaigns"]]},
        "email_report_campaign": lambda d, p: {
            "campaign": {**next(c for c in d.tables["email_campaigns"] if c["id"] == p["p_id"]),
                         "created_by": "admin-uuid"},
            "recipients": [{"id": "s1", "user_id": ASHA["id"], "email": "asha@coaching.in", "full_name": "Asha",
                            "status": "failed", "error": "550 <asha@coaching.in>: no such user",
                            "sent_at": datetime.now(timezone.utc).isoformat(),
                            "came_back": False, "clicked": False, "unsubscribed": False}]},
    })
    monkeypatch.setattr(eb, "_library_checked", {})
    monkeypatch.setitem(eb.runtime_smtp_config, "password", "smtp-password")
    sent = []
    monkeypatch.setattr(eb, "send_smtp_message", lambda cfg, frm, name, to, subject, html, **kw: sent.append(
        {"to": to, "subject": subject, "html": html, **kw}))
    staff_email.tests_per_staff.clients.clear()
    staff_email.sends_per_staff.clients.clear()
    env["sent"] = sent
    return env


def draft(**kw):
    return {"subject": "Your test is ready", "preheader": "", "body": "Hi {first_name|there},\n\n[[Open]]({app}/my-tests)",
            **kw}


def test_send_includes_look(mail):
    assert normalize_permissions(["email.send"]) == ["email.view", "email.send"]


def test_look_only_sees_the_playbook_library_and_history_but_no_people(mail):
    c, _, _ = sign_in_fully(mail, permissions=VIEW)
    ov = c.get("/api/staff/email/overview")
    assert ov.status_code == 200, ov.text
    assert "user" not in ov.json()["smtp"]  # the SES sign-in stays with the owner
    assert ov.json()["team"]["can_send"] is False
    assert c.get("/api/staff/email/templates").status_code == 200
    assert c.post("/api/staff/email/preview", json=draft()).status_code == 200
    assert c.post("/api/staff/email/preview", json=draft(user_id=ASHA["id"])).status_code == 403

    for method, path, body in (
        ("post", "/api/staff/email/audience", {"filter": {}}),
        ("post", "/api/staff/email/test", {**draft(), "to": "x@testoza.com"}),
        ("post", "/api/staff/email/campaigns", draft()),
        ("post", "/api/staff/email/templates", {"name": "x", **draft()}),
        ("get", "/api/staff/email/suppressions", None),
        ("get", "/api/staff/email/auto/log", None),
    ):
        r = getattr(c, method)(path, **({"json": body} if body is not None else {}))
        assert r.status_code == 403, (path, r.status_code)

    mail["db"].tables["email_campaigns"].append({"id": "11111111-2222-3333-4444-555555555555", "name": "Old",
                                                 "subject": "Hi", "status": "done", "filter": {"add_ids": ["x"]}})
    one = c.get("/api/staff/email/campaigns/11111111-2222-3333-4444-555555555555").json()
    assert one["recipients"] == [] and one["counts"]["failed"] == 1
    assert "created_by" not in one["campaign"] and "add_ids" not in one["campaign"]["filter"]


def test_people_are_listed_with_masked_addresses_and_searches_are_logged(mail):
    c, acc, _ = sign_in_fully(mail, permissions=SEND)
    r = c.post("/api/staff/email/audience", json={"filter": {"q": "asha@coaching.in"}})
    assert r.status_code == 200, r.text
    assert r.json()["rows"][0]["email"] == "as•••@coaching.in"
    log = [x for x in mail["db"].tables["staff_audit_log"] if x["action"] == "email.people.search"]
    assert log and log[0]["actor_id"] == acc["id"] and log[0]["detail"]["q"] == "asha@coaching.in"

    # Preview and test as a real person: their address never shows, even through {email}.
    body = "Hi {first_name|there}, we write to {email}.\n\n[[Open]]({app}/my-tests)"
    p = c.post("/api/staff/email/preview", json=draft(body=body, user_id=ASHA["id"])).json()
    assert "asha@coaching.in" not in p["html"] and "as•••@coaching.in" in p["html"]
    assert p["person"]["email"] == "as•••@coaching.in"


def test_a_test_email_goes_only_to_your_own_or_a_testoza_address(mail):
    c, _, _ = sign_in_fully(mail, login_id="priya@gmail.com", permissions=SEND)
    for to in ("priya@gmail.com", "nirwair@testoza.com"):
        r = c.post("/api/staff/email/test", json={**draft(), "to": to})
        assert r.status_code == 200, (to, r.text)
    r = c.post("/api/staff/email/test", json={**draft(), "to": "victim@yahoo.com"})
    assert r.status_code == 400 and "priya@gmail.com" in r.json()["detail"]
    assert r.status_code == 400 and c.post("/api/staff/email/test", json={**draft(), "to": "x@news.testoza.com"}).status_code == 400
    assert [s["to"] for s in mail["sent"]] == ["priya@gmail.com", "nirwair@testoza.com"]

    for _ in range(18):
        assert c.post("/api/staff/email/test", json={**draft(), "to": "priya@gmail.com"}).status_code == 200
    assert c.post("/api/staff/email/test", json={**draft(), "to": "priya@gmail.com"}).status_code == 429


@pytest.mark.parametrize("body, ok", [
    ("Hi\n\n[[Open]](https://app.testoza.com/my-tests)", True),
    ("Watch [the video](https://www.youtube.com/watch?v=RWaYA4YlRYY) or https://youtu.be/RWaYA4YlRYY", True),
    ("Write to [us](mailto:support@testoza.com) or visit {site}/guides", True),
    ("Hi\n\n[[Verify your account]](https://testoza-login.com/verify)", False),
    ("Click [here](https://evil.example/x)", False),
    ("Go to www.evil-site.in now", False),
    ("Go to https://app.testoza.com.evil.in/login", False),
    ("Write to [me](mailto:priya@gmail.com)", False),
])
def test_links_must_stay_on_testoza_or_youtube(mail, body, ok):
    c, _, _ = sign_in_fully(mail, permissions=SEND)
    r = c.post("/api/staff/email/campaigns", json=draft(body=body))
    assert (r.status_code == 200) is ok, r.text
    if not ok:
        assert "testoza.com or YouTube" in r.json()["detail"]
        assert c.post("/api/staff/email/templates", json={"name": "x", **draft(body=body)}).status_code == 400


def test_every_ready_made_email_passes_the_link_check_and_fallbacks_are_checked_too():
    from app.services import email_library
    for t in email_library.LIBRARY:
        staff_email.check_links(t["subject"], t["body"])  # raises on a link the team site refuses
    for sneaky in ("Hi {first_name|https://evil.example}", "[[Open]]({live_test_link|https://evil.example/x})"):
        with pytest.raises(Exception) as err:
            staff_email.check_links("Hi", sneaky)
        assert "evil.example" in str(err.value.detail)


def test_a_team_send_is_named_in_admin_history_and_failures_stay_masked(mail):
    c, acc, _ = sign_in_fully(mail, permissions=SEND)
    r = c.post("/api/staff/email/campaigns", json={**draft(), "audience_label": "Educators · Made a test"})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    camp = mail["db"].tables["email_campaigns"][-1]
    assert camp["created_by"] is None and camp["planned"] == 1

    admin_rows = mail["admin"].get("/api/email-broadcast/campaigns").json()["rows"]
    assert admin_rows[0]["sent_by"] == {"kind": "team", "staff_id": acc["id"], "name": "Priya Sharma"}
    assert c.get("/api/staff/email/campaigns").json()["rows"][0]["sent_by"]["name"] == "Priya Sharma"

    one = c.get(f"/api/staff/email/campaigns/{cid}").json()
    assert one["recipients"][0]["email"] == "as•••@coaching.in"
    assert "asha@coaching.in" not in one["recipients"][0]["error"]

    paused = c.patch(f"/api/staff/email/campaigns/{cid}", json={"status": "paused"})
    assert paused.status_code == 200 and camp["status"] == "paused"
    actions = [x["action"] for x in mail["db"].tables["staff_audit_log"] if x["actor_id"] == acc["id"]]
    assert "email.campaign.create" in actions and "email.campaign.status" in actions


def test_ten_sends_a_day_per_person(mail):
    c, _, _ = sign_in_fully(mail, permissions=SEND)
    for _ in range(10):
        assert c.post("/api/staff/email/campaigns", json=draft()).status_code == 200
    r = c.post("/api/staff/email/campaigns", json=draft())
    assert r.status_code == 429 and "sends today" in r.json()["detail"]


def test_stopping_an_address_works_but_only_the_owner_can_undo_it(mail):
    c, _, _ = sign_in_fully(mail, permissions=SEND)
    r = c.post("/api/staff/email/suppressions", json={"email": "Asha@Coaching.in", "note": "Asked on WhatsApp"})
    assert r.status_code == 200 and r.json()["email"] == "as•••@coaching.in"
    row = mail["db"].tables["email_suppressions"][0]
    assert row["email"] == "asha@coaching.in" and row["reason"] == "stopped" and "Priya Sharma" in row["note"]
    listed = c.get("/api/staff/email/suppressions").json()["rows"]
    assert listed[0]["email"] == "as•••@coaching.in"
    assert c.delete("/api/staff/email/suppressions/asha@coaching.in").status_code in (404, 405)
    # Settings and on/off switches aren't on the team site at all.
    assert c.get("/api/email-broadcast/smtp-status").status_code == 401
    assert c.post("/api/staff/email/smtp-config", json={}).status_code in (404, 405)
