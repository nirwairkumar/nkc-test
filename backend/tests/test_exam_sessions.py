"""
End-to-end tests for exam sessions (join codes, rosters, PINs, live monitor, results)
against an in-memory Supabase stand-in. Run from backend/:  python -m pytest tests -q
"""

import os
from datetime import datetime, timedelta, timezone

import pytest

os.environ.setdefault("EXAM_PIN_PEPPER", "test-pepper")

from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import attempts as attempts_router  # noqa: E402
from app.services import exam_sessions as rules  # noqa: E402
from app.utils import rate_limiter  # noqa: E402
from tests.fake_supabase import FakeSupabase  # noqa: E402

TEACHER = "teacher-token"
OTHER_TEACHER = "other-token"


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def now():
    return datetime.now(timezone.utc)


QUESTIONS = [
    {"id": 1, "type": "single", "question": "2+2", "options": ["3", "4"], "correctAnswer": "4", "topic": "Arithmetic"},
    {"id": 2, "type": "single", "question": "3+3", "options": ["6", "7"], "correctAnswer": "6", "topic": "Arithmetic"},
    {"id": 3, "type": "single", "question": "Capital of India", "options": ["Delhi", "Agra"], "correctAnswer": "Delhi", "topic": "GK"},
]


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    teacher = db.add_user(TEACHER, email="teacher@abc.in")
    other = db.add_user(OTHER_TEACHER, email="other@abc.in")
    db.tables["admins"] = []
    db.tables["tests"] = [{
        "id": "test-1", "title": "Physics Mock 3", "duration": 60, "total_questions": 3, "total_max_marks": 12,
        "settings": {"force_fullscreen": True}, "created_by": teacher, "questions": QUESTIONS, "sections": None,
        "enable_section_mode": False, "slug": "physics-mock-3", "custom_id": "M001", "visibility": "private",
        "institution_name": "ABC Coaching", "institution_logo": None,
    }]
    db.tables["classes"] = [{"id": "class-a", "user_id": teacher, "name": "JEE 2027 Morning"}]
    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(attempts_router, "supabase", db)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    yield {"db": db, "client": client, "teacher": teacher, "other": other}
    app.dependency_overrides.clear()


def auth(token=TEACHER):
    return {"Authorization": f"Bearer {token}"}


def exam(token):
    return {"X-Exam-Token": token}


def create_session(c, **overrides):
    body = {
        "test_id": "test-1", "opens_at": iso(now() - timedelta(seconds=5)),
        "closes_at": iso(now() + timedelta(minutes=90)), "late_entry_minutes": 15,
        "identity_mode": "name", "results_release": "on_end",
    }
    body.update(overrides)
    res = c.post("/api/exam-sessions", json=body, headers=auth())
    assert res.status_code == 200, res.text
    return res.json()


def submit(c, token, answers):
    return c.post(
        "/api/attempts/save",
        json={"user_id": "ignored", "test_id": "test-1", "answers": answers, "score": 999, "metadata": {"startFormData": {"Name": "Hacker"}}},
        headers=exam(token),
    )


# ── Rules (pure) ───────────────────────────────────────────────────────────

def test_codes_and_pins():
    for _ in range(200):
        code = rules.generate_join_code()
        assert len(code) == 6 and code.isdigit()
        assert code not in {"111111", "123456", "654321"}
    pin = rules.generate_pin()
    stored = rules.hash_pin(pin)
    assert pin not in stored
    assert rules.verify_pin(pin, stored)
    assert not rules.verify_pin("0000" if pin != "0000" else "1111", stored)
    assert not rules.verify_pin("12", stored)
    assert rules.roll_key(" 23 A-017 ") == rules.roll_key("23a017")


