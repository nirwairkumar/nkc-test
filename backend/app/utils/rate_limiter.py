from fastapi import Request, HTTPException, status
from typing import Dict, List
import time
import json
from collections import defaultdict


class RateLimiter:
    """
    In-memory sliding window rate limiter.
    For production at scale, replace with Redis (Upstash) for global consistency
    across multiple Cloud Run instances.
    """
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window
        self.clients: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Global cleanup every 5 minutes

    def _global_cleanup(self):
        """Remove all stale client entries to prevent unbounded dict growth."""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = current_time
        stale_keys = [
            k for k, v in self.clients.items()
            if not v or (current_time - max(v)) >= self.window
        ]
        for k in stale_keys:
            del self.clients[k]

    def is_allowed(self, client_id: str) -> bool:
        current_time = time.time()

        # Periodic global cleanup
        self._global_cleanup()

        # Clean up old timestamps for this client
        self.clients[client_id] = [t for t in self.clients[client_id] if current_time - t < self.window]

        if len(self.clients[client_id]) >= self.requests:
            return False

        self.clients[client_id].append(current_time)
        return True


# ── Helper ────────────────────────────────────────────────────────

def _get_client_ip(request: Request) -> str:
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    return client_ip


async def _extract_email_from_body(request: Request) -> str:
    """
    Read the email field from the JSON request body for rate-limit keying.

    Starlette internally caches the result of request.body(), so calling it
    here in a dependency does NOT prevent FastAPI from parsing the same body
    into a Pydantic model in the endpoint handler.
    """
    try:
        body = await request.body()
        data = json.loads(body)
        return (data.get("email") or "").strip().lower()
    except Exception:
        return ""


# ══════════════════════════════════════════════════════════════════
#  RATE LIMITING STRATEGY
# ══════════════════════════════════════════════════════════════════
#
#  Per-Email Rate Limiting (brute force protection):
#  → 5 login attempts per email per 5 min
#  → 2 registrations per email per hour
#  → 3 password resets per email per hour
# ══════════════════════════════════════════════════════════════════

# ── Per-Email Limiters (brute-force protection) ───────────────────
# 5 login attempts per 5 minutes per email
login_per_email = RateLimiter(requests=5, window=300)
# 2 registrations per hour per email
register_per_email = RateLimiter(requests=2, window=3600)
# 3 password resets per hour per email
reset_per_email = RateLimiter(requests=3, window=3600)

# ── Analytics (IP only) ───────────────────────────────────────────
analytics_rate_limiter = RateLimiter(requests=100, window=60)


# ══════════════════════════════════════════════════════════════════
#  DEPENDENCY FUNCTIONS (used in FastAPI Depends())
# ══════════════════════════════════════════════════════════════════

async def check_login_rate_limit(request: Request):
    """
    Per-email login protection (stops brute force without blocking shared IPs).
    """
    email = await _extract_email_from_body(request)
    if email and not login_per_email.is_allowed(email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts for this account. Please try again in a few minutes."
        )


async def check_register_rate_limit(request: Request):
    """
    Per-email registration protection.
    """
    email = await _extract_email_from_body(request)
    if email and not register_per_email.is_allowed(email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="This email has already been used for registration recently."
        )


async def check_password_reset_rate_limit(request: Request):
    """
    Password reset: Per-email only.
    """
    email = await _extract_email_from_body(request)
    if email and not reset_per_email.is_allowed(email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests for this email. Please try again later."
        )


async def check_analytics_rate_limit(request: Request):
    """Analytics — IP only."""
    client_ip = _get_client_ip(request)
    if not analytics_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many analytics requests"
        )
