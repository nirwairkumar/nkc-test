"""
The page reader for "Extract" (ai_preview_importer/page_extract.py): printed numbers are kept,
questions with identical wording are never merged, busy errors are retried, missing numbers are
re-read, and what still can't be read shows up as a card. No network: the Gemini stream is faked.
Run from backend/:  python -m pytest tests/test_page_extract.py -q
"""
import asyncio
import json
import re

import pytest

pe = pytest.importorskip("ai_preview_importer.page_extract")
from ai_preview_importer.pdf_vision_pipeline import _match_answer_key, option_letter  # noqa: E402

MATCH = "Match List-I with List-II. Choose the correct answer from the options given below :"
OPTS = {"A": "(A)-(III), (B)-(I)", "B": "(A)-(II), (B)-(IV)", "C": "(A)-(I), (B)-(II)", "D": "(A)-(IV), (B)-(III)"}


def q(n, page, text=None, section=None, **extra):
    return {"qno": str(n), "page": page, "section_name": section, "question": text or f"Question {n} text", "options": dict(OPTS), **extra}


# ── Pieces ────────────────────────────────────────────────────────────────────


def test_printed_numbers_compare_in_any_print_style():
    assert [pe.qno(v) for v in ["Q.37", "(37)", "37.", "Question 37", "प्रश्न 37", 37, "5(a)"]] == ["37"] * 6 + ["5(a)"]
    assert pe.qno_int("5(b)") == 5 and pe.qno_int("p4-1") is None


def test_identical_wording_is_never_merged():
    # JEE Main 2025, 7 Apr Shift 2: Q32, Q37 and Q38 all print only the "Match List" sentence.
    questions = [q(32, 5, MATCH), q(37, 6, MATCH), q(38, 6, MATCH)]
    pe.carry_sections(questions)
    kept, merged = pe.merge_repeats(questions)
    assert [x["qno"] for x in kept] == ["32", "37", "38"] and merged == 0


def test_a_question_two_calls_returned_is_kept_once_with_its_options():
    first = q(20, 6, "A block slides", options={"A": "", "B": "", "C": "", "D": ""})
    second = q(20, 7, "A block slides down an incline", correctAnswer="B")
    questions = [q(19, 6), first, second, q(21, 7)]
    pe.carry_sections(questions)
    kept, merged = pe.merge_repeats(questions)
    assert [x["qno"] for x in kept] == ["19", "20", "21"] and merged == 1
    assert kept[1]["options"] == OPTS and kept[1]["correctAnswer"] == "B"


def test_numbering_that_restarts_far_away_is_not_a_repeat():
    questions = [q(1, 1), q(2, 1), q(1, 9), q(2, 9)]
    pe.carry_sections(questions)
    kept, merged = pe.merge_repeats(questions)
    assert len(kept) == 4 and merged == 0


def _reprint_setup(questions, files=None):
    pe.carry_sections(questions)
    questions, _ = pe.merge_repeats(questions)
    file_of = files or {}
    return questions, pe.drop_reprints(questions, file_of)


def test_a_solutions_part_that_prints_the_numbers_again_is_dropped():
    # PW's JEE Main 2025 4 Apr Shift 2: Q1-Q75 on pages 1-11, then "Q24 Video Solution:" lists.
    paper = [q(23, 3, "A long physics question about a rod rotating about its end"),
             q(24, 3, "A charged particle enters a magnetic field at an angle"),
             q(25, 4, "Find the equivalent resistance between the points A and B")]
    solutions = [q(24, 16, "Video Solution:", options={}),
                 q(25, 16, "Find the equivalent resistance between the points A and B"),
                 q(26, 17, "Sol. Using Kirchhoff's law", options={"A": "", "B": "", "C": "", "D": ""})]
    paper.append(q(26, 4, "The work done by the gas in the cycle shown is"))
    kept, dropped = _reprint_setup(paper + solutions)
    assert [(x["qno"], x["page"]) for x in kept] == [("23", 3), ("24", 3), ("25", 4), ("26", 4)] and dropped == 3


