"""
Referrals (app/routers/referrals.py): invite codes, unique link opens, the claim rules
(new account, not yourself, not a candidate's guest login, one referrer ever) and the
admin views. Run from backend/:
python -m pytest tests/test_referrals.py -q
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.routers import referrals
from app.services import referral_mail
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase

ASHA = "asha-token"
RAVI = "ravi-token"
NEHA = "neha-token"
ADMIN = "admin-token"


def _progress(db, params):
    """Python twin of public.referral_progress (seeded example tests don't count)."""
    ids = params["p_user_ids"]
    tests = [t for t in db.tables.get("tests", [])
             if t.get("created_by") in ids and not (t.get("settings") or {}).get("is_user_example")]
    out = []
    for uid in ids:
        own = {t["id"] for t in tests if t["created_by"] == uid}
        subs = [ut for ut in db.tables.get("user_tests", []) if ut["test_id"] in own and ut["user_id"] != uid]
        out.append({
            "user_id": uid, "tests_made": len(own), "candidates": len({s["user_id"] for s in subs}),
            "last_result_at": max((s["created_at"] for s in subs), default=None),
        })
    return out


def _counts(db, params):
    """Python twin of public.referral_counts."""
    visits = db.tables.get("referral_visits", [])
    joins = db.tables.get("referrals", [])
    keys = {v["referrer_id"] for v in visits} | {r["referrer_id"] for r in joins}
    if params.get("p_referrer_ids") is not None:
        keys &= set(params["p_referrer_ids"])
    rows = []
    for k in keys:
        mine_v = [v for v in visits if v["referrer_id"] == k]
        mine_j = [r for r in joins if r["referrer_id"] == k]
        rows.append({
            "referrer_id": k,
            "visits": len(mine_v), "last_visit_at": max((v["created_at"] for v in mine_v), default=None),
            "joined": len(mine_j), "last_joined_at": max((r["created_at"] for r in mine_j), default=None),
        })
    return rows


@pytest.fixture()
def env(monkeypatch):
    db = FakeSupabase()
    asha = db.add_user(ASHA, email="asha@coaching.in")
    ravi = db.add_user(RAVI, email="ravi@school.in")
    neha = db.add_user(NEHA, email="neha@gmail.com")
    admin = db.add_user(ADMIN, email="owner@testoza.com")
    names = {asha: "Dr. Asha Verma", ravi: "Ravi Kumar", neha: "Neha Singh", admin: "Owner"}
    for p in db.tables["profiles"]:
        p["full_name"] = names[p["id"]]
        p["designation"] = "Teacher"
    # Asha has been on TestoZa for months; Ravi and Neha signed up today.
    db.auth_users[asha]["created_at"] = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    db.tables.update({"admins": [{"email": "owner@testoza.com"}], "notifications": [], "tests": [], "user_tests": []})
    db.rpcs.update({"referral_progress": _progress, "referral_counts": _counts})

    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    rate_limiter.referral_lookup_per_ip.clients.clear()
    rate_limiter.write_per_user.clients.clear()
    monkeypatch.setattr(auth_core, "_admin_cache", {})
    monkeypatch.setattr(referral_mail, "on_referral_claimed_in_background", referral_mail._tell_referrer)
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "client": TestClient(app), "asha": asha, "ravi": ravi, "neha": neha, "admin": admin}
    app.dependency_overrides.clear()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _asha_code(env) -> str:
    res = env["client"].get("/api/referrals/me", headers=_auth(ASHA))
    assert res.status_code == 200, res.text
    return res.json()["code"]


def test_codes_read_like_names_and_never_change(env):
    code = _asha_code(env)
    assert code.startswith("ASHA") and len(code) == 8  # "Dr." is skipped
    assert _asha_code(env) == code
    assert len(env["db"].tables["referral_codes"]) == 1

    assert referrals.clean_code(" asha-7k2p ") == "ASHA7K2P"
    assert referrals.clean_code("x") is None
    hindi = referrals.new_code("आशा वर्मा")
    assert len(hindi) == 6 and referrals.CODE_RE.match(hindi)


def test_opening_the_link_counts_each_browser_once(env):
    code = _asha_code(env)
    c = env["client"]
    first = c.post(f"/api/referrals/code/{code.lower()}/open", json={"visitor_id": "browser-one-1234"})
    assert first.status_code == 200
    assert first.json()["name"] == "Dr. Asha Verma" and "user_id" not in first.json()
    c.post(f"/api/referrals/code/{code}/open", json={"visitor_id": "browser-one-1234"})
    c.post(f"/api/referrals/code/{code}/open", json={"visitor_id": "browser-two-5678"})
    # Asha looking at her own link is not a visit.
    c.post(f"/api/referrals/code/{code}/open", json={"visitor_id": "asha-laptop-9999"}, headers=_auth(ASHA))

    assert len(env["db"].tables["referral_visits"]) == 2
    assert c.get("/api/referrals/me", headers=_auth(ASHA)).json()["stats"]["opened"] == 2
    assert c.get("/api/referrals/code/NOPE2345").status_code == 404


