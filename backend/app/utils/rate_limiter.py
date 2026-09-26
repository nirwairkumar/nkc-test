"""
Rate limiting.

M1 (SECURITY_THREAT_MODEL_AND_PLAN.md): limits used to be a plain dict inside each
Cloud Run instance. With N instances a limit of 5 is really 5*N, and every deploy or
cold start reset the counters — so brute-force and cost-DoS protection was largely
theoretical.

This module now runs the same limits against a shared store when one is configured,
and falls back to per-instance memory when it is not:

    UPSTASH_REDIS_REST_URL   + UPSTASH_REDIS_REST_TOKEN   -> shared, correct across instances
    (neither set)                                         -> in-memory, per instance

Upstash's REST API is used rather than a Redis driver so no new dependency is needed
(httpx is already required) and there is no connection pool to manage on Cloud Run.

Design notes:
  * Fixed-window counters (INCR + EXPIRE). Atomic in Redis, and the small burst
    allowed at a window boundary does not matter for abuse control.
  * FAIL-OPEN. If the shared store is unreachable, requests are allowed and the error
    is logged. A rate limiter that takes the site down when Redis blips is a worse
    outage than the abuse it prevents.
  * Every rejection carries Retry-After and X-RateLimit-* headers, so clients can back
    off instead of hammering.
"""

import json
import logging
import os
import threading
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException, Request, status

logger = logging.getLogger("rate_limiter")

UPSTASH_URL = (os.getenv("UPSTASH_REDIS_REST_URL") or "").rstrip("/")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""
SHARED_ENABLED = bool(UPSTASH_URL and UPSTASH_TOKEN)

# One shared client; Cloud Run reuses the module across requests.
_http: Optional[httpx.Client] = None
_http_lock = threading.Lock()

# After this many consecutive shared-store failures, stop calling it for
# _CIRCUIT_COOLDOWN seconds so a dead Redis does not add latency to every request.
_CIRCUIT_THRESHOLD = 5
_CIRCUIT_COOLDOWN = 30.0
_circuit_failures = 0
_circuit_open_until = 0.0


def _get_http() -> httpx.Client:
    global _http
    if _http is None:
        with _http_lock:
            if _http is None:
                _http = httpx.Client(
                    base_url=UPSTASH_URL,
                    headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                    timeout=httpx.Timeout(2.0, connect=1.0),
                )
    return _http


def _circuit_is_open() -> bool:
    return time.time() < _circuit_open_until


def _record_failure() -> None:
    global _circuit_failures, _circuit_open_until
    _circuit_failures += 1
    if _circuit_failures >= _CIRCUIT_THRESHOLD:
        _circuit_open_until = time.time() + _CIRCUIT_COOLDOWN
        _circuit_failures = 0
        logger.warning(
            "rate limiter: shared store unreachable, falling back to in-memory for %ss",
            _CIRCUIT_COOLDOWN,
        )


def _record_success() -> None:
    global _circuit_failures
    _circuit_failures = 0


