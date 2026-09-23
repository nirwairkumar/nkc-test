"""
C4 (SECURITY_THREAT_MODEL_AND_PLAN.md) — authoritative server-side scoring.

Until now the browser computed `finalScore` in frontend/src/pages/TestPage.tsx and
POSTed it to /api/attempts/save, which stored `payload.score` verbatim. Anyone could
send {"score": 999999}.

This module is a faithful port of that client algorithm so scores stay identical for
honest submissions while becoming unforgeable. Keep the two in sync: the reference is
the `test.questions.forEach(...)` block in TestPage.tsx.

Marks precedence (same as the client):
    per-question marks/negativeMarks  >  section marks_per_question/negative_marks
                                      >  test-level marks_per_question/negative_marks
                                      >  hard defaults 4 / 1
"""

import math
import re
from typing import Any, Dict, List, Optional, Tuple

DEFAULT_MARKS = 4.0
DEFAULT_NEGATIVE = 1.0


def parse_mark(value: Any, default_val: float = 0.0) -> float:
    """Port of parseMark() in TestPage.tsx — accepts numbers, "1.5" and "1/3"."""
    if isinstance(value, bool):
        return default_val
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(float(value)) else default_val
    if not value:
        return default_val
    try:
        text = str(value).strip()
        if "/" in text:
            parts = text.split("/")
            if len(parts) == 2:
                num = float(parts[0])
                den = float(parts[1])
                if den == 0:
                    return default_val
                return num / den
        parsed = float(text)
        return default_val if not math.isfinite(parsed) else parsed
    except (ValueError, TypeError):
        return default_val


def _js_parse_float(value: Any) -> float:
    """
    Port of JS parseFloat(): reads a leading numeric prefix and ignores the rest
    ("12abc" -> 12.0), returning NaN when there is no numeric prefix.
    """
    if isinstance(value, bool):
        return float("nan")
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return float("nan")
    match = re.match(r"\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?", str(value))
    if not match:
        return float("nan")
    try:
        return float(match.group(0))
    except ValueError:
        return float("nan")


def _is_blank(answer: Any) -> bool:
    """
    Port of the falsy check `if (!userAns)` on the client. JS treats "", 0, null and
    undefined as unattempted; an empty list/dict is truthy in JS but not in Python,
    so those cases are spelled out to keep the two implementations identical.
    """
    if answer is None:
        return True
    if isinstance(answer, str):
        return answer == ""
    if isinstance(answer, bool):
        return not answer
    if isinstance(answer, (int, float)):
        return answer == 0
    return False


