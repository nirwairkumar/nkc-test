"""Guest ID: a candidate without a login reopens their results from any device.

The result hub shows the 12 characters of candidate_<id>@guest.testoza.com as the
"Guest ID". /join/result lists every exam taken under it and opens one in the hub.
Held results must stay held, the answer key must never be in the test sent back, and
an attempt of another candidate must not open with your Guest ID.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import join

GUEST = "6c316897-84f4-4563-addd-e4a63f7a1045"
CODE = "6c31689784f4"
OTHER = "11111111-2222-4333-8444-555555555555"

OPEN_TEST = "aaaaaaaa-0000-4000-8000-000000000001"     # results shown after submit
HELD_TEST = "aaaaaaaa-0000-4000-8000-000000000002"     # creator hides results
STOPPED_TEST = "aaaaaaaa-0000-4000-8000-000000000003"  # live link stopped, results recorded visible

QUESTION = {"id": 1, "type": "single", "options": {"A": "x", "B": "y"}, "correctAnswer": "B",
            "explanation": "because"}


def _row(**kw):
    return kw


DB = {
    "profiles": [
        _row(id=GUEST, email=f"candidate_{CODE}@guest.testoza.com"),
        _row(id=OTHER, email="candidate_111111112222@guest.testoza.com"),
    ],
    "tests": [
        _row(id=OPEN_TEST, title="Open", settings={}, questions=[QUESTION], solutions={"1": "s"}, total_max_marks=4),
        _row(id=HELD_TEST, title="Held", settings={"show_results_immediate": False}, questions=[QUESTION], total_max_marks=4),
        _row(id=STOPPED_TEST, title="Stopped", questions=[QUESTION], total_max_marks=4,
             settings={"conduct_exam": {"enabled": False, "results_visible": True}}),
    ],
    "user_tests": [
        _row(id="b0000000-0000-4000-8000-000000000001", user_id=GUEST, test_id=OPEN_TEST, score=4,
             created_at="2026-11-01T22:22:07+00:00", session_id=None, answers={"1": "B"}, metadata={}),
        _row(id="b0000000-0000-4000-8000-000000000002", user_id=GUEST, test_id=HELD_TEST, score=3,
             created_at="2026-10-30T10:00:00+00:00", session_id=None, answers={"1": "A"}, metadata={}),
        _row(id="b0000000-0000-4000-8000-000000000003", user_id=GUEST, test_id=STOPPED_TEST, score=2,
             created_at="2026-10-29T10:00:00+00:00", session_id=None, answers={}, metadata={}),
        _row(id="b0000000-0000-4000-8000-000000000009", user_id=OTHER, test_id=OPEN_TEST, score=1,
             created_at="2026-11-01T09:00:00+00:00", session_id=None, answers={}, metadata={}),
    ],
    "exam_sessions": [],
}


class _Query:
    def __init__(self, rows):
        self.rows = [dict(r) for r in rows]

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.rows = [r for r in self.rows if str(r.get(col)) == str(val)]
        return self

    def in_(self, col, vals):
        vals = {str(v) for v in vals}
        self.rows = [r for r in self.rows if str(r.get(col)) in vals]
        return self

    def order(self, col, desc=False):
        self.rows.sort(key=lambda r: r.get(col) or "", reverse=desc)
        return self

    def limit(self, n):
        self.rows = self.rows[:n]
        return self

    def execute(self):
        return SimpleNamespace(data=self.rows)


DB_CLIENT = SimpleNamespace(table=lambda name: _Query(DB[name]))
REQUEST = SimpleNamespace(headers={}, client=SimpleNamespace(host="1.2.3.4"))


@pytest.fixture(autouse=True)
def no_rate_limit(monkeypatch):
    monkeypatch.setattr(join, "enforce_limit", lambda *a, **k: None)


def test_lists_every_exam_newest_first_and_keeps_held_marks_hidden():
    out = join.guest_results(CODE, REQUEST, DB_CLIENT)
    assert out["guest_id"] == CODE
    assert [a["title"] for a in out["attempts"]] == ["Open", "Held", "Stopped"]
    held = out["attempts"][1]
    assert held["results_visible"] is False and held["score"] is None and held["max_marks"] is None
    assert out["attempts"][0]["score"] == 4 and out["attempts"][2]["results_visible"] is True


@pytest.mark.parametrize("typed", [CODE, CODE.upper(), f"candidate_{CODE}@guest.testoza.com", " 6c31-6897-84f4 "])
def test_accepts_the_id_however_it_was_copied(typed):
    assert join.guest_results(typed, REQUEST, DB_CLIENT)["guest_id"] == CODE


@pytest.mark.parametrize("typed,status", [("6c31", 400), ("zzzzzzzzzzzz", 400), ("ffffffffffff", 404)])
def test_bad_or_unknown_ids_are_refused(typed, status):
    with pytest.raises(HTTPException) as e:
        join.guest_results(typed, REQUEST, DB_CLIENT)
    assert e.value.status_code == status


def test_opening_one_result_never_sends_the_answer_key():
    out = join.guest_attempt(CODE, "b0000000-0000-4000-8000-000000000001", REQUEST, DB_CLIENT)
    q = out["test"]["questions"][0]
    assert "correctAnswer" not in q and "explanation" not in q and "solutions" not in out["test"]
    assert out["attempt"]["answers"] == {"1": "B"}
    assert DB["tests"][0]["questions"][0]["correctAnswer"] == "B"  # the stored test is not mutated


def test_held_results_do_not_open():
    with pytest.raises(HTTPException) as e:
        join.guest_attempt(CODE, "b0000000-0000-4000-8000-000000000002", REQUEST, DB_CLIENT)
    assert e.value.status_code == 403


def test_another_candidates_attempt_does_not_open_with_your_guest_id():
    with pytest.raises(HTTPException) as e:
        join.guest_attempt(CODE, "b0000000-0000-4000-8000-000000000009", REQUEST, DB_CLIENT)
    assert e.value.status_code == 404