class RateLimiter:
    """
    A single named limit: `requests` allowed per `window` seconds, per key.

    is_allowed() keeps the original boolean contract used across the codebase.
    check() additionally reports what is left, for response headers.
    """

    def __init__(self, requests: int, window: int, name: str = ""):
        self.requests = requests
        self.window = window
        self.name = name or f"{requests}per{window}"

        # In-memory sliding window (fallback / local dev).
        self.clients: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = 300

    # ── in-memory path ────────────────────────────────────────────
    def _global_cleanup(self) -> None:
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

    def _check_memory(self, client_id: str) -> Tuple[bool, int, int]:
        current_time = time.time()
        with self._lock:
            self._global_cleanup()
            recent = [t for t in self.clients[client_id] if current_time - t < self.window]
            self.clients[client_id] = recent

            if len(recent) >= self.requests:
                reset_in = int(self.window - (current_time - min(recent))) + 1
                return False, 0, max(reset_in, 1)

            recent.append(current_time)
            return True, self.requests - len(recent), self.window

    # ── shared path ───────────────────────────────────────────────
    def _check_shared(self, client_id: str) -> Optional[Tuple[bool, int, int]]:
        """Returns None when the shared store could not answer (caller falls back)."""
        # Bucket the key by window so the counter resets naturally with its TTL.
        window_id = int(time.time() // self.window)
        key = f"rl:{self.name}:{client_id}:{window_id}"

        try:
            # Pipeline: INCR then EXPIRE ... NX (only sets a TTL on first write).
            resp = _get_http().post(
                "/pipeline",
                content=json.dumps([["INCR", key], ["EXPIRE", key, str(self.window), "NX"]]),
            )
            resp.raise_for_status()
            body = resp.json()
            count = int(body[0]["result"])
            _record_success()
        except Exception as exc:  # network error, auth error, malformed reply
            logger.warning("rate limiter: shared store error (%s); failing open", exc)
            _record_failure()
            return None

        reset_in = int((window_id + 1) * self.window - time.time()) + 1
        if count > self.requests:
            return False, 0, max(reset_in, 1)
        return True, max(self.requests - count, 0), max(reset_in, 1)

    # ── public API ────────────────────────────────────────────────
    def check(self, client_id: str) -> Tuple[bool, int, int]:
        """Returns (allowed, remaining, reset_seconds)."""
        if not client_id:
            return True, self.requests, self.window

        if SHARED_ENABLED and not _circuit_is_open():
            result = self._check_shared(client_id)
            if result is not None:
                return result
            # Shared store unavailable: fall through to memory so we still do something.

        return self._check_memory(client_id)

    def is_allowed(self, client_id: str) -> bool:
        allowed, _, _ = self.check(client_id)
        return allowed


# ── Helpers ───────────────────────────────────────────────────────

def _get_client_ip(request: Request) -> str:
    """
    Resolve the caller's IP.

    M2: `X-Forwarded-For` is attacker-controlled — a client can send any value, which
    makes an IP-keyed limit trivially bypassable and poisons geo lookups. This
    deployment sits behind Cloudflare, which strips and re-sets `CF-Connecting-IP`,
    so that header wins; X-Forwarded-For is only a local/dev fallback.
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

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


def _reject(limiter: RateLimiter, reset_in: int, detail: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=detail,
        headers={
            "Retry-After": str(reset_in),
            "X-RateLimit-Limit": str(limiter.requests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(reset_in),
        },
    )


def enforce_limit(limiter: RateLimiter, key: str, detail: str) -> None:
    """Raise 429 (with Retry-After) when `key` has exhausted `limiter`."""
    if not key:
        return
    allowed, _remaining, reset_in = limiter.check(key)
    if not allowed:
        _reject(limiter, reset_in, detail)


def client_ip(request: Request) -> str:
    """Public accessor for the resolved client IP (see _get_client_ip)."""
    return _get_client_ip(request)


def limiter_status() -> Dict[str, object]:
    """Diagnostics for the admin health panel."""
    return {
        "shared_store": "upstash-redis" if SHARED_ENABLED else "in-memory",
        "shared_enabled": SHARED_ENABLED,
        "degraded": _circuit_is_open(),
    }


# ══════════════════════════════════════════════════════════════════
#  LIMITS
# ══════════════════════════════════════════════════════════════════

# ── Auth (brute-force protection, keyed per email) ────────────────
login_per_email = RateLimiter(requests=5, window=300, name="login_email")
register_per_email = RateLimiter(requests=2, window=3600, name="register_email")
reset_per_email = RateLimiter(requests=3, window=3600, name="reset_email")
# Keyed per IP as well, so one attacker cannot spray many accounts from one host.
login_per_ip = RateLimiter(requests=30, window=300, name="login_ip")
register_per_ip = RateLimiter(requests=10, window=3600, name="register_ip")

# ── Analytics ingest ──────────────────────────────────────────────
# A whole classroom or coaching centre often shares one public IP (NAT), and a
# 60-student live exam sends a burst of page views at the start.
analytics_rate_limiter = RateLimiter(requests=600, window=60, name="analytics_ip")

# ── AI endpoints (H2) ─────────────────────────────────────────────
# Every /api/ai/* call spends real Gemini budget, so these are keyed per
# authenticated user: abuse costs an account, not just a fresh IP.
ai_heavy_per_user = RateLimiter(requests=30, window=3600, name="ai_heavy")
ai_light_per_user = RateLimiter(requests=120, window=3600, name="ai_light")
# /predict-rank stays reachable for anonymous candidates on their own results page,
# so it is capped per IP instead of requiring a login.
ai_rank_per_ip = RateLimiter(requests=10, window=3600, name="ai_rank")

# ── Exam submissions (H4) ─────────────────────────────────────────
anon_submit_per_ip = RateLimiter(requests=30, window=3600, name="anon_submit")

# ── Writes (M1: previously unprotected) ───────────────────────────
write_per_user = RateLimiter(requests=120, window=60, name="write_user")
upload_per_user = RateLimiter(requests=40, window=3600, name="upload_user")
support_per_ip = RateLimiter(requests=10, window=3600, name="support_ip")
password_update_per_user = RateLimiter(requests=5, window=3600, name="pwd_update")


# ══════════════════════════════════════════════════════════════════
#  DEPENDENCIES (used in FastAPI Depends())
# ══════════════════════════════════════════════════════════════════

async def check_login_rate_limit(request: Request):
    """Per-email login protection, plus a per-IP ceiling for spray attacks."""
    email = await _extract_email_from_body(request)
    if email:
        allowed, _, reset_in = login_per_email.check(email)
        if not allowed:
            _reject(login_per_email, reset_in,
                    "Too many login attempts for this account. Please try again in a few minutes.")

    ip = _get_client_ip(request)
    allowed, _, reset_in = login_per_ip.check(ip)
    if not allowed:
        _reject(login_per_ip, reset_in, "Too many login attempts. Please try again in a few minutes.")


async def check_register_rate_limit(request: Request):
    """Per-email registration protection, plus a per-IP ceiling."""
    email = await _extract_email_from_body(request)
    if email:
        allowed, _, reset_in = register_per_email.check(email)
        if not allowed:
            _reject(register_per_email, reset_in,
                    "This email has already been used for registration recently.")

    ip = _get_client_ip(request)
    allowed, _, reset_in = register_per_ip.check(ip)
    if not allowed:
        _reject(register_per_ip, reset_in, "Too many sign-ups from this network. Please try again later.")


async def check_password_reset_rate_limit(request: Request):
    """Password reset: per-email."""
    email = await _extract_email_from_body(request)
    if email:
        allowed, _, reset_in = reset_per_email.check(email)
        if not allowed:
            _reject(reset_per_email, reset_in,
                    "Too many password reset requests for this email. Please try again later.")


async def check_analytics_rate_limit(request: Request):
    """Analytics ingest — IP only."""
    allowed, _, reset_in = analytics_rate_limiter.check(_get_client_ip(request))
    if not allowed:
        _reject(analytics_rate_limiter, reset_in, "Too many analytics requests")


async def check_support_rate_limit(request: Request):
    """Support/contact submissions — IP only (spam control)."""
    allowed, _, reset_in = support_per_ip.check(_get_client_ip(request))
    if not allowed:
        _reject(support_per_ip, reset_in, "Too many messages sent. Please try again later.")
