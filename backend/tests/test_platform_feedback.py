"""
Platform feedback (app/routers/support.py `/support/platform-feedback`): the sidebar's
Feedback page and the card after stopping an exam send up to three notes; admins read
them in admin → Support → Feedback. Run from backend/:
python -m pytest tests/test_platform_feedback.py -q
"""

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
EXAM_ID = "6f1c2a7e-3b7d-4a1e-9a55-0c2b1f0e9d11"


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user(TEACHER, email="asha@coaching.in")
    admin = db.add_user(ADMIN, email="owner@testoza.com")
    db.tables["profiles"][0]["full_name"] = "Asha Verma"
    db.tables["admins"] = [{"email": "owner@testoza.com"}]
    db.tables["platform_feedback"] = []
    db.tables["notifications"] = []

    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    rate_limiter.support_per_ip.clients.clear()
    monkeypatch.setattr(auth_core, "_admin_cache", {})
    monkeypatch.setattr(support_mail, "on_platform_feedback_in_background", support_mail._tell_team_feedback)
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "client": TestClient(app), "teacher": teacher, "admin": admin}
    app.dependency_overrides.clear()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_feedback_after_an_exam_is_saved_and_tells_admins(env):
    res = env["client"].post(
        "/api/support/platform-feedback",
        json={"ai": "  ", "conduct": "Timer worked well", "source": "exam_ended",
              "exam_id": EXAM_ID, "exam_title": "JEE Mock 3", "context": {"from": "/my-tests"}},
        headers=_auth(TEACHER),
    )
    assert res.status_code == 200, res.text
    row = env["db"].tables["platform_feedback"][0]
    assert row["user_id"] == env["teacher"]
    assert row["ai"] is None and row["conduct"] == "Timer worked well" and row["other"] is None
    assert row["source"] == "exam_ended" and row["exam_id"] == EXAM_ID and row["exam_title"] == "JEE Mock 3"

    notes = env["db"].tables["notifications"]
    assert [n["user_id"] for n in notes] == [env["admin"]]
    assert notes[0]["title"] == "New platform feedback"
    assert "Asha Verma" in notes[0]["message"] and "Online exam: Timer worked well" in notes[0]["message"]
    assert notes[0]["link"].endswith(f"tab=support&section=feedback&id={row['id']}")


def test_empty_feedback_is_refused(env):
    res = env["client"].post("/api/support/platform-feedback", json={"ai": " ", "other": ""}, headers=_auth(TEACHER))
    assert res.status_code == 400
    assert env["db"].tables["platform_feedback"] == []


def test_sidebar_feedback_drops_exam_fields_and_bad_source(env):
    res = env["client"].post(
        "/api/support/platform-feedback",
        json={"other": "Dark mode please", "source": "hack", "exam_id": EXAM_ID, "exam_title": "x"},
        headers=_auth(TEACHER),
    )
    assert res.status_code == 200
    row = env["db"].tables["platform_feedback"][0]
    assert row["source"] == "sidebar" and row["exam_id"] is None and row["exam_title"] is None


def test_only_admins_read_feedback_and_mark_it_read(env):
    env["client"].post("/api/support/platform-feedback", json={"ai": "Read my PDF perfectly"}, headers=_auth(TEACHER))
    fid = env["db"].tables["platform_feedback"][0]["id"]

    assert env["client"].get("/api/support/admin/feedback", headers=_auth(TEACHER)).status_code in (401, 403)

    res = env["client"].get("/api/support/admin/feedback", headers=_auth(ADMIN))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["counts"] == {"unread": 1, "all": 1}
    assert body["rows"][0]["account"]["full_name"] == "Asha Verma"

    res = env["client"].patch(f"/api/support/admin/feedback/{fid}", json={"read": True}, headers=_auth(ADMIN))
    assert res.status_code == 200
    assert env["client"].get("/api/support/admin/feedback?view=unread", headers=_auth(ADMIN)).json()["rows"] == []
    assert all(n.get("read") for n in env["db"].tables["notifications"])


def test_a_face_alone_is_enough_after_an_exam(env):
    res = env["client"].post(
        "/api/support/platform-feedback",
        json={"rating": 2, "source": "exam_ended", "exam_id": EXAM_ID, "exam_title": "JEE Mock 3"},
        headers=_auth(TEACHER),
    )
    assert res.status_code == 200, res.text
    row = env["db"].tables["platform_feedback"][0]
    assert row["rating"] == 2 and row["conduct"] is None
    assert "Not really (2/5)" in env["db"].tables["notifications"][0]["message"]


def test_rating_with_a_note(env):
    res = env["client"].post(
        "/api/support/platform-feedback",
        json={"rating": 5, "conduct": "Students loved the timer", "source": "exam_ended"},
        headers=_auth(TEACHER),
    )
    assert res.status_code == 200, res.text
    row = env["db"].tables["platform_feedback"][0]
    assert row["rating"] == 5 and row["conduct"] == "Students loved the timer"
    msg = env["db"].tables["notifications"][0]["message"]
    assert "Fully (5/5)" in msg and "Online exam: Students loved the timer" in msg


@pytest.mark.parametrize("rating", [0, 6, -1])
def test_out_of_range_rating_is_refused(env, rating):
    res = env["client"].post("/api/support/platform-feedback", json={"rating": rating}, headers=_auth(TEACHER))
    assert res.status_code == 400
    assert env["db"].tables["platform_feedback"] == []


def test_rating_still_saved_before_the_rating_column_exists(env, monkeypatch):
    real_table = env["db"].table

    def table(name):
        q = real_table(name)
        if name == "platform_feedback":
            insert = q.insert

            def insert_without_rating(payload):
                if "rating" in payload:
                    raise RuntimeError('column "rating" does not exist')
                return insert(payload)
            q.insert = insert_without_rating
        return q

    monkeypatch.setattr(env["db"], "table", table)
    res = env["client"].post(
        "/api/support/platform-feedback",
        json={"rating": 4, "conduct": "Smooth", "source": "exam_ended"},
        headers=_auth(TEACHER),
    )
    assert res.status_code == 200, res.text
    row = env["db"].tables["platform_feedback"][0]
    assert "rating" not in row and row["context"]["rating"] == 4
    assert row["conduct"] == "Rated 4/5 · Mostly\nSmooth"
    msg = env["db"].tables["notifications"][0]["message"]
    assert "Mostly (4/5) · Online exam: Smooth" in msg
