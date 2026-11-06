"""
One attempt (settings.attempt_limit 1) on a test link: a second paper from the same guest
(same phone and name, so the same guest id) is refused, a resend of the same paper is not.
Anshwal, English Grammar 5 Nov 2026: 17/20, then a second, blank paper from the same phone.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.routers import attempts as attempts_router
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

GUEST = "5f0c1f7e-9d2a-4c41-8a55-3d5b6f1d0a11"


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user("teacher-token", email="teacher@school.in")
    for t in ("admins", "test_registrations", "notifications", "user_tests"):
        db.tables[t] = []
    db.tables["tests"] = [{
        "id": "grammar", "title": "English Grammar", "created_by": teacher, "duration": 15,
        "enable_section_mode": False, "sections": None,
        "settings": {"conduct_exam": {"enabled": True}, "start_form": {"enabled": True}, "attempt_limit": 1},
        "questions": [{"id": 1, "type": "single", "correctAnswer": "B", "marks": 1}],
    }]
    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(attempts_router, "supabase", db)
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "c": TestClient(app), "teacher": teacher}
    app.dependency_overrides.clear()


def paper(answers, user=GUEST):
    return {"user_id": user, "test_id": "grammar", "answers": answers,
            "metadata": {"startFormData": {"Name": "Anshwal"}}}


def test_second_paper_from_the_same_guest_is_refused(env):
    c, db = env["c"], env["db"]
    assert c.post("/api/attempts/save", json=paper({"1": "B"})).status_code == 200
    again = c.post("/api/attempts/save", json=paper({}))
    assert again.status_code == 409 and "already submitted" in again.json()["detail"]
    assert len(db.tables["user_tests"]) == 1


def test_the_same_paper_sent_again_gets_the_saved_one_back(env):
    c, db = env["c"], env["db"]
    first = c.post("/api/attempts/save", json=paper({"1": "B"})).json()["data"]
    again = c.post("/api/attempts/save", json=paper({1: "B"}))
    assert again.status_code == 200 and again.json()["data"]["id"] == first["id"]
    assert len(db.tables["user_tests"]) == 1


def test_another_guest_and_unlimited_tests_are_not_affected(env):
    c, db = env["c"], env["db"]
    assert c.post("/api/attempts/save", json=paper({"1": "B"})).status_code == 200
    other = "6a1d2e3f-0b4c-4d5e-8f60-718293a4b5c6"
    assert c.post("/api/attempts/save", json=paper({"1": "A"}, user=other)).status_code == 200
    db.tables["tests"][0]["settings"]["attempt_limit"] = None
    assert c.post("/api/attempts/save", json=paper({"1": "C"})).status_code == 200
    assert len(db.tables["user_tests"]) == 3


def test_check_can_ignore_a_start_that_was_never_submitted(env):
    c, db = env["c"], env["db"]
    db.tables["test_registrations"].append({"id": "r1", "user_id": GUEST, "test_id": "grammar", "status": "in_progress"})
    assert c.get(f"/api/attempts/check/{GUEST}/grammar").json()["hasAttempted"] is True
    assert c.get(f"/api/attempts/check/{GUEST}/grammar?submitted_only=true").json()["hasAttempted"] is False
    c.post("/api/attempts/save", json=paper({"1": "B"}))
    assert c.get(f"/api/attempts/check/{GUEST}/grammar?submitted_only=true").json()["hasAttempted"] is True
