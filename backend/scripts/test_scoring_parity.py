import sys, types
# Stub the supabase client chain so scoring.py can be imported without env/network.
for name in ['app.core.database']:
    m = types.ModuleType(name); m.supabase = None; m.get_db = lambda *a, **k: None
    sys.modules[name] = m

from app.services.scoring import score_attempt, parse_mark, _js_parse_float

def check(label, got, want):
    ok = abs(got - want) < 1e-6 if isinstance(want, float) else got == want
    print(("PASS " if ok else "FAIL ") + label + ("  got=%r want=%r" % (got, want) if not ok else "  = %r" % (got,)))
    return ok

results = []

# parse_mark parity with parseMark()
results.append(check("parse_mark('1/3')", round(parse_mark('1/3'), 6), round(1/3, 6)))
results.append(check("parse_mark('2.5')", parse_mark('2.5'), 2.5))
results.append(check("parse_mark('x', 4)", parse_mark('x', 4), 4.0))
results.append(check("parse_mark('1/0', 4)", parse_mark('1/0', 4), 4.0))
results.append(check("js_parse_float('12abc')", _js_parse_float('12abc'), 12.0))

# Flat test: defaults 4 / -1
flat = {"questions": [
    {"id": 1, "type": "single",    "correctAnswer": "A"},
    {"id": 2, "type": "single",    "correctAnswer": "B"},
    {"id": 3, "type": "numerical", "correctAnswer": {"min": 9.5, "max": 10.5}},
    {"id": 4, "type": "multiple",  "correctAnswer": ["A", "B", "C"]},
    {"id": 5, "type": "single",    "correctAnswer": "D"},
]}
r = score_attempt(flat, {"1": "A", "2": "C", "3": "10", "4": ["A", "B"], "5": None})
# q1 correct +4 | q2 wrong -1 | q3 correct +4 | q4 partial 2/3*4=2.6667 | q5 unattempted
results.append(check("flat score", r["score"], round(4 - 1 + 4 + (2/3)*4, 2)))
results.append(check("flat correct", r["correctCount"], 2))
results.append(check("flat partial", r["partialCount"], 1))
results.append(check("flat wrong", r["wrongCount"], 1))
results.append(check("flat unattempted", r["unattemptedCount"], 1))

# multiple with an incorrect option selected -> full negative, not partial
r2 = score_attempt({"questions": [{"id": 1, "type": "multiple", "correctAnswer": ["A", "B"]}]}, {"1": ["A", "Z"]})
results.append(check("multiple w/ wrong option", r2["score"], -1.0))

# Per-question overrides beat defaults
r3 = score_attempt({"questions": [{"id": 1, "type": "single", "correctAnswer": "A", "marks": "5", "negativeMarks": "2"}]}, {"1": "B"})
results.append(check("per-question negative override", r3["score"], -2.0))

# Section mode: section marks apply by running index
sec = {
    "enable_section_mode": True,
    "sections": [
        {"id": "s1", "marks_per_question": 3, "negative_marks": 1,
         "questions": [{"id": 1, "type": "single", "correctAnswer": "A"}]},
        {"id": "s2", "marks_per_question": 5, "negative_marks": 2,
         "questions": [{"id": 2, "type": "single", "correctAnswer": "B"}]},
    ],
}
sec["questions"] = sec["sections"][0]["questions"] + sec["sections"][1]["questions"]
r4 = score_attempt(sec, {"1": "A", "2": "Z"})
results.append(check("section marks (3 - 2)", r4["score"], 1.0))

# Soft attempt control best_n keeps the highest-scoring answer only
soft = {
    "enable_section_mode": True,
    "sections": [{
        "id": "s1", "marks_per_question": 4, "negative_marks": 1,
        "attempt_control": {"enabled": True, "mode": "soft", "soft_type": "best_n", "max_attempts": 1},
        "questions": [
            {"id": 1, "type": "single", "correctAnswer": "A"},
            {"id": 2, "type": "single", "correctAnswer": "B"},
        ],
    }],
}
soft["questions"] = soft["sections"][0]["questions"]
r5 = score_attempt(soft, {"1": "A", "2": "Z"})
results.append(check("soft best_n keeps the +4", r5["score"], 4.0))

# A forged huge score cannot come from answers
results.append(check("empty answers -> 0", score_attempt(flat, {})["score"], 0.0))

print("\n%d/%d passed" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
