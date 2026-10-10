"""
GET /api/analytics/v2/exam-ops — the Live Activity / exam operations report.

Two questions this answers that nothing else did:
  1. Operations: what is live right now, and is anybody actually sitting it?
  2. Business: how many real exams were conducted today / yesterday / last week,
     by which educators, for how many candidates — and who is coming back.

Definitions (kept deliberately strict, because a founder makes decisions on these):
  • A "sitting" (one conducted exam) = one test that received at least one
    submission on one IST calendar day. A test run on three days is three
    sittings. This is the only unit the data supports honestly: link-based
    conduct exams write nothing when a candidate *starts*, only when they
    submit (see test_registrations, which exists for signed-in self-practice
    only), so starts, drop-off and "in the exam right now" cannot be measured
    for them. Join-code sittings (exam_sessions / session_participants) do
    track live presence, and those numbers are reported separately.
  • A "candidate" = one distinct account that submitted in that sitting.
    Exam takers without an account get a hidden candidate_*@guest.testoza.com
    login, the same convention analytics v2 uses.
  • "Team" = accounts listed in public.admins. The default audience is
    "customers", which leaves the team out, so the headline numbers are not
    inflated by our own test runs.

Aggregation runs in Python over a period-bounded fetch, not in SQL, so this
ships without a migration. It is linear in submissions for the period (plus
the educators' own history); move it into a Postgres function if attempts
ever pass ~20k per period.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.auth import get_optional_user_id
from app.core.database import supabase

from .insights import IST, resolve_period

router = APIRouter()
logger = logging.getLogger(__name__)

GUEST_DOMAIN = "@guest.testoza.com"
AUDIENCES = ("customers", "everyone", "team")
PAGE = 1000
# A join-code participant counts as "in the exam now" if seen this recently.
LIVE_SEEN_SECONDS = 300


# ── small helpers ──────────────────────────────────────────────────────────────
def _parse(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except ValueError:
        return None


def _ist_day(ts: Optional[str]) -> Optional[str]:
    dt = _parse(ts)
    return dt.astimezone(IST).date().isoformat() if dt else None


def _midnight_ist(now: datetime) -> datetime:
    local = now.astimezone(IST)
    return datetime(local.year, local.month, local.day, tzinfo=IST)


def _fetch_all(table: str, select: str, build) -> List[Dict[str, Any]]:
    """Every matching row, paged past PostgREST's 1,000-row ceiling."""
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        try:
            res = build(supabase.table(table).select(select)).range(offset, offset + PAGE - 1).execute()
        except Exception as exc:
            logger.error("exam-ops %s query failed: %s", table, str(exc)[:400])
            raise HTTPException(status_code=502, detail="Exam activity query failed")
        batch = res.data or []
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        offset += PAGE


def _chunks(items: List[str], size: int = 150) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]


def _attempts(frm: str, to: str) -> List[Dict[str, Any]]:
    cols = "id, test_id, user_id, score, created_at, questions_attempted, violation_count, session_id, participant_id, metadata"
    return _fetch_all("user_tests", cols,
                      lambda q: q.gte("created_at", frm).lt("created_at", to).order("created_at"))


def _tests_by_id(ids: List[str]) -> Dict[str, Dict[str, Any]]:
    cols = "id, title, custom_id, created_by, duration, total_questions, total_max_marks, slug, settings, created_at"
    out: Dict[str, Dict[str, Any]] = {}
    for chunk in _chunks(ids):
        for row in _fetch_all("tests", cols, lambda q, c=chunk: q.in_("id", c)):
            out[row["id"]] = row
    return out


def _profiles_by_id(ids: List[str]) -> Dict[str, Dict[str, Any]]:
    cols = "id, full_name, email, avatar_url, designation, is_verified_creator, is_premium, created_at"
    out: Dict[str, Dict[str, Any]] = {}
    for chunk in _chunks(ids):
        for row in _fetch_all("profiles", cols, lambda q, c=chunk: q.in_("id", c)):
            out[row["id"]] = row
    return out


