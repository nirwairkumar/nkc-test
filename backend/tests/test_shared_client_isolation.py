"""
Signing someone in must never change the shared service-role client.

supabase-py swaps a Client's Authorization header to the user's token on SIGNED_IN /
TOKEN_REFRESHED. On the backend's one shared client that turned every later query in
the process into that user's query under RLS: analytics reports, guest-candidate
creation and result saves all returned 403 until the server was redeployed
(2026-10-11/12, each time right after a login through /api/auth/login).

requirements.txt is unpinned, so these also catch a supabase-py release that renames
the hook the guard relies on.
"""

import time

import httpx
from fastapi.testclient import TestClient
from supabase_auth.types import Session, User

from app.core import database
from app.core.database import key_to_use, supabase
from app.main import app

SERVICE_HEADER = f"Bearer {key_to_use}"


def _session(token: str = "user-access-token") -> dict:
    return {
        "access_token": token,
        "refresh_token": "user-refresh-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": int(time.time()) + 3600,
        "user": {
            "id": "11111111-1111-1111-1111-111111111111",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "student@example.com",
            "created_at": "2026-10-12T00:00:00Z",
            "app_metadata": {},
            "user_metadata": {},
        },
    }


def test_shared_client_ignores_auth_events():
    data = _session()
    session = Session(**{**data, "user": User(**data["user"])})
    for event in ("SIGNED_IN", "TOKEN_REFRESHED"):
        supabase.auth._notify_all_subscribers(event, session)
        assert supabase.options.headers["Authorization"] == SERVICE_HEADER
        assert supabase.postgrest.headers["Authorization"] == SERVICE_HEADER


def test_login_leaves_the_shared_client_on_the_service_key(monkeypatch):
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.path)
        return httpx.Response(200, json=_session())

    monkeypatch.setattr(database, "_http", httpx.Client(transport=httpx.MockTransport(handler)))

    res = TestClient(app).post(
        "/api/auth/login", json={"email": "student@example.com", "password": "secret-pass"}
    )

    assert res.status_code == 200, res.text
    assert res.json()["data"]["session"]["access_token"] == "user-access-token"
    assert seen == ["/auth/v1/token"]
    assert supabase.options.headers["Authorization"] == SERVICE_HEADER
    assert supabase.postgrest.headers["Authorization"] == SERVICE_HEADER
    assert supabase.auth.get_session() is None
