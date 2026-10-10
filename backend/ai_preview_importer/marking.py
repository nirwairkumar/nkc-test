"""
Marks per question for an AI-imported paper — decided once, in one place.

Order of authority, per field (marks and negative marks are decided separately):

1. The teacher. If they typed a value in "AI Settings & Constraints", every question
   gets exactly that, whatever the model said.
2. The paper. The model is asked to read the paper's own marking rules ("+4 for
   correct, −1 for wrong", "[2 marks]", "no negative marking") and put them on each
   question, or null when the paper doesn't say. A long paper is read in several
   batches and only the batch holding the cover page sees those rules, so a question
   the model left undecided borrows the scheme found elsewhere in its section, then
   elsewhere in the paper.
3. The default: +1 and no negative. Used only when nothing anywhere states a scheme.

Why this exists: the prompts used to show `"marks": 4, "negativeMarks": 1` in their
example JSON and the parser defaulted to the same, so the model copied the example and
every imported paper — a Class 5 GK quiz included — became a JEE paper whose teacher
then scored minus eighteen on their own trial run.
"""

from collections import Counter
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

DEFAULT_MARKS = 1
DEFAULT_NEGATIVE = 0

Mark = Union[int, float, str]


def parse_mark(value: Any, *, allow_zero: bool) -> Optional[Mark]:
    """
    A usable mark, or None. Accepts 4, 2.5, "2.5", "+4", "-1" (read as a penalty of 1)
    and fractions like "1/3", which the platform scores exactly. Negative marks are
    stored as positive penalties, so "-1" and "1" mean the same thing here.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = abs(float(value))
        text = None
    else:
        text = str(value).strip().lstrip("+-").strip()
        if not text:
            return None
        try:
            if "/" in text:
                top, bottom = text.split("/", 1)
                num = float(top) / float(bottom)
            else:
                num = float(text)
                text = None
        except (ValueError, ZeroDivisionError):
            return None
    if num != num or num > 100:  # NaN, or a page number mistaken for a mark
        return None
    if num == 0 and not allow_zero:
        return None
    if text:  # keep "1/3" as written: 0.33 would lose a mark over three wrong answers
        return text
    return int(num) if float(num).is_integer() else round(num, 2)


def _questions(result: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    """Every question dict in the result. Sections hold copies, so both lists are walked."""
    for q in result.get("questions") or []:
        if isinstance(q, dict):
            yield q
    for sec in result.get("sections") or []:
        if isinstance(sec, dict):
            for q in sec.get("questions") or []:
                if isinstance(q, dict):
                    yield q


def _most_common(values: List[Mark]) -> Optional[Mark]:
    return Counter(values).most_common(1)[0][0] if values else None


def _resolve_field(
    result: Dict[str, Any], key: str, teacher: Optional[Mark], default: Mark, allow_zero: bool
) -> str:
    """Settle one field on every question. Returns where the value came from."""
    questions = list(_questions(result))

    if teacher is not None:
        for q in questions:
            q[key] = teacher
        return "teacher"

    # What the model read off the paper, per question.
    for q in questions:
        q[key] = parse_mark(q.get(key), allow_zero=allow_zero)
    found = [q[key] for q in questions if q[key] is not None]
    if not found:
        for q in questions:
            q[key] = default
        return "default"

    # Undecided questions borrow from their own section first, then from the paper.
    paper_value = _most_common(found)
    for sec in result.get("sections") or []:
        sec_qs = [q for q in sec.get("questions") or [] if isinstance(q, dict)]
        sec_value = _most_common([q[key] for q in sec_qs if q[key] is not None])
        for q in sec_qs:
            if q[key] is None:
                q[key] = sec_value if sec_value is not None else paper_value
    for q in questions:
        if q[key] is None:
            q[key] = paper_value
    return "paper"


def resolve_marking(
    result: Dict[str, Any],
    marks_per_question: Any = None,
    negative_marks: Any = None,
) -> Dict[str, Any]:
    """
    Settle marks and negative marks on every question of a parsed paper, in place.
    Also sets each section's marks_per_question / negative_marks (sectioned tests score
    from those) and adds result["marking"], a summary the review screen shows the teacher.
    """
    teacher_marks = parse_mark(marks_per_question, allow_zero=False)
    teacher_negative = parse_mark(negative_marks, allow_zero=True)

    marks_source = _resolve_field(result, "marks", teacher_marks, DEFAULT_MARKS, allow_zero=False)
    negative_source = _resolve_field(result, "negativeMarks", teacher_negative, DEFAULT_NEGATIVE, allow_zero=True)

    for sec in result.get("sections") or []:
        if not isinstance(sec, dict):
            continue
        sec_qs = [q for q in sec.get("questions") or [] if isinstance(q, dict)]
        if sec_qs:
            sec["marks_per_question"] = _most_common([q["marks"] for q in sec_qs])
            sec["negative_marks"] = _most_common([q["negativeMarks"] for q in sec_qs])

    questions = list(_questions(result))
    marks_set = {str(q["marks"]) for q in questions}
    negative_set = {str(q["negativeMarks"]) for q in questions}
    result["marking"] = {
        "marks": questions[0]["marks"] if len(marks_set) == 1 and questions else None,
        "negativeMarks": questions[0]["negativeMarks"] if len(negative_set) == 1 and questions else None,
        "marks_source": marks_source,
        "negative_source": negative_source,
        "varies": len(marks_set) > 1 or len(negative_set) > 1,
    }
    return result


def marking_prompt(marks_per_question: Any = None, negative_marks: Any = None) -> str:
    """The marking block appended to the extract/generate prompt."""
    teacher_marks = parse_mark(marks_per_question, allow_zero=False)
    teacher_negative = parse_mark(negative_marks, allow_zero=True)

    if teacher_marks is not None and teacher_negative is not None:
        return (
            "--------------------------------------------------\n"
            "MARKING SCHEME (FIXED BY THE TEACHER):\n"
            f'Set "marks": {_json_mark(teacher_marks)} and "negativeMarks": {_json_mark(teacher_negative)} on EVERY question, '
            "whatever marking the document itself states."
        )

    fixed: List[str] = []
    if teacher_marks is not None:
        fixed.append(f'"marks" is fixed by the teacher: set "marks": {_json_mark(teacher_marks)} on EVERY question.')
    if teacher_negative is not None:
        fixed.append(f'"negativeMarks" is fixed by the teacher: set "negativeMarks": {_json_mark(teacher_negative)} on EVERY question.')
    read = []
    if teacher_marks is None:
        read.append('"marks"')
    if teacher_negative is None:
        read.append('"negativeMarks"')

    return (
        "--------------------------------------------------\n"
        "MARKING SCHEME (READ IT FROM THE DOCUMENT):\n"
        + "".join(f"- {line}\n" for line in fixed)
        + f"- Read {' and '.join(read)} from the document's own marking rules: the cover page, the general "
        "instructions and each section's header. Typical wording: \"Each question carries 4 marks\", "
        "\"+4 for correct, -1 for incorrect\", \"1 mark will be deducted for each wrong answer\", "
        "\"There is no negative marking\", \"1/3 mark deducted\", or a mark printed beside one question such as [2].\n"
        "- Write the value on EVERY question. \"negativeMarks\" is a POSITIVE number: the marks taken away for a wrong "
        "answer (write 1, not -1), and 0 when the document says there is no negative marking.\n"
        "- If sections use different schemes (e.g. MCQs +4/-1, numericals +4/0), give each section's questions its own scheme. "
        "A mark printed beside an individual question overrides the general rule for that question.\n"
        "- If the document does not state it, set that field to null. Do NOT guess, and do NOT copy numbers from the "
        "JSON example above."
    )


def _json_mark(value: Mark) -> str:
    return f'"{value}"' if isinstance(value, str) else str(value)