def _team_ids() -> set:
    """Accounts in public.admins, by profile id."""
    try:
        emails = [
            (a.get("email") or "").strip().lower()
            for a in (supabase.table("admins").select("email").execute().data or [])
        ]
        emails = [e for e in emails if e]
        if not emails:
            return set()
        ids = set()
        for chunk in _chunks(emails):
            res = supabase.table("profiles").select("id, email").in_("email", chunk).execute()
            ids.update(p["id"] for p in (res.data or []))
        return ids
    except Exception as exc:
        logger.warning("exam-ops could not resolve team accounts: %s", str(exc)[:200])
        return set()


def _float(v: Any) -> Optional[float]:
    try:
        return None if v is None else float(v)
    except (TypeError, ValueError):
        return None


def _stats(meta: Dict[str, Any]) -> Dict[str, Any]:
    s = meta.get("stats")
    return s if isinstance(s, dict) else {}


def _candidate_name(meta: Dict[str, Any]) -> Optional[str]:
    """The name the candidate typed into the test's start form."""
    form = meta.get("startFormData")
    if not isinstance(form, dict):
        return None
    for key, value in form.items():
        if "name" in str(key).lower() and str(value or "").strip():
            return str(value).strip()[:80]
    return None


def _form_field(meta: Dict[str, Any], *needles: str) -> Optional[str]:
    form = meta.get("startFormData")
    if not isinstance(form, dict):
        return None
    for key, value in form.items():
        low = str(key).lower()
        if any(n in low for n in needles) and str(value or "").strip():
            return str(value).strip()[:80]
    return None


def _attempted(row: Dict[str, Any], meta: Dict[str, Any]) -> Optional[int]:
    if row.get("questions_attempted") is not None:
        try:
            return int(row["questions_attempted"])
        except (TypeError, ValueError):
            pass
    st = _stats(meta)
    total, un = st.get("totalQuestions"), st.get("unattemptedCount")
    if isinstance(total, int) and isinstance(un, int):
        return max(0, total - un)
    return None


def _score_pct(row: Dict[str, Any], test: Optional[Dict[str, Any]], meta: Dict[str, Any]) -> Optional[float]:
    score = _float(row.get("score"))
    if score is None:
        return None
    max_marks = _float((test or {}).get("total_max_marks"))
    if not max_marks:
        # Fall back to one mark per question, which is what an unconfigured test scores.
        total = _stats(meta).get("totalQuestions")
        max_marks = float(total) if isinstance(total, int) and total > 0 else None
    if not max_marks or max_marks <= 0:
        return None
    return max(0.0, min(100.0, (score / max_marks) * 100.0))


def _bucket_key(dt: datetime, bucket: str) -> str:
    d = dt.astimezone(IST)
    if bucket == "hour":
        return d.strftime("%Y-%m-%dT%H:00")
    if bucket == "week":
        monday = d.date() - timedelta(days=d.weekday())
        return f"{monday.isoformat()}T00:00"
    if bucket == "month":
        return f"{d.date().replace(day=1).isoformat()}T00:00"
    return f"{d.date().isoformat()}T00:00"


def _bucket_series(frm: datetime, to: datetime, bucket: str) -> List[str]:
    """Every bucket label in the range, so quiet days show as zero instead of vanishing."""
    out: List[str] = []
    cur = frm.astimezone(IST)
    if bucket == "hour":
        cur = cur.replace(minute=0, second=0, microsecond=0)
        step = timedelta(hours=1)
    elif bucket == "week":
        cur = datetime.combine(cur.date() - timedelta(days=cur.weekday()), datetime.min.time(), tzinfo=IST)
        step = timedelta(weeks=1)
    elif bucket == "month":
        cur = datetime.combine(cur.date().replace(day=1), datetime.min.time(), tzinfo=IST)
        step = None
    else:
        cur = datetime.combine(cur.date(), datetime.min.time(), tzinfo=IST)
        step = timedelta(days=1)
    guard = 0
    while cur < to.astimezone(IST) and guard < 800:
        out.append(_bucket_key(cur, bucket))
        if step is None:
            year, month = (cur.year + 1, 1) if cur.month == 12 else (cur.year, cur.month + 1)
            cur = cur.replace(year=year, month=month)
        else:
            cur = cur + step
        guard += 1
    return out or [_bucket_key(frm, bucket)]


