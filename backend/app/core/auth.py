"""
Shared authentication / authorization helpers.

C5 (SECURITY_THREAT_MODEL_AND_PLAN.md): the backend connects to Supabase with the
service-role key, which bypasses RLS entirely (see app/core/database.py). That makes
these Python checks the ONLY access control on every backend route — a route with no
guard is a public admin function.

Previously each router carried its own copy of `_verify_auth_token` / `_verify_is_admin`,
which is how users.py and email_broadcast.py ended up with an unsigned-JWT "fast path"
(C1) that nobody noticed. One implementation, used everywhere, prevents a repeat.
"""

from typing import Optional

from cachetools import TTLCache
from fastapi import HTTPException, Request
from supabase import Client

from app.core.database import supabase

# email -> bool. Mirrors the per-router caches it replaces (5 minutes).
_admin_cache: TTLCache = TTLCache(maxsize=1000, ttl=300)


def verify_auth_token(request: Request, db: Optional[Client] = None) -> str:
    """
    Validate the bearer token and return the caller's user id.

    Uses db.auth.get_claims(), which verifies the JWT signature (locally via the cached
    JWKS for asymmetric keys, through Supabase Auth for HS256). Never decode the payload
    without verifying the signature — that was C1.
    """
    client = db or supabase

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    token = auth_header.replace("Bearer ", "").strip()
    try:
        claims_response = client.auth.get_claims(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = claims_response["claims"].get("sub") if claims_response else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


def get_optional_user_id(request: Request, db: Optional[Client] = None) -> Optional[str]:
    """Return the caller's id when a valid token is present, else None. Never raises."""
    try:
        return verify_auth_token(request, db)
    except HTTPException:
        return None


def is_admin_user(user_id: str, db: Optional[Client] = None) -> bool:
    """True when the user's profile email is listed in `admins`."""
    client = db or supabase
    try:
        profile_res = client.table("profiles").select("email").eq("id", user_id).execute()
    except Exception:
        return False

    if not profile_res.data:
        return False

    email = profile_res.data[0].get("email")
    if not email:
        return False

    if email in _admin_cache:
        return _admin_cache[email]

    try:
        admin_res = client.table("admins").select("email").eq("email", email).execute()
    except Exception:
        return False

    result = bool(admin_res.data)
    _admin_cache[email] = result
    return result


def verify_is_admin(request: Request, db: Optional[Client] = None) -> str:
    """Require an admin caller; returns their user id."""
    user_id = verify_auth_token(request, db)
    if not is_admin_user(user_id, db):
        raise HTTPException(status_code=403, detail="Admin authorization required")
    return user_id


def verify_owner_or_admin(user_id: str, request: Request, db: Optional[Client] = None) -> str:
    """Require the caller to be `user_id` itself or an admin; returns the caller's id."""
    requesting_user_id = verify_auth_token(request, db)
    if requesting_user_id == user_id:
        return requesting_user_id
    if not is_admin_user(requesting_user_id, db):
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return requesting_user_id


def verify_test_owner_or_admin(test_id: str, request: Request, db: Optional[Client] = None) -> str:
    """
    Require the caller to own the test (tests.created_by) or be an admin.
    Accepts a UUID, a slug or a custom_id. Returns the caller's id.
    """
    import uuid as _uuid

    client = db or supabase
    requesting_user_id = verify_auth_token(request, db)

    try:
        _uuid.UUID(test_id)
        test_res = client.table("tests").select("created_by").eq("id", test_id).limit(1).execute()
    except ValueError:
        test_res = (
            client.table("tests")
            .select("created_by")
            .or_(f"slug.eq.{test_id},custom_id.eq.{test_id}")
            .limit(1)
            .execute()
        )

    if not test_res.data:
        raise HTTPException(status_code=404, detail="Test not found")

    if test_res.data[0].get("created_by") == requesting_user_id:
        return requesting_user_id

    if not is_admin_user(requesting_user_id, db):
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return requesting_user_id