def test_two_files_that_both_start_at_1_keep_every_question():
    worksheets = [q(1, 1, "Worksheet one, first question"), q(2, 1, "Worksheet one, second question"),
                  q(1, 4, "Worksheet two, first question"), q(2, 4, "Worksheet two, second question")]
    kept, dropped = _reprint_setup(worksheets, {1: 0, 2: 0, 3: 1, 4: 1})
    assert len(kept) == 4 and dropped == 0


def test_a_new_numbering_in_one_file_with_different_questions_is_kept():
    questions = [q(1, 1, "Velocity of a ball thrown upwards after two seconds"),
                 q(1, 6, "The pH of a buffer made from acetic acid and sodium acetate")]
    kept, dropped = _reprint_setup(questions)
    assert len(kept) == 2 and dropped == 0


def test_pages_the_model_says_hold_no_questions_are_not_re_read():
    pages = {n: pe.Page(n, b"jpeg", "") for n in range(1, 21)}
    empty = json.dumps({"page_index": [{"page": p, "question_numbers": []} for p in (13, 14, 15)], "questions": [], "answer_key": []})
    read = pe._to_read({"questions": [], "_meta": {"raw": empty}}, [13, 14, 15], pages, complete=True, error=None)
    assert read.nothing_here and not read.failed
    garbled = pe._to_read({"questions": [], "_meta": {"raw": "{\"page_ind"}}, [13, 14, 15], pages, complete=True, error=None)
    assert garbled.failed
    cut = pe._to_read({"questions": [], "_meta": {"raw": empty}}, [13, 14, 15], pages, complete=False, error="cut off")
    assert cut.failed


def test_section_headings_carry_over_in_one_spelling():
    # Headings as three calls wrote them for JEE Main 2026, 21 Jan Shift 1.
    questions = [
        q(1, 1, section="MATHEMATICS - SECTION-A"), q(2, 2), q(21, 7, section="SECTION-B"), q(22, 8),
        q(23, 8, section="SECTION-B"),  # a later call repeats the bare part: still Mathematics
        q(26, 10, section="PHYSICS - SECTION-A"), q(46, 16, section="Physics - SECTION - B"),
        q(51, 18, section="CHEMISTRY\nSECTION-A"), q(54, 19, section="CHEMISTRY"), q(71, 23, section="SECTION-B"),
    ]
    pe.carry_sections(questions)
    assert [x["section_name"] for x in questions] == [
        "Mathematics - Section A", "Mathematics - Section A", "Mathematics - Section B", "Mathematics - Section B",
        "Mathematics - Section B", "Physics - Section A", "Physics - Section B",
        "Chemistry - Section A", "Chemistry - Section A", "Chemistry - Section B",
    ]


def test_in_a_paper_of_several_subjects_a_bare_part_takes_the_question_subject():
    # Another read of the same paper printed only "SECTION-A" / "SECTION-B" for every subject.
    raw = [("1", "SECTION-A", "Mathematics"), ("21", "SECTION-B", "Mathematics"), ("26", "SECTION-A", "Physics"),
           ("27", None, "Physics"), ("46", "SECTION-B", "Physics"), ("51", "SECTION-A", "Chemistry")]
    questions = [dict(q(n, i + 1, section=s), subject=subj) for i, (n, s, subj) in enumerate(raw)]
    assert pe.paper_subjects(questions * 3) == ["Mathematics", "Physics", "Chemistry"]
    pe.carry_sections(questions, use_subjects=True)
    assert [x["section_name"] for x in questions] == [
        "Mathematics - Section A", "Mathematics - Section B", "Physics - Section A",
        "Physics - Section A", "Physics - Section B", "Chemistry - Section A",
    ]


def test_a_part_going_back_without_a_subject_starts_a_new_section():
    questions = [q(1, 1, section="Physics - Section A"), q(21, 3, section="Section B"), q(26, 5, section="Section A")]
    pe.carry_sections(questions)
    assert [x["section_name"] for x in questions] == ["Physics - Section A", "Physics - Section B", "Section A"]


