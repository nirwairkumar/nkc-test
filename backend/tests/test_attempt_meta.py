"""attempt_meta: device times re-based on the server clock, rule breaks moved to columns."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.routers import attempts as attempts_router
from app.services.attempt_meta import anchor_times, take_rule_breaks
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

NOW = datetime(2026, 11, 5, 12, 4, 6, tzinfo=timezone.utc)


def test_fast_phone_clock_keeps_the_real_time_taken():
    # Sreya, 5 Nov: phone ~6.6 min fast, so server time minus phone start came out negative ("—").
    meta = {"startedAt": "2026-11-05T12:07:29.003Z", "submittedAt": "2026-11-05T12:10:43.005Z"}
    anchor_times(meta, NOW)
    assert meta["time_taken_seconds"] == 194
    assert meta["submittedAt"] == "2026-11-05T12:04:06.000Z"
    assert meta["startedAt"] == "2026-11-05T12:00:51.998Z"
    assert meta["device_startedAt"] == "2026-11-05T12:07:29.003Z"
    assert meta["device_submittedAt"] == "2026-11-05T12:10:43.005Z"


def test_times_left_alone_when_missing_backwards_or_too_long():
    for meta in (
        {},
        {"startedAt": "2026-11-05T12:00:00Z"},
        {"startedAt": "not a date", "submittedAt": "2026-11-05T12:00:00Z"},
        {"startedAt": "2026-11-05T12:10:00Z", "submittedAt": "2026-11-05T12:00:00Z"},
        {"startedAt": "2026-11-01T12:00:00Z", "submittedAt": "2026-11-05T12:00:00Z"},
    ):
        before = dict(meta)
        anchor_times(meta, NOW)
        assert meta == before


def test_rule_breaks_move_to_columns_and_unknown_kinds_drop():
    meta = {
        "violations": [
            {"type": "left_exam_screen", "at": "2026-11-05T00:15:16.064Z"},
            {"type": "exited_full_screen", "at": "garbage"},
            {"type": "hacked", "at": "2026-11-05T00:15:17Z"},
            "nonsense",
        ],
        "auto_submit_reason": "left_exam_screen",
    }
    count, log = take_rule_breaks(meta)
    assert count == 2
    assert log == [
        {"type": "left_exam_screen", "at": "2026-11-05T00:15:16.064Z"},
        {"type": "exited_full_screen", "at": None},
    ]
    assert "violations" not in meta
    assert meta["auto_submit_reason"] == "left_exam_screen"


def test_unknown_auto_submit_reason_is_dropped_and_no_breaks_is_zero():
    meta = {"auto_submit_reason": "<script>"}
    assert take_rule_breaks(meta) == (0, [])
    assert "auto_submit_reason" not in meta


def test_log_keeps_the_newest_fifty():
    meta = {"violations": [{"type": "left_exam_screen", "at": f"2026-11-05T00:{m:02d}:00Z"} for m in range(60)]}
    count, log = take_rule_breaks(meta)
    assert count == 60
    assert len(log) == 50
    assert log[0]["at"] == "2026-11-05T00:10:00.000Z"


# ── Through /api/attempts/save, the way a link candidate submits ─────────────

@pytest.fixture()
def client(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user("teacher-token", email="teacher@school.in")
    db.tables["admins"] = []
    db.tables["test_registrations"] = []
    db.tables["notifications"] = []
    db.tables["tests"] = [{
        "id": "grammar", "title": "English Grammar", "created_by": teacher, "duration": 15,
        "enable_section_mode": False, "sections": None,
        "settings": {"conduct_exam": {"enabled": True}, "start_form": {"enabled": True}, "violation_limit": 0},
        "questions": [
            {"id": 1, "type": "single", "correctAnswer": "B", "marks": 1},
            {"id": 2, "type": "single", "correctAnswer": "C", "marks": 1},
        ],
    }]
    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(attempts_router, "supabase", db)
    app.dependency_overrides[get_db] = lambda: db
    yield db, TestClient(app)
    app.dependency_overrides.clear()


def test_auto_submitted_link_paper_keeps_answers_reason_and_real_time(client):
    db, c = client
    phone_now = datetime.now(timezone.utc) + timedelta(minutes=7)  # phone clock 7 min fast
    res = c.post("/api/attempts/save", json={
        "user_id": "5f0c1f7e-9d2a-4c41-8a55-3d5b6f1d0a11", "test_id": "grammar",
        "answers": {"1": "B", "2": "A"},
        "metadata": {
            "startFormData": {"Name": "Dharmik"},
            "startedAt": (phone_now - timedelta(minutes=9, seconds=54)).isoformat().replace("+00:00", "Z"),
            "submittedAt": phone_now.isoformat().replace("+00:00", "Z"),
            "violations": [{"type": "left_exam_screen", "at": phone_now.isoformat()}],
            "auto_submit_reason": "left_exam_screen",
        },
    })
    assert res.status_code == 200, res.text
    row = db.tables["user_tests"][0]
    assert row["score"] == 1 and row["answers"] == {"1": "B", "2": "A"}
    assert row["violation_count"] == 1
    assert row["violation_log"][0]["type"] == "left_exam_screen"
    meta = row["metadata"]
    assert meta["auto_submit_reason"] == "left_exam_screen"
    assert "violations" not in meta
    assert meta["time_taken_seconds"] == 594
    # The server's submit time, not the phone's: start = now - 9:54, give or take the request.
    started = datetime.fromisoformat(meta["startedAt"].replace("Z", "+00:00"))
    taken_by_server_clock = (datetime.now(timezone.utc) - started).total_seconds()
    assert 594 <= taken_by_server_clock < 600