def test_phases_and_deadline():
    t0 = now()
    s = {"opens_at": iso(t0 + timedelta(minutes=10)), "closes_at": iso(t0 + timedelta(minutes=80)), "start_mode": "auto", "late_entry_minutes": 15}
    assert rules.session_phase(s, t0) == "lobby"
    assert rules.session_phase(s, t0 - timedelta(minutes=30)) == "scheduled"
    assert rules.session_phase(s, t0 + timedelta(minutes=11)) == "live"
    assert rules.join_block_reason(s, t0 + timedelta(minutes=26)) == "late"
    assert rules.session_phase({**s, "start_mode": "manual"}, t0 + timedelta(minutes=20)) == "lobby"
    assert rules.session_phase(s, t0 + timedelta(minutes=81)) == "ended"

    # Late joiner: full 60 minutes, but never past closes_at (+ their extra time).
    p = {"started_at": iso(t0 + timedelta(minutes=40)), "extra_minutes": 0}
    assert rules.participant_deadline(s, p, 60) == t0 + timedelta(minutes=80)
    assert rules.participant_deadline(s, {**p, "extra_minutes": 10}, 60) == t0 + timedelta(minutes=90)
    early = {"started_at": iso(t0 + timedelta(minutes=10)), "extra_minutes": 0}
    assert rules.participant_deadline(s, early, 60) == t0 + timedelta(minutes=70)


def test_ranking_shares_ties():
    rows = rules.rank_results([
        {"name": "a", "score": 10, "wrong": 1, "unattempted": 0, "time_taken_seconds": 100},
        {"name": "b", "score": 12, "wrong": 0, "unattempted": 0, "time_taken_seconds": 300},
        {"name": "c", "score": 10, "wrong": 1, "unattempted": 0, "time_taken_seconds": 50},
    ])
    assert [r["name"] for r in rows] == ["b", "c", "a"]
    assert [r["rank"] for r in rows] == [1, 2, 2]


# ── Name check-in, submission, results ─────────────────────────────────────

def test_full_flow_name_mode(env):
    c, db = env["client"], env["db"]
    session = create_session(c)
    code = session["join_code"]
    assert session["phase"] == "live"

    info = c.get(f"/api/join/code/{code}").json()
    assert info["test"]["title"] == "Physics Mock 3" and info["identity_mode"] == "name"
    assert "join_code" not in info

    rahul = c.post(f"/api/join/code/{code}/enter", json={"name": "  Rahul   Kumar "}).json()
    token = rahul["token"]
    assert rahul["participant"]["name"] == "Rahul Kumar"

    # A second "Rahul Kumar" while the first is online is refused, not merged.
    dup = c.post(f"/api/join/code/{code}/enter", json={"name": "rahul kumar"})
    assert dup.status_code == 409 and dup.json()["detail"]["code"] == "name_taken"

    paper = c.post("/api/join/me/start", headers=exam(token)).json()
    assert all("correctAnswer" not in q for q in paper["test"]["questions"])
    assert paper["deadline"]

    hb = c.post("/api/join/me/heartbeat", json={"answers": {"1": "4"}, "answered": 1, "progress": 33, "violations": 2}, headers=exam(token)).json()
    assert hb["status"] == "writing" and hb["force_submit"] is False
    participant = db.tables["session_participants"][0]
    assert participant["answers_draft"] == {"1": "4"} and participant["violations"] == 2

    res = submit(c, token, {"1": "4", "2": "7", "3": "Delhi"})
    assert res.status_code == 200, res.text
    row = res.json()["data"]
    assert row["score"] == 7.0  # 4 + 4 - 1, scored by the server, not the client's 999
    assert row["session_id"] == session["id"] and row["participant_id"] == participant["id"]
    assert row["metadata"]["startFormData"]["Name"] == "Rahul Kumar"  # not the client's "Hacker"
    assert db.tables["session_participants"][0]["answered"] == 3  # from the submission, not the last heartbeat

    again = submit(c, token, {"1": "4", "2": "6", "3": "Delhi"})
    assert again.status_code == 200 and again.json()["data"]["id"] == row["id"]
    assert len([a for a in db.tables["user_tests"] if a.get("participant_id")]) == 1

    # Results wait for the end of the sitting.
    assert c.get("/api/join/me/result", headers=exam(token)).json()["released"] is False
    c.post(f"/api/exam-sessions/{session['id']}/end", json={"collect": True}, headers=auth())
    result = c.get("/api/join/me/result", headers=exam(token)).json()
    assert result["released"] and result["rank"] == 1 and result["of"] == 1
    assert {t["name"] for t in result["topics"]} == {"Arithmetic", "GK"}

    # The code is free again once the sitting has ended.
    assert c.get(f"/api/join/code/{code}").status_code in (404, 410)


