"""
Who started a live exam link, before anyone submits. Starting creates the candidate's
guest login and keeps their name, progress pings keep that name, and the examiner reads
the list from /attempts/test/{id}/started. Run from backend/:  python -m pytest tests -q
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.routers import attempts as attempts_router
from app.services import attempt_service
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

TEACHER = "teacher-token"
OTHER_TEACHER = "other-token"
TEST_ID = str(uuid.uuid4())
LIVE_SINCE = datetime.now(timezone.utc) - timedelta(minutes=30)


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def auth(token=TEACHER):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user(TEACHER, email="teacher@abc.in")
    db.add_user(OTHER_TEACHER, email="other@abc.in")
    db.tables["admins"] = []
    db.tables["app_settings"] = [{"unlock_all_premium": True}]
    db.tables["plans"] = []
    db.tables["user_tests"] = []
    db.tables["tests"] = [{
        "id": TEST_ID, "title": "Physics Mock 3", "created_by": teacher, "visibility": "unlisted",
        "settings": {
            "conduct_exam": {"enabled": True, "started_at": iso(LIVE_SINCE)},
            "start_form": {"enabled": True, "fields": [{"label": "Name"}, {"label": "Roll No"}]},
        },
    }]
    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(attempts_router, "supabase", db)
    monkeypatch.setattr(attempt_service, "supabase", db)
    # Site-wide premium and admin lookups are cached per process; start each test cold.
    attempts_router._premium_for_all_cache.clear()
    auth_core._admin_cache.clear()
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "client": TestClient(app), "teacher": teacher}
    app.dependency_overrides.clear()


def start(c, form=None, test_id=TEST_ID):
    candidate = str(uuid.uuid4())
    res = c.post("/api/attempts/register", json={"user_id": candidate, "test_id": test_id, "start_form": form})
    assert res.status_code == 200, res.text
    return candidate, res.json()


def started(c, token=TEACHER):
    res = c.get(f"/api/attempts/test/{TEST_ID}/started", headers=auth(token))
    assert res.status_code == 200, res.text
    return res.json()["candidates"]


def test_link_candidate_is_listed_with_name_and_progress(env):
    c, db = env["client"], env["db"]
    candidate, body = start(c, {"Name": "Asha Verma", "Roll No": "12"})
    assert body == {"success": True}
    login = db.auth_users[candidate]
    assert login["email"].endswith("@guest.testoza.com")
    assert login["user_metadata"]["is_guest_candidate"] is True

    # A progress ping used to overwrite metadata; the name must survive it.
    c.post("/api/attempts/progress", json={
        "user_id": candidate, "test_id": TEST_ID, "completion_percentage": 66,
        "answers": {"1": "4", "2": "", "3": "Delhi", "4": []},
    })

    [row] = started(c)
    assert row["startFormData"] == {"Name": "Asha Verma", "Roll No": "12"}
    assert row["status"] == "in_progress"
    assert row["answered"] == 2
    assert row["completion"] == 66


def test_closing_the_tab_reads_as_left_and_submitting_removes_them(env):
    c, db = env["client"], env["db"]
    gone, _ = start(c, {"Name": "Ravi"})
    done, _ = start(c, {"Name": "Meena"})

    c.post("/api/attempts/abandon", json={"user_id": gone, "test_id": TEST_ID, "reason": "tab_closed"})
    # Submitted (even if its registration was never marked): no longer "started".
    db.tables["user_tests"].append({"id": str(uuid.uuid4()), "user_id": done, "test_id": TEST_ID})

    rows = started(c)
    assert [r["startFormData"]["Name"] for r in rows] == ["Ravi"]
    assert rows[0]["status"] == "abandoned"
    assert rows[0]["left_reason"] == "tab_closed"


def test_practice_before_the_exam_and_the_creators_own_run_are_left_out(env):
    c, db = env["client"], env["db"]
    practice = db.add_user("practice-token")
    db.tables["test_registrations"] = [
        {"id": "r1", "test_id": TEST_ID, "user_id": practice, "status": "in_progress",
         "started_at": iso(LIVE_SINCE - timedelta(days=2)), "metadata": None},
        {"id": "r2", "test_id": TEST_ID, "user_id": env["teacher"], "status": "in_progress",
         "started_at": iso(LIVE_SINCE + timedelta(minutes=1)), "metadata": None},
    ]
    start(c, {"Name": "Asha"})
    assert [r["startFormData"]["Name"] for r in started(c)] == ["Asha"]


def test_off_a_live_link_a_stranger_is_not_given_a_login(env):
    c, db = env["client"], env["db"]
    db.tables["tests"][0]["settings"]["conduct_exam"]["enabled"] = False
    candidate, body = start(c, {"Name": "Asha"})
    assert body == {"success": False}
    assert candidate not in db.auth_users
    assert db.tables.get("test_registrations", []) == []


def test_only_the_creator_sees_who_started(env):
    c = env["client"]
    start(c, {"Name": "Asha"})
    assert c.get(f"/api/attempts/test/{TEST_ID}/started", headers=auth(OTHER_TEACHER)).status_code == 403
    assert c.get(f"/api/attempts/test/{TEST_ID}/started").status_code == 401


def test_names_stay_hidden_without_premium(env):
    c, db = env["client"], env["db"]
    db.tables["app_settings"] = [{"unlock_all_premium": False}]
    db.tables["plans"] = [{"id": "pro", "is_active": True}]
    start(c, {"Name": "Asha", "Roll No": "12"})
    [row] = started(c)
    assert row["startFormData"] == {"Candidate": "Anonymous User"}