def test_types_follow_what_came_back():
    numeric = {"qno": "23", "type": "single", "question": "Find n", "options": {"A": "", "B": "", "C": "", "D": ""}, "correctAnswer": "1333"}
    choice = {"qno": "8", "type": "numerical", "question": "Pick", "options": dict(OPTS), "correctAnswer": "B"}
    pe.settle_type(numeric)
    pe.settle_type(choice)
    assert numeric["type"] == "numerical" and numeric["correctAnswer"] == {"min": 1333.0, "max": 1333.0} and numeric["options"] == {}
    assert choice["type"] == "single" and choice["correctAnswer"] == "B"


def test_holes_in_the_numbering_are_found_with_their_pages():
    questions = [q(35, 6), q(36, 6), q(39, 7), q(40, 7)]
    pe.carry_sections(questions)
    gaps = pe.find_gaps(questions, [], total_pages=10)
    assert [(g.numbers, g.pages) for g in gaps] == [(["37", "38"], [6, 7])]


def test_a_new_numbering_is_not_a_hole():
    questions = [q(24, 4), q(25, 4), q(1, 5), q(2, 5)]
    pe.carry_sections(questions)
    assert pe.find_gaps(questions, [], total_pages=10) == []


def test_answer_key_numbers_mean_options_for_mcqs_and_values_for_numericals():
    mcq = q(3, 1)
    numerical = {"qno": "4", "page": 1, "question": "Find x", "type": "numerical", "options": {}}
    assert option_letter("(3)", mcq) == "C" and option_letter("c", mcq) == "C"
    assert option_letter("3", numerical) is None
    filled = pe.apply_answer_key([mcq, numerical], [{"qno": "3", "answer": "(3)"}, {"qno": "4", "answer": "12.5"}])
    assert filled == 2 and mcq["correctAnswer"] == "C"
    assert numerical["correctAnswer"] == {"min": 12.5, "max": 12.5}


def test_an_uploaded_answer_key_saying_3_keeps_an_mcq_an_mcq():
    questions = [dict(q(1, 1), id=1, type="single")]
    _match_answer_key(questions, [{"question_number": 1, "answer": "3"}])
    assert questions[0]["correctAnswer"] == "C" and questions[0]["type"] == "single"


