"""Numerical questions: a range ({min, max}) or "Exact value(s)" (exactMatch + exactAnswers)."""
from app.services.scoring import score_question


def q(correct):
    return {"type": "numerical", "correctAnswer": correct}


def test_range_inclusive():
    rng = q({"min": 2.23, "max": 2.24})
    assert score_question(rng, "2.23", 4, 1) == (4, "correct")
    assert score_question(rng, "2.24", 4, 1) == (4, "correct")
    assert score_question(rng, "2.25", 4, 1) == (-1, "wrong")


def test_exact_values_ignore_default_zero_range():
    # The builder leaves min/max at 0 when "Exact value(s)" is chosen.
    exact = q({"min": 0, "max": 0, "exactMatch": True, "exactAnswers": "100, 150, 200"})
    assert score_question(exact, "150", 4, 1) == (4, "correct")
    assert score_question(exact, "150.0", 4, 1) == (4, "correct")
    assert score_question(exact, "0", 4, 1) == (-1, "wrong")
    assert score_question(exact, "125", 4, 1) == (-1, "wrong")


def test_exact_values_skip_junk_entries():
    exact = q({"exactMatch": True, "exactAnswers": "0.5, , abc, -3"})
    assert score_question(exact, "-3", 2, 0.5) == (2, "correct")
    assert score_question(exact, ".5", 2, 0.5) == (2, "correct")


def test_exact_match_false_uses_range():
    rng = q({"min": 1, "max": 1, "exactMatch": False, "exactAnswers": "7"})
    assert score_question(rng, "1", 4, 1) == (4, "correct")
    assert score_question(rng, "7", 4, 1) == (-1, "wrong")