# ── the shape of one sitting ───────────────────────────────────────────────────
class _Sitting:
    """`pcts` holds scores of papers with at least one answer — a blank paper is a
    non-attempt, and averaging it in makes every exam look like a failure."""

    __slots__ = ("test_id", "day", "candidates", "submissions", "blanks", "flagged",
                 "pcts", "first_at", "last_at", "sessions", "names")

    def __init__(self, test_id: str, day: str):
        self.test_id, self.day = test_id, day
        self.candidates: set = set()
        self.submissions = 0
        self.blanks = 0
        self.flagged = 0
        self.pcts: List[float] = []
        self.first_at: Optional[datetime] = None
        self.last_at: Optional[datetime] = None
        self.sessions: set = set()
        self.names: set = set()


def _collect(attempts: List[Dict[str, Any]], tests: Dict[str, Dict[str, Any]],
             team: set, audience: str) -> Tuple[Dict[Tuple[str, str], _Sitting], List[Dict[str, Any]]]:
    """Group the period's submissions into sittings, honouring the audience filter."""
    sittings: Dict[Tuple[str, str], _Sitting] = {}
    kept: List[Dict[str, Any]] = []
    for row in attempts:
        test_id = row.get("test_id")
        day = _ist_day(row.get("created_at"))
        if not test_id or not day:
            continue
        test = tests.get(test_id)
        owner = (test or {}).get("created_by")
        is_team = bool(owner and owner in team)
        if audience == "customers" and is_team:
            continue
        if audience == "team" and not is_team:
            continue

        meta = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
        key = (test_id, day)
        s = sittings.get(key)
        if s is None:
            s = sittings[key] = _Sitting(test_id, day)
        if row.get("user_id"):
            s.candidates.add(row["user_id"])
        s.submissions += 1
        attempted = _attempted(row, meta)
        if attempted == 0:
            s.blanks += 1
        try:
            if int(row.get("violation_count") or 0) > 0:
                s.flagged += 1
        except (TypeError, ValueError):
            pass
        pct = _score_pct(row, test, meta)
        if pct is not None and attempted != 0:
            s.pcts.append(pct)
        at = _parse(row.get("created_at"))
        if at:
            s.first_at = at if s.first_at is None or at < s.first_at else s.first_at
            s.last_at = at if s.last_at is None or at > s.last_at else s.last_at
        if row.get("session_id"):
            s.sessions.add(row["session_id"])
        name = _candidate_name(meta)
        if name:
            s.names.add(name)
        kept.append(row)
    return sittings, kept


