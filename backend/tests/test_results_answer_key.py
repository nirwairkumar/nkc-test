"""Who gets the answer key from POST /results/analyze.

Two real failures this guards against:

1. 23 Sep - 12 Oct 2026: the exam copy of a test stopped carrying `correctAnswer` (C4),
   and the result page kept using that copy, so every student saw "undefined)" as the
   correct option (about 58 submissions on 13 tests). A submitted student MUST get the
   key for every question.

2. 12 Oct - 2 Nov 2026: the fix for (1) returned `answerKey` to anyone, signed in or
   not, given only the test's id or the slug from the exam link. A student mid-exam
   could read every answer. Nobody who has not submitted may get the key.

3. 2 Nov 2026: the fix for (2) demanded a login, and most candidates take exams without
   one, so they all got "Failed to process results". A candidate without a login proves
   they submitted with the attempt id the save returned, or their per-tab candidate id.
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import results

TEST_ID = "2b6d1ebb-0000-0000-0000-000000000001"
CREATOR = "creator-1"
STUDENT = "student-1"   # has submitted
STRANGER = "student-2"  # signed in, mid-exam, has not submitted
ADMIN = "admin-1"

KEY = {"1": "D", "2": "B", "3": "A"}


def stored_test(settings=None):
    opts = {"A": "1 and 2 only", "B": "2 and 3 only", "C": "1 and 3 only", "D": "1, 2, and 3"}
    return {
        "id": TEST_ID,
        "created_by": CREATOR,
        "questions": [{"id": int(i), "type": "single", "marks": "1", "negativeMarks": "0.25",
                       "options": opts, "correctAnswer": a} for i, a in KEY.items()],
        "settings": settings or {},
    }


class _Query:
    """Just enough of supabase-py's builder for `user_tests` lookups."""

    def __init__(self, rows):
        self.rows, self.filters = rows, {}

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.filters[col] = val
        return self

    def limit(self, _n):
        return self

    def execute(self):
        hit = [r for r in self.rows if all(r.get(c) == v for c, v in self.filters.items())]
        return SimpleNamespace(data=hit)


GUEST = "9f1c2b7e-1111-4222-8333-444455556666"          # no login: the browser's random id
GUEST_ATTEMPT = "a7e3d1c0-aaaa-4bbb-8ccc-ddddeeeeffff"  # what the save returned to that browser
OTHER_TEST_ATTEMPT = "b0b0b0b0-1111-4222-8333-444455556666"


def analyze(monkeypatch, requester, settings=None, answers=None, attempt_id=None, candidate_id=None):
    test = stored_test(settings)
    attempts = [
        {"id": "attempt-1", "user_id": STUDENT, "test_id": TEST_ID},
        {"id": GUEST_ATTEMPT, "user_id": GUEST, "test_id": TEST_ID},
        {"id": OTHER_TEST_ATTEMPT, "user_id": STRANGER, "test_id": "some-other-test"},
    ]
    monkeypatch.setattr(results, "_load_authoritative_test", lambda _id: test)
    monkeypatch.setattr(results, "get_optional_user_id", lambda _req: requester)
    monkeypatch.setattr(results, "is_admin_user", lambda uid, *_a: uid == ADMIN)
    monkeypatch.setattr(results, "supabase", SimpleNamespace(table=lambda _t: _Query(attempts)))
    # The browser's copy, as the exam page holds it: no correctAnswer anywhere.
    browser_copy = {"id": TEST_ID, "questions": [{"id": int(i), "type": "single"} for i in KEY]}
    payload = results.AnalyzeRequest(test=browser_copy, answers=answers or {"1": "D", "2": "A"},
                                     test_id=TEST_ID, attempt_id=attempt_id, candidate_id=candidate_id)
    return results.analyze_test_results(payload, SimpleNamespace(headers={}))


# ── (1) the student who submitted sees the right answers ─────────────────────

def test_submitted_student_gets_the_key_for_every_question(monkeypatch):
    out = analyze(monkeypatch, STUDENT)
    assert out["answerKey"] == KEY
    assert out["correctCount"] == 1 and out["wrongCount"] == 1  # scored against the stored key


def test_student_without_login_gets_the_key_with_their_submit_receipt(monkeypatch):
    # 2 Nov 2026: requiring a login refused every candidate who took the exam without one
    # ("Failed to process results — Sign in to see this result"). Most candidates have no login.
    assert analyze(monkeypatch, None, attempt_id=GUEST_ATTEMPT)["answerKey"] == KEY
    assert analyze(monkeypatch, None, candidate_id=GUEST)["answerKey"] == KEY


def test_creator_and_admin_get_the_key_without_an_attempt(monkeypatch):
    assert analyze(monkeypatch, CREATOR)["answerKey"] == KEY
    assert analyze(monkeypatch, ADMIN)["answerKey"] == KEY


# ── (2) nobody else gets it ──────────────────────────────────────────────────

def test_no_login_and_no_receipt_gets_403_and_no_key(monkeypatch):
    # 403, not 401: a 401 would send a login-less candidate into the app's login recovery.
    with pytest.raises(HTTPException) as e:
        analyze(monkeypatch, None)
    assert e.value.status_code == 403


@pytest.mark.parametrize("attempt_id,candidate_id", [
    (OTHER_TEST_ATTEMPT, None),                       # a real receipt, but for another test
    ("00000000-0000-4000-8000-000000000000", None),   # made up
    (None, "00000000-0000-4000-8000-000000000000"),   # made-up candidate id
    ("indian-regulatory-fr-pcx7ggfj", "not-a-uuid"),  # junk
])
def test_a_receipt_that_is_not_for_this_test_gets_403(monkeypatch, attempt_id, candidate_id):
    with pytest.raises(HTTPException) as e:
        analyze(monkeypatch, None, attempt_id=attempt_id, candidate_id=candidate_id)
    assert e.value.status_code == 403


def test_signed_in_without_submitting_gets_403_and_no_key(monkeypatch):
    # Probing with every option would reveal the key through correct/wrong, so the
    # whole analysis is refused, not just the answerKey field.
    with pytest.raises(HTTPException) as e:
        analyze(monkeypatch, STRANGER, answers={"1": "A", "2": "A", "3": "A"})
    assert e.value.status_code == 403


# ── the creator's own visibility settings still apply to students ───────────

def test_key_held_back_while_a_scheduled_exam_is_still_open(monkeypatch):
    end = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    settings = {"schedule": {"enabled": True, "end_time": end}}
    assert analyze(monkeypatch, STUDENT, settings)["answerKey"] == {}
    assert analyze(monkeypatch, CREATOR, settings)["answerKey"] == {}  # same rule for everyone while open


def test_key_hidden_from_students_when_the_creator_turned_it_off(monkeypatch):
    settings = {"result_view": {"solution_key": False}}
    assert analyze(monkeypatch, STUDENT, settings)["answerKey"] == {}
    assert analyze(monkeypatch, CREATOR, settings)["answerKey"] == KEY
