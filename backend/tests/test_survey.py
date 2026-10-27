"""
Survey 1.0 (app/routers/survey.py): anonymous answers from app.testoza.com/survey/v1,
read in admin → Support → Survey 1.0. Run from backend/:
python -m pytest tests/test_survey.py -q
"""

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.routers import survey as survey_router
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

TEACHER = "teacher-token"
ADMIN = "admin-token"
ANSWER_ID = "0b6f7f6e-2c1d-4f7a-9d55-3c2b1f0e9d22"


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user(TEACHER, email="asha@coaching.in")
    admin = db.add_user(ADMIN, email="owner@testoza.com")
    db.tables["admins"] = [{"email": "owner@testoza.com"}]
    db.tables["survey_responses"] = []
    db.tables["notifications"] = []

    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    rate_limiter.support_per_ip.clients.clear()
    monkeypatch.setattr(auth_core, "_admin_cache", {})

    # Tell admins in this thread, so the test can see the notification.
    monkeypatch.setattr(survey_router, "tell_team_in_background", survey_router._tell_team)
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "client": TestClient(app), "teacher": teacher, "admin": admin}
    app.dependency_overrides.clear()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _send(env, answers, **extra):
    return env["client"].post("/api/survey/v1", json={"answers": answers, **extra})


def test_not_sent_path_is_saved_without_who_sent_it(env):
    res = _send(env, {
        "status": "not_sent", "reason_not_sent": "not_due", "timing": "forgot",
        "anything": "  Class writes on Monday  ", "whatsapp": "98765 43210",
    }, context={"device": "phone", "ref": "email", "viewport": "390x844"}, id=ANSWER_ID)
    assert res.status_code == 200, res.text

    row = env["db"].tables["survey_responses"][0]
    assert row["id"] == ANSWER_ID and row["survey"] == "v1"
    assert row["status"] == "not_sent" and row["reason"] == "not_due"
    assert row["answers"] == {"status": "not_sent", "reason_not_sent": "not_due", "timing": "forgot",
                              "anything": "Class writes on Monday", "whatsapp": "98765 43210"}
    assert "name" not in row["answers"] and "email" not in row["answers"]
    assert row["whatsapp"] == "98765 43210"
    assert row["context"] == {"device": "phone", "ref": "email"}
    assert "user_id" not in row

    notes = env["db"].tables["notifications"]
    assert [n["user_id"] for n in notes] == [env["admin"]]
    assert notes[0]["title"] == "New Survey 1.0 answer"
    assert "My class wasn't writing a test yet" in notes[0]["message"]
    assert "I forgot I had made it on TestoZa" in notes[0]["message"]
    assert notes[0]["link"].endswith("tab=support&section=survey")


def test_optional_contact_is_kept_when_given(env):
    res = _send(env, {
        "status": "sent_some", "reason_sent": "nothing",
        "name": "  Asha Verma ", "email": "asha@coaching.in", "whatsapp": "+91 98765 43210",
    })
    assert res.status_code == 200, res.text
    row = env["db"].tables["survey_responses"][0]
    assert row["answers"]["name"] == "Asha Verma" and row["answers"]["email"] == "asha@coaching.in"
    assert row["whatsapp"] == "+91 98765 43210"
    assert env["db"].tables["notifications"][0]["message"].startswith("Asha Verma · ")

    bad = _send(env, {"status": "looking", "email": "asha at coaching"})
    assert bad.status_code == 400 and "email" in bad.json()["detail"]
    assert len(env["db"].tables["survey_responses"]) == 1


def test_signed_in_sender_is_still_anonymous(env):
    res = env["client"].post("/api/survey/v1", json={"answers": {"status": "looking", "anything": "Just browsing"}},
                             headers=_auth(TEACHER))
    assert res.status_code == 200
    row = env["db"].tables["survey_responses"][0]
    assert row["answers"] == {"status": "looking", "anything": "Just browsing"} and "user_id" not in row


def test_answers_off_the_path_are_dropped(env):
    # Went down "not sent", came back and picked "sent": the old path's answers go.
    res = _send(env, {
        "status": "sent_some", "reason_sent": "results", "results": "parents",
        "reason_not_sent": "trust", "trust": "searching", "timing": "lost",
    })
    assert res.status_code == 200
    row = env["db"].tables["survey_responses"][0]
    assert row["answers"] == {"status": "sent_some", "reason_sent": "results", "results": "parents"}
    assert row["reason"] == "results"


def test_follow_up_questions_only_count_on_their_branch(env):
    res = _send(env, {
        "status": "not_sent", "reason_not_sent": "making", "making": "typing", "ai_issue": "formulas",
    })
    assert res.status_code == 200
    assert "ai_issue" not in env["db"].tables["survey_responses"][0]["answers"]

    res = _send(env, {
        "status": "not_sent", "reason_not_sent": "broke", "broke": ["submit", "link", "submit"],
        "broke_detail": "Q5 picture didn't load",
    })
    assert res.status_code == 200
    assert env["db"].tables["survey_responses"][1]["answers"]["broke"] == ["link", "submit"]


def test_missing_or_unknown_answers_are_refused(env):
    assert _send(env, {"status": "not_sent"}).status_code == 400
    assert _send(env, {"status": "not_sent", "reason_not_sent": "hack"}).status_code == 400
    assert _send(env, {"status": "not_sent", "reason_not_sent": "broke", "broke": []}).status_code == 400
    assert _send(env, {"status": "looking", "whatsapp": "not a number"}).status_code == 400
    assert _send(env, {"status": "sent_some", "reason_sent": "nothing", "whatsapp": "call me"}).status_code == 400
    assert env["client"].post("/api/survey/v9", json={"answers": {"status": "looking"}}).status_code == 404
    assert env["db"].tables["survey_responses"] == []


def test_a_retried_send_is_saved_once(env):
    answers = {"status": "whole_class", "reason_sent": "nothing"}
    assert _send(env, answers, id=ANSWER_ID).status_code == 200
    assert _send(env, answers, id=ANSWER_ID).status_code == 200
    assert len(env["db"].tables["survey_responses"]) == 1


def test_admin_sees_counts_and_fixes(env):
    _send(env, {"status": "not_sent", "reason_not_sent": "not_due", "timing": "forgot"})
    _send(env, {"status": "not_sent", "reason_not_sent": "not_due", "timing": "forgot"})
    _send(env, {"status": "sent_some", "reason_sent": "broke", "broke": ["submit", "media"]})
    _send(env, {"status": "own_practice"})

    assert env["client"].get("/api/survey/admin/v1", headers=_auth(TEACHER)).status_code == 403
    res = env["client"].get("/api/survey/admin/v1", headers=_auth(ADMIN))
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["title"] == "Survey 1.0" and data["total"] == 4
    assert data["link"].endswith("/survey/v1")
    assert data["counts"]["status"] == {"not_sent": 2, "sent_some": 1, "own_practice": 1}
    assert data["counts"]["timing"] == {"forgot": 2}
    assert data["counts"]["broke"] == {"submit": 1, "media": 1}
    assert data["answered"]["timing"] == 2
    timing = next(q for q in data["questions"] if q["id"] == "timing")
    forgot = next(o for o in timing["options"] if o["key"] == "forgot")
    assert "reminder" in forgot["fix"] and forgot["exists"] is True
