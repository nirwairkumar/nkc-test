"""The answer sheet's "% Score" is the candidate's overall score, not a topic's.

The per-topic loop in /results/analyze reused the name `percentage`, so the
response carried the LAST topic's percentage: a candidate on 37.5/40 (94%)
whose last topic was right showed "100% Score", one whose last topic was
wrong showed a negative score.
"""
from types import SimpleNamespace

from app.routers import results


def mcq(qid, topic, answer="A"):
    return {"id": qid, "type": "single", "topic": topic, "correctAnswer": answer, "marks": "2", "negativeMarks": "0.5",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"}}


def analyze(test, answers, monkeypatch):
    # No stored test, no signed-in caller: the browser's copy of the test is scored as sent.
    monkeypatch.setattr(results, "_load_authoritative_test", lambda _id: None)
    monkeypatch.setattr(results, "get_optional_user_id", lambda _req: None)
    payload = results.AnalyzeRequest(test=test, answers=answers)
    return results.analyze_test_results(payload, SimpleNamespace(headers={}))


def test_percentage_is_the_whole_score_not_the_last_topic(monkeypatch):
    test = {"questions": [mcq(1, "Algebra"), mcq(2, "Algebra"), mcq(3, "Algebra"), mcq(4, "Grammar")]}
    # 3 right on Algebra, the Grammar one right too, but one Algebra wrong: 3 × 2 − 0.5 = 5.5 / 8.
    out = analyze(test, {"1": "A", "2": "A", "3": "B", "4": "A"}, monkeypatch)
    assert out["finalScore"] == 5.5
    assert out["percentage"] == round(5.5 / 8 * 100)  # 69, not Grammar's 100
    topics = {t["name"]: t["percentage"] for t in out["topicData"]}
    assert topics["Grammar"] == 100


def test_last_topic_wrong_does_not_make_the_score_negative(monkeypatch):
    test = {"questions": [mcq(1, "Algebra"), mcq(2, "Grammar")]}
    out = analyze(test, {"1": "A", "2": "B"}, monkeypatch)
    assert out["percentage"] == round(1.5 / 4 * 100)  # 38, not Grammar's -25
