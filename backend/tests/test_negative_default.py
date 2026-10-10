"""A paper that never asks for negative marking must not deduct anything.

The default used to be 1, so a wrong answer on an unmarked English quiz cost a
mark and teachers' own trial runs came back at minus eighteen. Negative marking
is now only ever what the paper explicitly says.
"""
from app.services.scoring import score_attempt


def mcq(qid, **marks):
    return {"id": qid, "type": "single", "correctAnswer": "A", **marks}


def test_unmarked_paper_never_goes_negative():
    test = {"questions": [mcq(1), mcq(2), mcq(3)]}
    result = score_attempt(test, {"1": "B", "2": "B", "3": "B"})
    assert result["score"] == 0
    assert result["negativeScore"] == 0
    assert result["wrongCount"] == 3


def test_explicit_negative_marking_still_applies():
    # JEE pattern chosen on purpose: +4 / -1 per question.
    test = {"questions": [mcq(1, marks="4", negativeMarks="1"), mcq(2, marks="4", negativeMarks="1")]}
    result = score_attempt(test, {"1": "A", "2": "B"})
    assert result["score"] == 3


def test_test_level_and_section_level_negative_still_apply():
    test = {"negative_marks": 0.25, "marks_per_question": 1, "questions": [mcq(1)]}
    assert score_attempt(test, {"1": "B"})["score"] == -0.25

    sectioned = {
        "enable_section_mode": True,
        "sections": [{"id": "s1", "marks_per_question": 2, "negative_marks": 0.5, "questions": [mcq(1)]}],
    }
    assert score_attempt(sectioned, {"1": "B"})["score"] == -0.5


def test_section_without_negative_marks_deducts_nothing():
    sectioned = {
        "enable_section_mode": True,
        "sections": [{"id": "s1", "marks_per_question": 2, "questions": [mcq(1)]}],
    }
    assert score_attempt(sectioned, {"1": "B"})["score"] == 0
