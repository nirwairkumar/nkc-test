"""
Security building blocks for the team dashboard (team.testoza.com).

Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md. Everything here is standard-library
or `cryptography` (already a dependency), so the team login adds no new packages:

  * Passwords: scrypt (memory-hard; OWASP's scrypt profile N=2^15, r=8, p=3), random
    16-byte salt, constant-time comparison. Stored as `scrypt$N$r$p$salt$hash`.
  * 6-digit codes: TOTP (RFC 6238, SHA-1, 30 s, 6 digits): the format Google and
    Microsoft Authenticator expect. ±1 step for phone clock drift; a step can be used once.
  * 2-step secrets at rest: AES-256-GCM. The key is STAFF_SECRET_KEY (base64, 32 bytes)
    or, when that is not set, derived from SUPABASE_SERVICE_KEY with HKDF, so a copy
    of the database alone does not reveal the secrets. The staff id is bound in as
    associated data, so a secret copied onto another account does not decrypt.
  * Sessions: 256-bit random tokens; the database only ever sees their SHA-256.
"""

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from typing import Optional
from urllib.parse import quote

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# ── passwords ───────────────────────────────────────────────────────────────────
_SCRYPT_N = 2 ** 15
_SCRYPT_R = 8
_SCRYPT_P = 3
_SCRYPT_DKLEN = 32
_SCRYPT_MAXMEM = 64 * 1024 * 1024  # 128 * N * r = 32 MiB needed; leave headroom
MAX_PASSWORD_CHARS = 128  # longer input is refused before hashing (CPU/memory DoS)


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int, dklen: int) -> bytes:
    return hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=n, r=r, p=p, maxmem=_SCRYPT_MAXMEM, dklen=dklen,
    )


def hash_password(password: str) -> str:
    if len(password) > MAX_PASSWORD_CHARS:
        raise ValueError("password too long")
    salt = secrets.token_bytes(16)
    dk = _scrypt(password, salt, _SCRYPT_N, _SCRYPT_R, _SCRYPT_P, _SCRYPT_DKLEN)
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64(salt)}${_b64(dk)}"


_DUMMY_HASH: Optional[str] = None


def verify_password(password: str, stored: Optional[str]) -> bool:
    """
    Constant-time check. With no stored hash (unknown login ID) a dummy hash is still
    computed, so a wrong ID and a wrong password take the same time to answer.
    """
    global _DUMMY_HASH
    if not isinstance(password, str) or len(password) > MAX_PASSWORD_CHARS:
        password = ""
    if not stored:
        if _DUMMY_HASH is None:
            _DUMMY_HASH = hash_password(secrets.token_urlsafe(16))
        stored, known = _DUMMY_HASH, False
    else:
        known = True
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != "scrypt":
            return False
        expected_raw = _unb64(expected)
        actual = _scrypt(password, _unb64(salt), int(n), int(r), int(p), len(expected_raw))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected_raw) and known


# Short list of passwords people actually pick; length + these checks follow NIST 800-63B
# (no composition rules, but block the obvious).
_COMMON = {
    "password", "password1", "password123", "passw0rd", "qwerty", "qwerty123", "qwertyuiop",
    "123456789012", "1234567890", "12345678", "iloveyou", "welcome", "welcome123", "admin",
    "admin123", "letmein", "india123", "india@123", "abcdefghijkl", "abc123456789",
}


def password_problem(new_password: str, login_id: str, full_name: Optional[str] = None) -> Optional[str]:
    """A reason the new password is not acceptable, or None."""
    if not isinstance(new_password, str) or len(new_password) < 12:
        return "Use at least 12 characters."
    if len(new_password) > MAX_PASSWORD_CHARS:
        return f"Use at most {MAX_PASSWORD_CHARS} characters."
    low = new_password.lower()
    if login_id and login_id.lower() in low:
        return "Don't put your login ID in the password."
    if "testoza" in low:
        return "Don't use the word TestoZa in the password."
    for part in (full_name or "").lower().split():
        if len(part) >= 4 and part in low:
            return "Don't put your name in the password."
    if low in _COMMON or any(low.startswith(c) and len(low) - len(c) <= 3 for c in _COMMON):
        return "That password is too common. Pick something only you would think of."
    if len(set(new_password)) < 6:
        return "Too many repeated characters. Mix it up more."
    return None


_TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/l/I


def new_temp_password() -> str:
    """Four groups of four, e.g. `k7Pm-x3Qa-Hn8d-Ry2w` (~91 bits)."""
    return "-".join("".join(secrets.choice(_TEMP_ALPHABET) for _ in range(4)) for _ in range(4))


# ── 6-digit codes (TOTP, RFC 6238) ──────────────────────────────────────────────
TOTP_PERIOD = 30
TOTP_DIGITS = 6
TOTP_ISSUER = "TestoZa Team"


def new_totp_secret() -> str:
    """160-bit secret, base32 without padding (what authenticator apps accept)."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _hotp(secret_b32: str, counter: int) -> str:
    key = base64.b32decode(secret_b32.upper() + "=" * (-len(secret_b32) % 8))
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF) % (10 ** TOTP_DIGITS)
    return str(code).zfill(TOTP_DIGITS)


def totp_now(secret_b32: str, at: Optional[float] = None) -> str:
    return _hotp(secret_b32, int((time.time() if at is None else at) // TOTP_PERIOD))


def totp_match(secret_b32: str, code: str, *, last_step: Optional[int] = None,
               at: Optional[float] = None, window: int = 1) -> Optional[int]:
    """
    The time step the code belongs to, or None. Accepts ±`window` steps for clock drift
    and refuses any step at or before `last_step`, so an observed code can't be replayed.
    """
    code = "".join(ch for ch in str(code or "") if ch.isdigit())
    if len(code) != TOTP_DIGITS:
        return None
    now_step = int((time.time() if at is None else at) // TOTP_PERIOD)
    matched = None
    for step in range(now_step - window, now_step + window + 1):
        # Check every candidate (no early exit) so timing doesn't hint at the step.
        if hmac.compare_digest(_hotp(secret_b32, step), code):
            matched = step
    if matched is None or (last_step is not None and matched <= int(last_step)):
        return None
    return matched


def otpauth_uri(secret_b32: str, login_id: str) -> str:
    label = quote(f"{TOTP_ISSUER}:{login_id}")
    return (f"otpauth://totp/{label}?secret={secret_b32}&issuer={quote(TOTP_ISSUER)}"
            f"&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_PERIOD}")


# ── secrets at rest (AES-256-GCM) ───────────────────────────────────────────────
def _encryption_key() -> bytes:
    configured = (os.getenv("STAFF_SECRET_KEY") or "").strip()
    if configured:
        key = _unb64(configured.replace("+", "-").replace("/", "_"))
        if len(key) != 32:
            raise RuntimeError("STAFF_SECRET_KEY must be 32 bytes, base64-encoded")
        return key
    from app.core.config import settings  # late import: tests set env first

    material = settings.SUPABASE_SERVICE_KEY
    if not material:
        raise RuntimeError("Set STAFF_SECRET_KEY (or SUPABASE_SERVICE_KEY) to protect 2-step secrets")
    return HKDF(
        algorithm=hashes.SHA256(), length=32, salt=b"testoza-team-dashboard", info=b"totp-secret-v1",
    ).derive(material.encode("utf-8"))


def encrypt_secret(plain: str, bound_to: str) -> str:
    nonce = secrets.token_bytes(12)
    sealed = AESGCM(_encryption_key()).encrypt(nonce, plain.encode("utf-8"), bound_to.encode("utf-8"))
    return "v1." + _b64(nonce + sealed)


def decrypt_secret(blob: str, bound_to: str) -> str:
    if not blob or not blob.startswith("v1."):
        raise ValueError("unknown secret format")
    raw = _unb64(blob[3:])
    return AESGCM(_encryption_key()).decrypt(raw[:12], raw[12:], bound_to.encode("utf-8")).decode("utf-8")


# ── session tokens ──────────────────────────────────────────────────────────────
def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
