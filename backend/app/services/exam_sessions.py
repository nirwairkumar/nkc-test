"""
Exam sessions — the rules, kept free of database calls so they can be unit-tested.

An exam session is one sitting of a question paper: its own 6-digit join code, time
window, check-in rule and result sheet. Routers: app/routers/exam_sessions.py (teacher),
app/routers/join.py (student), app/routers/batches.py (student lists and PINs).

Clock (all server time, UTC):

    lobby opens        exam starts            late entry closes            closes_at
    opens_at - 30 min  opens_at (auto)        start + late_entry_minutes   (hard end)
                       or Start button (manual)

A student's own deadline is the earlier of
    their start + paper duration + extra minutes, and
    closes_at + extra minutes,
so late joiners get the full duration but nobody writes after the sitting closes.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

LOBBY_OPENS_BEFORE = timedelta(minutes=30)
# Submissions this long after a deadline are still accepted (flagged late): a phone that
# was offline at the deadline must not lose the student's work.
SUBMIT_GRACE = timedelta(minutes=15)
# A participant whose exam screen checked in within this window counts as online.
ONLINE_WINDOW = timedelta(seconds=75)

PIN_ITERATIONS = 40_000


# ── Time ────────────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_ts(value: Any) -> Optional[datetime]:
    """Parse a Supabase/ISO timestamp into an aware UTC datetime."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip().replace("Z", "+00:00")
    # Postgres can return 5 fractional digits, which fromisoformat (py<3.11) rejects.
    match = re.match(r"^(.*T\d{2}:\d{2}:\d{2})(\.\d+)?(.*)$", text)
    if match:
        frac = (match.group(2) or "")[:7].ljust(7, "0") if match.group(2) else ""
        text = f"{match.group(1)}{frac}{match.group(3)}"
    dt = datetime.fromisoformat(text)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.astimezone(timezone.utc).isoformat() if dt else None


# ── Names and roll numbers ─────────────────────────────────────────────────

def clean_name(value: Any) -> str:
    """Collapse whitespace; keep the student's own capitalisation."""
    return re.sub(r"\s+", " ", str(value or "")).strip()[:120]


def name_key(value: Any) -> str:
    return clean_name(value).lower()


def clean_roll(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:40]


def roll_key(value: Any) -> str:
    """'23 A-017' and '23a017' are the same roll number."""
    return re.sub(r"[^0-9a-z]", "", str(value or "").lower())


def clean_phone(value: Any) -> Optional[str]:
    digits = re.sub(r"[^0-9+]", "", str(value or ""))
    return digits[:20] or None


def identity_key_for(mode: str, name: str, roll: str) -> str:
    if mode in ("roll", "roll_pin"):
        return f"roll:{roll_key(roll)}"
    return f"name:{name_key(name)}"


# ── Join codes ──────────────────────────────────────────────────────────────

def _boring_code(code: str) -> bool:
    digits = [int(c) for c in code]
    steps = {digits[i + 1] - digits[i] for i in range(len(digits) - 1)}
    # 111111, 123456, 654321, 135791…: easy to guess or mistype
    return len(set(code)) <= 2 or len(steps) == 1


def generate_join_code() -> str:
    while True:
        code = f"{secrets.randbelow(1_000_000):06d}"
        if not _boring_code(code):
            return code


# ── PINs ────────────────────────────────────────────────────────────────────

def _pepper() -> bytes:
    explicit = os.getenv("EXAM_PIN_PEPPER")
    if explicit:
        return explicit.encode()
    # Fall back to a value derived from the service key, which only the backend holds.
    service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or "testoza-dev-pepper"
    return hashlib.sha256(f"testoza-exam-pin:{service_key}".encode()).digest()


def generate_pin() -> str:
    while True:
        pin = f"{secrets.randbelow(10_000):04d}"
        if not _boring_code(pin) and pin not in {"1212", "6969", "2580", "0852"}:
            return pin


def hash_pin(pin: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode() + _pepper(), salt, PIN_ITERATIONS)
    return "pbkdf2$%d$%s$%s" % (
        PIN_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode().rstrip("="),
        base64.urlsafe_b64encode(digest).decode().rstrip("="),
    )