def test_device_takeover_and_old_device_is_logged_out(env):
    c = env["client"]
    session = create_session(c, identity_mode="roll")
    code = session["join_code"]
    first = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "23A017", "name": "Rahul"}).json()["token"]
    second = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "23 a 017"}).json()["token"]
    assert first != second
    gone = c.get("/api/join/me", headers=exam(first))
    assert gone.status_code == 409 and gone.json()["detail"]["code"] == "device_replaced"
    assert c.get("/api/join/me", headers=exam(second)).status_code == 200
    monitor = c.get(f"/api/exam-sessions/{session['id']}/monitor", headers=auth()).json()
    assert monitor["participants"][0]["device_changes"] == 1


def test_roll_pin_with_roster(env):
    c, db = env["client"], env["db"]
    imported = c.post("/api/batches/class-a/students", json={"students": [
        {"roll_no": "23A017", "full_name": "Rahul Kumar", "parent_phone": "+91 98765 43210"},
        {"roll_no": "23A018", "full_name": "Priya Sharma"},
        {"roll_no": "23a017", "full_name": "Duplicate"},
        {"roll_no": "", "full_name": "No roll"},
    ]}, headers=auth()).json()
    assert imported["added"] == 2 and len(imported["skipped"]) == 2

    no_pins = c.post("/api/exam-sessions", json={
        "test_id": "test-1", "class_id": "class-a", "identity_mode": "roll_pin",
        "opens_at": iso(now()), "closes_at": iso(now() + timedelta(hours=1)),
    }, headers=auth())
    assert no_pins.status_code == 400 and no_pins.json()["detail"]["code"] == "no_pins"

    pins = c.post("/api/batches/class-a/pins", json={"only_missing": True}, headers=auth()).json()["pins"]
    assert len(pins) == 2
    stored = db.tables["roster_students"][0]["pin_hash"]
    assert stored and pins[0]["pin"] not in stored
    batch = c.get("/api/batches/class-a", headers=auth()).json()
    assert all(s["has_pin"] for s in batch["students"]) and "pin_hash" not in str(batch)

    session = create_session(c, class_id="class-a", identity_mode="roll_pin")
    code = session["join_code"]
    rahul_pin = next(p["pin"] for p in pins if p["roll_no"] == "23A017")
    wrong = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "23A017", "pin": "0000" if rahul_pin != "0000" else "1111"})
    assert wrong.status_code == 401 and wrong.json()["detail"]["code"] == "wrong_pin"
    stranger = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "99Z999", "pin": "1234"})
    assert stranger.status_code == 404
    ok = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "23a017", "pin": rahul_pin}).json()
    assert ok["participant"]["name"] == "Rahul Kumar" and ok["participant"]["roll_no"] == "23A017"

    c.post("/api/join/me/start", headers=exam(ok["token"]))
    assert submit(c, ok["token"], {"1": "4"}).status_code == 200

    # The same student on another device after submitting: PIN proves who they are,
    # so they get in to see their result; nobody else can.
    back = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "23A017", "pin": rahul_pin})
    assert back.status_code == 200 and back.json()["participant"]["status"] == "submitted"

    results = c.get(f"/api/exam-sessions/{session['id']}/results", headers=auth()).json()
    assert [r["name"] for r in results["rows"]] == ["Rahul Kumar"]
    assert results["rows"][0]["parent_phone"] == "+919876543210"
    assert [a["name"] for a in results["absent"]] == ["Priya Sharma"]


def test_late_entry_and_rejoin(env):
    c = env["client"]
    session = create_session(c, opens_at=iso(now() - timedelta(minutes=30)), late_entry_minutes=10)
    code = session["join_code"]
    late = c.post(f"/api/join/code/{code}/enter", json={"name": "Late Larry"})
    assert late.status_code == 403 and late.json()["detail"]["code"] == "late"


def test_lobby_and_manual_start(env):
    c = env["client"]
    session = create_session(c, opens_at=iso(now() + timedelta(minutes=10)), start_mode="manual")
    code = session["join_code"]
    assert session["phase"] == "lobby"
    token = c.post(f"/api/join/code/{code}/enter", json={"name": "Asha"}).json()["token"]
    early = c.post("/api/join/me/start", headers=exam(token))
    assert early.status_code == 409 and early.json()["detail"]["code"] == "not_started"
    me = c.get("/api/join/me", headers=exam(token)).json()
    assert me["session"]["phase"] == "lobby" and me["joined"] == 1

    started = c.post(f"/api/exam-sessions/{session['id']}/start", headers=auth()).json()
    assert started["phase"] == "live"
    assert c.post("/api/join/me/start", headers=exam(token)).status_code == 200


