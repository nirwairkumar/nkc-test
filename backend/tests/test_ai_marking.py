"""Marks per question on AI-imported papers: teacher > the paper's own scheme > +1 / 0."""
from ai_preview_importer.marking import marking_prompt, parse_mark, resolve_marking


def flat(*pairs):
    return {"questions": [{"id": i + 1, "marks": m, "negativeMarks": n} for i, (m, n) in enumerate(pairs)]}


def marks(result):
    return [(q["marks"], q["negativeMarks"]) for q in result["questions"]]


def test_teacher_values_override_whatever_the_model_said():
    result = resolve_marking(flat((4, 1), (None, None), ("2", "0.5")), 2.5, 0.5)
    assert marks(result) == [(2.5, 0.5)] * 3
    assert result["marking"]["marks_source"] == "teacher"
    assert result["marking"]["negative_source"] == "teacher"


def test_nothing_stated_anywhere_falls_back_to_plus_one_no_negative():
    result = resolve_marking(flat((None, None), (None, None)))
    assert marks(result) == [(1, 0), (1, 0)]
    assert result["marking"]["marks_source"] == "default"


def test_scheme_on_the_cover_page_reaches_questions_from_later_batches():
    # Batch 1 saw "+4 / -1" on the cover; batch 2 (later pages) could not.
    result = resolve_marking(flat((4, 1), (4, 1), (None, None), (None, None)))
    assert marks(result) == [(4, 1)] * 4
    assert result["marking"] == {
        "marks": 4, "negativeMarks": 1, "marks_source": "paper", "negative_source": "paper", "varies": False,
    }


def test_each_field_is_decided_on_its_own():
    # Teacher fixed the marks only; the penalty still comes from the paper.
    result = resolve_marking(flat((4, 0.25), (None, 0.25)), 2, None)
    assert marks(result) == [(2, 0.25), (2, 0.25)]
    assert result["marking"]["marks_source"] == "teacher"
    assert result["marking"]["negative_source"] == "paper"


def test_sections_keep_their_own_scheme_and_get_section_level_values():
    result = {
        "questions": [],
        "sections": [
            {"name": "MCQ", "questions": [{"marks": 4, "negativeMarks": 1}, {"marks": None, "negativeMarks": None}]},
            {"name": "Numerical", "questions": [{"marks": 4, "negativeMarks": 0}, {"marks": None, "negativeMarks": None}]},
        ],
    }
    resolve_marking(result)
    mcq, num = result["sections"]
    assert [(q["marks"], q["negativeMarks"]) for q in mcq["questions"]] == [(4, 1), (4, 1)]
    assert [(q["marks"], q["negativeMarks"]) for q in num["questions"]] == [(4, 0), (4, 0)]
    # Sectioned tests score from these, so they must match the questions.
    assert (mcq["marks_per_question"], mcq["negative_marks"]) == (4, 1)
    assert (num["marks_per_question"], num["negative_marks"]) == (4, 0)
    assert result["marking"]["varies"] is True


def test_a_mark_printed_beside_one_question_survives():
    result = resolve_marking(flat((1, 0), (1, 0), (3, 0)))
    assert marks(result) == [(1, 0), (1, 0), (3, 0)]
    assert result["marking"]["marks"] is None and result["marking"]["varies"] is True


def test_parse_mark_reads_what_models_and_papers_write():
    assert parse_mark("-1", allow_zero=True) == 1          # a penalty written as a minus
    assert parse_mark("+4", allow_zero=False) == 4
    assert parse_mark("2.50", allow_zero=False) == 2.5
    assert parse_mark("1/3", allow_zero=True) == "1/3"      # kept exact, the platform scores fractions
    assert parse_mark(0, allow_zero=True) == 0
    assert parse_mark(0, allow_zero=False) is None          # a question worth nothing is a misread
    assert parse_mark("abc", allow_zero=True) is None
    assert parse_mark(250, allow_zero=False) is None        # a page number, not a mark
    assert parse_mark(True, allow_zero=True) is None


def test_prompt_says_read_from_paper_unless_teacher_fixed_it():
    open_prompt = marking_prompt()
    assert "READ IT FROM THE DOCUMENT" in open_prompt and "set that field to null" in open_prompt

    fixed = marking_prompt(2.5, 0.5)
    assert "FIXED BY THE TEACHER" in fixed and '"marks": 2.5' in fixed and '"negativeMarks": 0.5' in fixed

    half = marking_prompt(None, 0)
    assert '"negativeMarks": 0 on EVERY question' in half and 'Read "marks"' in half
