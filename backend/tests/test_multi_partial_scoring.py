"""Multiple-correct questions: proportional partial marks (default) and JEE Advanced's +1 per option."""
from app.services.scoring import score_question


def q(correct, partial=None):
    question = {"type": "multiple", "correctAnswer": correct}
    if partial:
        question["partialMarking"] = partial
    return question


def test_proportional_default():
    three = q(["A", "B", "D"])
    assert score_question(three, ["A", "B", "D"], 4, 2) == (4, "correct")
    delta, outcome = score_question(three, ["A", "B"], 4, 2)
    assert outcome == "partial" and round(delta, 2) == 2.67
    assert score_question(three, ["A", "C"], 4, 2) == (-2, "wrong")


def test_jee_advanced_per_option():
    four = q(["A", "B", "C", "D"], "per_option")
    assert score_question(four, ["A", "B", "C", "D"], 4, 2) == (4, "correct")
    assert score_question(four, ["A", "B", "C"], 4, 2) == (3, "partial")
    three = q(["A", "B", "D"], "per_option")
    assert score_question(three, ["A", "B"], 4, 2) == (2, "partial")
    assert score_question(three, ["D"], 4, 2) == (1, "partial")
    assert score_question(three, ["A", "C"], 4, 2) == (-2, "wrong")
    two = q(["B", "C"], "per_option")
    assert score_question(two, ["C"], 4, 2) == (1, "partial")
    assert score_question(two, ["B", "C"], 4, 2) == (4, "correct")


def test_per_option_capped_by_marks():
    four = q(["A", "B", "C", "D"], "per_option")
    assert score_question(four, ["A", "B", "C"], 2, 1) == (2, "partial")
