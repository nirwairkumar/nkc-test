"""
Referrals: an educator sends their invite link to another educator
(SQL: supabase/migrations/20261026120000_referrals.sql).

  GET  /referrals/me                 your code (made on first call), opens, sign-ups, who joined
  GET  /referrals/code/{code}        public: whose link this is (link previews, the phone share page)
  POST /referrals/code/{code}/open   public: the invite page was opened — counts one visit per browser
  POST /referrals/claim              signed in: credit the code's owner for this new account
  GET  /referrals/admin/overview     admin: totals and every referrer
  GET  /referrals/admin/joined       admin: who joined through whom, newest first

How far a referred account got uses the admin Users page's stages: signed up → made a
test → getting results (someone else submitted one of their tests).
"""

import logging
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.core.auth import get_optional_user_id, verify_auth_token, verify_is_admin
from app.core.database import get_db
from app.services import referral_mail
from app.services.exam_session_store import is_unique_violation
from app.utils.rate_limiter import check_referral_rate_limit, enforce_limit, write_per_user

logger = logging.getLogger(__name__)

router = APIRouter()

MIGRATION = "supabase/migrations/20261026120000_referrals.sql"
CODE_RE = re.compile(r"^[A-Z0-9]{6,12}$")
VISITOR_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
# No 0/O or 1/I/L: codes get read aloud and typed from a phone screen.
_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
_TITLES = {"DR", "MR", "MRS", "MS", "PROF", "SIR", "SHRI", "SMT", "KUMARI"}
# Only a new account can be credited: someone who joined months ago and later opens a
# friend's link was not brought by it.
CLAIM_WINDOW = timedelta(days=7)
GUEST_DOMAIN = "@guest.testoza.com"
PROFILE_FIELDS = "id, full_name, email, avatar_url, designation, created_at"
STAGES = ("signed_up", "made_test", "getting_results")


# ── Helpers ───────────────────────────────────────────────────────────────────

def clean_code(code: Optional[str]) -> Optional[str]:
    """ASHA-7K2P, asha7k2p → ASHA7K2P; anything else → None."""
    c = re.sub(r"[\s-]", "", code or "").upper()
    return c if CODE_RE.match(c) else None


def _name_part(name: Optional[str]) -> str:
    """The first real word of the name, up to 6 letters: "Dr. Asha Verma" → ASHA."""
    plain = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode().upper()
    for word in re.findall(r"[A-Z]+", plain):
        if len(word) >= 2 and word not in _TITLES:
            return word[:6]
    return ""


def new_code(name: Optional[str]) -> str:
    """ASHA7K2P; a name with no Latin letters (हिंदी) gets 6 random characters."""
    prefix = _name_part(name)
    return prefix + "".join(secrets.choice(_ALPHABET) for _ in range(4 if prefix else 6))


def _missing_tables(err: Exception) -> HTTPException:
    logger.error("referrals unavailable (run %s): %s", MIGRATION, err)
    return HTTPException(status_code=503, detail="Invites aren't switched on yet. Please try again later.")


def _profiles(db: Client, ids: List[str]) -> Dict[str, Dict[str, Any]]:
    ids = [i for i in dict.fromkeys(ids) if i]
    if not ids:
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    for start in range(0, len(ids), 200):
        res = db.table("profiles").select(PROFILE_FIELDS).in_("id", ids[start:start + 200]).execute()
        out.update({p["id"]: p for p in (res.data or [])})
    return out