def _totals(sittings: Dict[Tuple[str, str], _Sitting], tests: Dict[str, Dict[str, Any]],
            team: set) -> Dict[str, Any]:
    pcts: List[float] = []
    candidates: set = set()
    educators: set = set()
    submissions = blanks = flagged = 0
    for s in sittings.values():
        submissions += s.submissions
        blanks += s.blanks
        flagged += s.flagged
        pcts.extend(s.pcts)
        candidates |= s.candidates
        owner = (tests.get(s.test_id) or {}).get("created_by")
        if owner:
            educators.add(owner)
    exams = len(sittings)
    per_educator: Dict[str, int] = defaultdict(int)
    for s in sittings.values():
        owner = (tests.get(s.test_id) or {}).get("created_by")
        if owner:
            per_educator[owner] += 1
    return {
        "exams": exams,
        # A whole class turning up is a different event from one person poking at a link.
        "exams_with_a_class": sum(1 for s in sittings.values() if len(s.candidates) >= 3),
        "exams_mostly_blank": sum(1 for s in sittings.values()
                                  if s.submissions and s.blanks / s.submissions >= 0.5),
        "candidates": len(candidates),
        "submissions": submissions,
        "educators": len(educators),
        "repeat_educators": sum(1 for n in per_educator.values() if n > 1),
        "blank_submissions": blanks,
        "blank_rate": round((blanks / submissions) * 100, 1) if submissions else None,
        "flagged_submissions": flagged,
        "avg_score_pct": round(sum(pcts) / len(pcts), 1) if pcts else None,
        "scored_submissions": len(pcts),
        "avg_candidates_per_exam": round(len(candidates) / exams, 1) if exams else None,
        "team_exams": sum(1 for s in sittings.values()
                          if (tests.get(s.test_id) or {}).get("created_by") in team),
    }


# ── endpoints ──────────────────────────────────────────────────────────────────
@router.get("/exam-ops")
def exam_ops(request: Request, period: str = "7d", audience: str = "customers",
             start: Optional[str] = None, end: Optional[str] = None,
             sittings_limit: int = Query(60, ge=1, le=300)):
    if audience not in AUDIENCES:
        raise HTTPException(status_code=400, detail=f"audience must be one of {', '.join(AUDIENCES)}")
    # Admin-only already (router dependency); this is just "which admin", to mark their own runs.
    viewer = get_optional_user_id(request) or ""
    r = resolve_period(period, start, end)
    now = datetime.now(timezone.utc)

    cur_rows = _attempts(r["from"], r["to"])
    prev_rows = _attempts(r["prev_from"], r["prev_to"])
    # "Right now" must not move when the period filter changes, so it reads today
    # on its own instead of borrowing the period's rows.
    midnight = _midnight_ist(now)
    today_rows = (cur_rows if r["from"] == midnight.isoformat()
                  else _attempts(midnight.isoformat(), now.isoformat()))

    # Tests referenced by either period, plus every live link (for the "right now" panel).
    live_tests_raw = _fetch_all(
        "tests",
        "id, title, custom_id, created_by, duration, total_questions, total_max_marks, slug, settings, created_at",
        lambda q: q.eq("settings->conduct_exam->>enabled", "true"),
    )
    tests: Dict[str, Dict[str, Any]] = {t["id"]: t for t in live_tests_raw}
    missing = {row["test_id"] for row in cur_rows + prev_rows + today_rows if row.get("test_id")} - set(tests)
    tests.update(_tests_by_id(sorted(missing)))

    team = _team_ids()
    cur_sittings, cur_kept = _collect(cur_rows, tests, team, audience)
    prev_sittings, _ = _collect(prev_rows, tests, team, audience)

    totals = _totals(cur_sittings, tests, team)
    previous = _totals(prev_sittings, tests, team)

    # ── who conducted, and their history ──────────────────────────────────────
    owners = sorted({(tests.get(s.test_id) or {}).get("created_by")
                     for s in cur_sittings.values()} - {None})
    profiles = _profiles_by_id(owners)
    first_ever = _first_conducted(owners) if owners else {}

    educators: List[Dict[str, Any]] = []
    for owner in owners:
        mine = [s for s in cur_sittings.values() if (tests.get(s.test_id) or {}).get("created_by") == owner]
        cands: set = set()
        subs = 0
        pcts: List[float] = []
        last: Optional[datetime] = None
        for s in mine:
            cands |= s.candidates
            subs += s.submissions
            pcts.extend(s.pcts)
            if s.last_at and (last is None or s.last_at > last):
                last = s.last_at
        p = profiles.get(owner) or {}
        first = first_ever.get(owner)
        educators.append({
            "id": owner,
            "name": p.get("full_name") or "Unknown",
            "email": p.get("email"),
            "avatar_url": p.get("avatar_url"),
            "designation": p.get("designation"),
            "is_verified_creator": bool(p.get("is_verified_creator")),
            "is_premium": bool(p.get("is_premium")),
            "is_team": owner in team,
            "is_self": owner == viewer,
            "signed_up_at": p.get("created_at"),
            "exams": len(mine),
            "days": len({s.day for s in mine}),
            "candidates": len(cands),
            "submissions": subs,
            "avg_score_pct": round(sum(pcts) / len(pcts), 1) if pcts else None,
            "last_conducted_at": last.isoformat() if last else None,
            "first_conducted_at": first.isoformat() if first else None,
            "is_first_time": bool(first and first >= _parse(r["from"])),
        })
    educators.sort(key=lambda e: (-e["exams"], -e["candidates"]))
    totals["new_educators"] = sum(1 for e in educators if e["is_first_time"])
    previous["new_educators"] = None  # not comparable without a second history pass

    # ── join-code sittings in the period (the only flow with live presence) ───
    sessions, participants = _exam_sessions(r["from"], r["to"], now)

    # ── series, clock and sitting rows ────────────────────────────────────────
    series = _series(cur_sittings, _parse(r["from"]), _parse(r["to"]), r["bucket"])
    hours = [0] * 24
    weekdays = [0] * 7
    for row in cur_kept:
        at = _parse(row.get("created_at"))
        if at:
            local = at.astimezone(IST)
            hours[local.hour] += 1
            weekdays[local.weekday()] += 1

    rows = [_sitting_row(s, tests, profiles, team, viewer, sessions) for s in cur_sittings.values()]
    rows.sort(key=lambda x: (x["last_at"] or ""), reverse=True)

    return {
        "range": r,
        "audience": audience,
        "now": _right_now(live_tests_raw, today_rows, tests, team, audience, participants, now),
        "totals": totals,
        "previous": previous,
        "series": series,
        "hours": hours,
        "weekdays": weekdays,
        "sittings": rows[:sittings_limit],
        "sittings_total": len(rows),
        "educators": educators,
        "live": _live_rows(live_tests_raw, today_rows, profiles, team, viewer, now),
        "code_sittings": sessions,
        "guests": _guest_activity(r["from"], r["to"]),
        "team_configured": len(team),
    }


