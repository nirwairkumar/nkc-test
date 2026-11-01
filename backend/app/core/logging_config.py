"""
M3 / M4 (SECURITY_THREAT_MODEL_AND_PLAN.md) — logging that is safe to ship.

M4: routers used bare print() for auth flows, upload paths, promo codes and whole
user objects. On Cloud Run every one of those lands in Cloud Logging, where anyone
with log access (and anything that ships logs onward) can read tokens and PII.

M3: handlers returned `detail=str(e)` to the client, leaking database and library
internals that tell an attacker exactly what backend you run and how it is shaped.

The rule this module implements:

    the full detail goes to the log, a correlation id goes to the client.

Two pieces:
  * RedactingFilter — a last line of defence. Even if someone logs a raw token or
    a full user object, the pattern scrub catches the common shapes before the
    record is emitted. It is not a substitute for not logging secrets.
  * request_id ContextVar — set by middleware, attached to every record, and
    returned to the client so a user-reported error can be found in the logs.
"""

import logging
import os
import re
import sys
from contextvars import ContextVar
from typing import Optional

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


# ── Redaction ─────────────────────────────────────────────────────────────────
# Ordered most-specific first; each is applied to the formatted message.
_REDACTIONS = [
    # JWTs (Supabase access/refresh tokens) — three base64url segments.
    (re.compile(r"eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}"), "[JWT_REDACTED]"),
    # Authorization headers / bearer tokens.
    (re.compile(r"(?i)\b(bearer)\s+[A-Za-z0-9._\-]{10,}"), r"\1 [REDACTED]"),
    # Google / Gemini API keys.
    (re.compile(r"AIza[0-9A-Za-z_\-]{35}"), "[API_KEY_REDACTED]"),
    # Generic "secret-ish" key=value pairs.
    (re.compile(
        r"(?i)\b(password|passwd|secret|token|api[_-]?key|authorization|service[_-]?key|refresh[_-]?token)"
        r"(\"?\s*[:=]\s*\"?)([^\s,;}\"']{4,})"
    ), r"\1\2[REDACTED]"),
    # Email addresses -> keep the domain, mask the local part (support triage still works).
    (re.compile(r"\b([A-Za-z0-9._%+-]{1,2})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})"), r"\1***@\2"),
]


class RedactingFilter(logging.Filter):
    """Scrub secrets and PII out of log records before they are emitted."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except Exception:
            return True

        scrubbed = message
        for pattern, replacement in _REDACTIONS:
            scrubbed = pattern.sub(replacement, scrubbed)

        if scrubbed != message:
            # Replace the message and drop args (already interpolated above).
            record.msg = scrubbed
            record.args = ()
        return True


class RequestIdFilter(logging.Filter):
    """Attach the current request id so log lines can be correlated to a user report."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def configure_logging(level: Optional[str] = None) -> None:
    """
    Install the root logging configuration. Safe to call more than once.

    Cloud Run captures stdout, so a single stream handler is all that is needed.
    """
    log_level = (level or os.getenv("LOG_LEVEL") or "INFO").upper()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] [req=%(request_id)s] %(message)s"
    ))
    handler.addFilter(RequestIdFilter())
    handler.addFilter(RedactingFilter())

    root = logging.getLogger()
    # Replace any handlers installed by a previous call / by uvicorn's default config.
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(getattr(logging, log_level, logging.INFO))

    # Uvicorn installs its own handlers; route them through ours so redaction applies.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True

    # Third-party libraries are chatty and sometimes log request bodies.
    for noisy in ("httpx", "httpcore", "hpack", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