def test_an_unheaded_paper_is_sectioned_by_subject_only_in_clean_blocks():
    def paper(subjects):
        return [dict(q(i + 1, i // 3 + 1), subject=s) for i, s in enumerate(subjects)]

    blocks = paper(["Physics"] * 5 + ["Chemistry"] + ["Physics"] + ["Chemistry"] * 5 + ["Mathematics"] * 4)
    assert pe.subject_sections(blocks)
    assert [x["section_name"] for x in blocks] == ["Physics"] * 7 + ["Chemistry"] * 5 + ["Mathematics"] * 4
    mixed = paper(["History", "Geography", "History", "Polity", "Geography", "History"])
    assert not pe.subject_sections(mixed) and not any(x.get("section_name") for x in mixed)
    headed = paper(["Physics"] * 4 + ["Chemistry"] * 4)
    headed[0]["section_name"] = "Part A"
    assert not pe.subject_sections(headed)


def test_a_re_read_question_goes_back_to_its_place():
    questions = [q(36, 6, section="Chem"), q(39, 7, section="Chem")]
    pe.carry_sections(questions)
    found = q(37, 6, section="Chem")
    found["_section"] = pe.section_key("Chem")
    pe.insert_in_order(questions, found)
    assert [x["qno"] for x in questions] == ["36", "37", "39"]


# ── The whole paper, with a fake Gemini ───────────────────────────────────────

PAPER = {  # page -> printed numbers that start there
    1: ["1", "2", "3"], 2: ["4", "5", "6"], 3: ["7", "8"],
    4: ["9", "10", "11"], 5: ["12", "13", "14"], 6: ["15", "16"],
}


class FakeGemini:
    """Answers like stream_gemini_and_parse. Pages 4-6 are busy once; Q13 is listed but skipped once."""

    def __init__(self):
        self.calls = []
        self.busy_left = 1
        self.skip_left = 1

    async def __call__(self, parts, embedded, progress_callback=None, question_callback=None, *, model=None, **settings):
        a, b = next(m for p in parts if isinstance(p, str) for m in [re.search(r"=== YOUR PAGES: (\d+)(?: to (\d+))?", p)] if m).groups()
        own = list(range(int(a), int(b or a) + 1))
        note = next((p for p in parts if isinstance(p, str) and p.startswith("RE-READ")), "")
        self.calls.append((own, model, bool(note)))
        if own[0] == 4 and self.busy_left:
            self.busy_left -= 1
            from google.genai import errors
            raise errors.ClientError(429, {"error": {"code": 429, "message": "Resource exhausted", "status": "RESOURCE_EXHAUSTED"}})

        wanted = re.findall(r"\d+", note.split("questions", 1)[1].split(".", 1)[0]) if "missed questions" in note else None
        index, questions = [], []
        for page in own:
            numbers = PAPER[page]
            index.append({"page": page, "question_numbers": numbers})
            for n in numbers:
                if wanted is not None and n not in wanted:
                    continue
                if n == "13" and self.skip_left:
                    self.skip_left -= 1
                    continue
                section = "Physics - Section A" if n == "1" else ("Section B" if n == "9" else None)
                item = {"qno": n, "page": page, "section": section, "type": "single",
                        "question": MATCH if n in ("2", "5") else f"Question {n}", "options": dict(OPTS)}
                questions.append(item)
                if question_callback:
                    await question_callback({"type": "question", "question": item})
        raw = json.dumps({"page_index": index, "title": "Mock Paper" if 1 in own else None, "questions": questions,
                          "answer_key": [{"qno": "4", "answer": "(2)"}] if 6 in own else []})
        out = [dict(x, section_name=x.get("section")) for x in questions]
        return {"title": "Mock Paper" if 1 in own else "", "questions": out,
                "_meta": {"finish_reason": "STOP", "raw": raw, "usage": {"input": 100, "output": 50, "thinking": 0}}}


def _pages(n):
    return [pe.Page(i, b"jpeg", "") for i in range(1, n + 1)]


def _run(monkeypatch, fake):
    monkeypatch.setattr(pe, "stream_gemini_and_parse", fake)

    async def no_wait(attempt):
        return None

    monkeypatch.setattr(pe, "wait_before_retry", no_wait)
    return asyncio.run(pe.extract_questions(_pages(6), [], {}))


def test_every_question_comes_back_in_order_after_a_429_and_a_skipped_question(monkeypatch):
    fake = FakeGemini()
    result = _run(monkeypatch, fake)
    numbers = [x["qno"] for x in result["questions"]]
    assert numbers == [str(n) for n in range(1, 17)]
    assert [x["id"] for x in result["questions"]] == list(range(1, 17))
    check = result["extraction_check"]
    assert check["missing"] == [] and check["repaired"] == 1 and check["unreadable_pages"] == []
    # Same wording ("Match List") stayed two questions; Q13 came from a re-read of page 5 only.
    assert sum(x["question"] == MATCH for x in result["questions"]) == 2
    assert (([5], pe.REPAIR_MODEL, True)) in fake.calls
    assert result["title"] == "Mock Paper"
    sections = [x["section_name"] for x in result["questions"]]
    assert sections[:8] == ["Physics - Section A"] * 8 and sections[8:] == ["Physics - Section B"] * 8
    assert next(x for x in result["questions"] if x["qno"] == "4")["correctAnswer"] == "B"


def test_a_question_that_cannot_be_read_becomes_a_card_in_its_place(monkeypatch):
    fake = FakeGemini()
    fake.skip_left = 99  # Q13 is never written out, not even on the re-read
    result = _run(monkeypatch, fake)
    numbers = [x["qno"] for x in result["questions"]]
    assert numbers == [str(n) for n in range(1, 17)]
    card = result["questions"][12]
    assert card.get("unreadable") and "Question 13 could not be read" in card["question"] and card["correctAnswer"] is None
    assert result["extraction_check"]["missing"] == ["13"]