def _first_conducted(owners: List[str]) -> Dict[str, datetime]:
    """Each educator's first-ever submission, so first-timers can be told apart."""
    test_ids: List[str] = []
    owner_of: Dict[str, str] = {}
    for chunk in _chunks(owners):
        for t in _fetch_all("tests", "id, created_by", lambda q, c=chunk: q.in_("created_by", c)):
            test_ids.append(t["id"])
            owner_of[t["id"]] = t["created_by"]
    out: Dict[str, datetime] = {}
    for chunk in _chunks(test_ids):
        for a in _fetch_all("user_tests", "test_id, created_at",
                            lambda q, c=chunk: q.in_("test_id", c).order("created_at")):
            owner = owner_of.get(a["test_id"])
            at = _parse(a.get("created_at"))
            if owner and at and (owner not in out or at < out[owner]):
                out[owner] = at
    return out


def _series(sittings: Dict[Tuple[str, str], _Sitting], frm: Optional[datetime],
            to: Optional[datetime], bucket: str) -> List[Dict[str, Any]]:
    labels = _bucket_series(frm or datetime.now(timezone.utc), to or datetime.now(timezone.utc), bucket)
    exams: Dict[str, int] = defaultdict(int)
    subs: Dict[str, int] = defaultdict(int)
    cands: Dict[str, set] = defaultdict(set)
    for s in sittings.values():
        at = s.first_at or s.last_at
        if not at:
            continue
        key = _bucket_key(at, bucket)
        exams[key] += 1
        subs[key] += s.submissions
        cands[key] |= s.candidates
    return [{"t": k, "exams": exams.get(k, 0), "submissions": subs.get(k, 0),
             "candidates": len(cands.get(k, set()))} for k in labels]


