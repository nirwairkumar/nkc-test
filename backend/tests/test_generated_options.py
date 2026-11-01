"""
AI-written questions get their options shuffled so the answer isn't mostly at A
(pdf_vision_pipeline.shuffle_generated_options). Run from backend/:  python -m pytest tests/test_generated_options.py -q
"""
import copy

import pytest

pvp = pytest.importorskip("ai_preview_importer.pdf_vision_pipeline")


def mcq(i, answer="A", options=None):
    return {
        "id": i, "type": "single", "question": f"Generated question number {i} about solar geometry",
        "options": options or {"A": f"right {i}", "B": f"wrong b {i}", "C": f"wrong c {i}", "D": f"wrong d {i}"},
        "optionImages": {"A": None, "B": None, "C": None, "D": None},
        "correctAnswer": answer,
    }


def test_the_answer_moves_with_its_option_and_lands_all_over():
    qs = [mcq(i) for i in range(1, 41)]
    result = {"questions": qs}
    pvp.shuffle_generated_options(result)
    for i, q in enumerate(qs, 1):
        assert q["options"][q["correctAnswer"]] == f"right {i}"
        assert sorted(q["options"]) == ["A", "B", "C", "D"]
    assert len({q["correctAnswer"] for q in qs}) == 4


def test_flat_list_and_section_copies_shuffle_the_same_way():
    flat = [mcq(i) for i in range(1, 6)]
    result = {"questions": flat, "sections": [{"name": "S", "questions": copy.deepcopy(flat)}]}
    pvp.shuffle_generated_options(result)
    assert result["questions"] == result["sections"][0]["questions"]


def test_options_that_point_at_other_options_keep_their_order():
    for last in ("Both A and B", "All of the above", "None of these options", "(A) and (C)"):
        q = mcq(1, options={"A": "one", "B": "two", "C": "three", "D": last})
        pvp.shuffle_generated_options({"questions": [q]})
        assert q["options"]["D"] == last and q["correctAnswer"] == "A"


def test_multiple_correct_answers_follow_their_options():
    q = mcq(7, answer=["A", "C"], options={"A": "p", "B": "q", "C": "r", "D": "s"})
    q["type"] = "multiple"
    pvp.shuffle_generated_options({"questions": [q]})
    assert sorted(q["options"][k] for k in q["correctAnswer"]) == ["p", "r"]