def _b64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def verify_pin(pin: Any, stored: Optional[str]) -> bool:
    if not stored or not isinstance(pin, str) or not re.fullmatch(r"\d{4}", pin):
        return False
    try:
        _, iterations, salt, digest = stored.split("$")
        expected = _b64(digest)
        actual = hashlib.pbkdf2_hmac("sha256", pin.encode() + _pepper(), _b64(salt), int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


# ── Device tokens ───────────────────────────────────────────────────────────

def new_device_token() -> Tuple[str, str]:
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── The session clock ───────────────────────────────────────────────────────

def effective_start(session: Dict[str, Any]) -> Optional[datetime]:
    """When the exam actually began (or will begin, for auto start)."""
    if session.get("start_mode") == "manual":
        return parse_ts(session.get("started_at"))
    return parse_ts(session.get("started_at")) or parse_ts(session.get("opens_at"))


def session_phase(session: Dict[str, Any], now: Optional[datetime] = None) -> str:
    """'scheduled' | 'lobby' | 'live' | 'ended'."""
    now = now or now_utc()
    if session.get("ended_at"):
        return "ended"
    closes_at = parse_ts(session.get("closes_at"))
    if closes_at and now >= closes_at:
        return "ended"
    opens_at = parse_ts(session.get("opens_at"))
    start = effective_start(session)
    if start and now >= start:
        return "live"
    # Manual sittings stay in the lobby after opens_at until the teacher presses Start.
    if opens_at and now >= opens_at - LOBBY_OPENS_BEFORE:
        return "lobby"
    return "scheduled"


def late_entry_until(session: Dict[str, Any]) -> Optional[datetime]:
    start = effective_start(session)
    if not start:
        return None
    return start + timedelta(minutes=int(session.get("late_entry_minutes") or 0))


def ended_at(session: Dict[str, Any]) -> Optional[datetime]:
    explicit = parse_ts(session.get("ended_at"))
    closes_at = parse_ts(session.get("closes_at"))
    if explicit and closes_at:
        return min(explicit, closes_at)
    return explicit or closes_at


def join_block_reason(session: Dict[str, Any], now: Optional[datetime] = None) -> Optional[str]:
    """Why a NEW student cannot join right now, or None if they can."""
    now = now or now_utc()
    phase = session_phase(session, now)
    if phase == "ended":
        return "ended"
    if phase == "scheduled":
        return "not_open"
    if phase == "live":
        until = late_entry_until(session)
        if until and now > until:
            return "late"
    return None


def participant_deadline(
    session: Dict[str, Any],
    participant: Dict[str, Any],
    duration_minutes: Optional[float],
) -> Optional[datetime]:
    extra = timedelta(minutes=int(participant.get("extra_minutes") or 0))
    closes_at = parse_ts(session.get("closes_at"))
    hard_end = (closes_at + extra) if closes_at else None
    if session.get("ended_at"):
        ended = parse_ts(session.get("ended_at"))
        hard_end = min(hard_end, ended) if hard_end and ended else (hard_end or ended)
    started = parse_ts(participant.get("started_at"))
    if started and duration_minutes:
        own_end = started + timedelta(minutes=float(duration_minutes)) + extra
        return min(own_end, hard_end) if hard_end else own_end
    return hard_end


def may_submit(
    session: Dict[str, Any],
    participant: Dict[str, Any],
    duration_minutes: Optional[float],
    now: Optional[datetime] = None,
) -> Tuple[bool, int]:
    """(allowed, seconds late). Late within SUBMIT_GRACE is allowed and reported."""
    now = now or now_utc()
    deadline = participant_deadline(session, participant, duration_minutes)
    forced = parse_ts(participant.get("force_submit_at"))
    if forced and (deadline is None or forced < deadline):
        deadline = forced
    if deadline is None:
        return True, 0
    late = int(max(0.0, (now - deadline).total_seconds()))
    return now <= deadline + SUBMIT_GRACE, late


def results_released(session: Dict[str, Any], now: Optional[datetime] = None) -> bool:
    now = now or now_utc()
    if session.get("results_released_at"):
        return True
    mode = session.get("results_release") or "on_end"
    if mode == "immediate":
        return True
    if mode == "on_end":
        return session_phase(session, now) == "ended"
    return False


def results_release_at(session: Dict[str, Any]) -> Optional[str]:
    """When results will appear, for the student's waiting screen (None = teacher decides)."""
    if (session.get("results_release") or "on_end") == "on_end":
        return iso(ended_at(session))
    return None


def is_online(participant: Dict[str, Any], now: Optional[datetime] = None) -> bool:
    now = now or now_utc()
    seen = parse_ts(participant.get("last_seen_at"))
    return bool(seen and now - seen <= ONLINE_WINDOW)


# ── Ranking ─────────────────────────────────────────────────────────────────

def rank_results(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sort best first and add `rank`. Same order as the Results panel: score, then fewer
    wrong, then fewer skipped, then less time. Students tied on all four share a rank.
    """
    def key(row: Dict[str, Any]):
        return (
            -(row.get("score") or 0),
            row.get("wrong") or 0,
            row.get("unattempted") or 0,
            row.get("time_taken_seconds") if row.get("time_taken_seconds") is not None else 10**9,
        )

    ordered = sorted(rows, key=key)
    rank = 0
    previous = None
    for index, row in enumerate(ordered):
        current = key(row)[:3]
        if current != previous:
            rank = index + 1
            previous = current
        row["rank"] = rank
    return ordered


def summarise_scores(rows: List[Dict[str, Any]], max_marks: float) -> Dict[str, Any]:
    scores = sorted(float(r.get("score") or 0) for r in rows)
    if not scores:
        return {"count": 0, "average": None, "highest": None, "lowest": None, "median": None, "max_marks": max_marks}
    mid = len(scores) // 2
    median = scores[mid] if len(scores) % 2 else (scores[mid - 1] + scores[mid]) / 2
    return {
        "count": len(scores),
        "average": round(sum(scores) / len(scores), 2),
        "highest": scores[-1],
        "lowest": scores[0],
        "median": round(median, 2),
        "max_marks": max_marks,
    }


def startform_for(participant: Dict[str, Any], batch_name: Optional[str]) -> Dict[str, str]:
    """The start-form shape every existing results screen already reads."""
    form = {"Name": participant.get("display_name") or ""}
    if participant.get("roll_no"):
        form["Roll Number"] = participant["roll_no"]
    if batch_name:
        form["Batch"] = batch_name
    return form