def _sitting_row(s: _Sitting, tests: Dict[str, Dict[str, Any]], profiles: Dict[str, Dict[str, Any]],
                 team: set, viewer: str, sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
    test = tests.get(s.test_id) or {}
    settings = test.get("settings") or {}
    conduct = settings.get("conduct_exam") or {}
    owner = test.get("created_by")
    p = profiles.get(owner) or {}
    window = None
    if s.first_at and s.last_at:
        window = round((s.last_at - s.first_at).total_seconds() / 60)
    code = next((c["join_code"] for c in sessions if c["test_id"] == s.test_id), None)
    return {
        "key": f"{s.test_id}:{s.day}",
        "test_id": s.test_id,
        "day": s.day,
        "title": test.get("title") or "Deleted test",
        "deleted": not test,
        "custom_id": test.get("custom_id"),
        "slug": conduct.get("conduct_slug") or test.get("slug"),
        "duration": test.get("duration"),
        "total_questions": test.get("total_questions"),
        "educator": None if not owner else {
            "id": owner,
            "name": p.get("full_name") or "Unknown",
            "email": p.get("email"),
            "avatar_url": p.get("avatar_url"),
            "designation": p.get("designation"),
            "is_verified_creator": bool(p.get("is_verified_creator")),
            "is_team": owner in team,
            "is_self": owner == viewer,
        },
        "candidates": len(s.candidates),
        "submissions": s.submissions,
        "blanks": s.blanks,
        "blank_rate": round((s.blanks / s.submissions) * 100, 1) if s.submissions else None,
        "flagged": s.flagged,
        "avg_score_pct": round(sum(s.pcts) / len(s.pcts), 1) if s.pcts else None,
        "first_at": s.first_at.isoformat() if s.first_at else None,
        "last_at": s.last_at.isoformat() if s.last_at else None,
        "window_minutes": window,
        "live": bool(conduct.get("enabled")),
        "join_code": code,
        "via": "code" if s.sessions else "link",
        "sample_names": sorted(s.names)[:3],
    }


def _exam_sessions(frm: str, to: str, now: datetime) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Join-code sittings touching the period, with their participant roll-up.
    The window always runs up to `now` — a sitting opened today must show up in
    "Right now" even when the period filter is pointing at last week.
    """
    lower = datetime.fromisoformat(frm) - timedelta(days=2)
    upper = max(datetime.fromisoformat(to), now)
    try:
        rows = _fetch_all(
            "exam_sessions",
            "id, test_id, owner_id, name, join_code, opens_at, closes_at, started_at, ended_at, created_at, identity_mode, results_release",
            lambda q: q.gte("created_at", lower.isoformat()).lte("created_at", upper.isoformat()),
        )
    except HTTPException:
        return [], []
    if not rows:
        return [], []
    ids = [r["id"] for r in rows]
    parts: List[Dict[str, Any]] = []
    for chunk in _chunks(ids):
        parts.extend(_fetch_all(
            "session_participants",
            "id, session_id, display_name, roll_no, status, joined_at, started_at, last_seen_at, submitted_at, progress, answered, violations",
            lambda q, c=chunk: q.in_("session_id", c),
        ))
    by_session: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for p in parts:
        by_session[p["session_id"]].append(p)
    out = []
    for r in rows:
        mine = by_session.get(r["id"], [])
        active = sum(1 for p in mine
                     if not p.get("submitted_at")
                     and (_parse(p.get("last_seen_at")) or datetime.min.replace(tzinfo=timezone.utc))
                     > now - timedelta(seconds=LIVE_SEEN_SECONDS))
        out.append({
            **{k: r.get(k) for k in ("id", "test_id", "owner_id", "name", "join_code", "opens_at",
                                     "closes_at", "started_at", "ended_at", "created_at", "identity_mode")},
            "joined": len(mine),
            "submitted": sum(1 for p in mine if p.get("submitted_at")),
            "active_now": active,
        })
    return out, parts


def _right_now(live_raw: List[Dict[str, Any]], cur_rows: List[Dict[str, Any]],
               tests: Dict[str, Dict[str, Any]], team: set, audience: str,
               participants: List[Dict[str, Any]], now: datetime) -> Dict[str, Any]:
    def counts(minutes: int) -> int:
        cutoff = now - timedelta(minutes=minutes)
        n = 0
        for row in cur_rows:
            at = _parse(row.get("created_at"))
            if not at or at < cutoff:
                continue
            owner = (tests.get(row.get("test_id")) or {}).get("created_by")
            is_team = bool(owner and owner in team)
            if audience == "customers" and is_team:
                continue
            if audience == "team" and not is_team:
                continue
            n += 1
        return n

    scheduled = examples = 0
    for t in live_raw:
        settings = t.get("settings") or {}
        if settings.get("is_user_example"):
            # Seeded for every new account (tests/read.py); nobody chose to make it live.
            examples += 1
            continue
        sched = settings.get("schedule") or {}
        if sched.get("enabled") and (sched.get("start_time") or sched.get("end_time")):
            scheduled += 1
    active = sum(1 for p in participants
                 if not p.get("submitted_at")
                 and (_parse(p.get("last_seen_at")) or datetime.min.replace(tzinfo=timezone.utc))
                 > now - timedelta(seconds=LIVE_SEEN_SECONDS))
    return {
        "live_links": len(live_raw) - examples,
        "example_links": examples,
        "scheduled_links": scheduled,
        "submissions_15m": counts(15),
        "submissions_60m": counts(60),
        "participants_active": active,
        "generated_at": now.isoformat(),
    }


def _live_rows(live_raw: List[Dict[str, Any]], cur_rows: List[Dict[str, Any]],
               profiles: Dict[str, Dict[str, Any]], team: set, viewer: str,
               now: datetime) -> List[Dict[str, Any]]:
    """Live links, with the pulse that matters: submissions in the last hour and today."""
    owners = sorted({t.get("created_by") for t in live_raw} - {None} - set(profiles))
    enriched = {**profiles, **(_profiles_by_id(owners) if owners else {})}
    today = now.astimezone(IST).date().isoformat()

    by_test: Dict[str, List[datetime]] = defaultdict(list)
    for row in cur_rows:
        at = _parse(row.get("created_at"))
        if at and row.get("test_id"):
            by_test[row["test_id"]].append(at)

    out = []
    for t in live_raw:
        settings = t.get("settings") or {}
        conduct = settings.get("conduct_exam") or {}
        sched = settings.get("schedule") or {}
        stamps = by_test.get(t["id"], [])
        owner = t.get("created_by")
        p = enriched.get(owner) or {}
        out.append({
            "id": t["id"],
            "title": t.get("title") or "Untitled test",
            "custom_id": t.get("custom_id"),
            "slug": conduct.get("conduct_slug") or t.get("slug"),
            "duration": t.get("duration"),
            "total_questions": t.get("total_questions"),
            "settings": settings,
            "is_example": bool(settings.get("is_user_example")),
            "created_at": t.get("created_at"),
            "made_live_at": conduct.get("started_at") or (sched.get("start_time") if sched.get("enabled") else None),
            "is_scheduled": bool(sched.get("enabled") and (sched.get("start_time") or sched.get("end_time"))),
            "start_time": sched.get("start_time") if sched.get("enabled") else None,
            "end_time": sched.get("end_time") if sched.get("enabled") else None,
            "educator": None if not owner else {
                "id": owner,
                "name": p.get("full_name") or "Unknown",
                "email": p.get("email"),
                "avatar_url": p.get("avatar_url"),
                "is_verified_creator": bool(p.get("is_verified_creator")),
                "is_team": owner in team,
                "is_self": owner == viewer,
            },
            "submissions_today": sum(1 for s in stamps if s.astimezone(IST).date().isoformat() == today),
            "submissions_60m": sum(1 for s in stamps if s > now - timedelta(minutes=60)),
            "last_submission_at": max(stamps).isoformat() if stamps else None,
        })
    # Non-examples first, then by the freshest activity.
    out.sort(key=lambda x: (not x["is_example"], x["last_submission_at"] or "", x["made_live_at"] or ""), reverse=True)
    return out


def _guest_activity(frm: str, to: str) -> Dict[str, Any]:
    """Legacy no-account attempts (replaced by candidate logins in April 2026)."""
    try:
        rows = _fetch_all("anon_test_attempts", "id, test_id, status, started_at, submitted_at, completion_pct",
                          lambda q: q.gte("started_at", frm).lt("started_at", to))
    except HTTPException:
        return {"starts": 0, "submissions": 0, "abandoned": 0}
    return {
        "starts": len(rows),
        "submissions": sum(1 for r in rows if r.get("status") == "submitted"),
        "abandoned": sum(1 for r in rows if r.get("status") != "submitted"),
    }


@router.get("/exam-ops/sitting")
def exam_ops_sitting(test_id: UUID, day: str):
    """Every candidate in one sitting: what they typed, scored, attempted and how long they took."""
    tid = str(test_id)
    try:
        start = datetime.fromisoformat(f"{day}T00:00:00").replace(tzinfo=IST)
    except ValueError:
        raise HTTPException(status_code=400, detail="day must be YYYY-MM-DD")
    end = start + timedelta(days=1)

    attempts = _fetch_all(
        "user_tests",
        "id, test_id, user_id, score, created_at, questions_attempted, violation_count, metadata",
        lambda q: q.eq("test_id", tid).gte("created_at", start.isoformat()).lt("created_at", end.isoformat()).order("created_at"),
    )
    test = _tests_by_id([tid]).get(tid)
    user_ids = sorted({a["user_id"] for a in attempts if a.get("user_id")})
    people = _profiles_by_id(user_ids) if user_ids else {}

    rows = []
    for a in attempts:
        meta = a.get("metadata") if isinstance(a.get("metadata"), dict) else {}
        st = _stats(meta)
        person = people.get(a.get("user_id")) or {}
        email = person.get("email") or ""
        started = _parse(meta.get("startedAt"))
        submitted = _parse(a.get("created_at"))
        minutes = round((submitted - started).total_seconds() / 60) if started and submitted and submitted > started else None
        attempted = _attempted(a, meta)
        rows.append({
            "id": a["id"],
            "name": _candidate_name(meta) or person.get("full_name") or "Unnamed candidate",
            "roll": _form_field(meta, "roll", "matric", "reg", "id"),
            "email": None if email.lower().endswith(GUEST_DOMAIN) else email or None,
            "is_candidate_login": email.lower().endswith(GUEST_DOMAIN),
            "score": _float(a.get("score")),
            "max_marks": _float((test or {}).get("total_max_marks")),
            "score_pct": _score_pct(a, test, meta),
            "attempted": attempted,
            "total_questions": st.get("totalQuestions") or (test or {}).get("total_questions"),
            "correct": st.get("correctCount"),
            "wrong": st.get("wrongCount"),
            "violations": a.get("violation_count") or 0,
            "submitted_at": a.get("created_at"),
            "minutes_taken": minutes,
            "is_blank": attempted == 0,
        })
    rows.sort(key=lambda x: (x["score_pct"] is None, -(x["score_pct"] or 0)))
    return {
        "test": None if not test else {
            "id": test["id"], "title": test.get("title"), "custom_id": test.get("custom_id"),
            "duration": test.get("duration"), "total_questions": test.get("total_questions"),
            "total_max_marks": _float(test.get("total_max_marks")),
        },
        "day": day,
        "rows": rows,
    }
