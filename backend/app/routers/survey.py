"""
Survey 1.0 (app.testoza.com/survey/v1): why educators who made a test didn't send it to
their students, or didn't send more. Each person picks ONE main reason, then answers one
follow-up whose options are the fixes we would build, so every reply points at a fix.

No account or browser string is stored, even for a signed-in sender. Name, email and phone
are optional (a small block on the last screen) for people who want a reply.

Admins read the results in admin → Support → Survey 1.0, where `fix` and `exists` below
turn the counts into "what to fix first". The page's copy of the questions (keys, labels
and routing) is frontend/src/lib/surveyV1.ts: keep the two in step. A survey is frozen
once sent; change the questions by adding "v2", not by editing "v1".

SQL: supabase/migrations/20261028120000_survey_responses.sql.
"""

import logging
import re
import threading
from collections import Counter
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.core.auth import verify_is_admin
from app.core.database import get_db
from app.services.support_mail import ADMIN_ORIGIN, APP_ORIGIN, _admin_targets
from app.utils.rate_limiter import check_support_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter()

END = None  # the survey is over after this answer
TEXT_MAX = 2000
ROWS_MAX = 1000
_UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
_PHONE_RE = re.compile(r"^\+?[\d\s()-]{7,20}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Longest kept text per kind of free answer.
_MAX_LEN = {"name": 120, "email": 200, "phone": 20}


def _opt(key: str, label: str, fix: str, next_id: Any = "", exists: bool = False, noop: bool = False) -> Dict[str, Any]:
    """
    One answer. `next_id` "" = the question's own next; END = the survey stops here.
    `exists`: the fix is mostly showing something TestoZa already has. `noop`: nothing to build.
    """
    out: Dict[str, Any] = {"key": key, "label": label, "fix": fix, "exists": exists, "noop": noop}
    if next_id != "":
        out["next"] = next_id
    return out


_TAB_SWITCH_BROKEN = "Tab-switch report. Yours is broken: every submission saves 0 switches. Fix it before promoting it."

QUESTIONS_V1: List[Dict[str, Any]] = [
    {
        "id": "status", "kind": "single", "required": True, "short": "What happened",
        "title": "What happened with the test you made?",
        "options": [
            _opt("not_sent", "I haven't sent it to my students yet", "Goes to the main reason.", "reason_not_sent"),
            _opt("sent_some", "I sent it to some students", "Goes to what stopped more.", "reason_sent"),
            _opt("whole_class", "My whole class wrote it", "Goes to what stopped more.", "reason_sent"),
            # Straight to the last screen, so a mis-tap isn't sent at once and a student can say what they wanted.
            _opt("own_practice", "I made it for my own practice (I'm a student)",
                 "Not your customer. Count separately: it shows who you attract.", "anything"),
            _opt("looking", "I was just looking around",
                 "Not your customer. Count separately: it shows who you attract.", "anything"),
        ],
    },
    {
        "id": "reason_not_sent", "kind": "single", "required": True, "short": "Main reason (not sent)",
        "title": "What is the ONE main reason you haven't sent it?",
        "options": [
            _opt("not_due", "My class wasn't writing a test yet", "Timing. See \"Test day\".", "timing"),
            _opt("paper", "My students write on paper, or don't have phones", "Paper class. See \"Phones at home\".", "paper_phones"),
            _opt("unclear", "I wasn't sure how it works for students", "Unclear. See \"Unsure about\".", "unclear"),
            _opt("trust", "I didn't trust it for a real exam", "Trust. See \"Worried about\".", "trust"),
            _opt("making", "Making or fixing the test took too long", "Making. See \"Took the most time\".", "making"),
            _opt("permission", "I need permission from my owner or school", "Permission. See \"Owner needs\".", "permission"),
            _opt("broke", "Something didn't work when I tried it", "Bug. See \"What went wrong\".", "broke"),
            _opt("else", "Something else", "Read their words in \"Anything else\".", "anything"),
        ],
    },
    {
        "id": "reason_sent", "kind": "single", "required": True, "short": "What stopped more",
        "title": "What stopped you giving it to more students, or giving another test?",
        "options": [
            _opt("nothing", "Nothing, I'm giving more tests", "Working. Nothing to fix here.", "anything", noop=True),
            _opt("no_test_due", "No new test was due yet", "Occasion problem, the same as timing: reminders and scheduling.", "anything"),
            _opt("phones", "Some students don't have phones or internet", "Paper class. See \"Phones at home\".", "paper_phones"),
            _opt("broke", "Something went wrong during the exam", "Bug. See \"What went wrong\".", "broke"),
            _opt("cheating", "I worried about cheating, or saw it happen", "Trust. See \"Worried about\".", "trust"),
            _opt("results", "The results didn't show what I needed", "Results. See \"Missing in results\".", "results"),
            _opt("making", "Making each test takes too long", "Making. See \"Took the most time\".", "making"),
            _opt("permission", "My owner or school didn't approve", "Permission. See \"Owner needs\".", "permission"),
            _opt("else", "Something else", "Read their words in \"Anything else\".", "anything"),
        ],
    },
    {
        "id": "timing", "kind": "single", "required": True, "short": "Test day", "next": "anything",
        "title": "When your class's test day came, what happened?",
        "options": [
            _opt("not_yet", "The day hasn't come yet", "Nothing to fix yet.", noop=True),
            _opt("forgot", "I forgot I had made it on TestoZa",
                 "Ask \"When does your class write it?\" when they save, plus a WhatsApp/Calendar reminder. "
                 "Scheduling exists today but is buried in Settings.", exists=True),
            _opt("lost", "I couldn't find my test again",
                 "Navigation: My Tests, Exams, All Submissions and History all look like \"my tests\"."),
            _opt("paper", "I gave it on paper instead", "Make printing the paper obvious (PDF export exists).", exists=True),
            _opt("other_app", "I used Google Forms or another app", "A competitor gap. Read which app and why.", "timing_app"),
        ],
    },
    {
        "id": "timing_app", "kind": "text", "required": False, "short": "Other app", "next": "anything",
        "title": "Which app did you use, and what did it do better?",
    },
    {
        "id": "paper_phones", "kind": "single", "required": True, "short": "Phones at home", "next": "paper_time",
        "title": "How many of your students could write a test on a phone at home in the evening?",
        "options": [
            _opt("all_most", "All or most",
                 "Phones aren't the blocker; habit or school rules are. Pitch \"tonight's home test, marked by morning\": "
                 "73–83% of Indian class submissions already arrive 4 pm–midnight."),
            _opt("half", "About half", "Phone test plus a printed copy of the same paper for the rest."),
            _opt("few", "Few or none", "Paper mode is the product for them: print paper + answer key now, validate photo-OMR marking."),
        ],
    },
    {
        "id": "paper_time", "kind": "single", "required": True, "short": "Paper test takes longest", "next": "anything",
        "title": "In a paper test, what takes you the most time?",
        "options": [
            _opt("making", "Making the paper", "AI already does this. Show \"Print paper\" right after the AI makes it.", exists=True),
            _opt("checking", "Checking the copies", "Photo/OMR checking, the big bet."),
            _opt("marks", "Writing marks and telling parents",
                 "Register-style results by roll number, plus a result message for each parent."),
        ],
    },
    {
        "id": "unclear", "kind": "single", "required": True, "short": "Unsure about", "next": "anything",
        "title": "What were you unsure about?",
        "options": [
            _opt("link", "Where to find the link to send", "Put the send entry right where saving lands."),
            _opt("signup", "Whether students need to sign up",
                 "Say \"No sign-up for students\" on the go-live screen, not only in the WhatsApp message.", exists=True),
            _opt("student_view", "What my students would see", "\"Preview as a student\" that doesn't count as a result."),
            _opt("go_live", "What the \"go live\" screen meant",
                 "Rewrite the go-live dialog in teacher words (no \"Secure Slug\", \"12c\" or amber warning)."),
            _opt("stop_change", "Whether I could stop or change it after sending",
                 "One line: \"You can stop or edit it any time\".", exists=True),
        ],
    },
    {
        "id": "trust", "kind": "single", "required": True, "short": "Worried about", "next": "anything",
        "title": "What worried you most?",
        "options": [
            _opt("searching", "Students searching answers on Google or other apps", _TAB_SWITCH_BROKEN),
            _opt("sharing", "Students sharing answers with each other",
                 "Shuffle exists in Settings: turn it on by default and say so.", exists=True),
            _opt("impersonation", "Someone else writing it for a student",
                 "Join code and candidate inputs exist: show them at go-live.", exists=True),
            _opt("site_down", "The site stopping or slowing during the exam",
                 "Show the teacher \"answers save automatically\" and offer a practice run."),
            _opt("marks_wrong", "Marks or the answer key being wrong", "An answer-key check screen before going live."),
        ],
    },
    {
        "id": "making", "kind": "single", "required": True, "short": "Took the most time", "next": "anything",
        "title": "What took the most time?",
        "options": [
            _opt("ai_wrong", "Fixing questions the AI read wrong", "AI quality. See \"AI got wrong\".", "ai_issue"),
            _opt("typing", "Typing questions myself", "Push photo/PDF import harder.", exists=True),
            _opt("settings_marks", "Setting marks, time or sections", "Defaults, starting with the 180-minute AI default bug."),
            _opt("find_setting", "Finding the setting I wanted", "Settings layout."),
        ],
    },
    {
        "id": "ai_issue", "kind": "single", "required": False, "short": "AI got wrong", "next": "anything",
        "title": "When the AI got it wrong, what was it mostly?",
        "options": [
            _opt("formulas", "Formulas", "LaTeX handling."),
            _opt("diagrams", "Diagrams or pictures", "Figure crops."),
            _opt("options", "Options missing or mixed up", "Option parsing."),
            _opt("answer_key", "Wrong answer key", "Answer detection."),
            _opt("language", "Hindi or other language text", "Language reading."),
        ],
    },
    {
        "id": "permission", "kind": "single", "required": True, "short": "Owner needs", "next": "anything",
        "title": "What would your owner or school need to see to say yes?",
        "options": [
            _opt("cost", "What it costs", "A clear pricing page (everything is unlocked today)."),
            _opt("trial", "A trial with one class first", "A \"first class trial\" offer."),
            _opt("report", "A report they can show parents", "A parent-ready results report."),
            _opt("others_use", "That other schools use it", "Stories from your repeat conductors."),
            _opt("data_safe", "That student data is safe", "A privacy page."),
        ],
    },
    {
        "id": "broke", "kind": "multi", "required": True, "short": "What went wrong", "next": "broke_detail",
        "title": "What went wrong?",
        "options": [
            _opt("link", "The link didn't open", "Bug: reproduce it."),
            _opt("stuck_start", "Stuck before the test started", "Bug: reproduce it."),
            _opt("timer", "Timer was wrong", "Bug: reproduce it."),
            _opt("submit", "Couldn't submit", "Bug: reproduce it."),
            _opt("marks", "Marks were wrong", "Bug: reproduce it."),
            _opt("media", "Formulas, diagrams or pictures didn't show", "Bug: reproduce it."),
            _opt("phone_hard", "Hard to use on a phone", "Bug: reproduce it."),
            _opt("results_missing", "Couldn't find the results", "Bug: reproduce it."),
        ],
    },
    {
        "id": "broke_detail", "kind": "text", "required": False, "short": "What exactly happened", "next": "anything",
        "title": "What exactly happened?",
    },
    {
        "id": "results", "kind": "single", "required": True, "short": "Missing in results", "next": "anything",
        "title": "What did you need that wasn't there?",
        "options": [
            _opt("register", "Marks by roll number, like my register", "Register view."),
            _opt("rank", "A rank list", "Rank exists but is off by default. Make it visible.", exists=True),
            _opt("parents", "Each parent getting their child's result", "Build parent results."),
            _opt("question_analysis", "Which questions the class got wrong", "Make question analysis prominent.", exists=True),
            _opt("tab_switch", "Who switched apps", _TAB_SWITCH_BROKEN),
            _opt("excel", "Excel or printout", "Excel exists. Make it visible.", exists=True),
        ],
    },
    {
        "id": "anything", "kind": "text", "required": False, "short": "Anything else", "next": "name",
        "title": "Anything else? Tell us what happened.",
    },
    # "Want us to get back to you?": three small optional boxes on the last screen.
    {"id": "name", "kind": "name", "required": False, "short": "Name", "next": "email", "title": "Name"},
    {"id": "email", "kind": "email", "required": False, "short": "Email", "next": "whatsapp", "title": "Email"},
    {"id": "whatsapp", "kind": "phone", "required": False, "short": "Phone", "next": END, "title": "Phone / WhatsApp"},
]

SURVEYS: Dict[str, Dict[str, Any]] = {
    "v1": {"title": "Survey 1.0", "path": "/survey/v1", "questions": QUESTIONS_V1},
}


def _survey(key: str) -> Dict[str, Any]:
    survey = SURVEYS.get(key)
    if not survey:
        raise HTTPException(status_code=404, detail="No such survey.")
    return survey


def _by_id(questions: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {q["id"]: q for q in questions}


def _next(q: Dict[str, Any], value: Any) -> Any:
    """Where the survey goes after this answer (same rule as nextQuestion in surveyV1.ts)."""
    if q["kind"] == "single" and isinstance(value, str):
        for o in q["options"]:
            if o["key"] == value and "next" in o:
                return o["next"]
    return q.get("next", END)


def clean_answers(questions: List[Dict[str, Any]], raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Walk the survey the way the page does and keep only the answers on that walk, so
    someone who went back and changed their path doesn't leave answers from the old one.
    Raises 400 for a missing required answer or an answer that isn't one of the options.
    """
    qs = _by_id(questions)
    out: Dict[str, Any] = {}
    qid: Any = questions[0]["id"]
    seen = set()
    while qid is not END and qid not in seen:
        seen.add(qid)
        q = qs[qid]
        value = raw.get(qid)
        keys = {o["key"] for o in q.get("options", [])}
        if q["kind"] == "single":
            if value in (None, ""):
                value = None
            elif not isinstance(value, str) or value not in keys:
                raise HTTPException(status_code=400, detail="One of the answers isn't on the list. Please pick again.")
        elif q["kind"] == "multi":
            picked = value if isinstance(value, list) else []
            if any(not isinstance(v, str) or v not in keys for v in picked):
                raise HTTPException(status_code=400, detail="One of the answers isn't on the list. Please pick again.")
            # Keep the order the question lists them in.
            value = [o["key"] for o in q["options"] if o["key"] in picked] or None
        else:
            text = value.strip() if isinstance(value, str) else ""
            if q["kind"] == "phone" and text and not _PHONE_RE.match(text):
                raise HTTPException(status_code=400, detail="That phone number doesn't look right. Check it, or leave it empty.")
            if q["kind"] == "email" and text and not _EMAIL_RE.match(text):
                raise HTTPException(status_code=400, detail="That email doesn't look right. Check it, or leave it empty.")
            value = text[:_MAX_LEN.get(q["kind"], TEXT_MAX)] or None
        if value is None and q.get("required"):
            raise HTTPException(status_code=400, detail="Please answer every question first.")
        if value is not None:
            out[qid] = value
        qid = _next(q, value)
    return out


class SurveyAnswer(BaseModel):
    # Made by the page, so a retried send (Cloud Run cold start) is saved once.
    id: Optional[str] = None
    answers: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None


def _clean_context(ctx: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Only what helps read the answer: the kind of device and where the link was opened from."""
    ctx = ctx or {}
    out: Dict[str, Any] = {}
    if ctx.get("device") in ("phone", "tablet", "computer"):
        out["device"] = ctx["device"]
    ref = ctx.get("ref")
    if isinstance(ref, str) and re.match(r"^[\w.-]{1,40}$", ref):
        out["ref"] = ref
    return out


def _label(q: Dict[str, Any], key: Any) -> str:
    return next((o["label"] for o in q.get("options", []) if o["key"] == key), str(key or ""))


def _tell_team(db: Client, survey_key: str, survey: Dict[str, Any], row: Dict[str, Any]) -> None:
    """One in-app notification per admin, with the answer's path in a line."""
    try:
        targets = _admin_targets(db)
        if not targets["ids"]:
            return
        qs = _by_id(survey["questions"])
        answers = row.get("answers") or {}
        bits = [_label(qs[qid], answers[qid]) for qid in ("status", "reason_not_sent", "reason_sent") if qid in answers]
        follow = next((qid for qid in answers if qid not in ("status", "reason_not_sent", "reason_sent")
                       and qs[qid]["kind"] == "single"), None)
        if follow:
            bits.append(_label(qs[follow], answers[follow]))
        who = (answers.get("name") or "").strip()
        db.table("notifications").insert([
            {
                "user_id": aid,
                "title": f"New {survey['title']} answer",
                "message": (f"{who} · " if who else "") + " → ".join(bits)[:300],
                "link": f"{ADMIN_ORIGIN}/admin?tab=support&section=survey",
                "sender_name": survey["title"],
            } for aid in targets["ids"]
        ]).execute()
    except Exception as err:
        logger.warning("survey %s: admin notification failed: %s", survey_key, err)


def tell_team_in_background(db: Client, survey_key: str, survey: Dict[str, Any], row: Dict[str, Any]) -> None:
    threading.Thread(target=_tell_team, args=(db, survey_key, survey, row), daemon=True, name="survey").start()


@router.post("/{survey_key}", dependencies=[Depends(check_support_rate_limit)])
def send_survey_answer(survey_key: str, payload: SurveyAnswer, db: Client = Depends(get_db)):
    survey = _survey(survey_key)
    answers = clean_answers(survey["questions"], payload.answers or {})
    record: Dict[str, Any] = {
        "survey": survey_key,
        "answers": answers,
        "status": answers.get("status"),
        "reason": answers.get("reason_not_sent") or answers.get("reason_sent"),
        "whatsapp": answers.get("whatsapp"),
        "context": _clean_context(payload.context),
    }
    if payload.id and _UUID_RE.match(payload.id):
        record["id"] = payload.id.lower()
    try:
        if "id" in record:
            again = db.table("survey_responses").select("id").eq("id", record["id"]).limit(1).execute()
            if again.data:
                return {"success": True, "id": record["id"]}
        res = db.table("survey_responses").insert(record).execute()
    except Exception as err:
        logger.error("survey answer not saved (run 20261028120000_survey_responses.sql?): %s", err)
        raise HTTPException(status_code=503, detail="We couldn't send your answers. Please try again.")
    saved = {**record, **((res.data or [{}])[0])}
    tell_team_in_background(db, survey_key, survey, saved)
    return {"success": True, "id": saved.get("id")}


@router.get("/admin/{survey_key}")
def admin_survey_results(survey_key: str, request: Request, db: Client = Depends(get_db)):
    """Every answer (newest first) with the counts per question; admin works out what to fix."""
    verify_is_admin(request, db)
    survey = _survey(survey_key)
    try:
        res = (db.table("survey_responses").select("id, created_at, status, reason, answers, whatsapp, context")
               .eq("survey", survey_key).order("created_at", desc=True).limit(ROWS_MAX).execute())
    except Exception as err:
        logger.error("survey_responses unavailable (run 20261028120000_survey_responses.sql): %s", err)
        raise HTTPException(status_code=503, detail="Run supabase/migrations/20261028120000_survey_responses.sql first.")
    rows = res.data or []

    qs = _by_id(survey["questions"])
    counts: Dict[str, Counter] = {qid: Counter() for qid in qs}
    answered: Counter = Counter()
    for r in rows:
        for qid, value in (r.get("answers") or {}).items():
            q = qs.get(qid)
            if not q:
                continue
            answered[qid] += 1
            keys = {o["key"] for o in q.get("options", [])}
            picked = value if isinstance(value, list) else [value]
            counts[qid].update(v for v in picked if isinstance(v, str) and v in keys)

    return {
        "survey": survey_key,
        "title": survey["title"],
        "link": f"{APP_ORIGIN}{survey['path']}",
        "questions": survey["questions"],
        "total": len(rows),
        "capped": len(rows) >= ROWS_MAX,
        "answered": dict(answered),
        "counts": {qid: dict(c) for qid, c in counts.items()},
        "rows": rows,
    }