def test_a_new_account_is_credited_and_the_referrer_is_told(env):
    code = _asha_code(env)
    res = env["client"].post("/api/referrals/claim", json={"code": code}, headers=_auth(RAVI))
    assert res.json() == {"status": "claimed", "referrer": {"name": "Dr. Asha Verma"}}

    row = env["db"].tables["referrals"][0]
    assert row["referrer_id"] == env["asha"] and row["referred_id"] == env["ravi"] and row["code"] == code
    note = env["db"].tables["notifications"][0]
    assert note["user_id"] == env["asha"] and "Ravi Kumar" in note["message"]
    assert note["link"] == "/settings?tab=referrals"

    me = env["client"].get("/api/referrals/me", headers=_auth(ASHA)).json()
    assert me["stats"]["joined"] == 1
    person = me["people"][0]
    assert person["name"] == "Ravi Kumar" and person["stage"] == "signed_up"
    assert "email" not in person  # the referrer never sees their email

    again = env["client"].post("/api/referrals/claim", json={"code": code}, headers=_auth(RAVI))
    assert again.json()["status"] == "already_referred"
    assert len(env["db"].tables["referrals"]) == 1


def test_claims_that_are_refused(env):
    code = _asha_code(env)
    c = env["client"]
    assert c.post("/api/referrals/claim", json={"code": code}, headers=_auth(ASHA)).json()["status"] == "own_code"
    assert c.post("/api/referrals/claim", json={"code": "ZZZZ9999"}, headers=_auth(RAVI)).json()["status"] == "invalid_code"
    assert c.post("/api/referrals/claim", json={"code": "!!"}, headers=_auth(RAVI)).json()["status"] == "invalid_code"

    # An account older than a week was not brought by a link opened today.
    env["db"].auth_users[env["neha"]]["created_at"] = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
    assert c.post("/api/referrals/claim", json={"code": code}, headers=_auth(NEHA)).json()["status"] == "not_new"

    # A candidate's hidden guest login never counts.
    env["db"].auth_users[env["ravi"]]["email"] = "candidate_abc@guest.testoza.com"
    assert c.post("/api/referrals/claim", json={"code": code}, headers=_auth(RAVI)).json()["status"] == "not_eligible"

    assert env["db"].tables.get("referrals", []) == []
    assert c.post("/api/referrals/claim", json={"code": code}).status_code in (401, 403)


def test_two_new_accounts_cannot_bring_each_other(env):
    c = env["client"]
    ravi_code = c.get("/api/referrals/me", headers=_auth(RAVI)).json()["code"]
    neha_code = c.get("/api/referrals/me", headers=_auth(NEHA)).json()["code"]
    assert c.post("/api/referrals/claim", json={"code": ravi_code}, headers=_auth(NEHA)).json()["status"] == "claimed"
    assert c.post("/api/referrals/claim", json={"code": neha_code}, headers=_auth(RAVI)).json()["status"] == "not_eligible"


def test_progress_skips_the_seeded_example_and_the_creators_own_attempt(env):
    code = _asha_code(env)
    c = env["client"]
    c.post("/api/referrals/claim", json={"code": code}, headers=_auth(RAVI))
    c.post("/api/referrals/claim", json={"code": code}, headers=_auth(NEHA))
    db = env["db"]
    db.tables["tests"] += [
        {"id": "example", "created_by": env["ravi"], "settings": {"is_user_example": True}},
        {"id": "ravi-1", "created_by": env["ravi"], "settings": {}},
        {"id": "neha-1", "created_by": env["neha"], "settings": {}},
    ]
    db.tables["user_tests"] += [
        {"id": "a1", "test_id": "ravi-1", "user_id": env["ravi"], "created_at": "2026-10-26T10:00:00+00:00"},
        {"id": "a2", "test_id": "neha-1", "user_id": "candidate-1", "created_at": "2026-10-26T11:00:00+00:00"},
        {"id": "a3", "test_id": "neha-1", "user_id": "candidate-2", "created_at": "2026-10-26T11:05:00+00:00"},
    ]

    me = c.get("/api/referrals/me", headers=_auth(ASHA)).json()
    stages = {p["name"]: (p["stage"], p["tests_made"], p["candidates"]) for p in me["people"]}
    assert stages["Ravi Kumar"] == ("made_test", 1, 0)
    assert stages["Neha Singh"] == ("getting_results", 1, 2)
    assert me["stats"] == {"opened": 0, "joined": 2, "made_test": 2, "getting_results": 1}


def test_admin_sees_who_brought_whom(env):
    code = _asha_code(env)
    c = env["client"]
    c.post(f"/api/referrals/code/{code}/open", json={"visitor_id": "browser-one-1234"})
    c.post("/api/referrals/claim", json={"code": code}, headers=_auth(RAVI))

    assert c.get("/api/referrals/admin/overview", headers=_auth(ASHA)).status_code == 403
    overview = c.get("/api/referrals/admin/overview", headers=_auth(ADMIN)).json()
    assert overview["totals"] == {"codes": 1, "referrers": 1, "visits": 1, "joined": 1, "made_test": 0, "getting_results": 0}
    top = overview["referrers"][0]
    assert top["user"]["email"] == "asha@coaching.in" and top["code"] == code and top["joined"] == 1

    joined = c.get("/api/referrals/admin/joined", params={"referrer": env["asha"]}, headers=_auth(ADMIN)).json()
    assert joined["total"] == 1
    assert joined["rows"][0]["user"]["full_name"] == "Ravi Kumar"
    assert joined["rows"][0]["referrer"]["full_name"] == "Dr. Asha Verma"
    assert joined["rows"][0]["stage"] == "signed_up"


def test_without_the_sql_the_routes_say_so(env):
    env["db"].rpcs.clear()

    def broken(*_a, **_k):
        raise Exception('relation "public.referral_codes" does not exist')

    env["db"].table = broken
    res = env["client"].get("/api/referrals/me", headers=_auth(ASHA))
    assert res.status_code == 503