def test_teacher_controls(env):
    c, db = env["client"], env["db"]
    session = create_session(c)
    code, sid = session["join_code"], session["id"]
    a = c.post(f"/api/join/code/{code}/enter", json={"name": "Asha"}).json()
    b = c.post(f"/api/join/code/{code}/enter", json={"name": "Bilal"}).json()
    for p in (a, b):
        c.post("/api/join/me/start", headers=exam(p["token"]))
    c.post("/api/join/me/heartbeat", json={"answers": {"1": "4", "3": "Delhi"}}, headers=exam(b["token"]))

    pid_a = a["participant"]["id"]
    before = c.post("/api/join/me/heartbeat", json={}, headers=exam(a["token"])).json()["deadline"]
    c.post(f"/api/exam-sessions/{sid}/participants/{pid_a}/extra-time", json={"minutes": 10}, headers=auth())
    after = c.post("/api/join/me/heartbeat", json={}, headers=exam(a["token"])).json()
    assert rules.parse_ts(after["deadline"]) - rules.parse_ts(before) == timedelta(minutes=10)

    c.post(f"/api/exam-sessions/{sid}/participants/{pid_a}/force-submit", headers=auth())
    assert c.post("/api/join/me/heartbeat", json={}, headers=exam(a["token"])).json()["force_submit"] is True
    assert submit(c, a["token"], {"1": "3"}).status_code == 200

    # Bilal never submitted; ending the sitting files his last saved answers.
    ended = c.post(f"/api/exam-sessions/{sid}/end", json={"collect": True}, headers=auth()).json()
    assert ended["collected"] == 1 and ended["phase"] == "ended"
    rows = c.get(f"/api/exam-sessions/{sid}/results", headers=auth()).json()["rows"]
    assert [(r["name"], r["score"], r["collected"]) for r in rows] == [("Bilal", 8.0, True), ("Asha", -1.0, False)]

    # Allow a retake: the attempt goes, the student can sit again.
    c.post(f"/api/exam-sessions/{sid}/participants/{pid_a}/allow-retake", headers=auth())
    assert not [x for x in db.tables["user_tests"] if x.get("participant_id") == pid_a]


def test_other_teacher_cannot_see_or_use(env):
    c = env["client"]
    session = create_session(c)
    assert c.get(f"/api/exam-sessions/{session['id']}", headers=auth(OTHER_TEACHER)).status_code == 404
    assert c.get(f"/api/exam-sessions/{session['id']}/results", headers=auth(OTHER_TEACHER)).status_code == 404
    assert c.get("/api/batches/class-a", headers=auth(OTHER_TEACHER)).status_code == 404
    stolen = c.post("/api/exam-sessions", json={"test_id": "test-1", "opens_at": iso(now()), "closes_at": iso(now() + timedelta(hours=1))}, headers=auth(OTHER_TEACHER))
    assert stolen.status_code == 404
    assert c.get(f"/api/exam-sessions/{session['id']}").status_code == 401


def test_retest_blocks_students_who_sat(env):
    c = env["client"]
    first = create_session(c, identity_mode="roll")
    code = first["join_code"]
    sat = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "1", "name": "Sat It"}).json()["token"]
    c.post("/api/join/me/start", headers=exam(sat))
    submit(c, sat, {"1": "4"})
    c.post(f"/api/exam-sessions/{first['id']}/end", json={"collect": False}, headers=auth())

    retest = c.post(f"/api/exam-sessions/{first['id']}/retest", json={"opens_at": iso(now())}, headers=auth()).json()
    blocked = c.post(f"/api/join/code/{retest['join_code']}/enter", json={"roll_no": "1", "name": "Sat It"})
    assert blocked.status_code == 409 and blocked.json()["detail"]["code"] == "already_sat"
    assert c.post(f"/api/join/code/{retest['join_code']}/enter", json={"roll_no": "2", "name": "Missed It"}).status_code == 200