def _progress(db: Client, ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """tests_made / candidates / last_result_at per account. Empty if the SQL isn't there."""
    ids = [i for i in dict.fromkeys(ids) if i]
    out: Dict[str, Dict[str, Any]] = {}
    for start in range(0, len(ids), 500):
        try:
            rows = db.rpc("referral_progress", {"p_user_ids": ids[start:start + 500]}).execute().data or []
        except Exception as err:
            logger.warning("referral_progress failed: %s", err)
            return out
        out.update({r["user_id"]: r for r in rows})
    return out


def _counts(db: Client, referrer_ids: Optional[List[str]]) -> Dict[str, Dict[str, Any]]:
    rows = db.rpc("referral_counts", {"p_referrer_ids": referrer_ids}).execute().data or []
    return {r["referrer_id"]: r for r in rows}


def stage_of(progress: Optional[Dict[str, Any]]) -> str:
    p = progress or {}
    if int(p.get("candidates") or 0) > 0:
        return "getting_results"
    if int(p.get("tests_made") or 0) > 0:
        return "made_test"
    return "signed_up"


def _display_name(profile: Optional[Dict[str, Any]], fallback: str = "A new member") -> str:
    return ((profile or {}).get("full_name") or "").strip() or fallback


def _code_owner(db: Client, code: str) -> Optional[Dict[str, Any]]:
    res = db.table("referral_codes").select("user_id, code").eq("code", code).limit(1).execute()
    return (res.data or [None])[0]


def _ensure_code(db: Client, user_id: str) -> str:
    """The caller's code, made the first time they ask for it."""
    try:
        res = db.table("referral_codes").select("code").eq("user_id", user_id).limit(1).execute()
    except Exception as err:
        raise _missing_tables(err)
    if res.data:
        return res.data[0]["code"]

    name = _display_name(_profiles(db, [user_id]).get(user_id), "")
    for _ in range(6):
        code = new_code(name)
        try:
            db.table("referral_codes").insert({"user_id": user_id, "code": code}).execute()
            return code
        except Exception as err:
            if not is_unique_violation(err):
                raise _missing_tables(err)
            # Either another request made this user's code just now, or the code is taken.
            again = db.table("referral_codes").select("code").eq("user_id", user_id).limit(1).execute()
            if again.data:
                return again.data[0]["code"]
    raise HTTPException(status_code=503, detail="Couldn't make your invite link. Please try again.")


def _as_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _person(profile: Optional[Dict[str, Any]], with_email: bool) -> Dict[str, Any]:
    p = profile or {}
    out = {
        "id": p.get("id"),
        "full_name": p.get("full_name"),
        "avatar_url": p.get("avatar_url"),
        "designation": p.get("designation"),
        "created_at": p.get("created_at"),
    }
    if with_email:
        out["email"] = p.get("email")
    return out


# ── Your invites ──────────────────────────────────────────────────────────────

@router.get("/me")
def my_referrals(request: Request, db: Client = Depends(get_db)):
    user_id = verify_auth_token(request, db)
    code = _ensure_code(db, user_id)
    try:
        counts = _counts(db, [user_id]).get(user_id) or {}
        rows = (db.table("referrals").select("referred_id, created_at").eq("referrer_id", user_id)
                .order("created_at", desc=True).limit(200).execute().data or [])
    except Exception as err:
        raise _missing_tables(err)

    ids = [r["referred_id"] for r in rows]
    profiles = _profiles(db, ids)
    progress = _progress(db, ids)
    people = []
    for r in rows:
        prof = profiles.get(r["referred_id"]) or {}
        prog = progress.get(r["referred_id"]) or {}
        people.append({
            "id": r["referred_id"],
            # The referrer sees who joined, never their email.
            "name": _display_name(prof),
            "avatar_url": prof.get("avatar_url"),
            "designation": prof.get("designation"),
            "joined_at": r["created_at"],
            "stage": stage_of(prog),
            "tests_made": int(prog.get("tests_made") or 0),
            "candidates": int(prog.get("candidates") or 0),
        })
    stages = [p["stage"] for p in people]
    return {
        "code": code,
        "stats": {
            "opened": int(counts.get("visits") or 0),
            "joined": int(counts.get("joined") or len(people)),
            "made_test": sum(1 for s in stages if s != "signed_up"),
            "getting_results": sum(1 for s in stages if s == "getting_results"),
        },
        "people": people,
    }


# ── The link itself (public) ──────────────────────────────────────────────────

def _public_owner(db: Client, code: str) -> Dict[str, Any]:
    clean = clean_code(code)
    if not clean:
        raise HTTPException(status_code=404, detail="This invite link isn't valid.")
    try:
        owner = _code_owner(db, clean)
    except Exception as err:
        raise _missing_tables(err)
    if not owner:
        raise HTTPException(status_code=404, detail="This invite link isn't valid.")
    prof = _profiles(db, [owner["user_id"]]).get(owner["user_id"]) or {}
    name = _display_name(prof, "A TestoZa educator")
    return {
        "user_id": owner["user_id"],
        "public": {
            "code": owner["code"],
            "name": name,
            "first_name": name.split(" ")[0],
            "avatar_url": prof.get("avatar_url"),
            "designation": prof.get("designation"),
        },
    }


@router.get("/code/{code}", dependencies=[Depends(check_referral_rate_limit)])
def referral_code_info(code: str, db: Client = Depends(get_db)):
    return _public_owner(db, code)["public"]


class OpenPayload(BaseModel):
    visitor_id: Optional[str] = None


@router.post("/code/{code}/open", dependencies=[Depends(check_referral_rate_limit)])
def open_referral_link(code: str, payload: OpenPayload, request: Request, db: Client = Depends(get_db)):
    """The invite page in one request: whose link it is, and one more unique open."""
    owner = _public_owner(db, code)
    visitor = (payload.visitor_id or "").strip()
    viewer = get_optional_user_id(request, db)
    # The referrer checking their own link is not a visit.
    if VISITOR_RE.match(visitor) and viewer != owner["user_id"]:
        try:
            db.table("referral_visits").insert({"referrer_id": owner["user_id"], "visitor_id": visitor}).execute()
        except Exception as err:
            if not is_unique_violation(err):
                logger.warning("referral visit not saved: %s", err)
    return owner["public"]


# ── Claiming ──────────────────────────────────────────────────────────────────

class ClaimPayload(BaseModel):
    code: str


@router.post("/claim")
def claim_referral(payload: ClaimPayload, request: Request, db: Client = Depends(get_db)):
    """
    Right after sign-up, the app sends the code it kept from the invite page. Every
    "no" is a 200 with a status, so the app knows to forget the code and stop asking.
    """
    user_id = verify_auth_token(request, db)
    enforce_limit(write_per_user, user_id, "Too many changes at once. Wait a moment.")
    code = clean_code(payload.code)
    if not code:
        return {"status": "invalid_code"}
    try:
        owner = _code_owner(db, code)
    except Exception as err:
        raise _missing_tables(err)
    if not owner:
        return {"status": "invalid_code"}
    referrer_id = owner["user_id"]
    if referrer_id == user_id:
        return {"status": "own_code"}

    existing = db.table("referrals").select("referrer_id").eq("referred_id", user_id).limit(1).execute()
    if existing.data:
        return {"status": "already_referred"}

    try:
        account = db.auth.admin.get_user_by_id(user_id).user
    except Exception as err:
        logger.warning("referral claim: could not load account %s: %s", user_id, err)
        raise HTTPException(status_code=503, detail="Please try again in a moment.")
    email = (getattr(account, "email", None) or "").lower()
    meta = getattr(account, "user_metadata", None) or {}
    if email.endswith(GUEST_DOMAIN) or meta.get("is_guest_candidate"):
        return {"status": "not_eligible"}
    created = _as_datetime(getattr(account, "created_at", None))
    if not created or datetime.now(timezone.utc) - created > CLAIM_WINDOW:
        return {"status": "not_new"}
    # Two new accounts can't bring each other.
    loop = (db.table("referrals").select("id").eq("referrer_id", user_id).eq("referred_id", referrer_id)
            .limit(1).execute())
    if loop.data:
        return {"status": "not_eligible"}

    try:
        db.table("referrals").insert({"referrer_id": referrer_id, "referred_id": user_id, "code": code}).execute()
    except Exception as err:
        if is_unique_violation(err):
            return {"status": "already_referred"}
        logger.error("referral not saved: %s", err)
        raise HTTPException(status_code=503, detail="Please try again in a moment.")

    profiles = _profiles(db, [user_id, referrer_id])
    referrer = profiles.get(referrer_id) or {"id": referrer_id}
    joined_name = _display_name(profiles.get(user_id), (email.split("@")[0] if email else "") or "A new member")
    try:
        joined_count = int((_counts(db, [referrer_id]).get(referrer_id) or {}).get("joined") or 1)
    except Exception:
        joined_count = 1
    referral_mail.on_referral_claimed_in_background(db, referrer, joined_name, joined_count)
    return {"status": "claimed", "referrer": {"name": _display_name(referrer, "A TestoZa educator")}}


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/overview")
def admin_referral_overview(request: Request, db: Client = Depends(get_db)):
    verify_is_admin(request, db)
    try:
        counts = _counts(db, None)
        links = (db.table("referrals").select("referrer_id, referred_id").order("created_at", desc=True)
                 .limit(5000).execute().data or [])
        codes_made = db.table("referral_codes").select("user_id", count="exact", head=True).execute().count
    except Exception as err:
        raise _missing_tables(err)

    progress = _progress(db, [l["referred_id"] for l in links])
    reached: Dict[str, Dict[str, int]] = {}
    for l in links:
        stage = stage_of(progress.get(l["referred_id"]))
        r = reached.setdefault(l["referrer_id"], {"made_test": 0, "getting_results": 0})
        if stage != "signed_up":
            r["made_test"] += 1
        if stage == "getting_results":
            r["getting_results"] += 1

    ids = list(counts.keys())
    profiles = _profiles(db, ids)
    code_rows = {}
    for start in range(0, len(ids), 200):
        res = db.table("referral_codes").select("user_id, code").in_("user_id", ids[start:start + 200]).execute()
        code_rows.update({c["user_id"]: c["code"] for c in (res.data or [])})

    referrers = []
    for rid, c in counts.items():
        got = reached.get(rid) or {}
        referrers.append({
            "user": _person(profiles.get(rid) or {"id": rid}, with_email=True),
            "code": code_rows.get(rid),
            "visits": int(c.get("visits") or 0),
            "last_visit_at": c.get("last_visit_at"),
            "joined": int(c.get("joined") or 0),
            "last_joined_at": c.get("last_joined_at"),
            "made_test": got.get("made_test", 0),
            "getting_results": got.get("getting_results", 0),
        })
    referrers.sort(key=lambda r: (r["getting_results"], r["joined"], r["visits"],
                                  r["last_joined_at"] or r["last_visit_at"] or ""), reverse=True)

    return {
        "totals": {
            "codes": int(codes_made or 0),
            "referrers": sum(1 for r in referrers if r["joined"] > 0),
            "visits": sum(r["visits"] for r in referrers),
            "joined": sum(r["joined"] for r in referrers),
            "made_test": sum(r["made_test"] for r in referrers),
            "getting_results": sum(r["getting_results"] for r in referrers),
        },
        "referrers": referrers,
    }


@router.get("/admin/joined")
def admin_referral_joined(
    request: Request, limit: int = 30, offset: int = 0, referrer: Optional[str] = None, db: Client = Depends(get_db),
):
    verify_is_admin(request, db)
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    try:
        q = db.table("referrals").select("id, created_at, referrer_id, referred_id, code", count="exact")
        if referrer:
            q = q.eq("referrer_id", referrer)
        res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    except Exception as err:
        raise _missing_tables(err)
    rows = res.data or []

    profiles = _profiles(db, [r["referrer_id"] for r in rows] + [r["referred_id"] for r in rows])
    progress = _progress(db, [r["referred_id"] for r in rows])
    out = []
    for r in rows:
        prog = progress.get(r["referred_id"]) or {}
        out.append({
            "id": r["id"],
            "created_at": r["created_at"],
            "code": r["code"],
            "referrer": _person(profiles.get(r["referrer_id"]) or {"id": r["referrer_id"]}, with_email=True),
            "user": _person(profiles.get(r["referred_id"]) or {"id": r["referred_id"]}, with_email=True),
            "stage": stage_of(prog),
            "tests_made": int(prog.get("tests_made") or 0),
            "candidates": int(prog.get("candidates") or 0),
            "last_result_at": prog.get("last_result_at"),
        })
    return {"rows": out, "total": int(res.count or 0)}