def _flatten_questions(test: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    The client scores `test.questions`, which the API builds as the concatenation of
    every section's questions in order. Mirror that, falling back to sections when the
    flat column is empty.
    """
    questions = test.get("questions")
    if isinstance(questions, list) and questions:
        return questions

    flattened: List[Dict[str, Any]] = []
    for section in test.get("sections") or []:
        flattened.extend(section.get("questions") or [])
    return flattened


def _section_bounds(test: Dict[str, Any]) -> List[Tuple[int, int, Dict[str, Any]]]:
    """(start, end_exclusive, section) using the same running count as the client."""
    bounds: List[Tuple[int, int, Dict[str, Any]]] = []
    running = 0
    for section in test.get("sections") or []:
        count = len(section.get("questions") or [])
        bounds.append((running, running + count, section))
        running += count
    return bounds


def _marks_for_question(
    test: Dict[str, Any],
    question: Dict[str, Any],
    index: int,
    bounds: List[Tuple[int, int, Dict[str, Any]]],
    section_mode: bool,
) -> Tuple[float, float]:
    marks = (
        parse_mark(test.get("marks_per_question"), DEFAULT_MARKS)
        if test.get("marks_per_question")
        else DEFAULT_MARKS
    )
    negative = (
        parse_mark(test.get("negative_marks"), DEFAULT_NEGATIVE)
        if test.get("negative_marks") is not None
        else DEFAULT_NEGATIVE
    )

    if section_mode:
        for start, end, section in bounds:
            if start <= index < end:
                marks = parse_mark(section.get("marks_per_question"), DEFAULT_MARKS)
                negative = parse_mark(section.get("negative_marks"), DEFAULT_NEGATIVE)
                break

    if question.get("marks") is not None:
        marks = parse_mark(question.get("marks"), marks)
    if question.get("negativeMarks") is not None:
        negative = parse_mark(question.get("negativeMarks"), negative)

    return marks, negative


def score_question(
    question: Dict[str, Any], answer: Any, marks: float, negative: float
) -> Tuple[float, str]:
    """
    Score one answered question. Returns (delta, outcome) where outcome is one of
    "correct", "partial" or "wrong". Mirrors the per-type branches in TestPage.tsx.
    """
    q_type = question.get("type")
    correct = question.get("correctAnswer")

    if q_type == "numerical":
        num = _js_parse_float(answer)
        if (
            not math.isnan(num)
            and isinstance(correct, dict)
            and num >= parse_mark(correct.get("min"), float("inf"))
            and num <= parse_mark(correct.get("max"), float("-inf"))
        ):
            return marks, "correct"
        return -negative, "wrong"

    if q_type == "multiple":
        correct_list = sorted(
            str(c) for c in (correct if isinstance(correct, list) else [correct])
        )
        user_list = sorted(
            str(a) for a in (answer if isinstance(answer, list) else [answer])
        )

        if any(a not in correct_list for a in user_list):
            return -negative, "wrong"
        if len(user_list) == len(correct_list):
            return marks, "correct"
        if user_list:
            return (len(user_list) / len(correct_list)) * marks, "partial"
        return 0.0, "partial"

    # Single choice (and every other type the client treats as single).
    if answer == correct:
        return marks, "correct"
    return -negative, "wrong"


def _apply_soft_attempt_control(
    test: Dict[str, Any], answers: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Port of the SECTION ATTEMPT CONTROL FILTERING block in TestPage.tsx. Hard mode is
    validated separately by apply_section_attempt_control(); only soft mode filters here.
    """
    if not (test.get("enable_section_mode") and test.get("sections")):
        return dict(answers)

    filtered: Dict[str, Any] = {}
    for section in test.get("sections") or []:
        section_q_ids = [str(q.get("id")) for q in (section.get("questions") or [])]
        section_answers = [
            {"id": q_id, "ans": ans}
            for q_id, ans in answers.items()
            if str(q_id) in section_q_ids
        ]

        control = section.get("attempt_control") or {}
        max_attempts = control.get("max_attempts") or 0

        if control.get("mode") == "soft" and len(section_answers) > max_attempts:
            if control.get("soft_type") == "best_n":
                section_marks = parse_mark(
                    section.get("marks_per_question"), DEFAULT_MARKS
                )
                section_negative = parse_mark(
                    section.get("negative_marks"), DEFAULT_NEGATIVE
                )
                q_by_id = {
                    str(q.get("id")): q for q in (section.get("questions") or [])
                }

                scored = []
                for item in section_answers:
                    question = q_by_id.get(str(item["id"])) or {}
                    delta, _ = score_question(
                        question, item["ans"], section_marks, section_negative
                    )
                    scored.append({**item, "score": delta})

                scored.sort(key=lambda x: x["score"], reverse=True)
                for item in scored[:max_attempts]:
                    filtered[item["id"]] = item["ans"]
            else:  # "first_n" (client default)
                section_answers.sort(
                    key=lambda x: section_q_ids.index(str(x["id"]))
                    if str(x["id"]) in section_q_ids
                    else 9999
                )
                for item in section_answers[:max_attempts]:
                    filtered[item["id"]] = item["ans"]
        else:
            for item in section_answers:
                filtered[item["id"]] = item["ans"]

    return filtered


def score_attempt(
    test: Dict[str, Any], answers: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Compute the authoritative score for a submission.

    Returns {"score", "positiveScore", "negativeScore", "correctCount", "partialCount",
             "wrongCount", "unattemptedCount", "totalQuestions", "maxMarks"}.
    """
    from app.utils.attempt_control import calculate_test_max_marks

    answers = answers or {}
    questions = _flatten_questions(test)
    bounds = _section_bounds(test)
    section_mode = bool(test.get("enable_section_mode") and test.get("sections"))

    final_answers = _apply_soft_attempt_control(test, answers)
    # Answers are keyed by question id; JSON object keys arrive as strings.
    by_str_key = {str(k): v for k, v in final_answers.items()}

    score = 0.0
    positive = 0.0
    negative_total = 0.0
    correct_count = 0
    partial_count = 0
    wrong_count = 0
    unattempted = 0

    for index, question in enumerate(questions):
        user_answer = by_str_key.get(str(question.get("id")))

        if _is_blank(user_answer):
            unattempted += 1
            continue

        marks, negative = _marks_for_question(
            test, question, index, bounds, section_mode
        )
        delta, outcome = score_question(question, user_answer, marks, negative)

        score += delta
        if delta >= 0:
            positive += delta
        else:
            negative_total += -delta

        if outcome == "correct":
            correct_count += 1
        elif outcome == "partial":
            partial_count += 1
        else:
            wrong_count += 1

    if math.isnan(score) or math.isinf(score):
        score = 0.0

    return {
        "score": round(score, 2),
        "positiveScore": round(positive, 2),
        "negativeScore": round(negative_total, 2),
        "correctCount": correct_count,
        "partialCount": partial_count,
        "wrongCount": wrong_count,
        "unattemptedCount": unattempted,
        "totalQuestions": len(questions),
        "maxMarks": calculate_test_max_marks(test).get("total_max_marks", 0),
    }