def test_time_over_is_enforced_with_grace(env):
    c, db = env["client"], env["db"]
    session = create_session(c)
    token = c.post(f"/api/join/code/{session['join_code']}/enter", json={"name": "Slow"}).json()["token"]
    c.post("/api/join/me/start", headers=exam(token))
    p = db.tables["session_participants"][0]
    p["started_at"] = iso(now() - timedelta(minutes=70))  # 60-min paper, 10 min past: within grace
    ok = submit(c, token, {"1": "4"})
    assert ok.status_code == 200 and ok.json()["data"]["metadata"]["late_by_seconds"] >= 590

    other = c.post(f"/api/join/code/{session['join_code']}/enter", json={"name": "Very Slow"}).json()["token"]
    c.post("/api/join/me/start", headers=exam(other))
    q = next(x for x in db.tables["session_participants"] if x["display_name"] == "Very Slow")
    q["started_at"] = iso(now() - timedelta(minutes=80))
    late = submit(c, other, {"1": "4"})
    assert late.status_code == 403 and late.json()["detail"]["code"] == "time_over"


def test_join_code_for_a_live_exam_link(env):
    c, db = env["client"], env["db"]
    test = db.tables["tests"][0]
    not_live = c.post("/api/exam-sessions/link-code", json={"test_id": "test-1"}, headers=auth())
    assert not_live.status_code == 409 and not_live.json()["detail"]["code"] == "not_live"

    test["settings"] = {"conduct_exam": {"enabled": True, "conduct_slug": "physics-mock-3-k9x2m7qa"}}
    made = c.post("/api/exam-sessions/link-code", json={"test_id": "test-1"}, headers=auth()).json()
    code = made["join_code"]
    assert len(code) == 6 and test["settings"]["conduct_exam"]["join_code"] == code
    # Asking again returns the same code.
    assert c.post("/api/exam-sessions/link-code", json={"test_id": "test-1"}, headers=auth()).json()["join_code"] == code
    # Only the owner can make one.
    assert c.post("/api/exam-sessions/link-code", json={"test_id": "test-1"}, headers=auth(OTHER_TEACHER)).status_code == 404

    found = c.get(f"/api/join/code/{code}").json()
    assert found["kind"] == "link" and found["path"] == "/test/physics-mock-3-k9x2m7qa"
    assert found["test"]["title"] == "Physics Mock 3"

    # Stopping the exam kills the code.
    test["settings"]["conduct_exam"]["enabled"] = False
    gone = c.get(f"/api/join/code/{code}")
    assert gone.status_code == 404 and gone.json()["detail"]["code"] == "no_exam"

    # Sittings still answer as sittings.
    session = create_session(c)
    assert c.get(f"/api/join/code/{session['join_code']}").json()["kind"] == "session"


# ── "See your result" from any device ──────────────────────────────────────

def test_see_result_with_roll_and_pin_waits_for_release(env):
    c = env["client"]
    c.post("/api/batches/class-a/students", json={"students": [
        {"roll_no": "23A017", "full_name": "Rahul Kumar"}, {"roll_no": "23A018", "full_name": "Priya Sharma"},
    ]}, headers=auth())
    pins = {p["roll_no"]: p["pin"] for p in c.post("/api/batches/class-a/pins", json={"only_missing": True}, headers=auth()).json()["pins"]}
    session = create_session(c, class_id="class-a", identity_mode="roll_pin", results_release="manual")
    code = session["join_code"]
    token = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "23A017", "pin": pins["23A017"]}).json()["token"]
    c.post("/api/join/me/start", headers=exam(token))
    submit(c, token, {"1": "4", "2": "6"})

    form = c.get(f"/api/join/result/{code}").json()
    assert form["kind"] == "session" and form["identity_mode"] == "roll_pin" and form["results_released"] is False
    wrong_pin = "0000" if pins["23A017"] != "0000" else "1111"
    bad = c.post(f"/api/join/result/{code}", json={"roll_no": "23A017", "pin": wrong_pin})
    assert bad.status_code == 401 and bad.json()["detail"]["code"] == "wrong_details"
    # Priya has a PIN but never sat the exam.
    absent = c.post(f"/api/join/result/{code}", json={"roll_no": "23A018", "pin": pins["23A018"]})
    assert absent.status_code == 404 and absent.json()["detail"]["code"] == "not_found"

    waiting = c.post(f"/api/join/result/{code}", json={"roll_no": "23 a 017", "pin": pins["23A017"]}).json()
    assert waiting["released"] is False and waiting["name"] == "Rahul Kumar" and waiting["submitted_at"]
    assert "score" not in waiting

    # The examiner ends the sitting (the code stops opening the exam) and releases results.
    c.post(f"/api/exam-sessions/{session['id']}/end", json={"collect": False}, headers=auth())
    assert c.get(f"/api/join/code/{code}").status_code in (404, 410)
    c.post(f"/api/exam-sessions/{session['id']}/release", headers=auth())
    shown = c.post(f"/api/join/result/{code}", json={"roll_no": "23A017", "pin": pins["23A017"]}).json()
    assert shown["released"] and shown["score"] == 8.0 and shown["rank"] == 1 and shown["roll_no"] == "23A017"


