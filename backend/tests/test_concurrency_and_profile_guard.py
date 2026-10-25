"""
Two guarantees from the 2026-10-25 speed and security pass.

1. Requests run side by side. The Supabase client is synchronous, so a route handler
   declared `async def` that never awaits holds the event loop for every database round
   trip, and the whole server serves one request at a time. On exam evenings that made
   one API call in ten take over 8 s. Handlers are plain `def` now; FastAPI runs them on
   worker threads.
2. A profile's email can't be set to someone else's. Admin checks read profiles.email,
   so a user who set theirs to an admin's address used to become an admin.

Run from backend/:  python -m pytest tests -q
"""

import ast
import pathlib
import threading
import time
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core import auth as auth_core
from app.core.database import get_db
from app.main import app
from app.routers import attempts as attempts_router
from app.routers import users as users_router
from app.utils import rate_limiter
from tests.fake_supabase import FakeSupabase, Query

APP_DIR = pathlib.Path(__file__).resolve().parents[1] / "app"
ROUTE_ATTRS = {"get", "post", "put", "delete", "patch", "api_route"}
# Awaited directly by another handler, so they must stay coroutines.
AWAITED_BY_OTHER_HANDLERS = {"create_session", "get_sitemap_index"}


def _own_nodes(fn):
    stack = list(fn.body)
    while stack:
        node = stack.pop()
        yield node
        for child in ast.iter_child_nodes(node):
            if not isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
                stack.append(child)


def test_no_async_route_handler_blocks_the_server():
    blocking = []
    for path in APP_DIR.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        for fn in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if not isinstance(fn, ast.AsyncFunctionDef) or fn.name in AWAITED_BY_OTHER_HANDLERS:
                continue
            is_route = any(
                isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in ROUTE_ATTRS
                for d in fn.decorator_list
            )
            awaits = any(isinstance(n, (ast.Await, ast.AsyncFor, ast.AsyncWith)) for n in _own_nodes(fn))
            if is_route and not awaits:
                blocking.append(f"{path.relative_to(APP_DIR)}:{fn.lineno} {fn.name}")
    assert not blocking, "Declare these handlers with plain `def`:\n" + "\n".join(blocking)


# ── 1. concurrency ──────────────────────────────────────────────────────────

ROUND_TRIP = 0.25  # seconds; production is ~0.17 s per database call from Delhi to Tokyo
TEST_ID = str(uuid.uuid4())


class SlowQuery(Query):
    def execute(self):
        time.sleep(ROUND_TRIP)
        return super().execute()


class SlowSupabase(FakeSupabase):
    def table(self, name: str) -> Query:
        return SlowQuery(self, name)


def test_results_requests_run_side_by_side(monkeypatch):
    db = SlowSupabase()
    teacher = db.add_user("teacher-token", email="teacher@abc.in")
    db.tables.update({
        "admins": [], "app_settings": [{"unlock_all_premium": True}], "plans": [],
        "user_tests": [], "test_registrations": [],
        "tests": [{"id": TEST_ID, "created_by": teacher, "visibility": "unlisted", "settings": {}}],
    })
    monkeypatch.setattr(rate_limiter, "SHARED_ENABLED", False)
    monkeypatch.setattr(attempts_router, "supabase", db)
    attempts_router._premium_for_all_cache.clear()
    auth_core._admin_cache.clear()
    app.dependency_overrides[get_db] = lambda: db
    headers = {"Authorization": "Bearer teacher-token"}

    try:
        # One event loop for every request, as in production (the context manager).
        with TestClient(app) as client:
            assert client.get(f"/api/attempts/test/{TEST_ID}/started", headers=headers).status_code == 200

            statuses = []
            def hit():
                statuses.append(client.get(f"/api/attempts/test/{TEST_ID}/started", headers=headers).status_code)

            threads = [threading.Thread(target=hit) for _ in range(6)]
            began = time.perf_counter()
            for t in threads:
                t.start()
            for t in threads:
                t.join()
            elapsed = time.perf_counter() - began
    finally:
        app.dependency_overrides.clear()

    assert statuses == [200] * 6
    # Warm, each request is two round trips: the test row, then its two reads together.
    # One at a time, six would take 6 x 2 x 0.25 = 3 s.
    assert elapsed < 4 * ROUND_TRIP, f"6 requests took {elapsed:.2f}s: they ran one after another"


# ── 2. profile identity ─────────────────────────────────────────────────────

ADMIN_EMAIL = "boss@testoza.com"


@pytest.fixture()
def profiles(monkeypatch):
    db = FakeSupabase()
    admin = db.add_user("admin-token", email=ADMIN_EMAIL)
    user = db.add_user("user-token", email="asha@abc.in")
    db.tables["admins"] = [{"email": ADMIN_EMAIL}]
    db.tables["tests"] = []
    monkeypatch.setattr(users_router, "supabase", db)
    auth_core._admin_cache.clear()
    app.dependency_overrides[get_db] = lambda: db
    yield {"db": db, "client": TestClient(app), "admin": admin, "user": user}
    app.dependency_overrides.clear()
    auth_core._admin_cache.clear()


def _profile(db, user_id):
    return next(p for p in db.tables["profiles"] if p["id"] == user_id)


def test_user_cannot_take_an_admin_email_or_self_verify(profiles):
    c, db, user = profiles["client"], profiles["db"], profiles["user"]
    res = c.put(
        f"/api/users/{user}",
        json={"email": ADMIN_EMAIL, "full_name": "Asha Verma", "is_verified_creator": True, "verified_role": "Institution"},
        headers={"Authorization": "Bearer user-token"},
    )
    assert res.status_code == 200, res.text

    row = _profile(db, user)
    assert row["full_name"] == "Asha Verma"           # ordinary edits still work
    assert row["email"] == "asha@abc.in"              # follows the login, not the request
    assert not row.get("is_verified_creator")
    assert "verified_role" not in row
    assert auth_core.is_admin_user(user, db) is False


def test_admin_can_still_verify_a_creator(profiles):
    c, db, user = profiles["client"], profiles["db"], profiles["user"]
    res = c.put(
        f"/api/users/{user}",
        json={"is_verified_creator": True, "verified_role": "Institution"},
        headers={"Authorization": "Bearer admin-token"},
    )
    assert res.status_code == 200, res.text
    row = _profile(db, user)
    assert row["is_verified_creator"] is True
    assert row["verified_role"] == "Institution"