def test_see_result_with_roll_or_name_only(env):
    c = env["client"]
    session = create_session(c, identity_mode="roll")
    code = session["join_code"]
    token = c.post(f"/api/join/code/{code}/enter", json={"roll_no": "7", "name": "Asha Rao"}).json()["token"]
    c.post(f"/api/join/code/{code}/enter", json={"roll_no": "8", "name": "Never Submitted"})
    c.post("/api/join/me/start", headers=exam(token))
    submit(c, token, {"1": "4"})

    form = c.get(f"/api/join/result/{code}").json()
    assert form["identity_mode"] == "roll"
    # Results come "when the sitting ends" (the default).
    assert c.post(f"/api/join/result/{code}", json={"roll_no": "7"}).json()["released"] is False
    c.post(f"/api/exam-sessions/{session['id']}/end", json={"collect": False}, headers=auth())
    shown = c.post(f"/api/join/result/{code}", json={"roll_no": " 7 "}).json()
    assert shown["released"] and shown["name"] == "Asha Rao" and shown["score"] == 4.0
    assert c.post(f"/api/join/result/{code}", json={"roll_no": "8"}).status_code == 404
    assert c.post(f"/api/join/result/{code}", json={}).json()["detail"]["code"] == "roll_required"

    by_name = create_session(c, identity_mode="name", results_release="immediate")
    t2 = c.post(f"/api/join/code/{by_name['join_code']}/enter", json={"name": "Bilal Khan"}).json()["token"]
    c.post("/api/join/me/start", headers=exam(t2))
    submit(c, t2, {"3": "Delhi"})
    shown = c.post(f"/api/join/result/{by_name['join_code']}", json={"name": "bilal  khan"}).json()
    assert shown["released"] and shown["name"] == "Bilal Khan"


def test_see_result_when_the_code_was_reused(env):
    c, db = env["client"], env["db"]
    old = create_session(c, identity_mode="roll", results_release="immediate")
    token = c.post(f"/api/join/code/{old['join_code']}/enter", json={"roll_no": "11", "name": "Old Timer"}).json()["token"]
    c.post("/api/join/me/start", headers=exam(token))
    submit(c, token, {"1": "4"})
    c.post(f"/api/exam-sessions/{old['id']}/end", json={"collect": False}, headers=auth())

    # A newer sitting, with a different check-in rule, now holds the same code.
    newer = create_session(c, identity_mode="name")
    next(s for s in db.tables["exam_sessions"] if s["id"] == newer["id"])["join_code"] = old["join_code"]
    assert c.get(f"/api/join/result/{old['join_code']}").json()["session_id"] == newer["id"]
    shown = c.post(f"/api/join/result/{old['join_code']}", json={"roll_no": "11"}).json()
    assert shown["released"] and shown["name"] == "Old Timer"


def test_see_result_for_an_exam_link(env):
    c, db = env["client"], env["db"]
    test = db.tables["tests"][0]
    started = iso(now() - timedelta(hours=2))
    test["settings"] = {
        "conduct_exam": {"enabled": True, "conduct_slug": "physics-mock-3-k9x2m7qa", "started_at": started, "join_code": "482913", "join_code_at": started},
        "show_results_immediate": True,
        "start_form": {"enabled": True, "fields": [{"label": "Name", "required": True}, {"label": "Roll No", "required": True}, {"label": "School", "required": False}]},
    }

    def attempt(form, answers, score, minutes_ago):
        db.tables.setdefault("user_tests", []).append({
            "id": f"a-{len(db.tables['user_tests'])}", "user_id": "guest", "test_id": "test-1", "answers": answers, "score": score,
            "metadata": {"startFormData": form, "is_conducted_attempt": True, "stats": {"wrongCount": 0, "unattemptedCount": 0}},
            "created_at": iso(now() - timedelta(minutes=minutes_ago)), "session_id": None, "participant_id": None,
        })

    attempt({"Name": "Meera Iyer", "Roll No": "21", "School": ""}, {"1": "4", "2": "6", "3": "Delhi"}, 12, 30)
    attempt({"Name": "Meera Iyer", "Roll No": "22", "School": "DPS"}, {"1": "4"}, 4, 20)
    attempt({"Name": "Earlier Run", "Roll No": "21"}, {"1": "4"}, 4, 60 * 5)  # before this run started

    form = c.get("/api/join/result/482913").json()
    assert form["kind"] == "link" and form["results_visible"] is True
    assert [f["label"] for f in form["fields"]] == ["Name", "Roll No", "School"]

    shown = c.post("/api/join/result/482913", json={"fields": {"Name": "meera iyer", "Roll No": "21"}}).json()
    assert shown["released"] and shown["score"] == 12.0 and shown["name"] == "Meera Iyer" and shown["rank"] == 1 and shown["of"] == 2
    # One optional field alone is not enough, and every field must match.
    assert c.post("/api/join/result/482913", json={"fields": {"School": "DPS"}}).json()["detail"]["code"] == "details_required"
    assert c.post("/api/join/result/482913", json={"fields": {"Name": "Meera Iyer", "Roll No": "22"}}).status_code == 404
    assert c.post("/api/join/result/482913", json={"fields": {"Name": "Earlier Run", "Roll No": "21"}}).status_code == 404

    # Results hidden: nothing to ask for, nothing shown.
    test["settings"]["show_results_immediate"] = False
    assert c.get("/api/join/result/482913").json()["results_visible"] is False
    hidden = c.post("/api/join/result/482913", json={"fields": {"Name": "Meera Iyer", "Roll No": "21"}})
    assert hidden.status_code == 403 and hidden.json()["detail"]["code"] == "results_hidden"

    # An expired schedule stops the link without resetting its settings: they still count.
    test["settings"]["show_results_immediate"] = True
    test["settings"]["conduct_exam"]["enabled"] = False
    assert c.get("/api/join/result/482913").json()["results_visible"] is True
    assert c.post("/api/join/result/482913", json={"fields": {"Name": "Meera Iyer", "Roll No": "21"}}).json()["score"] == 12.0

    # Stopped from the dashboard: settings are reset (start form off, visibility on), so
    # only what was recorded at stop counts; the form is rebuilt from the attempts.
    test["settings"] = {"show_results_immediate": True, "start_form": {"enabled": False, "fields": []},
                        "conduct_exam": {**test["settings"]["conduct_exam"], "enabled": False}}
    assert c.get("/api/join/result/482913").json()["results_visible"] is False
    test["settings"]["conduct_exam"]["results_visible"] = True
    rebuilt = c.get("/api/join/result/482913").json()["fields"]
    assert [f["label"] for f in rebuilt] == ["Name", "Roll No", "School"]
    again = c.post("/api/join/result/482913", json={"fields": {"Name": "Meera Iyer", "Roll No": "22", "School": "dps"}}).json()
    assert again["released"] and again["score"] == 4.0


def test_see_result_unknown_code(env):
    c = env["client"]
    assert c.get("/api/join/result/12").json()["detail"]["code"] == "bad_code"
    assert c.get("/api/join/result/482913").json()["detail"]["code"] == "no_exam"


def test_unexpected_errors_keep_cors_headers(env, monkeypatch):
    from app.routers import join as join_router

    def boom(*_args, **_kwargs):
        raise RuntimeError("permission denied for table exam_sessions")

    monkeypatch.setattr(join_router, "_open_session_by_code", boom)
    res = env["client"].get("/api/join/code/123456", headers={"Origin": "http://localhost:8081"})
    assert res.status_code == 500
    assert res.headers.get("access-control-allow-origin") == "http://localhost:8081"


def test_scheduled_exam_hides_answer_key_until_end():
    from app.routers.tests.utils import exam_window_still_open
    soon = {"schedule": {"enabled": True, "end_time": iso(now() + timedelta(minutes=5))}}
    past = {"schedule": {"enabled": True, "end_time": iso(now() - timedelta(minutes=5))}}
    assert exam_window_still_open(soon)
    assert not exam_window_still_open(past)
    assert not exam_window_still_open({"schedule": {"enabled": False, "end_time": iso(now() + timedelta(hours=1))}})
    assert not exam_window_still_open(None)
